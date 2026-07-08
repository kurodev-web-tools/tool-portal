# Comment Translator Public Launch Remaining Task Board

Date: 2026-07-08

## Scope

This document records the remaining task order for taking Kuro Live Comment Translator from the current allowed-tester/free-public-beta integration state to public launch.

This is a planning and task-board slice only. It does not change runtime behavior, run provider/OAuth/Stripe flows, apply migrations, run remote Supabase queries or mutations, deploy/upload, flip a public gate, promote to `main`, capture raw comments, capture raw responses, expose credentials, or change public access.

Sanitization boundary: this document records only task labels, status labels, and public file/path references. It does not include project identifiers, support ticket ids, raw support text, private owner role values, raw SQL output, raw stdout/stderr, raw response bodies, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, or raw account metadata.

## Current Launch State

| Area | Status |
| --- | --- |
| `support_contact_status` | `submitted` |
| `support_response_status` | `pending` |
| `current_table_rls_grant_status` | `pass` |
| `remote_default_privileges_status` | `fail-support-pending-or-risk-acceptance-required` |
| `public_release_capable_status` | `no` |
| `public_gate_flip_status` | `not-run` |
| `main_promotion_status` | `not-run` |

## Remaining Public Launch Task Order

1. `Public launch remaining task board`: record this updated task order and verification boundary.
2. `Monthly input character accounting`: complete in the current implementation line. The Free monthly 20,000 character cap canonically means provider-input/source characters, not translated-output characters; translated-output characters are analytics metadata only if retained.
3. `Free limits public copy`: next. State the Free beta limits as `1日最大30分`, `1セッション最大30分`, `30翻訳メッセージ/分`, and `月20,000入力文字`.
4. `OBS Dock display-name policy`: decide display-name visibility, compact layout, and stream-safe behavior for OBS Dock without exposing provider-private identifiers.
5. `Public beta access gate decision`: decide whether public beta opens as login-only or waitlist-approved instead of SHA-256 owner allowlist only.
6. `Public traffic rate-limit backing`: select and verify an approved edge/durable rate-limit control for public exposure, or explicitly accept the remaining distributed-abuse-control risk.
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

- Runtime accounting changes: implemented only for monthly provider-input character accounting in the follow-up implementation slice; no provider/live execution was run.
- Public copy changes: not implemented in this task-board slice.
- OBS Dock behavior: not implemented in this task-board slice.
- Private launch gate behavior: not changed in this task-board slice.
- Edge/durable rate-limit control: not implemented in this task-board slice.
- Supabase default privileges remediation/apply: not run.
- Remote Supabase migration apply, `db push`, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, public access change, and promotion to `main`: not run.

## Verification

Local checks passed for this slice:

- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `git diff --check`
- changed-files high-confidence secret scan: `changed_files=3`, `secret_scan_matches=0`.
- `npm run lint`
- `npx tsc --noEmit --pretty false`

`npm run build` was skipped because no runtime TS/TSX changed. UI/browser width QA was skipped because no rendered UI changes.
