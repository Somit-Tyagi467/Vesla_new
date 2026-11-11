import { Activity, ArrowRight, Database, Droplets, Gauge, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import bgImg from "../assets/bg.png";
import imgAbout from "../assets/img_about.webp";

const steps = [
  {
    icon: Waves,
    number: "01",
    title: "Measure",
    description: "Water sensors collect readings such as temperature, TDS, and turbidity.",
  },
  {
    icon: Activity,
    number: "02",
    title: "Send",
    description: "An ESP32 sends each measurement to the Vesla service with its device and time information.",
  },
  {
    icon: Database,
    number: "03",
    title: "Understand",
    description: "The dashboard keeps a history, shows how readings change, and highlights patterns in plain language.",
  },
];

const About = () => (
  <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
    <section
      className="relative flex min-h-screen flex-col items-center justify-center bg-cover bg-center px-6 pb-20 pt-40 text-center supports-[height:100svh]:min-h-[100svh] md:pt-44"
      style={{ backgroundImage: `linear-gradient(180deg,rgba(3,7,18,.22),#030712 96%),url(${bgImg})` }}
    >
      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-950/35 px-4 py-2 text-sm text-blue-100/80 backdrop-blur">
        <Droplets size={16} /> Water monitoring, made easier to follow
      </p>
      <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
        Know what your water readings are <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">doing over time.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
        Vesla brings sensor measurements and their history into one dashboard, helping you notice changes and follow what happens next.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <Link to="/shop" className="inline-flex h-14 w-48 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 px-6 font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300">
          Get started <ArrowRight size={23} />
        </Link>
        <Link to="/pricing" className="inline-flex h-14 w-48 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 font-medium text-white transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300">
          View pricing
        </Link>
      </div>
    </section>

    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1fr_0.9fr] md:items-center md:py-24">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Why Vesla</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">A clearer view of changing conditions.</h2>
        <p className="mt-5 max-w-xl leading-7 text-slate-300">
          A single sensor reading is only a moment in time. Vesla brings readings together so households and teams can review recent measurements, look back at trends, and keep an eye on their monitored water system.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200/10 bg-blue-950/25 p-5">
            <Gauge className="text-sky-300" />
            <h3 className="mt-4 font-semibold">Readings in context</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Compare recent measurements with earlier readings from the same device.</p>
          </div>
          <div className="rounded-2xl border border-violet-200/10 bg-violet-950/20 p-5">
            <Activity className="text-violet-300" />
            <h3 className="mt-4 font-semibold">Changes made visible</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Follow trends and get straightforward summaries as data accumulates.</p>
          </div>
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-lg">
        <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-2xl" />
        <img src={imgAbout} alt="Illustration representing water monitoring" className="relative w-full rounded-[2rem] border border-white/10 object-cover shadow-2xl shadow-blue-950/30" />
      </div>
    </section>

    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[radial-gradient(ellipse_at_50%_42%,rgba(37,99,235,0.17)_0%,rgba(67,56,202,0.12)_30%,rgba(76,29,149,0.08)_52%,rgba(3,7,18,0)_78%),linear-gradient(180deg,#050a19_0%,#070b1c_50%,#030712_100%)] px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold md:text-5xl">From a sensor to a useful history.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, number, title, description }) => (
            <article key={number} className="rounded-3xl border border-white/10 bg-slate-950/55 p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-400/20 to-violet-400/20 text-sky-200"><Icon size={22} /></span>
                <span className="text-sm font-medium tracking-widest text-slate-500">{number}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-[0.7fr_1fr] md:py-24">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Current prototype</p>
        <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Built transparently, one sensor at a time.</h2>
      </div>
      <div className="rounded-3xl border border-amber-200/15 bg-amber-950/20 p-6 md:p-8">
        <p className="leading-7 text-slate-200">
          The current hardware setup sends temperature, TDS, and turbidity measurements. pH and pressure can appear as clearly marked demonstration values until their sensors are connected. Sensor estimates and dashboard guidance are for monitoring trends; they are not a laboratory test or a certification that water is safe to drink.
        </p>
      </div>
    </section>
  </main>
);

export default About;
