# Vesla Django backend

Django REST API and SQLite storage for the Vesla sensor prototype.

## Start the backend on this computer

From a VS Code terminal, run these commands from the backend folder:

    .\.venv\Scripts\python.exe manage.py createsuperuser
    .\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000

The local Vite addresses `http://localhost:5173` and `http://127.0.0.1:5173` are trusted automatically in development, so localhost login and registration do not need per-terminal origin commands. To sign in from a phone using the laptop's LAN IP, add that IP to `DJANGO_ALLOWED_HOSTS`; development settings then trust that IP on port 5173. Restart Django after changing environment settings.

The SQLite database is database/vesla.sqlite3. Open Django Admin at http://127.0.0.1:8000/admin/.

## API endpoints

- POST /api/readings/ creates a reading. Send device_id and at least one of ph, tds_ppm, tds_voltage, turbidity_ntu, temperature_c, pressure_kpa, or flow_lpm. recorded_at is optional; when omitted Django records the server receive time.
- GET /api/readings/?device_id=VESLA-001&limit=100 returns recent readings, newest first.
- GET /api/readings/latest/?device_id=VESLA-001 returns the latest reading for that device.
- GET /api/analysis/latest/?device_id=VESLA-001 returns the latest completed 96-reading analysis and progress toward the next one.

## Batch trend analysis

After each new reading is saved, Django checks for complete, non-overlapping batches of 96 readings per device and saves an analysis in `BatchAnalysis`. At one reading every five seconds, a batch is about eight minutes. If the server was offline, complete batches are analyzed after the next reading arrives.

The current explainable model compares the first and second halves of each batch, detects unusually distant values with median absolute deviation, and forecasts the next batch mean from the previous and current batch means. For turbidity, Django now applies the same RO-baseline-adjusted voltage curve as the dashboard whenever voltage is stored; estimates are clamped to 0–3,000 NTU and forecasts stay in that range. The agreed prototype bands are clear below 500, slightly cloudy 500–700, cloudy above 700 through 1,750, and dirty above 1,750. These are display bands for an unverified sensor estimate, not certified water-quality limits.

TDS chart reference bands are 500, 1,000, and 2,000 ppm. BIS IS 10500:2012 lists 500 mg/L as the acceptable benchmark and 2,000 mg/L as a permissible level only when no alternative source is available. WHO describes taste as generally good below about 600 mg/L and increasingly unpalatable above about 1,000 mg/L; it does not set a health-based TDS guideline. Treat these as context for a calibrated TDS sensor, not a safety classification.

If `VESLA_DEMO_PARAMETERS_ENABLED` is true (defaults to true in this local DEBUG setup), Django fills missing pH and pressure values with a repeatable presentation scenario and sets `ph_is_demo` / `pressure_is_demo`. These are visibly labeled demo values and must not be treated as hardware measurements. Set `VESLA_DEMO_PARAMETERS_ENABLED=false` to disable. Existing batches can be backfilled and recalculated with:

    .\.venv\Scripts\python.exe manage.py migrate
    .\.venv\Scripts\python.exe manage.py rebuild_demo_analysis

The rebuild command preserves raw readings, fills only missing pH/pressure fields, and replaces derived batch summaries so older turbidity analyses use the voltage calibration. Fields with fewer than 12 numeric samples remain marked insufficient. It does not claim pipeline or tank health.

This is an initial statistical forecasting model, not a trained classifier: the project has no verified labels or calibrated sensor reference dataset yet. Validate TDS and turbidity with known standards before treating recommendations as water-quality decisions. Analysis records are available in Django Admin under **Batch analyses**.

The React dashboard polls the list endpoint every five seconds and displays stored values; it does not generate readings.

## Sensor threshold alerts

The ingestion API checks paired-device readings for project alert thresholds. Turbidity triggers above 700 NTU and rearms once it falls to 650 NTU or below; TDS triggers above 200 ppm and rearms at 190 ppm or below. The gap prevents repeated alerts when a reading jitters around a limit. A notification is sent only when a device crosses into an alert state, with its measured value and a direct dashboard link. These are project alert limits, not official water-safety certifications.

Users can set alert preferences from their profile. Email alerts default on and use the account email. Local development prints email to the Django terminal; production email needs SMTP configuration (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, and `DEFAULT_FROM_EMAIL`). SMS is opt-in and requires an international phone number in `+` format plus Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`). Set `VESLA_FRONTEND_URL` to the deployed frontend origin so alert links open the hosted dashboard. The server processes each breach in a background thread to keep ESP32 requests responsive; a production deployment that needs durable retries should move alert delivery to a task queue.

## Connect an ESP32 on the same Wi-Fi

1. Copy hardware/ESP32HelloWorld/include/secrets.example.h to secrets.h in that same include folder.
2. Edit secrets.h with your Wi-Fi SSID/password, computer's private IPv4 address, and device ID. Do not send these values to anyone or commit secrets.h.
3. In PowerShell, set Django's allowed host to your computer's address. Replace the example IP with your actual private IPv4 address:

       $env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,192.168.1.20"
       .\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000

4. Set VESLA_API_URL in secrets.h to http://192.168.1.20:8000/api/readings/ using that same address.

Both devices must be on the same trusted Wi-Fi network. Windows Firewall may prompt to allow Python on private networks. Do not expose this development server to public networks.

## Production authentication settings

Production must run with `DJANGO_DEBUG=false`, HTTPS, a strong `DJANGO_SECRET_KEY`, and a `DJANGO_DEVICE_API_KEY`. Configure these in the backend host's environment settings (not in source control). Set `DJANGO_ALLOWED_HOSTS` to the backend hostname and set both `DJANGO_CORS_ALLOWED_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS` to the exact HTTPS frontend origin, for example `https://app.example.com`. Keep credentials and device keys out of the frontend bundle. With a custom domain, serving the frontend and API under the same site (or proxying `/api` through the frontend host) makes session-cookie behavior more reliable; users then use the normal sign-in and create-account pages without configuring origins themselves.

The firmware may send DS18B20 temperature, estimated TDS, and estimated turbidity depending on the current build. Verify analog signal levels and calibrate each sensor before relying on its derived values.
