import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, CheckCircle, Info, AlertTriangle, Sparkles } from "lucide-react";

export type ToastType = "success" | "info" | "warning" | "sparkles";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string | undefined;
  type?: ToastType | undefined;
  duration?: number | undefined;
}

interface ToastContextType {
  showToast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const showToast = useCallback((title: string, description?: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div 
        role="status" 
        aria-live="polite" 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
              className="command-surface pointer-events-auto relative flex gap-3 overflow-hidden p-4"
            >
              {/* Highlight bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-accent" />
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "success" && (
                  <CheckCircle className="w-5 h-5 text-success-green" aria-hidden="true" focusable="false" />
                )}
                {toast.type === "info" && (
                  <Info className="w-5 h-5 text-blue-bright" aria-hidden="true" focusable="false" />
                )}
                {toast.type === "warning" && (
                  <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" focusable="false" />
                )}
                {toast.type === "sparkles" && (
                  <Sparkles className="h-5 w-5 animate-pulse text-blue-bright" aria-hidden="true" focusable="false" />
                )}
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-semibold text-primary-text leading-tight">
                  {toast.title}
                </h4>
                {toast.description && (
                  <p className="text-xs text-secondary-text mt-1 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-muted-text hover:text-primary-text transition-colors flex-shrink-0 self-start p-1 hover:bg-white/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                <X className="w-4 h-4" aria-hidden="true" focusable="false" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
