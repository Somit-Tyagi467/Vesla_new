#include <Arduino.h>
#include <DallasTemperature.h>
#include <DNSServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <Preferences.h>
#include <cstring>
#include <WiFi.h>
#include <WebServer.h>
#include "secrets.h"

#ifndef VESLA_DEVICE_API_KEY
#define VESLA_DEVICE_API_KEY ""
#endif

namespace {
constexpr uint8_t kOneWirePin = 4;
constexpr uint8_t kTdsPin = 34;
constexpr uint8_t kTurbidityPin = 35;
constexpr uint8_t kSetupResetButtonPin = 0;  // DevKit V1 BOOT button
constexpr unsigned long kReadingIntervalMs = 5000;
constexpr unsigned long kWiFiTimeoutMs = 20000;
constexpr unsigned long kSetupResetHoldMs = 6000;
constexpr uint16_t kTurbiditySampleCount = 800;
constexpr float kTurbidityDividerScale = (4.7f + 3.9f) / 3.9f;
constexpr char kSetupNetworkName[] = "VESLA-SETUP";
constexpr char kSetupNetworkPassword[] = "VeslaSetup2026";
constexpr char kPreferencesNamespace[] = "vesla";
constexpr char kPairingCodeKey[] = "pair_code";
constexpr char kDeviceKeyKey[] = "device_key";
constexpr char kSavedDeviceIdKey[] = "device_id";
constexpr char kDeviceIdMigrationKey[] = "device_id_migration";
constexpr char kDeviceIdMigrationVersion[] = "vesla-001-v1";
constexpr char kSavedSsidKey[] = "wifi_ssid";
constexpr char kSavedPasswordKey[] = "wifi_pass";
constexpr char kSavedApiUrlKey[] = "api_url";
constexpr byte kDnsPort = 53;
// Baseline reconstructed from the measured 1.08 V ESP32 divider reading
// using the 4.7k/3.9k divider. This is an estimate, not a certified calibration.
constexpr float kTurbidityRoBaselineVoltage = 2.38154f;
constexpr float kTurbidityReferenceClearVoltage = 4.2f;
constexpr float kTdsCalibrationFactor = 1.0f;
// This firmware build is wired for these three sensors only. Analog TDS and
// turbidity inputs cannot reliably detect an unplugged module; declare the
// installed hardware here and leave a sensor out of this list if not fitted.
constexpr const char* kConfiguredSensors[] = {"tds", "turbidity", "temperature"};

OneWire oneWire(kOneWirePin);
DallasTemperature temperatureSensor(&oneWire);
Preferences preferences;
WebServer setupServer(80);
DNSServer dnsServer;
unsigned long lastReadingAt = 0;
unsigned long resetButtonPressedAt = 0;
bool resetButtonWasPressed = false;
bool setupResetTriggered = false;
bool provisioningMode = false;
String setupSsid;
String setupPassword;
String deviceId;
String deviceApiKey;
String pairingCode;
String apiUrl;

String getPairingUrl() {
    String url = apiUrl;
    const int readingsPath = url.lastIndexOf("readings/");
    if (readingsPath >= 0) {
        url = url.substring(0, readingsPath) + "devices/claim/";
    }
    return url;
}

String setupPage() {
    String page = R"HTML(<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set up Vesla</title>
<style>body{font:16px system-ui;background:#071126;color:#f8fafc;margin:0;padding:24px}.box{max-width:440px;margin:8vh auto;background:#101d3d;border:1px solid #34466c;border-radius:24px;padding:28px}h1{margin-top:0}p{color:#b8c7e6;line-height:1.5}label{display:block;margin:18px 0 6px}input{box-sizing:border-box;width:100%;padding:13px;border-radius:12px;border:1px solid #46577a;background:#071126;color:white}button{margin-top:22px;padding:14px;width:100%;border:0;border-radius:999px;background:linear-gradient(90deg,#7dd3fc,#c4b5fd);font-weight:700;font-size:16px}</style></head><body><main class="box"><h1>Connect your Vesla monitor</h1><p>Enter the Wi-Fi network this ESP32 should use and the pairing code from your signed-in Vesla account. These details are saved on this device.</p><form method="post" action="/configure"><label>Wi-Fi name</label><input name="ssid" required maxlength="64" autocomplete="off"><label>Wi-Fi password</label><input name="password" type="password" maxlength="64" autocomplete="new-password"><label>Vesla pairing code</label><input name="pairing_code" required maxlength="16" autocapitalize="characters" autocomplete="off"><label>Backend readings URL (local network)</label><input name="api_url" value="" required maxlength="200" autocomplete="url"><label>Device name</label><input name="name" maxlength="80" value="VESLA-001"><button type="submit">Connect and pair</button></form></main></body></html>)HTML";
    page.replace("<label>Device name</label>", "<label>Device ID</label><input name=\"device_id\" value=\"" + deviceId + "\" required maxlength=\"64\" autocomplete=\"off\"><label>Device name</label>");
    page.replace("name=\"api_url\" value=\"\"", "name=\"api_url\" value=\"" + apiUrl + "\"");
    return page;
}

void startProvisioningPortal() {
    provisioningMode = true;
    WiFi.mode(WIFI_AP);
    setupSsid = kSetupNetworkName;
    setupPassword = kSetupNetworkPassword;
    WiFi.softAP(setupSsid.c_str(), setupPassword.c_str());
    dnsServer.start(kDnsPort, "*", WiFi.softAPIP());

    auto serveSetupPortal = []() {
        setupServer.send(200, "text/html", setupPage());
    };
    setupServer.on("/", HTTP_GET, serveSetupPortal);
    // Common OS captive-portal probes. A normal HTML response encourages the
    // phone/laptop to display its sign-in-to-network page automatically.
    setupServer.on("/generate_204", HTTP_GET, serveSetupPortal);
    setupServer.on("/gen_204", HTTP_GET, serveSetupPortal);
    setupServer.on("/hotspot-detect.html", HTTP_GET, serveSetupPortal);
    setupServer.on("/connecttest.txt", HTTP_GET, serveSetupPortal);
    setupServer.on("/ncsi.txt", HTTP_GET, serveSetupPortal);
    setupServer.on("/fwlink", HTTP_GET, serveSetupPortal);
    setupServer.onNotFound([]() {
        setupServer.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/", true);
        setupServer.send(302, "text/plain", "");
    });
    setupServer.on("/configure", HTTP_POST, []() {
        const String ssid = setupServer.arg("ssid");
        const String password = setupServer.arg("password");
        const String code = setupServer.arg("pairing_code");
        const String requestedDeviceId = setupServer.arg("device_id");
        String requestedApiUrl = setupServer.arg("api_url");
        const String name = setupServer.arg("name");
        requestedApiUrl.trim();
        if (ssid.isEmpty() || code.isEmpty() || requestedDeviceId.isEmpty() || requestedDeviceId.length() > 64) {
            setupServer.send(400, "text/plain", "Wi-Fi name, device ID, and pairing code are required.");
            return;
        }
        if (!requestedApiUrl.startsWith("http://") || !requestedApiUrl.endsWith("/api/readings/") || requestedApiUrl.length() > 200) {
            setupServer.send(400, "text/plain", "Use a local-network URL like http://192.168.1.20:8000/api/readings/.");
            return;
        }
        for (char character : requestedDeviceId) {
            if (!isAlphaNumeric(character) && character != '-' && character != '_') {
                setupServer.send(400, "text/plain", "Device ID can only use letters, numbers, hyphens, and underscores.");
                return;
            }
        }
        preferences.putString(kSavedSsidKey, ssid);
        preferences.putString(kSavedPasswordKey, password);
        preferences.putString(kPairingCodeKey, code);
        preferences.putString(kSavedDeviceIdKey, requestedDeviceId);
        preferences.putString(kSavedApiUrlKey, requestedApiUrl);
        preferences.putString("device_name", name);
        deviceId = requestedDeviceId;
        apiUrl = requestedApiUrl;
        setupServer.send(200, "text/html", "<meta name='viewport' content='width=device-width'><body style='font:18px system-ui;background:#071126;color:white;padding:32px'><h2>Settings saved</h2><p>The monitor is restarting and will try to connect. Return to Vesla in a moment.</p></body>");
        delay(1200);
        ESP.restart();
    });
    setupServer.begin();

    Serial.println("Wi-Fi setup mode is active.");
    Serial.print("Connect to network: "); Serial.println(setupSsid);
    Serial.println("Setup Wi-Fi password: VeslaSetup2026");
    Serial.print("Then open http://"); Serial.print(WiFi.softAPIP()); Serial.println("/");
}

bool pairDevice() {
    if (pairingCode.isEmpty()) return !deviceApiKey.isEmpty();
    WiFiClient client;
    HTTPClient http;
    const String url = getPairingUrl();
    if (!http.begin(client, url)) return false;
    http.addHeader("Content-Type", "application/json");
    JsonDocument payload;
    payload["pairing_code"] = pairingCode;
    payload["device_id"] = deviceId;
    payload["name"] = preferences.getString("device_name", "Water monitor");
    JsonArray sensors = payload["sensor_configuration"].to<JsonArray>();
    for (const char* sensor : kConfiguredSensors) sensors.add(sensor);
    String body;
    serializeJson(payload, body);
    const int status = http.POST(body);
    if (status != 201) {
        Serial.print("Device pairing failed: HTTP "); Serial.println(status);
        http.end();
        return false;
    }
    JsonDocument response;
    const DeserializationError error = deserializeJson(response, http.getString());
    if (error || !response["device_api_key"].is<const char*>()) {
        Serial.println("Pairing response was invalid.");
        http.end();
        return false;
    }
    deviceApiKey = response["device_api_key"].as<String>();
    if (response["device_id"].is<const char*>()) deviceId = response["device_id"].as<String>();
    preferences.putString(kDeviceKeyKey, deviceApiKey);
    preferences.putString(kSavedDeviceIdKey, deviceId);
    preferences.remove(kPairingCodeKey);
    pairingCode = "";
    Serial.println("Device paired with Vesla.");
    http.end();
    return true;
}

float calculateTdsPpm(float voltage, float temperatureC) {
    const float compensation = 1.0f + 0.02f * (temperatureC - 25.0f);
    const float compensatedVoltage = voltage / compensation;
    const float ec = 133.42f * compensatedVoltage * compensatedVoltage * compensatedVoltage
                   - 255.86f * compensatedVoltage * compensatedVoltage
                   + 857.39f * compensatedVoltage;
    return constrain(ec * 0.5f * kTdsCalibrationFactor, 0.0f, 1000.0f);
}

float readAveragePinVoltage(uint8_t pin) {
    uint32_t totalMillivolts = 0;
    for (uint16_t sample = 0; sample < kTurbiditySampleCount; ++sample) {
        totalMillivolts += analogReadMilliVolts(pin);
    }
    return (totalMillivolts / static_cast<float>(kTurbiditySampleCount)) / 1000.0f;
}

float calculateTurbidityNtu(float voltage) {
    // Approximation for common SEN0189-style analog turbidity modules.
    // Align this probe's RO voltage to the reference curve's clear-water point.
    const float adjustedVoltage = voltage +
        (kTurbidityReferenceClearVoltage - kTurbidityRoBaselineVoltage);
    float referenceNtu;
    if (adjustedVoltage < 2.5f) {
        referenceNtu = 3000.0f;
    } else {
        referenceNtu = -1120.4f * adjustedVoltage * adjustedVoltage
                     + 5742.3f * adjustedVoltage - 4352.9f;
    }
    return constrain(referenceNtu, 0.0f, 3000.0f);
}

bool connectWiFi() {
    if (WiFi.status() != WL_CONNECTED) {
        String ssid = preferences.getString(kSavedSsidKey, "");
        String password = preferences.getString(kSavedPasswordKey, "");
        if (ssid.isEmpty() && std::strcmp(VESLA_WIFI_SSID, "YOUR_WIFI_NAME") != 0) {
            ssid = VESLA_WIFI_SSID;
            password = VESLA_WIFI_PASSWORD;
            deviceId = VESLA_DEVICE_ID;
            deviceApiKey = VESLA_DEVICE_API_KEY;
        }
        if (ssid.isEmpty()) {
            startProvisioningPortal();
            return false;
        }

        Serial.print("Connecting to Wi-Fi");
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid.c_str(), password.c_str());
        const unsigned long startedAt = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startedAt < kWiFiTimeoutMs) {
            Serial.print("."); delay(500);
        }
        Serial.println();
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("Wi-Fi connection failed; starting setup mode.");
            startProvisioningPortal();
            return false;
        }
        Serial.print("Connected. ESP32 IP: "); Serial.println(WiFi.localIP());
    }
    return !deviceApiKey.isEmpty() || pairDevice();
}

void checkSetupResetButton() {
    if (provisioningMode || setupResetTriggered) return;

    if (digitalRead(kSetupResetButtonPin) == LOW) {
        if (!resetButtonWasPressed) {
            resetButtonWasPressed = true;
            resetButtonPressedAt = millis();
            Serial.println("Hold BOOT for 6 seconds to clear saved Wi-Fi and pairing credentials.");
        } else if (millis() - resetButtonPressedAt >= kSetupResetHoldMs) {
            setupResetTriggered = true;
            preferences.remove(kSavedSsidKey);
            preferences.remove(kSavedPasswordKey);
            preferences.remove(kPairingCodeKey);
            preferences.remove(kDeviceKeyKey);
            preferences.remove(kSavedApiUrlKey);
            pairingCode = "";
            deviceApiKey = "";
            Serial.println("Saved Wi-Fi and pairing credentials cleared. Device ID is retained.");
            startProvisioningPortal();
        }
    } else {
        resetButtonWasPressed = false;
    }
}

void postReadings(float temperatureC, bool hasTemperature,
                  float tdsVoltage, float tdsPpm,
                  float turbidityVoltage, float turbidityNtu) {
    if (!connectWiFi()) {
        return;
    }

    WiFiClient client;
    HTTPClient http;
    if (!http.begin(client, apiUrl)) {
        Serial.println("Could not initialize HTTP connection.");
        return;
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Vesla-Device-Key", deviceApiKey);

    String payload = "{\"device_id\":\"";
    payload += deviceId;
    payload += "\",\"tds_ppm\":";
    payload += String(tdsPpm, 1);
    payload += ",\"tds_voltage\":";
    payload += String(tdsVoltage, 3);
    payload += ",\"turbidity_voltage\":";
    payload += String(turbidityVoltage, 3);
    payload += ",\"turbidity_ntu\":";
    payload += String(turbidityNtu, 1);
    if (hasTemperature) {
        payload += ",\"temperature_c\":";
        payload += String(temperatureC, 2);
    }
    payload += "}";

    const int statusCode = http.POST(payload);
    Serial.print("POST ");
    Serial.print(apiUrl);
    Serial.print(" -> ");
    Serial.println(statusCode);

    if (statusCode > 0) {
        Serial.println(http.getString());
    } else {
        Serial.println(http.errorToString(statusCode));
    }
    http.end();
}
}  // namespace

void setup() {
    Serial.begin(115200);
    preferences.begin(kPreferencesNamespace, false);
    deviceId = preferences.getString(kSavedDeviceIdKey, "");
    deviceApiKey = preferences.getString(kDeviceKeyKey, "");
    pairingCode = preferences.getString(kPairingCodeKey, "");
    apiUrl = preferences.getString(kSavedApiUrlKey, VESLA_API_URL);
    // The first boot of this firmware build migrates this prototype from its
    // earlier MAC-derived ID to the configured VESLA-001 ID. A marker keeps
    // future boots from overwriting a subsequently provisioned device ID.
    if (preferences.getString(kDeviceIdMigrationKey, "") != kDeviceIdMigrationVersion) {
        deviceId = VESLA_DEVICE_ID;
        preferences.putString(kSavedDeviceIdKey, deviceId);
        preferences.putString(kDeviceIdMigrationKey, kDeviceIdMigrationVersion);
        Serial.print("Device ID migrated to firmware setting: ");
        Serial.println(deviceId);
    } else if (deviceId.isEmpty()) {
        deviceId = VESLA_DEVICE_ID;
        preferences.putString(kSavedDeviceIdKey, deviceId);
    }
    pinMode(kOneWirePin, INPUT_PULLUP);
    pinMode(kTdsPin, INPUT);
    pinMode(kTurbidityPin, INPUT);
    pinMode(kSetupResetButtonPin, INPUT_PULLUP);
    analogReadResolution(12);
    analogSetPinAttenuation(kTdsPin, ADC_11db);
    analogSetPinAttenuation(kTurbidityPin, ADC_11db);
    temperatureSensor.begin();
    Serial.println("VESLA ESP32 sensor sender");
    Serial.println("Reading temperature-compensated TDS ppm and estimated turbidity NTU.");
    Serial.println("Turbidity is RO-baseline-adjusted; NTU remains an estimate until standard-calibrated.");
    Serial.println("Hold the BOOT button for 6 seconds to clear saved Wi-Fi and pairing credentials.");
    connectWiFi();
}

void loop() {
    checkSetupResetButton();
    if (provisioningMode) {
        dnsServer.processNextRequest();
        setupServer.handleClient();
        delay(5);
        return;
    }
    if (millis() - lastReadingAt < kReadingIntervalMs) {
        delay(50);
        return;
    }
    lastReadingAt = millis();

    temperatureSensor.requestTemperatures();
    const float temperatureC = temperatureSensor.getTempCByIndex(0);

    const bool hasTemperature = temperatureC != DEVICE_DISCONNECTED_C;
    const float compensationTemperatureC = hasTemperature ? temperatureC : 25.0f;
    const float tdsVoltage = analogReadMilliVolts(kTdsPin) / 1000.0f;
    const float turbidityAdcVoltage = readAveragePinVoltage(kTurbidityPin);
    const float turbidityVoltage = turbidityAdcVoltage * kTurbidityDividerScale;
    const float tdsPpm = calculateTdsPpm(tdsVoltage, compensationTemperatureC);
    const float turbidityNtu = calculateTurbidityNtu(turbidityVoltage);

    if (hasTemperature) {
        Serial.print("Temperature: ");
        Serial.print(temperatureC, 2);
        Serial.println(" C");
    } else {
        Serial.println("DS18B20 not detected.");
    }
    Serial.print("TDS (temperature compensated): ");
    Serial.print(tdsPpm, 1);
    Serial.println(" ppm");
    Serial.print("Turbidity (estimated): ");
    Serial.print(turbidityNtu, 1);
    Serial.println(" NTU");

    postReadings(temperatureC, hasTemperature, tdsVoltage, tdsPpm,
                 turbidityVoltage, turbidityNtu);
}
