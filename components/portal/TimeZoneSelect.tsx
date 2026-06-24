"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/portal/LocaleProvider";
import {
  readLocalTimeZonePreference,
  resolveBrowserTimeZonePreference,
  timeZonePreferenceChangeEvent,
  timeZonePreferenceStorageKey,
  writeLocalTimeZonePreference
} from "@/lib/local-preferences";

const preferredTimeZones = [
  "UTC",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Taipei",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney"
] as const;

function getInitialTimeZone() {
  if (typeof window === "undefined") {
    return "UTC";
  }

  return readLocalTimeZonePreference() ?? resolveBrowserTimeZonePreference();
}

function getTimeZoneOptions(currentTimeZone: string) {
  return Array.from(new Set([currentTimeZone, resolveBrowserTimeZonePreference(), ...preferredTimeZones]));
}

export function TimeZoneSelect() {
  const { locale } = useLocale();
  const [timeZone, setTimeZone] = useState("UTC");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeZone(getInitialTimeZone());
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== timeZonePreferenceStorageKey) {
        return;
      }

      const nextTimeZone = readLocalTimeZonePreference();
      if (nextTimeZone) {
        setTimeZone(nextTimeZone);
      }
    };

    const handleTimeZoneChange = (event: Event) => {
      const nextTimeZone = (event as CustomEvent<string>).detail;
      if (nextTimeZone) {
        setTimeZone(nextTimeZone);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(timeZonePreferenceChangeEvent, handleTimeZoneChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(timeZonePreferenceChangeEvent, handleTimeZoneChange);
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    writeLocalTimeZonePreference(timeZone);
    window.dispatchEvent(new CustomEvent(timeZonePreferenceChangeEvent, { detail: timeZone }));
  }, [mounted, timeZone]);

  return (
    <select
      value={timeZone}
      onChange={(event) => setTimeZone(event.target.value)}
      aria-label={locale === "ja" ? "タイムゾーン" : "Time zone"}
      className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/60 focus:border-primary"
    >
      {getTimeZoneOptions(timeZone).map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
