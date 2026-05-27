"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (config.status === "missing") {
    return null;
  }

  return createBrowserClient(config.url, config.publishableKey);
}
