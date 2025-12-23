import { RefreshCcw, Sun } from "lucide-react";
import { CheckCircle, Sparkles, ShieldCheck } from "lucide-react";
import { IndianRupee } from "lucide-react";
import video from './../assets/video.mp4'
import vite from './../assets/react.svg'
import WaveSVG from "../assets/SVG/analytivs/analytivs-not-css.svg?react";
import "../assets/SVG/analytivs/analytivs-styles.css";
import Stat from "../assets/SVG/analytivs/design-stats-not-css.svg?react";
import "../assets/SVG/analytivs/design-stats-styles.css";

export const cardConfig = {
  innovation: {
    type:"row",
    cards: [
      {
      heading: "Human Innovation",
      subtitle:
        "We build technology that amplifies human potential— not replaces it.",
      icon: <Sun className="text-white" />,
      align: "left",
      image: vite,
      video: video
      },
      {
        heading: "Transparency & Trust",
        subtitle:
          "No black boxes. We believe in explainable AI and clear accountability.",
        icon: <RefreshCcw className="text-white" />,
        align: "left",
        image: vite,
        svg:<WaveSVG />
      },
      {
        heading: "Transparency & Trust",
        subtitle:
          "No black boxes. We believe in explainable AI and clear accountability.",
        icon: <RefreshCcw className="text-white" />,
        align: "left",
        image: vite,
        svg:<Stat />
      }
    ]
  },

  ethics: {
    type:"row",
    cards: [
      {
        heading: "Impact with Integrity",
        subtitle:
          "We aim to make real difference— boosting efficiency and improving access.",
        icon: <Sun className="text-white" />,
        align: "left",
        width:"40%",
      },
      {
        heading: "Impact with Integrity",
        subtitle:
          "We aim to make real difference— boosting efficiency and improving access.",
        icon: <Sun className="text-white" />,
        align: "left",
        width:"60%",
      },
    ]
  },
};
export const pricingConfig = {
  plans: [
    {
      name: "Starter",
      priceMonthly: 29,
      priceYearly: 299,
      description: "Perfect for small teams and individual developers.",
      features: [
        { icon: <CheckCircle className="text-blue-400" />, text: "Access to core AI tools" },
        { icon: <CheckCircle className="text-blue-400" />, text: "Up to 5,000 API calls/month" },
        { icon: <CheckCircle className="text-blue-400" />, text: "Basic analytics dashboard" },
      ],
      gradient: "from-purple-800/40 to-black/60",
    },

    {
      name: "Professional",
      priceMonthly: 99,
      priceYearly: 999,
      description: "Best for growing products & business-level workloads.",
      features: [
        { icon: <Sparkles className="text-purple-400" />, text: "Unlimited API calls" },
        { icon: <Sparkles className="text-purple-400" />, text: "Priority support" },
        { icon: <Sparkles className="text-purple-400" />, text: "Advanced reporting suite" },
      ],
      gradient: "from-indigo-700/40 to-black/60",
    },

    {
      name: "Enterprise",
      priceMonthly: 299,
      priceYearly: 2999,
      description: "Enterprise-grade security, support, and performance.",
      features: [
        { icon: <ShieldCheck className="text-green-400" />, text: "Dedicated account manager" },
        { icon: <ShieldCheck className="text-green-400" />, text: "Enterprise-grade security" },
        { icon: <ShieldCheck className="text-green-400" />, text: "Custom AI models & training" },
      ],
      gradient: "from-green-700/40 to-black/60",
    },
  ],
};