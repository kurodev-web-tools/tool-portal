import "server-only";

import type { CommentTranslatorPrivateLaunchAccess } from "./comment-translator-private-launch-access-gate";

export type CommentTranslatorFreeBetaPreviewRateLimitSmokeOverrideEnv = Record<string, string | undefined>;

export type CommentTranslatorFreeBetaPreviewRateLimitSmokeOverride =
  | {
      status: "active";
      translatedMessagesPerMinute: 5;
      activation: "cloudflare-preview-exact-marker-allowed-tester";
    }
  | {
      status: "inactive";
      translatedMessagesPerMinute: 30;
      activation: "normal-free-limit";
    };

const smokeMarkerEnv = "COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE";
const cloudflareRuntimeChannelEnv = "COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL";
const smokeMarkerLabel = "cloudflare-preview-rate-limit-smoke-reviewed";
const cloudflarePreviewRuntimeChannel = "cloudflare-preview";

export const commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract = {
  runtime: "server-only",
  targetEnvironment: "cloudflare-preview-only",
  activation: "exact-marker-plus-cloudflare-preview-runtime-channel-plus-allowed-tester",
  smokeMarkerEnv,
  runtimeChannelEnv: cloudflareRuntimeChannelEnv,
  markerLabel: smokeMarkerLabel,
  defaultTranslatedMessagesPerMinute: 30,
  smokeTranslatedMessagesPerMinute: 5,
  browserReadableOutput: "sanitized-usage-and-stop-reason-only",
  publicLaunchAllowed: false
} as const;

export function resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
  env = process.env,
  privateLaunchAccess
}: {
  env?: CommentTranslatorFreeBetaPreviewRateLimitSmokeOverrideEnv;
  privateLaunchAccess: CommentTranslatorPrivateLaunchAccess;
}): CommentTranslatorFreeBetaPreviewRateLimitSmokeOverride {
  if (
    privateLaunchAccess.status !== "allowed" ||
    env[cloudflareRuntimeChannelEnv]?.trim() !== cloudflarePreviewRuntimeChannel ||
    env[smokeMarkerEnv]?.trim() !== smokeMarkerLabel
  ) {
    return {
      status: "inactive",
      translatedMessagesPerMinute: 30,
      activation: "normal-free-limit"
    };
  }

  return {
    status: "active",
    translatedMessagesPerMinute: 5,
    activation: "cloudflare-preview-exact-marker-allowed-tester"
  };
}
