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

type ReferencePresenceStatus = "present" | "missing" | "unreviewed";

type ReferencePresence = {
  name: string;
  status: ReferencePresenceStatus;
};

type CreatorPaidReadiness = {
  status:
    | "ready-inactive"
    | "missing-supporting-references"
    | "activation-reference-unreviewed";
  references: ReferencePresence[];
  counts: Record<ReferencePresenceStatus | "total", number>;
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

  return {
    status: hasMissingSupportingReference
      ? "missing-supporting-references"
      : activationStatus === "unreviewed"
        ? "activation-reference-unreviewed"
        : "ready-inactive",
    references,
    counts,
  };
}
