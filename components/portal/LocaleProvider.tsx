"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLocale, getBrowserPreferredLocale, type Locale } from "@/lib/locale";
import { readLocalLocalePreference, writeLocalLocalePreference } from "@/lib/local-preferences";

type LocaleContextValue = {
  locale: Locale;
  isLocaleReady: boolean;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getNavigatorLanguages() {
  if (window.navigator.languages.length > 0) {
    return window.navigator.languages;
  }

  return window.navigator.language ? [window.navigator.language] : [];
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isLocaleReady, setIsLocaleReady] = useState(false);

  useEffect(() => {
    setLocaleState(readLocalLocalePreference() ?? getBrowserPreferredLocale(getNavigatorLanguages()));
    setIsLocaleReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    setIsLocaleReady(true);
    writeLocalLocalePreference(nextLocale);
  }, []);

  const value = useMemo(() => ({ locale, isLocaleReady, setLocale }), [isLocaleReady, locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return value;
}
