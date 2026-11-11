import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, WalletCards } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { currency, deviceTypes, getCartLineName, getCartLinePrice, sensorAddOns } from "../data/storeCatalog";
import { useCart } from "../context/CartContext";
import { authRequest, csrfToken } from "../lib/platformAuth";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [order, setOrder] = useState(null);
  const [account, setAccount] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shipping, setShipping] = useState({ fullName: "", email: "", phone: "", address: "", city: "", postalCode: "" });

  useEffect(() => {
    let active = true;
    authRequest("/auth/session/")
      .then((session) => {
        if (!active) return;
        if (!session.authenticated) navigate("/login", { state: { from: "/checkout" }, replace: true });
        else {
          setAccount(session.user);
          setShipping((current) => ({ ...current, email: current.email || session.user.email || "", fullName: current.fullName || [session.user.first_name, session.user.last_name].filter(Boolean).join(" ") }));
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message || "Could not verify your sign-in session."); })
      .finally(() => { if (active) setLoadingSession(false); });
    return () => { active = false; };
  }, [navigate]);

  async function submitOrder(event) {
    event.preventDefault();
    if (!account || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await authRequest("/orders/", {
        method: "POST",
        token: await csrfToken(),
        body: {
          payment_method: paymentMethod,
          delivery: {
            full_name: shipping.fullName,
            email: shipping.email,
            phone: shipping.phone,
            address: shipping.address,
            city: shipping.city,
            postal_code: shipping.postalCode,
          },
          items: items.map((line) => ({ product_id: line.productId, add_on_ids: line.addOnIds || [], quantity: line.quantity })),
        },
      });
      setOrder(result);
      clearCart();
    } catch (requestError) {
      setError(requestError.message || "Could not save your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) return <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_15%_15%,rgba(37,99,235,0.2),transparent_38%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-5 pt-24 text-white">
    <section className="max-w-xl rounded-3xl border border-white/10 bg-slate-950/55 p-8 text-center shadow-2xl shadow-black/30 md:p-12">
      <CheckCircle2 size={46} className="mx-auto text-sky-300" />
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Order received</p>
      <h1 className="mt-3 text-3xl font-semibold">Your order is saved.</h1>
      <p className="mt-4 leading-7 text-slate-300">Order <span className="font-mono text-white">{order.order_number}</span> is awaiting payment. The selected method is recorded, but payment has not been processed. These are prototype catalog prices.</p>
      <Link to="/devices" className="mt-7 inline-flex rounded-full bg-gradient-to-r from-sky-300 to-violet-300 px-5 py-3 font-semibold text-slate-950">View devices</Link>
    </section>
  </main>;

  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_5%,rgba(37,99,235,0.22),transparent_38%),radial-gradient(ellipse_at_90%_55%,rgba(124,58,237,0.18),transparent_42%),linear-gradient(145deg,#030712,#0b1635_54%,#100b2e)] px-4 pb-16 pt-28 text-white sm:px-5 sm:pb-24 sm:pt-36 md:px-8">
    <section className="mx-auto max-w-6xl">
      <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-sky-200 hover:text-white"><ArrowLeft size={16} /> Back to cart</Link>
      <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">Checkout</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-5xl">Place your order.</h1>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200/15 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100/90"><LockKeyhole size={18} className="mt-0.5 shrink-0" /><p>Orders are saved to your signed-in Vesla account. Catalog prices are samples. This prototype does not collect card or UPI details and does not process payments; a real payment provider must be connected before accepting money.</p></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/25 bg-rose-950/40 p-4 text-rose-100">{error}</p>}

      {loadingSession ? <p className="mt-8 text-slate-300">Checking your account…</p> : items.length === 0 ? <article className="mt-8 rounded-3xl border border-white/10 bg-slate-950/45 p-8"><h2 className="text-xl font-semibold">Your cart is empty</h2><p className="mt-2 text-slate-400">Add a device bundle before continuing.</p><Link to="/shop" className="mt-5 inline-flex rounded-full bg-gradient-to-r from-sky-300 to-violet-300 px-5 py-3 font-semibold text-slate-950">Explore devices</Link></article> : <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_370px]">
        <form id="demo-checkout-form" onSubmit={submitOrder} className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-6 md:p-8">
            <h2 className="text-xl font-semibold">Delivery details</h2>
            <p className="mt-2 text-sm text-slate-400">These details are sent to Django and saved with this order.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[["fullName", "Full name", "text"], ["email", "Email address", "email"], ["phone", "Phone number", "tel"], ["city", "City", "text"], ["postalCode", "Postal code", "text"]].map(([key, label, type]) => <label key={key} className="text-sm text-slate-300">{label}<input required type={type} value={shipping[key]} onChange={(event) => setShipping((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-200/50" /></label>)}
              <label className="text-sm text-slate-300 sm:col-span-2">Street address<textarea required rows={3} value={shipping.address} onChange={(event) => setShipping((current) => ({ ...current, address: event.target.value }))} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-200/50" /></label>
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-6 md:p-8">
            <h2 className="text-xl font-semibold">Choose a payment method</h2>
            <p className="mt-2 text-sm text-slate-400">Choose your intended method. It is stored with the order; payment is not yet connected.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[["upi", "UPI", WalletCards], ["card", "Credit / debit card", CreditCard], ["cod", "Pay on delivery", LockKeyhole]].map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setPaymentMethod(id)} className={`flex min-h-24 flex-col items-start justify-between rounded-2xl border p-4 text-left transition ${paymentMethod === id ? "border-sky-200/50 bg-blue-950/50" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"}`}><Icon size={20} className="text-sky-200" /><span className="mt-4 text-sm font-medium">{label}</span></button>)}
            </div>
          </section>
        </form>

        <aside className="h-fit rounded-3xl border border-white/10 bg-slate-950/55 p-6 lg:sticky lg:top-32">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <div className="mt-5 space-y-4">
            {items.map((line) => {
              const product = deviceTypes.find((item) => item.id === line.productId);
              const addons = sensorAddOns.filter((item) => line.addOnIds?.includes(item.id));
              return <div key={line.key} className="border-b border-white/10 pb-4">
                <div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-200">{getCartLineName(line)} × {line.quantity}</span><span>{currency(getCartLinePrice(line) * line.quantity)}</span></div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{[...(product?.features || []), ...addons.map((item) => item.name)].join(" · ")}</p>
              </div>;
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm text-slate-300"><span>Subtotal</span><span>{currency(subtotal)}</span></div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-4 font-semibold"><span>Sample total</span><span>{currency(subtotal)}</span></div>
          <button type="submit" form="demo-checkout-form" disabled={!account || submitting} className="mt-6 w-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{submitting ? "Saving order…" : "Place order · payment pending"}</button>
          <p className="mt-3 text-center text-xs text-slate-500">Selected method: {paymentMethod === "upi" ? "UPI" : paymentMethod === "card" ? "Credit / debit card" : "Pay on delivery"} · Signed in as {account?.username || "checking account"}</p>
        </aside>
      </div>}
    </section>
  </main>;
}
