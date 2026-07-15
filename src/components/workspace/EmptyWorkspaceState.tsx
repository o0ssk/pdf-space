import React from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, ArrowLeft, Cpu, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useToast } from "../ui/Toast";

type EmptyWorkspaceProps = {
  onBackToHome?: () => void;
  onAddPDFs?: () => void;
};

export const EmptyWorkspaceState: React.FC<EmptyWorkspaceProps> = ({
  onBackToHome,
  onAddPDFs,
}) => {
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const handleAddPDFs = () => {
    if (onAddPDFs) {
      onAddPDFs();
    } else {
      showToast(
        "PDF import",
        "PDF file import is currently unavailable.",
        "info"
      );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-lg w-full flex flex-col items-center justify-center p-6 sm:p-8 text-center select-none relative z-10"
    >
      {/* Decorative High-Fidelity Visual (Pages Outline & Orbital Guide Line) */}
      <motion.div 
        variants={itemVariants}
        aria-hidden="true"
        className="w-full max-w-[340px] h-[190px] relative flex items-center justify-center mb-7 overflow-visible"
      >
        {/* Faint Background Oval Orbital Line */}
        <div className="absolute w-[420px] h-[110px] rounded-full border border-blue-bright/15 rotate-[-15deg] pointer-events-none" />
        
        {/* Ambient Center Glow */}
        <div className="absolute w-28 h-28 bg-blue-accent/20 blur-3xl rounded-full" />

        {/* Local Processing Micro Badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-panel-elevated/90 shadow-lg">
          <Cpu className="w-3.5 h-3.5 text-blue-bright animate-pulse" />
          <span className="text-[10px] font-bold text-primary-text uppercase tracking-wider">Local Client Engine</span>
        </div>

        {/* Page / Document Silhouette Outlines with Restrained Electric Edge Lighting */}
        <div className="flex gap-5 relative mt-6">
          {/* Mock Document Outline 1 */}
          <div className="w-[74px] h-[96px] rounded-lg border border-white/15 bg-panel-bg flex items-center justify-center relative shadow-[0_12px_24px_rgba(0,0,0,0.5)] rotate-[-6deg] transition-transform hover:rotate-0 duration-300">
            <div className="absolute top-0 right-0 w-3 h-3 border-b border-l border-white/15 bg-panel-elevated/50 rounded-bl-sm" />
            <FileText className="w-6 h-6 text-muted-text/55" />
            <span className="absolute bottom-1 right-2 text-[9px] font-bold text-muted-text/45">P.1</span>
          </div>

          {/* Mock Document Outline 2 (Active/Center) */}
          <div className="w-[80px] h-[104px] rounded-lg border-2 border-blue-bright bg-blue-accent/10 flex items-center justify-center relative shadow-[0_14px_30px_rgba(49,92,255,0.25)] z-10 transition-transform hover:scale-105 duration-300">
            <div className="absolute inset-0 rounded-lg border border-blue-bright/20 animate-pulse pointer-events-none" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-b-2 border-l-2 border-blue-bright bg-panel-elevated rounded-bl-sm" />
            <FileText className="w-7 h-7 text-blue-bright" />
            <span className="absolute bottom-1 right-2 text-[9px] font-extrabold text-blue-bright">P.2</span>
          </div>

          {/* Mock Document Outline 3 */}
          <div className="w-[74px] h-[96px] rounded-lg border border-white/15 bg-panel-bg flex items-center justify-center relative shadow-[0_12px_24px_rgba(0,0,0,0.5)] rotate-[6deg] transition-transform hover:rotate-0 duration-300">
            <div className="absolute top-0 right-0 w-3 h-3 border-b border-l border-white/15 bg-panel-elevated/50 rounded-bl-sm" />
            <FileText className="w-6 h-6 text-muted-text/55" />
            <span className="absolute bottom-1 right-2 text-[9px] font-bold text-muted-text/45">P.3</span>
          </div>
        </div>
      </motion.div>

      {/* Typography */}
      <motion.h1 
        variants={itemVariants}
        className="text-[19px] sm:text-[21px] font-extrabold text-primary-text tracking-tight mb-2.5"
      >
        Start your PDF workspace
      </motion.h1>

      <motion.p 
        variants={itemVariants}
        className="text-[12.5px] sm:text-[13px] text-secondary-text leading-relaxed max-w-sm mb-7"
      >
        Add PDF documents to organize files and pages visually in one workspace.
      </motion.p>

      {/* Button controls */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto"
      >
        {/* Primary action */}
        <button
          onClick={handleAddPDFs}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-accent border border-blue-bright/20 px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_15px_rgba(49,92,255,0.25)] hover:bg-blue-bright hover:shadow-[0_4px_20px_rgba(49,92,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          Add PDFs
        </button>

        {/* Secondary action */}
        {onBackToHome ? (
          <button
            onClick={onBackToHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 px-6 py-3 text-[13px] font-bold text-secondary-text hover:text-primary-text transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to home
          </button>
        ) : (
          <Link
            to="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 px-6 py-3 text-[13px] font-bold text-secondary-text hover:text-primary-text transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to home
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
};
