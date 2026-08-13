# Comment Translator Paid Core v1 Task 6

## Objective

Implement the approved Task 6 provider boundary: a GPT-4o-mini structured-output adapter, sanitized failure classification, an OpenAI circuit breaker, and an Azure direct fallback path that composes with the Task 5 durable reservation RPCs without changing Free behavior.

## Constraints

- Work only in the Task 6 worktree and keep one writer active.
- No dependency, manifest, or lockfile change; no remote Supabase, live provider, deploy, activation, commit, push, or PR operation. Additive Task 6 migrations are allowed only where the provider contract proves the existing durable RPC boundary cannot persist half-open probe ownership, owned failure ordering, fresh rate-retry predecessor state, safe Azure reservation after an uncertain retry, or separate Azure-only versus logical billing character values.
- Preserve the Task 1–5 contracts and the Free Azure baseline.
- Never return or persist raw provider payloads/errors, comment hashes, secrets, author data, YouTube metadata, or private identifiers.
- Treat unreadable authority as pre-provider fail-closed.

## TDD sequence

1. Add and run the focused Task 6 provider fixture contract; capture the expected RED result while the new adapter and circuit-breaker modules are absent.
2. Implement the OpenAI request/response adapter with fixed model, strict schema, bounded batching, timeout, sanitized failure classes, subset retry, and no metadata leakage.
3. Implement pure circuit-breaker transitions and the durable-authority seam for disabled, degraded, Azure-direct, half-open, and recovery states; add only the contract-proven additive circuit ownership and retry/finalization RPC seams.
4. Add the Paid execution branch around the existing provider-safe input pipeline. Reserve before OpenAI, retain uncertain OpenAI reservations, use Azure direct only for eligible failures, and commit/release quota through the existing Task 5 store.
5. Keep the existing Free provider execution and F10 feed bridge behavior unchanged; expose only a narrow Paid execution seam in the Azure normal-translation module.
6. Run the focused contract GREEN, then Task 6 plus Task 5, Task 2, Task 3, Task 4, Free baseline, privacy, syntax, lint, typecheck, and build checks. Treat missing `node_modules` as a setup blocker without installing dependencies.
7. Inspect the actual diff and obtain a read-only Sol Medium review. Apply only specification-mismatch repairs, then rerun affected checks.

## Acceptance checks

- GPT-4o-mini, `store:false`, strict structured output, max 15 items, max 7,500 code points, max 1,000 output code points/item, and `items*128+384` request limit.
- Only text and language pair plus an opaque attempt id and minimal instruction enter the OpenAI body.
- OpenAI reservation obtains session lease, eight-slot lease, 70% RPM/TPM, character quota, and individual/global cost atomically before the provider call.
- Azure direct fallback obtains no OpenAI slot/RPM/TPM/cost reservation.
- Network/timeout/408/504/500/503/ordinary bounded-retry 429 are fallback-eligible; parse/schema/policy/auth/config/quota/cost/invalid/unsupported are not.
- An ordinary 429 is counted as a circuit failure only when its fresh retry is refused or its bounded retry remains failed; a successful fresh retry is not double-counted.
- Timeout, disconnect, and crash preserve uncertain OpenAI capacity until TTL/reclaim; successful items are not retried.
- A safe terminal predecessor plus one retained uncertain OpenAI retry may still reserve Azure for the unresolved subset; the uncertain OpenAI cost/slot/lease remains retained.
- OpenAI successes accumulate across a subset retry; a known Azure partial result commits Azure characters to the Azure bucket and the combined OpenAI+Azure characters to the logical Paid billing period.
- Circuit transitions at three eligible failures in 60 seconds, sends Azure direct for five minutes, and requires a valid half-open probe for recovery.
- Paid exhaustion never falls through to Free entitlement.

## Result

- Implementation and fixture contracts are complete on `codex/comment-translator-paid-v1-task6`; the generic Paid provider-policy path now fails closed, and only the explicit Task 6 Paid runtime can reach a Provider.
- Task 6, Task 2, Task 4, and Task 5 focused contracts, migration/store/schema/concurrency checks, syntax checks, and `git diff --check` pass. Sol Medium read-only review is GO after bounded specification repairs.
- Official GPT-4o-mini pricing was rechecked and the section 12 planned cases were recalculated. Actual serialized prompt/schema token measurement remains an acceptance/setup blocker because approved tokenizer tooling is unavailable and dependency/manifest changes are prohibited.
- Full lint, TypeScript, build, TypeScript-backed sibling/privacy contracts, and real PostgreSQL migration/concurrency verification remain setup/operation blocked. No external Provider/DB operation or Git publication operation was performed.
