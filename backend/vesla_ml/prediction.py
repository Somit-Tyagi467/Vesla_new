"""Load a saved sensor forecaster and produce a next-window forecast."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from .features import FEATURE_NAMES, WINDOW_SIZE, window_features


def load_forecaster(path: str | Path):
    """Load a model artifact created by :mod:`vesla_ml.training`."""
    artifact = joblib.load(path)
    if artifact.get("model_version") != 1:
        raise ValueError("Unsupported Vesla forecast artifact version.")
    return artifact


def forecast_next_window(artifact: dict, readings: list[float]):
    """Return a prediction for the next 96 readings and its expected direction."""
    if len(readings) != WINDOW_SIZE:
        raise ValueError(f"Expected the latest {WINDOW_SIZE} readings.")
    features = window_features(readings)
    frame = pd.DataFrame([[features[name] for name in FEATURE_NAMES]], columns=FEATURE_NAMES)

    if artifact["strategy"] == "recent_window_mean":
        predicted_mean = features["mean"]
    else:
        predicted_mean = float(artifact["regressor"].predict(frame)[0])

    baseline = features["mean"]
    threshold = max(abs(baseline) * 0.01, 0.01)
    difference = predicted_mean - baseline
    direction = "increasing" if difference > threshold else (
        "decreasing" if difference < -threshold else "stable"
    )
    return {
        "sensor": artifact["sensor"],
        "predicted_next_window_mean": predicted_mean,
        "current_window_mean": baseline,
        "predicted_change": difference,
        "direction": direction,
        "strategy": artifact["strategy"],
        "test_mae": artifact["metrics"]["test_mae"],
    }
