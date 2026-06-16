# Kuro Live Comment Translator Free Public Beta Final QA Readiness

Status: F15 Free public beta final QA / launch readiness. Public-release capable: no.

This record is Free public beta readiness evidence only. It does not approve or run real OAuth connect, live authorization code exchange, live token persistence smoke, provider target lookup, live target lookup, `liveChatMessages.list`, session start smoke, translation provider API execution, live/provider execution, Azure/OpenAI provider API execution, deploy/upload, remote mutation, schema migration, remote Supabase mutation/schema apply, Stripe live action, main promotion, or public launch gate flip.

Output policy: sanitized status labels, route/action names, task ids, reference names, counts-only plans, and not-run gates only. Secret values, OAuth values, token values, Authorization header values, owner user id values, provider channel id values, live target values, provider target metadata, Live Chat target identifiers, service-role values, Stripe secret values, server-only cursor values, raw provider payloads, raw comments, author channel material, browser storage payloads, and handoff payloads are not requested, displayed, stored, or recorded.

## Purpose

F15 closes the Free public beta implementation sequence by recording final QA/readiness posture, not by flipping launch gates.

The decision remains evidence-gated: public launch is not allowed while approved live/provider/remote/Stripe evidence is missing. Public-release capable: no.

## Inspected Inputs

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PROVIDER_LEGAL_COPY_REFRESH.md`
- `docs/active/COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md`
- `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_LIVE_PROVIDER_SMOKE_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md`
- `lib/comment-translator-durable-session-store.ts`
- `lib/comment-translator-durable-usage-counter-store.ts`
- `lib/comment-translator-public-entitlement-baseline.ts`
- `lib/comment-translator-session-runtime.ts`
- `lib/comment-translator-usage-ledger-runtime.ts`
- `lib/comment-translator-server-only-live-chat-target-lookup.ts`
- `lib/comment-translator-bounded-live-chat-polling-wiring.ts`
- `lib/comment-translator-live-message-normalization.ts`
- `lib/comment-translator-real-comments-ui-wiring.ts`
- `lib/comment-translator-real-comments-feed-shared.ts`
- `lib/comment-translator-azure-normal-translation-execution.ts`
- `lib/comment-translator-start-stop-reason-ux.ts`
- `lib/comment-translator-free-beta-usage-display.ts`
- `lib/comment-translator-free-beta-retention-attribution.ts`
- `lib/comment-translator-free-beta-creator-locked-waitlist.ts`
- `app/api/comment-translator/session/route.ts`
- `app/tools/comment-translator/actions.ts`
- `components/comment-translator/CommentTranslatorDock.tsx`
- `lib/comment-translator.ts`

## F1-F14 Evidence Review

| Task | Evidence reviewed | F15 interpretation |
| --- | --- | --- |
| F1 | OAuth live connect smoke preflight defines same-thread approval, reference-name-only env checks, sanitized evidence shape, abort conditions, and rollback. | Preflight plan exists; it is not live OAuth execution evidence. |
| F2 | Approved OAuth connect/token persistence evidence recorded sanitized connected status only. | Useful connection evidence exists; provider lookup, session start, and provider execution remain separate. |
| F3 | Local durable session migration/adapter and fail-closed route/action wiring exist. | Local foundation exists; remote Supabase apply and deployed durable enforcement remain unverified. |
| F4 | Local durable usage ledger migration/adapter and server-owned writes exist. | Local foundation exists; remote Supabase apply and deployed durable usage enforcement remain unverified. |
| F5 | Free entitlement baseline combines daily/session/per-minute/active-session/monthly character caps. | Free limit resolver exists; public reliance still depends on durable deployed reads. |
| F6 | Server-only live chat target lookup boundary is wired to Start with sanitized unavailable fallback. | Browser-safe boundary exists; real provider target lookup and live target lookup are not-run. |
| F7 | Bounded polling wiring keeps active-session-only state, server-only cursor handling, retry/backoff, empty-chat behavior, and quota/budget stop handoff. | Local deterministic wiring exists; real `liveChatMessages.list` is not-run. |
| F8 | Normalization handles text, Super Chat, stickers, member/system/deleted/banned/ended events with dedupe and deletion handling. | Safe internal event shape exists; real provider payload capture is not-run. |
| F9 | Real comments feed UI consumes only server-owned safe display rows and defaults to sanitized unavailable state. | Browser-safe feed wiring exists; non-empty live intake evidence for Free beta remains unchecked. |
| F10 | Azure normal translation bridge maps eligible normalized comments into Free Azure policy with bounded retry/cache/degradation. | Local deterministic provider bridge exists; real Azure/OpenAI provider API execution is not-run. |
| F11 | Start/Stop reason UX maps disconnected, reconnect, no broadcast, disabled/ended/not found, quota, heartbeat, and provider errors to sanitized copy. | User-readable states exist; live/provider-derived states remain not public-proven. |
| F12 | Free beta usage display exposes session/day/month/per-minute usage and no-provider-call over-limit behavior. | Usage display exists; deployed durable enforcement remains unchecked. |
| F13 | Data deletion, retention, deleted-message propagation, OAuth disconnect cleanup readiness, and source attribution are represented locally. | Browser-safe retention/source foundation exists; actual cleanup mutation and live disconnect are not-run. |
| F14 | Creator locked cards, waitlist, and local click draft state are represented without paid access. | Free beta Creator visibility exists; remote waitlist/click persistence, Stripe live action, and paid entitlement activation are not-run. |

## Route And API Smoke Plan

The route/API smoke plan is split into three lanes so that deterministic checks do not drift into provider-affecting execution.

| Lane | Allowed action | Evidence shape | Not allowed |
| --- | --- | --- | --- |
| local deterministic | Run focused contracts for F3-F15, inspect route/action source, and verify browser-safe return shapes using local deterministic adapters. | Contract exit status, route/action names, sanitized state labels, and no-secret scan result. | No network provider calls, no auth payload inspection, no remote mutation. |
| sanitized server-owned state | With safe local auth fixtures only, exercise `/api/comment-translator/session`, `getCommentTranslatorSessionAction`, `refreshCommentTranslatorRealCommentsFeedAction`, `getCommentTranslatorFreeBetaUsageDisplayAction`, `getCommentTranslatorFreeBetaRetentionAttributionAction`, and `getCommentTranslatorCreatorLockedWaitlistAction` against unavailable/stopped/over-limit/local-draft states. | Status labels, stop reasons, usage counts, unavailable reasons, source labels, and local draft status only. | No raw provider payload, raw comments, private identifiers, browser storage expansion, or handoff payload expansion. |
| approval-gated exact-command preflight | Before any live/provider/remote/Stripe smoke, print or document the exact command/action, operator-local env reference checklist, sanitized output review, abort conditions, rollback, and requested approval text. | `preflight-ready` or `blocked-*`, reference-name-only env labels, exact command text without private values, and not-run gates. | No execution until same-thread ready preflight, sanitized output review, and explicit in-thread approval are all present. |

Current F15 execution state:

- route/API smoke plan: documented.
- local deterministic contract: implemented by `scripts/comment-translator-free-public-beta-final-qa-readiness-contract.mjs`.
- provider target lookup: not-run / approval-gated.
- live target lookup: not-run / approval-gated.
- liveChatMessages.list: not-run / approval-gated.
- session start smoke: not-run / approval-gated.
- translation provider API execution: not-run / approval-gated.
- live/provider execution: not-run / approval-gated.
- real OAuth connect: not-run in F15 / approval-gated.
- live authorization code exchange: not-run in F15 / approval-gated.
- live token persistence smoke: not-run in F15 / approval-gated.
- Azure/OpenAI provider API execution: not-run / approval-gated.
- remote mutation: not-run / approval-gated.
- schema migration: not-run / approval-gated.
- remote Supabase mutation/schema apply: not-run / approval-gated.
- Stripe live action: not-run / approval-gated.
- deploy/upload: not-run / approval-gated.
- main promotion: not-run / approval-gated.
- public launch gate flip: not-run / approval-gated.

## No-Secret Scan Plan

F15 requires a changed-files no-secret scan before PR publication. The scan covers this readiness doc, `task.md`, the F15 contract script, and any touched active readiness docs.

Forbidden values include secret keys, OAuth values, token values, Authorization header values, service-role values, Stripe secret values, webhook signing secrets, private owner/provider identifiers, live target values, provider target metadata values, server-only cursor values, raw provider payloads, raw comments, browser storage payloads, and handoff payload values.

Allowed references are names of routes, actions, docs, env references, and not-run gates.

## Width Checks

Width checks skipped for F15 because this task has no visible UI/CSS/layout/copy change, no rendered route change, no browser storage change, and no runtime behavior change.

If a later F15 follow-up changes visible UI/copy, run `390 / 820 / 1024 / 1280 / 1366px` checks and record any unavailable authenticated/fixture scope in `task.md`.

## Legal And Copy Review

legal/copy review result: no new public copy change was made in F15.

Existing reviewed copy keeps these claims:

- Free plan translation policy routes to Azure Translator.
- Creator/Paid remains locked/waitlist/closed-beta and does not imply public paid access.
- YouTube connection alone does not start background monitoring, polling, translation, or quota use.
- Provider processing is limited to explicit session scope.
- Raw comment logging remains disabled by default and diagnostics are sanitized.
- Provider comparison candidates are not represented as active production routing.
- Stripe live Product/Price/Checkout/Customer Portal/webhook/billing setting mutations remain approval-gated.

## Rollback Notes

F15 docs/contract changes have no runtime rollback path. If the readiness record is wrong, revert this docs/contract PR or amend the readiness decision before publication.

For future approval-gated execution blockers:

1. Stop at the first blocker label.
2. Record only sanitized status, route/action name, command name, count, and stop reason.
3. Keep public launch disabled.
4. Do not run cleanup SQL, remote mutation, schema migration, provider lookup, live polling, provider API execution, deploy/upload, Stripe action, main promotion, or public launch gate flip as rollback unless separately approved in-thread.

## Public Launch Readiness Decision

Decision: Free public beta is not public-release capable.

Completion decision for F15: readiness decision clarified; launch gate remains closed.

Public-release capable: no.

Reason: F1-F14 establish a strong local/server-only foundation, but public launch still lacks approved live/provider evidence, remote durable enforcement evidence, and explicit release-owner approval for public launch gate flip.

FB-L1 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md` now defines the Free beta public usability preflight sequence for remote/deployed durable enforcement, authenticated allowed-tester route/API smoke, Start smoke, live target lookup, bounded polling, Azure execution, UI confirmation, rollback, and no-secret output. This follow-up remains preflight-only and does not change the `public-release capable: no` decision.

FB-L2 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md` records Remote durable enforcement evidence as blocked-no-approval. It clarifies that `comment_translator_sessions` and `comment_translator_usage_ledger_events` are the Free durable authority to prove later, but remote Supabase migration apply, remote mutation, deployed durable smoke, deploy/upload, live/provider execution, Stripe actions, and public launch gate flip remain not-run / approval-gated.

FB-L3 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md` records Allowed-tester route/API smoke as blocked-no-approval with exact-command ready preflight in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md`. It limits the later approved smoke to server-owned session/feed/usage/deletion/Creator locked states and keeps session Start, provider/live execution, remote mutation/schema apply, deploy/upload, Stripe actions, and public launch gate flip not-run / approval-gated.

FB-L4 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md` records Start-to-translation smoke as blocked-no-approval with exact-command ready preflight in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`. It limits the later approved smoke to explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` step, non-empty intake, Free Azure translation, UI feed, usage, stop reason, source attribution, and Stop, while keeping remote mutation/schema apply, deploy/upload, Stripe actions, paid entitlement work, main promotion, and public launch gate flip not-run / approval-gated.

FB-L5 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md` records Production/custom deployed smoke as blocked-no-approval with exact-command ready preflight in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`. It limits the later approved smoke to deployed target freshness, Free beta route reachability, allowed-tester route/UI visibility, status-only session API, usage/deletion/Creator locked gates, and Start-to-translation gate checks, while keeping deploy/upload, remote mutation/schema apply, session Start, provider/live execution, Stripe actions, paid entitlement work, main promotion, and public launch gate flip not-run / approval-gated.

## Blockers

- Remote Supabase migration/apply and deployed durable session/usage enforcement are not verified.
- Authenticated allowed-tester route/API smoke execution remains not-run / approval-gated even though FB-L3 now has exact-command ready preflight.
- Start-to-translation smoke execution remains not-run / approval-gated even though FB-L4 now has exact-command ready preflight.
- Production/custom deployed smoke execution remains not-run / approval-gated even though FB-L5 now has exact-command ready preflight.
- Real provider target lookup and live target lookup remain not-run.
- Real `liveChatMessages.list` polling remains not-run for the Free beta launch path.
- Non-empty live comment intake remains not public-proven for the Free beta launch path.
- Real Azure/OpenAI provider API execution remains not-run for the Free beta launch path.
- Authenticated allowed-tester route/API smoke with server-owned session/feed/usage/deletion/Creator locked states remains unchecked unless separately approved and fixture-backed.
- Stripe live Product/Price/Checkout/Customer Portal/webhook/billing mutation and paid entitlement activation remain not-run and out of Free beta scope.
- Main promotion, deploy/upload, production/custom deployed smoke, and public launch gate flip remain not-run and approval-gated.

## Accepted Risks

- F15 accepts docs/contract-only final QA as the correct scope for this PR because launch flip is explicitly out of scope.
- F15 accepts local deterministic evidence for implementation shape while marking every live/provider/remote/Stripe path as unchecked.
- F15 accepts skipping width checks because no visible UI/CSS/layout/copy change was made.
- F15 accepts that Creator paid unlock remains future closed-beta work, not Free beta launch readiness.

## Unchecked Scope

- Real OAuth connect, live authorization code exchange, and live token persistence smoke were not run in F15.
- Provider target lookup and live target lookup were not run.
- `liveChatMessages.list` was not run.
- Session start smoke was not run.
- Translation provider API execution and Azure/OpenAI provider API execution were not run.
- Live/provider execution was not run.
- Remote mutation, schema migration, and remote Supabase mutation/schema apply were not run.
- Stripe live action was not run.
- Deploy/upload, main promotion, production/custom smoke, and public launch gate flip were not run.
- Browser storage expansion and handoff payload expansion were not added or inspected as evidence.

## Completion Verification

Required F15 closeout checks:

- `node scripts/comment-translator-free-public-beta-final-qa-readiness-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

Runtime/code files were not changed, so `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required by the current `task.md` verification baseline for this docs/contract-only slice.
