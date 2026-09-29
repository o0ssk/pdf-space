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
    <span className="landing-logo-symbol" aria-hidden="true">
      <i />
      <i />
    </span>
    {showName ? <span className="landing-logo-name">PDF Space</span> : null}
  </span>
);

