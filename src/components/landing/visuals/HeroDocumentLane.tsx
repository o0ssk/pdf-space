import React from "react";

type HeroDocumentLaneProps = {
  destination?: boolean;
  meta: string;
  name: string;
  roleLabel: string;
  slotLabel?: string;
};

const RealisticDocPage: React.FC<{
  folio: string;
  variant: "cover" | "chart" | "editorial" | "table";
}> = ({ folio, variant }) => (
  <div className={`hero-background-page is-${variant}`} title={`Page ${folio}`}>
    <i className="hero-bg-page-spine" aria-hidden="true" />
    <div className="hero-bg-page-header">
      <span className="hero-bg-page-tag" />
      <span className="hero-bg-page-folio">{folio}</span>
    </div>

    {variant === "cover" && (
      <div className="hero-page-content-cover" aria-hidden="true">
        <div className="cover-title-line" />
        <div className="cover-subtitle-line" />
        <div className="cover-badge" />
      </div>
    )}

    {variant === "chart" && (
      <div className="hero-page-content-chart" aria-hidden="true">
        <svg viewBox="0 0 72 44" fill="none">
          <line x1="2" y1="38" x2="70" y2="38" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
          <path d="M4 34L18 24L32 28L48 12L68 18" stroke="#3f79bb" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="12" r="3" fill="#3f79bb" />
        </svg>
        <div className="chart-legend-lines">
          <span />
          <span />
        </div>
      </div>
    )}

    {variant === "table" && (
      <div className="hero-page-content-table" aria-hidden="true">
        <div className="table-header-row" />
        <div className="table-data-row" />
        <div className="table-data-row" />
        <div className="table-data-row" />
      </div>
    )}

    {variant === "editorial" && (
      <div className="hero-page-content-editorial" aria-hidden="true">
        <div className="editorial-lead-line" />
        <div className="editorial-columns">
          <div className="col-1"><span /><span /><span /></div>
          <div className="col-2"><span /><span /><span /></div>
        </div>
      </div>
    )}

    <div className="hero-bg-page-footer">
      <span className="footer-mark" />
    </div>
  </div>
);

export const HeroDocumentLane: React.FC<HeroDocumentLaneProps> = ({
  destination = false,
  meta,
  name,
  roleLabel,
  slotLabel,
}) => (
  <section
    className={`hero-document-lane ${
      destination ? "is-destination" : "is-source"
    }`}
  >
    <header>
      <span className="hero-document-rail" />
      <div className="hero-document-title-wrap">
        <small>{roleLabel}</small>
        <strong dir="ltr">{name}</strong>
      </div>
      <span className="hero-document-meta">{meta}</span>
    </header>

    <div className="hero-document-pages">
      {destination ? (
        <>
          <RealisticDocPage folio="01" variant="cover" />
          <div
            className="hero-destination-slot"
            data-hero-destination-slot
          >
            <div className="slot-pulse-ring" />
            <span>{slotLabel || "Drop target"}</span>
          </div>
          <RealisticDocPage folio="03" variant="table" />
        </>
      ) : (
        <>
          <RealisticDocPage folio="01" variant="cover" />
          <div className="hero-source-slot" aria-hidden="true">
            <div className="source-slot-indicator">
              <span>02</span>
            </div>
          </div>
          <RealisticDocPage folio="03" variant="chart" />
          <RealisticDocPage folio="04" variant="editorial" />
        </>
      )}
    </div>
  </section>
);
