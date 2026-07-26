# Comment Translator Creator Paid Launch Readiness Preflight

Status: CP1 Creator paid launch readiness / preflight only.

cp1_local_readiness_status=complete
creator_public_paid_launch_readiness_status=blocked-approval-gated
cp1_integration_base=097f369a47564b7a44d211c212580f993eddc71b
cp1_c12_containment_status=verified
cp1_new_public_api_status=preview-readiness-route-source-approved
cp1_reference_presence_endpoint_base=19eaa0fe0d52c4563ae1957d994c679d0b4bd0dc
cp1_reference_presence_endpoint_status=source-only-not-deployed
cp1_cloudflare_change_status=not-run
cp1_remote_mutation_status=not-run-approval-gated
cp1_stripe_action_status=not-run-approval-gated
cp1_provider_live_status=not-run-approval-gated
cp1_authenticated_browser_qa_status=not-run-approval-gated
cp1_width_qa_status=planned-not-run-approval-gated
cp1_dependency_install_status=not-run-not-approved
cp1_runtime_ui_change_status=not-required
cp1_cp2_status=not-run-approval-gated
cp1_public_paid_launch_status=not-run-approval-gated

CP1 prepares reviewable approval surfaces. It does not prove that Creator Paid is deployed, usable by an allowed tester, release-ready, or approved for public traffic.

## Verified Starting State

- C12 PR #679 is merged into `codex/comment-translator-free-public-beta-integration`.
- The fetched integration tip and exact C12 merge commit at CP1 start are `097f369a47564b7a44d211c212580f993eddc71b`.
- C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in that integration state.
- The C12 fixed comparison remains the CP1 baseline: `18 pass / 9 dependency-blocked / 3 known historical / 0 unexpected`.
- `node_modules` is absent. CP1 does not install dependencies or reinterpret missing dependency-backed checks as regressions.
- C1-C12 local contracts, migration sources, and existing authenticated server actions/routes remain the authority. No concrete runtime or UI blocker was proven during CP1 discovery.

## Decision Boundary

CP1 is docs/contracts/readiness only. Existing authenticated server actions and routes remain authoritative.

The original CP1 slice did not add or authorize a public/deployed API, route, Worker binding, edge configuration, Cloudflare setting, parallel backend surface, browser authority, or demonstration UI. Following separate approval bound to integration revision `19eaa0fe0d52c4563ae1957d994c679d0b4bd0dc`, this follow-up may add one preview/integration-only GET route for reference-presence readiness. The route may inspect property existence only, returns reference names with `present` / `missing` / `unreviewed` and counts, and treats a missing `COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS` reference as the normal inactive state. It must not inspect values, call external services, access Stripe/provider/Supabase/OAuth/token/session/cookie state, deploy, invoke a Worker, change configuration, activate billing, flip CP2, promote to `main`, or authorize public paid launch.

The following remain outside CP1 and require later exact approval: remote Supabase reads or mutations, migration apply, deployed store smoke, Stripe Product/Price/Checkout/Portal/webhook work, provider or YouTube execution, token/session operations, authenticated browser QA, deploy/upload, activation, CP2, promotion to `main`, public access change, and Creator public paid launch.

## Evidence Lanes

One lane cannot substitute for another. Planned, fixture, reference-presence, fail-closed, or local deterministic evidence is never live proof.

| Lane ID | Authority | Status | Evidence boundary |
| --- | --- | --- | --- |
| LOCAL-DETERMINISTIC | Repository source, migration policy, and dependency-free contracts | locally-verified | Commit/contract identifiers, classifications, counts, and pass/fail only. This does not prove a remote store, billing account, provider account, deployed revision, or authenticated browser. |
| REFERENCE-PRESENCE | Operator-owned server/deployment/account configuration | approval-gated | Reference names and presence/missing status only. Values, identifiers, URLs, and account metadata are forbidden. Presence is not behavior proof. |
| REMOTE-DEPLOYED | Approved remote migration, deployed store, Stripe, provider, or cleanup operation | approval-gated | Exact target label, action label, status, count, sanitized reason, and rollback status only. Each operation needs its own approval unit. |
| AUTHENTICATED-BROWSER | Approved allowed-tester Creator, OBS, moderator, dictionary, and history proof | approval-gated | Route/surface label, width, visible-state label, count, overflow/console/storage pass/fail, and sanitized stop reason only. |
| RELEASE-OWNER | Deploy, CP2, promotion, activation, and public launch decision | approval-gated | Explicit decision label bound to the reviewed revision and completed prerequisite evidence. CP1 provides no release authorization. |

## Operator Reference-Presence Readiness

Local source inspection confirms the following reference names are the existing configuration seams. A later operator may check presence only inside the correct server-owned boundary after separate approval. CP1 did not inspect deployed values or dashboards.

| Reference group | Presence-only names | Missing behavior |
| --- | --- | --- |
| Site/auth/Supabase | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES` | Block the relevant deployed/authenticated/store proof. Never widen access or fall back to browser authority. |
| Stripe | `STRIPE_SECRET_KEY`, `COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS` | Checkout, Portal, or signed entitlement evidence stays unavailable; Free remains available. |
| Paid provider/budget | `COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER`, `COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD`, `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO`, `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO`, `OPENAI_API_KEY`, `OPENAI_TRANSLATION_MODEL` | Paid provider execution fails closed before invocation. No model, price, budget, or cadence is inferred. |
| Azure recoverable fallback | `AZURE_TRANSLATOR_KEY`, `AZURE_TRANSLATOR_ENDPOINT`, `AZURE_TRANSLATOR_REGION`, `COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP` | Azure fallback remains disabled without changing the OpenAI-primary decision. |
| Deployment/authenticated smoke | Reviewed deployment revision, safe target label, allowed-tester session readiness, rollback owner, and sanitized output review | Remote/deployed or browser stage remains blocked. No private URL, account, cookie, token, or target value may enter evidence. |

## Staged Approval Sequence

Stages are ordered. A later stage cannot repair or waive a failed earlier stage. CP1-S1 through CP1-S10 are prepared but not run.

| Stage ID | Stage | Status | Entry and exit boundary |
| --- | --- | --- | --- |
| CP1-S0 | Fixed revision and local deterministic readiness | locally-verified | C12 merge/head containment, local authority, baseline classifications, reference names, migration sources, no-new-surface boundary, and sanitized evidence policy are reviewed. |
| CP1-S1 | C1/C3/C5/C6/C7/C8/C9/C11 remote migration apply | approval-gated | Apply only the reviewed migration named by one exact approval unit. Stop between migrations; do not infer bundle approval. |
| CP1-S2 | Deployed store readiness | approval-gated | Prove service-role-only availability and fail-closed reads first, then separately approved bounded write/read behavior. No raw row, key, owner, session, token, or cleanup reference may be recorded. |
| CP1-S3 | Stripe Product/Price and control-plane readiness | approval-gated | Presence/configuration evidence only unless the exact Product/Price or webhook registration action is separately approved. Billing activation stays closed. |
| CP1-S4 | Checkout, Portal, signed webhook, and entitlement states | approval-gated | Prove authenticated binding, paid-active, paid-inactive, and fail-closed results with signed evidence and sanitized status only. Free remains available. |
| CP1-S5 | Paid usage reset, cost, and limit posture | approval-gated | Prove exactly-once counting, signed-period advance, stale/replay rejection, configured soft/hard stop, and sanitized provider-account posture without inventing limits or consuming quota solely for proof. |
| CP1-S6 | Paid provider, Azure fallback, and dictionary hook | approval-gated | Prove OpenAI-mini first, Azure only for recoverable classes, no fallback for policy/parse failure, and effective dictionary version behavior without recording prompts, responses, term content, or provider configuration. |
| CP1-S7 | OBS and moderator capability proof | approval-gated | Issue/use/revoke/expiry/replay and read-only non-empty display are separate bounded operations. Cross-surface validation must fail. |
| CP1-S8 | C10 preservation, seven-day history, and cleanup | approval-gated | Prove priority/deleted/source/original/translated preservation, exact cutoff, Free non-retention, and separately approved OAuth/account cleanup without exporting private keys or row references. |
| CP1-S9 | Authenticated allowed-tester browser QA | approval-gated | Run the width/surface sequence below only after remote stores, approved test state, exact deployed revision, and sanitized capture policy are ready. |
| CP1-S10 | Release-owner decision | approval-gated | Review all stage evidence and unchecked scope. A decision may request a later deploy/CP2/promotion action; it does not execute one. |

## Remote Migration And Store Order

The repository migration order is fixed by the reviewed sources:

1. C1 paid entitlements.
2. C3 paid usage counters.
3. C5 OBS token store.
4. C6 OBS browser capability store.
5. C7 moderator share token store.
6. C8 moderator browser capability store.
7. C9 custom dictionary store.
8. C11 Creator history store.

For each item: confirm exact target and migration identity, review rollback owner, obtain its exact approval unit, apply only that migration, capture status/count only, run its separately approved readiness check, and stop. A successful local migration contract or earlier migration does not prove the next item or authorize a remote query.

Store readiness must preserve service-role-only access, RLS/revoked client access, server-derived owner/session authority, digest-only capability storage, and fail-closed unreadable/unconfigured behavior. A presence check is not a write/read smoke; a write/read smoke is not authenticated browser proof.

## Separate Approval Units

Each row is an independent authorization unit. Approval for one row does not cover any other row, retry, rollback, cleanup, deploy, or evidence expansion.

| Approval ID | Exact operation | Evidence and rollback boundary |
| --- | --- | --- |
| CP1-A-MIG-C1 | Apply reviewed C1 paid-entitlement migration | Migration/status label only; keep paid activation closed on failure. |
| CP1-A-MIG-C3 | Apply reviewed C3 paid-usage migration | Migration/status label only; do not reset or rewrite counters as rollback. |
| CP1-A-MIG-C5 | Apply reviewed C5 OBS-token migration | Status only; no plaintext capability creation. |
| CP1-A-MIG-C6 | Apply reviewed C6 OBS-browser-session migration | Status only; no browser redemption. |
| CP1-A-MIG-C7 | Apply reviewed C7 moderator-token migration | Status only; no plaintext share creation. |
| CP1-A-MIG-C8 | Apply reviewed C8 moderator-browser-session migration | Status only; no browser redemption. |
| CP1-A-MIG-C9 | Apply reviewed C9 dictionary migration | Status only; no term content or provider execution. |
| CP1-A-MIG-C11 | Apply reviewed C11 history migration | Status only; no history backfill or cleanup. |
| CP1-A-STORE-READINESS | Remote/deployed service-role and fail-closed presence checks | Surface/status/count only; no mutation. |
| CP1-A-STORE-WRITE-READ | Bounded deployed store write/read proof | Surface/status/count only; cleanup requires another approval. |
| CP1-A-STRIPE-PRODUCT-PRICE | Product/Price presence or exact approved mutation | Reference-presence/status only; keep activation closed. |
| CP1-A-STRIPE-CHECKOUT | One authenticated Checkout proof | Route/status only; do not record redirects or billing identifiers. |
| CP1-A-STRIPE-PORTAL | One authenticated Portal proof | Route/status only; do not record redirects or billing identifiers. |
| CP1-A-STRIPE-WEBHOOK | Registration/delivery of one signed supported webhook proof | Event-class/status only; invalid/unsigned remains rejected. |
| CP1-A-ENTITLEMENT-STATES | Paid-active, inactive, and fail-closed state proof | State labels only; restore safe Free/paid-inactive posture. |
| CP1-A-USAGE-RESET-LIMIT | Paid counter, signed reset, cost, and stop proof | Counts/reset/stop labels only; no invoice or private counter keys. |
| CP1-A-PROVIDER-OPENAI | One bounded Paid OpenAI-mini proof | Counts/status only; stop provider execution after the proof. |
| CP1-A-PROVIDER-AZURE | One bounded recoverable-fallback proof | Failure-class/fallback/status only; no forced policy/parse fallback. |
| CP1-A-DICTIONARY-PROVIDER | One bounded effective-version provider hook proof | Version-change/status only; no dictionary content. |
| CP1-A-OBS-CAPABILITY | OBS issue/use/rotate/revoke/expiry proof | Outcome labels only; revoke test capability after approved use. |
| CP1-A-MODERATOR-CAPABILITY | Moderator issue/use/revoke/expiry/reissue proof | Outcome labels only; revoke test capability after approved use. |
| CP1-A-HISTORY-RETENTION | Seven-day persistence/read/expiry proof | Counts/cutoff result only; no row or session references. |
| CP1-A-OAUTH-CLEANUP | OAuth disconnect owner-scoped cleanup proof | Cleanup count/status only; only after credential revocation succeeds. |
| CP1-A-ACCOUNT-CLEANUP | Account deletion cleanup/cascade proof | Cleanup count/status only; no exported identifiers or broad reset. |
| CP1-A-BROWSER-QA | Authenticated allowed-tester width sequence | Surface/width/status/count/console/overflow/storage labels only. |
| CP1-A-DEPLOY | Future exact deploy/upload action | Out of CP1; separate revision-bound approval and rollback plan. |
| CP1-A-CP2 | Future Creator public paid gate flip | Out of CP1; separate decision and exact gate action. |
| CP1-A-PROMOTE-MAIN | Future promotion to `main` | Out of CP1; separate merge/promotion approval. |
| CP1-A-PUBLIC-PAID-LAUNCH | Future Creator public paid launch declaration/action | Out of CP1; explicit release-owner approval after all evidence. |

## Entitlement, Usage, Provider, And Capability Proof Rules

- Paid-active requires signed supported billing evidence, future signed period, authenticated owner binding, exact activation/allowlist authority, and readable durable C1 state.
- Failed, canceled, expired, incomplete, unpaid, paused, or unapproved trial state remains Free or paid-inactive. It must not disable Free.
- Missing, stale, unreadable, mismatched, incomplete, or unconfigured billing/entitlement/usage state suppresses Paid, Creator history, and Paid provider execution.
- C3 counts only provider-executed translations through the existing exactly-once boundary. Signed period advancement may reset; repeated, older, or stale period evidence may not.
- Cost and soft/hard stop evidence uses configured server authority. CP1 does not infer price, token multiplier, budget, billing cadence, plan interval, or reset timezone.
- Paid selects the reviewed OpenAI-mini route first. Azure fallback is limited to timeout, rate-limit, and temporary-unavailable classes; policy and strict-output-parse failures never fall back.
- Dictionary proof is limited to the 30-term/bounded-field/language-scope authority, note-stable effective version, effective-change version, and provider hook/cache separation. Term, replacement, and note content are forbidden evidence.
- OBS and moderator proof must preserve digest-only stores, authoritative session expiry, revoke/replay rejection, separate scopes/cookies/stores, token-free stable display routes, read-only safe-feed projection, and no cross-surface validation.

## Authenticated Browser QA Sequence

This sequence is planned only. CP1 does not execute a browser, authenticate an account, create a capability, start a session, or inspect a deployed target.

Preconditions: CP1-S1 through CP1-S8 have approved sanitized evidence; the exact deployed revision is reviewed; an allowed-tester session and bounded safe test feed are ready; no credential value will enter a URL, screenshot, DOM capture, console capture, browser storage export, or report; and `CP1-A-BROWSER-QA` is explicitly approved.

Run each surface at `390 / 820 / 1024 / 1280 / 1366px`. At each width record only surface, width, visible-state label, safe row count, console error count, horizontal overflow status, credential-storage status, and pass/fail/blocked reason.

| Surface ID | Required visible proof | Mutation boundary |
| --- | --- | --- |
| CREATOR-SURFACE | Paid-active Creator controls, non-empty safe feed, usage/stop posture, source and translation state | No browser-selected owner/session/provider/billing authority; Start/provider work needs separate approval. |
| OBS-OVERLAY | Token-free stable route, read-only non-empty safe feed, original disclosure, source, priority, deleted and translated state | No session/feed/comment mutation; capability operation uses its own approval. |
| MODERATOR-VIEW | Token-free stable route, read-only non-empty safe feed, priority filter, source, original, deleted and translated state | No moderator identity/role inference and no session/feed/comment mutation. |
| DICTIONARY | Owner-only bounded CRUD surface and sanitized version/status behavior | CRUD and provider-influenced proof are separate approvals; no term content in evidence. |
| HISTORY | Paid-active-only seven-day panel, exact-cutoff fixture/state, strict deleted tombstone, source/original/translated/priority preservation | No Free/inactive history and no browser-selected cleanup target. |
| PRIORITY-DELETED-SOURCE | Super Chat, Super Sticker, owner, moderator, member, standard precedence plus legacy/malformed fallback across Creator/OBS/moderator/history | Display-only verification; no revenue aggregation, role mutation, or provider metadata. |

Abort the browser stage on the first auth mismatch, unexpected mutation control, credential-bearing URL, browser credential storage, forbidden DOM/output field, raw comment capture, console error, horizontal overflow, cross-surface capability acceptance, unexpected empty/unavailable state, or deployed revision mismatch.

## Sanitized Evidence Shapes

| Surface | Allowed evidence | Required blocked/abort labels |
| --- | --- | --- |
| local contracts | contract ID, pass/fail, expected baseline counts, known classification | `blocked-dependency-absent`, `known-historical`, `unexpected-failure` |
| reference presence | reference group/name and present/missing/unreviewed | `blocked-missing-reference`, `blocked-no-approval`, `blocked-output-review-incomplete` |
| migration/store | approval ID, migration/surface label, target label, status, count, fail-closed result | `blocked-revision-mismatch`, `blocked-unreviewed-migration`, `blocked-store-unavailable`, `abort-partial-state` |
| Stripe/entitlement | approval ID, action/state label, signed/invalid classification, pass/fail | `blocked-missing-reference`, `blocked-no-approval`, `abort-unsigned-accepted`, `abort-free-unavailable` |
| usage/provider/dictionary | approval ID, action/failure-class label, counts, reset/fallback/stop/version result | `blocked-budget-unreviewed`, `blocked-provider-unavailable`, `abort-unapproved-fallback`, `abort-accounting-failure` |
| OBS/moderator/history/cleanup | approval ID, surface/action label, issue/revoke/expiry/replay/cutoff/cleanup status, count | `blocked-store-unavailable`, `abort-cross-scope`, `abort-private-material`, `abort-owner-scope` |
| browser | approval ID, surface, width, visible-state label, safe count, console/overflow/storage pass/fail | `blocked-no-auth-fixture`, `blocked-revision-mismatch`, `abort-sensitive-output`, `abort-browser-state` |
| release decision | reviewed revision, prerequisite-stage statuses, decision label, unchecked-scope status | `blocked-incomplete-evidence`, `blocked-residual-risk-unaccepted`, `not-authorized` |

Closeout records must include:

```text
stage_id=<CP1 stage>
approval_id=<exact approval unit or not-applicable-local>
execution_status=not-run | pass | fail | blocked | aborted
evidence_lane=<lane id>
sanitized_output_review_status=pass | fail | not-run
abort_status=not-triggered | triggered-<sanitized-reason>
rollback_status=not-run | ready | approved-and-run | blocked
unchecked_scope_status=recorded
```

## Abort Conditions

Abort immediately and keep later stages blocked if:

- the intended revision does not contain the reviewed C12 state or differs from the approved deployed revision;
- any public/deployed API, route, Worker binding, Cloudflare configuration, backend surface, or browser authority beyond the separately approved preview/integration-only reference-presence GET route appears necessary;
- the exact approval unit, target label, operator reference presence, sanitized output review, or rollback owner is missing;
- migration identity/order/policy differs from reviewed source, a partial apply is observed, or an unapproved remote query/mutation would be required;
- output contains or requires a secret, OAuth value, token/cookie, owner/provider/channel/target identifier, live target identifier, raw provider payload/comment, private author/session reference, cleanup/retention key, billing identifier, private URL, prompt, or provider response;
- unsigned/invalid billing evidence grants Paid, inactive/failure state disables Free, unreadable authority opens access, or billing/provider/store state fails open;
- provider routing, accounting, fallback classification, dictionary version behavior, capability scope, revoke/expiry/replay behavior, history cutoff, or cleanup owner scope differs from local authority;
- an unexpected local contract failure appears beyond the fixed dependency-blocked/historical baseline;
- authenticated browser output shows forbidden data, credential storage, credential-bearing URL, cross-surface access, console error, horizontal overflow, or unreviewed mutation controls.

No automatic retry changes the approval scope. A retry of an external operation requires a refreshed preflight and approval for that retry.

## Rollback Boundaries

CP1 performs no rollback. Later rollback is separately approved and bounded by the operation:

- keep billing activation, CP2, and public paid access closed before and during evidence gathering;
- stop after the failing stage and do not continue applying later migrations or actions;
- do not run cleanup SQL, reset data, rewrite counters, delete rows, or recreate schemas as an inferred migration rollback;
- disable new paid Checkout/provider execution through existing server-owned gates while preserving Free access;
- stop the approved test session and revoke only the approved test capability when that operation is already authorized;
- treat invalid/inactive/unreadable entitlement as Free or paid-inactive without deleting durable audit state;
- preserve sanitized counts/status for review, but do not export private rows, payloads, identifiers, URLs, credentials, or browser storage;
- deploy rollback, Stripe dashboard rollback, remote schema repair, cleanup, CP2 reversal, and public-access reversal each require their own exact approval.

## Exact Unchecked Scope

unchecked_scope_status=recorded

- C1/C3/C5/C6/C7/C8/C9/C11 remote migration apply and remote schema state: not-run / approval-gated.
- Remote/deployed store presence, policy, fail-closed, write/read, cleanup, and production persistence: not-run / approval-gated.
- Stripe Product/Price existence or mutation, Checkout, Portal, webhook registration/delivery, subscription state change, and billing mutation: not-run / approval-gated.
- Production paid-active/inactive/fail-closed entitlement evidence: not-run / approval-gated.
- Paid usage persistence, actual signed-period rollover, provider-account cost posture, and configured soft/hard limit observation: not-run / approval-gated.
- OpenAI, Azure, YouTube, target lookup, polling, translation, dictionary-influenced provider execution, and live provider/account operations: not-run / approval-gated.
- OBS and moderator credential issue/use/rotate/revoke/expiry/reissue, browser capability persistence, authenticated non-empty display, and cross-surface rejection: not-run / approval-gated.
- C10 production preservation, C11 production seven-day history, expiry, OAuth disconnect cleanup, account deletion cleanup, and deployed cleanup behavior: not-run / approval-gated.
- Authenticated allowed-tester browser QA at all required surfaces and widths: not-run / approval-gated.
- ESLint, TypeScript, Next build, and dependency-backed contracts: dependency-blocked; dependency installation was not approved.
- Three known historical dependency-free assertions: unchanged baseline limitation, not CP1 regressions.
- Deploy/upload, activation, CP2, promotion to `main`, release declaration, public access change, and Creator public paid launch: not-run / out of CP1 / separately approval-gated.

## CP1 Decision

CP1 local readiness is complete when its focused contract and allowed local verification pass. Creator public paid launch readiness remains blocked / approval-gated because every remote, deployed, billing, provider, token, cleanup, authenticated browser, and release-owner lane is intentionally unexecuted.

No runtime/UI change beyond the separately approved preview/integration-only reference-presence GET route is justified by CP1 evidence. This endpoint source may proceed through commit/push/Draft PR review, but deploy and its first Worker invocation remain separate approval units. Any other external proof requires a new same-thread exact preflight, sanitized output review, and explicit approval for one approval unit only.
