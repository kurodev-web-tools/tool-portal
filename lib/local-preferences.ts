import {
  getBrowserPreferredLocale,
  localePreferenceStorageKey,
  normalizeLocale,
  type Locale
} from "@/lib/locale";

export type ThemePreference = "light" | "dark";
export type TimeZonePreference = string;

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export const themePreferenceStorageKey = "v-streamer-tools-theme";
export const themePreferenceChangeEvent = "v-streamer-tools:theme-change";
export const timeZonePreferenceStorageKey = "v-streamer-tools-time-zone";
export const timeZonePreferenceChangeEvent = "v-streamer-tools:time-zone-change";

export const localPreferenceStorageKeys = {
  locale: localePreferenceStorageKey,
  theme: themePreferenceStorageKey,
  timeZone: timeZonePreferenceStorageKey
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

export function normalizeTimeZonePreference(value: string | null | undefined): TimeZonePreference | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date(0));
    return normalized;
  } catch {
    return null;
  }
}

export function resolveBrowserTimeZonePreference(): TimeZonePreference {
  return normalizeTimeZonePreference(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? "UTC";
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

export function readLocalTimeZonePreference(storage: PreferenceStorage | null = getLocalStorage()): TimeZonePreference | null {
  return normalizeTimeZonePreference(readPreferenceValue(storage, timeZonePreferenceStorageKey));
}

export function writeLocalTimeZonePreference(timeZone: TimeZonePreference, storage: PreferenceStorage | null = getLocalStorage()) {
  const normalized = normalizeTimeZonePreference(timeZone);
  if (normalized) {
    writePreferenceValue(storage, timeZonePreferenceStorageKey, normalized);
  }
}

export function resolveInitialLocalTimeZonePreference(storage: PreferenceStorage | null = getLocalStorage()): TimeZonePreference {
  return readLocalTimeZonePreference(storage) ?? resolveBrowserTimeZonePreference();
}

export function readLocalPreferenceSnapshot(storage: PreferenceStorage | null = getLocalStorage()) {
  return {
    locale: readLocalLocalePreference(storage),
    theme: readLocalThemePreference(storage),
    timeZone: readLocalTimeZonePreference(storage)
  };
}
