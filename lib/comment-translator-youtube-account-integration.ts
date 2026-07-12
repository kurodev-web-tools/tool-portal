import type { YouTubeOAuthCredentialBrowserReadableStatus } from "./comment-translator-youtube-credential-status-boundary";

export type YouTubeAccountIntegrationStatus =
  | "connected"
  | "reconnect-required"
  | "disconnected"
  | "unavailable"
  | "error";

export type YouTubeAccountIntegrationViewModel = {
  provider: "youtube";
  status: YouTubeAccountIntegrationStatus;
  reconnectRequired: boolean;
  canConnect: boolean;
  canReconnect: boolean;
  canDisconnect: boolean;
  scopeLabel: "youtube.readonly";
  statusSource: "trusted-credential-status" | "account-entry-sanitized-fallback";
  clientReadableStatus: "sanitized-connection-readiness-only";
  backgroundMonitoring: "not-started-by-connection";
  liveProviderExecution: "forbidden-in-account-integrations-entry";
  browserStorage: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
};

export const youtubeAccountIntegrationTrustedStatusWiringContract = {
  provider: "youtube",
  route: "/account/integrations",
  statusSource: "trusted-credential-status",
  safeStates: ["connected", "reconnect-required", "disconnected", "unavailable", "error"],
  clientReadableStatus: "sanitized-connection-readiness-only",
  clientReadableFields: ["provider", "status", "reconnectRequired", "scopeLabel", "actionAvailability"],
  forbiddenClientFields: [
    "oauth-access-token",
    "oauth-refresh-token",
    "authorization-code",
    "credential-reference-id",
    "owner-user-id",
    "provider-channel-id",
    "liveChatId",
    "service-role-key",
    "authorization-header",
    "provider-target-metadata"
  ],
  backgroundMonitoring: "not-started-by-connection",
  liveProviderExecution: "forbidden-in-account-integrations-entry",
  browserStorage: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
  providerTargetMetadata: "server-only-not-displayed"
} as const;

export function createYouTubeAccountIntegrationViewModel(
  status: YouTubeAccountIntegrationStatus = "disconnected"
): YouTubeAccountIntegrationViewModel {
  return {
    provider: "youtube",
    status,
    reconnectRequired: status === "reconnect-required" || status === "unavailable" || status === "error",
    canConnect: status === "disconnected",
    canReconnect: status === "reconnect-required",
    canDisconnect: status === "connected" || status === "reconnect-required",
    scopeLabel: "youtube.readonly",
    statusSource: "account-entry-sanitized-fallback",
    clientReadableStatus: youtubeAccountIntegrationTrustedStatusWiringContract.clientReadableStatus,
    backgroundMonitoring: youtubeAccountIntegrationTrustedStatusWiringContract.backgroundMonitoring,
    liveProviderExecution: youtubeAccountIntegrationTrustedStatusWiringContract.liveProviderExecution,
    browserStorage: youtubeAccountIntegrationTrustedStatusWiringContract.browserStorage
  };
}

export function createYouTubeAccountIntegrationViewModelFromCredentialStatus(
  status: YouTubeOAuthCredentialBrowserReadableStatus
): YouTubeAccountIntegrationViewModel {
  const accountStatus = mapCredentialStatusToAccountIntegrationStatus(status);

  return {
    ...createYouTubeAccountIntegrationViewModel(accountStatus),
    statusSource: "trusted-credential-status"
  };
}

function mapCredentialStatusToAccountIntegrationStatus(
  status: YouTubeOAuthCredentialBrowserReadableStatus
): YouTubeAccountIntegrationStatus {
  if (status.status === "available") {
    return "connected";
  }

  if (status.status === "reconnect-required") {
    return "reconnect-required";
  }

  if (status.status === "disconnected") {
    return "disconnected";
  }

  if (status.status === "error") {
    return "error";
  }

  return "unavailable";
}
