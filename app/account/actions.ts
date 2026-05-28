"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeLocale } from "@/lib/locale";
import { normalizeThemePreference } from "@/lib/local-preferences";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, fallback = "/account") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function pathWithAuth(path: string, status: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}auth=${encodeURIComponent(status)}`;
}

function redirectWithAuth(path: string, status: string): never {
  redirect(pathWithAuth(path, status));
}

function accountRedirect(status: string): never {
  redirectWithAuth("/account", status);
}

function readRequiredString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getOrigin() {
  const headerStore = await headers();
  return headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const next = safeNextPath(readRequiredString(formData, "next"));

  if (!email || !password) {
    redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "credentials-required");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "supabase-env-missing");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "login-error");
  }

  redirectWithAuth(next, "signed-in");
}

export async function signUpWithPasswordAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const next = safeNextPath(readRequiredString(formData, "next"));

  if (!email || !password) {
    redirectWithAuth("/signup", "credentials-required");
  }

  if (password.length < 8) {
    redirectWithAuth("/signup", "password-too-short");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth("/signup", "supabase-env-missing");
  }

  const origin = await getOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`
    }
  });

  if (error) {
    redirectWithAuth("/signup", "signup-error");
  }

  redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "signup-check-email");
}

export async function resetPasswordEmailAction(formData: FormData) {
  const email = readRequiredString(formData, "email");

  if (!email) {
    redirectWithAuth("/reset-password", "email-required");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth("/reset-password", "supabase-env-missing");
  }

  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/account/security`
  });

  if (error) {
    redirectWithAuth("/reset-password", "reset-error");
  }

  redirectWithAuth("/reset-password", "reset-email-sent");
}

export async function updatePasswordAction(formData: FormData) {
  const password = readRequiredString(formData, "password");
  const passwordConfirm = readRequiredString(formData, "passwordConfirm");

  if (!password || !passwordConfirm) {
    redirectWithAuth("/account/security", "password-required");
  }

  if (password.length < 8) {
    redirectWithAuth("/account/security", "password-too-short");
  }

  if (password !== passwordConfirm) {
    redirectWithAuth("/account/security", "password-mismatch");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth("/account/security", "supabase-env-missing");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirectWithAuth("/login?next=/account/security", "sign-in-required");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithAuth("/account/security", "password-update-error");
  }

  redirectWithAuth("/account/security", "password-updated");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth("/login", "supabase-env-missing");
  }

  await supabase.auth.signOut();
  redirectWithAuth("/login", "signed-out");
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
