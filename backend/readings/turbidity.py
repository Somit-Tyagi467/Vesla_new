"""Shared prototype turbidity conversion used by the dashboard and analysis."""

import math


RO_BASELINE_V = 2.7
REFERENCE_CLEAR_V = 4.2
MAX_ESTIMATE_NTU = 3000.0


def estimate_turbidity_ntu(voltage):
    """Convert module output voltage into the project's current NTU estimate.

    This applies the same RO-baseline offset and SEN0189-style curve as the
    current dashboard/firmware. It remains an estimate until calibrated with
    certified turbidity standards.
    """
    try:
        measured_voltage = float(voltage)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(measured_voltage):
        return None

    adjusted_voltage = measured_voltage + (REFERENCE_CLEAR_V - RO_BASELINE_V)
    if adjusted_voltage < 2.5:
        return MAX_ESTIMATE_NTU

    estimate = (
        -1120.4 * adjusted_voltage**2
        + 5742.3 * adjusted_voltage
        - 4352.9
    )
    return min(MAX_ESTIMATE_NTU, max(0.0, estimate))


def turbidity_condition(ntu):
    """Return the dashboard's prototype turbidity band for an NTU estimate."""
    if ntu is None:
        return None
    if ntu > 1750:
        return "dirty"
    if ntu > 700:
        return "cloudy"
    if ntu >= 500:
        return "slightly_cloudy"
    return "clear"


def tds_condition(ppm):
    """Return the dashboard's general TDS display band."""
    if ppm is None:
        return None
    if ppm > 1000:
        return "very_high_tds"
    if ppm > 500:
        return "elevated_tds"
    if ppm > 200:
        return "household_reference"
    return "low_tds"
