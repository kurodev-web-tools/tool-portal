import { normalizeLocale, type Locale } from "@/lib/locale";
import { normalizeThemePreference, type ThemePreference } from "@/lib/local-preferences";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AccountSessionState = {
  configStatus: "ready" | "missing";
  missingEnv: string[];
  authStatus: "signed-in" | "signed-out" | "unavailable";
  user: {
    id: string;
    email: string | null;
  } | null;
  remotePreferences: {
    locale: Locale | null;
    theme: ThemePreference | null;
    updatedAt: string | null;
  } | null;
  remotePreferenceStatus: "not-signed-in" | "loaded" | "unavailable";
};

type UserPreferenceRow = {
  locale: string | null;
  theme: string | null;
  updated_at: string | null;
};

export async function getAccountSessionState(): Promise<AccountSessionState> {
  const config = getSupabasePublicConfig();

  if (config.status === "missing") {
    return {
      configStatus: "missing",
      missingEnv: config.missing,
      authStatus: "unavailable",
      user: null,
      remotePreferences: null,
      remotePreferenceStatus: "unavailable"
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      configStatus: "missing",
      missingEnv: [],
      authStatus: "unavailable",
      user: null,
      remotePreferences: null,
      remotePreferenceStatus: "unavailable"
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configStatus: "ready",
      missingEnv: [],
      authStatus: "signed-out",
      user: null,
      remotePreferences: null,
      remotePreferenceStatus: "not-signed-in"
    };
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("locale,theme,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const row = data as UserPreferenceRow | null;

  return {
    configStatus: "ready",
    missingEnv: [],
    authStatus: "signed-in",
    user: {
      id: user.id,
      email: user.email ?? null
    },
    remotePreferences:
      row && !error
        ? {
            locale: normalizeLocale(row.locale),
            theme: normalizeThemePreference(row.theme),
            updatedAt: row.updated_at
          }
        : null,
    remotePreferenceStatus: error ? "unavailable" : "loaded"
  };
}
