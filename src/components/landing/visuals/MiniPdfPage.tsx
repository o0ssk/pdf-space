import React from "react";

export type MiniPdfPageVariant = "editorial" | "plan" | "report";

type MiniPdfPageProps = {
  className?: string;
  label: string;
  selected?: boolean;
  variant: MiniPdfPageVariant;
};

const ReportGraphic = () => (
  <>
    <div className="mini-page-kicker">Quarterly review</div>
    <div className="mini-page-title">Operations</div>
    <svg
      aria-hidden="true"
      className="mini-page-chart"
      viewBox="0 0 120 54"
    >
      <line x1="7" x2="113" y1="47" y2="47" />
      <line x1="7" x2="7" y1="8" y2="47" />
      <polyline points="7,40 28,31 48,35 68,20 88,24 113,10" />
      <circle cx="68" cy="20" r="3" />
      <circle cx="113" cy="10" r="3" />
    </svg>
    <div className="mini-page-table">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  </>
);

const EditorialGraphic = () => (
  <>
    <div className="mini-page-kicker">Field notes</div>
    <div className="mini-page-title">Materials</div>
    <div className="mini-page-editorial">
      <div className="mini-page-editorial-figure" />
      <div>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
    <blockquote>Form follows the page.</blockquote>
  </>
);

const PlanGraphic = () => (
  <>
    <div className="mini-page-kicker">Plan set</div>
    <div className="mini-page-title">Level 02</div>
    <svg
      aria-hidden="true"
      className="mini-page-plan"
      viewBox="0 0 120 82"
    >
      <rect height="62" width="102" x="9" y="9" />
      <path d="M9 31h102M9 55h102M36 9v62M78 9v62M36 43h42M58 31v24" />
      <path d="M14 76h92M14 73v6M106 73v6" />
      <circle cx="47" cy="20" r="5" />
      <circle cx="91" cy="43" r="7" />
    </svg>
  </>
);

export const MiniPdfPage: React.FC<MiniPdfPageProps> = ({
  className = "",
  label,
  selected = false,
  variant,
}) => (
  <article
    aria-label={label}
    className={`mini-pdf-page is-${variant} ${
      selected ? "is-selected" : ""
    } ${className}`.trim()}
  >
    <div className="mini-page-content">
      {variant === "report" ? <ReportGraphic /> : null}
      {variant === "editorial" ? <EditorialGraphic /> : null}
      {variant === "plan" ? <PlanGraphic /> : null}
    </div>
    <span className="mini-page-number">
      {label.match(/\d+/)?.[0] ?? "01"}
    </span>
  </article>
);

