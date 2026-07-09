# Kuro Live Comment Translator Free Beta PL-G6 Public Access Change Preflight

Status: PL-G6 public access change / promotion execution preflight prepared. Public-release capable: no.

Public access change, public gate flip, deploy/upload, production/main-domain smoke, and integration-to-main promotion remain not-run / approval-gated.

This document is the execution preflight and approval surface for PL-G6 after PL-G5 recorded `release_owner_decision_status=blocked-no-approval`. It identifies the exact approval and command boundaries still needed before any public access change or promotion operation can run. It is not approval to execute PL-G6, not a Cloudflare mutation, not a deploy/upload, not a production smoke, and not a public capability decision.

## Preflight Labels

| Item | Status |
| --- | --- |
| `pl_g6_public_access_change_preflight_status` | `complete` |
| `pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| `pl_g6_public_access_change_status` | `not-run-approval-gated` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `not-run` |
| `deploy_upload_status` | `not-run` |
| `production_main_domain_smoke_status` | `not-run-approval-gated` |
| `main_promotion_status` | `not-run` |
| `release_owner_decision_status` | `blocked-no-approval` |
| `release_owner_exact_approval_status` | `absent` |
| `release_owner_missing_approval_scope` | `public-capability-risk-acceptance-and-remaining-operator-checks` |
| `operator_remaining_external_verification_status` | `action-required` |
| `operator_production_harness_block_status` | `action-required-before-production` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_waitlist_boundary` | `creator-paid-beta-only` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `pl_g6_first_operational_target` | `production-route-api-harness-block-removal` |
| `pl_g6_first_operational_target_status` | `not-run-approval-gated` |
| `pl_g6_first_operational_target_approval_status` | `absent` |
| `support_response_status` | `pending` |
| `risk_acceptance_scope` | `future-public-object-default-privileges-only` |
| `new_public_db_object_review_status` | `required-before-work` |

## Required Same-Thread Approval Surface

PL-G6 execution remains blocked until exact same-thread approval names the operation, target boundary, allowed evidence shape, and non-actions.

The approval text must explicitly cover the intended operation. Paste-ready minimum:

> I approve PL-G6 public access change / promotion preflight execution for the Free public beta integration line only. Keep evidence sanitized to labels/counts/pass-fail/status only. Do not expose secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, provider target metadata, liveChatId, Cloudflare token/zone/account/rule ids, support ticket ids, raw SQL output, or raw provider payloads. Do not run any operation outside the named PL-G6 target boundary.

If the requested PL-G6 action includes public gate flip, deploy/upload, Cloudflare mutation, production/main-domain smoke, or main promotion, the approval must name that exact operation. Approval for one PL-G6 operation does not approve adjacent operations.

Keep public_release_capable=no unless this same-thread approval explicitly changes it after the listed checks are closed or accepted.

## Smallest Safe First Operational Target

The smallest safe first PL-G6 operational target is `production-route-api-harness-block-removal`.

Reason:

- local source inspection confirms the route/API harness file still exists at `app/api/comment-translator/free-beta/route-api-harness/route.ts`;
- production route/API harness exposure is already labeled `action-required-before-production`;
- blocking or removing that harness exposure is narrower than public gate flip, deploy/upload, Cloudflare edge activation, production smoke, or main promotion;
- this target does not approve public access, provider execution, OAuth, Google target lookup, Supabase work, Stripe live action, paid entitlement runtime, OBS overlay runtime, or support follow-up.

Do not start with public gate flip, deploy/upload, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, or Supabase support/database work. Those are separate approval-required operations and remain not-run.

Paste-ready exact approval for the first target only:

> I approve PL-G6A production route/API harness block/removal readiness for the Free public beta integration line only. Scope is identifying and preparing the smallest repository-side change needed to ensure the Comment Translator route/API harness is blocked or removed before production traffic. Keep evidence sanitized to labels/counts/pass-fail/status only. Do not run Cloudflare mutation, deploy/upload, public gate flip, public access change, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, support follow-up, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, main promotion, or any operation that exposes or uses secrets/private values.

This approval would not approve deploy/upload or a production/main-domain smoke. If the harness block/removal change later needs deployment or production confirmation, that must be approved as a separate named operation.

## Execution Boundary

Cloudflare route-class and traffic-growth operation guidance remains centralized in `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.

Allowed after future exact approval only:

- public access policy change for the selected `login-only` Free public beta boundary;
- Cloudflare edge rate-limit activation or route-class protection change for the approved target;
- deploy/upload for the approved target;
- public gate flip for the approved target;
- integration-to-main promotion;
- final production/main-domain smoke with sanitized labels/counts/pass-fail/status only.

Still separate unless explicitly named in the same approval:

- live/provider execution;
- OAuth live flow;
- Google target lookup;
- Supabase query, mutation, or migration;
- Stripe live action;
- paid entitlement runtime;
- OBS overlay route/token runtime;
- support follow-up.

Do not run Cloudflare mutation, deploy/upload, public gate flip, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion from this preflight slice.

## Public Capability Result

Public capability can remain `no` through this preflight. The preflight result is:

- PL-G6 approval surface prepared;
- exact approval absent;
- remaining operator checks still action-required unless separately closed or accepted;
- public access change not run;
- public gate flip not run;
- deploy/upload not run;
- main promotion not run.

## Operator Checks Still Required

Before or during any approved PL-G6 operation, the release owner must close or explicitly accept these surfaces:

- production Cloudflare edge activation / route-class protection evidence;
- production route/API harness block or removal before production traffic;
- production API Managed Challenge remains `not-selected` unless an emergency exception is named;
- Start-to-translation live smoke or explicit acceptance that existing evidence is enough without another live/provider run;
- optional burst comment, 30-minute session, and monthly 20,000 provider-input-character checks or explicit acceptance that fixture/local evidence is enough;
- final production/main-domain smoke after any approved public access or promotion change.

No new `public` database object work may proceed without explicit object-level grant/RLS/default-privileges review.

## Sanitized Evidence Shape

Allowed evidence fields:

- command label;
- doc path;
- safe branch label;
- public gate state label;
- public-release capable label;
- approval status label;
- route class label;
- count;
- pass/fail;
- status label;
- stop reason;
- unavailable reason.

Evidence stays labels/counts/pass-fail/status only.

Forbidden output/storage:

- secret/token/OAuth values;
- cookie values;
- Authorization header values;
- Cloudflare token, account, zone, or rule values;
- support ticket values;
- private owner role values;
- owner/internal user values;
- provider channel values;
- credential reference values;
- provider target metadata;
- live target values;
- liveChatId;
- raw provider payloads;
- raw comments;
- server-only cursor values;
- browser storage payloads;
- raw action payloads;
- Stripe secret/billing identifiers;
- raw SQL output;
- handoff payload expansion.

## Non-Actions

This preflight slice did not run or implement:

- Cloudflare mutation;
- deploy/upload;
- public gate flip;
- public access change;
- production/main-domain smoke;
- live/provider execution;
- OAuth live flow;
- Google target lookup;
- Supabase query/mutation/migration;
- support follow-up;
- Stripe live action;
- paid entitlement runtime;
- OBS overlay route/token runtime;
- main promotion.

## Completion Verification

Required local closeout checks for this docs/contract preflight slice:

- `node scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs`
- `node scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `node scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs`
- `node scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs`
- `node scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `git diff --check`
- changed-files high-confidence no-secret scan
- changed TS/TSX type-suppression scan

UI/browser width QA is skipped because this slice changes only docs, deterministic contracts, and `task.md`. There is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.
