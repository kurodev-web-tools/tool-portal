export type YouTubeAccountIntegrationStatus = "not-connected" | "ready" | "reconnect-required" | "unavailable";

export type YouTubeAccountIntegrationViewModel = {
  provider: "youtube";
  status: YouTubeAccountIntegrationStatus;
  reconnectRequired: boolean;
  canConnect: boolean;
  canReconnect: boolean;
  canDisconnect: boolean;
  scopeLabel: "youtube.readonly";
  statusSource: "account-entry-sanitized-fallback";
  clientReadableStatus: "sanitized-connection-readiness-only";
  backgroundMonitoring: "not-started-by-connection";
  liveProviderExecution: "forbidden-in-account-integrations-entry";
  browserStorage: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change";
  providerTargetMetadata: "server-only-not-displayed";
};

export const youtubeAccountIntegrationEntryContract = {
  provider: "youtube",
  route: "/account/integrations",
  clientReadableStatus: "sanitized-connection-readiness-only",
  clientReadableFields: ["provider", "status", "reconnectRequired", "scopeLabel"],
  forbiddenClientFields: [
    "oauth-access-token",
    "oauth-refresh-token",
    "authorization-code",
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
  status: YouTubeAccountIntegrationStatus = "not-connected"
): YouTubeAccountIntegrationViewModel {
  return {
    provider: "youtube",
    status,
    reconnectRequired: status === "reconnect-required" || status === "unavailable",
    canConnect: status === "not-connected" || status === "unavailable",
    canReconnect: status === "reconnect-required",
    canDisconnect: status === "ready" || status === "reconnect-required",
    scopeLabel: "youtube.readonly",
    statusSource: "account-entry-sanitized-fallback",
    clientReadableStatus: youtubeAccountIntegrationEntryContract.clientReadableStatus,
    backgroundMonitoring: youtubeAccountIntegrationEntryContract.backgroundMonitoring,
    liveProviderExecution: youtubeAccountIntegrationEntryContract.liveProviderExecution,
    browserStorage: youtubeAccountIntegrationEntryContract.browserStorage,
    providerTargetMetadata: youtubeAccountIntegrationEntryContract.providerTargetMetadata
  };
}
