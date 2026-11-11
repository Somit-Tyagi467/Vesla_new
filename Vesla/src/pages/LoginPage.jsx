import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authRequest, csrfToken } from "../lib/platformAuth";
import { useCart } from "../context/CartContext";

function getPostAuthPath(state, hasCartItems) {
  const requested = typeof state?.from === "string" ? state.from : state?.from?.pathname;
  if (requested?.startsWith("/") && !["/login", "/signup"].includes(requested)) return requested;
  return hasCartItems ? "/cart" : "/";
}

export default function LoginPage({ initialMode = "login" }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const postAuthPath = getPostAuthPath(location.state, itemCount > 0);

  useEffect(() => {
    let active = true;
    authRequest("/auth/session/")
      .then((session) => {
        // Keep the signup screen accessible even when another account is signed in.
        // A successful registration will sign in the newly created account.
        if (active && session.authenticated && initialMode !== "register") {
          navigate(postAuthPath, { replace: true });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [initialMode, navigate, postAuthPath]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = await csrfToken();
      const user = await authRequest(mode === "register" ? "/auth/register/" : "/auth/login/", {
        method: "POST",
        body: mode === "register"
          ? { username, email, password, password_confirm: passwordConfirm }
          : { username, password },
        token,
      });
      window.dispatchEvent(new CustomEvent("vesla:auth-change", { detail: user }));
      navigate(postAuthPath, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_5%,rgba(37,99,235,0.25),transparent_38%),radial-gradient(ellipse_at_90%_55%,rgba(124,58,237,0.20),transparent_42%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-4 pt-28 pb-12 text-white sm:px-6 sm:pt-36 sm:pb-20">
      <section className="mx-auto max-w-md rounded-3xl border border-indigo-200/15 bg-gradient-to-br from-[#101d3d]/90 via-[#111a36]/85 to-[#211443]/80 p-5 shadow-[0_24px_90px_rgba(23,37,84,0.5)] backdrop-blur-2xl sm:p-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-200">Vesla account</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{mode === "register" ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-3 text-sm leading-6 text-indigo-100/75">{mode === "register" ? "Create an account to sign in and view the water-monitoring dashboard." : "Sign in to Vesla. Your account role determines which controls are available."}</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-200">
            Username
            <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-indigo-100/15 bg-[#050b1c]/75 px-4 py-3 text-white outline-none focus:border-blue-300" />
          </label>
          {mode === "register" && <label className="block text-sm text-indigo-100">
            Email
            <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-indigo-100/15 bg-[#050b1c]/75 px-4 py-3 text-white outline-none focus:border-blue-300" />
          </label>}
          <label className="block text-sm text-slate-200">
            Password
            <input aria-describedby={mode === "register" ? "password-requirements" : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" required minLength={mode === "register" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-indigo-100/15 bg-[#050b1c]/75 px-4 py-3 text-white outline-none focus:border-blue-300" />
            {mode === "register" && <span id="password-requirements" className="mt-3 block rounded-xl border border-indigo-100/10 bg-indigo-950/30 p-4 text-xs leading-5 text-indigo-100/75">
              <span className="mb-1 block font-semibold text-indigo-100">Password requirements</span>
              <span className="block">• At least 8 characters</span>
              <span className="block">• Not too similar to your username or email</span>
              <span className="block">• Not a commonly used password</span>
              <span className="block">• Not made up of numbers only</span>
            </span>}
          </label>
          {mode === "register" && <label className="block text-sm text-indigo-100">
            Confirm password
            <input autoComplete="new-password" type="password" required value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-indigo-100/15 bg-[#050b1c]/75 px-4 py-3 text-white outline-none focus:border-blue-300" />
          </label>}
          {error && <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 px-5 py-3 font-semibold text-[#080f25] shadow-lg shadow-blue-950/40 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-indigo-100/75">
          {mode === "register" ? "Already have an account?" : "New to Vesla?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }} className="font-medium text-blue-200 underline decoration-blue-200/40 underline-offset-4 hover:text-white">
            {mode === "register" ? "Sign in" : "Create an account"}
          </button>
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-indigo-100/75 underline decoration-indigo-200/20 underline-offset-4 hover:text-white">Back to home</Link>
      </section>
    </main>
  );
}
