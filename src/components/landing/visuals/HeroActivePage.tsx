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
            Quarterly report
          </span>
          <span className="hero-active-page-badge">Page {pageNum}</span>
        </div>

        <h3>Delivery overview</h3>
        <p>Workstreams, review progress, and the next delivery window.</p>

        <svg
          aria-hidden="true"
          className="hero-active-page-chart"
          viewBox="0 0 240 104"
        >
          <defs>
            <linearGradient id="hero-report-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3f79bb" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#1d4f8a" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8c3a70" stopOpacity="0.02" />
            </linearGradient>
            <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path className="hero-chart-grid" d="M8 24H232M8 56H232M8 88H232" />
          <path
            className="hero-chart-area"
            d="M9 86L48 72L86 76L125 43L164 51L204 22L232 29V96H9Z"
          />
          <path
            className="hero-chart-line"
            d="M9 86L48 72L86 76L125 43L164 51L204 22L232 29"
            filter="url(#chart-glow)"
          />
          <circle cx="125" cy="43" r="4.5" />
          <circle cx="204" cy="22" r="5" />
        </svg>

        <div className="hero-active-page-summary">
          <div>
            <span>Workstreams</span>
            <strong>In review</strong>
          </div>
          <div>
            <span>Next window</span>
            <strong>Final pass</strong>
          </div>
        </div>

        <footer>
          <span>PDF Space</span>
          <span>{pageNum}</span>
        </footer>
      </div>
    </article>
  );
};


