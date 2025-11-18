import React, { useState } from "react";
import { pricingConfig } from "../config/cardConfig";
import PricingCard from "./PricingCard";

export default function PricingLoader() {
  const [billing, setBilling] = useState("monthly");

  return (
    <div className="flex flex-col items-center gap-10 w-full">
      
      {/* Billing Toggle */}
      <div className="
        flex items-center p-1 rounded-full
        bg-white/5 border border-white/10 backdrop-blur-xl
      ">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-6 py-2 rounded-full transition text-lg font-medium
            ${billing === "monthly"
              ? "bg-linear-to-r from-blue-500 to-purple-500 text-white"
              : "text-gray-300"
            }`}
        >
          Monthly
        </button>

        <button
          onClick={() => setBilling("yearly")}
          className={`px-6 py-2 rounded-full transition text-lg font-medium
            ${billing === "yearly"
              ? "bg-linear-to-r from-blue-500 to-purple-500 text-white"
              : "text-gray-300"
            }`}
        >
          Annually
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="flex gap-6 justify-center w-[95%]">
        {pricingConfig.plans.map((plan, i) => (
          <PricingCard
            key={i}
            name={plan.name}
            description={plan.description}
            price={billing === "monthly" ? plan.priceMonthly : plan.priceYearly}
            features={plan.features}
            gradient={plan.gradient}
            width={plan.width}
          />
        ))}
      </div>
    </div>
  );
}
