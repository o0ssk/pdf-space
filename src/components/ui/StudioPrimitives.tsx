import React from "react";
import { FileStack } from "lucide-react";

type SurfaceVariant = "base" | "raised" | "floating" | "paper" | "command";

const SURFACE_VARIANTS: Record<SurfaceVariant, string> = {
  base: "studio-surface",
  raised: "studio-surface studio-surface-raised",
  floating: "studio-surface studio-surface-floating",
  paper: "paper-plane",
  command: "command-surface",
};

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  children: React.ReactNode;
};

export function Surface({
  variant = "base",
  className = "",
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={`${SURFACE_VARIANTS[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export const SpatialMark: React.FC<{ compact?: boolean; className?: string }> = ({
  compact = false,
  className = "",
}) => (
  <span
    aria-hidden="true"
    className={`spatial-mark ${compact ? "h-8 w-8" : "h-10 w-10"} ${className}`.trim()}
  >
    <FileStack className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.7} />
  </span>
);

type StatusTone = "neutral" | "active" | "success" | "warning" | "danger";

export const StatusBadge: React.FC<{
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = "neutral", children, className = "" }) => (
  <span className={`status-badge status-badge-${tone} ${className}`.trim()}>
    {children}
  </span>
);
