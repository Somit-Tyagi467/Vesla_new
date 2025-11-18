export default function MaintenanceCard({ data }) {
  return (
    <div className="
      p-6 rounded-3xl bg-[rgba(255,255,255,0.05)]
      border border-white/10 backdrop-blur-xl shadow-xl
      w-full
    ">
      <h2 className="text-xl font-semibold mb-4">Maintenance Status</h2>

      <div className="mb-4">
        <p className="text-gray-400">Pipeline Health</p>
        <p className="text-3xl font-bold text-blue-400">{data.pipelineHealth}%</p>
      </div>

      <div className="mb-4">
        <p className="text-gray-400">Tank Health</p>
        <p className="text-3xl font-bold text-purple-400">{data.tankHealth}%</p>
      </div>

      <h3 className="text-lg font-semibold mt-4 mb-2">Recommendations</h3>
      <ul className="list-disc ml-5 text-gray-300">
        {data.recommendedActions.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
