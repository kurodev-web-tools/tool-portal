import { normalizeLocale, type Locale } from "@/lib/locale";
import { normalizeThemePreference, normalizeTimeZonePreference, type ThemePreference, type TimeZonePreference } from "@/lib/local-preferences";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AccountSessionState = {
  configStatus: "ready" | "missing";
  missingEnv: string[];
  authStatus: "signed-in" | "signed-out" | "recovery-pending" | "unavailable";
  user: {
    id: string;
    email: string | null;
  } | null;
  remotePreferences: {
    locale: Locale | null;
    theme: ThemePreference | null;
    timeZone: TimeZonePreference | null;
    updatedAt: string | null;
  } | null;
  remotePreferenceStatus: "not-signed-in" | "loaded" | "unavailable";
};

export type AccountSessionBrowserSafeViewModel = {
  readonly configStatus: AccountSessionState["configStatus"];
  readonly missingEnv: readonly string[];
  readonly authStatus: AccountSessionState["authStatus"];
  readonly user: {
    readonly email: string | null;
  } | null;
  readonly remotePreferences: AccountSessionState["remotePreferences"];
  readonly remotePreferenceStatus: AccountSessionState["remotePreferenceStatus"];
};

type UserPreferenceRow = {
  locale: string | null;
  theme: string | null;
  time_zone?: string | null;
  updated_at: string | null;
};

function isUserPreferencesTimeZoneSchemaMissingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const text = [maybeError.message, maybeError.details, maybeError.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return /time_zone/i.test(text) && (code === "PGRST204" || code === "42703" || /schema cache|column/i.test(text));
}

export function createBrowserSafeAccountSessionViewModel(accountSession: AccountSessionState): AccountSessionBrowserSafeViewModel {
  return {
    configStatus: accountSession.configStatus,
    missingEnv: [...accountSession.missingEnv],
    authStatus: accountSession.authStatus,
    user: accountSession.user
      ? {
          email: accountSession.user.email
        }
      : null,
    remotePreferences: accountSession.remotePreferences,
    remotePreferenceStatus: accountSession.remotePreferenceStatus
  };
}

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
  const recoveryPending = await isRecoverySessionPending();

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

  if (recoveryPending) {
    return {
      configStatus: "ready",
      missingEnv: [],
      authStatus: "recovery-pending",
      user: null,
      remotePreferences: null,
      remotePreferenceStatus: "not-signed-in"
    };
  }

  const preferenceResult = await supabase
    .from("user_preferences")
    .select("locale,theme,time_zone,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const fallbackPreferenceResult = preferenceResult.error && isUserPreferencesTimeZoneSchemaMissingError(preferenceResult.error)
    ? await supabase.from("user_preferences").select("locale,theme,updated_at").eq("user_id", user.id).maybeSingle()
    : null;
  const preferenceError = fallbackPreferenceResult?.error ?? preferenceResult.error;
  const row = (fallbackPreferenceResult?.data ?? preferenceResult.data) as UserPreferenceRow | null;

  return {
    configStatus: "ready",
    missingEnv: [],
    authStatus: "signed-in",
    user: {
      id: user.id,
      email: user.email ?? null
    },
    remotePreferences:
      row && !preferenceError
        ? {
            locale: normalizeLocale(row.locale),
            theme: normalizeThemePreference(row.theme),
            timeZone: normalizeTimeZonePreference(row.time_zone ?? null),
            updatedAt: row.updated_at
          }
        : null,
    remotePreferenceStatus: preferenceError ? "unavailable" : "loaded"
  };
}
