import React from "react";
import { Github, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import type { LandingCopy } from "../../lib/landing/landingCopy";
import { PdfSpaceLogo } from "./PdfSpaceLogo";

type LandingFooterProps = {
  copy: LandingCopy;
};

export const LandingFooter: React.FC<LandingFooterProps> = ({ copy }) => {
  const year = new Date().getFullYear();
  const basicLinks = [
    { href: "#home", label: copy.navigation.home },
    { href: "#product-showcase", label: copy.navigation.product },
    { href: "#features", label: copy.navigation.features },
    { href: "#how-it-works", label: copy.navigation.howItWorks },
    { href: "#faq", label: copy.navigation.faq },
  ];

  return (
    <footer className="landing-footer">
      <div className="landing-shell landing-footer-grid">
        <div className="landing-footer-brand">
          <a aria-label={copy.navigation.home} href="#home">
            <PdfSpaceLogo showName />
          </a>
          <p>{copy.footer.description}</p>
        </div>

        <nav aria-label="Footer">
          {basicLinks.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
          <Link to="/login">{copy.navigation.login}</Link>
          <Link to="/projects">{copy.navigation.openApp}</Link>
        </nav>

        <nav aria-label={copy.footer.legal} className="landing-footer-legal">
          <strong>{copy.footer.legal}</strong>
          <Link to="/privacy">{copy.footer.privacy}</Link>
          <Link to="/terms">{copy.footer.terms}</Link>
        </nav>

        <div
          aria-label={copy.footer.socialComingSoon}
          className="landing-social-placeholders"
          role="group"
        >
          <span aria-label={`GitHub, ${copy.footer.socialComingSoon}`} role="img">
            <Github aria-hidden="true" />
          </span>
          <span
            aria-label={`LinkedIn, ${copy.footer.socialComingSoon}`}
            role="img"
          >
            <Linkedin aria-hidden="true" />
          </span>
          <span
            aria-label={`Instagram, ${copy.footer.socialComingSoon}`}
            role="img"
          >
            <Instagram aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="landing-shell landing-footer-bottom">
        <span>
          © {year} {copy.footer.copyright}
        </span>
      </div>
    </footer>
  );
};

