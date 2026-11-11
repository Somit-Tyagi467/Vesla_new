import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authRequest, csrfToken } from "../lib/platformAuth";

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [pairingCode, setPairingCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingCode, setCreatingCode] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const sensorNames = { tds: "TDS", turbidity: "Turbidity", temperature: "Temperature", ph: "pH", pressure: "Pressure", flow: "Flow" };

  const loadDevices = useCallback(async () => {
    const result = await authRequest("/devices/");
    setDevices(result.devices || []);
  }, []);

  useEffect(() => {
    let active = true;
    let refreshTimer;

    async function initialize() {
      try {
        const session = await authRequest("/auth/session/");
        if (!active) return;
        if (!session.authenticated) {
          navigate("/login", { replace: true });
          return;
        }
        setIsAdmin(session.user?.is_superuser === true);
        await loadDevices();
        if (!active) return;
        refreshTimer = window.setInterval(() => {
          loadDevices().catch((requestError) => {
            if (active) setError(requestError.message || "Could not refresh device status.");
          });
        }, 5000);
      } catch (requestError) {
        if (active) setError(requestError.message || "Could not load your devices.");
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [loadDevices, navigate]);

  async function createPairingCode() {
    setCreatingCode(true);
    setError("");
    try {
      const result = await authRequest("/devices/pairing-code/", {
        method: "POST",
        token: await csrfToken(),
      });
      setPairingCode(result.pairing_code);
      setExpiresAt(result.expires_at);
    } catch (requestError) {
      setError(requestError.message || "Could not create a pairing code.");
    } finally {
      setCreatingCode(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_5%,rgba(37,99,235,0.24),transparent_38%),radial-gradient(ellipse_at_90%_55%,rgba(124,58,237,0.2),transparent_42%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-4 pb-12 pt-28 text-white sm:px-6 sm:pb-20 sm:pt-36">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-200">Devices</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Your water monitors</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">{isAdmin ? "Admin view: all monitors registered on the platform are listed here." : "Each monitor is linked to your account. Its readings and connection status are only visible to you."}</p>
          </div>
          <button type="button" onClick={createPairingCode} disabled={creatingCode} className="w-full rounded-full bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 px-5 py-3 font-semibold text-[#080f25] shadow-lg shadow-blue-950/40 transition hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-6">
            {creatingCode ? "Preparing…" : "Add a device"}
          </button>
        </div>

        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/25 bg-rose-950/40 p-4 text-rose-100">{error}</p>}

        {pairingCode && <article className="mt-8 rounded-3xl border border-sky-200/20 bg-gradient-to-br from-blue-950/70 via-indigo-950/50 to-violet-950/50 p-5 shadow-xl shadow-blue-950/20 sm:p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-200">Pairing code · expires in 10 minutes</p>
          <p className="mt-4 break-all font-mono text-3xl font-bold tracking-[0.12em] text-white sm:text-4xl md:text-5xl">{pairingCode}</p>
          <p className="mt-3 text-sm text-slate-300">Keep this page open. After the setup firmware is installed, connect your phone to the ESP32’s temporary Vesla setup Wi-Fi and enter this code there with your Wi-Fi details.</p>
          {expiresAt && <p className="mt-2 text-xs text-slate-400">Expires at {new Date(expiresAt).toLocaleTimeString()}.</p>}
          <p className="mt-4 text-sm text-slate-400">Your Wi-Fi password should be entered directly on the ESP32 setup portal; Vesla does not need to store it.</p>
        </article>}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {loading && <p className="text-slate-300">Loading devices…</p>}
          {!loading && devices.length === 0 && <article className="rounded-3xl border border-white/10 bg-slate-950/45 p-7 md:col-span-2">
            <h2 className="text-xl font-semibold">No devices linked yet</h2>
            <p className="mt-2 leading-7 text-slate-400">Choose Add a device to prepare a short-lived pairing code. The ESP32 setup firmware will use it to link the device to this account.</p>
          </article>}
          {devices.map((device) => <article key={device.device_id} className="rounded-3xl border border-white/10 bg-slate-950/45 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{device.name}</h2>
                <p className="mt-1 font-mono text-sm text-slate-400">{device.device_id}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${device.online ? "bg-emerald-300/10 text-emerald-200" : "bg-slate-300/10 text-slate-300"}`}>
                {device.online ? "Online" : "Offline"}
              </span>
            </div>
            <p className="mt-5 text-sm text-slate-400">{device.last_seen ? `Last seen ${new Date(device.last_seen).toLocaleString()}` : "Waiting for the device to send its first reading."}</p>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Configured sensors">
              <span className="self-center text-xs text-slate-500">Sensors in setup:</span>
              {(device.sensor_configuration || []).map((sensor) => <span key={sensor} className="rounded-full border border-sky-200/15 bg-sky-200/[0.06] px-3 py-1 text-xs text-sky-100">{sensorNames[sensor] || sensor}</span>)}
            </div>
            <Link to={`/dashboard?device=${encodeURIComponent(device.device_id)}`} className="mt-5 inline-flex rounded-full border border-indigo-100/20 bg-white/5 px-4 py-2 text-sm text-indigo-100 transition hover:bg-white/10">View readings</Link>
          </article>)}
        </div>
      </section>
    </main>
  );
}
