import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Languages, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { LandingCopy, LandingLocale } from "../../lib/landing/landingCopy";
import { PROJECTS_ROUTE } from "../../lib/navigation/productRoutes";
import { PdfSpaceLogo } from "./PdfSpaceLogo";

type LandingNavbarProps = {
  copy: LandingCopy;
  locale: LandingLocale;
  onToggleLocale: () => void;
};

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  copy,
  locale,
  onToggleLocale,
}) => {
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSolid, setIsSolid] = useState(false);

  const navigationItems = [
    { href: "#home", label: copy.navigation.home },
    { href: "#product-showcase", label: copy.navigation.product },
    { href: "#features", label: copy.navigation.features },
    { href: "#how-it-works", label: copy.navigation.howItWorks },
    { href: "#faq", label: copy.navigation.faq },
  ];

  useEffect(() => {
    const sentinel = document.querySelector("#landing-nav-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsSolid(entry ? !entry.isIntersecting : false),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const menu = menuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const openApp = () => {
    void navigate(PROJECTS_ROUTE);
  };

  const NavigationLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navigationItems.map((item) => (
        <a href={item.href} key={item.href} onClick={mobile ? closeMenu : undefined}>
          {item.label}
        </a>
      ))}
      <Link to="/login" onClick={mobile ? closeMenu : undefined}>
        {copy.navigation.login}
      </Link>
    </>
  );

  return (
    <header
      className={`landing-navbar ${isSolid ? "is-solid" : ""} ${
        isMenuOpen ? "is-menu-open" : ""
      }`}
    >
      <div className="landing-navbar-inner">
        <a
          aria-label={copy.navigation.home}
          className="landing-navbar-logo"
          href="#home"
        >
          <PdfSpaceLogo />
        </a>

        <nav aria-label="Landing page" className="landing-navbar-links">
          <NavigationLinks />
        </nav>

        <div className="landing-navbar-actions">
          <button
            aria-label={copy.navigation.switchLanguage}
            className="landing-language-button"
            onClick={onToggleLocale}
            type="button"
          >
            <Languages aria-hidden="true" />
            <span>{locale === "ar" ? "EN" : "العربية"}</span>
          </button>
          <button className="landing-navbar-cta" onClick={openApp} type="button">
            {copy.navigation.openApp}
            <ArrowUpRight aria-hidden="true" />
          </button>
          <button
            aria-controls="landing-mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={
              isMenuOpen
                ? copy.navigation.closeMenu
                : copy.navigation.openMenu
            }
            className="landing-menu-button"
            onClick={() => setIsMenuOpen((value) => !value)}
            ref={menuButtonRef}
            type="button"
          >
            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <button
            aria-label={copy.navigation.dismissMenu}
            className="landing-mobile-scrim"
            onClick={closeMenu}
            type="button"
          />
          <nav
            aria-label="Mobile landing page"
            className="landing-mobile-navigation"
            id="landing-mobile-navigation"
            ref={menuRef}
          >
            <NavigationLinks mobile />
            <button
              className="landing-mobile-language"
              onClick={() => {
                onToggleLocale();
                closeMenu();
              }}
              type="button"
            >
              <Languages aria-hidden="true" />
              {locale === "ar" ? "English" : "العربية"}
            </button>
            <button
              className="landing-mobile-cta"
              onClick={() => {
                closeMenu();
                openApp();
              }}
              type="button"
            >
              {copy.navigation.openApp}
              <ArrowUpRight aria-hidden="true" />
            </button>
          </nav>
        </>
      ) : null}
    </header>
  );
};
