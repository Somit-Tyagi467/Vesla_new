"""Incremental, explainable trend analysis over fixed per-device reading batches."""

import math
import statistics

from django.db import IntegrityError, transaction

from .models import BatchAnalysis, Reading
from .turbidity import estimate_turbidity_ntu, tds_condition, turbidity_condition

BATCH_SIZE = 96
MIN_SENSOR_SAMPLES = 12

SENSORS = {
    "turbidity_ntu": {
        "label": "Turbidity",
        "unit": "NTU",
        "minimum_change": 5.0,
        "minimum": 0.0,
        "maximum": 3000.0,
    },
    "tds_ppm": {
        "label": "TDS", "unit": "ppm", "minimum_change": 5.0,
        "minimum": 0.0, "maximum": 1000.0,
    },
    "ph": {
        "label": "pH", "unit": "", "minimum_change": 0.05,
        "minimum": 0.0, "maximum": 14.0,
    },
    "temperature_c": {
        "label": "Temperature",
        "unit": "°C",
        "minimum_change": 0.2,
        "minimum": -55.0,
        "maximum": 125.0,
    },
    "pressure_kpa": {
        "label": "Pressure",
        "unit": "kPa",
        "minimum_change": 0.2,
        "minimum": 0.0,
    },
    "flow_lpm": {
        "label": "Flow", "unit": "L/min", "minimum_change": 0.05,
        "minimum": 0.0, "maximum": 30.0,
    },
}


def _sensor_values(readings, field):
    """Return ordered analysis values and their provenance counts."""
    values = []
    sources = {"hardware": 0, "demo": 0, "legacy_ntu": 0}
    for reading in readings:
        if field == "turbidity_ntu":
            voltage = reading.turbidity_voltage
            if voltage is not None:
                value = estimate_turbidity_ntu(voltage)
                source = "hardware"
            else:
                value = reading.turbidity_ntu
                source = "legacy_ntu"
        else:
            value = getattr(reading, field)
            source_flag = f"{field.removesuffix('_kpa')}_is_demo"
            is_demo = bool(getattr(reading, source_flag, False))
            source = "demo" if is_demo else "hardware"

        if value is None:
            continue
        value = float(value)
        if math.isfinite(value):
            values.append(value)
            sources[source] += 1
    return values, sources


def _median_absolute_deviation(values, center):
    return statistics.median(abs(value - center) for value in values)


def _sensor_analysis(field, values, previous_sensor):
    config = SENSORS[field]
    if len(values) < MIN_SENSOR_SAMPLES:
        return {
            "label": config["label"],
            "unit": config["unit"],
            "sample_count": len(values),
            "status": "insufficient_data",
            "forecast_direction": "insufficient_history",
        }

    center = statistics.median(values)
    mad = _median_absolute_deviation(values, center)
    midpoint = len(values) // 2
    first_half_mean = statistics.fmean(values[:midpoint])
    second_half_mean = statistics.fmean(values[midpoint:])
    change = second_half_mean - first_half_mean
    noise_floor = max(config["minimum_change"], abs(statistics.fmean(values)) * 0.01, mad * 0.5)
    if change > noise_floor:
        trend = "increasing"
    elif change < -noise_floor:
        trend = "decreasing"
    else:
        trend = "stable"

    anomalies = []
    if mad > 0:
        anomalies = [
            value for value in values
            if abs(0.6745 * (value - center) / mad) > 3.5
        ]

    previous_mean = None
    predicted_this_batch = None
    current_mean = statistics.fmean(values)
    next_batch_prediction = current_mean
    prediction_error = None
    forecast_direction = "insufficient_history"
    forecast_change = None
    if previous_sensor and previous_sensor.get("status") == "analyzed":
        previous_mean = previous_sensor.get("mean")
        predicted_this_batch = previous_sensor.get("next_batch_prediction")
        if predicted_this_batch is not None:
            prediction_error = current_mean - predicted_this_batch
        if previous_mean is not None and predicted_this_batch is not None:
            # Damp the two-batch slope to reduce oscillation from noisy sensors.
            raw_prediction = current_mean + 0.5 * (current_mean - previous_mean)
            next_batch_prediction = max(
                config["minimum"],
                min(config.get("maximum", math.inf), raw_prediction),
            )
            forecast_change = next_batch_prediction - current_mean
            if forecast_change > noise_floor:
                forecast_direction = "increasing"
            elif forecast_change < -noise_floor:
                forecast_direction = "decreasing"
            else:
                forecast_direction = "stable"

    result = {
        "label": config["label"],
        "unit": config["unit"],
        "status": "analyzed",
        "sample_count": len(values),
        "mean": round(current_mean, 4),
        "median": round(center, 4),
        "minimum": round(min(values), 4),
        "maximum": round(max(values), 4),
        "first_half_mean": round(first_half_mean, 4),
        "second_half_mean": round(second_half_mean, 4),
        "change": round(change, 4),
        "trend": trend,
        "forecast_direction": forecast_direction,
        "forecast_change": round(forecast_change, 4) if forecast_change is not None else None,
        "previous_batch_mean": round(previous_mean, 4) if previous_mean is not None else None,
        "predicted_this_batch": round(predicted_this_batch, 4) if predicted_this_batch is not None else None,
        "prediction_error": round(prediction_error, 4) if prediction_error is not None else None,
        "next_batch_prediction": round(next_batch_prediction, 4),
        "anomaly_count": len(anomalies),
        "anomaly_values": [round(value, 4) for value in anomalies[:10]],
    }
    if field == "turbidity_ntu":
        result["condition"] = turbidity_condition(current_mean)
        result["forecast_condition"] = (
            turbidity_condition(next_batch_prediction)
            if forecast_direction != "insufficient_history"
            else None
        )
    elif field == "tds_ppm":
        result["condition"] = tds_condition(current_mean)
        result["forecast_condition"] = (
            tds_condition(next_batch_prediction)
            if forecast_direction != "insufficient_history"
            else None
        )
    return result


def _recommendations(sensors):
    recommendations = []
    available = 0
    for field, result in sensors.items():
        if result.get("status") != "analyzed":
            continue
        available += 1
        trend = result["forecast_direction"]
        label = result["label"]
        if trend == "insufficient_history":
            if result.get("anomaly_count", 0) > 0:
                recommendations.append(
                    f"Some {label.lower()} readings changed suddenly. Check whether anything changed in the water system, then see if the next cycle confirms it."
                )
            continue
        if trend == "increasing":
            if field == "turbidity_ntu":
                forecast_band = result.get("forecast_condition")
                band_text = f" The estimate is in the {forecast_band.replace('_', ' ')} range." if forecast_band else ""
                recommendations.append(
                    "The estimated turbidity may rise in the next cycle." + band_text + " If cloudiness continues, check the tank and filter for visible sediment."
                )
            elif field == "tds_ppm":
                forecast_band = result.get("forecast_condition")
                band_text = f" The next estimate falls in the {forecast_band.replace('_', ' ')} band." if forecast_band else ""
                recommendations.append(
                    "TDS may rise in the next cycle." + band_text + " If it stays high, check whether the water source or RO filter has changed."
                )
            elif field == "ph":
                recommendations.append(
                    "The pH reading may rise in the next cycle. If the change continues, compare it with the range recommended for your water system."
                )
            else:
                recommendations.append(
                    f"The {label.lower()} reading may rise in the next cycle. If it stays outside its usual range, check the equipment or water system connected to this reading."
                )
        elif trend == "decreasing":
            if field == "tds_ppm":
                recommendations.append(
                    "TDS may fall in the next cycle. Check whether that lower level continues, especially after a change to the water source or filter."
                )
            elif field == "turbidity_ntu":
                recommendations.append(
                    "The water may look clearer in the next cycle. Check the next reading to see whether this improvement continues."
                )
            else:
                recommendations.append(
                    f"The {label.lower()} reading may fall in the next cycle. If it stays outside its usual range, check the equipment or water system connected to this reading."
                )
        elif trend == "stable":
            if field == "turbidity_ntu":
                recommendations.append(
                    "The water may look about as clear as it does now in the next cycle. A steady turbidity reading describes cloudiness only; it does not confirm that the tank or water is safe."
                )
            elif field == "tds_ppm":
                recommendations.append(
                    "TDS is expected to stay about the same in the next cycle."
                )
            elif result.get("anomaly_count", 0) == 0:
                recommendations.append(
                    f"The {label.lower()} reading is expected to stay about the same in the next cycle."
                )

        if result.get("anomaly_count", 0) > 0:
            recommendations.append(
                f"Some {label.lower()} readings changed suddenly. Check whether anything changed in the water system, then see if the next cycle confirms it."
            )

        if field == "tds_ppm":
            mean = result.get("mean", 0)
            if mean > 1000:
                recommendations.append(
                    "The TDS estimate is in the very high range. Check the water source and treatment filter."
                )
            elif mean > 500:
                recommendations.append(
                    "TDS is above the dashboard's household reference range. If it stays elevated, check the water source and treatment filter."
                )

    if available == 0:
        return [
            "There aren't enough readings from the sensors yet to spot a pattern. Keep the device connected and collecting readings."
        ]
    if not recommendations:
        if all(
            result.get("forecast_direction") == "insufficient_history"
            for result in sensors.values()
            if result.get("status") == "analyzed"
        ):
            recommendations.append(
                "This is the first full cycle, so there isn't enough history to tell whether readings may rise or fall. The next cycle will give us a useful comparison."
            )
        else:
            recommendations.append(
                "The readings are expected to stay about the same in the next cycle, and no sudden changes stood out."
            )
    return recommendations


def analyze_reading_batch(device_id, readings, previous_analysis):
    previous_sensors = (previous_analysis.result.get("sensors", {}) if previous_analysis else {})
    sensor_results = {}
    for field in SENSORS:
        values, source_counts = _sensor_values(readings, field)
        sensor_results[field] = _sensor_analysis(
            field,
            values,
            previous_sensors.get(field),
        )
        if sensor_results[field].get("status") == "analyzed":
            if source_counts["demo"]:
                sensor_results[field]["data_source"] = "demo"
            elif source_counts["hardware"] and source_counts["legacy_ntu"]:
                sensor_results[field]["data_source"] = "mixed"
            elif source_counts["legacy_ntu"]:
                sensor_results[field]["data_source"] = "legacy_ntu"
            else:
                sensor_results[field]["data_source"] = "hardware"
            sensor_results[field]["source_counts"] = source_counts

    return {
        "model": "online linear batch forecast with median/MAD spike detection",
        "device_id": device_id,
        "batch_number": previous_analysis.batch_number + 1 if previous_analysis else 1,
        "reading_count": len(readings),
        "first_reading_id": readings[0].id,
        "last_reading_id": readings[-1].id,
        "window_start": readings[0].created_at.isoformat(),
        "window_end": readings[-1].created_at.isoformat(),
        "sensors": sensor_results,
        "recommendations": _recommendations(sensor_results),
    }


def process_pending_batches(device_id):
    """Persist every complete 96-reading batch for this device, including backlog."""
    while True:
        previous = BatchAnalysis.objects.filter(device_id=device_id).first()
        cursor = previous.last_reading_id if previous else 0
        readings = list(
            Reading.objects.filter(device_id=device_id, id__gt=cursor)
            .order_by("id")[:BATCH_SIZE]
        )
        if len(readings) < BATCH_SIZE:
            return

        result = analyze_reading_batch(device_id, readings, previous)
        try:
            with transaction.atomic():
                BatchAnalysis.objects.create(
                    device_id=device_id,
                    batch_number=result["batch_number"],
                    first_reading_id=readings[0].id,
                    last_reading_id=readings[-1].id,
                    reading_count=len(readings),
                    result=result,
                )
        except IntegrityError:
            # Another request created this same batch; re-read the cursor and continue.
            continue
