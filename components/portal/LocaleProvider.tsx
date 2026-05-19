"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultLocale,
  localePreferenceStorageKey,
  resolveInitialLocale,
  type Locale
} from "@/lib/locale";

type LocaleContextValue = {
  locale: Locale;
  isLocaleReady: boolean;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale() {
  try {
    return window.localStorage.getItem(localePreferenceStorageKey);
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(localePreferenceStorageKey, locale);
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

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
    setLocaleState(resolveInitialLocale(readStoredLocale(), getNavigatorLanguages()));
    setIsLocaleReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    setIsLocaleReady(true);
    writeStoredLocale(nextLocale);
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
