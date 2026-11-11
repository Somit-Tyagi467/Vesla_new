from rest_framework import serializers
from .models import BatchAnalysis, Reading


class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = [
            "id",
            "device_id",
            "ph",
            "ph_is_demo",
            "tds_ppm",
            "tds_voltage",
            "turbidity_voltage",
            "turbidity_ntu",
            "temperature_c",
            "pressure_kpa",
            "pressure_is_demo",
            "flow_lpm",
            "recorded_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "ph_is_demo", "pressure_is_demo"]

    def validate(self, data):
        measurements = [
            "ph",
            "tds_ppm",
            "tds_voltage",
            "turbidity_voltage",
            "turbidity_ntu",
            "temperature_c",
            "pressure_kpa",
            "flow_lpm",
        ]
        if not any(data.get(field) is not None for field in measurements):
            raise serializers.ValidationError(
                "Provide at least one sensor measurement."
            )
        return data


class BatchAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatchAnalysis
        fields = [
            "id",
            "device_id",
            "batch_number",
            "first_reading_id",
            "last_reading_id",
            "reading_count",
            "result",
            "created_at",
        ]
