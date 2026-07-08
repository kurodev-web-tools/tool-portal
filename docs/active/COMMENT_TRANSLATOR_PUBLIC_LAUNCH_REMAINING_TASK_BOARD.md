# Comment Translator Public Launch Remaining Task Board

Date: 2026-07-08

## Scope

This document records the remaining task order for taking Kuro Live Comment Translator from the current allowed-tester/free-public-beta integration state to public launch, plus the current status of the public Free limit copy, OBS Dock display-name policy, public beta access gate decision, and public traffic rate-limit backing decision.

The Step 8 update is a policy/UI/contract slice only. It defaults stream-safe / compact comments-only display to the generic `YouTube viewer` label, keeps normal operator preview context on safe `authorDisplayName`, and requires an explicit toggle before compact stream-safe display shows the existing sanitized safe name. It does not add an OBS overlay token runtime, OBS overlay route, moderation actions, schema changes, remote Supabase work, provider/live execution, deploy/upload, public gate flip, or public access change.

The Step 9 update is a policy/contract/documentation slice only. It selects `login-only` for Free public beta access and keeps waitlist approval for Creator/paid beta access. The current runtime gate remains unchanged behind the existing private launch SHA-256 owner allowlist until a later approval-gated access-change operation.

The Step 10 update is a policy/contract/documentation slice only. It selects `cloudflare-edge` as the public traffic rate-limit backing, rejects a new Supabase durable rate-limit table for this launch step, and keeps the current in-app guard as defense-in-depth. Cloudflare edge activation remains not-run / approval-gated.

Sanitization boundary: this document records only task labels, status labels, and public file/path references. It does not include project identifiers, support ticket ids, raw support text, private owner role values, raw SQL output, raw stdout/stderr, raw response bodies, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, or raw account metadata.

## Current Launch State

| Area | Status |
| --- | --- |
| `support_contact_status` | `submitted` |
| `support_response_status` | `pending` |
| `current_table_rls_grant_status` | `pass` |
| `remote_default_privileges_status` | `fail-support-pending-or-risk-acceptance-required` |
| `obs_dock_display_name_policy_status` | `complete` |
| `public_beta_access_gate_decision_status` | `complete` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_waitlist_boundary` | `creator-paid-beta-only` |
| `public_traffic_rate_limit_backing_status` | `complete` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `edge_activation_status` | `not-run-approval-gated` |
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
7. `Supabase default privileges support response or risk acceptance`: consume Supabase Support response if available; otherwise record explicit PL-G5 risk acceptance before public release can be marked capable.
8. `PL-G5 release-owner decision`: record the release-owner public launch decision with all accepted residual risks.
9. `PL-G6 public access change / promotion`: approval-gated public gate flip, production domain cutover, deploy/upload, or integration-to-main promotion.
10. `Final production smoke`: approval-gated final production/main-domain smoke with sanitized pass/fail/count/status evidence only.

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
- Private launch gate behavior: not changed in this task-board slice.
- Edge/durable rate-limit control: Cloudflare edge backing selected only; activation not run.
- Supabase default privileges remediation/apply: not run.
- Remote Supabase migration apply, `db push`, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, public access change, and promotion to `main`: not run.

## Verification

Local checks for the Step 10 slice:

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
