import React from "react";

type HeroActivePageProps = {
  pageLabel: string;
};

export const HeroActivePage: React.FC<HeroActivePageProps> = ({
  pageLabel,
}) => {
  const pageNum = pageLabel.replace(/\D+/g, "") || "02";

  return (
    <article className="hero-active-page" data-hero-active-page>
      <div className="hero-active-page-spine" aria-hidden="true" />
      <div className="hero-active-page-inner">
        <div className="hero-active-page-header-row">
          <span className="hero-active-page-kicker">
            <i className="hero-kicker-dot" aria-hidden="true" />
            Executive Dossier
          </span>
          <span className="hero-active-page-badge">Page {pageNum}</span>
        </div>

        <h3>Quarterly Capital Allocation</h3>
        <p>Portfolio liquidity, debt covenants, and fiscal horizon.</p>

        <svg
          aria-hidden="true"
          className="hero-active-page-chart"
          viewBox="0 0 240 96"
        >
          <defs>
            <linearGradient id="hero-paper-chart-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#1E293B" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path className="hero-chart-grid" d="M8 20H232M8 48H232M8 76H232" />
          <path
            className="hero-chart-area"
            d="M9 74L48 62L86 66L125 36L164 42L204 18L232 24V88H9Z"
            fill="url(#hero-paper-chart-area)"
          />
          <path
            className="hero-chart-line"
            d="M9 74L48 62L86 66L125 36L164 42L204 18L232 24"
            fill="none"
            stroke="#1C1917"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="125" cy="36" fill="#8C533A" r="3.5" />
          <circle cx="204" cy="18" fill="#1C1917" r="3.5" />
        </svg>

        <div className="hero-active-page-summary">
          <div>
            <span>Status</span>
            <strong>Audited</strong>
          </div>
          <div>
            <span>Filing</span>
            <strong>Q3 Standard</strong>
          </div>
        </div>

        <footer>
          <span>PDF Space Studio</span>
          <span>Folio {pageNum}</span>
        </footer>
      </div>
    </article>
  );
};
