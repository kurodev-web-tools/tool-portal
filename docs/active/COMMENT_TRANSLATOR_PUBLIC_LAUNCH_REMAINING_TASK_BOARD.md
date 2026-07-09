# Comment Translator Public Launch Remaining Task Board

Date: 2026-07-08

## Scope

This document records the remaining task order for taking Kuro Live Comment Translator from the current allowed-tester/free-public-beta integration state to public launch, plus the current status of the public Free limit copy, OBS Dock display-name policy, public beta access gate decision, public traffic rate-limit backing decision, Supabase default-privileges risk acceptance, public launch operator QA checklist, Cloudflare custom-rule operations guide, and PL-G5 release-owner decision record.

The Step 8 update is a policy/UI/contract slice only. It defaults stream-safe / compact comments-only display to the generic `YouTube viewer` label, keeps normal operator preview context on safe `authorDisplayName`, and requires an explicit toggle before compact stream-safe display shows the existing sanitized safe name. It does not add an OBS overlay token runtime, OBS overlay route, moderation actions, schema changes, remote Supabase work, provider/live execution, deploy/upload, public gate flip, or public access change.

The Step 9 update is a policy/contract/documentation slice only. It selects `login-only` for Free public beta access and keeps waitlist approval for Creator/paid beta access. The current runtime gate remains unchanged behind the existing private launch SHA-256 owner allowlist until a later approval-gated access-change operation.

The Step 10 update is a policy/contract/documentation slice only. It selects `cloudflare-edge` as the public traffic rate-limit backing, rejects a new Supabase durable rate-limit table for this launch step, and keeps the current in-app guard as defense-in-depth. Cloudflare edge activation remains not-run / approval-gated.

The Step 11 update is a policy/contract/documentation slice only. Supabase Support response remains pending, and the release owner accepts the known future `public` object default-privileges risk for PL-G5 evaluation. Existing current-table/RLS/current-grant posture remains the reviewed pass surface. Remote remediation/apply, remote mutation, deploy/upload, public gate flip, and main promotion remain not-run.

The operator QA checklist update is a documentation/contract slice only. It separates operator-owned external checks from Codex-owned deterministic checks before PL-G5 / PL-G6. The 2026-07-09 operator update records preview Managed Challenge setup, safe `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` presence, login-only Free beta browser smoke, Creator/paid waitlist boundary smoke, and YouTube-connect no-autostart smoke. Production edge activation, production API Managed Challenge, production harness blocking, live/provider execution, deploy/upload, public gate flip, and main promotion remain not-run / approval-gated unless separately stated.

The Cloudflare custom-rule operations update is a documentation/contract slice only. `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md` records Free public launch, Creator/Paid transition, API-vs-HTML Managed Challenge boundaries, Turnstile / Pre-clearance treatment, Rate Limiting preference, traffic-growth response ladder, release-operator checks, and non-actions. It does not run Cloudflare mutation, deploy/upload, public gate flip, live/provider execution, paid entitlement runtime, or main promotion.

The PL-G5 release-owner decision record is a documentation/contract slice only. `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md` records the current launch-decision surface, carries the accepted future default-privileges risk label, records `release_owner_decision_status=blocked-no-approval`, and keeps public-release capable as no. It does not run support follow-up, Cloudflare mutation, Supabase query/mutation, deploy/upload, public gate flip, live/provider execution, paid entitlement runtime, OBS overlay runtime, or main promotion.

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
| `public_launch_operator_qa_checklist_status` | `complete` |
| `operator_external_verification_status` | `partial-pass-preview-browser` |
| `operator_remaining_external_verification_status` | `action-required` |
| `operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge` |
| `operator_cloudflare_env_reference_status` | `present-enabled-label` |
| `operator_free_beta_login_browser_smoke_status` | `pass-preview-browser` |
| `operator_waitlist_boundary_browser_smoke_status` | `pass-preview-browser` |
| `operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-browser` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `operator_production_harness_block_status` | `action-required-before-production` |
| `cloudflare_custom_rule_operations_doc_status` | `complete` |
| `cloudflare_custom_rule_operations_doc` | `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md` |
| `free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge` |
| `api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only` |
| `traffic_growth_response_ladder_status` | `documented` |
| `pl_g5_release_owner_decision_preflight_doc_status` | `complete` |
| `pl_g5_release_owner_decision_record_status` | `complete` |
| `pl_g5_release_owner_decision_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md` |
| `release_owner_decision_status` | `blocked-no-approval` |
| `release_owner_missing_approval_scope` | `public-capability-risk-acceptance-and-remaining-operator-checks` |
| `release_owner_exact_approval_status` | `absent` |
| `codex_local_verification_status` | `pass` |
| `public_release_capable_status` | `no` |
| `public_gate_flip_status` | `not-run` |
| `main_promotion_status` | `not-run` |

## Remaining Public Launch Task Order

1. `Public launch remaining task board`: record this updated task order and verification boundary.
2. `Monthly input character accounting`: complete in the current implementation line. The Free monthly 20,000 character cap canonically means provider-input/source characters, not translated-output characters; translated-output characters are analytics metadata only if retained.
3. `Free limits public copy`: complete. Public UI, legal copy, and task-board copy state the Free beta limits as `1日最大30分`, `1セッション最大30分`, `30翻訳メッセージ/分`, and `月20,000入力文字`; English UI copy states up to 30 minutes per day, up to 30 minutes per session, 30 translated messages per minute, and 20,000 provider-input/source characters per month.
4. `OBS Dock display-name policy`: complete. Normal operator preview can show safe `authorDisplayName`; compact stream-safe comments-only display defaults to `YouTube viewer` and only shows the existing sanitized safe name when the explicit display-name toggle is enabled. Long compact names are truncated.
5. `Public beta access gate decision`: complete. Free public beta access is selected as `login-only`; waitlist approval remains for Creator/paid beta access. Current runtime gate unchanged: the existing private launch SHA-256 owner allowlist remains active until a separate approval-gated public access-change operation.
6. `Public traffic rate-limit backing`: complete. Public traffic backing is selected as `cloudflare-edge`; no Supabase durable rate-limit table is created, and risk acceptance is not selected. Current in-app rate-limit guard remains defense-in-depth until a separate approval-gated Cloudflare edge activation operation.
7. `Supabase default privileges support response or risk acceptance`: complete. Supabase Support response remains pending, and the known future `public` object default-privileges risk is accepted for PL-G5 evaluation. Current-table/RLS/current-grant pass posture is not part of the accepted risk.
8. `Public launch operator QA checklist`: complete. User-owned external checks and Codex-owned deterministic checks are separated in `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md`; preview Cloudflare/browser checks are partially passed by operator report, while production edge activation, production harness blocking, live/provider checks, deploy/upload, public gate flip, and main promotion remain action-required / approval-gated.
9. `Cloudflare custom-rule operations doc`: complete. The operational guide is `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`; it records Free public launch defaults, Creator/Paid transition handling, API-vs-HTML Managed Challenge boundary, Rate Limiting preference, Turnstile Pre-clearance as later improvement, traffic-growth response ladder, release-operator checks, and non-actions.
10. `PL-G5 release-owner decision`: decision recorded in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`; release-owner decision is `blocked-no-approval`, public release capable remains no, and all accepted residual risks / remaining action-required checks are carried forward.
11. `PL-G6 public access change / promotion`: approval-gated public gate flip, production domain cutover, deploy/upload, or integration-to-main promotion.
12. `Final production smoke`: approval-gated final production/main-domain smoke with sanitized pass/fail/count/status evidence only.

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
- Public launch operator QA checklist: complete for docs/contract separation and 2026-07-09 sanitized operator update. Preview Managed Challenge setup, safe edge-control reference presence, login-only Free beta browser smoke, Creator/paid waitlist boundary smoke, and YouTube-connect no-autostart smoke are recorded as partial external pass. Production edge activation, production API Managed Challenge, production harness blocking, optional burst comment smoke, optional 30-minute session smoke, optional monthly cap fixture/live smoke, Start-to-translation live smoke, deploy/upload, public gate flip, remote mutation, and main promotion remain not-run / approval-gated.
- Cloudflare custom-rule operations: complete for docs/contract guidance only. Free public launch defaults to login Turnstile plus app-side quotas/session limits without constant ordinary-route challenge; production API Managed Challenge remains not-selected; Cloudflare Rate Limiting Rules are preferred for API load shedding where available; Managed Challenge remains HTML-route or emergency/temporary control; paid/Creator entitlement stays app-side; traffic-growth response ladder is documented. No Cloudflare mutation, deploy/upload, public gate flip, live/provider execution, paid entitlement runtime, or main promotion was run.
- PL-G5 release-owner decision record: complete for docs/contract guidance only. Release-owner decision is `blocked-no-approval`, exact approval remains `absent`, public release capable remains `no`, Supabase Support response remains `pending`, and PL-G6 public access change / promotion remains not-run / approval-gated. Missing approval scope is `public-capability-risk-acceptance-and-remaining-operator-checks`. No support follow-up, remote Supabase query/mutation, Cloudflare mutation, deploy/upload, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion was run.
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
