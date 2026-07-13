# Comment Translator Public Launch Remaining Task Board

Date: 2026-07-08

## Scope

This document records the remaining task order for taking Kuro Live Comment Translator from the current allowed-tester/free-public-beta integration state to public launch, plus the current status of the public Free limit copy, OBS Dock display-name policy, public beta access gate decision, public traffic rate-limit backing decision, Supabase default-privileges risk acceptance, public launch operator QA checklist, Cloudflare custom-rule operations guide, PL-G5 release-owner decision record, and PL-G6 public access change preflight.

The Step 8 update is a policy/UI/contract slice only. It defaults stream-safe / compact comments-only display to the generic `YouTube viewer` label, keeps normal operator preview context on safe `authorDisplayName`, and requires an explicit toggle before compact stream-safe display shows the existing sanitized safe name. It does not add an OBS overlay token runtime, OBS overlay route, moderation actions, schema changes, remote Supabase work, provider/live execution, deploy/upload, public gate flip, or public access change.

The Step 9 policy selected `login-only` for Free public beta access and keeps waitlist approval for Creator/paid beta access. Runtime support is active through the separately approved production Worker deployment, with the existing private-launch tester path retained for parity.

The Step 10 update is a policy/contract/documentation slice only. It selects `cloudflare-edge` as the public traffic rate-limit backing, rejects a new Supabase durable rate-limit table for this launch step, and keeps the current in-app guard as defense-in-depth. Cloudflare edge activation remains not-run / approval-gated.

The Step 11 update is a policy/contract/documentation slice only. Supabase Support response remains pending, and the release owner accepts the known future `public` object default-privileges risk for PL-G5 evaluation. Existing current-table/RLS/current-grant posture remains the reviewed pass surface. Remote remediation/apply, remote mutation, deploy/upload, public gate flip, and main promotion remain not-run.

The operator QA checklist update is a documentation/contract slice only. It separates operator-owned external checks from Codex-owned deterministic checks before PL-G5 / PL-G6. The 2026-07-09 operator update records preview Managed Challenge setup, safe `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` presence, login-only Free beta browser smoke, Creator/paid waitlist boundary smoke, and YouTube-connect no-autostart smoke. Production edge activation, production API Managed Challenge, production harness blocking, live/provider execution, deploy/upload, public gate flip, and main promotion remain not-run / approval-gated unless separately stated.

The Cloudflare custom-rule operations update is a documentation/contract slice only. `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md` records Free public launch, Creator/Paid transition, API-vs-HTML Managed Challenge boundaries, Turnstile / Pre-clearance treatment, Rate Limiting preference, traffic-growth response ladder, release-operator checks, and non-actions. It does not run Cloudflare mutation, deploy/upload, public gate flip, live/provider execution, paid entitlement runtime, or main promotion.

The PL-G5 release-owner decision record is a documentation/contract slice only. `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md` records the current launch-decision surface, carries the accepted future default-privileges risk label, records `release_owner_decision_status=accepted-promotion-readiness-only`, and keeps public-release capable as no. It does not run support follow-up, Cloudflare mutation, Supabase query/mutation, deploy/upload, public gate flip, live/provider execution, paid entitlement runtime, OBS overlay runtime, or main promotion.

The PL-G6 record now reconciles the completed PR #640 promotion, main-connected production deployment, separately approved login-only activation, and 11/11 post-activation browser verification. It keeps `public_release_capable=no`; the final release declaration, any required edge-protection activation, Google OAuth verification approval, and final production smoke remain separate gates.

Sanitization boundary: this document records only task labels, status labels, and public file/path references. It does not include project identifiers, support ticket ids, raw support text, private owner role values, raw SQL output, raw stdout/stderr, raw response bodies, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, or raw account metadata.

## Current Launch State

| Area | Status |
| --- | --- |
| `support_contact_status` | `submitted` |
| `support_response_status` | `pending` |
| `current_table_rls_grant_status` | `pass` |
| `remote_default_privileges_status` | `fail-accepted-risk` |
| `remote_default_privileges_posture_status` | `fail` |
| `risk_acceptance_status` | `accepted` |
| `risk_acceptance_scope` | `future-public-object-default-privileges-only` |
| `obs_dock_display_name_policy_status` | `complete` |
| `public_beta_access_gate_decision_status` | `complete` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_waitlist_boundary` | `creator-paid-beta-only` |
| `public_traffic_rate_limit_backing_status` | `complete` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `edge_activation_status` | `not-run-approval-gated` |
| `edge_protection_readiness_status` | `blocked-activation-or-confirmation-required` |
| `public_launch_operator_qa_checklist_status` | `complete` |
| `operator_external_verification_status` | `pass-post-activation-browser-11-of-11` |
| `operator_remaining_external_verification_status` | `action-required-google-edge-final-smoke` |
| `operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge` |
| `operator_cloudflare_env_reference_status` | `present-enabled-label` |
| `operator_free_beta_login_browser_smoke_status` | `pass-post-activation-production-browser` |
| `operator_waitlist_boundary_browser_smoke_status` | `pass-post-activation-production-browser` |
| `operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-and-production-browser` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `operator_production_harness_block_status` | `pass-production-404` |
| `google_auth_verification_status` | `submitted-pending` |
| `final_public_gate_target` | `free-public-beta-release-declaration` |
| `final_public_gate_mutation_target` | `none` |
| `login_only_runtime_binding_action` | `unchanged` |
| `edge_protection_operation_boundary` | `separate-approval-if-activation-required` |
| `optional_limit_proof_disposition` | `accepted-deterministic-evidence` |
| `login_only_runtime_activation_status` | `complete-production-worker-deployment` |
| `post_activation_browser_verification_status` | `pass-11-of-11` |
| `post_activation_browser_failure_count` | `0` |
| `cloudflare_custom_rule_operations_doc_status` | `complete` |
| `cloudflare_custom_rule_operations_doc` | `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md` |
| `free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge` |
| `api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only` |
| `traffic_growth_response_ladder_status` | `documented` |
| `pl_g5_release_owner_decision_preflight_doc_status` | `complete` |
| `pl_g5_release_owner_decision_record_status` | `complete` |
| `pl_g5_release_owner_decision_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md` |
| `release_owner_decision_status` | `accepted-promotion-readiness-only` |
| `release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification` |
| `release_owner_exact_approval_status` | `present-promotion-readiness-only` |
| `pl_g6_public_access_change_preflight_status` | `complete` |
| `pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| `pl_g6_public_access_change_status` | `not-run-approval-gated` |
| `pl_g6c_production_main_domain_env_readiness_status` | `complete` |
| `pl_g6c_production_env_operator_action_status` | `complete-for-login-only-activation` |
| `pl_g6c_production_env_apply_readiness_confirmation_approval_status` | `present` |
| `pl_g6c_production_env_apply_readiness_confirmation_status` | `complete-before-activation` |
| `pl_g6c_production_smoke_approval_status` | `present` |
| `production_env_apply_status` | `applied-login-only-runtime` |
| `production_main_domain_smoke_status` | `pass-post-activation-browser-11-of-11` |
| `operator_start_to_translation_smoke_status` | `pass-production-main-domain-private-launch` |
| `live_provider_execution_status` | `pass-operator-provided-private-launch-smoke` |
| `codex_local_verification_status` | `pass` |
| `public_release_capable_status` | `no` |
| `public_gate_flip_status` | `not-run` |
| `main_promotion_status` | `complete-pr-640-merged-main-contained` |
| `main_connected_deployment_status` | `pass` |
| `main_connected_workers_build_status` | `success` |
| `post_pr_637_runtime_status` | `activated-login-only` |
| `integration_to_main_promotion_readiness_status` | `complete-promoted` |
| `post_deploy_private_default_verification_status` | `pass-before-activation` |

## Remaining Public Launch Task Order

1. `Public launch remaining task board`: record this updated task order and verification boundary.
2. `Monthly input character accounting`: complete in the current implementation line. The Free monthly 20,000 character cap canonically means provider-input/source characters, not translated-output characters; translated-output characters are analytics metadata only if retained.
3. `Free limits public copy`: complete. Public UI, legal copy, and task-board copy state the Free beta limits as `1日最大30分`, `1セッション最大30分`, `30翻訳メッセージ/分`, and `月20,000入力文字`; English UI copy states up to 30 minutes per day, up to 30 minutes per session, 30 translated messages per minute, and 20,000 provider-input/source characters per month.
4. `OBS Dock display-name policy`: complete. Normal operator preview can show safe `authorDisplayName`; compact stream-safe comments-only display defaults to `YouTube viewer` and only shows the existing sanitized safe name when the explicit display-name toggle is enabled. Long compact names are truncated.
5. `Public beta access gate decision`: complete. Free public beta access is selected as `login-only` and is active through the separately approved production Worker deployment; waitlist approval remains for Creator/paid beta access, and the private-launch tester path remains for parity.
6. `Public traffic rate-limit backing`: complete. Public traffic backing is selected as `cloudflare-edge`; no Supabase durable rate-limit table is created, and risk acceptance is not selected. Current in-app rate-limit guard remains defense-in-depth until a separate approval-gated Cloudflare edge activation operation.
7. `Supabase default privileges support response or risk acceptance`: complete. Supabase Support response remains pending, and the known future `public` object default-privileges risk is accepted for PL-G5 evaluation. Current-table/RLS/current-grant pass posture is not part of the accepted risk.
8. `Public launch operator QA checklist`: complete. User-owned external checks and Codex-owned deterministic checks are separated in `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md`; post-activation production browser verification passed 11/11. Google OAuth approval, production edge readiness, the final release declaration, and final production smoke remain action-required / approval-gated.
9. `Cloudflare custom-rule operations doc`: complete. The operational guide is `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`; it records Free public launch defaults, Creator/Paid transition handling, API-vs-HTML Managed Challenge boundary, Rate Limiting preference, Turnstile Pre-clearance as later improvement, traffic-growth response ladder, release-operator checks, and non-actions.
10. `PL-G5 release-owner decision`: decision-time audit record in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`; its `accepted-promotion-readiness-only` result preceded the now-complete promotion and post-deploy verification. Public release capable remains no.
11. `PL-G6 public access change preflight`: complete in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`; PR #640 promotion, main-connected deployment, login-only activation, and 11/11 post-activation verification are complete. Public release capable remains no.
12. `PL-G6C production/main-domain env readiness and smoke approval gate`: complete as the historical env-readiness and private-launch smoke trail in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`; the later login-only activation and 11/11 post-activation verification are also complete.
13. `PL-G6 final release declaration readiness`: blocked on Google OAuth verification approval and production edge-protection activation or confirmation; the production route/API harness must still return 404.
14. `Final production smoke`: approval-gated final production/main-domain smoke with sanitized pass/fail/count/status evidence only.
15. `Post-PR #637 integration-to-main promotion`: complete through PR #640; reviewed merge is contained in main and the main-connected deployment passed.
16. `Post-deploy private-default verification`: complete before activation; main-domain health, fail-closed private default, production harness 404, and sanitized output passed.
17. `Login-only activation`: complete through the separately approved production Worker deployment; post-activation browser verification passed 11/11 with zero failures.
18. `Public gate flip`: define the final operation as `free-public-beta-release-declaration`, not a second Worker binding mutation. Keep the existing login-only runtime binding unchanged. Declare release only after Google OAuth verification is approved, production edge protection is confirmed ready, and the production route/API harness still returns 404. Final production/main-domain smoke remains later and separately approval-gated.

## Public-Before-Paid Boundary

Paid/Creator entitlement work remains later work unless explicitly pulled into public Free beta scope:

- Durable paid entitlement store: later.
- Stripe live Checkout / Portal / webhook closed-beta gate: later / gated.
- Paid usage and monthly reset: later.
- Public Free beta must continue to degrade non-durable paid state to safe Free limits until paid entitlement work is separately approved and verified.

## Non-Actions

- Runtime accounting changes: implemented only for monthly provider-input character accounting in the earlier implementation slice; no provider/live execution was run in Step 7.
- Public copy changes: complete for Free limits public copy; no quota enforcement logic changed.
- OBS Dock behavior: display-name policy only. No overlay token runtime, overlay route, moderation action control, provider/live execution, OAuth live flow, deploy/upload, public gate flip, or public access change was run or implemented.
- Public beta access gate behavior: decision only. The selected Free public beta policy is `login-only`, waitlist approval remains Creator/paid-only, and current runtime gate unchanged. No Free public beta login gate runtime change, public beta waitlist approval store, admin approval workflow, invite email flow, deploy/upload, public gate flip, or public access change was run or implemented.
- Public traffic rate-limit backing behavior: decision only. The selected backing is `cloudflare-edge`, existing app guard role is `defense-in-depth`, `supabase_rate_limit_table_status=not-created`, and `rate_limit_risk_acceptance_status=not-selected`. No Cloudflare edge activation, deploy/upload, public gate flip, public access change, remote mutation, or new rate-limit table was run or implemented.
- Supabase default privileges risk acceptance: decision only. Support response remains pending, `risk_acceptance_status=accepted`, `remote_default_privileges_status=fail-accepted-risk`, and the acceptance scope is future `public` object default privileges only. Existing current-table/RLS/current-grant pass posture is not accepted as drift, and new `public` database object work still requires explicit object-level grant/RLS/default-privileges review.
- Private launch gate behavior: not changed in this task-board slice.
- Edge/durable rate-limit control: Cloudflare edge backing selected only; activation not run.
- Supabase default privileges remediation/apply: not run.
- Public launch operator QA checklist: complete for docs/contract separation and the 2026-07-09 / 2026-07-10 / 2026-07-13 sanitized operator updates. Promotion, main-connected deployment, login-only activation, and 11/11 post-activation verification are complete. Optional burst, 30-minute, and monthly cap proof is accepted from deterministic evidence. Google OAuth approval, production edge readiness, the final release declaration, and final production smoke remain outstanding.
- Cloudflare custom-rule operations: complete for docs/contract guidance only. Free public launch defaults to login Turnstile plus app-side quotas/session limits without constant ordinary-route challenge; production API Managed Challenge remains not-selected; Cloudflare Rate Limiting Rules are preferred for API load shedding where available; Managed Challenge remains HTML-route or emergency/temporary control; paid/Creator entitlement stays app-side; traffic-growth response ladder is documented. No Cloudflare mutation, deploy/upload, public gate flip, live/provider execution, paid entitlement runtime, or main promotion was run.
- PL-G5 release-owner decision record: complete as a decision-time audit record. Its promotion-readiness approval and historical not-run labels do not override the later completed promotion/activation evidence. Public release capable remains `no`, and the accepted Supabase risk boundary remains unchanged.
- PL-G6 public access change preflight: complete for docs/contract guidance and sanitized evidence recording. The preflight doc reconciles the completed promotion, deployment, login-only activation, and 11/11 verification, while keeping the final release declaration and `public_release_capable=no` separate. This evidence-record slice does not itself run a Cloudflare mutation, public release declaration, final production smoke, Supabase action, Stripe action, paid entitlement runtime, or OBS runtime.
- Remote Supabase migration apply, `db push`, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, public access change, and promotion to `main`: not run.

## Verification

Local checks for the public launch operator QA checklist slice:

- `node scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `git diff --check`
- changed-files high-confidence secret scan: `changed_files=5`, `high_confidence_secret_matches=0`
- changed TS/TSX type-suppression scan: `checked_ts_tsx_files=0`, `type_suppression_matches=0`

Width checks skipped because this checklist changes only docs, deterministic scripts, and `task.md`; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.

Local checks for the Step 11 slice:

- `node scripts/comment-translator-supabase-default-privileges-risk-acceptance-contract.mjs`
- `node scripts/comment-translator-supabase-default-privileges-support-pending-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `git diff --check`

Width checks skipped because Step 11 changes only docs, deterministic scripts, and `task.md`; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.

Recent local checks for the Step 10 slice:

- `node scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs`
- `node scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `git diff --check`

Width checks skipped because Step 10 changes only server-only policy labels, docs, deterministic scripts, and `task.md`; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.

Recent local checks for the Step 9 slice:

- `node scripts/comment-translator-public-beta-access-gate-decision-contract.mjs`
- `node scripts/comment-translator-private-launch-access-gate-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `git diff --check`

Width checks skipped because Step 9 changes only server-only policy labels, docs, deterministic scripts, and `task.md`; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.

Recent local checks for the Step 8 slice:

- `node scripts/comment-translator-obs-dock-display-name-policy-contract.mjs`
- `node scripts/comment-translator-preview-author-display-name-contract.mjs`
- `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`
- `node scripts/comment-translator-public-preview-feed-ux-contract.mjs`
- `node scripts/comment-translator-public-operator-session-ui-contract.mjs`
- `node scripts/comment-translator-ui-live-provider-runtime-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `git diff --check`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- changed-files high-confidence secret scan: `changed_files=9`, `high_confidence_secret_matches=0`.
- changed TS/TSX type-suppression scan: `checked_ts_files=3`, `type_suppression_matches=0`.

Width QA used local production server at `/tools/comment-translator` with Chrome DevTools at `390 / 820 / 1024 / 1280 / 1366px`. Local authenticated allowed-tester state was unavailable, so browser-visible coverage reached the private launch fallback; all checked widths had `scrollWidth == innerWidth`, private gate visible, forbidden private value label scan `false`, and console error/warning/issue count `0`. Operator-row display-name policy markers and explicit stream-safe toggle are deterministic-contract covered.
