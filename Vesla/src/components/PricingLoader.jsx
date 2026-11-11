import React, { useState } from "react";
import { pricingConfig } from "../config/cardConfig";
import PricingCard from "./PricingCard";

export default function PricingLoader() {
  const [billing, setBilling] = useState("monthly");

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <div className="flex items-center rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl">
        <button
          type="button"
          aria-pressed={billing === "monthly"}
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-6 py-2 text-base font-medium transition md:text-lg
            ${billing === "monthly"
              ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white"
              : "text-gray-300"
            }`}
        >
          Monthly
        </button>

        <button
          type="button"
          aria-pressed={billing === "yearly"}
          onClick={() => setBilling("yearly")}
          className={`rounded-full px-6 py-2 text-base font-medium transition md:text-lg
            ${billing === "yearly"
              ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white"
              : "text-gray-300"
            }`}
        >
          Annually
        </button>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pricingConfig.plans.map((plan) => (
          <PricingCard
            key={plan.name}
            name={plan.name}
            description={plan.description}
            price={billing === "monthly" ? plan.priceMonthly : plan.priceYearly}
            billing={billing}
            features={plan.features}
            gradient={plan.gradient}
            width={plan.width}
          />
        ))}
      </div>
      <p className="-mt-5 text-center text-xs text-slate-500">Prices shown in Indian rupees. Yearly prices are billed annually.</p>
    </div>
  );
}
