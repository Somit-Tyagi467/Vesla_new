"""Clearly marked presentation-only values for sensors not yet connected."""

import math


def demo_parameters(reading_id):
    """Create a repeatable, gently varying presentation scenario.

    These values are illustrative only. They must never be treated as sensor
    measurements or as evidence of water quality.
    """
    index = max(0, int(reading_id))
    ph = 7.1 + 0.18 * math.sin(index / 25.0) + 0.04 * math.sin(index / 5.0)
    pressure_kpa = (
        150.0
        + 12.0 * math.sin(index / 35.0)
        + 3.0 * math.sin(index / 7.0)
    )
    return round(ph, 3), round(pressure_kpa, 2)


def fill_missing_demo_parameters(reading):
    """Populate only missing pH/pressure fields and mark their demo provenance."""
    ph, pressure = demo_parameters(reading.pk or 0)
    changed_fields = []

    if reading.ph is None:
        reading.ph = ph
        reading.ph_is_demo = True
        changed_fields.extend(("ph", "ph_is_demo"))
    if reading.pressure_kpa is None:
        reading.pressure_kpa = pressure
        reading.pressure_is_demo = True
        changed_fields.extend(("pressure_kpa", "pressure_is_demo"))

    if changed_fields:
        reading.save(update_fields=changed_fields)
    return reading
