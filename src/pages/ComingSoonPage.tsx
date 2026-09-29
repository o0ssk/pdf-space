import React from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PdfSpaceLogo } from "../components/landing/PdfSpaceLogo";
import { landingCopy } from "../lib/landing/landingCopy";
import { useLandingLanguage } from "../lib/landing/landingLanguage";
import { PROJECTS_ROUTE } from "../lib/navigation/productRoutes";
import "../landing.css";

export type ComingSoonContext = "login" | "privacy" | "terms";

type ComingSoonPageProps = {
  context: ComingSoonContext;
};

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ context }) => {
  const navigate = useNavigate();
  const { direction, locale, toggleLocale } = useLandingLanguage();
  const copy = landingCopy[locale];
  const contextLabel =
    context === "login"
      ? copy.navigation.login
      : context === "privacy"
        ? copy.footer.privacy
        : copy.footer.terms;

  return (
    <main className="coming-soon-page" dir={direction}>
      <div aria-hidden="true" className="coming-soon-atmosphere" />
      <header className="coming-soon-header">
        <Link aria-label={copy.navigation.home} to="/">
          <PdfSpaceLogo showName />
        </Link>
        <button
          aria-label={copy.navigation.switchLanguage}
          className="coming-soon-language"
          onClick={toggleLocale}
          type="button"
        >
          {locale === "ar" ? "EN" : "العربية"}
        </button>
      </header>

      <section className="coming-soon-card">
        <span>{copy.comingSoon.eyebrow}</span>
        <h1>{contextLabel}</h1>
        <p className="coming-soon-lead">{copy.comingSoon.title}</p>
        <p>{copy.comingSoon.descriptions[context]}</p>
        <div className="coming-soon-actions">
          <Link className="landing-secondary-button" to="/">
            <ArrowLeft aria-hidden="true" />
            {copy.comingSoon.returnHome}
          </Link>
          <button
            className="landing-primary-button"
            onClick={() => {
              void navigate(PROJECTS_ROUTE);
            }}
            type="button"
          >
            {copy.comingSoon.openApp}
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
};
