import React from "react";
import { ChevronRight } from "lucide-react";

export default function PricingCard({
  name,
  price,
  description,
  features,
  gradient,
  width,
}) {
  return (
    <div
      className={`
        p-8 rounded-3xl border border-white/10
        bg-linear-to-b ${gradient}
        backdrop-blur-xl shadow-lg
        text-white flex flex-col justify-between
        ${width ? `w-[${width}]` : "w-full"}
      `}
    >
      {/* Title */}
      <h1 className="text-2xl font-semibold mb-2">{name}</h1>
      <p className="text-gray-300 text-sm mb-6">{description}</p>

      {/* Price */}
      <div className="text-5xl font-bold mb-6">
        ₹{price}
        <span className="text-lg font-medium text-gray-400">/mo</span>
      </div>

      {/* Features */}
      <div className="mb-8">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 mb-3">
            {f.icon}
            <p className="text-gray-200 text-sm">{f.text}</p>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        className="
          w-full py-3 rounded-full border border-white/20
          bg-white/5 hover:bg-white/10 transition
          flex items-center justify-center gap-2
        "
      >
        Get Started
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
