# ESP32 sensor sender

This PlatformIO project reads the DS18B20 temperature, calculates temperature-compensated TDS ppm and estimated turbidity NTU, then posts one JSON record every five seconds to the Vesla Django API. Raw voltages are also stored to help calibrate the estimates.

## Local Wi-Fi configuration

Copy include/secrets.example.h to include/secrets.h. Edit the private file with your Wi-Fi and server settings. The root Git ignore excludes secrets.h so credentials are not committed.

The API URL must use the computer's private IPv4 address, not localhost, because localhost on the ESP32 means the ESP32 itself. Both devices must be connected to the same trusted Wi-Fi network.

## Current hardware scope

The sketch uses the DS18B20 on GPIO4 with a 4.7 kΩ DATA-to-3.3 V pull-up, TDS analog output on GPIO34, and turbidity output on GPIO35 through a 4.7 kΩ series / 3.9 kΩ to-GND voltage divider. TDS uses the DFRobot Gravity TDS polynomial and 2%/°C correction to 25°C, with the DS18B20 temperature and a default calibration factor of 1.0. The unbranded turbidity module uses a common SEN0189-style voltage-to-NTU approximation; calibrate it with a known turbidity standard before treating the value as accurate. This firmware declares only `tds`, `turbidity`, and `temperature` during device pairing, so Django and the dashboard record and display those three configured sensor types. pH, pressure, and flow are not included yet.

The firmware does not auto-detect unplugged analog TDS or turbidity modules; their ADC pins can float and produce plausible-looking numbers. The declared sensor list describes what this hardware build is wired to contain. If you change the fitted sensors, update `kConfiguredSensors` and the corresponding read/post logic, rebuild, and re-pair the device so its saved configuration updates.

The API receive timestamp is used. Sensor calibration is a separate step; stored values do not become validated water-quality measurements just because they are displayed on the dashboard.
