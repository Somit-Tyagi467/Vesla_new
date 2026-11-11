import secrets
import hashlib
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

DEVICE_ONLINE_TIMEOUT_SECONDS = 15


def random_avatar_index():
    return secrets.randbelow(9)


def default_device_sensor_configuration():
    """Sensors fitted to the current ESP32 prototype build."""
    return ["tds", "turbidity", "temperature"]


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vesla_profile",
    )
    avatar_index = models.PositiveSmallIntegerField(default=random_avatar_index)
    phone_number = models.CharField(max_length=16, blank=True)
    email_alerts_enabled = models.BooleanField(default=True)
    sms_alerts_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_username()} profile"


class Device(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vesla_devices",
    )
    device_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=80)
    sensor_configuration = models.JSONField(default=default_device_sensor_configuration)
    api_key_hash = models.CharField(max_length=64)
    firmware_version = models.CharField(max_length=40, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @staticmethod
    def hash_api_key(value):
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    @property
    def is_online(self):
        return bool(
            self.last_seen
            and self.last_seen >= timezone.now() - timedelta(seconds=DEVICE_ONLINE_TIMEOUT_SECONDS)
        )

    def __str__(self):
        return f"{self.name} ({self.device_id})"


class DevicePairingCode(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vesla_pairing_codes",
    )
    code_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)

    @staticmethod
    def hash_code(value):
        return hashlib.sha256(value.strip().upper().encode("utf-8")).hexdigest()

    @property
    def is_usable(self):
        return self.used_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"Pairing code for {self.owner.get_username()}"


class Reading(models.Model):
    device_id = models.CharField(max_length=64, default="VESLA-001", db_index=True)
    ph = models.FloatField(null=True, blank=True)
    ph_is_demo = models.BooleanField(default=False)
    tds_ppm = models.FloatField(null=True, blank=True)
    tds_voltage = models.FloatField(null=True, blank=True)
    turbidity_voltage = models.FloatField(null=True, blank=True)
    turbidity_ntu = models.FloatField(null=True, blank=True)
    temperature_c = models.FloatField(null=True, blank=True)
    pressure_kpa = models.FloatField(null=True, blank=True)
    pressure_is_demo = models.BooleanField(default=False)
    flow_lpm = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.device_id} reading at {self.created_at}"


class BatchAnalysis(models.Model):
    device_id = models.CharField(max_length=64, db_index=True)
    batch_number = models.PositiveIntegerField()
    first_reading_id = models.PositiveBigIntegerField()
    last_reading_id = models.PositiveBigIntegerField(db_index=True)
    reading_count = models.PositiveIntegerField(default=96)
    result = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-batch_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["device_id", "batch_number"],
                name="unique_analysis_batch_per_device",
            ),
        ]

    def __str__(self):
        return f"{self.device_id} analysis batch {self.batch_number}"


class DemoDataSettings(models.Model):
    """Admin-controlled switch for presentation-only graph values."""

    enabled = models.BooleanField(
        default=False,
        help_text=(
            "Show clearly marked sample pH/pressure values when a requested "
            "reading history contains no real values for that sensor. "
            "Sample values are generated for display only and are not saved."
        ),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "demo graph setting"
        verbose_name_plural = "demo graph settings"

    def save(self, *args, **kwargs):
        # There is one global display setting, always stored with primary key 1.
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Keep a single stable setting row; disable demo mode instead.
        self.enabled = False
        self.save(update_fields=["enabled", "updated_at"])

    def __str__(self):
        return "Demo graph values: enabled" if self.enabled else "Demo graph values: disabled"


class StoreOrder(models.Model):
    STATUS_AWAITING_PAYMENT = "awaiting_payment"
    STATUS_CHOICES = [(STATUS_AWAITING_PAYMENT, "Awaiting payment")]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="vesla_orders",
    )
    order_number = models.CharField(max_length=24, unique=True, db_index=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_AWAITING_PAYMENT)
    payment_method = models.CharField(max_length=12)
    items = models.JSONField(default=list)
    subtotal_paise = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3, default="INR")
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=24)
    address = models.CharField(max_length=240)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_number} · {self.owner.get_username()}"


class PurchasedDevice(models.Model):
    """One physical monitor unit purchased in an order, optionally paired later."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vesla_purchased_devices",
    )
    order = models.ForeignKey(StoreOrder, on_delete=models.CASCADE, related_name="purchased_devices")
    line_index = models.PositiveSmallIntegerField(default=0)
    unit_index = models.PositiveSmallIntegerField(default=0)
    product_id = models.CharField(max_length=40)
    product_name = models.CharField(max_length=100)
    add_ons = models.JSONField(default=list)
    device = models.OneToOneField(
        Device,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="purchase_record",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "line_index", "unit_index"]

    def __str__(self):
        return f"{self.product_name} · {self.order.order_number}"


class AlertState(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="alert_states")
    alert_type = models.CharField(max_length=32)
    active = models.BooleanField(default=False)
    last_value = models.FloatField(null=True, blank=True)
    last_notified_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["device", "alert_type"], name="unique_device_alert_state"),
        ]

    def __str__(self):
        return f"{self.device.device_id}: {self.alert_type} ({'active' if self.active else 'normal'})"
