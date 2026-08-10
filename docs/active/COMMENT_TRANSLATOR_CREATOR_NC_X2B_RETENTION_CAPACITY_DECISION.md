# Comment Translator Creator NC-X2B Retention Capacity Decision

```text
authority_scope=local-documentation-only
verified_at=2026-08-11
decision=eligible-for-separate-switch-approval
decision_basis=synthetic-design-capacity-model-only
switch_status=unapproved-unimplemented
retention_cutoff=seven-day-unchanged
evidence_classes=repository-local|synthetic-design|external-account|deployed-live
```

## Decision boundary

NC-X2B is a capacity-decision preflight, not a 30-day retention implementation. The only recorded decision is `eligible-for-separate-switch-approval`: the S1 design model is suitable to take to a separately approved capacity/switch decision, but it does not authorize that switch. If any required input is missing, stale, contradictory, or not approved, the result fails closed to either `keep-seven-days` or `no-go`; no other decision value is valid.

The 30-day cutoff/switch remains unapproved and unimplemented. The existing seven-day server-clock retention remains unchanged. No migration, runtime, schema, RPC, cleanup, UI, account, provider, or deployment change is part of this preflight.

## Evidence classes

These evidence classes are intentionally non-interchangeable:

```text
repository-local=merged-PR-and-local-contract-evidence-only
synthetic-design=S1-assumptions-and-arithmetic-only
external-account=unconfirmed-account-headroom-and-provider-state
deployed-live=unconfirmed-deployment-and-activation
```

| Class | What this preflight may observe | What it does not prove |
| --- | --- | --- |
| `repository-local` | PR #753 NC-X4, PR #754 NC-X3, PR #755 NC-X5, PR #756 NC-X2A merge facts and local contract results | deployment, migration apply, production behavior, or account headroom |
| `synthetic-design` | S1 row/workload assumptions and deterministic arithmetic below | actual row bytes, bloat, query cost, egress, or account utilization |
| `external-account` | no account-specific observation in this scope; status is unconfirmed | Supabase, Cloudflare, provider, Stripe configuration, quota, headroom, or approval |
| `deployed-live` | no deployed/live observation in this scope; status is unconfirmed | deployment success, activation, browser behavior, or public availability |

## S1 design model

Every S1 value is a `synthetic-design` design assumption and explicitly is not account/production evidence.

```text
S1_STORAGE_RETAINED_ROWS=30000; class=synthetic-design; status=design-assumption; production_evidence=no
S1_STORAGE_AVERAGE_ROW_SIZE=1 KiB; class=synthetic-design; status=design-assumption; production_evidence=no
S1_STORAGE_INDEX_ADDITIONAL_OVERHEAD=1.5; class=synthetic-design; status=design-assumption; production_evidence=no
S1_STORAGE_FORMULA=30,000 retained rows * average 1 KiB * (1 + 1.5 index-additional-overhead) ≈ 73.2 MiB; class=synthetic-design; status=design-assumption; production_evidence=no
S1_STORAGE_ROUNDED=about 75 MiB; class=synthetic-design; status=design-assumption; production_evidence=no
S1_EGRESS_PAGES_PER_MONTH=2000; class=synthetic-design; status=design-assumption; production_evidence=no
S1_EGRESS_ROWS_PER_PAGE=50; class=synthetic-design; status=design-assumption; production_evidence=no
S1_EGRESS_AVERAGE_ROW_SIZE=1 KiB; class=synthetic-design; status=design-assumption; production_evidence=no
S1_EGRESS_FORMULA=2,000 pages/month * 50 rows/page * 1 KiB/row ≈ 97.7 MiB; class=synthetic-design; status=design-assumption; production_evidence=no
S1_EGRESS_ROUNDED=about 98 MiB; class=synthetic-design; status=design-assumption; production_evidence=no
index_additional_overhead_explanation=the 1.5 multiplier estimates index bytes in addition to base row bytes
```

The storage calculation is `30,000 × 1 KiB × (1 + 1.5) = 75,000 KiB ≈ 73.2 MiB`, then rounded to about `75 MiB`. The `1.5` multiplier is specifically **index additional overhead**: it estimates index bytes in addition to base row bytes. It is not a hidden account multiplier, measured bloat value, or production headroom observation.

The egress calculation is `2,000 × 50 × 1 KiB = 100,000 KiB ≈ 97.7 MiB`, then rounded to about `98 MiB`. It models returned safe-row bytes only; it does not measure actual query protocol, serialization, compression, retries, or other overhead.

## Unconfirmed state and non-authorization proof

```text
deployment_success=unconfirmed
migration_apply=unconfirmed
production_activation=closed
account_headroom=unconfirmed
provider_state=unconfirmed
stripe_state=unconfirmed
cloudflare_state=unconfirmed
supabase_state=unconfirmed
retention_switch_authorization=none
migration_apply_authorization=none
remote_read_write_authorization=none
deploy_authorization=none
activation_authorization=none
nc_l1_permission=none
runtime_change=none
schema_or_migration_apply=none
```

No retention switch is authorized; migration apply, remote read/write, deploy, activation, and NC-L1 are not authorized. This preflight performed no remote read/write and grants no permission to perform one later. It also does not grant provider, Stripe, Cloudflare, or Supabase observation or mutation permission.

## Rollback and residual risks

```text
rollback_baseline=keep-seven-days
rollback_window=seven-day
rollback_trigger=any-stale-or-mismatched-capacity-input-or-approved-switch-failure
rollback_action=retain-or-return-to-seven-day-server-clock-cutoff
residual_risks=actual-row-size,index-bloat,query-egress-overhead,account-headroom,evidence-freshness,approvals
```

The seven-day rollback is the safe baseline. A future, separately approved switch must carry an operator-owned rollback packet that can return to the seven-day cutoff within the seven-day rollback window. The residual risks are actual row size, index bloat, query/egress overhead, account headroom, evidence freshness, and approvals; none is closed by this local arithmetic.

## Approval and execution boundary

Separate approval for the retention switch is required. Separate approval is also required for schema or migration apply, remote read/write, account observation, deploy, browser verification, activation, public gate, or NC-L1. This document records no approval, performs no execution, and does not change the 7-day retention behavior.
