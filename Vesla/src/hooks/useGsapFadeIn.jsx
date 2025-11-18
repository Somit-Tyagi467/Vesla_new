import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function useGsapFadeIn(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        ...options,
      }
    );
  }, []);

  return ref;
}
