# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯、古い next-session prompt は `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential / OAuth token / authorization code / owner id / provider target metadata / liveChatId は表示・要求・保存しない。
- Provider target metadata and liveChatId are consumed only through operator-local env / server-only boundaries and must not appear in output, docs, PR bodies, browser storage, or handoff payloads.

## Current Branch

- Current branch: `codex/public-launch-preview-feed-ux`.
- Base: latest `origin/codex/comment-translator-free-public-beta-integration`.
- Scope: PPF-1/PPF-2 preview feed auto-refresh/newest-first, plus PPF-3 minimum browser-local timestamp display with explicit timezone label.
- Archive snapshot before this cleanup: `docs/archive/task-board-pre-2026-06-24-pl-g3-post-557-cleanup.md`.
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
- `P0-0` and `F1` through `F15` are complete on the Free beta collection branch as implementation/readiness work.
- Next PRs should target `codex/comment-translator-free-public-beta-integration` until Free beta public usability evidence is accepted.
- After Free beta public usability is accepted, promote `codex/comment-translator-free-public-beta-integration` to `main` through a separate approval-gated promotion PR.
- Creator closed beta can start after the Free path is proven, or use a later dedicated collection branch if the release owner wants separation.

## Current Free Public Beta State

### Completed Collection Work

| Area | State | Reference |
| --- | --- | --- |
| YouTube OAuth Integration Roadmap Task 1-10 | Complete on `codex/comment-translator-youtube-oauth-integration` | `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_INTEGRATION_FINAL_QA_PROMOTION_READINESS.md` |
| Free Public Beta P0-0 and F1-F15 | Complete as local/server-only implementation and readiness foundation | `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md` |

### Current Focus

| ID | Task | Current state |
| --- | --- | --- |
| FB-L1 | Free beta public usability preflight | complete |
| FB-L2 / PL-G1 | Remote durable enforcement | completed with approved remote durable enforcement and deployed fail-closed evidence |
| FB-L3 / PL-G2 | Allowed-tester route/API smoke | completed through PL-G2K approved sanitized route/API harness smoke |
| FB-L4 / PL-G3 | Start-to-translation smoke | core path passed: explicit Start, target lookup, bounded polling, Free Azure translation, durable feed persist/readback, browser-visible feed/source attribution after manual refresh |
| FB-L5 / PL-G4 | Production/custom deployed smoke | preflight complete / execution pending / approval-gated |
| FB-L6 / PL-G5 | Public launch gate decision | preflight complete / release-owner approval pending / keep blocked |

### Public Launch Remaining Gates

These are the remaining gates before Free public beta can be opened. Each execution item requires same-thread ready preflight, sanitized output review, and exact explicit approval before execution.

| ID | Gate | Current state |
| --- | --- | --- |
| PL-G1 | Remote durable enforcement | complete |
| PL-G2 | Allowed-tester route/API smoke | complete |
| PL-G3 | Start-to-translation smoke | core evidence passed; pre-public preview follow-ups pending; public-release capable no |
| PL-G4 | Production/custom deployed smoke | not-run / approval-gated |
| PL-G5 | Release-owner public launch decision | keep blocked / blocked-no-approval |
| PL-G6 | Public access change / promotion operation | not-run / approval-gated |

### Pre-Public Preview Follow-Ups

| ID | Follow-up | Current state |
| --- | --- | --- |
| PPF-1 | Preview feed should update comments automatically on a safe periodic cadence during an active session, without requiring manual comment refresh. Keep manual refresh as a fallback/control, and stop polling when the session is inactive or stopped. | implemented locally in `codex/public-launch-preview-feed-ux`; local deterministic verification passed |
| PPF-2 | Preview feed ordering should show newest comments at the top. Current observed ordering is oldest-first, so reverse the display/read ordering before public launch. | implemented locally in `codex/public-launch-preview-feed-ux`; local deterministic verification passed |
| PPF-3 | Comment timestamps should support a user-facing timezone display setting in a future shared settings/account preference slice, so future tools can reuse the same display preference instead of adding tool-specific timezone controls. Keep rate-limit and quota reset authority on UTC unless explicitly changed; this item is about comment timestamp display convenience. | minimum scope implemented locally: browser-local timestamp display with explicit timezone label; no persistent timezone preference added |

### Public Launch Next Flow

Use this order for the remaining Free public beta work unless the release owner explicitly changes priorities.

| Step | Work | Purpose | Approval / verification boundary |
| --- | --- | --- | --- |
| 1 | Implement PPF-1 and PPF-2 together | Make the preview usable without manual refresh and show newest comments first. Keep manual refresh as fallback and stop auto-refresh when the session is inactive or stopped. | Local UI/action contracts plus width checks. Do not run Start, live provider polling, translation provider execution, deploy/upload, or public access changes in this implementation slice. |
| 2 | Decide timestamp display scope | Prefer browser-local comment timestamp display with an explicit timezone label for the public beta minimum. If a persistent timezone choice is pulled forward, implement it as a shared settings/account preference that future tools can read, not as a Comment Translator-only setting. | Local formatting/unit contract and width checks only. Runtime quota and rate-limit reset authority stays UTC. |
| 3 | Run an approved browser-visible preview retest | After PPF-1/PPF-2 are merged, prove in the operator's real browser that Start/Stop works, comments can be fetched and translated, newest comments appear first, and the feed updates without pressing manual refresh. | Requires exact same-thread approval because it includes Start, live target lookup, `liveChatMessages.list`, Free provider execution, browser-visible confirmation, Stop, and sanitized labels/counts only. |
| 4 | Run PL-G4 production/custom deployed smoke | Confirm the production/custom deployed target matches the reviewed integration branch and allowed testers can reach the gated UI/API states before public access changes. | Requires exact same-thread approval. If live Start-to-translation is included, the approval must explicitly include Start, provider polling, translation, browser-visible confirmation, and Stop. |
| 5 | Record PL-G5 release-owner decision | Choose `keep blocked`, `open limited public beta`, or `flip public gate` after reviewing remaining risks and evidence. | Requires release-owner approval. Missing evidence must be explicitly accepted or completed. |
| 6 | Execute PL-G6 public access change / promotion | Only after PL-G5 approval, perform the reviewed public access change and any required promotion operation. | Separate approval-gated operation. Do not combine with feature work, PL-G4 smoke, Stripe work, or unrelated cleanup. |

Current recommended next PR: implement PPF-1 and PPF-2 together, and include browser-local timestamp display with timezone label only if the implementation remains tightly scoped to the preview feed UI.

## Latest Sanitized Evidence Summary

- PR #557 durable safe-feed persistence diagnostics are merged into `origin/codex/comment-translator-free-public-beta-integration`.
- Initial post-#557 F10 retest isolated the durable feed persist failure to remote durable feed snapshot table shape missing or unavailable, not provider intake/translation failure.
- Approved remote table-shape confirmation applied the reviewed `supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql` migration only after the table was confirmed missing. Post-apply table shape returned present/all-present/shape-ready labels.
- Post-migration F10 retest after operator token refresh passed with provider/polling/translation labels, `durableFeedPersistResultLabel durable-feed-persisted`, `durableFeedReadbackLabel readback-ready`, and `feedDisplayRowCount 4`.
- Browser-visible confirmation retest passed after manual comment refresh in the operator's real browser: `browserFeedVisibleLabel yes`, `browserFeedRowCount 5`, and `browserSourceAttributionVisibleLabel yes`.
- Before this PPF branch, UI review found that the preview feed was refreshed only by the manual comment refresh control. This branch adds active-session periodic refresh while keeping the manual refresh control as fallback.
- F9 Real comments UI wiring remains the server-owned safe feed boundary. This PPF slice keeps that boundary and changes only preview refresh cadence, display ordering, and timestamp presentation.
- Raw stdout/stderr, raw response bodies, secrets, tokens, cookies, OAuth values, Authorization headers, provider target metadata, liveChatId, owner/session identifiers, raw comments, raw provider payloads, browser storage payloads, URL query values, handoff payloads, quota values, raw provider error bodies/messages/reasons, provider target values, and screenshots containing raw comments were not recorded in docs.

## Current Local Verification

- `node scripts/comment-translator-public-preview-feed-ux-contract.mjs`: passed. Covers PPF-1 active-session 15s safe auto-refresh, manual refresh fallback, PPF-2 newest-first ordering, PPF-3 browser-local timestamp with timezone label, no persistent timezone preference, and public gate unchanged.
- `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`: passed. Confirms F9 server-owned safe feed boundary remains intact.
- `node scripts/local-preference-adapter-contract.mjs`: passed. Confirms no local preference storage expansion for timezone in this minimum slice.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed. Existing warnings observed: Next.js `middleware` convention deprecation, static export RSC alias skip for server-runtime build, and webpack cache big-string serialization warnings.
- `git diff --check`: passed with Windows LF-to-CRLF normalization warnings only.
- Changed-files no-secret scan: passed for 5 changed files.
- Width checks via local dev server `http://127.0.0.1:3218/tools/comment-translator/`: `390 / 820 / 1024 / 1280 / 1366px` had horizontal overflow `0`, framework overlay absent, and console error/warn count `0`. Local route rendered the private-launch fallback because no safe authenticated allowed-tester session was available; preview dock active-session visual confirmation remains gated for the approved browser-visible retest.

Detailed PL-G3 evidence remains in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md`. The pre-cleanup task-board snapshot is archived at `docs/archive/task-board-pre-2026-06-24-pl-g3-post-557-cleanup.md`.

## Current Blockers / Residual Risks

- Public-release capable remains no until PPF-1/PPF-2 are implemented and verified, PL-G4 production/custom deployed smoke passes or is explicitly accepted as missing, PL-G5 release-owner approval is recorded, and PL-G6 public access change is separately approved and executed.
- The browser-visible PL-G3 feed confirmation is valid only after manual comment refresh in the current UI. It does not prove automatic realtime or periodic feed refresh.
- Timestamp display currently needs a future user-facing timezone decision; runtime quota enforcement remains UTC-based.
- No deploy/upload, OAuth flow, token refresh, Stripe action, public access change, main promotion, PL-G4, PL-G5, PL-G6, or launch gate flip was run in this cleanup slice.

## Later Work

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

## Account Limits / Entitlement Control

- Per-account judgment is server-owned: authenticated caller authorization binds work to the owner account, and browser-readable output must not expose owner ids, provider channel ids, provider target metadata, liveChatId, OAuth values, tokens, or billing identifiers.
- Free public beta limit authority is the Free entitlement baseline plus durable usage/session state. Current Free caps: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month.
- Enforcement happens before Start, while the session is active, during status/heartbeat/feed usage checks, and before provider translation execution. If durable usage/session state is unavailable or unreadable, the safe behavior is fail closed with sanitized stop/status output.
- Free beta usage accounting uses a fixed UTC quota day for enforcement and ledger accounting. UI/docs may separately explain local-day perception, but runtime caps and durable aggregation stay UTC-based until an explicitly approved policy change.
- Chargeable session elapsed is bounded by the active heartbeat window and Free session cap. If heartbeat stops and Stop/cleanup happens later, the ledger records the chargeable end of use rather than the late cleanup time, preventing an abandoned session from consuming the next UTC day.
- Paid access after C1/C3 should be controlled by signed Stripe webhook evidence, durable paid entitlement rows, paid usage counters, monthly reset state, and server-owned fallback/stop reasons. Until that durable paid authority is implemented and verified, incomplete or unreadable paid state must degrade safely to Free or paid-inactive behavior, not public paid limits.

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
