# Comment Translator Paid Core v1 Task 5 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the server-owned billing-period character quota and provider-cost reservation contract for Paid Core v1 without invoking a provider or changing external infrastructure.

**Architecture:** Keep the existing Task 2 service-role-only Supabase RPCs as the atomic authority for billing-period usage, owner/global cost buckets, logical attempts, provider receipts, and Azure shared-capacity reservations. Add a pure server-only policy layer for Unicode code-point validation, HMAC-based short-lived attempt identity, conservative cost estimation, and sanitized settlement decisions; keep Free ledger behavior and Task 3/4 authority boundaries intact.

**Tech Stack:** TypeScript server-only modules, Supabase/Postgres migration/RPC contracts, dependency-free Node `.mjs` fixture contracts, PowerShell verification.

---

## Scope and ownership

- Modify `lib/comment-translator-usage-ledger-runtime.ts` only for shared, non-provider-specific usage/authority helpers; preserve the existing Free ledger behavior.
- Modify `lib/comment-translator-durable-usage-counter-store.ts` only where Paid authority reads must remain fail-closed and separate from the Free ledger.
- Modify `lib/comment-translator-paid-usage-store.ts` for the narrow server-only RPC adapter contract and validation needed by Task 5.
- Create `lib/comment-translator-paid-cost-ledger.ts` for pure conservative cost/settlement policy and sanitized cost records.
- Modify `lib/comment-translator-session-policy.ts` and `lib/comment-translator-session-types.ts` for Paid quota/cost stop and entitlement types; do not integrate UI or Provider execution.
- Modify the existing Task 2 migration only for a demonstrated Task 5 atomicity/authority gap; do not apply it remotely.
- Create a focused `scripts/comment-translator-paid-core-v1-task5-usage-cost-contract.mjs` covering the approved Task 5 boundaries.
- Update `task.md` only after implementation and verification; this remains root-owned.

## Task 1: Focused RED contract

- [ ] Assert the 500,000-character billing-period constants and Stripe period start/end authority.
- [ ] Assert Unicode code-point counting, 500-code-point item cap, whole-item rejection, and non-consumption for cache/empty/duplicate/language-skip outcomes.
- [ ] Assert HMAC attempt identity is opaque, short-lived, retry/fallback stable, and excludes raw comment/hash/provider identifiers from persistence.
- [ ] Assert reserve/commit/release/unknown-charge settlement is logical-attempt idempotent and fallback commits at most once.
- [ ] Assert individual US$3 and global US$25 reservations occur before provider execution, with conservative unknown charge retention.
- [ ] Assert Azure paid fallback is separate from the Free ledger and enforces `free + paid + 600000 < 2000000`, including F=59 allowed and F=60 rejected fixtures.
- [ ] Assert entitlement, period, usage, and cost authority failures return a fail-closed provider-not-callable decision.
- [ ] Run the focused contract and confirm a feature-missing RED failure before production implementation.

## Task 2: Quota and attempt policy GREEN

- [ ] Implement pure Unicode code-point counting and bounded item validation.
- [ ] Implement current Paid billing-period normalization from authoritative Stripe period start/end; renewal activation requires successful payment projection.
- [ ] Implement short-lived HMAC attempt derivation with key-version input and no raw content/identifier persistence.
- [ ] Implement logical settlement decisions that preserve one character charge across retry/fallback and do not charge unsent characters.
- [ ] Run the focused contract and confirm GREEN.

## Task 3: Cost and Azure reservation policy GREEN

- [ ] Implement conservative request cost estimation and sanitized cost outcome classification, including unknown charge retention.
- [ ] Implement pre-provider individual/global cost reservation inputs and fail-closed rejection when authority is unreadable.
- [ ] Implement Azure paid fallback logical bucket separation and strict shared physical-capacity checks, preserving Free usage authority.
- [ ] Add boundary fixtures for F<=60 theory, F=60 strict rejection, and F<=59 full simultaneous use.
- [ ] Run the focused contract and confirm GREEN.

## Task 4: Store/session boundaries and schema contract

- [ ] Extend server-only adapters/types only where the Task 5 contract needs them; keep provider HTTP adapters and session integration out of scope.
- [ ] If needed, make the smallest additive Task 2 RPC/migration correction for period activation, cost reservation ordering, or logical idempotency.
- [ ] Re-run Task 2 schema/migration/store/concurrency contracts, Task 3 Webhook contracts, Task 4 Checkout/region/capacity/consent contracts, and Free baseline contracts.

## Task 5: Verification and review

- [ ] Run changed TypeScript/JavaScript syntax checks and `git diff --check`.
- [ ] Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`; classify missing `node_modules` or tools as setup-blocked without installing dependencies.
- [ ] Run sanitized scans for secrets, private identifiers, raw payloads, comment hashes/text, Checkout URLs, and Task 6+ provider/session/UI capability leakage.
- [ ] Inspect the actual diff, changed-file list, ownership boundaries, and absence of external mutation.
- [ ] Obtain a read-only `sol-reviewer` review; delegate only listed specification repairs if required, then rerun affected checks.
- [ ] Update `task.md` with implementation, verification, setup-blocked scope, and remaining approval gates.

No commit, push, Draft PR, merge, remote Supabase apply, Stripe/provider/Cloudflare operation, deploy, activation, or cleanup is part of this plan.
