import {
  getBrowserPreferredLocale,
  localePreferenceStorageKey,
  normalizeLocale,
  type Locale
} from "@/lib/locale";

export type ThemePreference = "light" | "dark";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export const themePreferenceStorageKey = "v-streamer-tools-theme";
export const themePreferenceChangeEvent = "v-streamer-tools:theme-change";

export const localPreferenceStorageKeys = {
  locale: localePreferenceStorageKey,
  theme: themePreferenceStorageKey
} as const;

export type LocalPreferenceKey = keyof typeof localPreferenceStorageKeys;

export type FutureLocalPreferenceCandidate =
  | {
      tool: "thumbnail-editor";
      status: "placeholder-only";
      preference: "recentPresetIds" | "favoritePresetIds";
      valueShape: "string[]";
    }
  | {
      tool: "schedule-calendar";
      status: "placeholder-only";
      preference: "defaultView" | "weekStartsOn" | "defaultStartTime" | "defaultDurationMinutes";
      valueShape: "existing-settings-field";
    }
  | {
      tool: "comment-translator";
      status: "placeholder-only";
      preference: "targetLanguage" | "displayDensity" | "themePreference";
      valueShape: "future-tool-preference";
    };

function getLocalStorage(): PreferenceStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readPreferenceValue(storage: PreferenceStorage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writePreferenceValue(storage: PreferenceStorage | null, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

export function normalizeThemePreference(value: string | null | undefined): ThemePreference | null {
  return value === "light" || value === "dark" ? value : null;
}

export function readLocalLocalePreference(storage: PreferenceStorage | null = getLocalStorage()): Locale | null {
  return normalizeLocale(readPreferenceValue(storage, localePreferenceStorageKey));
}

export function writeLocalLocalePreference(locale: Locale, storage: PreferenceStorage | null = getLocalStorage()) {
  writePreferenceValue(storage, localePreferenceStorageKey, locale);
}

export function resolveInitialLocalLocalePreference(
  browserLanguages: readonly string[] | undefined,
  storage: PreferenceStorage | null = getLocalStorage()
): Locale {
  return readLocalLocalePreference(storage) ?? getBrowserPreferredLocale(browserLanguages);
}

export function readLocalThemePreference(storage: PreferenceStorage | null = getLocalStorage()): ThemePreference | null {
  return normalizeThemePreference(readPreferenceValue(storage, themePreferenceStorageKey));
}

export function writeLocalThemePreference(theme: ThemePreference, storage: PreferenceStorage | null = getLocalStorage()) {
  writePreferenceValue(storage, themePreferenceStorageKey, theme);
}

export function resolveInitialLocalThemePreference(
  prefersDark: boolean,
  storage: PreferenceStorage | null = getLocalStorage()
): ThemePreference {
  return readLocalThemePreference(storage) ?? (prefersDark ? "dark" : "light");
}

export function readLocalPreferenceSnapshot(storage: PreferenceStorage | null = getLocalStorage()) {
  return {
    locale: readLocalLocalePreference(storage),
    theme: readLocalThemePreference(storage)
  };
}
