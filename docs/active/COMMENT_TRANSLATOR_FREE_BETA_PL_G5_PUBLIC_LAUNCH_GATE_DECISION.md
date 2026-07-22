# Kuro Live Comment Translator Free Beta PL-G5 Public Launch Gate Decision

Status: PL-G5 release-owner public launch decision recorded. Public-release capable: no.

Decision-time result: release-owner-decision=accepted-promotion-readiness-only / public_release_capable=no.

The PL-G5 decision itself did not change the public launch gate. Later separately approved operations completed promotion, deployment, login-only activation, and post-activation verification; they did not approve the final public release declaration.

This document is the discoverable PL-G5 release-owner decision record for the current Free public beta integration line. It records the decision inputs, accepted residual risks, blocking labels, missing approval scope, and the gates still required before public capability can be recorded. It is not a public gate flip, not a deploy/upload, and not final release approval.

This slice does not run Supabase Support follow-up, remote Supabase query, remote mutation, migration, Cloudflare mutation, deploy/upload, public access change, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, main promotion, browser storage capture, raw comment capture, or screenshot evidence containing raw comments.

## Decision Labels

| Item | Status |
| --- | --- |
| `pl_g5_release_owner_decision_preflight_doc_status` | `complete` |
| `pl_g5_release_owner_decision_record_status` | `complete` |
| `pl_g5_release_owner_decision_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md` |
| `release_owner_decision_status` | `accepted-promotion-readiness-only` |
| `release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification` |
| `release_owner_exact_approval_status` | `present-promotion-readiness-only` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `not-run` |
| `limited_public_beta_open_status` | `not-run-approval-gated` |
| `pl_g6_public_access_change_status` | `not-run-approval-gated` |
| `main_promotion_status` | `not-run` |
| `support_contact_status` | `submitted` |
| `support_response_status` | `pending` |
| `supabase_support_follow_up_status` | `not-run` |
| `remote_default_privileges_status` | `fail-accepted-risk` |
| `remote_default_privileges_posture_status` | `fail` |
| `risk_acceptance_status` | `accepted` |
| `risk_acceptance_scope` | `future-public-object-default-privileges-only` |
| `current_table_rls_grant_status` | `pass-not-accepted-as-drift` |
| `new_public_db_object_review_status` | `required-before-work` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_waitlist_boundary` | `creator-paid-beta-only` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `cloudflare_custom_rule_operations_doc_status` | `complete` |
| `operator_external_verification_status` | `partial-pass-preview-browser` |
| `operator_remaining_external_verification_status` | `action-required` |
| `operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge` |
| `operator_cloudflare_env_reference_status` | `present-enabled-label` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `operator_production_harness_block_status` | `action-required-before-production` |
| `codex_local_verification_status` | `pass` |
| `post_pr_637_runtime_status` | `implemented-not-activated` |
| `post_pr_637_runtime_default` | `private-launch-sha256-owner-allowlist` |
| `integration_to_main_promotion_readiness_status` | `ready-after-exact-approvals` |
| `promotion_activation_requirement` | `activation-unset` |

## Decision Inputs

PL-G5 decision input is limited to these active docs and current task state:

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md`
- `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`
- `docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md`
- `docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_SUPPORT_PENDING.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2K_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2J.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md`

Cloudflare custom-rule operations doc from PR #624 is the operational reference.

It covers Free public launch defaults, API-vs-HTML Managed Challenge boundaries, Rate Limiting preference, Turnstile Pre-clearance treatment, Creator/Paid transition handling, traffic-growth response, release-operator checks, and non-actions.

## Decision-Time PL-G5 Scope

PL-G5 recorded the release-owner decision surface available at that decision-time checkpoint.

The initial PL-G5 release-owner decision was:

- release-owner-decision=blocked-no-approval;
- public_release_capable=no;
- public gate state unchanged / blocked;
- PL-G6 public access change / promotion not-run / approval-gated.

PL-G5 can also carry the accepted future `public` object default-privileges risk label into the release-owner decision surface, provided the scope remains limited and all current-table/RLS/current-grant posture remains pass-not-accepted-as-drift.

## Decision-Time Non-Authorization Boundary

PL-G5 cannot flip the public gate, change public access, deploy/upload, promote to `main`, mutate Cloudflare, mutate Supabase, run live/provider flows, run OAuth live flows, run Google target lookup, run Stripe live actions, implement paid entitlement runtime, or add OBS overlay route/token runtime.

PL-G5 also cannot treat preview Cloudflare/browser checks as production traffic readiness. The preview labels remain useful evidence, but remaining operator external checks stay action-required until a release owner runs or accepts them in a separate approved operation.

## Accepted Residual Risks

Supabase Support response remains pending; no support follow-up was run in this slice.

Future `public` object default-privileges risk is accepted for PL-G5 evaluation only. The acceptance scope is `future-public-object-default-privileges-only`.

Existing current-table/RLS/current-grant pass posture is not accepted as drift. If current expected tables, RLS, or explicit grants drift, PL-G5 must stop as blocked rather than treating the default-privileges accepted risk as blanket database acceptance.

No new `public` database object work may proceed without explicit object-level grant/RLS/default-privileges review.

## Decision-Time Missing Approval For Public Capability

The source-thread approval at the PL-G5 checkpoint was approval to run that decision slice only. It did not approve public capability, a gate change, or production operations.

The decision-time record required a later release-owner approval to close or accept these then-open surfaces:

- `support_response_status=pending` with the accepted future `public` object default-privileges risk scope unchanged;
- `operator_external_verification_status=partial-pass-preview-browser` and `operator_remaining_external_verification_status=action-required`;
- production Cloudflare edge activation / route-class protection evidence or explicit acceptance of the missing production check;
- production route/API harness blocking or removal before production traffic;
- Start-to-translation live smoke, or explicit acceptance that existing evidence is enough without another live/provider run;
- optional burst, 30-minute, and monthly 20,000 provider-input-character checks, or explicit acceptance that fixture/local evidence is enough;
- PL-G6 public access change / promotion as a separate exact operation with sanitized output expectations.

## Decision-Time Blocking Labels

| Blocking surface | Decision-time label |
| --- | --- |
| Release-owner exact approval | `absent` |
| Release-owner decision | `blocked-no-approval` |
| Missing approval scope | `public-capability-risk-acceptance-and-remaining-operator-checks` |
| Public release capable | `no` |
| Operator remaining external verification | `action-required` |
| Production Cloudflare edge activation | `not-run-approval-gated` |
| Production API Managed Challenge | `not-selected` |
| Production route/API harness blocking/removal | `action-required-before-production` |
| PL-G6 public access change / promotion | `not-run-approval-gated` |
| Public gate flip | `not-run` |
| Deploy/upload | `not-run` |
| Main promotion | `not-run` |

Production API Managed Challenge remains `not-selected`.

At decision time, production route/API harness blocking/removal was `action-required-before-production`.

At decision time, PL-G6 public access change / promotion was approval-gated and not-run.

The final public gate is a release declaration, not a second Worker binding mutation. Google OAuth verification must be approved before that release declaration. The existing login-only runtime binding remains unchanged, and any production Cloudflare edge-protection activation or confirmation remains a separate approval-gated prerequisite.

Post-decision reconciliation: PR #640 is merged and contained in main; the main-connected deployment, separately approved login-only activation, and 11/11 post-activation browser verification are complete. These later facts supersede only the operational `not-run` labels recorded at PL-G5 decision time. The accepted risk boundary and `public_release_capable=no` remain unchanged.

The PL-G6 execution preflight and approval surface is recorded in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`.

## Current Post-Decision Operator Actions

After the completed promotion, activation, and 11/11 verification, the remaining release-operator actions are:

- Google OAuth verification approval;
- production Cloudflare edge activation or readiness confirmation;
- production route/API harness 404 recheck in the final-declaration preflight;
- separately approved final public release declaration;
- later separately approved final production/main-domain smoke.

Start-to-translation evidence and deterministic burst, 30-minute, and monthly 20,000 provider-input-character proof are already accepted for this release decision.

Codex should not run these checks from this docs/contract slice.

## PL-G6 Boundary

PL-G6 is a separate approval-gated operation. It may include public access change, deploy/upload, production domain cutover, public gate flip, integration-to-main promotion, or final production smoke only after a release owner explicitly approves the exact operation with sanitized output expectations.

This PL-G5 document must remain valid even if the release owner later approves PL-G6. PL-G6 should update its own evidence and should not retroactively convert this decision record into an executed gate flip.

## Decision-Time Post-PR 637 Promotion Plan

This section is a historical audit trail. The promotion, private-default verification, and later login-only activation described below are complete and are not current next actions.

PR #637 is contained in the current Free public beta integration tip. The repository runtime is `implemented-not-activated`; unset, malformed, or non-exact activation state retains the private-launch SHA-256 owner allowlist. Promotion to `main` must not set the login-only activation control and must not flip the public gate.

Required before an integration-to-main promotion PR may be created:

- same-thread release-owner acceptance of the existing future `public` object default-privileges residual risk and the remaining-check disposition below;
- same-thread approval naming the integration-to-main promotion PR, merge, and the resulting main-connected automatic production deployment while activation remains unset;
- confirmation that the promotion diff contains the reviewed integration tip and does not include an activation value, environment apply, public gate flip, or unrelated runtime expansion.

Required after the automatic production deployment and before any login-only activation operation:

- a separately approved production verification confirming private-allowlist default, healthy main-domain behavior, production route/API harness 404, and sanitized browser output;
- stop if the private default or health check fails. Do not proceed to login-only activation or public gate flip.

Checks that may be explicitly accepted from deterministic fixture evidence for this promotion decision:

- burst behavior for 30 translated messages/min;
- 30-minute session behavior from fake-clock/session contracts;
- monthly 20,000 provider-input-character boundary behavior;
- another Start-to-translation live/provider run, because sanitized private-launch production evidence is already recorded.

Production Cloudflare edge activation is required before broad public exposure, but it is not required to merge the implemented-not-activated runtime to `main` while the private allowlist remains the production default. Login-only activation and the later public gate flip remain separate production deployments/operations after the post-deploy private-default verification.

Paste-ready PL-G5 acceptance:

> I accept the PL-G5 residual risk limited to future public-object default privileges, with current-table RLS and explicit-grant posture still required to pass and every new public object still requiring object-level review. I accept deterministic fixture evidence for the 30 translated messages/min, 30-minute session, and monthly 20,000 provider-input-character checks, and I accept the existing sanitized private-launch Start-to-translation evidence without another live/provider run. This acceptance authorizes only promotion readiness; keep public_release_capable=no, login-only activation unset, the private allowlist default active, Cloudflare edge activation not-run, and the public gate unchanged. It does not approve a promotion PR, merge, deploy, production verification, activation, or public gate flip.

Acceptance result: `accepted-promotion-readiness-only`. The remaining approval scope is `promotion-operation-and-post-deploy-verification`. No promotion PR, merge, deployment, production verification, activation, or public gate flip is approved by this decision.

## Sanitized Evidence Shape

Allowed PL-G5 evidence fields:

- command label;
- doc path;
- safe branch label;
- release-owner decision label;
- public gate state label;
- public-release capable label;
- status label;
- count;
- stop reason;
- unavailable reason;
- pass/fail.

Evidence stays counts/status/pass-fail labels only.

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
- raw provider payloads;
- raw comments;
- server-only cursor values;
- browser storage payloads;
- raw action payloads;
- Stripe secret/billing identifiers;
- raw SQL output;
- handoff payload expansion.

## Completion Verification

Required local closeout checks for this docs/contract slice:

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

UI/browser width QA skipped because this slice changes only docs, deterministic contracts, and `task.md`. There is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.
