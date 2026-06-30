# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯、古い next-session prompt は `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential / OAuth token / authorization code / owner id / provider target metadata / liveChatId は表示・要求・保存しない。
- Provider target metadata and liveChatId are consumed only through server-only boundaries and must not appear in output, docs, PR bodies, browser storage, or handoff payloads.

## Current Branch

- Current branch: `codex/post-580-cache-hit-quota-accounting`.
- Base: latest `origin/codex/comment-translator-free-public-beta-integration` after PR #580 merge containment.
- Scope: PR #580 follow-up P0. Cache-hit translated rows stay visible in the preview/feed diagnostics, but provider/AI usage estimates now count only provider-executed translations.
- Public gate state label: unchanged / blocked.
- Public-release capable label: no.

## Primary Goal

Make Free beta actually usable by approved testers, then decide whether it is ready for broader public access.

Practical meaning:

1. A user can connect YouTube safely.
2. Connection alone does not start monitoring, polling, translation, or quota use.
3. The user explicitly presses Start.
4. The server resolves the owned live target without exposing liveChatId or provider target metadata.
5. Bounded `liveChatMessages.list` polling receives non-empty comments.
6. Eligible comments are translated through the Free Azure route.
7. The UI shows server-owned live comments, usage, source attribution, deletion/ended states, and stop reasons without leaking private provider data.
8. Durable session/usage/feed persistence works in the deployed target.
9. Public launch remains blocked until the release owner approves the final gate flip.

Current public-launch decision: `public-release capable: no`.

## Branch Strategy

- Keep `codex/comment-translator-youtube-oauth-integration` as the completed YouTube OAuth Integration Roadmap collection branch.
- Keep `codex/comment-translator-free-public-beta-integration` as the Free beta collection branch.
- Next PRs should target `codex/comment-translator-free-public-beta-integration` until Free beta public usability evidence is accepted.
- After Free beta public usability is accepted, promote `codex/comment-translator-free-public-beta-integration` to `main` through a separate approval-gated promotion PR.
- Creator closed beta can start after the Free path is proven, or use a later dedicated collection branch if the release owner wants separation.

## Current Free Public Beta State

| Area | State | Notes |
| --- | --- | --- |
| YouTube OAuth integration | complete | Final QA/readiness doc remains canonical. |
| Free Public Beta P0-0 / F1-F15 | complete | Local/server-only implementation and readiness foundation complete. |
| PL-G1 Remote durable enforcement | complete | Approved remote durable enforcement and deployed fail-closed evidence recorded. |
| PL-G2 Allowed-tester route/API smoke | complete | PL-G2K approved sanitized route/API harness smoke complete. |
| PL-G3 Start-to-translation smoke | complete | Core path, browser-visible feed, auto refresh, newest-first, JST display, cache hit/miss, diagnostics, Stop confirmed. |
| PL-G4 Production/custom deployed smoke | complete for preview custom URL | `https://preview.streamer-tools.kuro-lab.com/tools/comment-translator/` passed with allowed tester YouTube account. Final main production domain remains unpromoted. |
| PL-G5 Release-owner public launch decision | pending | Do not record public capable until pre-Step 5 hardening below is resolved or explicitly accepted. |
| PL-G6 Public access change / promotion | not-run / approval-gated | No main promotion, public gate flip, deploy/upload, or production domain cutover was run. |

## Public Launch Next Flow

Use this order for the remaining Free public beta work unless the release owner explicitly changes priorities.

| Step | Work | Current state | Boundary |
| --- | --- | --- | --- |
| 1 | Implement PPF-1 / PPF-2 | complete | Active-session periodic refresh and newest-first ordering verified after PR #577 merge. |
| 2 | Decide timestamp display scope | complete | JST / selected timezone display verified. Runtime quota/rate-limit authority stays UTC. |
| 3 | Approved browser-visible preview retest | complete | Start-before exclusion, Start-after feed, cache hit/miss, diagnostics counts, and Stop verified with sanitized labels/counts only. |
| 4 | PL-G4 production/custom deployed smoke | complete for preview custom URL | Preview deployed URL verified. Main production domain remains separate and not promoted. |
| 5 | Record PL-G5 release-owner decision | pending | First resolve or explicitly accept pre-Step 5 hardening items. |
| 6 | Execute PL-G6 public access change / promotion | not-run / approval-gated | Separate approval-gated operation after PL-G5. |

## Pre-Step 5 Hardening Board

Do these before recording `public-release capable: yes` unless the release owner explicitly accepts the risk.

| Priority | Item | Current decision / expected handling |
| --- | --- | --- |
| P0 | Free beta usage display resets to 30 minutes after page refresh while an active session exists | Complete in `codex/pre-step5-p0-quota-session-hardening`: dock now restores session state from server status on mount/target-language change, and status restore is provider non-executing. Active-session behavior is contract-covered; local browser was private-gate fallback only. |
| P0 | Active-session page refresh leaves feed blank until periodic/manual refresh | Complete in `codex/post-579-feed-quota-ledger-p0`: mount/status restore hydrates persisted server-owned safe feed rows immediately through `restoreCommentTranslatorPersistedRealCommentsFeedAction`, which only reads durable/session-scoped feed state and does not run provider polling or target lookup. |
| P0 | Per-minute translated message cap enforcement | Complete in `codex/pre-step5-p0-quota-session-hardening`: F10 provider execution blocks before provider calls when `translatedMessagesInCurrentMinute` is at/over the Free cap, and pending batches that would exceed the cap are usage-limit rows. |
| P0 | Monthly translated character cap enforcement | Complete in `codex/pre-step5-p0-quota-session-hardening`: F10 estimates pending provider-candidate source characters before provider execution and blocks batches that would exceed `20,000 translated characters/month`. |
| P0 | Live translation success path does not durably increment usage counters | Complete in `codex/post-579-feed-quota-ledger-p0`: F10 writes sanitized provider request and AI usage estimate events to the durable usage ledger after provider success; deterministic contract proves a later durable snapshot sees provider request, current-minute translated message, and monthly translated character increments. Durable write failure surfaces a sanitized feed-unavailable state instead of displaying translated rows without durable accounting. |
| P0 | Cache-hit translated rows consume provider/AI usage quota | Complete in `codex/post-580-cache-hit-quota-accounting`: provider runtime and F10 durable handoff now derive AI translated message/character estimates from provider-executed, non-cache-hit translations only. Cache-hit rows still display as translated/cached, and cache-hit diagnostics/display row counts remain intact. |
| P0 | Public UI diagnostics surface | Policy clarified in this slice: keep `data-comment-translator-pre-public-diagnostics="count-only"` as a pre-public temporary debug surface for Step 5 evidence; remove or gate before PL-G6/public promotion. No public gate flip was run. |
| P1 | Preview feed `skipped` UI | Hide normal-user `skipped` rows where server policy already suppresses target-language/same-batch duplicate rows, or rename internal cache evidence to user-safe wording. Avoid `API free` copy in public UI. |
| P1 | Duplicate text cache display | Keep `cache hit` / `cached` evidence internally or in compact public copy; ensure duplicate text can display from cache without additional provider API execution. |
| P1 | Free beta usage panel vs right-side Today panel | Remove or merge duplicate "Today" state if Free beta usage already covers the same state. Prefer one authoritative usage/status area. |
| P1 | Data deletion / retention / source attribution panel | Decide whether to keep as trust/legal information, fold into details/legal/account surfaces, or hide until action paths are meaningful. |
| P1 | Stop behavior and preview retention | Consider keeping the last safe feed visible in a stopped state instead of clearing preview immediately. Next Start can replace it. |
| P1 | Step 5 evidence docs | Update PL-G4 / PL-G5 evidence docs with sanitized preview URL labels, pass/fail labels, and counts only. Do not include raw comments or screenshots containing raw comments. |

Recommended next PR order:

1. `Quota/session hardening`: usage refresh, per-minute cap, monthly character cap, server/action contracts.
2. `Public UI cleanup`: skipped/cache wording, Today panel consolidation, retention/source panel decision, stopped preview behavior, diagnostics gate/remove plan.

## Latest Sanitized Evidence Summary

- PR #577 `[codex] Retain pre-public diagnostics counts` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `f60e197`.
- PR #578 `[codex] Document pre-step5 public launch board` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `ccd6cf6`; containment was confirmed before this slice.
- PR #579 `[codex] Harden pre-step5 quota session P0` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `af28255`; containment was confirmed before this follow-up branch.
- PR #580 `[codex] Harden feed hydrate usage ledger follow-up` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `b90f9f5`; containment was confirmed before `codex/post-580-cache-hit-quota-accounting`.
- PR #580 cache-hit quota follow-up local verification passed for the implementation slice: provider execution runtime contract, Azure F10 normal translation execution contract, usage quota/budget ledger, durable usage counter schema adapter, Free beta usage display, real comments UI wiring, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan.
- PR #579 follow-up local verification passed for the implementation slice: active-session persisted-feed hydrate contract, Azure F10 durable usage write/snapshot contract, PL-G3 feed bridge/session persistence, real comments UI wiring, usage quota/budget ledger, durable usage counter schema adapter, Free beta usage display, session start/stop, UI live provider runtime, PL-G3 completion contract, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan.
- Pre-Step 5 P0 quota/session hardening local verification passed: active-session mount restore/status-provider non-execution contract, per-minute provider preflight cap, monthly character provider preflight cap, durable usage/session/feed contracts, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan.
- Width verification for local private-gate fallback passed at `390 / 820 / 1024 / 1280 / 1366px`: page identity OK, no horizontal overflow, no framework overlay, no relevant console errors/warnings. Authenticated allowed-tester state was unavailable locally, so active-session visual restore is contract-covered only.
- Browser-visible preview retest after PR #577 merge confirmed Start-before exclusion, Start-after feed display, newest-first ordering, JST timestamp display, cache miss for new text, cache hit/cached for repeated text, non-zero diagnostics retention, and Stop.
- Preview custom deployed smoke was performed at `https://preview.streamer-tools.kuro-lab.com/tools/comment-translator/` with a Cloud Console allowed YouTube account and passed for connection, comment retrieval, translation, cache behavior, diagnostics, timezone display, and Stop.
- Final main production domain is `https://streamer-tools.kuro-lab.com`; no main promotion, public access change, production domain cutover, deploy/upload, remote mutation, migration, Stripe action, or public gate flip was run in this cleanup slice.
- Raw stdout/stderr, raw response bodies, secrets, tokens, cookies, OAuth values, Authorization headers, provider target metadata, liveChatId, owner/session identifiers, raw comments, raw provider payloads, browser storage payloads, URL query values, handoff payloads, quota values, raw provider error bodies/messages/reasons, provider target values, and screenshots containing raw comments must not be recorded in docs.

## Current Blockers / Residual Risks

- Public-release capable remains `no` until pre-Step 5 hardening is resolved or explicitly accepted, PL-G5 release-owner approval is recorded, and PL-G6 public access change is separately approved and executed.
- Pre-public diagnostics are intentionally temporary and must be removed or gated before PL-G6/public promotion; this slice leaves them count-only and pre-public.
- Authenticated allowed-tester browser-visible active-session reload was not run locally; contract coverage proves server/action/UI restore semantics without live/provider execution.
- Live provider execution, Google target lookup, deployed/browser confirmation, remote mutation, migration, deploy/upload, public access change, and production promotion were not run in this follow-up. Cache-hit quota behavior is deterministic-contract covered only until an approved same-thread live retry confirms it against deployed state.
- UI width verification was not required for `codex/post-580-cache-hit-quota-accounting` because no visible UI files or copy/layout behavior changed.
- `comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs` and PL-G4 deployed-smoke contract still contain older evidence-shape assertions and were not used as final verifiers for this PR #580 cache-hit quota follow-up slice.
- Existing connected YouTube credentials created before sealed token material persistence may contain irreversible reference-only material. Those rows must fail closed with sanitized unavailable/reconnect-required behavior until reconnect.
- Production/main domain launch remains unexecuted and approval-gated.

## Account Limits / Entitlement Control

- Per-account judgment is server-owned: authenticated caller authorization binds work to the owner account, and browser-readable output must not expose owner ids, provider channel ids, provider target metadata, liveChatId, OAuth values, tokens, or billing identifiers.
- Free public beta limit authority is the Free entitlement baseline plus durable usage/session state.
- Current Free caps: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month.
- Enforcement happens before Start, while the session is active, during status/heartbeat/feed usage checks, and before provider translation execution.
- If durable usage/session state is unavailable or unreadable, the safe behavior is fail closed with sanitized stop/status output.
- Free beta usage accounting uses a fixed UTC quota day for enforcement and ledger accounting. UI timestamp display can use local/JST preference, but quota/rate-limit reset authority stays UTC until an explicitly approved policy change.
- Paid access after C1/C3 should be controlled by signed Stripe webhook evidence, durable paid entitlement rows, paid usage counters, monthly reset state, and server-owned fallback/stop reasons.

## Approval-Gated Actions

Do not perform the following without same-thread ready preflight, sanitized output review, and exact explicit approval:

- Google OAuth live connect execution.
- YouTube OAuth live connect execution.
- live authorization code exchange.
- live token persistence smoke.
- provider target lookup.
- liveChatId lookup / live target lookup.
- session start smoke.
- real `liveChatMessages.list`.
- translation provider API execution.
- live/provider execution.
- deploy/upload.
- production/custom deployed smoke.
- remote mutation.
- remote schema migration / Supabase migration apply.
- Stripe live-mode action.
- Product/Price creation.
- Checkout execution.
- Customer Portal redirect.
- webhook registration.
- billing setting mutation.
- public launch gate flip.
- promotion to `main`.

## Canonical Documents

- Free beta final QA/readiness: `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- Free beta public usability preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- Free beta PL-G1 remote durable enforcement execution evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`
- Free beta PL-G2K approved allowed-tester route/API harness smoke execution: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2K_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2J.md`
- Free beta PL-G3 Start-to-translation smoke completion after PL-G2K: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md`
- Free beta PL-G4 production/custom deployed smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md`
- Free beta PL-G5 public launch gate decision evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`
- Public beta gap audit: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- Public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`
- Future design/decision log: `docs/future/COMMENT_TRANSLATOR_API_INTEGRATION_LIMITS.md`

## Initial Release Decisions

These decisions are fixed for the current public-release roadmap unless the user explicitly changes them:

- Free public beta ships before Creator public paid launch.
- Creator price intent can be shown during Free public beta as locked/waitlist UI, but paid access starts with closed beta.
- Free plan starts conservatively. Treat `20,000 characters/month` as an added monthly character cap on top of existing time/per-minute caps, not a replacement for `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`.
- Source languages: initial selectable source languages are JA / EN / KR / CN.
- Target languages: initial selectable target languages include JA / EN.
- Source and target cannot be the same. UI and server validation must reject same-language pairs.
- Provider scope: YouTube ships first; Twitch remains future unless explicitly pulled into public-release scope.
- YouTube connection alone must not start background monitoring, polling, translation, or quota use.
- Raw text logging: disabled by default; diagnostics are short-lived and sanitized.
- Account path: `/account/integrations` is the preferred provider settings entry; `/tools/comment-translator` should also show a direct integration CTA when YouTube is not connected.
- Translation provider policy: Free routes to Azure Translator primary; Creator/Paid routes to OpenAI mini primary with Azure Translator as recoverable-error fallback unless later provider policy changes.
- `liveChatMessages.list` is acceptable for Free MVP when bounded by `pollingIntervalMillis`, server-only cursor/liveChatId handling, session limits, and quota/budget stop. `streamList` is Public-after-P1 primary migration work.
- Public UI must not expose liveChatId entry. Any debug/manual target path must be isolated from public build and gated.
- MVP should not persist author channel id, author channel URL, or author profile image URL. If BAN-event historical updates require an author key, use a short-lived server-only/session-scoped hash design or defer past-comment bulk updates to P1.

## Later Work / Post-MVP Roadmap

Keep this visible so public-launch cleanup does not erase the next roadmap, but do not treat these items as Step 5 blockers unless explicitly pulled into release scope.

### Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | pending |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |
| C3 | Paid usage and monthly reset | pending |
| C4 | AI natural translation provider route | pending / gated |
| C5 | OBS overlay token runtime | pending |
| C6 | OBS overlay UI route | pending |
| C7 | Moderator share token runtime | pending |
| C8 | Moderator share UI route | pending |
| C9 | Custom dictionary minimum | pending |
| C10 | Priority display polish | pending |
| C11 | Simple 7-day history | pending |
| C12 | Creator closed beta final QA | pending |

### Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | pending |
| CP2 | Creator public paid gate flip | pending / gated |

### Public-after-P1 / Post-MVP

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

## Verification Baseline

- Docs/task-board only:
  - targeted markdown/content inspection
  - changed-files no-secret scan
  - `git diff --check`
- Runtime or code changes:
  - relevant contract script(s)
  - changed-files no-secret scan
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `git diff --check`
- UI changes:
  - relevant UI/action contract(s)
  - width checks at `390 / 820 / 1024 / 1280 / 1366px`
- Live/provider execution:
  - same-thread / operator-local same-command-process ready preflight
  - sanitized output review
  - explicit in-thread approval
  - sanitized evidence only

## Contract Compatibility Anchors

- Keep `import "server-only";` on server-only translator / YouTube runtime boundaries.
- Keep provider requests input-source independent unless the current task explicitly scopes the bridge.
- Keep token values out of client components, docs, fixtures, PR bodies, browser storage, and command output.
- Treat credential status and provider target metadata as sanitized metadata only.
- Do not overclaim readiness-only or token-resolution-only evidence as live/provider execution.
- Do not add quota write, billing integration, remote Supabase mutation/migration, browser storage expansion, or handoff payload expansion unless the current roadmap task explicitly scopes it.
