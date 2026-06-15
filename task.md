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

- Current cleanup branch: `codex/comment-translator-task-md-roadmap-cleanup`.
- Base: latest `origin/codex/comment-translator-youtube-oauth-integration`.
- This branch is docs/task-board cleanup only unless the release owner explicitly expands scope.
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
| P0-0 | Public beta gap audit | Classify Free public beta P0 blockers, Creator closed beta blockers, schema/token-store/session/usage/entitlement conflicts, YouTube API/OAuth/retention/source-attribution blockers, and first 2-3 day order. | next |

### Free Public Beta / Before MVP Public Access

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| F1 | OAuth live connect smoke preflight | Exact same-thread approval checklist, env reference checklist, sanitized evidence shape, and rollback path for YouTube OAuth live connect. | pending |
| F2 | OAuth live connect and token persistence smoke | Approval-gated live connect/token persistence evidence or blocker record; output stays status-label-only. | pending / gated |
| F3 | Durable session schema and adapter | Durable active-session/session-history storage plan or migration, server-only adapter, and fail-closed fallback. | pending |
| F4 | Durable usage counter schema and adapter | Monthly/daily/session usage counters, translated character/message estimates, quota stop events, and server-owned writes. | pending |
| F5 | Public entitlement baseline | Free entitlement read path and limit resolver that combines time caps, per-minute cap, active-session cap, and monthly character cap. | pending |
| F6 | Server-only live chat target lookup | Owned-broadcast lookup at Start only; liveChatId stays server-only and never reaches UI/docs/log/browser storage/handoff. | pending / gated |
| F7 | Bounded `liveChatMessages.list` polling wiring | Active-session-only polling, `pollingIntervalMillis`, server-only `nextPageToken`, capped retry/backoff, empty-chat behavior, and quota/budget stop. | pending / gated |
| F8 | Live message normalization | Normalize text, Super Chat, sticker/member/system/deleted/banned/ended events into a safe internal shape with dedupe and deletion handling. | pending |
| F9 | Real comments UI wiring | Replace preview-only comment feed with server-owned live/session state while keeping private ids and raw provider payloads out of the browser. | pending |
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

1. Task board cleanup
   - Goal: keep `task.md` short and operational.
   - Scope: archive the prior long board, remove stale completed-task detail and obsolete next-session prompt, keep only current premises, roadmap snapshot, active direction, blocked gates, and verification baseline.
   - Verification: markdown inspection and `git diff --check`.
   - Status: complete on `codex/comment-translator-task-md-roadmap-cleanup`. Previous long board is archived at `docs/archive/task-board-pre-2026-06-15-roadmap-cleanup.md`.

2. Next recommended roadmap task: Phase 0 public-beta gap audit
   - Goal: compare current repo state against the final MVP brief and produce implementation-sized blockers.
   - Scope: docs/task-board and code inspection only unless separately approved.
   - Output should classify:
     - Free public beta P0 blockers.
     - Creator closed beta blockers.
     - schema / token-store / session / usage / entitlement conflicts.
     - YouTube API / OAuth / retention / source attribution blockers.
     - first 2-3 day implementation order.
   - Do not run Google OAuth live connect, YouTube OAuth live connect, provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, billing setting mutation, Customer Portal redirect, or webhook registration.

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
- Production env readiness: `docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md`
- Private-gated production smoke evidence: `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md`
- YouTube OAuth connection smoke readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md`
- YouTube OAuth session start smoke readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md`
- YouTube OAuth integration final QA / promotion readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_INTEGRATION_FINAL_QA_PROMOTION_READINESS.md`
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
