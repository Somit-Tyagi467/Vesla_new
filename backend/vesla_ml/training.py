"""Train and compare compact, per-sensor next-window forecasting models."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .features import FEATURE_NAMES, HORIZON, WINDOW_SIZE, window_features

TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15
TRAIN_STRIDE = 24
MINIMUM_SERIES_LENGTH = 640


def _build_windows(values: np.ndarray, target_start: int, stop: int, stride: int):
    features = []
    targets = []
    for start in range(target_start, stop - HORIZON + 1, stride):
        previous = values[start - WINDOW_SIZE:start]
        future = values[start:start + HORIZON]
        if len(previous) != WINDOW_SIZE or len(future) != HORIZON:
            continue
        features.append(window_features(previous))
        targets.append(float(np.mean(future)))
    return features, targets


def _segments(frame: pd.DataFrame, timestamp_column: str, value_column: str):
    """Split a sorted series at large gaps so windows never bridge missing periods."""
    clean = frame[[timestamp_column, value_column]].copy()
    clean[timestamp_column] = pd.to_datetime(clean[timestamp_column], errors="coerce", utc=True)
    clean[value_column] = pd.to_numeric(clean[value_column], errors="coerce")
    clean = clean.dropna().sort_values(timestamp_column)
    clean = clean.drop_duplicates(timestamp_column, keep="last").reset_index(drop=True)
    if len(clean) < WINDOW_SIZE + HORIZON:
        return []

    differences = clean[timestamp_column].diff().dt.total_seconds()
    positive_differences = differences[differences > 0]
    if positive_differences.empty:
        return [clean[value_column].to_numpy(dtype=float)]
    expected_interval = float(positive_differences.median())
    gap_starts = np.flatnonzero(
        (differences > expected_interval * 3).fillna(False).to_numpy()
    )
    boundaries = [0, *gap_starts.tolist(), len(clean)]
    result = []
    for left, right in zip(boundaries, boundaries[1:]):
        segment = clean.iloc[left:right][value_column].to_numpy(dtype=float)
        if len(segment) >= WINDOW_SIZE + HORIZON:
            result.append(segment)
    return result


def load_sensor_splits(
    csv_path: Path,
    *,
    timestamp_column: str,
    value_column: str,
    group_column: str | None,
):
    frame = pd.read_csv(csv_path, low_memory=False)
    required = {timestamp_column, value_column}
    if group_column:
        required.add(group_column)
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"{csv_path} is missing required columns: {', '.join(missing)}")

    groups = frame.groupby(group_column, dropna=False, sort=False) if group_column else [("all", frame)]
    split_features = {"train": [], "validation": [], "test": []}
    split_targets = {"train": [], "validation": [], "test": []}

    for _, group in groups:
        for values in _segments(group, timestamp_column, value_column):
            train_end = int(len(values) * TRAIN_RATIO)
            validation_end = int(len(values) * (TRAIN_RATIO + VALIDATION_RATIO))
            windows = (
                ("train", WINDOW_SIZE, train_end, TRAIN_STRIDE),
                ("validation", max(WINDOW_SIZE, train_end), validation_end, HORIZON),
                ("test", max(WINDOW_SIZE, validation_end), len(values), HORIZON),
            )
            for split_name, target_start, stop, stride in windows:
                features, targets = _build_windows(values, target_start, stop, stride)
                split_features[split_name].extend(features)
                split_targets[split_name].extend(targets)

    if any(not split_targets[name] for name in split_targets):
        counts = {name: len(targets) for name, targets in split_targets.items()}
        raise ValueError(
            f"Not enough continuous readings to make train, validation, and test windows: {counts}. "
            f"Each sensor/device series needs at least {MINIMUM_SERIES_LENGTH} continuous readings "
            "to create all three chronological splits."
        )

    return {
        name: (pd.DataFrame(rows, columns=FEATURE_NAMES), np.asarray(split_targets[name], dtype=float))
        for name, rows in split_features.items()
    }


def _candidate_models():
    return {
        "hist_gradient_boosting": HistGradientBoostingRegressor(
            max_iter=180,
            learning_rate=0.05,
            max_leaf_nodes=15,
            l2_regularization=1.0,
            early_stopping=False,
            random_state=42,
        ),
        "extra_trees": ExtraTreesRegressor(
            n_estimators=240,
            max_depth=14,
            min_samples_leaf=3,
            max_features=0.9,
            n_jobs=-1,
            random_state=42,
        ),
    }


def _mae(actual, predicted):
    return float(mean_absolute_error(actual, predicted))


def train_sensor(
    sensor_name: str,
    csv_path: Path,
    *,
    timestamp_column: str,
    value_column: str,
    group_column: str | None,
    output_dir: Path,
):
    splits = load_sensor_splits(
        csv_path,
        timestamp_column=timestamp_column,
        value_column=value_column,
        group_column=group_column,
    )
    X_train, y_train = splits["train"]
    X_validation, y_validation = splits["validation"]
    X_test, y_test = splits["test"]

    baseline_validation = _mae(y_validation, X_validation["mean"])
    candidates = []
    for name, model in _candidate_models().items():
        model.fit(X_train, y_train)
        score = _mae(y_validation, model.predict(X_validation))
        candidates.append((score, name, model))

    best_validation_mae, model_name, model = min(candidates, key=lambda item: item[0])
    use_model = best_validation_mae < baseline_validation
    final_name = model_name if use_model else "recent_window_mean"

    if use_model:
        combined_X = pd.concat([X_train, X_validation], ignore_index=True)
        combined_y = np.concatenate([y_train, y_validation])
        model.fit(combined_X, combined_y)
        predictions = model.predict(X_test)
    else:
        model = None
        predictions = X_test["mean"].to_numpy()

    test_mae = _mae(y_test, predictions)
    test_rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
    metrics = {
        "validation_baseline_mae": baseline_validation,
        "validation_best_model_mae": best_validation_mae,
        "test_mae": test_mae,
        "test_rmse": test_rmse,
        "test_r2": float(r2_score(y_test, predictions)) if len(y_test) > 1 else None,
        "window_count": {
            "train": len(y_train),
            "validation": len(y_validation),
            "test": len(y_test),
        },
    }
    artifact = {
        "model_version": 1,
        "sensor": sensor_name,
        "prediction_target": "mean of the next 96 readings",
        "window_size": WINDOW_SIZE,
        "horizon": HORIZON,
        "feature_names": list(FEATURE_NAMES),
        "strategy": final_name,
        "regressor": model,
        "metrics": metrics,
        "source_file": csv_path.name,
        "timestamp_column": timestamp_column,
        "value_column": value_column,
        "group_column": group_column,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = output_dir / f"{sensor_name}_forecast.joblib"
    joblib.dump(artifact, artifact_path)
    return {"artifact": str(artifact_path), "strategy": final_name, "metrics": metrics}


def _parser():
    parser = argparse.ArgumentParser(
        description="Train separate TDS and turbidity forecasts from timestamped sensor CSV files."
    )
    parser.add_argument("--tds-csv", type=Path, required=True)
    parser.add_argument("--turbidity-csv", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("vesla_ml/artifacts"))
    parser.add_argument("--tds-timestamp-column", default="created_date")
    parser.add_argument("--tds-value-column", default="TDS")
    parser.add_argument("--tds-group-column")
    parser.add_argument("--turbidity-timestamp-column", default="Timestamp")
    parser.add_argument("--turbidity-value-column", default="Turbidity")
    parser.add_argument("--turbidity-group-column")
    return parser


def main():
    args = _parser().parse_args()
    results = {
        "tds": train_sensor(
            "tds",
            args.tds_csv,
            timestamp_column=args.tds_timestamp_column,
            value_column=args.tds_value_column,
            group_column=args.tds_group_column,
            output_dir=args.output_dir,
        ),
        "turbidity": train_sensor(
            "turbidity",
            args.turbidity_csv,
            timestamp_column=args.turbidity_timestamp_column,
            value_column=args.turbidity_value_column,
            group_column=args.turbidity_group_column,
            output_dir=args.output_dir,
        ),
    }
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
