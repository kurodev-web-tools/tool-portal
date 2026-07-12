"use client";

import { useEffect, useState } from "react";
import { resolveCommentTranslatorBrowserTimeZone } from "@/lib/comment-translator-real-comments-feed-shared";
import { readLocalTimeZonePreference, timeZonePreferenceChangeEvent, timeZonePreferenceStorageKey } from "@/lib/local-preferences";

export function useCommentTranslatorBrowserTimeZone(runtimeMode: "live" | "dev-fixture"): string {
  const [browserTimeZone, setBrowserTimeZone] = useState("UTC");
  useEffect(() => {
    if (runtimeMode === "dev-fixture") return;
    function refreshTimeZonePreference() {
      setBrowserTimeZone(readLocalTimeZonePreference() ?? resolveCommentTranslatorBrowserTimeZone());
    }
    function handleStorage(event: StorageEvent) {
      if (event.key === timeZonePreferenceStorageKey) refreshTimeZonePreference();
    }
    refreshTimeZonePreference();
    window.addEventListener(timeZonePreferenceChangeEvent, refreshTimeZonePreference);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(timeZonePreferenceChangeEvent, refreshTimeZonePreference);
      window.removeEventListener("storage", handleStorage);
    };
  }, [runtimeMode]);
  return browserTimeZone;
}
