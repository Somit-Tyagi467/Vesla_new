# Vesla sensor forecasting model

This package trains and runs a small, separate forecast model for each live sensor. It predicts the average of the **next 96 readings** from the latest 96 readings. With the current ESP32 interval of five seconds, that is an approximately eight-minute forecast.

## Inputs and output

Each training CSV needs a timestamp column and one numeric sensor column. A pond/device column is strongly recommended when a file contains more than one sensor location. TDS and turbidity are trained separately because the Kaggle sources use different sensors and environments.

The pipeline creates time-ordered train, validation, and test windows. It compares two compact tree models with a simple recent-window-average baseline. The chosen model is retained only when it beats that baseline on the later validation period. Test MAE and RMSE are saved with the artifact; they are the evidence to review before enabling the forecast in Django.

## Kaggle data to download

1. **TDS:** Kaggle’s [A Simple Dataset of Aquaponic Fish Pond IoT](https://www.kaggle.com/datasets/bobsis/small-aquaculture-fishpond). Use the raw `pond_iot_2023_raw.csv`, especially its timestamp and `TDS` columns. Do not use the filtered file as the only training set: it retains only a narrow, preferred water range and would teach the model too little about changes outside that range. The associated research describes timestamped IoT measurements of pH, TDS, and temperature from a fish pond.
2. **Turbidity:** Kaggle’s [IoT-labelled aquaponics fish-pond water-quality dataset](https://www.kaggle.com/dataset/e81da8b7666dc7af41cdc3aa5ef96c5547e4f412598a030f40d444550965e34d). Select the raw CSV containing timestamped turbidity sensor readings. The paper describes sensor readings from 12 aquaponics ponds at five-second intervals. Use this only to prototype a turbidity trend forecast; aquaculture pond water is not the same as a household drinking-water tank.

The Kaggle [Water Quality and Potability dataset](https://www.kaggle.com/datasets/adityakadiwal/water-potability) has 3,276 individual water samples, including `Solids`, `Turbidity`, and `Potability`, but no time sequence or pressure. It is **not** training data for this 96-reading forecast. It also cannot safely classify this project’s water from only TDS and turbidity, because its target was produced from a broader set of water-quality measurements.

## Training

Download the raw CSV files from Kaggle and place them under `backend/vesla_ml/data/raw/`. From `backend/`, first install the optional ML dependencies:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements-ml.txt
```

Then set each column name to match the downloaded file and train:

```powershell
.venv\Scripts\python.exe -m vesla_ml.training `
  --tds-csv vesla_ml/data/raw/pond_iot_2023_raw.csv `
  --tds-timestamp-column created_date `
  --tds-value-column TDS `
  --turbidity-csv vesla_ml/data/raw/turbidity.csv `
  --turbidity-timestamp-column timestamp `
  --turbidity-value-column turbidity
```

For files containing multiple ponds or devices, also pass the matching `--tds-group-column` and `--turbidity-group-column`. The trainer splits in chronological order, breaks a series across long missing-data gaps, and writes `tds_forecast.joblib` and `turbidity_forecast.joblib` under `vesla_ml/artifacts/`.

The script needs enough continuous rows to make training, validation, and test windows. One supervised example uses **96 past readings as input and the following 96 readings as its target**. A useful first target is about **1,000 non-overlapping input/target pairs per sensor** (192,000 readings). At the current five-second interval that is about 11.1 days of uninterrupted readings; several weeks across different water conditions and repeated sensor calibration is a stronger target. The trainer also creates overlapping training windows to use the data efficiently, but those overlaps do not count as independent real-world conditions.

## Limits and data needed for stronger recommendations

- The output is a near-term sensor forecast, not a prediction that a tank is clean, contaminated, or safe to drink.
- For customer recommendations such as “inspect the tank,” collect timestamped readings alongside confirmed inspection/cleaning events and calibrated reference readings. Drinking-water safety claims require laboratory measurements and suitable labels; TDS and turbidity alone cannot establish safety.
- pH and pressure are not forecast by these two sensor models. If shown during a presentation from sample files or generated scenarios, label them **Demo data**. Do not mix demo values with ESP32 readings or use them as real model training labels.
- External pond data have different sensors, sites, calibration, and water types. Validate forecasts using the project’s own calibrated ESP32 readings before integrating them into customer-facing recommendations.
