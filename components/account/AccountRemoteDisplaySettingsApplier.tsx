"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/components/portal/LocaleProvider";
import {
  readLocalPreferenceSnapshot,
  themePreferenceChangeEvent,
  timeZonePreferenceChangeEvent,
  writeLocalLocalePreference,
  writeLocalThemePreference,
  writeLocalTimeZonePreference
} from "@/lib/local-preferences";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";

export function AccountRemoteDisplaySettingsApplier({ accountStatus }: { accountStatus: AccountSessionBrowserSafeViewModel }) {
  const { setLocale } = useLocale();
  const appliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (accountStatus.authStatus !== "signed-in" || !accountStatus.remotePreferences) {
      return;
    }

    const { locale, theme, timeZone, updatedAt } = accountStatus.remotePreferences;
    if (!locale && !theme && !timeZone) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const forceAfterSignIn = searchParams.get("auth") === "signed-in";
    const applyKey = [
      accountStatus.authStatus,
      accountStatus.remotePreferenceStatus,
      forceAfterSignIn ? "force-after-sign-in" : "normal",
      locale ?? "-",
      theme ?? "-",
      timeZone ?? "-",
      updatedAt ?? "-"
    ].join(":");
    if (appliedKeyRef.current === applyKey) {
      return;
    }

    const localSnapshot = readLocalPreferenceSnapshot();
    const shouldApplyLocale = Boolean(locale && (forceAfterSignIn || !localSnapshot.locale));
    const shouldApplyTheme = Boolean(theme && (forceAfterSignIn || !localSnapshot.theme));
    const shouldApplyTimeZone = Boolean(timeZone && (forceAfterSignIn || !localSnapshot.timeZone));

    if (!shouldApplyLocale && !shouldApplyTheme && !shouldApplyTimeZone) {
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

    if (timeZone && shouldApplyTimeZone) {
      writeLocalTimeZonePreference(timeZone);
      window.dispatchEvent(new CustomEvent(timeZonePreferenceChangeEvent, { detail: timeZone }));
    }

    appliedKeyRef.current = applyKey;
  }, [accountStatus, setLocale]);

  return null;
}
