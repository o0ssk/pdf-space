import React from "react";

type HeroDocumentLaneProps = {
  destination?: boolean;
  meta: string;
  name: string;
  roleLabel: string;
  slotLabel?: string;
};

const BackgroundPage: React.FC<{
  variant: "chart" | "editorial" | "plan";
}> = ({ variant }) => (
  <div className={`hero-background-page is-${variant}`}>
    <i className="hero-bg-page-spine" aria-hidden="true" />
    <span />
    {variant === "chart" ? (
      <svg aria-hidden="true" viewBox="0 0 72 46">
        <path d="M2 39L19 30L34 33L51 15L70 21" />
      </svg>
    ) : null}
    {variant === "plan" ? (
      <svg aria-hidden="true" viewBox="0 0 72 46">
        <path d="M3 4H69V42H3ZM27 4V42M48 4V42M3 23H69" />
        <circle cx="48" cy="23" r="6" />
      </svg>
    ) : null}
    {variant === "editorial" ? (
      <div className="hero-background-editorial" aria-hidden="true">
        <i />
        <b />
        <b />
        <b />
      </div>
    ) : null}
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
      <div>
        <small>{roleLabel}</small>
        <strong dir="ltr">{name}</strong>
      </div>
      <span className="hero-document-meta">{meta}</span>
    </header>

    <div className="hero-document-pages">
      {destination ? (
        <>
          <BackgroundPage variant="plan" />
          <div
            className="hero-destination-slot"
            data-hero-destination-slot
          >
            <span>{slotLabel}</span>
          </div>
          <BackgroundPage variant="editorial" />
        </>
      ) : (
        <>
          <BackgroundPage variant="chart" />
          <div className="hero-source-slot" aria-hidden="true">
            <span />
          </div>
          <BackgroundPage variant="plan" />
          <BackgroundPage variant="editorial" />
        </>
      )}
    </div>
  </section>
);
