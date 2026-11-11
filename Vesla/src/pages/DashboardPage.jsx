import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ChartCard from "../components/dashboard/ChartCard";
import BatchInsights from "../components/dashboard/BatchInsights";
import StatCard from "../components/dashboard/StatCard";
import useGsapFadeIn from "../hooks/useGsapFadeIn";
import { authRequest, csrfToken } from "../lib/platformAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const RECENT_RAW_POINTS = 22;
const READINGS_PER_CYCLE = 96;
const HISTORY_CYCLES = 3;
const TURBIDITY_RO_BASELINE_V = 2.38154;
const TURBIDITY_REFERENCE_CLEAR_V = 4.2;
const TURBIDITY_MAX_ESTIMATE = 3000;
const DEFAULT_SENSOR_CONFIGURATION = ["tds", "turbidity", "temperature"];
const SENSOR_PRESENTATION = [
  { id: "turbidity", key: "turbidity", label: "Turbidity (estimated)", title: "Estimated turbidity", unit: "NTU", color: "#00eaff", statColor: "text-blue-400", digits: 1 },
  { id: "tds", key: "tds", label: "TDS", title: "Temperature-compensated TDS", unit: "ppm", color: "#4ade80", statColor: "text-green-300", digits: 1 },
  { id: "temperature", key: "temperature", label: "Temperature", title: "Temperature", unit: "°C", color: "#fb923c", statColor: "text-orange-300", digits: 2 },
  { id: "ph", key: "ph", label: "pH", title: "pH", unit: "", color: "#3b82f6", statColor: "text-cyan-300", digits: 2 },
  { id: "pressure", key: "pressure", label: "Pressure", title: "Pressure", unit: "kPa", color: "#a855f7", statColor: "text-purple-400", digits: 2 },
  { id: "flow", key: "flow", label: "Flow rate", title: "Flow rate", unit: "L/min", color: "#f472b6", statColor: "text-pink-300", digits: 2 },
];

function estimateTurbidityFromVoltage(voltage) {
  const adjustedVoltage = Number(voltage) +
    (TURBIDITY_REFERENCE_CLEAR_V - TURBIDITY_RO_BASELINE_V);
  if (!Number.isFinite(adjustedVoltage)) return null;
  if (adjustedVoltage < 2.5) return TURBIDITY_MAX_ESTIMATE;

  const estimate = -1120.4 * adjustedVoltage ** 2 + 5742.3 * adjustedVoltage - 4352.9;
  return Math.min(TURBIDITY_MAX_ESTIMATE, Math.max(0, estimate));
}

function display(value, digits = 2) {
  return value === null || value === undefined ? "—" : Number(value).toFixed(digits);
}

export default function DashboardPage() {
  const [readings, setReadings] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(() => new URLSearchParams(window.location.search).get("device") || "");
  const [deviceInventory, setDeviceInventory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [authState, setAuthState] = useState("checking");
  const [account, setAccount] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoSaving, setDemoSaving] = useState(false);
  const fadeRef = useGsapFadeIn({ delay: 0.3 });
  const lastReadingsSignature = useRef("");

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const session = await authRequest("/auth/session/");
        if (cancelled) return;
        if (!session.authenticated) {
          setAuthState("anonymous");
          return;
        }
        setAccount(session.user);
        const deviceResult = await authRequest("/devices/");
        const ownedDevices = deviceResult.devices || [];
        setDeviceInventory(ownedDevices);
        setSelectedDevice((current) => {
          if (current && ownedDevices.some((device) => device.device_id === current)) return current;
          return ownedDevices[0]?.device_id || "";
        });
        setAuthState("authenticated");
        if (session.user?.is_staff) {
          try {
            const setting = await authRequest("/admin/demo-settings/");
            if (!cancelled) setDemoEnabled(setting.enabled);
          } catch {
            if (!cancelled) setDemoEnabled(false);
          }
        }
      } catch {
        if (!cancelled) setAuthState("anonymous");
      }
    }
    checkSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authState === "authenticated") {
      const frame = window.requestAnimationFrame(() => setGateOpen(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setGateOpen(false);
    return undefined;
  }, [authState]);

  useEffect(() => {
    const gateVisible = authState !== "authenticated" || !gateOpen;
    if (!gateVisible) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [authState, gateOpen]);

  useEffect(() => {
    if (authState !== "authenticated") return undefined;
    let cancelled = false;
    let timeoutId;
    let controller;

    async function loadReadings() {
      controller = new AbortController();
      try {
        const deviceQuery = selectedDevice ? `&device_id=${encodeURIComponent(selectedDevice)}` : "";
        const response = await fetch(API_BASE_URL + `/readings/?limit=310${deviceQuery}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          setAccount(null);
          setReadings([]);
          setAnalysisStatus(null);
          setAuthState("anonymous");
          return;
        }
        if (!response.ok) throw new Error("API returned " + response.status);
        const result = await response.json();
        if (!cancelled) {
          const nextReadings = Array.isArray(result) ? result : [];
          const signature = nextReadings.map((reading) => [
            reading.id,
            reading.ph,
            reading.ph_is_demo,
            reading.pressure_kpa,
            reading.pressure_is_demo,
          ].join(":" )).join(",");
          if (signature !== lastReadingsSignature.current) {
            lastReadingsSignature.current = signature;
            setReadings(nextReadings);
          }
          setError("");
        }
      } catch (fetchError) {
        if (!cancelled && fetchError.name !== "AbortError") {
          setError("Cannot reach the Vesla API. Start the Django server to load stored readings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) timeoutId = window.setTimeout(loadReadings, 5000);
      }
    }

    loadReadings();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [authState, selectedDevice]);

  async function toggleDemoData() {
    setDemoSaving(true);
    setError("");
    try {
      const result = await authRequest("/admin/demo-settings/", {
        method: "PATCH",
        body: { enabled: !demoEnabled },
        token: await csrfToken(),
      });
      setDemoEnabled(result.enabled);
    } catch (requestError) {
      setError(requestError.message || "Could not update the demo setting.");
    } finally {
      setDemoSaving(false);
    }
  }

  const readingDeviceIds = useMemo(
    () => [...new Set(readings.map((reading) => reading.device_id))],
    [readings],
  );
  const devices = deviceInventory.length
    ? deviceInventory.map((device) => device.device_id)
    : readingDeviceIds;
  const activeDevice = selectedDevice || devices[0] || "";
  const activeDeviceConfiguration = deviceInventory.find((device) => device.device_id === activeDevice);
  const configuredSensors = activeDeviceConfiguration?.sensor_configuration?.length
    ? activeDeviceConfiguration.sensor_configuration
    : DEFAULT_SENSOR_CONFIGURATION;
  const visibleSensors = SENSOR_PRESENTATION.filter((sensor) => configuredSensors.includes(sensor.id));
  const deviceReadings = useMemo(
    () => readings
      .filter((reading) => reading.device_id === activeDevice)
      .map((reading) => {
        // Recompute from saved module voltage so older rows use the same
        // RO-baseline-adjusted curve as the current firmware.
        const turbidityEstimate = reading.turbidity_voltage !== null && reading.turbidity_voltage !== undefined
          ? estimateTurbidityFromVoltage(reading.turbidity_voltage)
          : reading.turbidity_ntu;
        return {
          ...reading,
          timestamp: reading.recorded_at || reading.created_at,
          turbidity_ntu: turbidityEstimate,
          turbidity: turbidityEstimate,
          pressure: reading.pressure_kpa,
          tds: reading.tds_ppm,
          temperature: reading.temperature_c,
          flow: reading.flow_lpm,
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [readings, activeDevice],
  );
  const latest = deviceReadings.at(-1);
  const chartReadings = useMemo(() => {
    const history = deviceReadings.slice(0, -RECENT_RAW_POINTS);
    const recent = deviceReadings.slice(-RECENT_RAW_POINTS);
    const averages = [];

    for (let cycle = 0; cycle < HISTORY_CYCLES && history.length > 0; cycle += 1) {
      const end = history.length - cycle * READINGS_PER_CYCLE;
      if (end <= 0) break;
      const start = Math.max(0, end - READINGS_PER_CYCLE);
      const group = history.slice(start, end);
      const average = (field) => {
        const values = group
          .map((reading) => reading[field])
          .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
          .map(Number);
        return values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;
      };
      const endDate = new Date(group[group.length - 1].timestamp).toLocaleString();
      averages.push({
        id: `average-${start}-${end}`,
        timestamp: `Average of ${group.length} readings · ${endDate}`,
        turbidity: average("turbidity"),
        pressure: average("pressure"),
        ph: average("ph"),
        tds: average("tds"),
        temperature: average("temperature"),
        flow: average("flow"),
      });
    }

    return [...averages.reverse(), ...recent];
  }, [deviceReadings]);

  useEffect(() => {
    if (authState !== "authenticated" || !activeDevice) {
      setAnalysisStatus(null);
      return undefined;
    }

    let cancelled = false;
    let timeoutId;
    let controller;
    async function loadAnalysis() {
      controller = new AbortController();
      try {
        const url = `${API_BASE_URL}/analysis/latest/?device_id=${encodeURIComponent(activeDevice)}`;
        const response = await fetch(url, { credentials: "include", signal: controller.signal });
        if (response.status === 401 || response.status === 403) {
          setAccount(null);
          setReadings([]);
          setAnalysisStatus(null);
          setAuthState("anonymous");
          return;
        }
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const result = await response.json();
        if (!cancelled) {
          setAnalysisStatus((current) => {
            const currentId = current?.latest?.id;
            const nextId = result?.latest?.id;
            return current?.device_id === result?.device_id &&
              currentId === nextId &&
              current?.pending_readings === result?.pending_readings
              ? current
              : result;
          });
          setAnalysisError("");
        }
      } catch (fetchError) {
        if (!cancelled && fetchError.name !== "AbortError") {
          setAnalysisError("Could not load batch analysis from Django.");
        }
      } finally {
        if (!cancelled) timeoutId = window.setTimeout(loadAnalysis, 5000);
      }
    }

    loadAnalysis();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [activeDevice, authState]);

  return (
    <div
      ref={fadeRef}
      className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-[#020617] to-[#000000] px-4 pb-16 pt-28 text-white sm:px-6 sm:pt-32 sm:pb-20 lg:px-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Vesla Dashboard</h1>
        {account?.is_staff && <button type="button" aria-pressed={demoEnabled} disabled={demoSaving} onClick={toggleDemoData} className={`rounded-full px-6 py-3 font-semibold shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 ${demoEnabled ? "bg-gradient-to-r from-violet-300 via-indigo-200 to-blue-300 text-[#080f25] shadow-indigo-950/50" : "bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 text-[#080f25] shadow-blue-950/40"}`}>
          Demo Mode
        </button>}
      </div>
      <p className="mb-8 max-w-4xl text-sm leading-6 text-gray-400 sm:text-base">This device shows the sensors included in its setup. Graphs show the latest 22 readings individually, plus averages from up to three earlier groups of 96 readings. Turbidity is an estimate; TDS is temperature compensated.</p>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <label htmlFor="device-select" className="text-gray-300">Device</label>
        <select
          id="device-select"
          value={activeDevice}
          onChange={(event) => setSelectedDevice(event.target.value)}
          disabled={devices.length === 0}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white backdrop-blur-xl sm:w-auto sm:min-w-56"
        >
          {devices.length === 0
            ? <option value="">Waiting for first device reading</option>
            : devices.map((deviceId) => {
              const device = deviceInventory.find((item) => item.device_id === deviceId);
              return <option key={deviceId} value={deviceId}>{device?.name || deviceId}</option>;
            })}
        </select>
        <span className="text-sm text-gray-400">
          {latest ? "Last received " + new Date(latest.created_at).toLocaleString() : "No readings stored yet"}
        </span>
      </div>

      {error && <p role="alert" className="mb-8 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-amber-200">{error}</p>}
      {loading && <p className="mb-8 text-gray-300">Loading saved readings…</p>}

      {visibleSensors.length ? <>
        <div className="mb-10 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:mb-12 md:gap-5 xl:grid-cols-3">
          {visibleSensors.map((sensor) => <StatCard
            key={sensor.id}
            label={sensor.id === "ph" && latest?.ph_is_demo ? "pH (Demo)" : sensor.id === "pressure" && latest?.pressure_is_demo ? "Pressure (Demo)" : sensor.label}
            value={display(latest?.[sensor.id === "turbidity" ? "turbidity_ntu" : sensor.id === "tds" ? "tds_ppm" : sensor.id === "temperature" ? "temperature_c" : sensor.id === "pressure" ? "pressure_kpa" : sensor.id], sensor.digits)}
            unit={sensor.unit}
            color={sensor.statColor}
          />)}
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
          {visibleSensors.map((sensor) => <ChartCard
            key={sensor.id}
            title={sensor.id === "ph" && latest?.ph_is_demo ? "pH (demo data)" : sensor.id === "pressure" && latest?.pressure_is_demo ? "Pressure (demo data)" : sensor.title}
            data={chartReadings}
            dataKey={sensor.key}
            color={sensor.color}
          />)}
        </div>
        <BatchInsights status={analysisStatus} error={analysisError} enabledSensors={configuredSensors} />
      </> : <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-slate-300">No sensors are configured for this device yet. Re-pair it after selecting the installed sensors in its firmware.</p>}

      {authState !== "authenticated" || !gateOpen ? <div className="fixed inset-0 z-40 overflow-hidden" aria-modal="true" role="dialog" aria-label="Sign in to continue">
        <div className={`absolute inset-0 bg-[#050b21]/55 backdrop-blur-xl transition-opacity duration-[3500ms] ${gateOpen ? "opacity-0" : "opacity-100"}`} />
        <div className={`absolute inset-y-0 left-0 w-1/2 border-r border-indigo-200/15 bg-gradient-to-br from-[#091735]/80 via-[#0d1740]/75 to-[#211341]/80 backdrop-blur-2xl transition-transform duration-[3500ms] ease-[cubic-bezier(0.77,0,0.18,1)] ${gateOpen ? "-translate-x-full" : "translate-x-0"}`} />
        <div className={`absolute inset-y-0 right-0 w-1/2 border-l border-violet-200/15 bg-gradient-to-bl from-[#091735]/80 via-[#0d1740]/75 to-[#211341]/80 backdrop-blur-2xl transition-transform duration-[3500ms] ease-[cubic-bezier(0.77,0,0.18,1)] ${gateOpen ? "translate-x-full" : "translate-x-0"}`} />
        <div className={`absolute inset-0 flex items-start justify-center overflow-hidden px-4 pt-24 transition-opacity duration-[1200ms] sm:px-6 sm:pt-32 ${gateOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}>
          <section className="w-full max-w-md rounded-3xl border border-indigo-100/20 bg-gradient-to-br from-[#0b1734]/95 via-[#111b3b]/90 to-[#221542]/90 p-5 text-center shadow-2xl shadow-indigo-950/60 backdrop-blur-2xl sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-200">Vesla Dashboard</p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{authState === "checking" ? "Checking your session" : "Sign in to continue"}</h2>
            <p className="mt-3 leading-7 text-slate-300">{authState === "checking" ? "Please wait while we check your Vesla account." : "Sign in to view your devices, readings, graphs, and water trends."}</p>
            {authState === "anonymous" && <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 px-6 py-3 font-semibold text-[#080f25] shadow-lg shadow-indigo-950/50 transition hover:brightness-110">Sign in or create account</Link>}
          </section>
        </div>
      </div> : null}
    </div>
  );
}
