"""Threshold alert delivery helpers for incoming device readings."""

import base64
import logging
import threading
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import AlertState, Device, Reading, UserProfile

logger = logging.getLogger(__name__)


def _send_twilio_sms(phone_number, message):
    sid = settings.TWILIO_ACCOUNT_SID
    token = settings.TWILIO_AUTH_TOKEN
    sender = settings.TWILIO_FROM_NUMBER
    if not (sid and token and sender and phone_number):
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    credentials = base64.b64encode(f"{sid}:{token}".encode("utf-8")).decode("ascii")
    request = Request(
        url,
        data=urlencode({"To": phone_number, "From": sender, "Body": message}).encode("utf-8"),
        headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=8) as response:
            if 200 <= response.status < 300:
                return True
            logger.warning("SMS provider returned HTTP %s", response.status)
    except (HTTPError, URLError, TimeoutError, OSError):
        logger.exception("Could not deliver Vesla SMS alert")
    return False


def _deliver_alerts(email_address, phone_number, email_enabled, sms_enabled, subject, body):
    if email_enabled and email_address:
        try:
            sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email_address], fail_silently=False)
            if not sent:
                logger.warning("Django email backend did not send an alert to %s", email_address)
        except Exception:
            logger.exception("Could not deliver Vesla email alert to %s", email_address)

    if sms_enabled and phone_number:
        _send_twilio_sms(phone_number, body)


def evaluate_reading_alerts(reading: Reading, device: Device):
    """Notify once when a configured parameter crosses into its alert band.

    Hysteresis thresholds avoid repeated alerts when readings hover near a limit.
    Delivery runs in a short-lived background thread so sensor POST requests do
    not wait for SMTP or the SMS provider.
    """
    checks = []
    if reading.turbidity_ntu is not None:
        checks.append((
            "turbidity_cloudy",
            float(reading.turbidity_ntu),
            settings.VESLA_TURBIDITY_ALERT_NTU,
            settings.VESLA_TURBIDITY_CLEAR_NTU,
            f"Cloudy water: turbidity is {reading.turbidity_ntu:.1f} NTU (above {settings.VESLA_TURBIDITY_ALERT_NTU:g} NTU).",
        ))
    if reading.tds_ppm is not None:
        checks.append((
            "tds_high",
            float(reading.tds_ppm),
            settings.VESLA_TDS_ALERT_PPM,
            settings.VESLA_TDS_CLEAR_PPM,
            f"High TDS: {reading.tds_ppm:.1f} ppm (above {settings.VESLA_TDS_ALERT_PPM:g} ppm).",
        ))

    triggered_alerts = []
    for alert_type, value, threshold, clear_threshold, message in checks:
        with transaction.atomic():
            state, _ = AlertState.objects.get_or_create(device=device, alert_type=alert_type)
            state = AlertState.objects.select_for_update().get(pk=state.pk)
            if value <= clear_threshold:
                if state.active:
                    state.active = False
                    state.last_value = value
                    state.save(update_fields=["active", "last_value", "updated_at"])
                continue
            if value <= threshold:
                if state.active:
                    state.last_value = value
                    state.save(update_fields=["last_value", "updated_at"])
                continue
            if state.active:
                state.last_value = value
                state.save(update_fields=["last_value", "updated_at"])
                continue

            state.active = True
            state.last_value = value
            state.last_notified_at = timezone.now()
            state.save(update_fields=["active", "last_value", "last_notified_at", "updated_at"])
            triggered_alerts.append(message)

    if triggered_alerts:
        profile, _ = UserProfile.objects.get_or_create(user=device.owner)
        if profile.email_alerts_enabled or profile.sms_alerts_enabled:
            device_url = f"{settings.VESLA_FRONTEND_URL}/dashboard?device={device.device_id}"
            body = (
                f"Hello {device.owner.first_name or device.owner.get_username()},\n\n"
                "A water reading crossed a Vesla alert limit:\n"
                + "\n".join(f"• {alert}" for alert in triggered_alerts)
                + f"\n\nDevice: {device.name} ({device.device_id})"
                + f"\nView this device on your Vesla dashboard: {device_url}"
                + "\n\nThese are project sensor alerts, not a water-safety certification."
            )
            args = (
                device.owner.email,
                profile.phone_number,
                profile.email_alerts_enabled,
                profile.sms_alerts_enabled,
                f"Vesla water alert · {device.name}",
                body,
            )
            threading.Thread(target=_deliver_alerts, args=args, daemon=True, name="vesla-alert-delivery").start()
