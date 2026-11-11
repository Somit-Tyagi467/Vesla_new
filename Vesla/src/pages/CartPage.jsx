import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { currency, deviceTypes, getCartLineName, getCartLinePrice, sensorAddOns } from "../data/storeCatalog";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, subtotal, setQuantity, removeItem } = useCart();
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_5%,rgba(37,99,235,0.22),transparent_38%),radial-gradient(ellipse_at_90%_55%,rgba(124,58,237,0.18),transparent_42%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-4 pb-16 pt-28 text-white sm:px-5 sm:pb-24 sm:pt-36 md:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">Your cart</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-5xl">Review your Vesla setup.</h1>
        <p className="mt-4 text-sm text-amber-200/80">Prototype catalog only · sample INR prices · no payment is collected.</p>

        {items.length === 0 ? <article className="mt-10 rounded-3xl border border-white/10 bg-slate-950/45 p-10 text-center">
          <ShoppingBag className="mx-auto text-sky-200" size={34} />
          <h2 className="mt-4 text-2xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-slate-400">Choose a monitor and optional sensors to start building your setup.</p>
          <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-300 to-violet-300 px-5 py-3 font-semibold text-slate-950">Explore devices <ArrowRight size={17} /></Link>
        </article> : <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map((line) => {
              const product = deviceTypes.find((item) => item.id === line.productId);
              const sensors = sensorAddOns.filter((item) => line.addOnIds?.includes(item.id));
              return <article key={line.key} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-semibold">{getCartLineName(line)}</h2>
                    <p className="mt-1 text-sm text-slate-400">{product?.tagline}</p>
                    <p className="mt-4 text-sm font-medium text-slate-200">Included sensors and parts</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-400">
                      {(product?.features || []).map((feature) => <li key={feature}>· {feature}</li>)}
                      {sensors.map((sensor) => <li key={sensor.id}>· {sensor.name}</li>)}
                    </ul>
                  </div>
                  <div className="text-right"><p className="text-lg font-semibold">{currency(getCartLinePrice(line) * line.quantity)}</p><p className="text-xs text-slate-500">{currency(getCartLinePrice(line))} each</p></div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] p-1">
                    <button type="button" aria-label={`Remove one ${getCartLineName(line)}`} onClick={() => setQuantity(line.key, line.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10"><Minus size={15} /></button>
                    <span className="min-w-5 text-center text-sm font-semibold">{line.quantity}</span>
                    <button type="button" aria-label={`Add one ${getCartLineName(line)}`} onClick={() => setQuantity(line.key, line.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-200 hover:bg-white/10"><Plus size={15} /></button>
                  </div>
                  <button type="button" onClick={() => removeItem(line.key)} className="inline-flex items-center gap-2 text-sm text-rose-200 transition hover:text-rose-100"><Trash2 size={15} /> Remove</button>
                </div>
              </article>;
            })}
            <Link to="/shop" className="inline-flex items-center gap-2 py-3 text-sm text-sky-200 hover:text-white">Continue exploring <ArrowRight size={16} /></Link>
          </div>
          <aside className="h-fit rounded-3xl border border-white/10 bg-slate-950/55 p-6 lg:sticky lg:top-32">
            <h2 className="text-xl font-semibold">Order summary</h2>
            <div className="mt-5 flex justify-between text-sm text-slate-300"><span>Items</span><span>{items.reduce((total, line) => total + line.quantity, 0)}</span></div>
            <div className="mt-3 flex justify-between text-sm text-slate-300"><span>Subtotal</span><span>{currency(subtotal)}</span></div>
            <div className="mt-4 border-t border-white/10 pt-4"><div className="flex justify-between font-semibold"><span>Total</span><span>{currency(subtotal)}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">Shipping and taxes are not calculated in this prototype.</p></div>
            <Link to="/checkout" className="mt-6 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110">Continue to checkout <ArrowRight size={17} /></Link>
          </aside>
        </div>}
      </section>
    </main>
  );
}
