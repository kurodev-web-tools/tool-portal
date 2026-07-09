# Kuro Live Comment Translator Free Beta PL-G6 Public Access Change Preflight

Status: PL-G6 public access change / promotion execution preflight prepared. Preview auto deploy evidence recorded from operator-provided status. Public-release capable: no.

PL-G6C production/main-domain env readiness and smoke approval gate is prepared; production env apply and production/main-domain smoke remain not-run / approval-gated.

Public access change, public gate flip, production/main deploy/upload, production/main-domain smoke, production env apply, and integration-to-main promotion remain not-run / approval-gated.

This document is the execution preflight and approval surface for PL-G6 after PL-G5 recorded `release_owner_decision_status=blocked-no-approval`. It identifies the exact approval and command boundaries still needed before any public access change or promotion operation can run. It is not approval to execute PL-G6, not a Cloudflare mutation, not a deploy/upload, not a production smoke, and not a public capability decision.

## Preflight Labels

| Item | Status |
| --- | --- |
| `pl_g6_public_access_change_preflight_status` | `complete` |
| `pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| `pl_g6_public_access_change_status` | `not-run-approval-gated` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `not-run` |
| `deploy_upload_status` | `complete-auto-preview-after-merge` |
| `deploy_upload_evidence_source` | `operator-provided` |
| `preview_deployment_target` | `cloudflare-preview-domain` |
| `preview_deployment_status` | `deployed-operator-provided` |
| `production_env_apply_status` | `not-run-approval-gated` |
| `production_main_domain_smoke_status` | `not-run-approval-gated` |
| `pl_g6c_production_main_domain_env_readiness_status` | `prepared-approval-gated` |
| `pl_g6c_production_env_operator_action_status` | `action-required-sanitized-instructions-only` |
| `pl_g6c_production_smoke_approval_status` | `absent` |
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
| `pl_g6_first_operational_target_status` | `complete-repository-side-not-deployed` |
| `pl_g6_first_operational_target_approval_status` | `approved-in-thread` |
| `pl_g6a_repository_route_api_harness_block_status` | `complete` |
| `pl_g6a_repository_route_api_harness_block_evidence` | `production-deployment-env-guard` |
| `support_response_status` | `pending` |
| `risk_acceptance_scope` | `future-public-object-default-privileges-only` |
| `new_public_db_object_review_status` | `required-before-work` |

## Required Same-Thread Approval Surface

PL-G6 execution remains blocked until exact same-thread approval names the operation, target boundary, allowed evidence shape, and non-actions.

The approval text must explicitly cover the intended operation. Paste-ready minimum:

> I approve PL-G6 public access change / promotion preflight execution for the Free public beta integration line only. Keep evidence sanitized to labels/counts/pass-fail/status only. Do not expose secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, provider target metadata, liveChatId, Cloudflare token/zone/account/rule ids, support ticket ids, raw SQL output, or raw provider payloads. Do not run any operation outside the named PL-G6 target boundary.

If the requested PL-G6 action includes public gate flip, production/main deploy/upload, Cloudflare mutation, production env apply, production/main-domain smoke, or main promotion, the approval must name that exact operation. Approval for one PL-G6 operation does not approve adjacent operations.

Keep public_release_capable=no unless this same-thread approval explicitly changes it after the listed checks are closed or accepted.

## Smallest Safe First Operational Target

The smallest safe first PL-G6 operational target is `production-route-api-harness-block-removal`.

Reason:

- local source inspection confirms the route/API harness file still exists at `app/api/comment-translator/free-beta/route-api-harness/route.ts`;
- production route/API harness exposure is already labeled `action-required-before-production`;
- blocking or removing that harness exposure is narrower than public gate flip, deploy/upload, Cloudflare edge activation, production smoke, or main promotion;
- this target does not approve public access, provider execution, OAuth, Google target lookup, Supabase work, Stripe live action, paid entitlement runtime, OBS overlay runtime, or support follow-up.

Do not start with public gate flip, production/main deploy/upload, production env apply, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, or Supabase support/database work. Those are separate approval-required operations and remain not-run.

PL-G6A repository-side block status: complete.

The route now returns `blocked-production-route-api-harness` with HTTP 404 when the production deployment label is present.

This does not prove deployed production behavior until a later approved deploy/upload and production confirmation.

PL-G6B preview deploy evidence status: recorded.

Operator-provided sanitized evidence states that PR #628 is merged and Cloudflare preview domain deployment is complete. This records preview deploy/upload as `complete-auto-preview-after-merge` only; it is not production/main-domain smoke, production env apply, public gate flip, public access change, or main promotion evidence.

## PL-G6C Production/Main-Domain Env Readiness And Smoke Approval Gate

PL-G6C prepares the next approval gate only. It does not apply production environment variables, mutate Cloudflare, deploy/upload, smoke the production/main domain, run live/provider flows, or change public access.

Smallest safe next action: request exact approval for production env apply readiness confirmation only, or ask the operator to add/confirm the listed labels in Cloudflare without exposing values. If operator-side values must be added, do not paste them in chat, docs, PR bodies, shell output, or screenshots.

### Sanitized Operator Instructions

| Variable name or label | Target environment label | Required / optional / smoke-only | Where the operator should add or confirm it |
| --- | --- | --- | --- |
| `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` | Cloudflare production Worker runtime | required-for-public-traffic-control-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| `NEXT_PUBLIC_SITE_URL` | Cloudflare production Worker runtime | required-main-domain-url-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Supabase public auth variables | Cloudflare production Worker runtime | required-auth-runtime-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Supabase service role secret | Cloudflare production Worker runtime | required-server-only-status-session-reference | Cloudflare dashboard production secrets for the Worker service |
| YouTube credential resolution controls | Cloudflare production Worker runtime | required-reconnect-and-token-resolution-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Azure Translator provider references | Cloudflare production Worker runtime | required-free-translation-provider-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Turnstile public/secret references | Cloudflare production Worker runtime | required-login-abuse-control-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Stripe and paid entitlement references | Cloudflare production Worker runtime | optional-not-required-for-free-public-beta-smoke | Cloudflare dashboard production variables/secrets for the Worker service |
| live/provider smoke fixture references | operator-local smoke environment only | smoke-only-explicit-approval-required | operator-local shell or approved smoke runner environment |

Do not ask the user to paste values in chat. The operator should add or confirm the labels in the Cloudflare dashboard for the production Worker environment and report only presence labels.

### Exact Approval Text Needed

For production env apply readiness confirmation only:

> I approve PL-G6C production/main-domain env apply readiness confirmation for the Free public beta integration line only. Keep evidence sanitized to labels/counts/pass-fail/status only. Do not expose secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, provider target metadata, liveChatId, Cloudflare token/zone/account/rule ids, support ticket ids, raw SQL output, or raw provider payloads. Do not run production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, public gate flip, public access change, deploy/upload, or main promotion.

For production/main-domain smoke after production env readiness is confirmed:

> I approve PL-G6C production/main-domain smoke for the Free public beta integration line only after production env apply readiness is confirmed. Keep evidence sanitized to route labels, width labels, pass/fail/count/status, stop reasons, and unavailable reasons only. Do not expose secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, provider target metadata, liveChatId, Cloudflare token/zone/account/rule ids, support ticket ids, raw SQL output, or raw provider payloads. Do not run live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, public gate flip, public access change, deploy/upload, or main promotion.

## Execution Boundary

Cloudflare route-class and traffic-growth operation guidance remains centralized in `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.

Allowed after future exact approval only:

- public access policy change for the selected `login-only` Free public beta boundary;
- Cloudflare edge rate-limit activation or route-class protection change for the approved target;
- production/main deploy/upload for the approved target;
- production env apply for the approved target;
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

Do not run Cloudflare mutation, production/main deploy/upload, production env apply, public gate flip, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion from this preflight slice.

## Public Capability Result

Public capability can remain `no` through this preflight. The preflight result is:

- PL-G6 approval surface prepared;
- exact approval absent;
- remaining operator checks still action-required unless separately closed or accepted;
- public access change not run;
- public gate flip not run;
- preview deploy/upload complete via operator-provided automatic merge deployment status;
- production/main deploy/upload not run;
- production env apply not run;
- PL-G6C production/main-domain env readiness prepared but approval-gated;
- production/main-domain smoke not run;
- main promotion not run.

## Operator Checks Still Required

Before or during any approved PL-G6 operation, the release owner must close or explicitly accept these surfaces:

- production Cloudflare edge activation / route-class protection evidence;
- production route/API harness block or removal before production traffic;
- production API Managed Challenge remains `not-selected` unless an emergency exception is named;
- Start-to-translation live smoke or explicit acceptance that existing evidence is enough without another live/provider run;
- optional burst comment, 30-minute session, and monthly 20,000 provider-input-character checks or explicit acceptance that fixture/local evidence is enough;
- final production/main-domain smoke after any approved public access or promotion change.
- PL-G6C production env apply readiness confirmation before production/main-domain smoke.

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
- manual deploy/upload by Codex;
- production/main deploy/upload;
- production env apply;
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
