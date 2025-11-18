import gsap from "gsap";
import React, { useRef } from "react";
import { ChevronRight } from "lucide-react";

const GradientButton = ({ text }) => {
  const iconRef = useRef(null);
  const buttonRef = useRef(null);

  const handleEnter = () => {
    gsap.to(iconRef.current, { rotate: 180, duration: 0.5, ease: "power3.out" });
    gsap.to(buttonRef.current, {
      backgroundPosition: "0% 0%", // reveal full gradient
      duration: 0.8,
      backgroundColor: "linear-gradient(to right, #6366f1, #a855f7, #3b82f6)",
      ease: "power3.out",
    });
  };

  const handleLeave = () => {
    gsap.to(iconRef.current, { rotate: 0, duration: 0.5, ease: "power3.out" });
    gsap.to(buttonRef.current, {
      backgroundPosition: "100% 0%", // hide gradient
      
      duration: 0.8,
      ease: "power3.inOut",
    });
  };

  return (
    <button
      ref={buttonRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="
        w-48 
        rounded-full 
        flex items-center gap-3 py-0.5 px-0.5
        text-white font-medium shadow-xl
        transition-all duration-300
        bg-black
        cursor-pointer
      "
      style={{
        backgroundImage: "linear-gradient(to right, #6366f1, #a855f7, #3b82f6)",
        backgroundSize: "200% 100%",
        backgroundPosition: "100% 0%",
      }}
    >
      
      {/* Icon */}
      <span
        ref={iconRef}
        className="
          w-12 h-12 bg-white rounded-full 
          text-black flex items-center justify-center
        "
      >
        <ChevronRight size={38} />
      </span>

      {text}
    </button>
  );
};

export default GradientButton;
