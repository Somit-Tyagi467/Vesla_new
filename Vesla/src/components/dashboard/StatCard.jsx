export default function StatCard({ label, value, unit, color }) {
  return (
    <div className="
      p-6 rounded-2xl 
      bg-[rgba(255,255,255,0.04)]
      border border-white/10 
      backdrop-blur-xl
      shadow-lg
    ">
      <p className="text-gray-400 text-sm">{label}</p>
      <h1 className={`text-3xl font-bold mt-1 ${color}`}>{value}{unit && <span className="text-lg ml-1">{unit}</span>}</h1>
    </div>
  );
}
