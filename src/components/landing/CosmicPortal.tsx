import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";

export const CosmicPortal: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible pointer-events-none">
      
      {/* 1. Background radial soft glows (atmospheric depth) */}
      <div className="absolute w-[140%] h-[140%] bg-blue-accent/8 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute w-[120%] h-[120%] bg-violet-accent/6 rounded-full blur-[110px] pointer-events-none mix-blend-screen" />

      {/* 2. Rotated Large Elongated Oval Orbital Field (z-index: 1 and 2) */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: isDesktop 
            ? "clamp(700px, 60vw, 980px)" 
            : "clamp(280px, 75vw, 500px)",
          height: isDesktop 
            ? "clamp(360px, 34vw, 560px)" 
            : "clamp(160px, 42vw, 280px)",
          transform: "rotate(-13deg)",
          left: "50%",
          top: "50%",
          transformOrigin: "center",
          translate: "-50% -50%",
        }}
      >
        <svg 
          className="w-full h-full overflow-visible select-none pointer-events-none" 
          viewBox="0 0 800 400" 
          preserveAspectRatio="none"
        >
          <defs>
            {/* Soft background radial atmospheric backdrop inside the oval */}
            <radialGradient id="portal-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#050a1b" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#0a1332" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#02040a" stopOpacity="0" />
            </radialGradient>

            {/* Gradient for the main elegant oval */}
            <linearGradient id="oval-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#315CFF" />
              <stop offset="30%" stopColor="#7B4DFF" />
              <stop offset="70%" stopColor="#315CFF" />
              <stop offset="100%" stopColor="#7B4DFF" />
            </linearGradient>

            {/* Gradient for the glow of the oval */}
            <linearGradient id="oval-glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#315CFF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7B4DFF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#315CFF" stopOpacity="0.8" />
            </linearGradient>

            {/* Gaussian Blur Filter for the glow behind the sharp line */}
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* Spacious radial atmospheric backdrop */}
          <ellipse cx="400" cy="200" rx="380" ry="180" fill="url(#portal-gradient)" />

          {/* BACKGROUND OVAL GLOW (Layer 1) */}
          <motion.path
            d="M 400, 20 A 380, 180 0 1, 1 399.9, 20 Z"
            stroke="url(#oval-glow-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.45"
            strokeDasharray="400 120 100 80 300 100"
            filter="url(#glow-filter)"
            animate={shouldReduceMotion ? {} : {
              strokeDashoffset: [0, 1100]
            }}
            transition={{
              duration: 120,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ vectorEffect: "non-scaling-stroke" }}
          />

          {/* SHARP OVAL LINE (Layer 2) */}
          <motion.path
            d="M 400, 20 A 380, 180 0 1, 1 399.9, 20 Z"
            stroke="url(#oval-gradient)"
            strokeWidth="1.25"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
            strokeDasharray="400 120 100 80 300 100"
            animate={shouldReduceMotion ? {} : {
              strokeDashoffset: [0, 1100]
            }}
            transition={{
              duration: 120,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ vectorEffect: "non-scaling-stroke" }}
          />

          {/* SECONDARY FAINT OFFSET PATH */}
          <motion.path
            d="M 400, 40 A 360, 160 0 1, 1 399.9, 40 Z"
            stroke="url(#oval-gradient)"
            strokeWidth="0.75"
            strokeLinecap="round"
            fill="none"
            opacity="0.25"
            strokeDasharray="150 100 250 150 100 120"
            animate={shouldReduceMotion ? {} : {
              strokeDashoffset: [0, -1100]
            }}
            transition={{
              duration: 160,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ vectorEffect: "non-scaling-stroke" }}
          />

          {/* SMALL PARTICLES FOLLOWING PARTS OF OVAL (Layer 3) */}
          {!shouldReduceMotion && (
            <g>
              {/* Particle 1 */}
              <circle r="2.2" fill="#F8FAFF" className="shadow-[0_0_8px_rgba(255,255,255,1)]">
                <animateMotion 
                  path="M 400, 20 A 380, 180 0 1, 1 399.9, 20 Z" 
                  dur="35s" 
                  repeatCount="indefinite" 
                />
              </circle>
              {/* Particle 2 */}
              <circle r="1.8" fill="#7B4DFF" opacity="0.8">
                <animateMotion 
                  path="M 400, 20 A 380, 180 0 1, 1 399.9, 20 Z" 
                  dur="50s" 
                  begin="8s"
                  repeatCount="indefinite" 
                />
              </circle>
              {/* Particle 3 (inner path) */}
              <circle r="1.8" fill="#4E7BFF" opacity="0.8">
                <animateMotion 
                  path="M 400, 40 A 360, 160 0 1, 1 399.9, 40 Z" 
                  dur="40s" 
                  begin="4s"
                  repeatCount="indefinite" 
                />
              </circle>
            </g>
          )}
        </svg>

        {/* Soft centered bloom/glow inside the oval - spacious and open */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-blue-bright/8 blur-2xl pointer-events-none" />
      </div>

    </div>
  );
};
