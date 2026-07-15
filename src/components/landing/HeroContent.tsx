import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Play, Shield, Lock, RefreshCcw } from "lucide-react";
import { useToast } from "../ui/Toast";

export const HeroContent: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleAction = (msg: string) => {
    showToast(msg, "Will be added in the next phase.", "info");
  };

  const scrollToSteps = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector("#product")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col items-start text-left max-w-[480px] lg:max-w-[520px] relative z-20 py-4 lg:py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2 text-[12px] font-bold tracking-widest text-muted-text uppercase mb-5">
          <div className="w-4 h-[1px] bg-muted-text/50" />
          SMART PDF WORKSPACE
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="text-[46px] sm:text-[56px] lg:text-[66px] font-extrabold tracking-tight leading-[1.05] mb-5"
      >
        <span className="block text-primary-text">Your PDFs.</span>
        <span className="block text-primary-text">Organized.</span>
        <span className="block cosmic-text-gradient">Restorable.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="text-[16px] sm:text-[18px] text-secondary-text leading-relaxed max-w-[440px] mb-8"
      >
        The first workspace that treats your PDFs <br className="hidden sm:block" />
        like a project — not just files.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-6"
      >
        <button
          onClick={() => navigate("/workspace")}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-accent px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(49,92,255,0.4)] hover:bg-blue-bright hover:-translate-y-0.5 active:scale-95 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          Open PDF Space
          <ArrowRight className="w-4 h-4 flex-shrink-0" />
        </button>
        
        <a
          href="#product"
          onClick={scrollToSteps}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-panel-bg border border-border-main px-7 py-3.5 text-[15px] font-semibold text-primary-text hover:bg-white/5 transition-all group whitespace-nowrap"
        >
          See How It Works
          <div className="w-5 h-5 rounded-full border border-primary-text/30 flex items-center justify-center group-hover:border-primary-text/60 transition-colors">
            <Play className="w-2.5 h-2.5 fill-primary-text/50 group-hover:fill-primary-text ml-0.5 transition-colors" />
          </div>
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-muted-text font-medium"
      >
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-secondary-text" />
          Local-first
        </div>
        <div className="w-1 h-1 rounded-full bg-border-strong" />
        <div className="flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-secondary-text" />
          Private
        </div>
        <div className="w-1 h-1 rounded-full bg-border-strong" />
        <div className="flex items-center gap-1.5">
          <RefreshCcw className="w-4 h-4 text-secondary-text" />
          Smart Restore
        </div>
      </motion.div>
    </div>
  );
};
