import React from "react";
import { FaqSection } from "../components/landing/FaqSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { FinalCtaSection } from "../components/landing/FinalCtaSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { ProductShowcase } from "../components/landing/ProductShowcase";
import { TrustSection } from "../components/landing/TrustSection";
import { landingCopy } from "../lib/landing/landingCopy";
import { useLandingLanguage } from "../lib/landing/landingLanguage";
import "../landing.css";

export const LandingPage: React.FC = () => {
  const { direction, locale, toggleLocale } = useLandingLanguage();
  const copy = landingCopy[locale];

  return (
    <div className="landing-page" dir={direction}>
      <a className="landing-skip-link" href="#landing-main">
        {locale === "ar" ? "انتقل إلى المحتوى الرئيسي" : "Skip to main content"}
      </a>
      <LandingNavbar
        copy={copy}
        locale={locale}
        onToggleLocale={toggleLocale}
      />

      <main id="landing-main">
        <LandingHero copy={copy} />
        <ProductShowcase copy={copy} />
        <FeaturesSection copy={copy} />
        <HowItWorksSection copy={copy} />
        <TrustSection copy={copy} />
        <FaqSection copy={copy} />
        <FinalCtaSection copy={copy} />
      </main>

      <LandingFooter copy={copy} />
    </div>
  );
};
