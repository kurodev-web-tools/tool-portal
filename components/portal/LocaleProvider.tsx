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

  useEffect(() => {
    setLocaleState(resolveInitialLocale(readStoredLocale(), getNavigatorLanguages()));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    writeStoredLocale(nextLocale);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return value;
}
