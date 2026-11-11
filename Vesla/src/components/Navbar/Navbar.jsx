import React from "react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { authRequest } from "../../lib/platformAuth";
import { getProfileAvatar } from "../../lib/profileAvatar";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "../../context/CartContext";

export default function Navbar() {
  const [account, setAccount] = useState(null);
  const [avatar, setAvatar] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    let active = true;
    const updateAccount = (user) => {
      setAccount(user || null);
      setAvatar(user ? getProfileAvatar(user.avatar_index) : "");
    };
    authRequest("/auth/session/")
      .then((session) => { if (active) updateAccount(session.authenticated ? session.user : null); })
      .catch(() => { if (active) updateAccount(null); });
    const handleAuthChange = (event) => updateAccount(event.detail);
    const handleAvatarChange = (event) => {
      if (event.detail?.userId === account?.id) setAvatar(getProfileAvatar(event.detail.avatarIndex));
    };
    window.addEventListener("vesla:auth-change", handleAuthChange);
    window.addEventListener("vesla:avatar-change", handleAvatarChange);
    return () => {
      active = false;
      window.removeEventListener("vesla:auth-change", handleAuthChange);
      window.removeEventListener("vesla:avatar-change", handleAvatarChange);
    };
  }, [account?.id]);

  return (
    <nav 
      className="fixed left-1/2 top-3 z-50 flex w-[calc(100%-1.5rem)] max-w-6xl -translate-x-1/2 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-white/20 bg-[#09101f]/85 px-4 py-2.5 shadow-xl shadow-black/20 backdrop-blur-xl sm:top-4 sm:w-[92%] sm:px-6 sm:py-3"
    >
      {/* LEFT: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white"></div>
        </div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Vesla
        </h1>
      </div>

      {/* CENTER: Menu */}
      <div className="hidden md:flex items-center gap-8 text-white/90">
        <Link to="/" className="hover:text-white transition">Home</Link>
        <Link to="/about" className="hover:text-white transition">About</Link>
        <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
        <Link to="/shop" className="hover:text-white transition">Shop</Link>
        <Link to="/dashboard" className="hover:text-white transition">Dashboard</Link>
      </div>

      {/* RIGHT: Button */}
      <div className="flex items-center gap-2">
        <Link to="/cart" aria-label={`View cart, ${itemCount} items`} title="Cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100/20 bg-white/5 text-white transition hover:bg-white/10">
          <ShoppingBag size={18} />
          {itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-sky-300 to-violet-300 px-1 text-[11px] font-bold text-slate-950">{itemCount}</span>}
        </Link>
      {account ? <Link to="/profile" aria-label={`Open profile for ${account.username}`} title={`Profile: ${account.username}`} className="flex items-center gap-2 rounded-full border border-indigo-100/20 bg-gradient-to-r from-[#12244a] to-[#261849] px-2 py-1.5 shadow-lg shadow-indigo-950/40 transition hover:border-blue-200/50">
        <img src={avatar} alt="" className="h-9 w-9 rounded-full border border-indigo-100/30 object-cover" />
      </Link> : <div className="hidden items-center gap-2 md:flex">
        <Link to="/login" className="rounded-full border border-white/20 bg-white/5 px-5 py-2 font-medium text-white shadow-sm transition hover:bg-white/10">
          Sign in
        </Link>
        <Link to="/signup" className="rounded-full bg-white px-5 py-2 font-medium text-black shadow-sm transition hover:bg-gray-100">
          Sign up
        </Link>
      </div>}
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white md:hidden" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {mobileMenuOpen && <div className="order-3 flex w-full flex-col gap-1 border-t border-white/10 pt-2 text-sm text-white/90 md:hidden">
        {[["Home", "/"], ["About", "/about"], ["Pricing", "/pricing"], ["Shop", "/shop"], ["Dashboard", "/dashboard"]].map(([label, to]) => <Link key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 transition hover:bg-white/10">{label}</Link>)}
        {!account && <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
          <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/15 px-3 py-2.5 text-center">Sign in</Link>
          <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-xl bg-white px-3 py-2.5 text-center font-medium text-slate-950">Sign up</Link>
        </div>}
      </div>}
    </nav>
  );
}
