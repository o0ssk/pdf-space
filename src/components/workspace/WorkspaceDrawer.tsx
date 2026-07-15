import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  position: "left" | "right";
  title: string;
  children: React.ReactNode;
};

export const WorkspaceDrawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  position,
  title,
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle body overflow lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const slideVariants = {
    hidden: {
      x: position === "left" ? "-100%" : "100%",
    },
    visible: {
      x: 0,
      transition: { type: "tween", duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" },
    },
    exit: {
      x: position === "left" ? "-100%" : "100%",
      transition: { type: "tween", duration: shouldReduceMotion ? 0 : 0.2, ease: "easeIn" },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs cursor-pointer"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed top-0 bottom-0 z-50 w-[290px] max-w-[85vw] bg-panel-bg border-border-main flex flex-col shadow-2xl focus:outline-none ${
              position === "left"
                ? "left-0 border-r"
                : "right-0 border-l"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-panel-elevated/40">
              <h2 className="text-[14px] font-bold text-primary-text tracking-wide">{title}</h2>
              <button
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="p-1.5 rounded-lg text-muted-text hover:text-primary-text hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                <X className="w-4 h-4" aria-hidden="true" focusable="false" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-grow overflow-y-auto min-h-0">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
