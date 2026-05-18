export type Locale = "ja" | "en";

export const supportedLocales = ["ja", "en"] as const satisfies readonly Locale[];
export const defaultLocale: Locale = "ja";
export const localePreferenceStorageKey = "v-streamer-tools-locale";

export function normalizeLocale(value: string | null | undefined): Locale | null {
  return value === "ja" || value === "en" ? value : null;
}

export function getBrowserPreferredLocale(languages: readonly string[] | undefined): Locale {
  const primaryLanguage = languages?.[0]?.toLowerCase();
  return primaryLanguage?.startsWith("en") ? "en" : defaultLocale;
}

export function resolveInitialLocale(
  storedLocale: string | null | undefined,
  browserLanguages: readonly string[] | undefined
): Locale {
  return normalizeLocale(storedLocale) ?? getBrowserPreferredLocale(browserLanguages);
}
