import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowDown, Check, FileText, RefreshCw, Layers, Sparkles } from "lucide-react";

export const LowerPanel: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // Animation variants for Left Side Process Steps (triggered once when scrolled into view)
  const leftContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const leftStepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  // Step 1 Visual: Documents Enter
  const doc1Variants = {
    hidden: { opacity: 0, x: -16, y: 12, rotate: -6 },
    visible: {
      opacity: 1,
      x: -12,
      y: 4,
      rotate: -4,
      transition: { duration: 0.5, delay: 0.2, ease: "easeOut" },
    },
  };
  const doc2Variants = {
    hidden: { opacity: 0, x: 16, y: 16, rotate: 8 },
    visible: {
      opacity: 1,
      x: 12,
      y: 8,
      rotate: 6,
      transition: { duration: 0.5, delay: 0.4, ease: "easeOut" },
    },
  };
  const doc3Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      x: 0,
      y: -4,
      rotate: 0,
      transition: { duration: 0.5, delay: 0.6, ease: "easeOut" },
    },
  };

  // Step 2 Visual: Pages Organize
  const p1Var = {
    hidden: { opacity: 0, x: -12, y: -8, rotate: -15 },
    visible: { opacity: 1, x: 0, y: 0, rotate: 0, transition: { duration: 0.5, delay: 0.8, ease: "backOut" } },
  };
  const p2Var = {
    hidden: { opacity: 0, x: 12, y: -6, rotate: 18 },
    visible: { opacity: 1, x: 0, y: 0, rotate: 0, transition: { duration: 0.5, delay: 0.9, ease: "backOut" } },
  };
  const p3Var = {
    hidden: { opacity: 0, x: -8, y: 10, rotate: 8 },
    visible: { opacity: 1, x: 0, y: 0, rotate: 0, transition: { duration: 0.5, delay: 1.0, ease: "backOut" } },
  };
  const p4Var = {
    hidden: { opacity: 0, x: 10, y: 8, rotate: -10 },
    visible: { opacity: 1, x: 0, y: 0, rotate: 0, transition: { duration: 0.5, delay: 1.1, ease: "backOut" } },
  };

  // Step 3 Visual: Compress into Smart PDF
  const floatPage1 = {
    hidden: { opacity: 0, y: -15, scale: 0.7 },
    visible: {
      opacity: [0, 1, 0],
      y: [-15, 12],
      scale: [0.7, 0.7, 0.4],
      transition: { duration: 1.2, repeat: 0, ease: "easeInOut", delay: 1.2 },
    },
  };
  const floatPage2 = {
    hidden: { opacity: 0, y: -15, scale: 0.7 },
    visible: {
      opacity: [0, 1, 0],
      y: [-15, 12],
      scale: [0.7, 0.7, 0.4],
      transition: { duration: 1.2, repeat: 0, ease: "easeInOut", delay: 1.4 },
    },
  };
  const finalPdfVar = {
    hidden: { opacity: 0, scale: 0.8, boxShadow: "0 0 0px rgba(49,92,255,0)" },
    visible: {
      opacity: 1,
      scale: 1,
      boxShadow: "0 0 15px rgba(49, 92, 255, 0.3)",
      transition: { duration: 0.5, delay: 1.6, ease: "backOut" },
    },
  };


  // Animation variants for Right Side Smart Restore Flow
  const rightContainerVariants = {
    hidden: {},
    visible: {},
  };

  const rightWorkspaceVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.4, ease: "easeOut" } },
  };

  const rightFlowLine1 = {
    hidden: { strokeDashoffset: 40, opacity: 0 },
    visible: { strokeDashoffset: 0, opacity: 1, transition: { duration: 0.7, delay: 1.0, ease: "easeInOut" } },
  };

  const rightSmartPdfVariants = {
    hidden: { opacity: 0, scale: 0.7, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.5, delay: 1.6, ease: "backOut" },
    },
  };

  const rightLabel1 = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 1.9 } } };
  const rightLabel2 = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 2.0 } } };
  const rightLabel3 = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 2.1 } } };
  const rightLabel4 = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 2.2 } } };

  const rightFlowLine2 = {
    hidden: { strokeDashoffset: 40, opacity: 0 },
    visible: { strokeDashoffset: 0, opacity: 1, transition: { duration: 0.7, delay: 2.4, ease: "easeInOut" } },
  };

  const rightRestoredVariants = {
    hidden: { opacity: 0, x: 15 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 2.8, ease: "easeOut" } },
  };

  const rightCheckBadgeVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, delay: 3.2, ease: "backOut" } },
  };

  return (
    <section id="product" className="w-full py-16 px-4 sm:px-8 flex justify-center relative z-20 overflow-visible bg-[#02040A]">
      
      {/* Outer border & glow element matching hero exactly */}
      <div className="max-w-[1280px] w-full bg-panel-bg backdrop-blur-md border border-border-main rounded-3xl overflow-hidden flex flex-col lg:flex-row lg:divide-x divide-border-main shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative">
        
        {/* Subtle, premium blue atmospheric glow emerging from top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-blue-bright/40 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[100px] bg-blue-bright/4 rounded-full blur-[50px] pointer-events-none" />

        {/* ========================================================
            LEFT COLUMN: HOW PDF SPACE WORKS
           ======================================================== */}
        <motion.div 
          variants={leftContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex-1 p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Subtle accent backdrop */}
          <div className="absolute top-0 left-0 w-[240px] h-[240px] bg-blue-accent/3 rounded-full blur-[70px] pointer-events-none" />

          <div className="relative z-10 flex-grow flex flex-col justify-between h-full">
            <div>
              <div className="text-[11px] font-bold tracking-[0.18em] text-muted-text uppercase mb-3 flex items-center gap-2">
                <div className="w-4 h-[1.5px] bg-blue-bright/40" />
                FROM CHAOS TO CLARITY
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-extrabold text-primary-text leading-tight mb-8 sm:mb-12">
                3 simple steps.<br />Infinite control.
              </h2>
            </div>

            {/* Steps Flow (Horizontal on Desktop/Tablet, Vertical on Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative my-2">
              
              {/* Subtle connection line running behind visuals (Tablet/Desktop) */}
              <div className="absolute top-12 left-[15%] right-[15%] h-[1.5px] bg-gradient-to-r from-blue-accent/15 via-blue-bright/30 to-violet-accent/15 hidden md:block z-0" />

              {/* Step 1 */}
              <motion.div variants={leftStepVariants} className="flex flex-col items-center md:items-start text-center md:text-left relative z-10">
                {/* Visual Area */}
                <div className="w-24 h-24 rounded-2xl bg-black/45 border border-white/5 shadow-inner flex items-center justify-center relative mb-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Documents Enter Staggered Cards */}
                  {!shouldReduceMotion ? (
                    <div className="relative w-16 h-12 flex items-center justify-center">
                      <motion.div 
                        variants={doc1Variants}
                        className="absolute w-8 h-10 rounded-md border border-cyan-500/30 bg-cyan-950/45 flex flex-col justify-between p-1 shadow-md"
                      >
                        <div className="h-1 w-full bg-cyan-400/50 rounded-full" />
                        <div className="space-y-0.5">
                          <div className="h-0.5 w-5 bg-white/20 rounded-full" />
                          <div className="h-0.5 w-4 bg-white/20 rounded-full" />
                        </div>
                      </motion.div>
                      <motion.div 
                        variants={doc2Variants}
                        className="absolute w-8 h-10 rounded-md border border-emerald-500/30 bg-emerald-950/45 flex flex-col justify-between p-1 shadow-md"
                      >
                        <div className="h-1 w-full bg-emerald-400/50 rounded-full" />
                        <div className="space-y-0.5">
                          <div className="h-0.5 w-5 bg-white/20 rounded-full" />
                          <div className="h-0.5 w-4 bg-white/20 rounded-full" />
                        </div>
                      </motion.div>
                      <motion.div 
                        variants={doc3Variants}
                        className="absolute w-8 h-10 rounded-md border border-blue-accent/40 bg-blue-950/45 flex flex-col justify-between p-1 shadow-lg"
                      >
                        <div className="h-1 w-full bg-blue-bright rounded-full" />
                        <div className="space-y-0.5">
                          <div className="h-0.5 w-5 bg-white/30 rounded-full" />
                          <div className="h-0.5 w-4 bg-white/30 rounded-full" />
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="flex gap-1 relative scale-90">
                      <div className="w-7 h-9 rounded border border-white/10 bg-white/5 flex flex-col justify-between p-1 opacity-60">
                        <div className="h-0.5 w-full bg-white/20 rounded-full" />
                      </div>
                      <div className="w-7 h-9 rounded border border-blue-bright/40 bg-blue-bright/10 flex flex-col justify-between p-1">
                        <div className="h-0.5 w-full bg-blue-bright/70 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Number & Title */}
                <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                  <span className="text-[13px] font-extrabold text-blue-bright font-mono bg-blue-bright/10 border border-blue-bright/20 px-1.5 py-0.5 rounded">01</span>
                  <h3 className="text-[15px] font-bold text-primary-text">Add your documents</h3>
                </div>
                <p className="text-[12.5px] text-secondary-text leading-relaxed max-w-[200px] md:max-w-none">
                  Bring contracts, invoices, reports, and attachments into one workspace.
                </p>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={leftStepVariants} className="flex flex-col items-center md:items-start text-center md:text-left relative z-10">
                {/* Visual Area */}
                <div className="w-24 h-24 rounded-2xl bg-black/45 border border-white/5 shadow-inner flex items-center justify-center relative mb-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Pages organize grid */}
                  {!shouldReduceMotion ? (
                    <div className="grid grid-cols-2 gap-1.5 p-2">
                      <motion.div variants={p1Var} className="w-6 h-7 rounded border border-white/15 bg-white/5 flex items-center justify-center text-[7px] font-bold text-muted-text">1</motion.div>
                      <motion.div variants={p2Var} className="w-6 h-7 rounded border border-blue-bright/30 bg-blue-bright/10 flex items-center justify-center text-[7px] font-bold text-blue-bright">2</motion.div>
                      <motion.div variants={p3Var} className="w-6 h-7 rounded border border-white/15 bg-white/5 flex items-center justify-center text-[7px] font-bold text-muted-text">3</motion.div>
                      <motion.div variants={p4Var} className="w-6 h-7 rounded border border-white/15 bg-white/5 flex items-center justify-center text-[7px] font-bold text-muted-text">4</motion.div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 scale-90">
                      <div className="w-6 h-7 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[8px]">1</div>
                      <div className="w-6 h-7 rounded border border-blue-bright/30 bg-blue-bright/10 flex items-center justify-center text-[8px] text-blue-bright">2</div>
                    </div>
                  )}
                </div>

                {/* Number & Title */}
                <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                  <span className="text-[13px] font-extrabold text-blue-bright font-mono bg-blue-bright/10 border border-blue-bright/20 px-1.5 py-0.5 rounded">02</span>
                  <h3 className="text-[15px] font-bold text-primary-text">Organize pages visually</h3>
                </div>
                <p className="text-[12.5px] text-secondary-text leading-relaxed max-w-[200px] md:max-w-none">
                  Reorder, rotate, duplicate, move, or remove pages while keeping documents grouped.
                </p>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={leftStepVariants} className="flex flex-col items-center md:items-start text-center md:text-left relative z-10">
                {/* Visual Area */}
                <div className="w-24 h-24 rounded-2xl bg-black/45 border border-white/5 shadow-inner flex items-center justify-center relative mb-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Pages compressing into Smart PDF */}
                  {!shouldReduceMotion ? (
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <motion.div variants={floatPage1} className="absolute w-4 h-5 rounded border border-white/25 bg-white/5 -top-1 left-2" />
                      <motion.div variants={floatPage2} className="absolute w-4 h-5 rounded border border-white/25 bg-white/5 -top-1 right-2" />
                      
                      <motion.div 
                        variants={finalPdfVar}
                        className="w-8 h-10 rounded-md border border-blue-accent bg-blue-accent/15 flex flex-col items-center justify-center p-1"
                      >
                        <FileText className="w-4 h-4 text-blue-bright" />
                        <span className="text-[5px] font-bold text-white mt-0.5 uppercase tracking-wider">PDF</span>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="w-8 h-10 rounded-md border border-blue-accent bg-blue-accent/15 flex flex-col items-center justify-center p-1">
                      <FileText className="w-4 h-4 text-blue-bright" />
                      <span className="text-[5px] font-bold text-white mt-0.5 uppercase tracking-wider">PDF</span>
                    </div>
                  )}
                </div>

                {/* Number & Title */}
                <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                  <span className="text-[13px] font-extrabold text-blue-bright font-mono bg-blue-bright/10 border border-blue-bright/20 px-1.5 py-0.5 rounded">03</span>
                  <h3 className="text-[15px] font-bold text-primary-text">Export and restore</h3>
                </div>
                <p className="text-[12.5px] text-secondary-text leading-relaxed max-w-[200px] md:max-w-none">
                  Export a normal PDF or create a Smart PDF that PDF Space can restore later.
                </p>
              </motion.div>

            </div>
          </div>
        </motion.div>

        {/* ========================================================
            RIGHT COLUMN: SMART RESTORE EXPLANATION
           ======================================================== */}
        <motion.div 
          id="smart-restore"
          variants={rightContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex-1 p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Subtle violet accent glow */}
          <div className="absolute bottom-0 right-0 w-[240px] h-[240px] bg-violet-accent/3 rounded-full blur-[70px] pointer-events-none" />

          <div className="relative z-10 flex-grow flex flex-col justify-between h-full">
            <div>
              <div className="text-[11px] font-bold tracking-[0.18em] text-muted-text uppercase mb-3 flex items-center gap-2">
                <div className="w-4 h-[1.5px] bg-violet-accent/40" />
                THE MAGIC IS IN THE RESTORE
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-extrabold text-primary-text leading-tight mb-8 sm:mb-12">
                A PDF that remembers<br />its workspace.
              </h2>
            </div>

            {/* Smart Restore 3-Stage Visual (Organized -> Smart PDF -> Restored) */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3 lg:gap-6 relative mt-4 mb-8">
              
              {/* Stage 1: Organized Workspace */}
              <motion.div 
                variants={shouldReduceMotion ? {} : rightWorkspaceVariants}
                className="w-full max-w-[130px] bg-panel-elevated/70 border border-border-main rounded-2xl p-3 flex flex-col gap-2 shadow-lg relative z-10"
              >
                <span className="text-[9px] font-bold text-muted-text uppercase tracking-widest text-center border-b border-white/5 pb-1 block">Workspace</span>
                
                {/* Simulated Document Groups with colors */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0891B2] flex-shrink-0" />
                    <div className="h-1.5 w-14 bg-[#0891B2]/30 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />
                    <div className="h-1.5 w-12 bg-[#16A34A]/30 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D97706] flex-shrink-0" />
                    <div className="h-1.5 w-16 bg-[#D97706]/30 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F15A5A] flex-shrink-0" />
                    <div className="h-1.5 w-10 bg-[#F15A5A]/30 rounded-full" />
                  </div>
                </div>

                {/* Micro page indicators */}
                <div className="flex gap-1 justify-center mt-1 border-t border-white/5 pt-1.5">
                  <div className="w-3 h-4 rounded-[1px] bg-white/5 border border-white/10" />
                  <div className="w-3 h-4 rounded-[1px] bg-white/5 border border-white/10" />
                  <div className="w-3 h-4 rounded-[1px] bg-white/5 border border-white/10" />
                </div>
              </motion.div>

              {/* Connecting Vector 1 */}
              <div className="flex md:hidden items-center justify-center">
                <ArrowDown className="w-4 h-4 text-border-strong" />
              </div>
              <div className="hidden md:block flex-1 max-w-[40px] lg:max-w-none">
                <svg className="w-full h-4 overflow-visible" fill="none">
                  <motion.path 
                    d="M 0,8 L 40,8" 
                    stroke="rgba(100, 135, 255, 0.4)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                    variants={shouldReduceMotion ? {} : rightFlowLine1}
                  />
                  <polygon points="36,5 42,8 36,11" fill="rgba(100, 135, 255, 0.6)" />
                </svg>
              </div>

              {/* Stage 2: Central Smart PDF Focal Point */}
              <div className="relative flex flex-col items-center py-4 md:py-0">
                <motion.div 
                  variants={shouldReduceMotion ? {} : rightSmartPdfVariants}
                  className="w-22 h-26 bg-gradient-to-b from-blue-accent/20 to-[#030611] border border-blue-accent rounded-xl flex flex-col items-center justify-center p-3 relative shadow-[0_0_20px_rgba(49,92,255,0.25)] z-10"
                >
                  <FileText className="w-6 h-6 text-blue-bright mb-1" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest font-mono">Smart PDF</span>
                  
                  {/* Small tag badge inside */}
                  <div className="absolute -bottom-2.5 px-2 py-0.5 bg-blue-accent border border-blue-bright rounded-full text-[7px] text-white font-bold uppercase tracking-wider shadow">
                    META
                  </div>
                </motion.div>

                {/* Floating Meta Labels pointing to the Smart PDF (Desktop/Tablet layout) */}
                <div className="hidden lg:block">
                  {/* Groups */}
                  <motion.div 
                    variants={shouldReduceMotion ? {} : rightLabel1}
                    className="absolute -top-6 -left-12 px-1.5 py-0.5 bg-black/75 border border-white/10 rounded text-[8px] text-secondary-text flex items-center gap-1 font-medium font-mono"
                  >
                    <div className="w-1 h-1 rounded-full bg-blue-bright" />
                    <span>Groups</span>
                  </motion.div>
                  
                  {/* Page Order */}
                  <motion.div 
                    variants={shouldReduceMotion ? {} : rightLabel2}
                    className="absolute -top-6 -right-12 px-1.5 py-0.5 bg-black/75 border border-white/10 rounded text-[8px] text-secondary-text flex items-center gap-1 font-medium font-mono"
                  >
                    <div className="w-1 h-1 rounded-full bg-blue-bright" />
                    <span>Order</span>
                  </motion.div>

                  {/* Rotations */}
                  <motion.div 
                    variants={shouldReduceMotion ? {} : rightLabel3}
                    className="absolute -bottom-6 -left-12 px-1.5 py-0.5 bg-black/75 border border-white/10 rounded text-[8px] text-secondary-text flex items-center gap-1 font-medium font-mono"
                  >
                    <div className="w-1 h-1 rounded-full bg-blue-bright" />
                    <span>Rotations</span>
                  </motion.div>

                  {/* Duplicates */}
                  <motion.div 
                    variants={shouldReduceMotion ? {} : rightLabel4}
                    className="absolute -bottom-6 -right-12 px-1.5 py-0.5 bg-black/75 border border-white/10 rounded text-[8px] text-secondary-text flex items-center gap-1 font-medium font-mono"
                  >
                    <div className="w-1 h-1 rounded-full bg-blue-bright" />
                    <span>Duplicates</span>
                  </motion.div>
                </div>
              </div>

              {/* Connecting Vector 2 */}
              <div className="flex md:hidden items-center justify-center">
                <ArrowDown className="w-4 h-4 text-border-strong" />
              </div>
              <div className="hidden md:block flex-1 max-w-[40px] lg:max-w-none">
                <svg className="w-full h-4 overflow-visible" fill="none">
                  <motion.path 
                    d="M 0,8 L 40,8" 
                    stroke="rgba(100, 135, 255, 0.4)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                    variants={shouldReduceMotion ? {} : rightFlowLine2}
                  />
                  <polygon points="36,5 42,8 36,11" fill="rgba(100, 135, 255, 0.6)" />
                </svg>
              </div>

              {/* Stage 3: Structure Restored with Checkmark pop */}
              <motion.div 
                variants={shouldReduceMotion ? {} : rightRestoredVariants}
                className="w-full max-w-[130px] bg-panel-elevated/70 border border-success-green/30 rounded-2xl p-3 flex flex-col gap-2 shadow-[0_0_20px_rgba(67,211,158,0.12)] relative z-10"
              >
                {/* Pop Confirmation checkmark at top right corner */}
                <motion.div 
                  variants={shouldReduceMotion ? {} : rightCheckBadgeVariants}
                  className="absolute -top-2 -right-2 w-5.5 h-5.5 rounded-full bg-success-green flex items-center justify-center shadow-lg shadow-success-green/20 z-20"
                >
                  <Check className="w-3.5 h-3.5 text-black" strokeWidth={4} />
                </motion.div>

                <span className="text-[9px] font-bold text-success-green uppercase tracking-widest text-center border-b border-success-green/15 pb-1 block">Restored</span>
                
                {/* Restored Document Groups */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0891B2] flex-shrink-0" />
                    <div className="h-1.5 w-14 bg-[#0891B2]/50 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />
                    <div className="h-1.5 w-12 bg-[#16A34A]/50 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D97706] flex-shrink-0" />
                    <div className="h-1.5 w-16 bg-[#D97706]/50 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F15A5A] flex-shrink-0" />
                    <div className="h-1.5 w-10 bg-[#F15A5A]/50 rounded-full" />
                  </div>
                </div>

                {/* Restored confirmation indicator */}
                <div className="flex items-center gap-1 justify-center mt-1 border-t border-success-green/10 pt-1.5 text-[8px] font-bold text-success-green font-mono">
                  <span>GROUPS INTACT</span>
                </div>
              </motion.div>

            </div>

            {/* Smart Restore Benefit List (Clean single grid row, not individual cards) */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 border-t border-border-main pt-6 mt-4">
              <div className="flex items-center gap-2.5 text-[12.5px] text-secondary-text">
                <div className="w-5 h-5 rounded-md bg-success-green/10 border border-success-green/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-success-green" strokeWidth={3} />
                </div>
                <span className="font-medium">Restores document groups</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12.5px] text-secondary-text">
                <div className="w-5 h-5 rounded-md bg-success-green/10 border border-success-green/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-success-green" strokeWidth={3} />
                </div>
                <span className="font-medium">Remembers page order</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12.5px] text-secondary-text">
                <div className="w-5 h-5 rounded-md bg-success-green/10 border border-success-green/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-success-green" strokeWidth={3} />
                </div>
                <span className="font-medium">Preserves rotations</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12.5px] text-secondary-text">
                <div className="w-5 h-5 rounded-md bg-success-green/10 border border-success-green/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-success-green" strokeWidth={3} />
                </div>
                <span className="font-medium">Tracks duplicates</span>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};
