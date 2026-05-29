"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/components/portal/LocaleProvider";
import {
  readLocalPreferenceSnapshot,
  themePreferenceChangeEvent,
  writeLocalLocalePreference,
  writeLocalThemePreference
} from "@/lib/local-preferences";
import type { AccountSessionState } from "@/lib/supabase/session";

export function AccountRemoteDisplaySettingsApplier({ accountStatus }: { accountStatus: AccountSessionState }) {
  const { setLocale } = useLocale();
  const appliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (accountStatus.authStatus !== "signed-in" || !accountStatus.remotePreferences) {
      return;
    }

    const { locale, theme, updatedAt } = accountStatus.remotePreferences;
    if (!locale && !theme) {
      return;
    }

    const applyKey = `${accountStatus.user?.id ?? "unknown"}:${locale ?? "-"}:${theme ?? "-"}:${updatedAt ?? "-"}`;
    if (appliedKeyRef.current === applyKey) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const forceAfterSignIn = searchParams.get("auth") === "signed-in";
    const localSnapshot = readLocalPreferenceSnapshot();
    const shouldApplyLocale = Boolean(locale && (forceAfterSignIn || !localSnapshot.locale));
    const shouldApplyTheme = Boolean(theme && (forceAfterSignIn || !localSnapshot.theme));

    if (!shouldApplyLocale && !shouldApplyTheme) {
      appliedKeyRef.current = applyKey;
      return;
    }

    if (locale && shouldApplyLocale) {
      writeLocalLocalePreference(locale);
      setLocale(locale);
    }

    if (theme && shouldApplyTheme) {
      writeLocalThemePreference(theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.dispatchEvent(new CustomEvent(themePreferenceChangeEvent, { detail: theme }));
    }

    appliedKeyRef.current = applyKey;
  }, [accountStatus, setLocale]);

  return null;
}
