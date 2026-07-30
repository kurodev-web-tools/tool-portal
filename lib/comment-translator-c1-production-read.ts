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

const terminationStatuses = [
  "aborted",
  "binding-unavailable",
  "container-boundary-unavailable",
  "input-unavailable",
  "invalid-boundary",
  "invalid-result",
  "late-success-suppressed",
  "parent-and-child-exited-zero",
  "process-failed",
  "repeat-suppressed",
  "runtime-error",
  "termination-unobserved",
] as const;
type CommentTranslatorC1ProofTerminationStatus =
  (typeof terminationStatuses)[number];

export type CommentTranslatorC1ProductionBillingProof = Readonly<{
  bindingStatus: "available" | "unavailable";
  containerReachabilityStatus: "reachable" | "unavailable";
  executionStatus: "pass" | "fail-closed";
  resultStatus: "available" | "missing" | "unavailable";
  billingState: "paid-active" | "paid-inactive" | null;
  terminationStatus: CommentTranslatorC1ProofTerminationStatus;
  bindingAcquisitionCount: 0 | 1;
  containerInvocationCount: 0 | 1;
  parentExitCodeObserved: boolean;
  childExitCodeObserved: boolean;
  parentBufferZeroFillCount: number;
  childBufferZeroFillCount: number;
  childConstructionAttemptCount: number;
  childReadAttemptCount: number;
}>;

type ProductionReadInput = {
  readonly billingUserReferenceId: `ctbill_${string}`;
  readonly environment?: Record<string, string | undefined>;
  readonly containerNamespace?: CommentTranslatorC1ContainerNamespace | null;
};

type ProductionProofInput = ProductionReadInput & {
  readonly attemptKey: string;
};

const containerName = "creator-billing-entitlement-read-v1";

export async function readCommentTranslatorC1ProductionBillingState({
  billingUserReferenceId,
  environment = process.env,
  containerNamespace,
}: ProductionReadInput): Promise<CommentTranslatorC1BillingState> {
  const attemptBytes = crypto.getRandomValues(new Uint8Array(32));
  const attemptKey = Array.from(attemptBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  attemptBytes.fill(0);

  const result = await readCommentTranslatorC1ProductionBillingProof({
    billingUserReferenceId,
    attemptKey,
    environment,
    containerNamespace,
  });
  if (result.executionStatus !== "pass") return "unavailable";
  if (result.resultStatus === "missing") return "missing";
  return result.billingState ?? "unavailable";
}

export async function readCommentTranslatorC1ProductionBillingProof({
  billingUserReferenceId,
  attemptKey,
  environment = process.env,
  containerNamespace,
}: ProductionProofInput): Promise<CommentTranslatorC1ProductionBillingProof> {
  const endpoint = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const credential = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!endpoint || !credential || !/^[a-f0-9]{64}$/.test(attemptKey)) {
    return unavailable("input-unavailable");
  }

  const namespace = containerNamespace ?? readContainerNamespace();
  if (!namespace) return unavailable("binding-unavailable");

  let container;
  try {
    container = namespace.getByName(containerName);
  } catch {
    return unavailable("binding-unavailable");
  }

  const inputs = [
    new TextEncoder().encode(endpoint),
    new TextEncoder().encode(credential),
    new TextEncoder().encode(billingUserReferenceId),
  ] as const;
  const result = await runCommentTranslatorC1ContainerBoundary({
    container,
    attemptKey,
    endpoint: inputs[0],
    credential: inputs[1],
    billingReference: inputs[2],
  });
  const terminationStatus = isProofTerminationStatus(result.terminationStatus)
    ? result.terminationStatus
    : "invalid-result";
  const isReachable =
    terminationStatus !== "container-boundary-unavailable";

  return Object.freeze({
    bindingStatus: "available",
    containerReachabilityStatus: isReachable ? "reachable" : "unavailable",
    executionStatus:
      terminationStatus === "invalid-result"
        ? "fail-closed"
        : result.executionStatus,
    resultStatus:
      terminationStatus === "invalid-result"
        ? "unavailable"
        : result.resultStatus,
    billingState:
      terminationStatus === "invalid-result" ? null : result.billingState,
    terminationStatus,
    bindingAcquisitionCount: 1,
    containerInvocationCount: 1,
    parentExitCodeObserved: result.parentExitCodeObserved,
    childExitCodeObserved: result.childExitCodeObserved,
    parentBufferZeroFillCount: result.parentBufferZeroFillCount,
    childBufferZeroFillCount: result.childBufferZeroFillCount,
    childConstructionAttemptCount: result.childConstructionAttemptCount,
    childReadAttemptCount: result.childReadAttemptCount,
  });
}

function readContainerNamespace(): CommentTranslatorC1ContainerNamespace | null {
  try {
    return getCloudflareContext().env.COMMENT_TRANSLATOR_C1_CONTAINER;
  } catch {
    return null;
  }
}

function unavailable(
  terminationStatus: Extract<
    CommentTranslatorC1ProofTerminationStatus,
    "binding-unavailable" | "input-unavailable"
  >,
): CommentTranslatorC1ProductionBillingProof {
  return Object.freeze({
    bindingStatus: "unavailable",
    containerReachabilityStatus: "unavailable",
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    billingState: null,
    terminationStatus,
    bindingAcquisitionCount: 0,
    containerInvocationCount: 0,
    parentExitCodeObserved: false,
    childExitCodeObserved: false,
    parentBufferZeroFillCount: 0,
    childBufferZeroFillCount: 0,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
  });
}

function isProofTerminationStatus(
  value: string,
): value is CommentTranslatorC1ProofTerminationStatus {
  return terminationStatuses.some((status) => status === value);
}
