export default function TrendCard({ trends }) {
  return (
    <div className="
      p-6 rounded-3xl bg-[rgba(255,255,255,0.04)]
      border border-white/10 backdrop-blur-xl shadow-xl
      w-full
    ">
      <h2 className="text-xl font-semibold mb-4">Trend Analysis</h2>

      {Object.entries(trends).map(([key, value]) => (
        <div key={key} className="mb-3">
          <p className="text-blue-300 capitalize">{key}:</p>
          <p className="text-gray-300">{value}</p>
        </div>
      ))}
    </div>
  );
}
