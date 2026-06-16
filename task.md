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

- Current branch: `codex/comment-translator-free-beta-fb-l4-approved-start-to-translation-smoke`.
- Base: latest `origin/codex/comment-translator-free-public-beta-integration`.
- This branch is FB-L4 docs/contract blocker evidence and exact-command ready preflight only. It does not run Start-to-translation smoke execution, live/provider execution, remote mutation/schema apply, deploy/upload, Stripe live action, main promotion, or public launch gate flip without same-thread approval.
- Archived previous long board snapshot: `docs/archive/task-board-pre-2026-06-16-free-beta-public-usability-cleanup.md`.
- Older archived board snapshot: `docs/archive/task-board-pre-2026-06-15-roadmap-cleanup.md`.

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
8. Durable session/usage enforcement works in the deployed target.
9. Public launch remains blocked until the release owner approves the final gate flip.

Current public-launch decision: `public-release capable: no`.

## Branch Strategy

- Keep `codex/comment-translator-youtube-oauth-integration` as the completed YouTube OAuth Integration Roadmap collection branch.
- Keep `codex/comment-translator-free-public-beta-integration` as the Free beta collection branch.
- `P0-0` and `F1` through `F15` are complete on the Free beta collection branch as implementation/readiness work.
- Next PRs should target `codex/comment-translator-free-public-beta-integration` until Free beta public usability evidence is accepted.
- After Free beta public usability is accepted, promote `codex/comment-translator-free-public-beta-integration` to `main` through a separate approval-gated promotion PR.
- Creator closed beta can start after the Free path is proven, or use a later dedicated collection branch if the release owner wants separation.

## Roadmap Snapshot

### Completed Collection Work

| Area | State | Reference |
| --- | --- | --- |
| YouTube OAuth Integration Roadmap Task 1-10 | Complete on `codex/comment-translator-youtube-oauth-integration` | `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_INTEGRATION_FINAL_QA_PROMOTION_READINESS.md` |
| Free Public Beta P0-0 and F1-F15 | Complete as local/server-only implementation and readiness foundation | `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md` |

### Current Focus

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| FB-L1 | Free beta public usability preflight | Exact approval-gated plan for remote/deployed durable enforcement, authenticated allowed-tester route/API smoke, Start smoke, live target lookup, bounded polling, Azure execution, UI confirmation, rollback, and no-secret output. | complete |
| FB-L2 | Remote durable enforcement evidence | Blocker/evidence record plus exact-command ready preflight for deployed `comment_translator_sessions` and `comment_translator_usage_ledger_events` authority. Remote apply/mutation/deployed smoke remain not-run until exact explicit approval. | preflight-ready / gated |
| FB-L3 | Allowed-tester route/API smoke | Authenticated route/API smoke for server-owned session/feed/usage/deletion/Creator locked states without live/provider execution unless separately approved. | preflight-ready / blocked-no-approval |
| FB-L4 | Approved Start-to-translation smoke | Same-thread approved Start smoke proving server-only live target lookup, bounded `liveChatMessages.list`, non-empty intake, Azure translation, UI feed, usage, stop reason, and source attribution. | preflight-ready / blocked-no-approval |
| FB-L5 | Production/custom deployed smoke | Confirm the deployed target serving the Free beta path matches the reviewed integration branch and renders/operates for allowed testers. | pending / gated |
| FB-L6 | Public launch gate decision | Release-owner decision to keep blocked, open limited public beta, or flip the public gate. | pending / gated |

### Later Work

Keep these rows visible so future threads do not have to reconstruct the post-Free-beta roadmap from archive.

#### Creator Closed Beta / Before Creator Public Paid

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

#### Creator Public Paid Launch

| ID | Task | Outcome | Status |
| --- | --- | --- | --- |
| CP1 | Creator paid launch readiness | Confirm closed-beta evidence, accepted risks, legal/copy, support/rollback, and cost envelope before unlocking public paid access. | pending |
| CP2 | Creator public paid gate flip | Approval-gated release of paid access, public billing copy, production smoke, and rollback evidence. | pending / gated |

#### Public-after-P1 / Post-MVP

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

## Account Limits / Entitlement Control

- Per-account judgment is server-owned: authenticated caller authorization binds work to the owner account, and browser-readable output must not expose owner ids, provider channel ids, provider target metadata, liveChatId, OAuth values, tokens, or billing identifiers.
- Free public beta limit authority is the Free entitlement baseline plus durable usage/session state. Current Free caps: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month.
- Enforcement happens before Start, while the session is active, during status/heartbeat/feed usage checks, and before provider translation execution. If durable usage/session state is unavailable or unreadable, the safe behavior is fail closed with sanitized stop/status output.
- Paid access after C1/C3 should be controlled by signed Stripe webhook evidence, durable paid entitlement rows, paid usage counters, monthly reset state, and server-owned fallback/stop reasons. Until that durable paid authority is implemented and verified, incomplete or unreadable paid state must degrade safely to Free or paid-inactive behavior, not public paid limits.

## Current Blockers / Residual Risks

- FB-L1 is complete as preflight/docs/contract only. It proves the exact gated sequence and sanitized evidence boundary, not public usability itself.
- Free beta implementation/readiness foundation is complete through F15, but actual public usability is not accepted yet.
- Public release remains blocked until approved live/provider/remote/deployed evidence and release-owner launch approval exist.
- Remote/deployed durable session and usage enforcement remain unverified; FB-L2 now has exact-command ready preflight and Phase A dry-run evidence for the two reviewed durable migrations, but remote apply/smoke execution remains blocked-no-approval until same-thread sanitized output review and exact explicit approval are provided.
- Authenticated allowed-tester route/API smoke with server-owned session/feed/usage/deletion/Creator locked states now has exact-command ready preflight and blocker/evidence record, but execution remains unchecked / not-run / approval-gated.
- Actual public session Start smoke remains approval-gated.
- Approved Start-to-translation smoke now has exact-command ready preflight and blocker/evidence record, but Start, live target lookup, bounded `liveChatMessages.list`, non-empty intake, Free Azure translation, UI feed confirmation, usage, stop reason, and source attribution evidence remain unchecked / not-run / approval-gated.
- Real provider target lookup, live target lookup, actual `liveChatMessages.list`, non-empty live comment intake, and real Azure provider execution remain approval-gated for the Free beta launch path.
- Production/custom deployed target freshness and Free beta route behavior must be confirmed before broad access.
- Stripe live billing and paid entitlement activation remain out of Free beta and approval-gated.
- Public launch gate flip remains not-run and approval-gated.

## Latest FB-L1 Evidence

- Active preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-public-usability-preflight-contract.mjs`.
- FB-L1 separates local deterministic checks, sanitized server-owned state checks, approval-gated exact-command preflight, and unchecked live-provider scope.
- Each smoke records what it proves and what it does not prove: remote/deployed durable enforcement, authenticated allowed-tester route/API smoke, Start smoke, live target lookup, bounded polling, Azure execution, UI confirmation, rollback, and no-secret output.
- Width checks skipped for FB-L1 because there is no visible UI/CSS/layout/copy change, no rendered route change, no browser storage change, and no runtime behavior change.
- Unchecked scope remains: remote Supabase migration apply not-run/approval-gated; provider target lookup, live target lookup, liveChatMessages.list, session start smoke, Azure/OpenAI provider API execution, live/provider execution, deploy/upload, Stripe live actions, main promotion, and public launch gate flip were not run.
- Verification: `node scripts/comment-translator-free-beta-public-usability-preflight-contract.mjs` passed; changed-files no-secret scan passed for 6 changed files; `git diff --check` passed with CRLF normalization warnings only.

## Latest FB-L2 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md`.
- Active ready preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs`.
- Ready preflight state: preflight-ready. Execution decision remains blocked-no-approval until the exact approval label `approved-fb-l2-remote-durable-enforcement-apply-and-smoke` is provided in-thread.
- Remote Supabase migration apply: not-run/approval-gated. Remote Supabase mutation: not-run/approval-gated. Deployed durable write/read smoke: not-run/approval-gated.
- Exact command sequence is documented for local deterministic baseline, `npx supabase migration list --linked`, `npx supabase db push --linked --dry-run`, approval-gated `npx supabase db push --linked`, and approval-gated deployed `POST /api/comment-translator/session` status/start/stop smoke using operator-local env references only.
- Phase A local baseline was narrowed to the current-proof local baseline: `comment-translator-free-beta-remote-durable-enforcement-evidence-contract`, which checks durable session store source, durable usage store source, public entitlement baseline source, route/action durable fail-closed wiring, and FB-L2 evidence/preflight boundaries. Historical F3/F4/F5/F12 contract drift is recorded as residual risk, not a blocker for Phase A dry-run: those older task-specific contracts failed on compact `task.md` assertions and one pre-monthly-character-cap Free limit expectation.
- Phase A dry-run result: current-proof local baseline passed. The exact worktree copied local Supabase link metadata from the same project root without printing values: `supabase link metadata copied locally`. `npx supabase migration list --linked` showed local/remote matched for `20260527000000` and `20260601000000`, with only the two reviewed durable migrations pending locally: `20260615000000` and `20260615001000`. `npx supabase db push --linked --dry-run` was dry-run only and reported it would push exactly `20260615000000_comment_translator_sessions.sql` and `20260615001000_comment_translator_usage_ledger_events.sql`. Phase A label: `phase-a-dry-run-reviewed-two-migrations-only`.
- `comment_translator_sessions` and `comment_translator_usage_ledger_events` remain the required Free durable authority to prove later for 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month.
- Missing/unreadable durable session or usage state must fail closed with sanitized stop/status output before Start or provider execution.
- This FB-L2 record does not prove provider target lookup, live target lookup, `liveChatMessages.list`, Start smoke, Azure/OpenAI provider API execution, Paid entitlement C1/C3, Stripe billing, Creator paid limits, deployed freshness, or public launch readiness.
- Width checks skipped because FB-L2 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or runtime behavior change.
- Unchecked scope remains: remote Supabase migration apply, remote Supabase mutation, deployed durable session/usage smoke, authenticated allowed-tester route/API smoke, session start smoke, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, deploy/upload, Stripe live actions, billing setting mutation, main promotion, and public launch gate flip were not run.
- Verification: RED `node scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs` failed on missing FB-L2 evidence doc, then later failed on missing ready preflight doc and missing Phase A dry-run evidence after the contract was tightened; it passed after docs/task updates. Changed-files no-secret scan passed for 8 changed files. `git diff --check` passed with CRLF normalization warnings only. App runtime/UI files were not changed; this slice changes docs/task notes and the focused contract script only, so `npm run lint`, `npx tsc --noEmit`, and `npm run build` were not run. Phase A dry-run is now reviewed for exactly the two durable migrations; remote apply and deployed smoke remain approval-gated.

## Latest FB-L3 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md`.
- Active ready preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs`.
- Ready preflight state: preflight-ready. Execution decision remains blocked-no-approval until the exact approval label `approved-fb-l3-allowed-tester-route-api-smoke` is provided in-thread.
- Authenticated allowed-tester route/API smoke execution: not-run/approval-gated. Allowed-tester cookie/session validity: not-run/approval-gated. Deployed route/API target behavior: not-run/approval-gated.
- Exact route/action boundary is documented for `POST /api/comment-translator/session` status-only smoke plus server-owned action surfaces: `getCommentTranslatorSessionStatusAction`, `getCommentTranslatorRealCommentsFeedAction`, `requestCommentTranslatorDataDeletionAction`, `getCommentTranslatorCreatorLockedWaitlistAction`, and `recordCommentTranslatorCreatorLockedClickAction`.
- FB-L3 target states are server-owned session/feed/usage/deletion/Creator locked states. Expected sanitized labels include session/feed/usage/deletion/Creator locked status, counts, stop reasons, unavailable reasons, `durable-store-unavailable`, `private-launch-gated`, and `live-provider-polling-not-approved`.
- Free caps remain 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month. Missing/unreadable durable session or usage state must fail closed with sanitized stop/status output.
- FB-L3 does not prove FB-L2 remote/deployed durable enforcement, session Start, provider target lookup, live target lookup, `liveChatMessages.list`, non-empty live comment intake, Azure/OpenAI provider API execution, deployed freshness, Paid entitlement C1/C3, Stripe billing, Creator paid limits, main promotion, or public launch readiness.
- Width checks skipped because FB-L3 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or runtime behavior change.
- Unchecked scope remains: authenticated allowed-tester route/API smoke execution, allowed-tester cookie/session validity, deployed route/API target behavior, remote Supabase migration apply, remote Supabase mutation, deployed durable session/usage smoke, session start smoke, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, deploy/upload, Stripe live actions, billing setting mutation, main promotion, and public launch gate flip were not run.
- Verification: RED `node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs` failed on missing FB-L3 evidence doc, then passed after docs/task updates. Changed-files no-secret scan passed for 8 changed files. `git diff --check` passed with CRLF normalization warnings only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed after local dependencies were restored with `npm ci`. App runtime/UI files were not changed; this slice changes docs/task notes and the focused contract script only.

## Latest FB-L4 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md`.
- Active ready preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs`.
- Ready preflight state: preflight-ready. Execution decision remains blocked-no-approval until the exact approval label `approved-fb-l4-start-to-translation-smoke` is provided in-thread.
- Start-to-translation smoke execution: not-run/approval-gated. Explicit Start, server-only live target lookup, bounded `liveChatMessages.list`, non-empty live comment intake, Free Azure translation, UI feed confirmation, usage, stop reason, and source attribution evidence remain not-run/approval-gated.
- FB-L2 remote durable enforcement remains not-run/approval-gated, and FB-L4 did not run remote Supabase migration apply or mutation.
- FB-L3 authenticated allowed-tester route/API smoke remains not-run/approval-gated unless separately approved; FB-L4 did not fold FB-L3 into its evidence.
- Exact approval-gated command sequence is documented for local deterministic baseline, authenticated status, explicit Start, server-only live target lookup command review/execution, one bounded liveChatMessages.list polling step, Free Azure translation/live-provider harness review/execution, UI feed confirmation, and explicit Stop.
- Free caps remain 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month. Missing or unreadable durable state must fail closed with sanitized stop/status output before Start or provider execution.
- FB-L4 does not prove deployed durable enforcement, authenticated route/API execution, actual Start, live target lookup, liveChatMessages.list, non-empty intake, Azure/OpenAI provider API execution, deployed freshness, Paid entitlement C1/C3, Stripe billing, Creator paid limits, main promotion, or public launch readiness.
- Width checks skipped because FB-L4 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or runtime behavior change.
- Unchecked scope remains: Start-to-translation smoke execution, explicit Start, allowed-tester cookie/session validity, deployed route/API target behavior, remote Supabase migration apply, remote Supabase mutation, deployed durable session/usage smoke, authenticated allowed-tester route/API smoke execution, provider target lookup, live target lookup, liveChatMessages.list, non-empty live comment intake, Azure/OpenAI provider API execution, UI feed confirmation on an authenticated deployed target, deploy/upload, Stripe live actions, billing setting mutation, main promotion, and public launch gate flip were not run.
- Verification: RED `node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs` failed on missing FB-L4 evidence doc, then passed after docs/task updates. Changed-files no-secret scan passed for 6 changed files. `git diff --check` passed with CRLF normalization warnings only. App runtime/UI files were not changed; this slice changes docs/task notes and the focused contract script only, so `npm run lint`, `npx tsc --noEmit`, and `npm run build` were not run.

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
- Free beta remote durable enforcement ready preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md`
- Public beta gap audit: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- Durable persistence readiness: `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md`
- OAuth live connect preflight: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_SMOKE_PREFLIGHT.md`
- OAuth live connect/token persistence evidence: `docs/active/COMMENT_TRANSLATOR_OAUTH_LIVE_CONNECT_TOKEN_PERSISTENCE_SMOKE_EVIDENCE.md`
- Production env readiness: `docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md`
- YouTube OAuth connection smoke readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md`
- YouTube OAuth session start smoke readiness: `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md`
- Private-gated production smoke evidence: `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md`
- Private-gated live/provider smoke readiness: `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_LIVE_PROVIDER_SMOKE_READINESS.md`
- Provider legal/copy refresh: `docs/active/COMMENT_TRANSLATOR_PROVIDER_LEGAL_COPY_REFRESH.md`
- Security/privacy final review: `docs/active/COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md`
- Stripe live readiness: `docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md`
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
