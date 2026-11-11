import { ArrowDown, CircleHelp, CreditCard } from "lucide-react";
import bgImg from "../assets/bg.png";
import PricingLoader from "../components/PricingLoader.jsx";

const questions = [
  {
    question: "What is the difference between monthly and annual billing?",
    answer: "Use the billing switch above the plans to compare the listed monthly and annual amounts.",
  },
  {
    question: "Can I purchase a plan from this page today?",
    answer: "Not yet. The plan cards are displayed for the Vesla prototype; payment processing and plan activation are not connected.",
  },
  {
    question: "Can I start using the dashboard?",
    answer: "Yes. Create an account to open the dashboard. The readings shown depend on the devices and data connected to that account.",
  },
];

export default function Pricing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
      <section
        className="relative flex min-h-screen flex-col items-center justify-center bg-cover bg-center px-6 pb-20 pt-40 text-center supports-[height:100svh]:min-h-[100svh] md:pt-44"
        style={{ backgroundImage: `linear-gradient(180deg,rgba(3,7,18,.22),#030712 96%),url(${bgImg})` }}
      >
        <p className="mb-5 rounded-full border border-blue-200/15 bg-blue-950/35 px-4 py-2 text-sm text-blue-100/85 backdrop-blur">Vesla plans</p>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
          Water monitoring, <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">made clear.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
          Choose a plan that fits the way you monitor water readings and trends.
        </p>
        <a
          href="#pricing-cards"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("pricing-cards")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="mt-8 inline-flex h-14 w-48 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-300 via-indigo-200 to-violet-300 px-6 font-semibold text-slate-950 shadow-lg shadow-blue-950/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
        >
          View pricing <ArrowDown size={23} className="animate-pricing-arrow" />
        </a>
      </section>

      <section className="relative border-y border-white/[0.06] bg-[radial-gradient(ellipse_at_50%_32%,rgba(37,99,235,0.16)_0%,rgba(67,56,202,0.11)_32%,rgba(76,29,149,0.07)_56%,rgba(3,7,18,0)_80%),linear-gradient(180deg,#050a19_0%,#070b1c_52%,#030712_100%)] px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Plans</p>
            <h2 className="mt-4 text-3xl font-semibold md:text-5xl">Find your Vesla plan.</h2>
            <p className="mt-4 leading-7 text-slate-400">Compare the plan options and switch between monthly and annual pricing.</p>
          </div>
          <div id="pricing-cards" className="scroll-mt-8">
            <PricingLoader />
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-slate-500">
            These are the plan prices and features currently displayed for the Vesla prototype. Checkout and paid plan activation are not yet available.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-[0.65fr_1fr] md:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Plan details</p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Questions before you get started?</h2>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-200/10 bg-blue-950/25 p-5 text-sm leading-6 text-slate-300">
            <CreditCard className="mt-0.5 shrink-0 text-sky-300" size={18} />
            <span>No payment details are collected on this page. The displayed plan cards do not create a subscription.</span>
          </div>
        </div>
        <div className="space-y-4">
          {questions.map(({ question, answer }) => (
            <article key={question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 md:p-6">
              <h3 className="flex items-center gap-2 font-semibold text-white"><CircleHelp size={17} className="text-violet-300" />{question}</h3>
              <p className="mt-3 leading-7 text-slate-400">{answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
