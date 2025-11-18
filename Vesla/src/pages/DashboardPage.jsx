import React, { useEffect, useState } from "react";
import waterData from "../data/waterData.json";

import ChartCard from "../components/dashboard/ChartCard";
import StatCard from "../components/dashboard/StatCard";
import TrendCard from "../components/dashboard/TrendCard";
import MaintenanceCard from "../components/dashboard/MaintenanceCard";
import useGsapFadeIn from "../hooks/useGsapFadeIn";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(0);

  const fadeRef = useGsapFadeIn({ delay: 0.3 });

  useEffect(() => {
    setData(waterData);
  }, []);

  // Real-time updates every 5 seconds
  useEffect(() => {
    if (!data) return;

    const interval = setInterval(() => {
      setData(prev => {
        const updated = { ...prev };
        updated.devices = updated.devices.map(dev => ({
          ...dev,
          readings: [
            ...dev.readings,
            {
              timestamp: new Date().toISOString(),
              turbidity: +(2 + Math.random() * 2).toFixed(2),
              pressure: +(1 + Math.random() * 1).toFixed(2),
              ph: +(6.8 + Math.random() * 0.4).toFixed(2),
              tds: +(450 + Math.random() * 100).toFixed(0)
            }
          ]
        }));
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [data]);

  if (!data) return <p className="text-white p-8">Loading...</p>;

  const device = data.devices[selectedDevice];

  return (
    <div
      ref={fadeRef}
      className="min-h-screen pt-32 px-8 pb-20 text-white bg-gradient-to-b
      from-[#020617] to-[#000000]"
    >
      <h1 className="text-4xl font-bold mb-12">Vesla Dashboard</h1>

      {/* Device Selector */}
      <div className="mb-12">
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(Number(e.target.value))}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white backdrop-blur-xl"
        >
          {data.devices.map((dev, i) => (
            <option key={i} value={i}>
              {dev.deviceId} — {dev.location}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <StatCard label="Avg Turbidity" value="2.8" unit="NTU" color="text-blue-400" />
        <StatCard label="Avg Pressure" value="1.6" unit="bar" color="text-purple-400" />
        <StatCard label="Avg pH" value="7.0" color="text-cyan-300" />
        <StatCard label="Avg TDS" value="475" unit="ppm" color="text-green-300" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <ChartCard title="Turbidity Levels" data={device.readings} dataKey="turbidity" color="#00eaff" />
        <ChartCard title="Pressure Levels" data={device.readings} dataKey="pressure" color="#a855f7" />
        <ChartCard title="pH Levels" data={device.readings} dataKey="ph" color="#3b82f6" />
        <ChartCard title="TDS Levels" data={device.readings} dataKey="tds" color="#4ade80" />
      </div>

      {/* Combined Chart */}
      <div className="mb-12">
        <ChartCard title="Combined Water Quality Index" data={data.combinedGraph} dataKey="avgTurbidity" color="#00f7ff" />
      </div>

      {/* Trends + Maintenance */}
      <div className="grid md:grid-cols-2 gap-8">
        <TrendCard trends={data.trends} />
        <MaintenanceCard data={data.maintenanceIndex} />
      </div>
    </div>
  );
}
