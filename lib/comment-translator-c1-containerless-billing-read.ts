import "server-only";

export const commentTranslatorC1ContainerlessBillingReadContract = {
  schemaName: "comment_translator_api",
  functionName: "read_comment_translator_billing_state_v1",
  argumentCount: 0,
  resultFieldCount: 2,
  productionConsumer: "not-switched-in-phase-1"
} as const;

export type CommentTranslatorC1BillingProjection =
  | {
      readonly resultStatus: "available";
      readonly billingState: "paid-active" | "paid-inactive";
    }
  | {
      readonly resultStatus: "missing" | "unavailable";
      readonly billingState: null;
    };

type CommentTranslatorC1BillingAuthStatus =
  | "signed-in"
  | "signed-out"
  | "recovery-pending"
  | "unavailable";

type CommentTranslatorC1BillingRpcResult = {
  readonly data: unknown;
  readonly error: unknown;
};

type CommentTranslatorC1BillingSchemaClient = {
  readonly rpc: (
    functionName: typeof commentTranslatorC1ContainerlessBillingReadContract.functionName
  ) => PromiseLike<CommentTranslatorC1BillingRpcResult>;
};

type CommentTranslatorC1BillingSupabaseClient = {
  readonly schema: (
    schemaName: typeof commentTranslatorC1ContainerlessBillingReadContract.schemaName
  ) => CommentTranslatorC1BillingSchemaClient;
};

const unavailableProjection: CommentTranslatorC1BillingProjection = {
  resultStatus: "unavailable",
  billingState: null
};

export function parseCommentTranslatorC1BillingProjection(
  value: unknown
): CommentTranslatorC1BillingProjection {
  if (!Array.isArray(value) || value.length !== 1) {
    return unavailableProjection;
  }

  const row = value[0];
  if (!isRecord(row)) {
    return unavailableProjection;
  }

  const keys = Object.keys(row).sort();
  if (
    keys.length !== commentTranslatorC1ContainerlessBillingReadContract.resultFieldCount
    || keys[0] !== "billing_state"
    || keys[1] !== "result_status"
  ) {
    return unavailableProjection;
  }

  const resultStatus = row["result_status"];
  const billingState = row["billing_state"];

  if (
    resultStatus === "available"
    && (billingState === "paid-active" || billingState === "paid-inactive")
  ) {
    return { resultStatus, billingState };
  }

  if (
    (resultStatus === "missing" || resultStatus === "unavailable")
    && billingState === null
  ) {
    return { resultStatus, billingState };
  }

  return unavailableProjection;
}

export async function readCommentTranslatorC1ContainerlessBillingProjection({
  authStatus,
  supabase
}: {
  readonly authStatus: CommentTranslatorC1BillingAuthStatus;
  readonly supabase: CommentTranslatorC1BillingSupabaseClient;
}): Promise<CommentTranslatorC1BillingProjection> {
  if (authStatus !== "signed-in") {
    return unavailableProjection;
  }

  try {
    const result = await supabase
      .schema(commentTranslatorC1ContainerlessBillingReadContract.schemaName)
      .rpc(commentTranslatorC1ContainerlessBillingReadContract.functionName);

    if (result.error) {
      return unavailableProjection;
    }

    return parseCommentTranslatorC1BillingProjection(result.data);
  } catch {
    return unavailableProjection;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
