# Comment Translator Creator Closed Beta Task Board

## Authority And Current State

- Free public beta is complete.
- Current priority: P0 Creator closed beta.
- First implementation sequence: C1 -> C3 is locally implemented; C3 publication and integration verification are the next gate.
- C1 is merged through PR #668 at exact integration commit `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; its merge tree matches C1 head `baf8bf57dd570c3dca6bc29c880f47b7f7444fac`.
- C2 and C4 remain separately approval-gated and do not bypass C3 publication / integration verification.
- C5 through C11 are the user-visible closed-beta capability sequence after the entitlement and usage foundations; C12 is the ending final-QA gate.
- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.
- PRs target `codex/comment-translator-free-public-beta-integration` from short-lived feature branches.

## C1 Acceptance Boundary

C1 is accepted only when all of the following are verified:

- Durable, server-owned paid entitlement rows are authoritative for access decisions.
- Signed billing evidence is the only accepted billing-state input.
- Browser-readable and operator-visible output is sanitized and contains no secrets, private identifiers, provider metadata, credentials, or billing identifiers.
- Missing, unreadable, incomplete, or inactive entitlement state fails safely to Free / paid-inactive.

- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.

### Verified C1 Merge Evidence

- `comment_translator_creator_c1_paid_entitlement_store_contract=pass` verifies signed-evidence-only persistence, durable reads, atomic stale/replay rejection, unexpected-price rejection, sanitized webhook output, and Free / paid-inactive fallback.
- The server-owned store targets `comment_translator_paid_entitlements` through the existing trusted service-role boundary; anon and authenticated table access are revoked in the local migration.
- Billing access reads no longer use process-local paid entitlement state. Missing store configuration, unreadable rows, incomplete active evidence, inactive state, and expired active periods do not activate Paid.
- Browser-readable billing state omits billing references and provider metadata; webhook output is limited to sanitized status, plan, billing state, or reason labels.
- PR #668 is merged into `codex/comment-translator-free-public-beta-integration` at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; the focused C1 entitlement contract and Creator authority contract were verified at that integration state.

## C3 Acceptance Boundary

- Paid usage is entered only through the server-derived billing-user reference and a readable C1 `paid-active` entitlement derived from signed Stripe webhook evidence.
- A trusted trigger creates the zero counter and resets it only when signed entitlement evidence advances `current_period_end`; repeated evidence for the same period preserves usage and an older period cannot roll the counter back.
- The trusted RPC rechecks paid-active state and the exact signed period, serializes the counter row, and deduplicates a private server-derived usage-event reference before incrementing.
- C3 counts only already-established provider-executed translated-message, provider-input-character, and estimated-cost fields. It does not invent a paid quota amount, reset day, timezone, plan interval, token multiplier, or provider charging rule.
- Missing, unreadable, incomplete, expired, paid-inactive, stale-period, or missing-counter state fails closed to a sanitized Free / paid-inactive result.
- Browser / operator output contains counts and status labels only; owner ids, billing identifiers, provider metadata, credentials, raw payloads, event references, and private reset/counter keys remain server-only.

### Verified C3 Local Evidence

- `comment_translator_creator_c3_paid_usage_counter_contract=pass` verifies concurrent duplicate counting exactly once, signed-period rollover to zero, old/future timestamp rejection, entitlement downgrade, incomplete/unreadable entitlement and usage state, missing-counter fail-closed behavior, and sanitized output.
- The local migration defines service-role-only `comment_translator_paid_usage_counters` and private deduplication events plus an entitlement-triggered reset and entitlement-gated atomic RPC.
- No UI files changed, so browser / width QA is not applicable to C3.

### Residual Risk And Next Handoff

- Remote Supabase query, migration apply, schema mutation, and production data access were not run. Until an explicitly approved migration apply exists, deployed reads safely return Free / paid-inactive.
- Stripe live Product, Price, Checkout, Portal, and webhook operations were not run. Local verifier fixtures are not live billing evidence.
- Actual monthly cadence is not claimed until separately approved C2 billing evidence establishes the configured Price / subscription interval; C3 follows only signed period-boundary advances.
- C3 provides the server-only paid accounting boundary; wiring a paid provider execution path into it remains C4 scope and was not implemented or executed here.
- Fresh worktree dependencies are absent and install is prohibited in this task, so repository lint, typecheck, build, and dependency-backed historical C1 contract reruns remain unchecked locally.
- Next handoff requires separate approval for commit / push / PR. After merge, the exact integration result must pass focused C1, C3, and Creator authority contracts before C2 or C4 begins under its own approval gate.

## Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995` |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |
| C3 | Paid usage and monthly reset | local verified / publication approval pending |
| C4 | AI natural translation provider route | pending / gated |
| C5 | OBS overlay token runtime | pending |
| C6 | OBS overlay UI route | pending |
| C7 | Moderator share token runtime | pending |
| C8 | Moderator share UI route | pending |
| C9 | Custom dictionary minimum | pending |
| C10 | Priority display polish | pending |
| C11 | Simple 7-day history | pending |
| C12 | Creator closed beta final QA | pending |

## Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | pending |
| CP2 | Creator public paid gate flip | pending / gated |

## Public-after-P1 / Post-MVP

| ID | Task | Status |
| --- | --- | --- |
| P1-1 | `streamList` primary migration | later |
| P1-2 | 30-day history and search | later |
| P1-3 | CSV export | later |
| P1-4 | Overlay templates | later |
| P1-5 | Dictionary import and suggestions | later |
| P1-6 | AI operations helpers | later |
| P1-7 | Provider comparisons | later |
| P1-8 | Platform expansion | later |
| P1-9 | Voice translation / subtitle work | later |

## Approval And Scope Boundary

This authority is a task board only. Every gated operation requires a separate, same-thread preflight and explicit approval.

- C1 is merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; remote migration apply remains approval-gated.
- C3 is locally verified only; publication, remote migration apply, and exact integration verification remain approval-gated.
- Out of scope: Stripe mutation.
- Out of scope: Supabase mutation.
- Out of scope: provider mutation.
- Out of scope: manual deploy.

The following operations are not performed in this task-board authority slice:

- Any Stripe live action, including live Checkout, Customer Portal, or webhook operations.
- Translation-provider execution.
- Any Cloudflare mutation, configuration change, binding change, or environment change.
- Any production gate change, activation, or public release action.

No secrets, private identifiers, provider metadata, or credentials belong in this board, its verification evidence, PR body, or handoff.
