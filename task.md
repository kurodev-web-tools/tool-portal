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

- Current branch: `codex/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke`.
- Base: latest `origin/codex/comment-translator-free-public-beta-integration`.
- This branch records PL-G4 production/custom deployed smoke execution preflight/evidence as blocked-no-approval, using the existing FB-L5 ready preflight boundary. It does not execute deployed route/API smoke, allowed-tester browser smoke, session Start, Stop, heartbeat mutation, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, remote Supabase mutation/schema apply, Stripe action, billing setting mutation, limited public beta open, public launch gate flip, or main promotion.
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
| FB-L2 | Remote durable enforcement preflight/evidence record | Blocker/evidence record plus exact-command ready preflight for deployed `comment_translator_sessions` and `comment_translator_usage_ledger_events` authority. Remote apply/mutation/deployed smoke remain not-run until exact explicit approval. | preflight complete / execution pending |
| FB-L3 | Allowed-tester route/API smoke preflight/evidence record | Authenticated route/API smoke for server-owned session/feed/usage/deletion/Creator locked states without live/provider execution unless separately approved. | preflight complete / execution pending |
| FB-L4 | Start-to-translation smoke preflight/evidence record | Same-thread approved Start smoke proving server-only live target lookup, bounded `liveChatMessages.list`, non-empty intake, Azure translation, UI feed, usage, stop reason, and source attribution. | preflight complete / execution pending |
| FB-L5 | Production/custom deployed smoke preflight/evidence record | Confirm the deployed target serving the Free beta path matches the reviewed integration branch and renders/operates for allowed testers. | preflight complete / execution pending |
| FB-L6 | Public launch gate decision preflight/evidence record | Release-owner decision to keep blocked, open limited public beta, or flip the public gate. Current recorded decision is keep blocked / blocked-no-approval. | preflight complete / release-owner approval pending |

### Public Launch Remaining Gates

These are the remaining gates before Free public beta can be opened. Each item requires same-thread ready preflight, sanitized output review, and exact explicit approval before execution.

| ID | Gate | Required outcome | Current state |
| --- | --- | --- | --- |
| PL-G1 | Execute FB-L2 remote durable enforcement | Apply/confirm the reviewed durable session and usage authority, then prove deployed fail-closed session/usage behavior for Free caps. | remote-apply-and-deployed-smoke-completed |
| PL-G2 | Execute FB-L3 allowed-tester route/API smoke | Prove an authenticated allowed tester can reach server-owned session/feed/usage/deletion/Creator locked states with sanitized output. | PL-G2B blocked-no-approval / deployed execution approval-gated |
| PL-G3 | Execute FB-L4 Start-to-translation smoke | Prove explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` step, non-empty intake, Free Azure translation, UI feed, usage, stop reason, source attribution, and Stop. | blocked-no-approval / not-run / approval-gated |
| PL-G4 | Execute FB-L5 production/custom deployed smoke | Prove deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gates, and Start-to-translation gate status. | blocked-no-approval / not-run / approval-gated |
| PL-G5 | Release-owner public launch decision | Choose `keep blocked`, `open limited public beta`, or `flip public gate`, with missing evidence explicitly accepted or completed. | approval-gated / current decision keep blocked |
| PL-G6 | Public access change / promotion operation | If approved, perform a separate reviewed operation for limited public beta open or public gate flip; promote integration to `main` only through a separate approval-gated PR. | approval-gated / not-run |

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
- PL-G1 remote durable enforcement execution is complete for the approved boundary: remote Supabase migration apply completed after sanitized migration list and dry-run checks, and deployed status/start/stop smoke completed with sanitized status/stop reasons. It does not prove PL-G2 route/API surfaces, provider target lookup, live polling, Azure execution, production/custom deployed freshness beyond the provided target, limited public beta readiness, or public launch readiness.
- PL-G1 remote durable enforcement is complete for the approved FB-L2 execution boundary, but public usability remains blocked until PL-G2 through PL-G5 evidence and release-owner launch approval exist.
- Authenticated allowed-tester route/API smoke with server-owned session/feed/usage/deletion/Creator locked states now has exact-command ready preflight, blocker/evidence record, PL-G2A reviewed harness route for feed/deletion/Creator locked server action surfaces, and PL-G2B blocked-no-approval harness smoke evidence. Deployed route/API execution remains unchecked / not-run / approval-gated until exact approval label `approved-fb-l3-allowed-tester-route-api-smoke`, sanitized output review, and operator-local env references are present.
- Actual public session Start smoke remains approval-gated.
- Approved Start-to-translation smoke now has exact-command ready preflight, FB-L4 blocker/evidence record, and PL-G3 blocked-no-approval execution gate record, but Start, live target lookup, bounded `liveChatMessages.list`, non-empty intake, Free Azure translation, UI feed confirmation, usage, stop reason, and source attribution evidence remain unchecked / not-run / approval-gated.
- Real provider target lookup, live target lookup, actual `liveChatMessages.list`, non-empty live comment intake, and real Azure provider execution remain approval-gated for the Free beta launch path.
- Production/custom deployed target freshness and Free beta route behavior now have exact-command ready preflight, FB-L5 blocker/evidence record, and PL-G4 blocked-no-approval execution gate record, but deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only route/API behavior, usage/deletion/Creator locked gates, and Start-to-translation gate evidence remain unchecked / not-run / approval-gated.
- Public launch gate decision now has exact-command ready preflight and blocker/evidence record, but release-owner approval to open limited public beta or flip public gate is absent, so public launch gate unchanged and public-release capable remains no.
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

## Latest PL-G1 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`.
- Existing FB-L2 ready preflight doc reviewed: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-pl-g1-remote-durable-enforcement-execution-contract.mjs`.
- Execution decision: remote-apply-and-deployed-smoke-completed. The required approval label `approved-fb-l2-remote-durable-enforcement-apply-and-smoke` was provided in-thread. Initial operator-local migration inspection stopped with sanitized result `PL-G1_SANITIZED_RESULT failed=migration-list-failed`; follow-up diagnostic reported `PL-G1_SANITIZED_DIAGNOSTIC category=blocked-supabase-link cli=present linkedMetadata=missing`.
- Sanitized local check after link restore: `PL-G1_SANITIZED_LOCAL_CHECK migrationList=passed linkedMetadata=present dryRun=reviewed-two-migrations-only`.
- Remote Supabase migration apply: completed. Sanitized apply result: `PL-G1_SANITIZED_APPLY result=completed`. Post-apply migration inspection: `PL-G1_SANITIZED_POST_APPLY migrationList=passed`.
- Deployed durable session/usage smoke completed for the approved `POST /api/comment-translator/session` status/start/stop boundary: `PL-G1_SANITIZED_SMOKE intent=status http=200 status=not-started stopReason=none`; `PL-G1_SANITIZED_SMOKE intent=start http=200 status=stopped stopReason=stream-unavailable`; `PL-G1_SANITIZED_SMOKE intent=stop http=200 status=stopped stopReason=user-stop`.
- Operator-local env references consumed for deployed smoke: `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN`, `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE`, and `COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE`; values were not recorded.
- Remote mutation outside the approved migration apply and deployed smoke: not-run / approval-gated. Raw Supabase output, env values, cookies, credential references, and target-private metadata were not pasted into docs, output, PR body, or handoff payload.
- Required PL-G1 outcome is satisfied for the approved FB-L2 execution boundary: reviewed durable session and usage authority for `comment_translator_sessions` and `comment_translator_usage_ledger_events` was applied, and deployed session status/start/stop behavior returned sanitized stop/status output.
- Free caps remain 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month. Missing/unreadable durable state must fail closed with sanitized stop/status output before Start or provider execution.
- Paid entitlement C1/C3, Stripe billing, and Creator paid limits were not mixed into PL-G1.
- Width checks skipped because PL-G1 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or runtime behavior change.
- Unchecked scope remains: authenticated allowed-tester route/API smoke beyond the approved PL-G1 status/start/stop boundary, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, Stripe live actions, billing setting mutation, production/custom deployed freshness, main promotion, limited public beta open, and public launch gate flip were not run.
- Residual risk: PL-G1 proves only the approved remote durable apply and deployed status/start/stop session boundary with sanitized stop reasons. It does not prove PL-G2 route/API surfaces, provider target lookup, live polling, Azure execution, production/custom deployed freshness beyond the provided target, limited public beta readiness, or public launch readiness.

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

## Latest PL-G2A Evidence

- Active evidence/preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2A_SERVER_ACTION_ROUTE_API_HARNESS.md`.
- Focused contract: `node scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs`.
- Reviewed harness route: `POST /api/comment-translator/free-beta/route-api-harness`.
- Existing safe route/harness check: no existing public/semi-public route was found for deployed allowed-tester cookie verification of `getCommentTranslatorRealCommentsFeedAction`, `requestCommentTranslatorDataDeletionAction`, `getCommentTranslatorCreatorLockedWaitlistAction`, and `recordCommentTranslatorCreatorLockedClickAction`; Next internal server action endpoint guessing remains forbidden.
- Harness gate: inert unless `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED` matches the approval label, `x-comment-translator-harness-approval` is present, and the private launch allowed-tester gate passes.
- Sanitized output is limited to action name, status label, count, unavailable reason, and pass/fail. Raw action payloads, cookie values, Authorization header values, browser storage, provider target metadata, liveChatId, raw comments, provider payloads, Stripe identifiers, and handoff payload expansion are not returned.
- Deployed harness execution remains not-run / approval-gated. Allowed-tester cookie/session validity, deployed target behavior, session Start, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, remote Supabase mutation/schema apply, Stripe actions, main promotion, limited public beta open, and public launch gate flip were not run.
- Paid entitlement C1/C3, Stripe billing, and Creator paid limits were not mixed into this Free beta harness.
- Width checks skipped because PL-G2A changes a server-only route, docs/task notes, and focused contract only; there is no visible UI/CSS/layout/copy change, rendered page change, browser storage change, or client layout change.
- Verification: RED `node scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs` failed on missing harness route, then passed after route/docs/task updates. Changed-files no-secret scan passed. `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed after local dependencies were restored with `npm ci`. `git diff --check` passed with CRLF normalization warnings only.

## Latest PL-G2B Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md`.
- Focused contract: `node scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs`.
- Execution result: blocked-no-approval. Same-thread ready preflight was reviewed through the FB-L3 ready preflight doc, but exact explicit approval, actual-output sanitized review, and operator-local env references were not complete in this thread.
- Required approval label for a later run: `approved-fb-l3-allowed-tester-route-api-smoke`.
- Later approved route boundary remains `POST /api/comment-translator/session` with `{"intent":"status"}` only plus `POST /api/comment-translator/free-beta/route-api-harness`.
- Later approved harness action surfaces remain `getCommentTranslatorRealCommentsFeedAction`, `requestCommentTranslatorDataDeletionAction`, `getCommentTranslatorCreatorLockedWaitlistAction`, and `recordCommentTranslatorCreatorLockedClickAction`.
- Allowed sanitized evidence shape remains command label, route/action name, HTTP status, session/feed/deletion/Creator locked status label, count, stop reason, unavailable reason, and pass/fail.
- Authenticated allowed-tester route/API smoke execution: not-run / approval-gated. Allowed-tester cookie/session validity, deployed route/API target behavior, status route response, and harness route response remain unchecked.
- Unchecked scope remains: authenticated allowed-tester route/API smoke execution, allowed-tester cookie/session validity, deployed route/API target behavior, status route response, harness route response, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, remote Supabase mutation/schema apply, deploy/upload, Stripe live actions, billing setting mutation, main promotion, limited public beta open, and public launch gate flip were not run.
- Residual risk: PL-G2 remains incomplete until a later same-thread approved operator-local run executes both the status route and PL-G2A harness route against the deployed allowed-tester boundary and records sanitized output only. Public-release capable remains no.
- Width checks skipped because PL-G2B changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client layout change.
- Verification: RED `node scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs` failed on missing PL-G2B evidence doc, then passed after docs/task updates. Changed-files no-secret scan passed for 8 changed files. `git diff --check` passed with CRLF normalization warnings only. Runtime/UI files were not changed, so `npm run lint`, `npx tsc --noEmit`, `npm run build`, and width checks were not run.

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

## Latest PL-G3 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md`.
- Existing FB-L4 ready preflight doc reviewed: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs`.
- Execution result: blocked-no-approval. Same-thread ready preflight was reviewed through the FB-L4 ready preflight doc, but exact explicit approval, actual-output sanitized review, and operator-local env references were not complete in this thread.
- Required approval label for a later run: `approved-fb-l4-start-to-translation-smoke`.
- Later approved boundary remains status route / session state precheck, explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` polling step, non-empty intake, Free Azure translation, UI feed / usage / stop reason / source attribution confirmation, and explicit Stop.
- Allowed sanitized evidence shape remains command label, route/action name, HTTP status, session state/status label, target presence label only, returned/eligible/translated/skipped/error count, polling interval label, usage count / Free cap label, stop reason, source attribution label, unavailable reason, and pass/fail.
- Start-to-translation smoke execution: not-run / approval-gated. Status precheck, explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` polling step, Free Azure translation, UI feed confirmation, usage, stop reason, source attribution, and Stop remain unchecked.
- Unchecked scope remains: Start-to-translation smoke execution, status route / session state precheck, explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` polling step, non-empty live comment intake, Free Azure translation, UI feed / usage / stop reason / source attribution confirmation, explicit Stop, provider target lookup, deployed target behavior, deploy/upload, remote Supabase mutation/schema apply, Stripe live actions, billing setting mutation, main promotion, limited public beta open, and public launch gate flip were not run.
- Residual risk: PL-G3 remains incomplete until a later same-thread approved operator-local run executes the exact FB-L4 Start-to-translation boundary and records sanitized output only. Public-release capable remains no.
- Width checks skipped because PL-G3 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client layout change.
- Verification: RED `node scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs` failed on missing PL-G3 evidence doc, then passed after docs/task updates. `node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs` passed after allowing the PL-G3 follow-up branch/files. Changed-files no-secret scan passed for 8 changed files. `git diff --check` passed with CRLF normalization warnings only. Runtime/UI files were not changed, so `npm run lint`, `npx tsc --noEmit`, `npm run build`, and width checks were not run.

## Latest FB-L5 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md`.
- Active ready preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs`.
- Ready preflight state: preflight-ready. Execution decision remains blocked-no-approval until the exact approval label `approved-fb-l5-production-custom-deployed-smoke` is provided in-thread.
- production/custom deployed smoke execution: not-run/approval-gated. Deployed target freshness, reviewed integration branch match, allowed tester route/UI reachability, status-only session API, usage/deletion/Creator locked gates, and Start-to-translation gate status remain not-run/approval-gated.
- FB-L2 remote durable enforcement remains not-run/approval-gated, and FB-L5 did not run remote Supabase migration apply or mutation.
- FB-L3 authenticated allowed-tester route/API smoke remains not-run/approval-gated unless separately approved; FB-L5 did not fold FB-L3 into its evidence.
- FB-L4 Start-to-translation smoke remains not-run/approval-gated unless separately approved; FB-L5 did not fold FB-L4 into its evidence.
- Exact approval-gated command sequence is documented for local deterministic baseline, reviewed integration branch head check, safe deployed version label comparison through `COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL`, deployed route reachability, authenticated status-only session API, allowed-tester browser route/UI confirmation, and optional approved server-owned action status harness.
- Free caps remain 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month. Missing/unreadable durable state must fail closed with sanitized stop/status output before Start or provider execution.
- FB-L5 does not prove actual deployed target freshness, allowed-tester cookie/session validity, deployed route/API target behavior, FB-L2 remote/deployed durable enforcement, FB-L3 route/API execution, FB-L4 Start-to-translation execution, actual Start, live target lookup, liveChatMessages.list, non-empty intake, Azure/OpenAI provider API execution, Paid entitlement C1/C3, Stripe billing, Creator paid limits, main promotion, or public launch readiness.
- Width checks skipped because FB-L5 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or runtime behavior change.
- Unchecked scope remains: production/custom deployed smoke execution, deployed target freshness, reviewed integration branch match on deployed target, allowed-tester cookie/session validity, allowed tester route/UI reachability, deployed status route/API behavior, deployed usage/deletion/Creator locked gate status, deployed Start-to-translation gate status, remote Supabase migration apply, remote Supabase mutation, deployed durable session/usage smoke, authenticated allowed-tester route/API smoke execution, Start-to-translation smoke execution, provider target lookup, live target lookup, liveChatMessages.list, non-empty live comment intake, Azure/OpenAI provider API execution, deploy/upload, Stripe live actions, billing setting mutation, main promotion, and public launch gate flip were not run.
- Verification: RED `node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs` failed on missing FB-L5 evidence doc, then passed after docs/task updates. Changed-files no-secret scan passed for 7 changed files. `git diff --check` passed with CRLF normalization warnings only. App runtime/UI files were not changed; this slice changes docs/task notes and the focused contract script only, so `npm run lint`, `npx tsc --noEmit`, and `npm run build` were not run.

## Latest PL-G4 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md`.
- Existing FB-L5 ready preflight doc reviewed: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs`.
- Execution result: blocked-no-approval. Same-thread ready preflight was reviewed through the FB-L5 ready preflight doc, but exact explicit approval, actual-output sanitized review, and operator-local env references were not complete in this thread.
- Required approval label for a later run: `approved-fb-l5-production-custom-deployed-smoke`.
- Later approved boundary remains deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gate status, and Start-to-translation gate status.
- Allowed sanitized evidence shape remains command label, route/action name, HTTP status, safe deployed target label, safe deployment/version label, reviewed integration branch label, visible state label, session/feed/usage/deletion/Creator locked status label, Start-to-translation gate status label, count, stop reason, unavailable reason, source attribution label, and pass/fail.
- Production/custom deployed smoke execution: not-run / approval-gated. Deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gate status, and Start-to-translation gate status remain unchecked.
- Unchecked scope remains: production/custom deployed smoke execution, deployed target freshness, reviewed integration branch match on deployed target, allowed-tester cookie/session validity, allowed-tester route/UI reachability, status-only session API, deployed usage/deletion/Creator locked gate status, deployed Start-to-translation gate status, remote Supabase migration apply, remote Supabase mutation, deployed durable session/usage smoke, authenticated allowed-tester route/API smoke execution, Start-to-translation smoke execution, provider target lookup, live target lookup, `liveChatMessages.list`, non-empty live comment intake, Azure/OpenAI provider API execution, deploy/upload, Stripe live actions, billing setting mutation, Paid entitlement C1/C3, Creator paid limits, main promotion, limited public beta open, and public launch gate flip were not run.
- Residual risk: PL-G4 remains incomplete until a later same-thread approved operator-local run executes the exact FB-L5 production/custom deployed smoke boundary and records sanitized output only. Public-release capable remains no.
- Width checks skipped because PL-G4 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client layout change.
- Verification: RED `node scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs` failed on missing PL-G4 evidence doc, then passed after docs/task updates. Existing FB-L5 contract `node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs` also passed after allowing the PL-G4 follow-up branch/files. Changed-files no-secret scan passed for 8 changed files. `git diff --check` passed with CRLF normalization warnings only. Runtime/UI files were not changed, so `npm run lint`, `npx tsc --noEmit`, `npm run build`, and width checks were not run.

## Latest FB-L6 Evidence

- Active evidence/blocker doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md`.
- Active ready preflight doc: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md`.
- Focused contract: `node scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs`.
- Decision result: keep blocked / blocked-no-approval. Public launch gate unchanged. Public-release capable: no.
- Decision options are limited to `keep blocked`, `open limited public beta`, and `flip public gate`.
- Exact keep-blocked approval label for a later release-owner decision record: `approved-fb-l6-keep-blocked-launch-gate-decision`. Open/flip labels are documented in the ready preflight but were not approved in this thread.
- Release-owner approval to open limited public beta: not-run / approval-gated. Release-owner approval to flip public gate: not-run / approval-gated.
- FB-L2 remote durable enforcement remains not-run / approval-gated, and FB-L6 did not run remote Supabase migration apply or mutation.
- FB-L3 allowed-tester route/API smoke remains not-run / approval-gated, and FB-L6 did not run authenticated route/API smoke.
- FB-L4 Start-to-translation smoke remains not-run / approval-gated, and FB-L6 did not run session Start, live target lookup, `liveChatMessages.list`, non-empty intake, Free Azure translation, UI feed confirmation, or Stop.
- FB-L5 production/custom deployed smoke remains not-run / approval-gated, and FB-L6 did not run deployed target freshness, route/UI reachability, or deployed status route/API checks.
- Free caps remain 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month. Missing/unreadable durable state must fail closed with sanitized stop/status output before Start or provider execution.
- Paid entitlement C1/C3, Stripe billing, and Creator paid limits are excluded from the Free beta launch decision and were not mixed into FB-L6.
- Width checks skipped because FB-L6 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or runtime behavior change.
- Unchecked scope remains: release-owner approval to open limited public beta, release-owner approval to flip public gate, public launch gate flip, limited public beta open, FB-L2 remote durable enforcement execution, FB-L3 allowed-tester route/API smoke execution, FB-L4 Start-to-translation smoke execution, FB-L5 production/custom deployed smoke execution, deploy/upload, remote Supabase migration apply, remote Supabase mutation, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, Stripe live actions, billing setting mutation, and main promotion were not run.
- Verification: RED `node scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs` failed on missing FB-L6 evidence doc, then passed after docs/task updates. Changed-files no-secret scan passed for 7 changed files. `git diff --check` passed with CRLF normalization warnings only. Initial `npm run lint` / `npx tsc --noEmit` failed because local dependencies were missing in this fresh worktree; after `npm ci`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. App runtime/UI files were not changed; this slice changes docs/task notes and the focused contract script only.

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
- Free beta PL-G2B allowed-tester route/API harness smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md`
- Free beta PL-G3 Start-to-translation smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md`
- Free beta PL-G4 production/custom deployed smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md`
- Free beta remote durable enforcement ready preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md`
- Free beta production/custom deployed smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md`
- Free beta production/custom deployed smoke ready preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`
- Free beta public launch gate decision evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md`
- Free beta public launch gate decision ready preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md`
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
