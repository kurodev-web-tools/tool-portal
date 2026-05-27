"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeLocale } from "@/lib/locale";
import { normalizeThemePreference } from "@/lib/local-preferences";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function accountRedirect(status: string): never {
  redirect(`/account?auth=${encodeURIComponent(status)}`);
}

function readRequiredString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getOrigin() {
  const headerStore = await headers();
  return headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInWithEmailAction(formData: FormData) {
  const email = readRequiredString(formData, "email");

  if (!email) {
    accountRedirect("email-required");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    accountRedirect("supabase-env-missing");
  }

  const origin = await getOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/account`
    }
  });

  if (error) {
    accountRedirect("sign-in-error");
  }

  accountRedirect("magic-link-sent");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    accountRedirect("supabase-env-missing");
  }

  await supabase.auth.signOut();
  accountRedirect("signed-out");
}

export async function saveLocaleThemePreferenceAction(formData: FormData) {
  const locale = normalizeLocale(readRequiredString(formData, "locale"));
  const theme = normalizeThemePreference(readRequiredString(formData, "theme"));

  if (!locale || !theme) {
    accountRedirect("local-preference-required");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    accountRedirect("supabase-env-missing");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    accountRedirect("sign-in-required");
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      schema_version: 1,
      locale,
      theme,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    accountRedirect("preference-save-error");
  }

  accountRedirect("preferences-saved");
}
