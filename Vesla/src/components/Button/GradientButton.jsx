import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function GradientButton({ text, to = "/login", variant = "primary" }) {
  const secondary = variant === "secondary";

  return (
    <Link
      to={to}
      className={`group relative inline-flex h-14 w-48 shrink-0 items-center justify-center overflow-hidden rounded-full border px-12 text-lg font-semibold transition-[filter,border-color] duration-500 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 ${
        secondary
          ? "border-white/15 bg-white/[0.04]"
          : "border-transparent bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 shadow-lg shadow-blue-950/30"
      }`}
    >
      <span
        aria-hidden="true"
        className={`animated-cta-fill absolute inset-0 rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 ${secondary ? "" : "is-visible"}`}
      />
      <span className={`animated-cta-label relative z-10 whitespace-nowrap ${secondary ? "text-white transition-colors duration-500 group-hover:text-slate-950" : "text-slate-950"}`}>
        {text}
      </span>
      <span aria-hidden="true" className="animated-cta-circle absolute top-1 z-20 grid h-12 w-12 place-items-center rounded-full bg-white text-slate-950 shadow-md">
        <ChevronRight size={25} className="animated-cta-chevron" />
      </span>
    </Link>
  );
}
