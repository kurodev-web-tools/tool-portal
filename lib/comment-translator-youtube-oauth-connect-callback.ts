import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isYouTubeOAuthCredentialResolutionDisabled } from "./comment-translator-youtube-token-store-runtime";

const googleOAuthAuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly";
const stateCookieName = "__Host-kuro_youtube_oauth_state";
const stateTtlMs = 10 * 60 * 1000;

const envReferenceNames = {
  clientId: "GOOGLE_OAUTH_CLIENT_ID",
  clientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
  redirectUri: "GOOGLE_OAUTH_REDIRECT_URI",
  stateSecret: "YOUTUBE_OAUTH_STATE_SECRET",
  siteUrl: "NEXT_PUBLIC_SITE_URL",
  credentialResolutionDisabled: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  redirectAllowedPaths: "YOUTUBE_OAUTH_REDIRECT_ALLOWED_PATHS"
} as const;

export type YouTubeOAuthIntent = "connect" | "reconnect";

export type YouTubeOAuthSanitizedStatus =
  | "youtube-oauth-ready"
  | "youtube-oauth-connected"
  | "youtube-oauth-reconnect-required"
  | "youtube-oauth-disabled"
  | "youtube-oauth-env-missing"
  | "youtube-oauth-state-missing"
  | "youtube-oauth-state-mismatch"
  | "youtube-oauth-state-expired"
  | "youtube-oauth-denied"
  | "youtube-oauth-callback-error"
  | "youtube-oauth-private-launch-gated"
  | "youtube-oauth-sign-in-required"
  | "youtube-oauth-token-store-blocked";

type YouTubeOAuthStateCookiePayload = {
  provider: "youtube";
  intent: YouTubeOAuthIntent;
  issuedAtMs: number;
  expiresAtMs: number;
  redirectPath: YouTubeOAuthRedirectPath;
  stateHash: string;
  accountSessionHash: string;
};

type SignedStateCookie = {
  payload: YouTubeOAuthStateCookiePayload;
  signature: string;
};

type YouTubeOAuthRedirectPath = "/account/integrations" | "/tools/comment-translator";

type YouTubeOAuthEnvReadiness =
  | {
      status: "ready";
      clientId: string;
      redirectUri: string;
      stateSecret: string;
    }
  | {
      status: "disabled";
    }
  | {
      status: "missing";
    };

export const youtubeOAuthConnectCallbackImplementationContract = {
  runtime: "server-only",
  provider: "youtube",
  scopeLabel: "youtube.readonly",
  oauthAuthorizationEndpoint: googleOAuthAuthorizationEndpoint,
  oauthScope: youtubeReadonlyOAuthScope,
  callbackRoute: "/api/comment-translator/youtube/oauth/callback",
  stateCookie: {
    name: stateCookieName,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAgeSeconds: Math.floor(stateTtlMs / 1000)
  },
  envReferenceNames,
  disabledStatus: "youtube-oauth-disabled",
  envMissingStatus: "youtube-oauth-env-missing",
  validCallbackWithoutPersistenceStatus: "youtube-oauth-token-store-blocked",
  tokenExchange: "not-implemented-in-task-3",
  tokenPersistence: "blocked-until-task-4",
  liveGoogleOAuthExecution: "not-run-by-this-task",
  forbiddenOutput: [
    "authorization-code-value",
    "oauth-access-token-value",
    "oauth-refresh-token-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "authorization-header-value",
    "provider-target-metadata",
    "browser-storage-payload",
    "handoff-payload"
  ]
} as const;

export function readYouTubeOAuthEnvReadiness(
  env: Record<string, string | undefined> = process.env
): YouTubeOAuthEnvReadiness {
  if (
    isYouTubeOAuthCredentialResolutionDisabled({
      [envReferenceNames.credentialResolutionDisabled]: env[envReferenceNames.credentialResolutionDisabled]
    })
  ) {
    return { status: "disabled" };
  }

  const clientId = readEnvReference(env, envReferenceNames.clientId);
  const clientSecret = readEnvReference(env, envReferenceNames.clientSecret);
  const redirectUri = readEnvReference(env, envReferenceNames.redirectUri);
  const stateSecret = readEnvReference(env, envReferenceNames.stateSecret);
  const siteUrl = readEnvReference(env, envReferenceNames.siteUrl);

  if (!clientId || !clientSecret || !redirectUri || !stateSecret || !siteUrl) {
    return { status: "missing" };
  }

  return {
    status: "ready",
    clientId,
    redirectUri,
    stateSecret
  };
}

export async function buildYouTubeOAuthAuthorizationUrl({
  intent,
  accountSessionUserId,
  redirectPath = "/account/integrations",
  nowMs = Date.now(),
  env = process.env
}: {
  intent: YouTubeOAuthIntent;
  accountSessionUserId: string;
  redirectPath?: string | null;
  nowMs?: number;
  env?: Record<string, string | undefined>;
}): Promise<
  | {
      status: "ready";
      authorizationUrl: string;
    }
  | {
      status: "blocked";
      reason: Extract<YouTubeOAuthSanitizedStatus, "youtube-oauth-disabled" | "youtube-oauth-env-missing">;
    }
> {
  const envReadiness = readYouTubeOAuthEnvReadiness(env);

  if (envReadiness.status === "disabled") {
    return {
      status: "blocked",
      reason: "youtube-oauth-disabled"
    };
  }

  if (envReadiness.status === "missing") {
    return {
      status: "blocked",
      reason: "youtube-oauth-env-missing"
    };
  }

  const state = randomBytes(32).toString("base64url");
  const allowedRedirectPath = normalizeYouTubeOAuthRedirectPath(redirectPath, env);
  const cookieValue = createYouTubeOAuthStateCookieValue({
    accountSessionUserId,
    intent,
    nowMs,
    redirectPath: allowedRedirectPath,
    state,
    stateSecret: envReadiness.stateSecret
  });

  const cookieStore = await cookies();
  cookieStore.set(stateCookieName, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(stateTtlMs / 1000)
  });

  return {
    status: "ready",
    authorizationUrl: createGoogleOAuthAuthorizationUrl({
      clientId: envReadiness.clientId,
      redirectUri: envReadiness.redirectUri,
      state
    })
  };
}

export async function startYouTubeOAuthConnectRedirect({
  accountSessionUserId
}: {
  accountSessionUserId: string;
}) {
  return buildYouTubeOAuthAuthorizationUrl({
    intent: "connect",
    accountSessionUserId
  });
}

export async function startYouTubeOAuthReconnectRedirect({
  accountSessionUserId
}: {
  accountSessionUserId: string;
}) {
  return buildYouTubeOAuthAuthorizationUrl({
    intent: "reconnect",
    accountSessionUserId
  });
}

export function createYouTubeOAuthStateCookieValue({
  accountSessionUserId,
  intent,
  nowMs,
  redirectPath,
  state,
  stateSecret
}: {
  accountSessionUserId: string;
  intent: YouTubeOAuthIntent;
  nowMs: number;
  redirectPath: YouTubeOAuthRedirectPath;
  state: string;
  stateSecret: string;
}) {
  const payload: YouTubeOAuthStateCookiePayload = {
    provider: "youtube",
    intent,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + stateTtlMs,
    redirectPath,
    stateHash: signReference(stateSecret, state),
    accountSessionHash: signReference(stateSecret, `account:${accountSessionUserId}`)
  };
  const payloadText = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signReference(stateSecret, payloadText);
  const signedCookie: SignedStateCookie = { payload, signature };

  return Buffer.from(JSON.stringify(signedCookie), "utf8").toString("base64url");
}

export async function validateYouTubeOAuthCallbackRequest({
  requestUrl,
  accountSessionUserId,
  privateLaunchAllowed,
  nowMs = Date.now(),
  env = process.env
}: {
  requestUrl: URL;
  accountSessionUserId: string | null;
  privateLaunchAllowed: boolean;
  nowMs?: number;
  env?: Record<string, string | undefined>;
}): Promise<{
  status: YouTubeOAuthSanitizedStatus;
  redirectPath: "/account/integrations";
}> {
  const envReadiness = readYouTubeOAuthEnvReadiness(env);
  const cookieStore = await cookies();

  if (envReadiness.status === "disabled") {
    cookieStore.delete(stateCookieName);
    return createCallbackDecision("youtube-oauth-disabled");
  }

  if (envReadiness.status === "missing") {
    cookieStore.delete(stateCookieName);
    return createCallbackDecision("youtube-oauth-env-missing");
  }

  if (!accountSessionUserId) {
    return createCallbackDecision("youtube-oauth-sign-in-required");
  }

  if (!privateLaunchAllowed) {
    return createCallbackDecision("youtube-oauth-private-launch-gated");
  }

  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    cookieStore.delete(stateCookieName);
    return createCallbackDecision(providerError === "access_denied" ? "youtube-oauth-denied" : "youtube-oauth-callback-error");
  }

  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const cookieValue = cookieStore.get(stateCookieName)?.value ?? null;
  cookieStore.delete(stateCookieName);

  if (!state || !cookieValue) {
    return createCallbackDecision("youtube-oauth-state-missing");
  }

  const parsedState = parseYouTubeOAuthStateCookieValue(cookieValue, envReadiness.stateSecret);

  if (!parsedState || parsedState.provider !== "youtube") {
    return createCallbackDecision("youtube-oauth-state-mismatch");
  }

  if (parsedState.expiresAtMs < nowMs) {
    return createCallbackDecision("youtube-oauth-state-expired");
  }

  if (
    !safeEqual(parsedState.stateHash, signReference(envReadiness.stateSecret, state)) ||
    !safeEqual(parsedState.accountSessionHash, signReference(envReadiness.stateSecret, `account:${accountSessionUserId}`))
  ) {
    return createCallbackDecision("youtube-oauth-state-mismatch");
  }

  if (!code) {
    return createCallbackDecision("youtube-oauth-callback-error");
  }

  return createCallbackDecision("youtube-oauth-token-store-blocked");
}

export function buildYouTubeOAuthCallbackRedirect(status: YouTubeOAuthSanitizedStatus, origin: string) {
  const redirectUrl = new URL("/account/integrations", origin);
  redirectUrl.searchParams.set("integration", status);
  return redirectUrl;
}

export function clearYouTubeOAuthStateCookie() {
  return {
    name: stateCookieName,
    options: {
      path: "/"
    }
  } as const;
}

function createGoogleOAuthAuthorizationUrl({
  clientId,
  redirectUri,
  state
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(googleOAuthAuthorizationEndpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", youtubeReadonlyOAuthScope);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

function parseYouTubeOAuthStateCookieValue(value: string, stateSecret: string): YouTubeOAuthStateCookiePayload | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const signedCookie = JSON.parse(decoded) as Partial<SignedStateCookie>;

    if (!signedCookie.payload || !signedCookie.signature) {
      return null;
    }

    const payloadText = Buffer.from(JSON.stringify(signedCookie.payload), "utf8").toString("base64url");
    if (!safeEqual(signedCookie.signature, signReference(stateSecret, payloadText))) {
      return null;
    }

    return isYouTubeOAuthStateCookiePayload(signedCookie.payload) ? signedCookie.payload : null;
  } catch {
    return null;
  }
}

function isYouTubeOAuthStateCookiePayload(value: unknown): value is YouTubeOAuthStateCookiePayload {
  const payload = value as Partial<YouTubeOAuthStateCookiePayload>;
  return (
    payload?.provider === "youtube" &&
    (payload.intent === "connect" || payload.intent === "reconnect") &&
    typeof payload.issuedAtMs === "number" &&
    typeof payload.expiresAtMs === "number" &&
    (payload.redirectPath === "/account/integrations" || payload.redirectPath === "/tools/comment-translator") &&
    typeof payload.stateHash === "string" &&
    typeof payload.accountSessionHash === "string"
  );
}

function readEnvReference(env: Record<string, string | undefined>, name: string) {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeYouTubeOAuthRedirectPath(
  path: string | null | undefined,
  env: Record<string, string | undefined>
): YouTubeOAuthRedirectPath {
  const defaultAllowed = new Set<YouTubeOAuthRedirectPath>(["/account/integrations", "/tools/comment-translator"]);
  const configuredAllowed = new Set(
    (env[envReferenceNames.redirectAllowedPaths] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is YouTubeOAuthRedirectPath => defaultAllowed.has(value as YouTubeOAuthRedirectPath))
  );
  const allowed = configuredAllowed.size > 0 ? configuredAllowed : defaultAllowed;

  return path && allowed.has(path as YouTubeOAuthRedirectPath) ? (path as YouTubeOAuthRedirectPath) : "/account/integrations";
}

function createCallbackDecision(status: YouTubeOAuthSanitizedStatus) {
  return {
    status,
    redirectPath: "/account/integrations" as const
  };
}

function signReference(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
