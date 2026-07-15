import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, FileText, Check, Sparkles, Info } from "lucide-react";
import { useToast } from "../ui/Toast";

export const FinalCtaPanel: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const handleAction = () => {
    navigate("/workspace");
  };

  const handleScroll = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector("#smart-restore")?.scrollIntoView({ behavior: "smooth" });
  };

  // Staggered entering transitions triggered once when section is scrolled into view
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const bgGlowVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 1.2, delay: 0.6 },
    },
  };

  const pdfVisualVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.4, ease: "easeOut" },
    },
  };

  const lineVariants1 = {
    hidden: { opacity: 0, x: -10, scaleX: 0.3 },
    visible: { opacity: 0.45, x: 0, scaleX: 1, transition: { duration: 0.7, delay: 0.8, ease: "easeOut" } }
  };
  const lineVariants2 = {
    hidden: { opacity: 0, x: -15, scaleX: 0.3 },
    visible: { opacity: 0.4, x: 0, scaleX: 1, transition: { duration: 0.7, delay: 0.9, ease: "easeOut" } }
  };
  const lineVariants3 = {
    hidden: { opacity: 0, x: -20, scaleX: 0.3 },
    visible: { opacity: 0.35, x: 0, scaleX: 1, transition: { duration: 0.7, delay: 1.0, ease: "easeOut" } }
  };

  return (
    <section className="w-full pb-16 px-4 sm:px-8 flex justify-center relative z-20 overflow-visible bg-[#02040A]">
      
      {/* Shared Outer Panel matching the LowerPanel sizing */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-[1280px] w-full bg-panel-bg backdrop-blur-md border border-border-main rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45)] relative p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14"
      >
        {/* Subtle upper blue glow edge of the panel to transition beautifully from LowerPanel */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1.5px] bg-gradient-to-r from-transparent via-blue-bright/35 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[70px] bg-blue-bright/4 rounded-full blur-[45px] pointer-events-none" />

        {/* Left column: Text Content and Action Buttons */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
          
          <motion.div 
            variants={itemVariants}
            className="text-[11px] font-bold tracking-[0.18em] text-muted-text uppercase mb-4 flex items-center gap-2"
          >
            <div className="w-4 h-[1.5px] bg-blue-bright/40" />
            YOUR WORKSPACE, INSIDE THE PDF
          </motion.div>

          <motion.h2 
            variants={itemVariants}
            className="text-[28px] sm:text-[38px] font-extrabold text-primary-text leading-tight tracking-tight mb-4"
          >
            Organize once.<br className="hidden sm:block" />
            Continue whenever you need.
          </motion.h2>

          <motion.p 
            variants={itemVariants}
            className="text-[14px] sm:text-[15.5px] text-secondary-text leading-relaxed max-w-xl mb-8 text-center lg:text-left"
          >
            Build a structured PDF workspace, export it as a Smart PDF, and restore the same project later.
          </motion.p>

          {/* Action Buttons Row */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button
              id="cta-open-pdf-space"
              onClick={handleAction}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-accent border border-blue-bright/20 px-7 py-4 text-[14.5px] font-semibold text-white shadow-[0_4px_22px_rgba(49,92,255,0.25)] hover:bg-blue-bright hover:shadow-[0_4px_28px_rgba(49,92,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              Open PDF Space
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
            
            <a
              id="cta-explore-smart-restore"
              href="#smart-restore"
              onClick={handleScroll}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-transparent border border-white/10 px-7 py-4 text-[14.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              Explore Smart Restore
            </a>
          </motion.div>

          {/* Local First Supporting Note */}
          <motion.p 
            id="privacy"
            variants={itemVariants}
            className="scroll-mt-24 text-[11.5px] text-muted-text font-medium mt-8 max-w-lg leading-relaxed flex items-start gap-2 text-center lg:text-left justify-center lg:justify-start"
          >
            <Info className="w-4 h-4 text-blue-bright/60 mt-0.5 flex-shrink-0" aria-hidden="true" focusable="false" />
            <span>Core PDF organization and export workflows are designed to run locally in your browser by default.</span>
          </motion.p>

        </div>

        {/* Right column: Compact, high-fidelity Smart PDF visual */}
        <div className="flex-1 w-full max-w-[340px] lg:max-w-[380px] flex items-center justify-center">
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-black/45 border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl group">
            
            {/* Ambient blue glowing gradient backdrop behind document */}
            <motion.div 
              variants={bgGlowVariants}
              className="absolute w-44 h-44 bg-blue-bright/10 rounded-full blur-[40px] pointer-events-none" 
            />
            
            {/* Background connection lines representing metadata structure (document group lines) */}
            <div className="absolute inset-0 flex flex-col justify-center gap-4 px-8 pointer-events-none">
              <motion.div 
                variants={lineVariants1}
                className="h-[1px] w-full bg-gradient-to-r from-[#0891B2]/40 via-[#0891B2]/20 to-transparent relative"
              >
                <div className="absolute left-6 -top-1 w-1.5 h-1.5 rounded-full bg-[#0891B2] shadow-[0_0_6px_#0891B2]" />
              </motion.div>
              <motion.div 
                variants={lineVariants2}
                className="h-[1px] w-full bg-gradient-to-r from-[#16A34A]/40 via-[#16A34A]/20 to-transparent relative"
              >
                <div className="absolute left-12 -top-1 w-1.5 h-1.5 rounded-full bg-[#16A34A] shadow-[0_0_6px_#16A34A]" />
              </motion.div>
              <motion.div 
                variants={lineVariants3}
                className="h-[1px] w-full bg-gradient-to-r from-[#D97706]/40 via-[#D97706]/20 to-transparent relative"
              >
                <div className="absolute left-18 -top-1 w-1.5 h-1.5 rounded-full bg-[#D97706] shadow-[0_0_6px_#D97706]" />
              </motion.div>
            </div>

            {/* Subtle overlapping page layers behind the Smart PDF file card */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div 
                initial={shouldReduceMotion ? {} : { opacity: 0, x: -10, y: -8, rotate: -4 }}
                whileInView={shouldReduceMotion ? {} : { opacity: 0.16, x: -28, y: -12, rotate: -6 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute w-22 h-30 rounded-lg border border-white/25 bg-white/5 shadow-md"
              />
              <motion.div 
                initial={shouldReduceMotion ? {} : { opacity: 0, x: 10, y: 8, rotate: 4 }}
                whileInView={shouldReduceMotion ? {} : { opacity: 0.1, x: 28, y: 12, rotate: 6 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute w-22 h-30 rounded-lg border border-white/20 bg-white/5 shadow-md"
              />
            </div>

            {/* Central Smart PDF Document card */}
            <motion.div 
              variants={pdfVisualVariants}
              className="w-26 h-34 bg-[#030612]/95 border border-blue-accent rounded-xl p-3 flex flex-col justify-between shadow-2xl relative z-10 hover:border-blue-bright transition-colors duration-300"
            >
              {/* PDF Top Bar accent */}
              <div className="absolute top-0 left-0 w-full h-[3.5px] bg-blue-accent rounded-t-xl" />
              
              <div className="flex justify-between items-start mt-1">
                <FileText className="w-5.5 h-5.5 text-blue-bright" />
                <Sparkles className="w-3 h-3 text-blue-bright animate-pulse" />
              </div>

              {/* Graphic micro lines */}
              <div className="space-y-1.5 my-2">
                <div className="h-1 w-full bg-white/20 rounded-full" />
                <div className="h-0.5 w-3/4 bg-white/10 rounded-full" />
                <div className="h-0.5 w-5/6 bg-white/10 rounded-full" />
              </div>

              {/* Tag metadata footer label inside the visual */}
              <div className="mt-auto border-t border-white/5 pt-1.5 flex items-center justify-between">
                <span className="text-[6px] font-bold text-muted-text uppercase tracking-widest font-mono">WORKSPACE METADATA</span>
                <Check className="w-2 h-2 text-success-green" strokeWidth={3.5} />
              </div>
            </motion.div>
            
          </div>
        </div>

      </motion.div>
    </section>
  );
};
