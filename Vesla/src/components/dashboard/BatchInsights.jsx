function format(value, digits = 2) {
  return value === null || value === undefined ? "—" : Number(value).toFixed(digits);
}

function trendText(sensor) {
  if (sensor.trend === "increasing") return "Going up";
  if (sensor.trend === "decreasing") return "Going down";
  return "Staying about the same";
}

function forecastDirection(sensor) {
  if (sensor.forecast_direction) return sensor.forecast_direction;
  if (sensor.previous_batch_mean === null || sensor.previous_batch_mean === undefined) {
    return "insufficient_history";
  }
  const difference = Number(sensor.next_batch_prediction) - Number(sensor.mean);
  const margin = Math.max(Math.abs(Number(sensor.mean)) * 0.01, 0.01);
  if (difference > margin) return "increasing";
  if (difference < -margin) return "decreasing";
  return "stable";
}

function recommendationFor(key, sensor) {
  const trend = forecastDirection(sensor);
  const name = sensor.label.toLowerCase();
  let message = "";

  if (key === "turbidity_ntu" && trend === "increasing") {
    message = "The water may look cloudier in the next cycle. If it does, check the tank and filter for visible cloudiness or sediment.";
  } else if (key === "turbidity_ntu" && trend === "decreasing") {
    message = "The water may look clearer in the next cycle. Check the next reading to see whether this improvement continues.";
  } else if (key === "tds_ppm" && trend === "increasing") {
    message = "TDS may rise in the next cycle. If it stays high, check whether the water source or RO filter has changed.";
  } else if (key === "tds_ppm" && trend === "decreasing") {
    message = "TDS may fall in the next cycle. Check whether that lower level continues, especially after a change to the water source or filter.";
  } else if (key === "turbidity_ntu" && trend === "stable") {
    message = "The water may look about as clear as it does now in the next cycle.";
  } else if (key === "tds_ppm" && trend === "stable") {
    message = "TDS is expected to stay about the same in the next cycle.";
  } else if (trend === "increasing" || trend === "decreasing") {
    const direction = trend === "increasing" ? "go up" : "go down";
    message = key === "ph"
      ? `The pH reading may ${direction} in the next cycle. If the change continues, compare it with the range recommended for your water system.`
      : `The ${name} reading may ${direction} in the next cycle. If it stays outside your usual range, check the equipment or water system connected to this reading.`;
  } else if (trend === "stable") {
    message = `The ${name} reading is expected to stay about the same in the next cycle.`;
  }

  if (sensor.anomaly_count > 0) {
    const spikeAdvice = `Some ${name} readings changed suddenly. Check whether anything changed in the water system, then see if the next cycle confirms the change.`;
    message = message ? `${message} ${spikeAdvice}` : spikeAdvice;
  }
  if (sensor.data_source === "demo") {
    message = `Demo scenario only — not a physical sensor measurement. ${message}`;
  } else if (sensor.data_source === "mixed") {
    message = `This trend combines demo and sensor readings. ${message}`;
  } else if (sensor.data_source === "legacy_ntu") {
    message = `This trend uses older saved NTU values because voltage was not stored. ${message}`;
  }
  return message;
}

function conditionLabel(condition) {
  return ({
    clear: "clear range",
    slightly_cloudy: "slightly cloudy range",
    cloudy: "cloudy range",
    dirty: "dirty range",
    low_tds: "low TDS range",
    household_reference: "household reference range",
    elevated_tds: "elevated TDS range",
    very_high_tds: "very high TDS range",
  })[condition] || null;
}

function tdsConditionForValue(value) {
  const ppm = Number(value);
  if (!Number.isFinite(ppm)) return null;
  if (ppm > 1000) return "very_high_tds";
  if (ppm > 500) return "elevated_tds";
  if (ppm > 200) return "household_reference";
  return "low_tds";
}

function forecastText(sensor) {
  const direction = forecastDirection(sensor);
  if (direction === "increasing") return "May rise in the next cycle";
  if (direction === "decreasing") return "May fall in the next cycle";
  if (direction === "stable") return "May stay about the same in the next cycle";
  return "More readings are needed to spot a direction";
}

export default function BatchInsights({ status, error, enabledSensors }) {
  const analysis = status?.latest;
  const result = analysis?.result;
  const sensors = Object.entries(result?.sensors || {}).filter(
    ([key, sensor]) => sensor.status === "analyzed" && (!enabledSensors || enabledSensors.includes({ ph: "ph", tds_ppm: "tds", turbidity_ntu: "turbidity", temperature_c: "temperature", pressure_kpa: "pressure", flow_lpm: "flow" }[key])),
  );
  const recommendations = sensors
    .map(([key, sensor]) => recommendationFor(key, sensor))
    .filter(Boolean);
  const batchSize = status?.batch_size || 96;
  const pending = status?.pending_readings || 0;
  const progress = (pending / batchSize) * 100;
  const hasForecast = sensors.some(
    (sensorEntry) => forecastDirection(sensorEntry[1]) !== "insufficient_history",
  );

  return (
    <section className="mt-12">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="p-6 rounded-3xl bg-[rgba(255,255,255,0.04)] border border-white/10 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Trend Analysis</h2>
          {analysis ? (
            <>
              <p className="text-sm text-gray-400 mb-5">
                Cycle {analysis.batch_number} · based on {analysis.reading_count} readings · {new Date(analysis.created_at).toLocaleString()}
              </p>
              {sensors.length ? (
                <div className="space-y-4">
                  {sensors.map(([key, sensor]) => (
                    <div key={key}>
                      <p className="text-blue-300">{sensor.label}</p>
                      {sensor.data_source === "demo" && <p className="text-xs text-amber-300">Demo scenario · not measured by a connected sensor</p>}
                      <p className="text-gray-200">Next cycle: {forecastText(sensor)}</p>
                      <p className="text-sm text-gray-400">Recent readings: {trendText(sensor).toLowerCase()}</p>
                      <p className="text-sm text-gray-400">
                        Average reading: {format(sensor.mean)} {sensor.unit}
                      </p>
                      {forecastDirection(sensor) !== "insufficient_history" && sensor.next_batch_prediction !== undefined && (
                        <p className="text-sm text-gray-400">
                          Estimated next average: {format(sensor.next_batch_prediction)} {sensor.unit}
                        </p>
                      )}
                      {key === "turbidity_ntu" && sensor.condition && (
                        <p className="text-sm text-gray-400">
                          Estimated band: {conditionLabel(sensor.condition)}
                          {sensor.forecast_condition && ` · next estimate: ${conditionLabel(sensor.forecast_condition)}`}
                        </p>
                      )}
                      {key === "tds_ppm" && (sensor.mean !== null && sensor.mean !== undefined || sensor.condition) && (
                        <p className="text-sm text-gray-400">
                          TDS level: {conditionLabel(tdsConditionForValue(sensor.mean) || sensor.condition)}
                          {sensor.next_batch_prediction !== undefined && ` · next estimate: ${conditionLabel(tdsConditionForValue(sensor.next_batch_prediction) || sensor.forecast_condition)}`}
                        </p>
                      )}
                      {sensor.anomaly_count > 0 && (
                        <p className="text-sm text-amber-300">
                          {sensor.anomaly_count} reading(s) were quite different from the others
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-300">This batch did not have enough valid samples for a sensor trend.</p>
              )}
              <p className="text-xs text-gray-500 mt-5">Each cycle summarizes 96 readings.</p>
            </>
          ) : (
            <p className="text-gray-300">Your first summary will appear after the device has sent 96 readings.</p>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-[rgba(255,255,255,0.04)] border border-white/10 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Recommendations</h2>
          {error && <p role="alert" className="text-amber-300 mb-4">{error}</p>}
          {recommendations.length ? (
            <ul className="list-disc ml-5 space-y-2 text-gray-300">
              {recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-300">{analysis && !hasForecast ? "This is the first full cycle, so there isn't enough history to tell whether readings may rise or fall. The next cycle will give us a useful comparison." : analysis ? "The readings are expected to stay about the same in the next cycle, and no sudden changes stood out." : "Simple suggestions will appear after the first 96 readings."}</p>
          )}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress to next cycle</span>
              <span>{pending} / {batchSize} new readings</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-blue-400 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {status ? `${status.readings_until_next_analysis} more readings until the next summary` : "Waiting for device readings"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
