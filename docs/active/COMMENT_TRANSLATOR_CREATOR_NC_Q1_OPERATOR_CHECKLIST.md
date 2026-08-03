# Comment Translator Creator NC-Q1 Operator Checklist

## Purpose

Use this checklist to reproduce NC-Q1 local evidence and to prepare a later, separately approved allowed-tester QA. Record only sanitized status/count evidence. Do not paste secrets, cookies, tokens, private identifiers, raw provider/Stripe payloads, browser storage, private URLs, or account metadata.

## Local QA — Authorized Now

- [ ] Confirm checkout is `codex/comment-translator-creator-nc-q1` at base merge `10c3adf507d21d61891f62a3b2ee9a24f28ea56d` or record the new exact base.
- [ ] Confirm PR #746 final head `ce1d064190de3a2db147bc2fedc2633054e1c78e` is an ancestor; do not infer deployment success.
- [ ] Confirm `git status --short` contains only the intended NC-Q1 files.
- [ ] Run `node --check` for both NC-Q1 scripts.
- [ ] Run `node scripts/comment-translator-creator-nc-q1-integrated-qa-contract.mjs`; require 14/14 local lanes, fixture/local-only evidence, and activation closed.
- [ ] Confirm the legacy crosswalk has exactly 23 rows and zero unexplained omissions.
- [ ] Confirm authenticated Free, paid-inactive, missing/incomplete/ambiguous authority, Checkout completion, stale, replay, duplicate, pre-provider budget/quota rejection, provider failure, post-provider usage commit failure, and signed-active fixture cases.
- [ ] Confirm the effective closed path has zero paid side effects; only the explicit fixture-only harness can exercise the hypothetical Paid sequence.
- [ ] Confirm the fixture-only behavioral composition invokes the actual B1→D1→E1→C1/P1/U1→V1/H1 projection/store/runtime exports and the actual O1→O2 and M1→M2 capability pairs; a static lane-name matrix or handwritten H1 store is insufficient.
- [ ] Confirm wrong marker, local evidence, `productionProof=true`, and `deployedProof=true` each keep both actual billing and entitlement activation policies closed.
- [ ] Confirm the actual H1 store adapter serializes its exact RPC allowlist, its parser drops injected owner/session/message/unexpected/correlation fields, the read row retains actual P1 translated text, and persisted priority safely downgrades to `standard` under the current storage contract.
- [ ] Scan the NC-Q1 diff for Container/Docker/config/binding, secret/private identifier/raw payload, browser storage/query/log authority, and migration changes.
- [ ] If `node_modules` is absent, record lint, strict typecheck, Next build, OpenNext build, and dependency-backed contracts as `setup-blocked`; do not install.
- [ ] If UI/CSS did not change, record width QA as not applicable rather than as passed.
- [ ] Run a fresh read-only semantic review after root verification and resolve every material finding before acceptance.

## Later Manual QA Plan — Separate Approval Required

Run only after the operator names the exact environment, allowed tester, approved operation, evidence retention location, and stop/rollback owner. Approvals for dependency install, migration, each live provider/Stripe/token/session operation, authenticated browser smoke, deploy, and activation are independent.

1. Preflight: verify the deployed commit and bindings without exposing values; prove all paid/public activation gates remain closed.
2. Authentication: exercise unauthenticated, authenticated Free, paid-inactive, and approved signed-active tester states. Missing/unreadable state must stay Free or denied.
3. Billing: use only approved test/live mode and exact configured product/price. Verify Checkout/Portal denial while closed, duplicate prevention, signed webhook idempotency, stale/replay/out-of-order handling, and that redirect/completion alone never grants Paid.
4. Usage/provider/dictionary: verify no provider call on pre-provider budget/quota rejection, no usage call on provider failure, suppressed output and no usage success on post-provider commit rejection, bounded dictionary projection, strict output parsing, and sanitized failure classes.
5. OBS/moderator: verify one-time redemption, digest-only persistence evidence, scope separation, revoke/rotate/expire/session replacement, token-free stable URLs, and safe read-only output.
6. History/priority: verify seven-day cutoff, owner isolation, cleanup behavior, deleted/tombstone propagation, server-derived classification, and display-only filters.
7. Browser surfaces: only if UI/CSS or authenticated browser QA is separately approved, check `390 / 820 / 1024 / 1280 / 1366px` for feed, history, OBS, and moderator surfaces, including keyboard/focus, console, storage writes, and horizontal overflow.
8. Failure/rollback: make Supabase/provider/Stripe state unavailable only in an approved safe target; require fail-closed behavior, Free continuity, sanitized output, and an operator-owned stop/rollback result.
9. Evidence: record exact commit/environment, evidence class, timestamp, command/scenario, sanitized result/count, blocker, and reviewer. Never promote fixture/local evidence to live proof.

## Stop Conditions

Stop immediately on any secret/private identifier/raw payload exposure, browser-selected authority, unsigned Paid transition, provider call after failed accounting, committed usage success after provider failure, cross-owner/cross-capability access, activation drift, migration drift, unapproved cost-bearing call, or mismatch between the named target and observed evidence. Keep activation closed and request the specific missing approval or correction.

## External Gates Remaining Closed

- dependency installation and manifest/lockfile change;
- remote Supabase observation/write and migration apply;
- live Stripe Product/Price/Checkout/Portal/webhook/account operation;
- live provider/account/quota operation;
- live token/session/capability issue, redemption, rotation, or revocation;
- authenticated production browser smoke;
- deploy, activation, public paid gate, release, merge, commit, push, PR, and cleanup;
- Product/Price/tax/legal/support/copy decisions;
- NC-R1 and later roadmap work.
