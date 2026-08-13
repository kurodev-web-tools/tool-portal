import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CommentTranslatorPaidRegionCode = "JP" | "US";

export type CommentTranslatorPaidRegionDecision =
  | {
      status: "allowed";
      country: CommentTranslatorPaidRegionCode;
    }
  | {
      status: "denied";
      reason: "region-unavailable" | "unsupported-region";
      country: null;
    };

type CloudflareRequestContext = {
  cf?: {
    country?: unknown;
  } | null;
};

export const commentTranslatorPaidRegionGateContract = {
  implementationStage: "comment-translator-paid-v1-task4-server-region-gate",
  runtime: "server-only",
  sourceOfTruth: "cloudflare-request.cf.country",
  allowedRegions: ["JP", "US"] as const,
  clientSuppliedGeoAuthority: "forbidden",
  requestHeaderGeoAuthority: "forbidden",
  persistence: "forbidden",
  externalGeoIp: "forbidden",
  failClosed: "missing-unknown-and-unsupported-country-denied"
} as const;

export function evaluateCommentTranslatorPaidRegion({
  requestCfCountry
}: {
  requestCfCountry: unknown;
}): CommentTranslatorPaidRegionDecision {
  if (typeof requestCfCountry !== "string" || requestCfCountry.trim().length === 0) {
    return {
      status: "denied",
      reason: "region-unavailable",
      country: null
    };
  }

  const country = requestCfCountry.trim();
  if (country === "JP" || country === "US") {
    return {
      status: "allowed",
      country
    };
  }

  return {
    status: "denied",
    reason: "unsupported-region",
    country: null
  };
}

export function readCommentTranslatorPaidRegionFromCloudflareContext(): CommentTranslatorPaidRegionDecision {
  try {
    const context = getCloudflareContext() as unknown as CloudflareRequestContext;
    return evaluateCommentTranslatorPaidRegion({
      requestCfCountry: context.cf?.country
    });
  } catch {
    return {
      status: "denied",
      reason: "region-unavailable",
      country: null
    };
  }
}
