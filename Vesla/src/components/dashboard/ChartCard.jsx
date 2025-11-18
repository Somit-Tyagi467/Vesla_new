import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ChartCard({ title, data, dataKey, color }) {
  return (
    <div className="
      p-6 rounded-3xl 
      bg-[rgba(255,255,255,0.03)]
      border border-white/10 
      backdrop-blur-2xl 
      shadow-xl
      w-full
    ">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={false}
            />
            <XAxis dataKey="timestamp" hide />
            <YAxis hide />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
