import "server-only";

const supportingReferences = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES",
  "STRIPE_SECRET_KEY",
  "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER",
  "COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD",
  "COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO",
  "COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO",
  "OPENAI_API_KEY",
  "OPENAI_TRANSLATION_MODEL",
  "AZURE_TRANSLATOR_KEY",
  "AZURE_TRANSLATOR_ENDPOINT",
  "AZURE_TRANSLATOR_REGION",
  "COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP",
] as const;

const activationReference =
  "COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS";
const checkoutReferenceNames = [
  "STRIPE_SECRET_KEY",
  "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID",
  "NEXT_PUBLIC_SITE_URL",
  "COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS",
  "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES",
] as const;

type ReferencePresenceStatus = "present" | "missing" | "unreviewed";
type CheckoutReferenceStatus =
  | "present"
  | "missing"
  | "unreviewed"
  | "disconnected-fail-closed";

type ReferencePresence = {
  name: string;
  status: ReferencePresenceStatus;
};

type CheckoutReadiness = {
  status: "blocked";
  blocker: "c1-durable-billing-state-read-disconnected";
  references: Array<{
    name:
      | (typeof checkoutReferenceNames)[number]
      | "C1_DURABLE_BILLING_STATE_READ";
    status: CheckoutReferenceStatus;
  }>;
  counts: {
    total: 6;
    present: number;
    missing: number;
    unreviewed: number;
    disconnected: 1;
  };
  checkoutInvocationCount: 0;
};

type CreatorPaidReadiness = {
  status:
    | "ready-inactive"
    | "missing-supporting-references"
    | "activation-reference-unreviewed";
  references: ReferencePresence[];
  counts: Record<ReferencePresenceStatus | "total", number>;
  checkout: CheckoutReadiness;
};

export function readCommentTranslatorCreatorPaidReadiness(
  environment: object,
): CreatorPaidReadiness {
  const supporting = supportingReferences.map((name) => ({
    name,
    status: Object.hasOwn(environment, name) ? "present" : "missing",
  })) satisfies ReferencePresence[];
  const activationStatus = Object.hasOwn(environment, activationReference)
    ? "unreviewed"
    : "missing";
  const references: ReferencePresence[] = [
    ...supporting,
    { name: activationReference, status: activationStatus },
  ];
  const counts = references.reduce<CreatorPaidReadiness["counts"]>(
    (current, reference) => ({
      ...current,
      [reference.status]: current[reference.status] + 1,
    }),
    { present: 0, missing: 0, unreviewed: 0, total: references.length },
  );
  const hasMissingSupportingReference = supporting.some(
    (reference) => reference.status === "missing",
  );
  const checkout = readCheckoutReadiness(environment);

  return {
    status: hasMissingSupportingReference
      ? "missing-supporting-references"
      : activationStatus === "unreviewed"
        ? "activation-reference-unreviewed"
        : "ready-inactive",
    references,
    counts,
    checkout,
  };
}

function readCheckoutReadiness(environment: object): CheckoutReadiness {
  const env = environment as Record<string, unknown>;
  const references: CheckoutReadiness["references"] =
    checkoutReferenceNames.map((name) => ({
      name,
      status: checkoutReferenceStatus(env, name),
    }));
  const present = references.filter(
    (reference) => reference.status === "present",
  ).length;
  const unreviewed = references.filter(
    (reference) => reference.status === "unreviewed",
  ).length;

  return {
    status: "blocked",
    blocker: "c1-durable-billing-state-read-disconnected",
    references: [
      ...references,
      {
        name: "C1_DURABLE_BILLING_STATE_READ",
        status: "disconnected-fail-closed",
      },
    ],
    counts: {
      total: 6,
      present,
      missing: checkoutReferenceNames.length - present - unreviewed,
      unreviewed,
      disconnected: 1,
    },
    checkoutInvocationCount: 0,
  };
}

function checkoutReferenceStatus(
  env: Record<string, unknown>,
  name: (typeof checkoutReferenceNames)[number],
): Exclude<CheckoutReferenceStatus, "disconnected-fail-closed"> {
  if (!Object.hasOwn(env, name)) return "missing";
  return name === activationReference ||
    name === "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES"
    ? "unreviewed"
    : "present";
}
