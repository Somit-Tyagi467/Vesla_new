import React from 'react';
import CardLoader from '../components/CardComponent/CardLoader.jsx';
import Heading from '../components/Heading.jsx';
import GradientButton from '../components/Button/GradientButton.jsx';
import bgImg from '../assets/bg.png';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { useState } from "react";
import PricingLoader from '../components/PricingLoader.jsx';
 function BillingToggle({ onChange }) {
  const [active, setActive] = useState("monthly");

  const handleClick = (type) => {
    setActive(type);
    onChange(type);
  };

  return (
    <div className="
        w-48 
        rounded-full 
        flex items-center gap-3 py-0.5 px-0.5
        text-white font-medium shadow-xl
      bg-[rgba(255,255,255,0.05)]
        backdrop-blur-xl border border-white/10
        mx-auto
    ">
      {/* Monthly Button */}
      <button
        onClick={() => handleClick("monthly")}
        className={`
          flex-1 py-2 rounded-full text-center
          transition-all duration-300 font-medium
          ${active === "monthly"
            ? "text-white bg-linear-to-r from-blue-500 to-purple-500 shadow-lg"
            : "text-gray-300"}
        `}
      >
        Monthly
      </button>

      {/* Annual Button */}
      <button
        onClick={() => handleClick("annually")}
        className={`
          flex-1 py-2 rounded-full text-center
          transition-all duration-300 font-medium
          ${active === "annually"
            ? "text-white bg-linear-to-r from-blue-500 to-purple-500 shadow-lg"
            : "text-gray-300"}
        `}
      >
        Annually
      </button>
    </div>
  );
}

const Pricing = () => { 
    const bgRef = useRef(null);

    useEffect(() => {
        const section = bgRef.current;

        const handleMouseMove = (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;  // adjust intensity
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        gsap.to(section, {
        backgroundPosition: `${50 + x}% ${50 + y}%`,
        duration: 1.2,
        ease: "power3.out",
        });
        };

        section.addEventListener("mousemove", handleMouseMove);

        return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <>  
            <section ref={bgRef} 
            className='flex flex-col justify-center items-center pb-52 pt-72 rounded-b-4xl'
            style={{
                backgroundImage: `url(${bgImg})`,
                backgroundRepeat: 'no-repeat',
            }}>

                <Heading heading="Welcome to Vesla" highlight="The Future of Water Monitoring" subtitle="Empowering healthcare with AI-driven solutions for better patient outcomes and operational efficiency." size="lg"/>
                
            </section>

            
            <section className='bg-[radial-gradient(ellipse_at_bottom,rgba(29,185,255,0.22),rgba(0,0,0,1))] py-10 pt-0 flex justify-center items-center min-h-screen '>

                <PricingLoader/>

            </section>
            <section className='py-10 flex flex-col justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(29,185,255,0.22),rgba(0,0,0,1))]'>

                <Heading heading="Frequently Asked" highlight="Questions" subtitle="Expert financial planning tailored to your unique goals and achieve financial peace of mind with our proven strategies."/>
                
            </section>
            <section></section>
            <section></section>
        </>
    );
}

export default Pricing;