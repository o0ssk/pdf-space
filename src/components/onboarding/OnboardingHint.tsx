import React from "react";
import { Lightbulb, X } from "lucide-react";

type OnboardingHintProps = {
  title: string;
  children: React.ReactNode;
  onDismiss: () => void;
  action?: React.ReactNode;
  label: string;
};

export const OnboardingHint: React.FC<OnboardingHintProps> = ({
  title,
  children,
  onDismiss,
  action,
  label,
}) => (
  <section
    aria-label={label}
    className="flex flex-col gap-3 border-b border-blue-bright/20 bg-blue-accent/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
  >
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg border border-blue-bright/20 bg-blue-accent/10 text-blue-bright">
        <Lightbulb className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-balance text-[12px] font-extrabold text-primary-text">{title}</h2>
        <div className="mt-0.5 text-pretty text-[10.5px] leading-relaxed text-secondary-text">{children}</div>
      </div>
    </div>
    <div className="flex flex-shrink-0 items-center gap-2 pl-11 sm:pl-0">
      {action}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss ${label}`}
        className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text hover:bg-white/10 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  </section>
);

