import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authRequest, csrfToken } from "../lib/platformAuth";
import { getProfileAvatar } from "../lib/profileAvatar";

export default function ProfilePage() {
  const [account, setAccount] = useState(null);
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertPrefs, setAlertPrefs] = useState({ phone_number: "", email_alerts_enabled: true, sms_alerts_enabled: false });
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [purchasedDevices, setPurchasedDevices] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    authRequest("/auth/session/")
      .then(async (session) => {
        if (!active) return;
        if (!session.authenticated) {
          navigate("/login", { replace: true });
          return;
        }
        setAccount(session.user);
        setAvatar(getProfileAvatar(session.user.avatar_index));
        const [preferences, purchases] = await Promise.all([
          authRequest("/auth/profile/alerts/"),
          authRequest("/orders/mine/").catch(() => ({ purchased_devices: [] })),
        ]);
        if (active) setAlertPrefs(preferences);
        if (active) setPurchasedDevices(purchases.purchased_devices || []);
      })
      .catch(() => { if (active) setError("Could not verify your Vesla account."); })
      .finally(() => { if (active) { setLoading(false); setLoadingPurchases(false); } });
    return () => { active = false; };
  }, [navigate]);

  async function saveAlertPreferences(event) {
    event.preventDefault();
    setSavingAlerts(true);
    setError("");
    setAlertMessage("");
    try {
      const preferences = await authRequest("/auth/profile/alerts/", {
        method: "PATCH",
        token: await csrfToken(),
        body: alertPrefs,
      });
      setAlertPrefs(preferences);
      setAlertMessage("Alert preferences saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save alert preferences.");
    } finally {
      setSavingAlerts(false);
    }
  }

  async function signOut() {
    try {
      await authRequest("/auth/logout/", { method: "POST", token: await csrfToken() });
      window.dispatchEvent(new CustomEvent("vesla:auth-change", { detail: null }));
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not sign out.");
    }
  }

  async function changeAvatar() {
    if (!account) return;
    try {
      const result = await authRequest("/auth/profile/avatar/shuffle/", {
        method: "POST",
        token: await csrfToken(),
      });
      setAccount((current) => ({ ...current, avatar_index: result.avatar_index }));
      setAvatar(getProfileAvatar(result.avatar_index));
    window.dispatchEvent(new CustomEvent("vesla:avatar-change", {
        detail: { userId: account.id, avatarIndex: result.avatar_index },
    }));
    } catch (requestError) {
      setError(requestError.message || "Could not change your avatar.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_5%,rgba(37,99,235,0.25),transparent_38%),radial-gradient(ellipse_at_90%_55%,rgba(124,58,237,0.2),transparent_42%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-4 pt-28 pb-12 text-white sm:px-6 sm:pt-36 sm:pb-20">
      <section className="mx-auto max-w-2xl rounded-3xl border border-indigo-200/15 bg-gradient-to-br from-[#101d3d]/90 via-[#111a36]/85 to-[#211443]/80 p-5 shadow-[0_24px_90px_rgba(23,37,84,0.5)] backdrop-blur-2xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-200">Vesla profile</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Your account</h1>
        {loading && <p className="mt-6 text-indigo-100/75">Checking your session…</p>}
        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/25 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</p>}
        {account && <>
          <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-indigo-100/10 bg-[#071127]/55 p-4 sm:mt-8 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
            <img src={avatar} alt="Your Vesla doodle avatar" className="h-16 w-16 rounded-full border-2 border-indigo-200/40 object-cover shadow-lg shadow-indigo-950/60 sm:h-20 sm:w-20" />
            <div>
              <h2 className="text-xl font-semibold">{account.first_name || account.last_name ? `${account.first_name} ${account.last_name}`.trim() : account.username}</h2>
              <p className="mt-1 text-indigo-100/70">{account.email || "Email not added"}</p>
              <p className="mt-2 inline-flex rounded-full border border-violet-200/20 bg-violet-300/10 px-3 py-1 text-xs capitalize text-violet-100">{account.role}</p>
              <button type="button" onClick={changeAvatar} className="mt-3 block text-sm font-medium text-sky-200 underline-offset-4 transition hover:text-white hover:underline">Choose another avatar</button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-7 sm:flex sm:flex-wrap">
            <Link to="/dashboard" className="rounded-full bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 px-5 py-3 text-center font-semibold text-[#080f25] shadow-lg shadow-blue-950/40 transition hover:brightness-110 sm:px-6">Open dashboard</Link>
            <Link to="/devices" className="rounded-full border border-indigo-100/20 bg-white/5 px-5 py-3 text-center font-medium text-indigo-50 transition hover:bg-white/10 sm:px-6">My devices</Link>
            <button type="button" onClick={signOut} className="rounded-full border border-indigo-100/20 bg-white/5 px-5 py-3 font-medium text-indigo-50 transition hover:bg-white/10 sm:px-6">Sign out</button>
          </div>
          <section className="mt-7 rounded-2xl border border-indigo-100/10 bg-[#071127]/55 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Purchased devices</h2><p className="mt-1 text-sm leading-6 text-indigo-100/60">See which monitors are paired to this account.</p></div>
              <Link to="/devices" className="text-sm font-medium text-sky-200 underline underline-offset-4 hover:text-white">My devices</Link>
            </div>
            {loadingPurchases ? <p className="mt-5 text-sm text-indigo-100/70">Loading your orders…</p> : purchasedDevices.length === 0 ? <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="text-sm text-indigo-100/75">No device orders yet.</p><Link to="/shop" className="mt-3 inline-flex text-sm font-medium text-sky-200 underline underline-offset-4">Explore monitors</Link></div> : <div className="mt-4 space-y-3">
              {purchasedDevices.map((purchase) => <article key={purchase.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><h3 className="font-medium text-white">{purchase.product_name}</h3><p className="mt-1 break-words text-xs text-slate-400">Order {purchase.order_number} · {new Date(purchase.created_at).toLocaleDateString()}</p>{purchase.order_status === "awaiting_payment" && <p className="mt-1 text-xs text-amber-100/70">Payment is still pending for this order.</p>}
                    {purchase.add_ons?.length > 0 && <p className="mt-2 text-xs leading-5 text-indigo-100/60">Add-ons: {purchase.add_ons.map((item) => item.name).join(", ")}</p>}
                    {purchase.device_id && <p className="mt-2 font-mono text-xs text-sky-200">{purchase.device_name} · {purchase.device_id}</p>}
                  </div>
                  <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${purchase.setup_complete ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>{purchase.setup_complete ? "Setup complete" : "Setup needed"}</span>
                </div>
                {!purchase.setup_complete && <Link to="/devices" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 px-4 py-2.5 text-sm font-semibold text-[#080f25] transition hover:brightness-110 sm:w-auto">Setup</Link>}
                {purchase.setup_complete && <Link to={`/dashboard?device=${encodeURIComponent(purchase.device_id)}`} className="mt-4 inline-flex text-sm font-medium text-sky-200 underline underline-offset-4 hover:text-white">View readings</Link>}
              </article>)}
            </div>}
          </section>
          <form onSubmit={saveAlertPreferences} className="mt-8 rounded-2xl border border-indigo-100/10 bg-[#071127]/55 p-5">
            <h2 className="text-lg font-semibold">Water threshold alerts</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-100/65">Vesla sends an alert when a reading crosses into its alert range. Turbidity above 700 NTU is marked cloudy; TDS above 200 ppm is marked high. These are your project alert limits, not a water-safety certification.</p>
            <label className="mt-5 block text-sm text-indigo-50/90">Mobile number for SMS
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+919876543210" value={alertPrefs.phone_number} onChange={(event) => setAlertPrefs((current) => ({ ...current, phone_number: event.target.value }))} className="mt-2 w-full rounded-xl border border-indigo-100/15 bg-[#050b1c]/75 px-4 py-3 text-white outline-none focus:border-blue-300" />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm text-indigo-50/85"><input type="checkbox" checked={alertPrefs.email_alerts_enabled} onChange={(event) => setAlertPrefs((current) => ({ ...current, email_alerts_enabled: event.target.checked }))} className="mt-1 accent-sky-300" /><span>Send water threshold alerts to my account email ({account.email || "no email on account"}).</span></label>
            <label className="mt-3 flex items-start gap-3 text-sm text-indigo-50/85"><input type="checkbox" checked={alertPrefs.sms_alerts_enabled} onChange={(event) => setAlertPrefs((current) => ({ ...current, sms_alerts_enabled: event.target.checked }))} className="mt-1 accent-sky-300" /><span>I agree to receive SMS water threshold alerts at this number. Standard carrier charges may apply.</span></label>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={savingAlerts} className="rounded-full bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 px-5 py-2.5 text-sm font-semibold text-[#080f25] transition hover:brightness-110 disabled:opacity-60">{savingAlerts ? "Saving…" : "Save alert settings"}</button>
              {alertMessage && <span role="status" className="text-sm text-emerald-200">{alertMessage}</span>}
            </div>
            <p className="mt-4 text-xs leading-5 text-indigo-100/50">SMS needs the Vesla server’s SMS provider configuration. Email needs SMTP in production; local development prints email previews in the Django terminal.</p>
          </form>
        </>}
      </section>
    </main>
  );
}
