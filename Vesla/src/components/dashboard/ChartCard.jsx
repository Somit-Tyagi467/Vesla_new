import React, { memo, useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TURBIDITY_THRESHOLDS = {
  slightlyCloudy: 500,
  cloudy: 700,
  dirty: 1750,
};
const TDS_THRESHOLDS = {
  low: 200,
  household: 500,
  elevated: 1000,
};

function turbidityBand(value) {
  if (value > TURBIDITY_THRESHOLDS.dirty) return { label: "Dirty", color: "#ef4444" };
  if (value > TURBIDITY_THRESHOLDS.cloudy) return { label: "Cloudy", color: "#b89627" };
  if (value >= TURBIDITY_THRESHOLDS.slightlyCloudy) return { label: "Slightly cloudy", color: "#eabf45" };
  return { label: "Clear", color: "#00eaff" };
}

function tdsBand(value) {
  if (value > TDS_THRESHOLDS.elevated) return { label: "Very high TDS", color: "#ef4444" };
  if (value > TDS_THRESHOLDS.household) return { label: "Elevated TDS", color: "#eabf45" };
  if (value > TDS_THRESHOLDS.low) return { label: "Household reference range", color: "#38bdf8" };
  return { label: "Low TDS", color: "#4ade80" };
}

function formatAxisTick(value, dataKey) {
  const digits = dataKey === "ph" ? 2 : ["temperature", "pressure", "flow"].includes(dataKey) ? 1 : 0;
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function ChartCard({ title, data, dataKey, color }) {
  const gradientId = `chart-fill-${useId().replace(/:/g, "")}`;
  const isTurbidityChart = dataKey === "turbidity";
  const isTdsChart = dataKey === "tds";
  const isPhChart = dataKey === "ph";
  const isBandColoredChart = isTurbidityChart || isTdsChart;

  const chartData = useMemo(
    () => data.filter((reading) => {
      const value = Number(reading[dataKey]);
      return reading[dataKey] !== null && reading[dataKey] !== undefined && Number.isFinite(value);
    }),
    [data, dataKey],
  );

  const getBand = isTurbidityChart ? turbidityBand : tdsBand;
  const latestValue = chartData.at(-1)?.[dataKey];
  const latestBand = isBandColoredChart && latestValue !== undefined
    ? getBand(Number(latestValue))
    : null;
  const activeColor = latestBand?.color || color;

  // Give each section of the area its own band color. Duplicate gradient stops
  // at the boundary make the color change crisp between adjacent readings.
  const gradientStops = useMemo(() => {
    if (!isBandColoredChart || chartData.length === 0) return [];
    const pointColors = chartData.map((reading) => getBand(Number(reading[dataKey])).color);
    const segmentColors = pointColors.slice(0, -1).map((pointColor, index) => {
      const nextPointColor = pointColors[index + 1];
      if (pointColor === nextPointColor) return pointColor;
      const midpoint = (
        Number(chartData[index][dataKey]) + Number(chartData[index + 1][dataKey])
      ) / 2;
      return getBand(midpoint).color;
    });
    if (segmentColors.length === 0) segmentColors.push(pointColors[0]);

    const stops = [{ offset: "0%", color: segmentColors[0] }];
    for (let index = 1; index < segmentColors.length; index += 1) {
      const offset = `${(index / (chartData.length - 1)) * 100}%`;
      stops.push({ offset, color: segmentColors[index - 1] });
      stops.push({ offset, color: segmentColors[index] });
    }
    stops.push({ offset: "100%", color: segmentColors.at(-1) });
    return stops;
  }, [chartData, dataKey, getBand, isBandColoredChart]);

  return (
    <div className="w-full min-w-0 rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 shadow-xl sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        {latestBand && (
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              color: activeColor,
              borderColor: `${activeColor}66`,
              backgroundColor: `${activeColor}14`,
            }}
          >
            {latestBand.label}
          </span>
        )}
      </div>
      <div className="h-52 w-full min-w-0 sm:h-56">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Waiting for readings from this device
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 2 }}>
              <defs>
                <linearGradient
                  id={gradientId}
                  x1={isBandColoredChart ? "0%" : "0%"}
                  y1="0%"
                  x2={isBandColoredChart ? "100%" : "0%"}
                  y2={isBandColoredChart ? "0%" : "100%"}
                >
                  {isBandColoredChart
                    ? gradientStops.map((stop, index) => (
                      <stop key={`${stop.offset}-${index}`} offset={stop.offset} stopColor={stop.color} stopOpacity={0.3} />
                    ))
                    : <>
                      <stop offset="0%" stopColor={activeColor} stopOpacity={0.42} />
                      <stop offset="100%" stopColor={activeColor} stopOpacity={0.015} />
                    </>}
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="timestamp" hide />
              <YAxis
                domain={isTurbidityChart ? [0, "auto"] : ["auto", "auto"]}
                tickCount={5}
                tickFormatter={(value) => formatAxisTick(value, dataKey)}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                allowDecimals={isPhChart || ["temperature", "pressure", "flow"].includes(dataKey)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#07111f",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#fff",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value) => [
                  Number(value).toFixed(isTurbidityChart || isTdsChart ? 1 : 2),
                  isTurbidityChart ? "Estimated NTU" : isTdsChart ? "TDS ppm (estimate)" : title,
                ]}
              />
              {isTurbidityChart && (
                <>
                  <ReferenceLine y={TURBIDITY_THRESHOLDS.slightlyCloudy} stroke="#eabf45" strokeDasharray="3 5" label={{ value: "Slightly cloudy · 500", position: "insideTopRight", fill: "#f4d479", fontSize: 11 }} />
                  <ReferenceLine y={TURBIDITY_THRESHOLDS.cloudy} stroke="#b89627" strokeDasharray="5 5" label={{ value: "Cloudy · 700", position: "insideTopRight", fill: "#d6b94e", fontSize: 11 }} />
                  <ReferenceLine y={TURBIDITY_THRESHOLDS.dirty} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Dirty · 1,750", position: "insideTopRight", fill: "#f87171", fontSize: 11 }} />
                </>
              )}
              {isTdsChart && (
                <>
                  <ReferenceLine y={TDS_THRESHOLDS.low} stroke="#4ade80" strokeDasharray="3 5" label={{ value: "Low · 200", position: "insideTopRight", fill: "#86efac", fontSize: 10 }} />
                  <ReferenceLine y={TDS_THRESHOLDS.household} stroke="#38bdf8" strokeDasharray="3 5" label={{ value: "Household · 500", position: "insideTopRight", fill: "#7dd3fc", fontSize: 10 }} />
                  <ReferenceLine y={TDS_THRESHOLDS.elevated} stroke="#eabf45" strokeDasharray="5 5" label={{ value: "Elevated · 1,000", position: "insideTopRight", fill: "#f4d479", fontSize: 10 }} />
                </>
              )}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={activeColor}
                strokeWidth={3}
                fill={`url(#${gradientId})`}
                dot={isBandColoredChart
                  ? (props) => {
                    const { cx, cy, payload } = props;
                    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={getBand(Number(payload[dataKey])).color}
                        stroke="#07111f"
                        strokeWidth={2}
                      />
                    );
                  }
                  : false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 1 }}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {isTurbidityChart && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400" aria-label="Turbidity chart thresholds">
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-400" />Clear: below 500</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#eabf45" }} />Slightly cloudy: 500–700</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#b89627" }} />Cloudy: above 700 through 1,750</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />Dirty: above 1,750</span>
        </div>
      )}
      {isTdsChart && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400" aria-label="TDS levels">
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />Low TDS: 0–200 ppm</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#38bdf8" }} />Household reference: 201–500 ppm</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#eabf45" }} />Elevated: 501–1,000 ppm</span>
          <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />Very high: above 1,000 ppm</span>
        </div>
      )}
    </div>
  );
}

export default memo(ChartCard);
