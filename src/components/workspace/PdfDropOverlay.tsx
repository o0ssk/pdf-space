import React from "react";
import { UploadCloud } from "lucide-react";
import { motion } from "motion/react";

type PdfDropOverlayProps = {
  isDragging: boolean;
};

export const PdfDropOverlay: React.FC<PdfDropOverlayProps> = ({ isDragging }) => {
  if (!isDragging) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-[#07080a]/85 backdrop-blur-sm border-2 border-dashed border-blue-bright m-2 rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none"
    >
      {/* Ambient center blue glow */}
      <div className="absolute w-40 h-40 bg-blue-accent/30 blur-3xl rounded-full" />

      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="flex flex-col items-center gap-4 relative z-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-accent/20 border border-blue-bright/30 flex items-center justify-center text-blue-bright shadow-lg shadow-blue-bright/10 animate-pulse">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-[16px] font-extrabold text-primary-text tracking-tight mb-1.5">
            Drop PDF files to add them
          </h3>
          <p className="text-[12.5px] text-muted-text max-w-xs leading-relaxed">
            Drag your documents anywhere on this canvas to expand your workspace. All processing is 100% local.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
