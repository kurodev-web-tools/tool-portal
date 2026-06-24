"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { readYouTubeOAuthCredentialDisconnectResult } from "@/lib/comment-translator-youtube-disconnect-runtime";
import { readYouTubeAccountIntegrationCredentialReference } from "@/lib/comment-translator-youtube-account-integration-status";
import {
  startYouTubeOAuthConnectRedirect,
  startYouTubeOAuthReconnectRedirect
} from "@/lib/comment-translator-youtube-oauth-connect-callback";
import { createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { normalizeLocale } from "@/lib/locale";
import { normalizeThemePreference, normalizeTimeZonePreference } from "@/lib/local-preferences";
import { clearRecoverySessionPending, isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAccountSessionState } from "@/lib/supabase/session";

const allowedAuthNextPaths = new Set([
  "/",
  "/tools",
  "/tools/schedule-calendar",
  "/tools/thumbnail-editor",
  "/tools/sns-split-image-maker",
  "/account",
  "/account/integrations",
  "/account/security"
]);
const localDevelopmentOrigin = "http://localhost:3000";
const turnstileTokenFieldName = "cf-turnstile-response";

function safeNextPath(value: string | null, fallback = "/account") {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "http://localhost");
    return allowedAuthNextPaths.has(url.pathname) ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
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

function accountIntegrationsRedirect(status: string): never {
  redirect(`/account/integrations?integration=${encodeURIComponent(status)}`);
}

function readRequiredString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readTurnstileCaptchaToken(formData: FormData) {
  const value = formData.get(turnstileTokenFieldName);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAuthCaptchaOptions(formData: FormData): { captchaToken: string } | undefined {
  const captchaToken = readTurnstileCaptchaToken(formData);
  return captchaToken ? { captchaToken } : undefined;
}

async function getOrigin() {
  return getAuthRedirectOrigin();
}

function normalizeHttpOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function normalizeHeaderHost(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() || null;
}

function getAllowedAuthRedirectOrigins() {
  return new Set(
    [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGINS?.split(",") ?? [])]
      .map((value) => normalizeHttpOrigin(value?.trim()))
      .filter((value): value is string => Boolean(value))
  );
}

function isTrustedRequestOrigin(origin: string | null, headerStore: Headers) {
  const normalizedOrigin = normalizeHttpOrigin(origin);

  if (!normalizedOrigin) {
    return null;
  }

  if (getAllowedAuthRedirectOrigins().has(normalizedOrigin)) {
    return normalizedOrigin;
  }

  const originHost = normalizeHeaderHost(new URL(normalizedOrigin).host);
  const requestHosts = [headerStore.get("x-forwarded-host"), headerStore.get("host")].map(normalizeHeaderHost);

  return originHost && requestHosts.includes(originHost) ? normalizedOrigin : null;
}

async function getAuthRedirectOrigin() {
  const configuredOrigin = normalizeHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const headerStore = await headers();
  return isTrustedRequestOrigin(headerStore.get("origin"), headerStore) ?? localDevelopmentOrigin;
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const next = safeNextPath(readRequiredString(formData, "next"));
  const captchaOptions = getAuthCaptchaOptions(formData);

  if (!email || !password) {
    redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "credentials-required");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "supabase-env-missing");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password, options: captchaOptions });

  if (error) {
    redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "login-error");
  }

  await clearRecoverySessionPending();
  redirectWithAuth(next, "signed-in");
}

export async function signUpWithPasswordAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const next = safeNextPath(readRequiredString(formData, "next"));
  const captchaOptions = getAuthCaptchaOptions(formData);

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
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      ...captchaOptions
    }
  });

  if (error) {
    redirectWithAuth("/signup", "signup-error");
  }

  redirectWithAuth(`/login?next=${encodeURIComponent(next)}`, "signup-check-email");
}

export async function resetPasswordEmailAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const captchaOptions = getAuthCaptchaOptions(formData);

  if (!email) {
    redirectWithAuth("/reset-password", "email-required");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth("/reset-password", "supabase-env-missing");
  }

  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/account/security`,
    ...captchaOptions
  });

  if (error) {
    redirectWithAuth("/reset-password", "reset-error");
  }

  redirectWithAuth("/reset-password", "reset-email-sent");
}

export async function updatePasswordAction(formData: FormData) {
  const recoveryPending = await isRecoverySessionPending();
  const currentPassword = readRequiredString(formData, "currentPassword");
  const password = readRequiredString(formData, "password");
  const passwordConfirm = readRequiredString(formData, "passwordConfirm");

  if (!password || !passwordConfirm) {
    redirectWithAuth("/account/security", "password-required");
  }

  const passwordAttributes: { password: string; current_password?: string } = { password };

  if (!recoveryPending) {
    if (!currentPassword) {
      redirectWithAuth("/account/security", "current-password-required");
    }

    passwordAttributes.current_password = currentPassword;
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

  const { error } = await supabase.auth.updateUser(recoveryPending ? { password } : passwordAttributes);

  if (error) {
    redirectWithAuth("/account/security", "password-update-error");
  }

  if (recoveryPending) {
    await supabase.auth.signOut();
    await clearRecoverySessionPending();
    redirectWithAuth("/login", "password-updated");
  }

  await clearRecoverySessionPending();
  redirectWithAuth("/account", "password-updated");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectWithAuth("/login", "supabase-env-missing");
  }

  await supabase.auth.signOut();
  await clearRecoverySessionPending();
  redirectWithAuth("/login", "signed-out");
}

export async function saveLocaleThemePreferenceAction(formData: FormData) {
  const locale = normalizeLocale(readRequiredString(formData, "locale"));
  const theme = normalizeThemePreference(readRequiredString(formData, "theme"));
  const timeZone = normalizeTimeZonePreference(readRequiredString(formData, "timeZone"));

  if (!locale || !theme || !timeZone) {
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
      time_zone: timeZone,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    accountRedirect("preference-save-error");
  }

  accountRedirect("preferences-saved");
}

export async function startYouTubeIntegrationConnectAction() {
  const accountSession = await getAccountSessionState();
  if (accountSession.authStatus !== "signed-in" || !accountSession.user) {
    accountIntegrationsRedirect("youtube-oauth-sign-in-required");
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    accountIntegrationsRedirect("youtube-oauth-private-launch-gated");
  }

  const oauthRedirect = await startYouTubeOAuthConnectRedirect({
    accountSessionUserId: accountSession.user.id
  });

  if (oauthRedirect.status === "blocked") {
    accountIntegrationsRedirect(oauthRedirect.reason);
  }

  redirect(oauthRedirect.authorizationUrl);
}

export async function reconnectYouTubeIntegrationAction() {
  const accountSession = await getAccountSessionState();
  if (accountSession.authStatus !== "signed-in" || !accountSession.user) {
    accountIntegrationsRedirect("youtube-oauth-sign-in-required");
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    accountIntegrationsRedirect("youtube-oauth-private-launch-gated");
  }

  const oauthRedirect = await startYouTubeOAuthReconnectRedirect({
    accountSessionUserId: accountSession.user.id
  });

  if (oauthRedirect.status === "blocked") {
    accountIntegrationsRedirect(oauthRedirect.reason);
  }

  redirect(oauthRedirect.authorizationUrl);
}

export async function disconnectYouTubeIntegrationAction() {
  const accountSession = await getAccountSessionState();
  if (accountSession.authStatus !== "signed-in" || !accountSession.user) {
    accountIntegrationsRedirect("youtube-oauth-sign-in-required");
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });
  if (launchAccess.status === "blocked") {
    accountIntegrationsRedirect("youtube-oauth-private-launch-gated");
  }

  const credentialReference = readYouTubeAccountIntegrationCredentialReference({ accountSession });
  if (credentialReference.status === "unavailable") {
    accountIntegrationsRedirect(
      credentialReference.reason === "credential-resolution-disabled"
        ? "youtube-oauth-disabled"
        : credentialReference.reason === "credential-reference-env-missing"
          ? "youtube-oauth-env-missing"
          : "youtube-oauth-sign-in-required"
    );
  }

  const trustedDisconnectRuntime = createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime();
  const disconnectResult = await readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId: credentialReference.credentialReferenceId,
    trustedDisconnectAdapter: trustedDisconnectRuntime.trustedDisconnectAdapter,
    callerAuthorization: credentialReference.callerAuthorization,
    credentialResolutionDisabled: false
  });

  if (disconnectResult.status === "disconnected") {
    accountIntegrationsRedirect("youtube-disconnect-disconnected");
  }

  if (disconnectResult.status === "already-disconnected") {
    accountIntegrationsRedirect("youtube-disconnect-already-disconnected");
  }

  if (disconnectResult.status === "disconnect-failed") {
    accountIntegrationsRedirect("youtube-disconnect-failed");
  }

  accountIntegrationsRedirect("youtube-disconnect-unavailable");
}
