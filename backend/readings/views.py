import logging
import hmac
import json
import re
import secrets
from datetime import timedelta

from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .analysis_engine import BATCH_SIZE, process_pending_batches
from .demo_data import demo_parameters
from .models import BatchAnalysis, DemoDataSettings, Device, DevicePairingCode, PurchasedDevice, Reading, StoreOrder, UserProfile
from .notifications import evaluate_reading_alerts
from .serializers import BatchAnalysisSerializer, ReadingSerializer

logger = logging.getLogger(__name__)

SUPPORTED_DEVICE_SENSORS = {"ph", "tds", "turbidity", "temperature", "pressure", "flow"}
DEFAULT_DEVICE_SENSORS = ["tds", "turbidity", "temperature"]


def platform_user_data(user):
    if user.is_superuser:
        role = "admin"
    elif user.is_staff:
        role = "staff"
    else:
        role = "user"
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        "id": user.pk,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar_index": profile.avatar_index,
        "role": role,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "capabilities": {
            "view_dashboard": True,
            "manage_demo_data": user.is_staff,
            "manage_platform": user.is_superuser,
        },
    }


def apply_demo_graph_values(readings, *, admin_preview=False):
    """Return display copies with demo data only for wholly empty graph series."""
    demo_enabled = admin_preview and DemoDataSettings.objects.filter(pk=1, enabled=True).exists()
    fields = (
        ("ph", "ph_is_demo", 0),
        ("pressure_kpa", "pressure_is_demo", 1),
    )
    for field, demo_flag, demo_index in fields:
        has_real_values = any(
            item.get(field) is not None and not item.get(demo_flag, False)
            for item in readings
        )
        for item in readings:
            if item.get(demo_flag):
                item[field] = None
                item[demo_flag] = False

        if demo_enabled and not has_real_values:
            for item in readings:
                ph, pressure = demo_parameters(item.get("id", 0))
                item[field] = ph if demo_index == 0 else pressure
                item[demo_flag] = True
    return readings


def visible_devices(user):
    """Superusers can inspect the platform; other accounts see owned devices."""
    devices = Device.objects.all() if user.is_superuser else Device.objects.filter(owner=user)
    return devices


@ensure_csrf_cookie
@require_GET
def csrf_cookie(request):
    return JsonResponse({"csrfToken": get_token(request)})


@csrf_protect
@require_POST
def platform_login(request):
    try:
        payload = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request body."}, status=400)

    user = authenticate(
        request,
        username=str(payload.get("username", "")).strip(),
        password=str(payload.get("password", "")),
    )
    if user is None or not user.is_active:
        return JsonResponse({"detail": "Username or password is incorrect."}, status=400)

    login(request, user)
    return JsonResponse(platform_user_data(user))


@csrf_protect
@require_POST
def platform_register(request):
    try:
        payload = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request body."}, status=400)

    username = str(payload.get("username", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    password_confirm = str(payload.get("password_confirm", ""))
    if not username or not email or not password:
        return JsonResponse({"detail": "Username, email, and password are required."}, status=400)
    if password != password_confirm:
        return JsonResponse({"detail": "The passwords do not match."}, status=400)

    User = get_user_model()
    candidate = User(username=username, email=email)
    try:
        validate_email(email)
        User._meta.get_field("username").clean(username, candidate)
        validate_password(password, user=candidate)
    except DjangoValidationError as error:
        return JsonResponse({"detail": " ".join(error.messages)}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"detail": "That username is already in use."}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"detail": "That email is already registered."}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    login(request, user)
    return JsonResponse(platform_user_data(user), status=201)


@require_GET
def platform_session(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"authenticated": False})
    return JsonResponse({
        "authenticated": True,
        "user": platform_user_data(user),
    })


@csrf_protect
@require_POST
def platform_shuffle_avatar(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Sign in to change your avatar."}, status=401)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    choices = [index for index in range(9) if index != profile.avatar_index]
    profile.avatar_index = secrets.choice(choices)
    profile.save(update_fields=["avatar_index", "updated_at"])
    return JsonResponse({"avatar_index": profile.avatar_index})


class ProfileAlertSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            "phone_number": profile.phone_number,
            "email_alerts_enabled": profile.email_alerts_enabled,
            "sms_alerts_enabled": profile.sms_alerts_enabled,
        })

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        phone_number = str(request.data.get("phone_number", profile.phone_number)).strip()
        email_enabled = request.data.get("email_alerts_enabled", profile.email_alerts_enabled)
        sms_enabled = request.data.get("sms_alerts_enabled", profile.sms_alerts_enabled)
        if len(phone_number) > 16 or (phone_number and not re.fullmatch(r"\+[1-9]\d{7,14}", phone_number)):
            return Response({"detail": "Enter an international phone number such as +919876543210."}, status=400)
        if not isinstance(email_enabled, bool) or not isinstance(sms_enabled, bool):
            return Response({"detail": "Alert preferences must be true or false."}, status=400)
        if sms_enabled and not phone_number:
            return Response({"detail": "Add a phone number before enabling SMS alerts."}, status=400)
        profile.phone_number = phone_number
        profile.email_alerts_enabled = email_enabled
        profile.sms_alerts_enabled = sms_enabled
        profile.save(update_fields=["phone_number", "email_alerts_enabled", "sms_alerts_enabled", "updated_at"])
        return Response({
            "phone_number": profile.phone_number,
            "email_alerts_enabled": profile.email_alerts_enabled,
            "sms_alerts_enabled": profile.sms_alerts_enabled,
        })


@csrf_protect
@require_POST
def create_device_pairing_code(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Sign in to add a device."}, status=401)

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "-".join(
        "".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2)
    )
    expires_at = timezone.now() + timedelta(minutes=10)
    DevicePairingCode.objects.create(
        owner=request.user,
        code_hash=DevicePairingCode.hash_code(code),
        expires_at=expires_at,
    )
    return JsonResponse({"pairing_code": code, "expires_at": expires_at.isoformat()})


@csrf_exempt
@require_POST
def claim_device(request):
    try:
        payload = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request body."}, status=400)

    pairing_code = str(payload.get("pairing_code", "")).strip().upper()
    device_id = str(payload.get("device_id", "")).strip().upper()
    name = str(payload.get("name", "")).strip()[:80]
    sensors = payload.get("sensor_configuration", DEFAULT_DEVICE_SENSORS)
    if not pairing_code or not device_id:
        return JsonResponse({"detail": "Pairing code and device ID are required."}, status=400)
    if (
        not isinstance(sensors, list)
        or not sensors
        or len(sensors) > len(SUPPORTED_DEVICE_SENSORS)
        or any(not isinstance(sensor, str) or sensor not in SUPPORTED_DEVICE_SENSORS for sensor in sensors)
        or len(set(sensors)) != len(sensors)
    ):
        return JsonResponse({"detail": "Provide a valid sensor configuration for this device."}, status=400)
    if len(device_id) > 64 or not all(char.isalnum() or char in "-_" for char in device_id):
        return JsonResponse({"detail": "Invalid device ID."}, status=400)

    code_hash = DevicePairingCode.hash_code(pairing_code)
    with transaction.atomic():
        pairing = DevicePairingCode.objects.select_for_update().filter(
            code_hash=code_hash,
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).first()
        if pairing is None:
            return JsonResponse({"detail": "Pairing code is invalid, expired, or already used."}, status=400)
        api_key = secrets.token_urlsafe(32)
        existing_device = Device.objects.select_for_update().filter(device_id=device_id).first()
        if existing_device:
            # Re-pairing an existing ID is allowed only for its current owner.
            # This supports replacing lost device credentials without giving
            # another account a way to take over a registered device.
            if existing_device.owner_id != pairing.owner_id:
                return JsonResponse({"detail": "This device is already linked to another account."}, status=409)
            existing_device.name = name or existing_device.name
            existing_device.api_key_hash = Device.hash_api_key(api_key)
            existing_device.sensor_configuration = sensors
            existing_device.last_seen = None
            existing_device.save(update_fields=["name", "api_key_hash", "sensor_configuration", "last_seen", "updated_at"])
        else:
            try:
                with transaction.atomic():
                    Device.objects.create(
                        owner=pairing.owner,
                        device_id=device_id,
                        name=name or device_id,
                        api_key_hash=Device.hash_api_key(api_key),
                        sensor_configuration=sensors,
                    )
            except IntegrityError:
                return JsonResponse({"detail": "This device has already been paired."}, status=409)
        claimed_device = existing_device or Device.objects.get(device_id=device_id)
        pending_purchase = None
        if existing_device is None:
            pending_purchase = PurchasedDevice.objects.select_for_update().filter(
                owner=pairing.owner,
                device__isnull=True,
            ).order_by("created_at", "line_index", "unit_index").first()
        if pending_purchase:
            pending_purchase.device = claimed_device
            pending_purchase.save(update_fields=["device"])
        pairing.used_at = timezone.now()
        pairing.save(update_fields=["used_at"])

    return JsonResponse({"device_id": device_id, "device_api_key": api_key, "sensor_configuration": sensors}, status=201)


@require_GET
def list_devices(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Sign in to view your devices."}, status=401)
    devices = visible_devices(request.user).order_by("created_at")
    return JsonResponse({"devices": [{
        "device_id": device.device_id,
        "name": device.name,
        "sensor_configuration": device.sensor_configuration or DEFAULT_DEVICE_SENSORS,
        "online": device.is_online,
        "last_seen": device.last_seen.isoformat() if device.last_seen else None,
        "created_at": device.created_at.isoformat(),
    } for device in devices]})


@csrf_protect
@require_POST
def platform_logout(request):
    logout(request)
    return JsonResponse({"authenticated": False})


class ReadingListCreateView(generics.ListCreateAPIView):
    serializer_class = ReadingSerializer

    def get_permissions(self):
        # ESP32 ingestion remains device-key protected in production, while
        # browser reads require a signed-in Vesla account.
        permission = IsAuthenticated if self.request.method == "GET" else AllowAny
        return [permission()]

    def get_queryset(self):
        visible_device_ids = visible_devices(self.request.user).values_list("device_id", flat=True)
        queryset = Reading.objects.filter(device_id__in=visible_device_ids)
        device_id = self.request.query_params.get("device_id")
        if device_id:
            queryset = queryset.filter(device_id=device_id)

        try:
            limit = int(self.request.query_params.get("limit", "100"))
        except ValueError:
            limit = 100

        return queryset[:max(1, min(limit, 500))]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        readings = [dict(item) for item in serializer.data]
        readings = apply_demo_graph_values(
            readings,
            admin_preview=bool(request.user.is_authenticated and request.user.is_staff),
        )
        if page is not None:
            return self.get_paginated_response(readings)
        return Response(readings)

    def perform_create(self, serializer):
        device_id = str(serializer.validated_data.get("device_id", "VESLA-001")).strip().upper()
        supplied_key = self.request.headers.get("X-Vesla-Device-Key", "")
        device = Device.objects.filter(device_id=device_id).first()
        if device:
            supplied_hash = Device.hash_api_key(supplied_key)
            if not hmac.compare_digest(supplied_hash, device.api_key_hash):
                raise PermissionDenied("Invalid device API key.")
            device.last_seen = timezone.now()
            device.save(update_fields=["last_seen", "updated_at"])
        else:
            expected_key = settings.VESLA_DEVICE_API_KEY
            if not expected_key or not hmac.compare_digest(supplied_key, expected_key):
                raise PermissionDenied("Device is not paired or its API key is invalid.")
        reading = serializer.save()
        if device is not None:
            try:
                evaluate_reading_alerts(reading, device)
            except Exception:
                logger.exception("Alert evaluation failed for device %s", device_id)
        try:
            process_pending_batches(reading.device_id)
        except Exception:
            # Keep device ingestion working even if analysis needs investigation.
            logger.exception("Batch analysis failed for device %s", reading.device_id)


class LatestReadingView(generics.RetrieveAPIView):
    serializer_class = ReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        visible_device_ids = visible_devices(self.request.user).values_list("device_id", flat=True)
        queryset = Reading.objects.filter(device_id__in=visible_device_ids)
        device_id = self.request.query_params.get("device_id")
        if device_id:
            queryset = queryset.filter(device_id=device_id)

        reading = queryset.first()
        if reading is None:
            raise NotFound("No sensor readings have been stored yet.")
        return reading


class LatestBatchAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        device_id = request.query_params.get("device_id")
        visible_device_ids = visible_devices(request.user).values_list("device_id", flat=True)
        if device_id and not visible_devices(request.user).filter(device_id=device_id).exists():
            return Response({"detail": "Device not found."}, status=404)
        if not device_id:
            device_id = (
                Reading.objects.filter(device_id__in=visible_device_ids).order_by("-created_at")
                .values_list("device_id", flat=True)
                .first()
            )

        if not device_id:
            return Response({
                "device_id": None,
                "batch_size": BATCH_SIZE,
                "latest": None,
                "pending_readings": 0,
                "readings_until_next_analysis": BATCH_SIZE,
            })

        latest = BatchAnalysis.objects.filter(device_id=device_id, device_id__in=visible_device_ids).first()
        if latest:
            pending = Reading.objects.filter(
                device_id=device_id,
                id__gt=latest.last_reading_id,
            ).count()
        else:
            pending = Reading.objects.filter(device_id=device_id, device_id__in=visible_device_ids).count()

        return Response({
            "device_id": device_id,
            "batch_size": BATCH_SIZE,
            "latest": BatchAnalysisSerializer(latest).data if latest else None,
            "pending_readings": pending % BATCH_SIZE,
            "readings_until_next_analysis": BATCH_SIZE - (pending % BATCH_SIZE),
        })


class IsPlatformStaff(BasePermission):
    """Staff accounts and admins can change or preview demo graph data."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class DemoDataSettingsView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        setting, _ = DemoDataSettings.objects.get_or_create(pk=1)
        return Response({"enabled": setting.enabled})

    def patch(self, request):
        enabled = request.data.get("enabled")
        if not isinstance(enabled, bool):
            return Response({"detail": "enabled must be true or false."}, status=400)
        setting, _ = DemoDataSettings.objects.get_or_create(pk=1)
        setting.enabled = enabled
        setting.save(update_fields=["enabled", "updated_at"])
        return Response({"enabled": setting.enabled})


class StoreOrderCreateView(APIView):
    """Create an authenticated order intent; payment is handled by a gateway later."""
    permission_classes = [IsAuthenticated]

    PRODUCTS = {
        "vesla-starter": ("Vesla Starter", 2499),
        "vesla-home": ("Vesla Home", 3999),
        "vesla-pro": ("Vesla Pro", 5999),
    }
    ADD_ONS = {
        "ph": ("pH sensor kit", 899),
        "pressure": ("Pressure sensor", 699),
        "flow": ("Water flow sensor", 599),
        "tds": ("Replacement TDS probe", 399),
        "turbidity": ("Replacement turbidity probe", 499),
    }

    def get(self, request):
        orders = StoreOrder.objects.filter(owner=request.user).prefetch_related("purchased_devices")
        purchases = []
        for order in orders:
            units_by_line = {
                (unit.line_index, unit.unit_index): unit
                for unit in order.purchased_devices.select_related("device").all()
            }
            for line_index, line in enumerate(order.items):
                for unit_index in range(int(line.get("quantity", 1))):
                    unit = units_by_line.get((line_index, unit_index))
                    device = unit.device if unit else None
                    purchases.append({
                        "id": unit.pk if unit else f"{order.pk}-{line_index}-{unit_index}",
                        "order_number": order.order_number,
                        "order_status": order.status,
                        "product_id": line.get("product_id", ""),
                        "product_name": line.get("name", "Vesla device"),
                        "add_ons": line.get("add_ons", []),
                        "created_at": order.created_at.isoformat(),
                        "setup_complete": bool(device),
                        "device_id": device.device_id if device else None,
                        "device_name": device.name if device else None,
                    })
        return Response({"purchased_devices": purchases})

    def post(self, request):
        cart = request.data.get("items")
        delivery = request.data.get("delivery")
        method = str(request.data.get("payment_method", "")).lower()
        if not isinstance(cart, list) or not cart or len(cart) > 20:
            return Response({"detail": "Add between 1 and 20 product configurations."}, status=400)
        if not isinstance(delivery, dict):
            return Response({"detail": "Delivery details are required."}, status=400)
        if method not in {"upi", "card", "cod"}:
            return Response({"detail": "Choose a supported payment method."}, status=400)

        fields = ("full_name", "email", "phone", "address", "city", "postal_code")
        values = {field: str(delivery.get(field, "")).strip() for field in fields}
        if any(not values[field] for field in fields):
            return Response({"detail": "Complete all delivery fields."}, status=400)
        if len(values["full_name"]) > 120 or len(values["address"]) > 240 or len(values["city"]) > 100:
            return Response({"detail": "One or more delivery fields are too long."}, status=400)
        if len(values["phone"]) > 24 or len(values["postal_code"]) > 16:
            return Response({"detail": "Phone number or postal code is too long."}, status=400)
        try:
            validate_email(values["email"])
        except DjangoValidationError:
            return Response({"detail": "Enter a valid email address."}, status=400)

        priced_items = []
        total_rupees = 0
        total_units = 0
        for line in cart:
            if not isinstance(line, dict):
                return Response({"detail": "Invalid cart item."}, status=400)
            product_id = str(line.get("product_id", ""))
            product = self.PRODUCTS.get(product_id)
            add_on_ids = line.get("add_on_ids", [])
            quantity = line.get("quantity")
            if product is None or not isinstance(add_on_ids, list) or len(add_on_ids) > len(self.ADD_ONS):
                return Response({"detail": "A selected device or add-on is invalid."}, status=400)
            if isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= 99:
                return Response({"detail": "Each quantity must be between 1 and 99."}, status=400)
            total_units += quantity
            if total_units > 20:
                return Response({"detail": "An order can contain up to 20 device units."}, status=400)
            if len(set(add_on_ids)) != len(add_on_ids) or any(add_on not in self.ADD_ONS for add_on in add_on_ids):
                return Response({"detail": "A selected add-on is invalid."}, status=400)
            add_ons = [{"id": add_on, "name": self.ADD_ONS[add_on][0], "unit_price_inr": self.ADD_ONS[add_on][1]} for add_on in sorted(add_on_ids)]
            unit_price = product[1] + sum(add_on["unit_price_inr"] for add_on in add_ons)
            priced_items.append({
                "product_id": product_id,
                "name": product[0],
                "add_ons": add_ons,
                "quantity": quantity,
                "unit_price_inr": unit_price,
                "line_total_inr": unit_price * quantity,
            })
            total_rupees += unit_price * quantity
        if total_rupees > 10_000_000:
            return Response({"detail": "Order total exceeds the current checkout limit."}, status=400)

        with transaction.atomic():
            order = StoreOrder.objects.create(
                owner=request.user,
                order_number=f"VS-{secrets.token_hex(5).upper()}",
                payment_method=method,
                items=priced_items,
                subtotal_paise=total_rupees * 100,
                **values,
            )
            PurchasedDevice.objects.bulk_create([
                PurchasedDevice(
                    owner=request.user,
                    order=order,
                    line_index=line_index,
                    unit_index=unit_index,
                    product_id=line["product_id"],
                    product_name=line["name"],
                    add_ons=line["add_ons"],
                )
                for line_index, line in enumerate(priced_items)
                for unit_index in range(line["quantity"])
            ])
        return Response({
            "order_number": order.order_number,
            "status": order.status,
            "payment_method": order.payment_method,
            "subtotal_paise": order.subtotal_paise,
            "currency": order.currency,
            "detail": "Order saved. Payment has not been processed; online payment will be enabled after a payment provider is configured.",
        }, status=201)
