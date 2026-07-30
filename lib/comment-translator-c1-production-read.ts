import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  runCommentTranslatorC1ContainerBoundary,
  type CommentTranslatorC1ContainerNamespace,
} from "./comment-translator-c1-container-boundary";

export type CommentTranslatorC1BillingState =
  | "paid-active"
  | "paid-inactive"
  | "missing"
  | "unavailable";

type ProductionReadInput = {
  readonly billingUserReferenceId: `ctbill_${string}`;
  readonly environment?: Record<string, string | undefined>;
  readonly containerNamespace?: CommentTranslatorC1ContainerNamespace | null;
};

const containerName = "creator-billing-entitlement-read-v1";

export async function readCommentTranslatorC1ProductionBillingState({
  billingUserReferenceId,
  environment = process.env,
  containerNamespace,
}: ProductionReadInput): Promise<CommentTranslatorC1BillingState> {
  const endpoint = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const credential = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!endpoint || !credential) return "unavailable";

  const namespace = containerNamespace ?? readContainerNamespace();
  if (!namespace) return "unavailable";

  const inputs = [
    new TextEncoder().encode(endpoint),
    new TextEncoder().encode(credential),
    new TextEncoder().encode(billingUserReferenceId),
  ] as const;
  const attemptBytes = crypto.getRandomValues(new Uint8Array(32));
  const attemptKey = Array.from(attemptBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  attemptBytes.fill(0);

  const result = await runCommentTranslatorC1ContainerBoundary({
    container: namespace.getByName(containerName),
    attemptKey,
    endpoint: inputs[0],
    credential: inputs[1],
    billingReference: inputs[2],
  });
  if (result.executionStatus !== "pass") return "unavailable";
  if (result.resultStatus === "missing") return "missing";
  return result.billingState ?? "unavailable";
}

function readContainerNamespace(): CommentTranslatorC1ContainerNamespace | null {
  try {
    return getCloudflareContext().env.COMMENT_TRANSLATOR_C1_CONTAINER;
  } catch {
    return null;
  }
}
