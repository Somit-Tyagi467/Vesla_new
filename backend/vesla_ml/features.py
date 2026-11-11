"""Small, deterministic features for forecasting the next 96 sensor readings."""

from __future__ import annotations

import numpy as np

WINDOW_SIZE = 96
HORIZON = 96
FEATURE_NAMES = (
    "mean",
    "std",
    "median",
    "minimum",
    "maximum",
    "first_half_mean",
    "second_half_mean",
    "slope_per_reading",
    "last_12_mean",
    "last_24_mean",
    "last_value",
    "median_absolute_deviation",
)


def window_features(values: list[float] | np.ndarray) -> dict[str, float]:
    """Summarize one complete window; reject missing or non-finite readings."""
    window = np.asarray(values, dtype=float)
    if window.shape != (WINDOW_SIZE,):
        raise ValueError(f"Expected exactly {WINDOW_SIZE} readings.")
    if not np.isfinite(window).all():
        raise ValueError("A forecast window cannot contain missing or non-finite values.")

    center = float(np.median(window))
    # Centered least-squares slope; avoids the repeated polyfit setup cost for
    # every overlapping training window.
    x = np.arange(WINDOW_SIZE, dtype=float)
    centered_x = x - x.mean()
    slope = float(
        np.dot(centered_x, window - window.mean()) / np.dot(centered_x, centered_x)
    )
    return {
        "mean": float(np.mean(window)),
        "std": float(np.std(window)),
        "median": center,
        "minimum": float(np.min(window)),
        "maximum": float(np.max(window)),
        "first_half_mean": float(np.mean(window[:48])),
        "second_half_mean": float(np.mean(window[48:])),
        "slope_per_reading": slope,
        "last_12_mean": float(np.mean(window[-12:])),
        "last_24_mean": float(np.mean(window[-24:])),
        "last_value": float(window[-1]),
        "median_absolute_deviation": float(np.median(np.abs(window - center))),
    }
