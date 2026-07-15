import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ui/Toast";

export const CosmicNavbar: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile navigation on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile navigation on window resize to desktop layout
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsOpen(false);
    const href = e.currentTarget.getAttribute("href");
    if (href && href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handlePlaceholder = (type: "signin") => {
    setIsOpen(false);
    showToast(
      "Authentication",
      "Sign in and account creation will be added in a later phase.",
      "info"
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-4 sm:px-8 w-full flex flex-col items-center">
      <div className="max-w-[1280px] w-full flex items-center justify-between pointer-events-none">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-blue-accent/20 border border-blue-accent/50 flex items-center justify-center shadow-[0_0_15px_rgba(49,92,255,0.4)]">
            {/* Glowing Cosmic Ring Orbit Icon */}
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              className="text-blue-bright"
              aria-hidden="true" 
              focusable="false"
            >
              <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-bright/40" />
              <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(-30 12 12)" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-primary-text leading-tight tracking-tight">PDF Space</span>
            <span className="text-[10px] text-muted-text font-medium tracking-wide">Smart PDF Workspace</span>
          </div>
        </div>

        {/* Center: Links (Restrained 2xl Rounded panel) */}
        <div className="hidden md:flex items-center gap-1 bg-panel-bg/95 backdrop-blur-md border border-border-main rounded-2xl p-1 shadow-xl pointer-events-auto">
          <a 
            href="#product" 
            onClick={handleLink} 
            className="text-[12.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-2 rounded-xl transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Product
          </a>
          <a 
            href="#smart-restore" 
            onClick={handleLink} 
            className="text-[12.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-2 rounded-xl transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/></svg>
            Smart Restore
          </a>
          <a 
            href="#privacy" 
            onClick={handleLink} 
            className="text-[12.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-2 rounded-xl transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Privacy
          </a>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => handlePlaceholder("signin")}
            className="hidden sm:block text-[13px] font-semibold text-secondary-text hover:text-primary-text transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate("/workspace")}
            className="rounded-xl bg-blue-accent px-4 py-2.5 text-[13px] font-bold text-white hover:bg-blue-bright transition-all shadow-[0_4px_15px_rgba(49,92,255,0.3)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
          >
            Open Workspace
          </button>

          {/* Mobile Menu Button Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav-menu"
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl border border-white/10 bg-white/5 text-secondary-text hover:text-primary-text transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
          >
            {isOpen ? (
              <X className="w-5 h-5" aria-hidden="true" focusable="false" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" focusable="false" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-nav-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-[1280px] bg-panel-bg/95 backdrop-blur-md border border-border-main rounded-2xl p-3 shadow-2xl flex flex-col gap-1 z-50 pointer-events-auto md:hidden mt-3"
          >
            <a 
              href="#product" 
              onClick={handleLink} 
              className="text-[13.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-3 rounded-xl transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              Product
            </a>
            <a 
              href="#smart-restore" 
              onClick={handleLink} 
              className="text-[13.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-3 rounded-xl transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/></svg>
              Smart Restore
            </a>
            <a 
              href="#privacy" 
              onClick={handleLink} 
              className="text-[13.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-3 rounded-xl transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Privacy
            </a>
            <hr className="border-white/5 my-1" />
            <button 
              onClick={() => handlePlaceholder("signin")}
              className="text-[13.5px] font-semibold text-secondary-text hover:text-primary-text hover:bg-white/5 px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright w-full cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Sign In
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
