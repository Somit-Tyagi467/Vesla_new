import { useRef, useState } from "react";
import { ArrowRight, Check, Droplets, Plus, ShieldCheck, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { currency, deviceTypes, sensorAddOns } from "../data/storeCatalog";
import { useCart } from "../context/CartContext";

export default function ShopPage() {
  const [selectedProduct, setSelectedProduct] = useState(deviceTypes[1].id);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [added, setAdded] = useState(false);
  const { itemCount, subtotal, addItem } = useCart();
  const configureRef = useRef(null);
  const product = deviceTypes.find((item) => item.id === selectedProduct) || deviceTypes[0];
  const addOnTotal = sensorAddOns.filter((sensor) => selectedSensors.includes(sensor.id)).reduce((sum, sensor) => sum + sensor.price, 0);

  function toggleSensor(id) {
    setSelectedSensors((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setAdded(false);
  }

  function addSelectedProduct() {
    addItem(product.id, selectedSensors);
    setAdded(true);
  }

  function selectProduct(productId) {
    setSelectedProduct(productId);
    setAdded(false);
    if (window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => configureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_5%,rgba(37,99,235,0.22),transparent_38%),radial-gradient(ellipse_at_90%_55%,rgba(124,58,237,0.18),transparent_42%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-4 pb-16 pt-28 text-white sm:px-5 sm:pb-24 sm:pt-32 md:px-8">
      <div className="sticky top-20 z-30 mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#09142a]/90 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:top-24 sm:gap-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{itemCount} {itemCount === 1 ? "item" : "items"} in your cart</p>
          <p className="text-xs text-slate-400">Subtotal · {currency(subtotal)}</p>
        </div>
        <Link to="/cart" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
          View cart <ArrowRight size={16} />
        </Link>
      </div>

      <section className="mx-auto mt-8 max-w-6xl sm:mt-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">Vesla store</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl">Build a monitor for your setup.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base sm:leading-7">Choose a device bundle, then add the sensors you need. The order flow is a preview; payment processing is not connected yet.</p>
          <p className="mt-3 text-xs text-amber-200/80">Prices shown are sample INR prices for the prototype and are not a live offer.</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            {deviceTypes.map((item, index) => {
              const active = item.id === selectedProduct;
              return (
                <button key={item.id} type="button" onClick={() => selectProduct(item.id)} aria-pressed={active}
                  className={`w-full rounded-3xl border p-4 text-left transition sm:p-6 ${active ? "border-sky-200/50 bg-gradient-to-br from-blue-950/75 via-indigo-950/65 to-violet-950/70 shadow-xl shadow-blue-950/30" : "border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-white/[0.06]"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-sky-200 sm:h-12 sm:w-12"><Droplets size={21} /></span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Device {String(index + 1).padStart(2, "0")}</p>
                        <h2 className="mt-1 text-lg font-semibold sm:text-xl">{item.name}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.tagline}</p>
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold sm:text-lg">{currency(item.price)}</span>
                  </div>
                  <ul className="mt-5 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                    {item.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check size={15} className="shrink-0 text-emerald-300" />{feature}</li>)}
                  </ul>
                </button>
              );
            })}
          </div>

          <aside ref={configureRef} id="configure-order" className="scroll-mt-24 rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-2xl shadow-black/20 sm:p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-200">Configure your order</p>
                <h2 className="mt-2 text-2xl font-semibold">Add-on sensors</h2>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><Waves size={21} /></span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">Selected bundle: <span className="font-medium text-slate-200">{product.name}</span></p>
            <div className="mt-5 space-y-3">
              {sensorAddOns.map((sensor) => {
                const checked = selectedSensors.includes(sensor.id);
                return <label key={sensor.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? "border-violet-200/40 bg-violet-950/25" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSensor(sensor.id)} className="mt-1 h-4 w-4 accent-violet-300" />
                  <span className="min-w-0 flex-1"><span className="block font-medium text-white">{sensor.name}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{sensor.description}</span></span>
                  <span className="shrink-0 text-sm text-slate-200">+ {currency(sensor.price)}</span>
                </label>;
              })}
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm text-slate-400">Sample configuration total</p><p className="mt-1 text-2xl font-semibold">{currency(product.price + addOnTotal)}</p></div>
              <button type="button" onClick={addSelectedProduct} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 sm:w-auto"><Plus size={17} /> Add to cart</button>
            </div>
            {added && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-emerald-200"><ShieldCheck size={16} /> Added to cart. Your selection is saved in this browser.</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}
