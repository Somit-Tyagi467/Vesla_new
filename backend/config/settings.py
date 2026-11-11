import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
DJANGO_ENV = os.environ.get("DJANGO_ENV", "development").strip().lower()
DEBUG = os.environ.get("DJANGO_DEBUG", "true" if DJANGO_ENV != "production" else "false").strip().lower() in {"1", "true", "yes", "on"}
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
VESLA_DEVICE_API_KEY = os.environ.get("VESLA_DEVICE_API_KEY", "").strip()

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "local-development-only-change-before-deployment"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is disabled.")

if not DEBUG and not VESLA_DEVICE_API_KEY:
    raise ImproperlyConfigured("VESLA_DEVICE_API_KEY must be set before production startup.")

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "readings",
    "corsheaders",
    "rest_framework",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "database" / "vesla.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get("DJANGO_CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}
CSRF_TRUSTED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
}
# Keep the standard local Vite addresses available even when a developer has
# configured an additional LAN origin in their environment. LAN origins are
# added below from explicitly configured ALLOWED_HOSTS; production must list
# its exact HTTPS frontend origins through environment variables.
if DEBUG:
    local_frontend_origins = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }
    CORS_ALLOWED_ORIGINS.update(local_frontend_origins)
    CSRF_TRUSTED_ORIGINS.update(local_frontend_origins)
    lan_frontend_origins = {
        f"http://{host}:5173"
        for host in ALLOWED_HOSTS
        if host not in {"*", "localhost", "127.0.0.1"} and ":" not in host
    }
    CORS_ALLOWED_ORIGINS.update(lan_frontend_origins)
    CSRF_TRUSTED_ORIGINS.update(lan_frontend_origins)
CORS_ALLOWED_ORIGINS = sorted(CORS_ALLOWED_ORIGINS)
CSRF_TRUSTED_ORIGINS = sorted(CSRF_TRUSTED_ORIGINS)
CORS_ALLOW_CREDENTIALS = True

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SECURE_HSTS_SECONDS = 31_536_000 if not DEBUG else 0
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Alert delivery: local development prints email to the Django terminal;
# production can use SMTP by supplying the standard EMAIL_* environment vars.
EMAIL_BACKEND = os.environ.get(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "false").strip().lower() in {"1", "true", "yes", "on"}
EMAIL_TIMEOUT = int(os.environ.get("EMAIL_TIMEOUT", "10"))
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "alerts@vesla.local")

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "").strip()
VESLA_FRONTEND_URL = os.environ.get("VESLA_FRONTEND_URL", "http://localhost:5173").rstrip("/")
VESLA_TURBIDITY_ALERT_NTU = float(os.environ.get("VESLA_TURBIDITY_ALERT_NTU", "700"))
VESLA_TURBIDITY_CLEAR_NTU = float(os.environ.get("VESLA_TURBIDITY_CLEAR_NTU", "650"))
VESLA_TDS_ALERT_PPM = float(os.environ.get("VESLA_TDS_ALERT_PPM", "200"))
VESLA_TDS_CLEAR_PPM = float(os.environ.get("VESLA_TDS_CLEAR_PPM", "190"))

REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/hour",
        "user": "20000/hour",
    },
}
