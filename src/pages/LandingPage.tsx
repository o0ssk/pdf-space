import React from "react";
import { CosmicNavbar } from "../components/landing/CosmicNavbar";
import { HeroContent } from "../components/landing/HeroContent";
import { CosmicPortal } from "../components/landing/CosmicPortal";
import { WorkspaceMockup } from "../components/landing/WorkspaceMockup";
import { LowerPanel } from "../components/landing/LowerPanel";
import { FinalCtaPanel } from "../components/landing/FinalCtaPanel";
import { Footer } from "../components/landing/Footer";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-main-bg text-primary-text flex flex-col font-sans overflow-x-hidden selection:bg-blue-accent/30 relative">
      <CosmicNavbar />
      
      <main className="flex-grow flex flex-col relative w-full pt-16">
        
        {/* ========================================================
            HERO SCENE: Single controlled cinematic scene (Height: clamp(600px, 72vh, 720px))
           ======================================================== */}
        <section className="relative w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 pt-8 lg:pt-14 pb-8 lg:pb-16 h-auto lg:h-[clamp(600px,72vh,720px)] flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-0 overflow-visible z-10">
          
          {/* Background depth layers */}
          <div className="absolute inset-0 z-0 bg-[#02040A] pointer-events-none" />
          
          {/* Subtle reflection under the workspace */}
          <div className="absolute right-0 bottom-10 w-[450px] h-[250px] bg-blue-accent/5 rounded-full blur-[80px] pointer-events-none z-0" />

          {/* ZONE 1: Left content (headline area) */}
          <div className="w-full lg:w-[34%] xl:w-[32%] flex-shrink-0 relative z-20">
            <HeroContent />
          </div>

          {/* ZONE 2: Spacious Connecting Cosmic Background Field */}
          {/* Absolute centered placement at 54% horizontal / 48% vertical on desktop */}
          <div className="absolute left-[50%] lg:left-[54%] top-[62%] lg:top-[48%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] lg:w-[560px] lg:h-[560px] xl:w-[600px] xl:h-[600px] pointer-events-none z-10 overflow-visible">
            
            {/* Concentrated stars around the cosmic field only */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-visible">
              <div className="absolute top-[10%] left-[20%] w-[1.5px] h-[1.5px] bg-white rounded-full opacity-60" />
              <div className="absolute top-[30%] left-[85%] w-[2px] h-[2px] bg-blue-bright rounded-full opacity-80 animate-pulse" />
              <div className="absolute top-[75%] left-[10%] w-[1px] h-[1px] bg-white rounded-full opacity-50" />
              <div className="absolute top-[85%] left-[65%] w-[1.5px] h-[1.5px] bg-white rounded-full opacity-65" />
              <div className="absolute top-[45%] left-[92%] w-[1px] h-[1px] bg-white rounded-full opacity-70" />
            </div>

            <CosmicPortal />
          </div>

          {/* ZONE 3: Right Workspace Mockup (Significantly enlarged and integrated leftwards) */}
          <div className="w-full lg:w-[58%] xl:w-[56%] h-auto lg:h-full relative flex items-center justify-center lg:justify-end overflow-visible z-20 lg:-ml-12 xl:-ml-16">
            <WorkspaceMockup />
          </div>

          {/* Curved Planetary Horizon Glow at the very bottom of the Hero Scene */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-1px] w-[180%] h-[110px] bg-[radial-gradient(ellipse_at_top,rgba(49,92,255,0.08)_0%,rgba(0,0,0,0)_70%)] border-t border-blue-accent/10 rounded-[100%] pointer-events-none z-10 scale-x-110" />

        </section>

        {/* ========================================================
            LOWER PANELS: Positioned immediately following the hero
           ======================================================== */}
        <div className="relative z-20 bg-main-bg">
          {/* Lower Unified Panel (Chaos to Clarity & Smart Restore) */}
          <LowerPanel />

          {/* Final Bottom CTA & Local-First Guard Panel */}
          <FinalCtaPanel />
        </div>

      </main>
      <Footer />
    </div>
  );
};
