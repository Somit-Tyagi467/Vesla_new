import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav 
      className="
        fixed top-4 left-1/2 -translate-x-1/2
        w-[92%] max-w-6xl
        bg-white/10 backdrop-blur-xl
        border border-white/20
        rounded-2xl
        px-6 py-3
        flex items-center justify-between
        z-50
      "
    >
      {/* LEFT: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white"></div>
        </div>
        <h1 className="text-white text-3xl font-semibold">
          Vesla
        </h1>
      </div>

      {/* CENTER: Menu */}
      <div className="hidden md:flex items-center gap-8 text-white/90">
        <Link to="/" className="hover:text-white transition">Home</Link>
        <Link to="/about" className="hover:text-white transition">Benefits</Link>
        <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
        <Link to="/dashboard" className="hover:text-white transition">Dashboard</Link>
        <a href="#" className="hover:text-white transition flex items-center gap-1">
          Docs <ArrowUpRight size={14} />
        </a>
      </div>

      {/* RIGHT: Button */}
      <button
        className="
          bg-white text-black px-5 py-2 rounded-full
          font-medium shadow-sm
          hover:bg-gray-100 transition
        "
      >
        Start for free
      </button>
    </nav>
  );
}
