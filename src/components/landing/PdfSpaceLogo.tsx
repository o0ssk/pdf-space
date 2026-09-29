import React from "react";

type PdfSpaceLogoProps = {
  className?: string;
  showName?: boolean;
};

export const PdfSpaceLogo: React.FC<PdfSpaceLogoProps> = ({
  className = "",
  showName = false,
}) => (
  <span className={`landing-logo ${className}`.trim()}>
    <svg
      aria-hidden="true"
      className="landing-logo-svg"
      fill="none"
      height="26"
      viewBox="0 0 28 26"
      width="28"
    >
      <rect
        fill="#1C1917"
        height="19"
        rx="3"
        width="15"
        x="2"
        y="4"
      />
      <rect
        fill="#FFFFFF"
        height="19"
        rx="3"
        stroke="#1C1917"
        strokeWidth="1.25"
        width="15"
        x="9"
        y="2"
      />
      <path
        d="M13 7H19M13 11H20M13 15H17"
        stroke="#57534E"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
      <circle cx="19" cy="18" fill="#8C533A" r="1.5" />
    </svg>
    {showName ? <span className="landing-logo-name">PDF Space</span> : null}
  </span>
);
