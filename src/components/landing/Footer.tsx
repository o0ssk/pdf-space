import React from "react";
import { useToast } from "../ui/Toast";

export const Footer: React.FC = () => {
  const { showToast } = useToast();

  const handleLinkClick = (e: React.MouseEvent, target: string) => {
    e.preventDefault();
    if (target === "product") {
      document.querySelector("#product")?.scrollIntoView({ behavior: "smooth" });
    } else if (target === "smart-restore") {
      document.querySelector("#smart-restore")?.scrollIntoView({ behavior: "smooth" });
    } else if (target === "privacy") {
      document.querySelector("#privacy")?.scrollIntoView({ behavior: "smooth" });
      showToast("Privacy note", "Core PDF workflows are designed to run locally in your browser by default.", "info");
    } else if (target === "signin") {
      showToast("Authentication", "Sign in and account creation will be added in a later phase.", "info");
    }
  };

  return (
    <footer className="w-full bg-[#02040A] py-10 px-6 sm:px-10 lg:px-14 flex justify-center border-t border-border-main/40 relative z-20">
      <div className="max-w-[1280px] w-full flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
        
        {/* Left Side: Brand and short description */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4.5 h-4.5 rounded bg-blue-accent border border-blue-bright/20 flex items-center justify-center">
              <span className="text-[9px] font-black text-white font-mono">P</span>
            </div>
            <span className="text-[13.5px] font-bold text-primary-text tracking-wide">PDF Space</span>
          </div>
          <p className="text-[12px] text-muted-text max-w-sm leading-relaxed">
            A visual workspace for organizing, exporting, and restoring PDF projects.
          </p>
        </div>

        {/* Center/Navigation links */}
        <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[12px] font-medium text-secondary-text" aria-label="Footer Navigation">
          <a
            id="footer-link-product"
            href="#product"
            onClick={(e) => handleLinkClick(e, "product")}
            className="hover:text-blue-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded px-1"
          >
            Product
          </a>
          <a
            id="footer-link-smart-restore"
            href="#smart-restore"
            onClick={(e) => handleLinkClick(e, "smart-restore")}
            className="hover:text-blue-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded px-1"
          >
            Smart Restore
          </a>
          <a
            id="footer-link-privacy"
            href="#privacy"
            onClick={(e) => handleLinkClick(e, "privacy")}
            className="hover:text-blue-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded px-1"
          >
            Privacy
          </a>
          <button
            id="footer-link-signin"
            onClick={(e) => handleLinkClick(e, "signin")}
            className="hover:text-blue-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright rounded px-1 cursor-pointer"
          >
            Sign In
          </button>
        </nav>

        {/* Right Side: Copyright & local-first small indicator */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right gap-1">
          <span className="text-[12px] font-medium text-muted-text">
            &copy; 2026 PDF Space
          </span>
          <span className="text-[9.5px] font-semibold text-blue-bright/50 uppercase tracking-widest font-mono">
            Local-first by design
          </span>
        </div>

      </div>
    </footer>
  );
};
