# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯、古い next-session prompt は `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential は要求・表示・保存しない。
- OAuth access token / refresh token / authorization code value は client component、fixture、docs、PR body、localStorage、IndexedDB、sessionStorage に出さない。
- owner user id value / provider channel id value / service_role key value は表示・要求・保存しない。必要な場合も reference-only / existence-only / sanitized metadata-only に閉じる。
- provider target metadata / liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さない。

## Current Branch

- Current branch: `codex/comment-translator-azure-normal-translation-execution`.
- Base: latest `origin/codex/comment-translator-free-public-beta-integration`.
- This branch is F10 Azure normal translation execution only unless the release owner explicitly expands scope.
- P0-0 audit record: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`.
- F1 preflight record: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_SMOKE_PREFLIGHT.md`.
- F2 evidence record: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_TOKEN_PERSISTENCE_SMOKE_EVIDENCE.md`.
- F3 local migration/adapter: `supabase/migrations/20260615000000_comment_translator_sessions.sql`, `lib/comment-translator-durable-session-store.ts`.
- F4 local migration/adapter: `supabase/migrations/20260615001000_comment_translator_usage_ledger_events.sql`, `lib/comment-translator-durable-usage-counter-store.ts`.
- Archived previous long task board snapshot: `docs/archive/task-board-pre-2026-06-15-roadmap-cleanup.md`.

## Branch Strategy

- Keep `codex/comment-translator-youtube-oauth-integration` as the completed YouTube OAuth Integration Roadmap collection branch.
  - Scope already completed there: YouTube OAuth Integration Roadmap Task 1-10.
  - Do not keep adding Free public beta / Creator closed beta work directly to that branch.
- Create the next collection branch from latest `origin/codex/comment-translator-youtube-oauth-integration`:
  - `codex/comment-translator-free-public-beta-integration`
- Target `P0-0` and `F1` through `F15` task PRs to `codex/comment-translator-free-public-beta-integration`.
- After Free public beta readiness is accepted, promote `codex/comment-translator-free-public-beta-integration` to `main` through a separate approval-gated promotion PR.
- Creator closed beta tasks can either continue from the Free public beta integration branch after Free beta promotion, or use a later dedicated collection branch if the release owner wants a clean separation.

## Roadmap Snapshot

### YouTube OAuth Integration Roadmap

- Status: complete through Task 10.
- PR range: PR #441 through PR #450 are merged into `codex/comment-translator-youtube-oauth-integration`.
- Latest integration commit confirmed locally: `279962b` / `Polish comment translator OAuth UI contrast (#450)`.
- Promotion to `main` is still separate and approval-gated.
- Public-release capable: no.

### Public Release / Pre-Main Launch Roadmap

- Public Release Roadmap Task 1-16: complete or completed as readiness/final-QA records.
- Pre-Main Launch Hardening Task 17-27: complete.
- Task 28 Private-gated main promotion and production smoke: partially complete.
  - Complete: readiness/blocker, production env readiness, exact preflight, main promotion, production/custom route smoke, private-launch negative API checks, allowed-tester account/plan rendering evidence.
  - Still not run: allowed-tester session start smoke.
- Task 29 Public launch gate flip: not started.
- Current public-launch decision: keep `public-release capable: no`.

## Active Product Direction

Adopt the final MVP sequencing:

1. Free public beta
2. Creator closed beta
3. Creator public paid launch

Free public beta should prove YouTube OAuth, server-only liveChatId lookup, bounded `liveChatMessages.list` polling, actual comment intake, normal translation, durable session/usage enforcement, stop reasons, deletion/ended events, data deletion/retention, and source attribution.

Creator should be visible during Free public beta as locked cards / waitlist / click tracking, but paid public launch should wait until the Free path is stable. Creator closed beta scope is Stripe live Checkout/Portal/Webhook, durable entitlement, AI natural translation credits, OBS overlay URL, moderator share URL, custom dictionary minimum, Super Chat/member/moderator/owner priority display, and simple 7-day history.

`liveChatMessages.streamList` remains a Public-after-P1 optimization: make it primary later and keep `liveChatMessages.list` as fallback after bounded list behavior is proven.

## Implementation Task Board

Treat each row as 1 task / 1 PR unless the release owner explicitly splits it further. Execution rows that touch OAuth, live provider calls, deploy, remote mutation, or Stripe live mode remain approval-gated.

### Phase 0: Gap Audit

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| P0-0 | Public beta gap audit | Classify Free public beta P0 blockers, Creator closed beta blockers, schema/token-store/session/usage/entitlement conflicts, YouTube API/OAuth/retention/source-attribution blockers, and first 2-3 day order. Result recorded in `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`. | complete in PR |

### Free Public Beta / Before MVP Public Access

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| F1 | OAuth live connect smoke preflight | Exact same-thread approval checklist, env reference checklist, sanitized evidence shape, and rollback path for YouTube OAuth live connect. | complete in PR |
| F2 | OAuth live connect and token persistence smoke | Approval-gated live connect/token persistence evidence or blocker record; output stays status-label-only. | complete in PR |
| F3 | Durable session schema and adapter | Durable active-session/session-history storage plan or migration, server-only adapter, and fail-closed fallback. | complete in PR |
| F4 | Durable usage counter schema and adapter | Monthly/daily/session usage counters, translated character/message estimates, quota stop events, and server-owned writes. | complete in PR |
| F5 | Public entitlement baseline | Free entitlement read path and limit resolver that combines time caps, per-minute cap, active-session cap, and monthly character cap. | complete in PR |
| F6 | Server-only live chat target lookup | Owned-broadcast lookup at Start only; liveChatId stays server-only and never reaches UI/docs/log/browser storage/handoff. | complete in PR |
| F7 | Bounded `liveChatMessages.list` polling wiring | Active-session-only polling, `pollingIntervalMillis`, server-only `nextPageToken`, capped retry/backoff, empty-chat behavior, and quota/budget stop. | complete in PR |
| F8 | Live message normalization | Normalize text, Super Chat, sticker/member/system/deleted/banned/ended events into a safe internal shape with dedupe and deletion handling. | complete in PR |
| F9 | Real comments UI wiring | Replace preview-only comment feed with server-owned live/session state while keeping private ids and raw provider payloads out of the browser. | complete in PR |
| F10 | Azure normal translation execution | Server-only Azure route for eligible comments, skip policy, bounded batch/retry, cache/dedupe, and provider-error degradation. | pending / gated |
| F11 | Start/Stop reason UX | User-readable Start failure and Stop reason states for disconnected, reconnect-required, no live broadcast, disabled/ended/not found, quota, heartbeat, and provider errors. | pending |
| F12 | Usage display for Free beta | Session/day/month usage display, remaining limits, monthly character cap, and no-provider-call behavior when over limit. | pending |
| F13 | Data deletion, retention, and source attribution | Data deletion button/path, OAuth disconnect cleanup, retention job, deleted-message propagation, and `Source: YouTube Live Chat` on relevant surfaces. | pending |
| F14 | Creator locked cards / waitlist / click tracking | Show Creator price intent and locked feature cards during Free beta, with waitlist and click tracking that do not imply paid access is live. | pending |
| F15 | Free public beta final QA / launch readiness | Route/API smoke plan, no-secret scan, width checks, legal/copy review, rollback notes, and public-launch readiness decision. | pending |

### Creator Closed Beta / Before Creator Public Paid

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| C1 | Durable paid entitlement store | Server-owned paid entitlement rows, active/inactive states, safe Free degradation, and closed-beta gating. | pending |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | Approval-gated Product/Price/Checkout/Portal/webhook verification for allowed testers only, with signed webhook and idempotency. | pending / gated |
| C3 | Paid usage and monthly reset | Creator normal translation cap, AI character/token estimate cap, target-language multiplier, monthly reset, and over-limit fallback/stop. | pending |
| C4 | AI natural translation provider route | OpenAI mini primary route, Azure recoverable fallback, strict JSON parsing, dictionary-aware prompt hook, and no secret/provider target payload leakage. | pending / gated |
| C5 | OBS overlay token runtime | Session-scoped overlay token issue/revoke/expiry, token hash storage, read-only access, and no private metadata exposure. | pending |
| C6 | OBS overlay UI route | Transparent overlay route with latest translated comments, role badges, Super Chat display, original toggle, and source attribution. | pending |
| C7 | Moderator share token runtime | Session-scoped read-only share token issue/revoke/expiry, token hash storage, and future moderator-login migration path. | pending |
| C8 | Moderator share UI route | Read-only moderator view with translated comments, role badges, priority comments, deleted state, and source attribution. | pending |
| C9 | Custom dictionary minimum | Creator-only 30-term dictionary, term/replacement/note/language scope, server-owned storage, and provider integration hook. | pending |
| C10 | Priority display polish | Super Chat, Super Sticker, member, moderator, and owner priority lane/filter without creating revenue analytics. | pending |
| C11 | Simple 7-day history | Creator-only 7-day history, retention job, deletion/OAuth-disconnect cleanup, deleted-message propagation, and no CSV export. | pending |
| C12 | Creator closed beta final QA | Allowed-tester smoke for billing, entitlement, AI cost, overlay/share revoke, dictionary, history retention, and no-secret boundaries. | pending |

### Creator Public Paid Launch

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| CP1 | Creator paid launch readiness | Confirm closed-beta evidence, accepted risks, legal/copy, support/rollback, and cost envelope before unlocking public paid access. | pending |
| CP2 | Creator public paid gate flip | Approval-gated release of paid access, public billing copy, production smoke, and rollback evidence. | pending / gated |

### Public-after-P1 / Post-MVP

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| P1-1 | `streamList` primary migration | Implement `liveChatMessages.streamList` primary path and keep bounded `list` as fallback. | later |
| P1-2 | 30-day history and search | Extend Creator history from 7 to 30 days with search and retention controls. | later |
| P1-3 | CSV export | Add export with YouTube data notice, retention limits, and deletion compatibility. | later |
| P1-4 | Overlay templates | Add additional OBS overlay templates without exposing private metadata. | later |
| P1-5 | Dictionary import and suggestions | CSV import, dictionary suggestions, game/category dictionaries. | later |
| P1-6 | AI operations helpers | AI summary, question extraction, Super Chat reply-miss check, and reply suggestions. | later |
| P1-7 | Provider comparisons | OpenAI/Gemini/Cloudflare/other provider comparison under policy/cost gates. | later |
| P1-8 | Platform expansion | Twitch/Kick/TikTok or multi-platform runtime only after YouTube path is proven. | later |
| P1-9 | Voice translation / subtitle work | Treat as separate product or upper-tier work, not part of the initial Creator 980 yen MVP. | later |

## Active Priorities

1. F10 Azure normal translation execution
   - Goal: pass eligible F8 normalized live comments into the Free public beta Azure Translator primary provider path through server-only deterministic wiring, while preserving F8/F9 browser-safe boundaries.
   - Scope: local server-only bridge, source/target language policy, sanitized cache/dedupe key material, bounded batch/retry/cache execution via existing provider policy runtime, recoverable/terminal provider-error degradation to safe row status, usage handoff estimates, focused contract, docs, and `task.md`. No real YouTube polling, live provider call, live target lookup execution, provider target lookup execution, Azure/OpenAI provider API execution, remote mutation/schema apply, deploy/upload, Stripe live action, main promotion, public launch gate flip, browser storage expansion, handoff payload expansion, manual live target entry, route-render lookup, or connection-only monitoring is approved or run in this thread.
   - Status: complete in this PR.
   - Implemented:
     - `lib/comment-translator-azure-normal-translation-execution.ts` adds the F10 server-only bridge from eligible F8 normalized messages to `executeCommentTranslatorProviderPolicyBatch(...)`, keeping Free routing on Azure primary and preserving injected server-only provider execution.
     - `lib/comment-translator-real-comments-feed-shared.ts` accepts F10 translated/skipped/provider-error row statuses and maps translated rows to existing UI comments without changing the current default unavailable feed action.
     - `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md` and `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md` record F10 as local deterministic provider-path wiring with real provider/API execution still approval-gated.
   - Output/privacy boundary: F10 output keeps raw provider payload, raw provider comments, author channel id/URL/profile image URL, owner user id, provider channel id, live target value, provider target metadata, liveChatId, service_role, Authorization header, token values, server-only cursor, browser storage, and handoff payload material out of returned result/docs/browser-readable state. Provider input is limited to eligible text plus source/target language policy and sanitized cache/usage material inside the server-only provider boundary.
   - Remote/live execution: provider target lookup execution, live target lookup execution, real `liveChatMessages.list`, real provider payload capture, session start smoke, Azure/OpenAI provider API execution, live/provider execution, remote Supabase migration apply, deploy/upload, Stripe live action, main promotion, and public launch gate flip are all not-run/approval-gated.
   - F10 verification: `node scripts/comment-translator-azure-normal-translation-execution-contract.mjs`, changed-files no-secret scan over 6 files, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` all exit 0. `npm run build` emitted existing Next/middleware and webpack cache warnings; `git diff --check` emitted Windows line-ending warnings only.
   - Width checks skipped because F10 has no visible UI/CSS/layout/rendered-route change; the current default feed action remains sanitized unavailable/not-run, and the shared row mapper only adds server-side support for future F10 translated safe rows.
   - Residual risk / unchecked scope: real Azure/OpenAI provider API execution, real YouTube provider target lookup/live target resolution, actual `liveChatMessages.list`, non-empty live comment intake, deployed durable usage writes/enforcement, remote schema application, route/API smoke with authenticated allowed tester, and launch readiness remain unverified until same-thread ready preflight, sanitized output review, and explicit in-thread approval exist. Public release remains blocked until F11-F15 and approved live/remote evidence are complete.

2. F9 Real comments UI wiring
   - Goal: replace preview-only / fixture / manual comment feed authority with server-owned live/session state derived browser-safe display rows while keeping private ids and raw provider payloads out of browser-readable output.
   - Scope: local deterministic server-owned feed adapter, F8 browser-safe row consumption, safe feed state, server action / route seeded UI wiring, focused contract, readiness docs, and width checks at `390 / 820 / 1024 / 1280 / 1366px`. No real YouTube polling, live provider call, live target lookup execution, provider target lookup execution, translation provider API execution, remote mutation/schema apply, deploy/upload, Stripe live action, main promotion, or public launch gate flip is approved or run in this thread.
   - Status: complete in this PR.
   - Implemented:
     - `lib/comment-translator-real-comments-ui-wiring.ts` adds the F9 server-only contract, unavailable fail-closed feed state, and deterministic adapter from F8 browser-safe rows to safe display rows.
     - `lib/comment-translator-real-comments-feed-shared.ts` defines the browser-safe feed state and maps safe display rows to existing comment cards without author channel ids, profile URLs, raw provider payloads, provider target metadata, live target values, server-only cursors, token values, service_role values, Authorization header values, owner user id values, or provider channel id values.
     - `/tools/comment-translator` seeds the dock with server-owned unavailable feed state, and the client refresh path calls `getCommentTranslatorRealCommentsFeedAction()` instead of using fixture/manual comments as feed authority.
   - Output/privacy boundary: browser feed rows are limited to sanitized display data from F8 browser-safe projection. Fixture comments and manual input no longer drive the live feed; manual input remains local-only UI detail and does not affect live feed rows or quota preview. No live target entry UI, manual provider target entry, browser storage expansion, route-render lookup, background monitoring from connection alone, handoff payload expansion, or translation execution is added.
   - Remote/live execution: provider target lookup execution, live target lookup execution, real `liveChatMessages.list`, real provider payload capture, session start smoke, translation provider API execution, live/provider execution, remote Supabase migration apply, deploy/upload, Stripe live action, main promotion, and public launch gate flip are all not-run/approval-gated.
   - F9 verification: `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` (exit 0; Windows line-ending warnings only).
   - F3-F8 implementation confirmation: F3-F8 files and docs were inspected as F9 inputs. Existing F3-F8 focused contracts were also attempted, but their task-specific allowed-files gates fail on this F9 diff because `app/tools/comment-translator/page.tsx` / `app/tools/comment-translator/actions.ts` / F9 files are intentionally changed; this is an allowlist-context mismatch, not used as F9 failure evidence.
   - Width checks: Codex app in-app browser against local `next dev` on `127.0.0.1:3000` using a temporary deterministic F9 preview route that was removed before PR. Checked `390 / 820 / 1024 / 1280 / 1366px`; feed marker present, safe sample rows rendered, framework overlay absent, console warn/error count 0, document horizontal overflow 0 at all widths. Initial 1280/1366 check exposed an internal horizontal scroll from the 3-column `xl` layout; fixed by moving the right summary column to `2xl` and using `xl:grid-cols-[22rem_minmax(0,1fr)]`, then rechecked all widths successfully. Refresh interaction at 1280px returned sanitized unavailable/empty state with no console warn/error and document horizontal overflow 0.
   - Residual risk / unchecked scope: the real private-gated `/tools/comment-translator` dock could not be rendered unauthenticated in local browser because private launch gate correctly showed the unavailable surface; authenticated allowed-tester browser state was not available locally. Real YouTube provider target lookup, live target resolution, actual `liveChatMessages.list`, non-empty live comment intake, translation provider execution, deployed durable cursor/feed behavior across restarts, remote schema application, and launch readiness remain unverified until same-thread ready preflight, sanitized output review, and explicit in-thread approval exist. Public release remains blocked until F10-F15 and approved live/remote evidence are complete.

2. F8 Live message normalization
   - Goal: implement/record a server-only deterministic normalization layer for YouTube Live Chat polling/provider payloads without exposing raw provider payloads, raw comments, author channel id/URL/profile image URL, tokens, owner user id values, provider channel id values, live target values, provider target metadata, service_role values, Authorization header values, or server-only cursors to browser-readable output.
   - Scope: local normalizer, normalized event shape, message-reference dedupe, deleted-message propagation, banned/ended event handling, browser-safe projection, readiness doc update, gap audit update, and focused contract only. No real YouTube polling, live provider call, live target lookup execution, provider target lookup execution, translation provider API execution, remote mutation/schema apply, deploy/upload, Stripe live action, main promotion, or public launch gate flip is approved or run in this thread.
   - Status: complete in this PR.
   - Implemented:
     - `lib/comment-translator-live-message-normalization.ts` adds the F8 server-only contract, initial normalization state, provider-payload normalizer, and browser-safe projection.
     - The normalizer covers text, Super Chat, Super Sticker, member, system, deleted, banned, and ended events; dedupes by message reference; records deleted target references; and maps ended events to `stream-ended`.
     - BAN-event historical updates are intentionally P1-deferred when they would require author channel identity; this PR does not persist author channel id, author channel URL, or author profile image URL.
     - `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md` and `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md` record F8 as local server-only normalization and keep public launch blocked.
   - Output/privacy boundary: browser-safe projection excludes raw provider payload, author channel id/URL/profile image URL, live target values, provider target metadata, server-only cursor values, token values, service_role values, Authorization header values, owner user id values, and provider channel id values. No live target entry UI, manual provider target entry, browser storage expansion, route-render lookup, background monitoring from connection alone, UI feed replacement, or handoff payload expansion is added.
   - Remote/live execution: provider target lookup execution, live target lookup execution, real `liveChatMessages.list`, real provider payload capture, session start smoke, translation provider API execution, live/provider execution, remote Supabase migration apply, deploy/upload, Stripe live action, main promotion, and public launch gate flip are all not-run/approval-gated.
   - F8 verification: `node scripts/comment-translator-live-message-normalization-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` (exit 0; Windows line-ending warnings only).
   - Width checks skipped because F8 has no UI/CSS/rendered route/visible layout change; it adds a server-only local normalizer and updates readiness docs only.
   - Residual risk / unchecked scope: real YouTube provider target lookup, live target resolution, actual `liveChatMessages.list`, real provider payload shape drift, non-empty live comment intake, browser feed replacement, translation provider execution, deployed durable cursor behavior across restarts, remote schema application, and launch readiness remain unverified until same-thread ready preflight, sanitized output review, and explicit in-thread approval exist. Public release remains blocked until F9-F15 and approved live/remote evidence are complete.
   - Next safe action: after this PR merges, start F9 real comments UI wiring in a separate branch/PR from latest `origin/codex/comment-translator-free-public-beta-integration`.

2. F6 server-only live chat target lookup
   - Goal: implement/record the Start-only owned-broadcast lookup boundary for Free public beta without exposing provider target metadata or live target values to browser-readable output.
   - Scope: server-only deterministic/local adapter, sanitized unavailable fallback, Start-only route/action wiring, existing durable/session runtime gate, readiness doc update, and focused contract only. No real YouTube provider target lookup, live target resolution, polling, provider execution, remote mutation, deploy/upload, Stripe live action, main promotion, or public launch gate flip is approved or run in this thread.
   - Status: complete in this PR.
   - Implemented:
     - `lib/comment-translator-server-only-live-chat-target-lookup.ts` adds the F6 server-only contract, Start-only resolver, deterministic local adapter, and sanitized unavailable adapter. The resolver skips non-Start intents and credential-not-ready paths, and maps unavailable/missing owned broadcast or missing live target states to sanitized `stream-unavailable`.
     - `lib/comment-translator-session-runtime.ts` accepts F6 target readiness for Start and fails closed before creating an active session when target lookup is unavailable.
     - `/api/comment-translator/session` and comment-translator server actions now invoke the F6 resolver only through the server-only path; the default adapter is unavailable so no real provider lookup is executed in this PR.
     - `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md` records F6 as local Start-only wiring and keeps public launch blocked.
   - Output/privacy boundary: browser-safe session output still excludes token values, owner user id values, provider channel id values, live target values, service_role values, Authorization header values, provider target metadata, raw provider payload, and raw comments. No live target entry UI, manual provider target entry, browser storage expansion, or handoff payload expansion is added.
   - Remote/live execution: provider target lookup, live target resolution, session start smoke, polling, live/provider execution, translation provider API execution, remote Supabase migration apply, deploy/upload, Stripe live action, main promotion, and public launch gate flip are all not-run/approval-gated.
   - F6 verification: `node scripts/comment-translator-server-only-live-chat-target-lookup-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
   - Width checks skipped because F6 has no UI/CSS/rendered route/visible layout change; route/action behavior remains server-only and browser-safe output shape reuses existing stopped/session states.
   - Residual risk / unchecked scope: real YouTube provider target lookup and live target resolution remain unverified until same-thread ready preflight, sanitized output review, and explicit in-thread approval exist. Public release remains blocked until F7-F15 and approved live/remote evidence are complete.
   - Next safe action: after this PR merges, start F7 bounded `liveChatMessages.list` polling wiring in a separate branch/PR from latest `origin/codex/comment-translator-free-public-beta-integration`.

2. F5 public entitlement baseline
   - Goal: implement/record the Free entitlement read path and limit resolver for Free public beta.
   - Scope: server-only resolver, session route/action wiring, existing durable usage read consumption, durable readiness doc update, and focused contract only. No remote Supabase migration apply or operator remote mutation command is approved or run in this thread.
   - Status: complete in prior PR.
   - Implemented:
     - `lib/comment-translator-public-entitlement-baseline.ts` adds the F5 server-only public entitlement resolver, contract metadata, Free baseline normalization, monthly character remaining calculation, and fail-closed durable usage handling.
     - `lib/comment-translator-session-runtime.ts` adds the Free `monthlyTranslatedCharacterLimit` and records `monthlyTranslatedCharacters: 20_000` without replacing the existing time/per-minute/active-session caps.
     - `/api/comment-translator/session` and comment-translator server actions now resolve the F5 public entitlement baseline after durable F4 usage reads, pass the resolver's Free plan/usage to session evaluation, and safely degrade non-durable Paid entitlement state to Free until durable Paid entitlement work lands later.
     - `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md` records the local F5 baseline and keeps public launch blocked.
   - Baseline: `20,000 characters/month` is an added cap on top of the existing `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min` Free limits.
   - Safety boundary: missing/unreadable durable usage state fails closed before public session start. Non-durable Paid entitlement state degrades to safe Free limits until durable Paid entitlement work lands in later Creator closed beta tasks.
   - Remote mutation/schema apply: remote Supabase migration apply is not-run/approval-gated. No `supabase db push`, SQL editor apply, deploy/upload, provider target lookup, liveChatId lookup, session start smoke, live/provider execution, translation provider API execution, Stripe live action, main promotion, or public launch gate flip was run.
   - F5 verification: `node scripts/comment-translator-public-entitlement-baseline-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` (exit 0; Windows line-ending warnings only).
   - Width checks skipped because F5 has no UI/CSS/rendered route/visible layout change; route/action behavior remains server-only and browser-safe output shape reuses existing stopped/session states.
   - Residual risk / unchecked scope: deployed durable usage persistence and remote schema application remain unverified until a same-thread approved remote apply/preflight. Public release remains blocked until F6-F15 and approved remote schema/application evidence are complete.

2. F4 status
   - Goal: implement/record durable usage counter storage authority, server-only adapter, monthly/daily/session usage counters, translated character/message estimates, quota stop events, and server-owned writes for Free public beta.
   - Scope: local migration file, trusted server-only Supabase adapter, session route/action durable usage read/write wiring, durable readiness doc update, and focused contract only. No remote Supabase migration apply or operator remote mutation command was run in this thread.
   - Status: complete in this PR.
   - Implemented:
     - `supabase/migrations/20260615001000_comment_translator_usage_ledger_events.sql` creates `comment_translator_usage_ledger_events` as service-role-only durable usage ledger storage with monthly/day/session indexes, translated message/character estimates, provider request estimates, provider error classes, and quota/budget stop categories.
     - `lib/comment-translator-durable-usage-counter-store.ts` adds a server-only trusted adapter, env-reference-only readiness, sanitized row draft mapping, durable monthly/daily/session snapshot reads, durable event writes, and fail-closed unavailable reads/writes.
     - `/api/comment-translator/session` and comment-translator server actions now read usage snapshots from the durable usage authority and write session start/stop/quota stop usage events through the durable adapter before preserving the existing in-memory local ledger cache.
     - `lib/comment-translator-usage-ledger-runtime.ts` records the F4 durable adapter stage and carries a monthly translated character estimate in server-owned usage snapshots.
     - `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md` records the local F4 usage table/adapter and keeps remote apply gated.
   - Output/privacy boundary: browser-safe usage output still excludes token values, owner user id values, provider channel id values, liveChatId values, service_role values, Authorization header values, provider target metadata, raw provider payload, raw comments, and provider error bodies. The adapter may use owner/user references only inside the server-only trusted path.
   - Remote mutation/schema apply: remote Supabase migration apply is not-run/approval-gated. No `supabase db push`, SQL editor apply, deploy/upload, provider target lookup, liveChatId lookup, session start smoke, live/provider execution, translation provider API execution, Stripe live action, main promotion, or public launch gate flip was run.
   - F4 verification: `node scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
   - Width checks skipped because F4 has no UI/CSS/rendered route/visible layout change; route/action behavior is server-only and browser-safe output shape reuses existing stopped/session states.
   - Residual risk / unchecked scope: the local migration file is not applied to any remote Supabase project in this thread, so deployed durable usage persistence remains unverified until a same-thread approved remote apply/preflight. Provider execution runtime still records deterministic local estimates until later gated provider wiring tasks connect real live/provider execution to durable writes. Public release remains blocked until F5/F6-F15 and approved remote schema/application evidence are complete.
   - Next safe action: after this PR merges, start F5 public entitlement baseline in a separate branch/PR from latest `origin/codex/comment-translator-free-public-beta-integration`.

2. F3 status
   - Goal: implement/record durable active-session/session-history storage authority, server-only adapter, and fail-closed fallback for Free public beta.
   - Scope: local migration file, trusted server-only Supabase adapter, session route/action durable read/write wiring, and focused contract only. No remote Supabase migration apply or operator remote mutation command was run in this thread.
   - Status: complete in this PR.
   - Implemented:
     - `supabase/migrations/20260615000000_comment_translator_sessions.sql` creates `comment_translator_sessions` as service-role-only durable active-session/session-history storage with one active session per owner.
     - `lib/comment-translator-durable-session-store.ts` adds a server-only trusted adapter, env-reference-only readiness, sanitized row draft mapping, durable active-session read, durable state persist, and fail-closed fallback.
     - `/api/comment-translator/session` and comment-translator server actions now read active sessions from the durable authority and fail closed to an existing sanitized stopped `session-limit` state when the durable store is unavailable or query/write fails.
   - Output/privacy boundary: browser-safe session output still excludes token values, owner user id values, provider channel id values, liveChatId values, service_role values, Authorization header values, provider target metadata, raw provider payload, and raw comments. The adapter may use owner/user and credential references only inside the server-only trusted path.
   - Remote mutation/schema apply: remote Supabase migration apply is not-run/approval-gated. No `supabase db push`, SQL editor apply, deploy/upload, provider target lookup, liveChatId lookup, session start smoke, live/provider execution, translation provider API execution, Stripe live action, main promotion, or public launch gate flip was run.
   - F3 verification: `node scripts/comment-translator-durable-session-schema-adapter-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
   - Width checks skipped because F3 has no UI/CSS/rendered route/visible layout change; route/action behavior is server-only and browser-safe output shape reuses existing display states.
   - Residual risk / unchecked scope: the local migration file is not applied to any remote Supabase project in this thread, so deployed durable persistence remains unverified until a same-thread approved remote apply/preflight. Public release remains blocked until F5/F6-F15 and approved remote schema/application evidence are complete.
   - Next safe action: consumed by F4 in this PR; after this PR merges, start F5 public entitlement baseline in a separate branch/PR from latest `origin/codex/comment-translator-free-public-beta-integration`.

3. F2 status
   - Goal: collect approval-gated live connect/token persistence evidence or blocker record with status-label-only output.
   - Scope: F2 can execute only after same-thread ready preflight, sanitized output review, and exact explicit approval. Do not execute provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, remote mutation, schema migration, deploy/upload, Stripe action, main promotion, or public launch gate flip.
   - Status: complete in this PR. Exact same-thread approval was provided for the Cloudflare staging private-gated target label. The approved action returned to `/account/integrations` and produced sanitized `connection-status-connected` evidence.
   - Evidence record: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_TOKEN_PERSISTENCE_SMOKE_EVIDENCE.md`.
   - Current F2 execution state: YouTube OAuth live connect and live authorization code exchange were run only inside the approved UI flow; token persistence smoke produced `connection-status-connected`; provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, schema migration, Stripe live action, main promotion, and public launch gate flip are all not-run.
   - F2 verification: docs/content inspection for the F2 evidence record, changed-files no-secret scan over `task.md` and the F2 record, and `git diff --check`.
   - Width checks skipped for F2 because there are no UI/CSS/rendered route/visible copy/browser storage/layout/runtime changes.
   - Next safe action: consumed by F3/F4; after this PR merges, start F5 public entitlement baseline in a separate branch/PR from latest `origin/codex/comment-translator-free-public-beta-integration`.

4. F1 status
   - Goal: produce exact same-thread approval checklist, operator-local env reference checklist, sanitized evidence shape, abort conditions, and rollback path for YouTube OAuth live connect.
   - Scope: docs/contract preflight only. No live OAuth, provider, remote mutation, schema migration, deploy/upload, Stripe, main promotion, or public launch action is approved or run.
   - Status: complete in this PR. Full record: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_SMOKE_PREFLIGHT.md`.
   - F1 verification: `node scripts/comment-translator-oauth-live-connect-smoke-preflight-contract.mjs`, docs/content inspection for F1 output, changed-files no-secret scan over `task.md`, the F1 doc, and the F1 contract script, and `git diff --check`.
   - Width checks skipped for F1 because there are no UI/CSS/rendered route/visible copy/browser storage/layout/runtime changes.
   - F1 residual risk: live OAuth connect, live authorization code exchange, token persistence smoke, provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, schema migration, Stripe live action, main promotion, and public launch gate flip remain not-run and approval-gated.
   - F1 handoff consumed by F2/F3/F4; next safe action after this PR merges is F5 public entitlement baseline.

5. Phase 0 public-beta gap audit
   - Goal: compare current repo state against the final MVP brief and produce implementation-sized blockers.
   - Scope: docs/task-board and code inspection only unless separately approved.
   - Output classified:
     - Free public beta P0 blockers.
     - Creator closed beta blockers.
     - schema / token-store / session / usage / entitlement conflicts.
     - YouTube API / OAuth / retention / source attribution blockers.
     - first 2-3 day implementation order.
   - Status: complete in this PR. Full record: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`.
   - Verification passed: targeted docs/content inspection for `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`, changed-files no-secret scan over `task.md` and the audit doc, and `git diff --check` (exit 0; existing `task.md` line-ending warning only).
   - Width checks skipped because there are no UI/CSS/rendered route changes.
   - Do not run Google OAuth live connect, YouTube OAuth live connect, provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, billing setting mutation, Customer Portal redirect, or webhook registration.

6. Next recommended roadmap task: F7 bounded `liveChatMessages.list` polling wiring
   - Start F7 bounded polling wiring in a separate branch/PR from latest `origin/codex/comment-translator-free-public-beta-integration` after this F6 PR merges.
   - F7 should remain server-only/contract-first and keep active-session-only polling, server-only cursor/live target handling, capped retry/backoff, empty-chat behavior, and quota/budget stop accounting without enabling public launch.
   - Target: `codex/comment-translator-free-public-beta-integration`.

## Approval-Gated Actions

Do not perform the following without same-thread ready preflight, sanitized output review, and exact explicit approval:

- Google OAuth live connect execution.
- YouTube OAuth live connect execution.
- live authorization code exchange.
- live token persistence smoke.
- provider target lookup.
- liveChatId lookup.
- session start smoke.
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

## Current Blockers / Residual Risks

- Public release remains blocked until Free public beta P0 evidence is implemented and verified.
- Allowed-tester session start smoke from Task 28 remains not run.
- Durable public enforcement is still required for session state, usage counters, entitlements, admin aggregates, and distributed rate-limit/abuse controls.
- Live YouTube OAuth connect, liveChatId lookup, actual public session start, and live provider execution remain approval-gated.
- Stripe live billing and paid entitlement activation remain approval-gated.
- Creator public paid launch should not proceed before Creator closed beta validates Stripe, entitlement, usage limits, overlay/share token revoke, AI cost, and retention/deletion behavior.

## Canonical Documents

- Public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`
- Public beta gap audit: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- Production env readiness: `docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md`
- Private-gated production smoke evidence: `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md`
- YouTube OAuth connection smoke readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md`
- YouTube OAuth session start smoke readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md`
- YouTube OAuth integration final QA / promotion readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_INTEGRATION_FINAL_QA_PROMOTION_READINESS.md`
- OAuth live connect/token persistence F2 evidence: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_TOKEN_PERSISTENCE_SMOKE_EVIDENCE.md`
- Durable persistence readiness: `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md`
- Stripe live readiness: `docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md`
- Security/privacy final review: `docs/active/COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md`

## Initial Release Decisions

These decisions are fixed for the current public-release roadmap unless the user explicitly changes them in a later task:

- Free public beta ships before Creator public paid launch.
- Creator price intent can be shown during Free public beta as locked/waitlist UI, but paid access starts with closed beta.
- Free plan starts conservatively. Treat `20,000 characters/month` as an added monthly character cap on top of existing time/per-minute caps, not a replacement for `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`.
- Source languages: initial selectable source languages are JA / EN / KR / CN.
- Target languages: initial selectable target languages include JA / EN.
- Source and target cannot be the same. UI and server validation must reject same-language pairs.
- Provider scope: YouTube ships first; Twitch remains future unless explicitly pulled into public-release scope.
- Raw text logging: disabled by default; diagnostics are short-lived and sanitized.
- Account path: `/account/integrations` is the preferred provider settings entry; `/tools/comment-translator` should also show a direct integration CTA when YouTube is not connected.
- Translation provider policy: Free routes to Azure Translator primary; Creator/Paid routes to OpenAI mini primary with Azure Translator as recoverable-error fallback unless later provider policy changes.
- `liveChatMessages.list` is acceptable for Free MVP when bounded by `pollingIntervalMillis`, server-only cursor/liveChatId handling, session limits, and quota/budget stop. `streamList` is Public-after-P1 primary migration work.
- Public UI must not expose liveChatId entry. Any debug/manual target path must be isolated from public build and gated.
- MVP should not persist author channel id, author channel URL, or author profile image URL. If BAN-event historical updates require an author key, use a short-lived server-only/session-scoped hash design or defer past-comment bulk updates to P1.

## Explicit Initial-Release Exclusions

- Background provider monitoring after account connection.
- Automatic session start when a connected user begins streaming.
- Multiple concurrent streams per user.
- User-provided Google Cloud project or OAuth client.
- Manual channel ID or liveChatId entry as the default public flow.
- Unlimited polling or broad polling loops.
- Provider usage charging and paid-priority scheduling.
- Translation of all languages by default.
- Raw text logging by default.
- Client storage of tokens, provider identifiers, liveChatId, owner user id, provider channel id, service_role key, Authorization header, or provider target metadata.
- Delayed translation queue for skipped comments.
- Twitch runtime before YouTube public path is proven, unless separately approved.
- CSV export, 30-day history, advanced search, AI summaries, reply suggestions, voice translation, and multi-platform runtime in the Free public beta.

## Verification Baseline

- Docs/task-board only:
  - targeted markdown/content inspection
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
