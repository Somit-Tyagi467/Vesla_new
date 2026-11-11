from django.contrib import admin
from .models import AlertState, BatchAnalysis, DemoDataSettings, Device, DevicePairingCode, Reading, StoreOrder, UserProfile


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "device_id", "owner", "configured_sensors", "last_seen", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "device_id", "owner__username", "owner__email")
    readonly_fields = ("api_key_hash", "created_at", "updated_at")

    @admin.display(description="Configured sensors")
    def configured_sensors(self, obj):
        return ", ".join(obj.sensor_configuration or [])


@admin.register(DevicePairingCode)
class DevicePairingCodeAdmin(admin.ModelAdmin):
    list_display = ("owner", "created_at", "expires_at", "used_at")
    readonly_fields = ("owner", "code_hash", "created_at", "expires_at", "used_at")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "avatar_index", "email_alerts_enabled", "sms_alerts_enabled", "updated_at")
    search_fields = ("user__username", "user__email")


@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    list_display = (
        "device_id",
        "created_at",
        "ph",
        "tds_ppm",
        "tds_voltage",
        "turbidity_voltage",
        "turbidity_ntu",
        "temperature_c",
    )
    list_filter = ("device_id",)
    ordering = ("-created_at",)


@admin.register(BatchAnalysis)
class BatchAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        "device_id",
        "batch_number",
        "reading_count",
        "first_reading_id",
        "last_reading_id",
        "created_at",
    )
    list_filter = ("device_id",)
    ordering = ("-batch_number",)


@admin.register(DemoDataSettings)
class DemoDataSettingsAdmin(admin.ModelAdmin):
    list_display = ("enabled", "updated_at")
    fields = ("enabled", "updated_at")
    readonly_fields = ("updated_at",)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.filter(pk=1)

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser and not DemoDataSettings.objects.filter(pk=1).exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StoreOrder)
class StoreOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "owner", "status", "payment_method", "subtotal_paise", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("order_number", "owner__username", "email", "phone")
    readonly_fields = ("order_number", "owner", "status", "payment_method", "items", "subtotal_paise", "currency", "created_at")


@admin.register(AlertState)
class AlertStateAdmin(admin.ModelAdmin):
    list_display = ("device", "alert_type", "active", "last_value", "last_notified_at", "updated_at")
    list_filter = ("alert_type", "active")
    search_fields = ("device__device_id", "device__name")
    readonly_fields = ("device", "alert_type", "active", "last_value", "last_notified_at", "updated_at")
