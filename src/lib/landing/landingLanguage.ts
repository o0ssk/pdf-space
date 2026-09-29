import { useCallback, useEffect, useState } from "react";
import type { LandingLocale } from "./landingCopy";

export const LANDING_LOCALE_STORAGE_KEY = "pdf-space:landing-locale";

export const parseLandingLocale = (value: string | null | undefined) =>
  value === "ar" || value === "en" ? value : null;

export const detectLandingLocale = (
  languages: readonly string[],
  storedLocale?: string | null
): LandingLocale => {
  const stored = parseLandingLocale(storedLocale);
  if (stored) return stored;

  return languages.some((language) => language.toLowerCase().startsWith("ar"))
    ? "ar"
    : "en";
};

const getInitialLocale = (): LandingLocale => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "en";
  }

  let storedLocale: string | null = null;
  try {
    storedLocale = window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY);
  } catch {
    storedLocale = null;
  }

  const languages =
    navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  return detectLandingLocale(languages, storedLocale);
};

export const useLandingLanguage = () => {
  const [locale, setLocale] = useState<LandingLocale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const chooseLocale = useCallback((nextLocale: LandingLocale) => {
    setLocale(nextLocale);
    try {
      window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Language selection still works for the current page when storage is unavailable.
    }
  }, []);

  const toggleLocale = useCallback(() => {
    chooseLocale(locale === "ar" ? "en" : "ar");
  }, [chooseLocale, locale]);

  return {
    chooseLocale,
    direction: locale === "ar" ? ("rtl" as const) : ("ltr" as const),
    locale,
    toggleLocale,
  };
};

