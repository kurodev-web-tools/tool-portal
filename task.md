# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR body か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential は要求・表示・保存しない。
- OAuth access token / refresh token / authorization code value は client component、fixture、docs、PR body、localStorage、IndexedDB、sessionStorage に出さない。
- owner user id value / provider channel id value / service_role key value は表示・要求・保存しない。必要な場合も reference-only / existence-only / sanitized metadata-only に閉じる。
- provider target metadata / liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さない。

## Active Priority

1. Kuro Live Comment Translator public release roadmap
   - status: preview runtime-smoke-to-operator-UI chain is complete through Task 7, Public Release Roadmap Task 1-8 are merged, and PR #411 (`[codex] Add server-owned usage quota budget ledger foundation`) merge commit `5dbe3397145dbc49c2bcc65124e7cf1ff152c73c` is contained in `origin/codex/comment-translator-preview`. GitHub PR metadata was also checked: PR #411 is `MERGED`, base `codex/comment-translator-preview`, head `codex/comment-translator-usage-quota-budget-ledger-post-pr410`, merged at `2026-06-10T21:01:24Z`; check rollup was Cloudflare Pages `FAILURE` and Workers Builds `SUCCESS`.
   - current PR scope: Public Release Roadmap Task 9, Filtering and language policy runtime.
   - final goal: all tasks in `Public Release Roadmap` are completed, verified, merged, and any required deployed/live smoke evidence is recorded with sanitized output. At that point the comment translator is considered public-release capable.
   - canonical public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`.
   - inspected surfaces for Task 9: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`, `lib/comment-translator-youtube-live-comment-intake-pipeline.ts`, `lib/comment-translator-youtube-input-boundary.ts`, `lib/comment-translator-session-runtime.ts`, `lib/comment-translator-usage-ledger-runtime.ts`, `app/api/comment-translator/session/route.ts`, `app/tools/comment-translator/actions.ts`, `lib/comment-translator-youtube-runtime-foundation.ts`, `lib/comment-translator-youtube-api-adapter.ts`, `lib/comment-translator-provider-boundary.ts`, `lib/comment-translator.ts`, and relevant comment-translator contract scripts.
   - completed in this PR: added `lib/comment-translator-language-policy-runtime.ts` as a server-only filtering/language policy runtime, added `scripts/comment-translator-filter-language-policy-runtime-contract.mjs`, and wired `lib/comment-translator-youtube-live-comment-intake-pipeline.ts` to apply source/target selection, same-language rejection, dominant-language classification, low-confidence skipping, and pre-translation skip gates before provider requests are built. Initial public source candidates are JA / EN / KR / CN, initial target candidates are JA / EN, Spanish and all-language auto mode remain excluded unless explicitly approved, and cache/dedupe material excludes token, cursor, provider target, owner, Authorization header, service-role, browser-local handoff, `liveChatId`, provider channel, raw provider target metadata, and raw text material.
   - unchanged in this PR: no live/provider execution, provider target lookup, `liveChatId` handling, billing enforcement, provider-usage charging, browser storage, handoff payload, remote Supabase mutation, schema migration, route/action client payload expansion, visible UI layout/copy change, or raw comment logging was added.
   - verification for this PR: `npm ci --prefer-offline` succeeded; `node scripts/comment-translator-filter-language-policy-runtime-contract.mjs`, `node scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs`, `node scripts/comment-translator-provider-boundary-contract.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. UI width checks were skipped because this slice made no visible layout or text change.
   - width verification: UI / rendered text / CSS は変更していないため `390 / 820 / 1024 / 1280 / 1366px` の幅別確認は対象外。
   - residual risk: the Task 9 language classifier is a deterministic initial-release heuristic, not a third-party language detection model. Durable persisted dedupe/cache storage, bounded polling execution, translation provider execution, provider request/AI usage recording, UI selection enforcement, admin/export surfaces, and live/deployed smoke remain separate later tasks.
   - next PR candidate: Public Release Roadmap Task 10, Bounded polling session runtime.

## Public Release Roadmap

Use one Codex thread, one feature branch, and one PR per task. Do not create a PR for a task unless that task's completion criteria are satisfied and verification has been attempted, except when the user explicitly approves a readiness/blocker PR while an external wait blocks execution.

1. Public readiness roadmap and task-board refresh
   - Goal: make `task.md` the public-release source of truth after the preview Task 7 endpoint.
   - Scope: docs/task-board only. No runtime, UI, provider, storage, quota, billing, or deployment changes.
   - Completion criteria: sources reviewed, old completed preview task list removed from active board, public-release tasks listed as 1 task / 1 PR, retention decision recorded, next-session prompt updated.
   - Verification: `git diff --check` and targeted markdown/content inspection.

2. Public requirements consolidation
   - Goal: consolidate the attached API/limits draft with the existing future notes into one canonical public-release requirements document.
   - Scope: docs only. Prefer `docs/active` for the current public-release requirements and move superseded drafts to `docs/archive` only when their content is fully represented elsewhere.
   - Completion criteria: canonical requirements cover free/per-session limits, paid-plan release path, start/stop semantics, stop conditions, provider quota policy, AI cost controls, source/target language policy, user usage display, admin metrics, sensitive-data boundaries, and initial-release exclusions.
   - Verification: `git diff --check` and targeted markdown/content inspection.
   - Fixed initial decisions: free limits, paid release path, YouTube-first scope, raw-text logging default, account integration route, and JA/EN target support are recorded in `Initial Release Decisions`.
   - Status: complete in current Task 2 PR via `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`.

3. Public legal, privacy, and product-copy recheck
   - Goal: confirm existing legal pages and visible product copy are accurate for the public comment translator.
   - Scope: `/terms`, `/privacy`, `/legal/tokushoho`, footer links, `/tools/comment-translator` copy, and relevant account/integration copy.
   - Completion criteria: copy states the provider/API/AI translation behavior, usage limits, no background monitoring by connection alone, no token/client-storage exposure, data retention/logging policy, contact/support path, and paid-plan status if shown.
   - Verification: relevant route render checks, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`; width checks only if visible layout changes.
   - Status: complete in current Task 3 PR. Footer links required no code change after inspection.

4. Account integrations entry point
   - Goal: provide the operator-facing path for connecting and reviewing YouTube integration state outside the translator tool.
   - Scope: `/account/integrations` route or equivalent account settings entry, sanitized YouTube connection status, safe start/connect/reconnect/disconnect affordances.
   - Completion criteria: UI shows connection readiness without token, owner id, provider channel id, liveChatId, Authorization header, or provider target metadata; no background monitoring starts from connection alone.
   - Verification: dedicated UI/action contracts, lint, typecheck, build, `git diff --check`, and width checks at `390 / 820 / 1024 / 1280 / 1366px`.
   - Status: complete in current Task 4 PR. Runtime OAuth start, token renewal, disconnect/revocation, provider execution, quota, billing, storage, and handoff payload changes were intentionally not added.

5. Server-only token refresh and reconnect status
   - Goal: handle expired YouTube access tokens through server-only refresh/reconnect boundaries.
   - Scope: token refresh runtime, expired/refresh-failed/reconnect-required sanitized states, focused contract coverage.
   - Completion criteria: token values remain server-only; refresh failures do not leak provider body or credentials; client receives only sanitized status and reconnect guidance.
   - Verification: focused server contract/tests, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 5 PR. Live/provider refresh execution, provider target lookup, quota, billing, browser storage, handoff payload, schema migration, and remote Supabase mutation were intentionally not added.

6. Server-only disconnect and revocation runtime
   - Goal: support user-initiated provider disconnect with safe server cleanup and revocation behavior.
   - Scope: revocation/disconnect route or action, server cleanup, sanitized status transitions, audit-safe event shape.
   - Completion criteria: no token values in client/docs/log output; repeated disconnect is idempotent or safely reported; revoked credentials cannot be used by translator start.
   - Verification: focused server contract/tests, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 6 PR. Live/provider revocation calls, provider target lookup, quota, billing, browser storage, handoff payload, schema migration, and remote Supabase mutation were intentionally not added.

7. Translation session model and start/stop contract
   - Goal: define and implement the server-owned session lifecycle used when a user presses Start on `/tools/comment-translator`.
   - Scope: one active session per user, free-plan time caps, heartbeat/timeout semantics, explicit stop reasons, and session state returned to UI.
   - Completion criteria: API/provider/AI usage begins only after explicit Start; session stops on user stop, stream end, browser close/disconnect, missing heartbeat, auth failure, quota/budget stop, session limit, or terminal provider error.
   - Verification: focused session contracts/tests, lint, typecheck, build, `git diff --check`; UI width checks if visible controls change.
   - Status: complete in current Task 7 PR. Live/provider execution, provider target lookup, quota write, billing enforcement, browser storage, handoff payload, remote Supabase mutation, schema migration, and visible UI changes were intentionally not added.

8. Usage, quota, and budget ledger foundation
   - Goal: record usage needed to enforce public limits and protect shared service resources.
   - Scope: per-user daily/session minutes, plan entitlement references, provider request estimates, AI messages/chars/cost estimates, quota/budget stop events, admin-safe aggregate metrics.
   - Completion criteria: records are server-owned and sanitized; Free/Paid limits can be enforced from server-owned entitlement state; no provider identifiers or token values in client-readable payloads; no paid prioritization or provider-usage charging unless separately scoped.
   - Verification: schema/contract/tests as applicable, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 8 PR. Ledger/admin/client output remains sanitized metadata only, and no durable schema, remote mutation, provider lookup, billing enforcement, paid prioritization, provider-usage charging, browser storage, handoff payload, or visible UI change was added.

9. Filtering and language policy runtime
   - Goal: reduce provider and AI cost before translation execution.
   - Scope: source language selection, target language selection, same-language prevention, skip emoji-only, URL-only, symbol-only, duplicate, too-short, target-language, unselected-source-language, and low-confidence comments; classify mixed comments by dominant language.
   - Completion criteria: initial source candidates are JA / EN / KR / CN; initial target candidates include JA / EN; source and target cannot be the same; Spanish and all-language auto mode remain out of initial release unless approved; cache/dedupe keys exclude token/cursor/provider identifiers.
   - Verification: focused unit/contracts for filter cases, lint, typecheck, build, `git diff --check`.

10. Bounded polling session runtime
   - Goal: run YouTube Live Chat polling as a bounded server session rather than a broad uncontrolled loop.
   - Scope: target lookup once at session start, `liveChatMessages.list`, `pollingIntervalMillis` compliance, minimum interval, empty-chat backoff, retry caps, terminal stop states.
   - Completion criteria: no polling faster than provider response; liveChatId stays server-only; no browser storage or handoff payload expansion; execution is gated by explicit operator approval when live/provider calls are involved.
   - Verification: contracts/tests for scheduling and stop behavior, lint, typecheck, build, `git diff --check`; live/provider smoke only after same-thread preflight, sanitized output review, and explicit approval.

11. Translation provider execution integration
   - Goal: connect provider-safe live comments to actual translation execution under server-only controls.
   - Scope: batching, dedupe/cache, per-minute message caps, retry caps, provider error classes, and usage recording.
   - Completion criteria: only eligible comments are sent; raw provider credentials and YouTube identifiers are excluded; lower-priority comments are skipped under load instead of queued indefinitely.
   - Verification: focused provider/session contracts, lint, typecheck, build, `git diff --check`; live/provider execution only with explicit approval.

12. Public operator UI start/stop and usage display
   - Goal: expose the public-session controls and status needed by stream operators.
   - Scope: Start/Stop, current elapsed time, daily used/remaining time, active/stopped state, stop reason, provider connection state, and reconnect guidance.
   - Completion criteria: UI never displays token, owner user id, provider channel id, liveChatId, service_role key, Authorization header, or provider target metadata; no client storage expansion; copy matches approved public requirements.
   - Verification: UI/action contracts, lint, typecheck, build, `git diff --check`, and `/tools/comment-translator` width checks at `390 / 820 / 1024 / 1280 / 1366px`.

13. Admin and operational visibility
   - Goal: give the operator/admin enough sanitized visibility to run the public service safely.
   - Scope: active sessions, per-user minutes, YouTube/Twitch request estimates, AI messages/chars/cost, provider/translation errors, quota/budget stops, heartbeat timeouts.
   - Completion criteria: admin-visible data is aggregate or reference-only as appropriate; no credential values or provider target ids are exposed; export/log surfaces follow the same sanitization boundary.
   - Verification: focused contracts/tests, lint, typecheck, build, `git diff --check`; width checks if an admin UI is added.

14. Public deployment and live-smoke runbook
   - Goal: define and prove the release execution steps without leaking sensitive values.
   - Scope: operator-local env checklist, safe command order, sanitized output review checklist, deployed URL smoke checklist, rollback notes.
   - Completion criteria: live/provider smoke commands are documented as approval-gated; runbook avoids token/id/header values; deployed smoke evidence is sanitized and reproducible.
   - Verification: docs inspection, relevant smoke scripts/contracts, `git diff --check`; actual live/provider execution only after same-thread preflight, sanitized output review, and explicit approval.

15. Stripe paid-plan integration
   - Goal: connect the already-proven public tool to paid-plan purchase/upgrade flow after the core public-release functionality is otherwise ready.
   - Scope: Stripe checkout/customer/subscription or payment-link flow, plan entitlement sync, upgrade/downgrade/cancel states, paid limit activation, account billing entry points, and safe webhook handling.
   - Completion criteria: Free plan remains permanently available; paid upgrade path is visible before/at public launch; paid entitlement changes server-owned limits without exposing Stripe secrets or provider credentials; failed/expired/canceled payment states degrade to safe Free or inactive paid status.
   - Verification: Stripe-focused contract/tests, webhook signature handling tests where applicable, lint, typecheck, build, `git diff --check`, and billing/account UI width checks if visible UI changes.

16. Public release final QA and launch gate
   - Goal: determine that all roadmap tasks are complete and the tool can be made public.
   - Scope: final local/deployed verification, legal/copy review, no-secret scan, width checks, account/integration flow, session limits, start/stop, disconnect/reconnect, quota/budget stops, and rollback readiness.
   - Completion criteria: every prior roadmap task is merged; required checks pass or have documented accepted risk; deployed smoke is recorded with sanitized evidence; `task.md` says public-release capable.
   - Verification: full release checklist, `npm run lint`, `npx tsc --noEmit`, `npm run build`, relevant contracts/tests, `git diff --check`, deployed route checks, and width checks at `390 / 820 / 1024 / 1280 / 1366px`.

## Explicit Initial-Release Exclusions

- Background provider monitoring after account connection.
- Automatic session start when a connected user begins streaming.
- Multiple concurrent streams per user.
- User-provided Google Cloud project or OAuth client.
- Manual channel ID entry as the default flow.
- Unlimited polling or broad polling loops.
- Provider usage charging and paid-priority scheduling.
- Translation of all languages by default.
- Client storage of tokens, provider identifiers, liveChatId, owner user id, provider channel id, service_role key, Authorization header, or provider target metadata.
- Delayed translation queue for skipped comments.
- Twitch runtime before YouTube public path is proven, unless separately approved.

## Initial Release Decisions

These decisions are fixed for the current public-release roadmap unless the user explicitly changes them in a later task:

- Free plan limits: initial target is `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`.
- Paid plan: Free and Paid plan concepts, limits, and server-owned entitlement enforcement should be part of the public-release path. Stripe integration is intentionally placed as the last implementation task after the core tool is otherwise release-ready, so public launch can include an upgrade path without letting billing shape earlier runtime boundaries.
- Source languages: source means translation input language. Initial selectable source languages are JA / EN / KR / CN.
- Target languages: target means translation output language. Initial selectable target languages include JA / EN because the tool portal itself supports JA / EN.
- Language selection rule: source and target cannot be the same. UI and server validation must reject same-language pairs.
- Provider scope: YouTube ships first; Twitch remains future unless explicitly pulled into public-release scope.
- Raw text logging: disabled by default; diagnostics are short-lived and sanitized.
- Account path: `/account/integrations` is the preferred provider settings entry.

## Thread And PR Handoff Rules

- Start each roadmap task in a fresh Codex thread and fresh worktree / feature branch from `origin/codex/comment-translator-preview` after confirming the previous task PR is merged.
- At thread start, run `git fetch origin --prune`, read `AGENTS.md` and `task.md`, and verify the latest merged PR commit is in `origin/codex/comment-translator-preview`.
- For each task, first identify whether the task is documentation, implementation, execution, or evidence-only.
- If the task is live/provider execution, confirm same-thread / operator-local same-command-process ready preflight, sanitized output review, and explicit in-thread approval before running provider-affecting commands.
- If the task completes and verification passes, update `task.md`, commit, push, and create a draft PR targeting `codex/comment-translator-preview`.
- If an external wait blocks execution and the user explicitly approves a readiness/blocker PR, record the incomplete completion criteria and blocker evidence in `task.md`, verify, commit, push, and create a draft PR targeting `codex/comment-translator-preview`.
- If the task does not complete and no readiness/blocker PR is approved, do not commit, push, or create a PR. Reply with: `blocked reason`, `attempted command or inspected file`, `why completion criteria are not met`, `what approval/evidence/implementation is missing`, and `next safe action`.

## Verification Baseline

- Docs/task-board only:
  - `git diff --check`
  - targeted markdown/content inspection
- Runtime or code changes:
  - relevant contract script(s)
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `git diff --check`
- UI changes:
  - relevant UI/action contract(s)
  - `/tools/comment-translator` width checks at `390 / 820 / 1024 / 1280 / 1366px`
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

## Next Session Prompt

```text
D:/V_streamer_tools の Kuro Live Comment Translator public release roadmap を続けます。

重要:
- 最初に必ず `git fetch origin --prune` を実行してください。
- `AGENTS.md` と `task.md` を読んでください。
- root checkout / main では作業しないでください。
- 作業先は fresh worktree / feature branch にしてください。
- secret / token / OAuth access token / refresh token / authorization code / owner user id value / provider channel id value / liveChatId value / service_role key value / Authorization header value は表示・要求・保存しないでください。
- provider target metadata や liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さないでください。
- live/provider execution は、same-thread / operator-local same-command-process ready preflight、sanitized output review、explicit in-thread approval が揃うまで実行しないでください。
- この prompt は live/provider execution 承認ではありません。

Merge gate:
- この Task 9 PR `[codex] Add comment translator filtering language policy runtime` が merge 済みであることを確認してください。
- gh が使える場合は Task 9 PR の state / mergedAt / mergeCommit / baseRefName / headRefName / statusCheckRollup を確認してください。
- gh が `HTTP 401: Requires authentication` になる場合は、Task 9 PR の merge commit が `origin/codex/comment-translator-preview` に含まれることを Git で確認し、それを主 evidence にしてください。認証 token の値は要求・表示しないでください。

現在地:
- Preview roadmap Task 1-7 は完了済み。Task 7 Operator UI flow まで merge 済みです。
- Public Release Roadmap Task 1-9 は完了済みです。
- Task 2 で `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md` が canonical requirements doc として追加され、Task 3 で legal/privacy/product/account visible copy がその requirements と整合し、Task 4 で `/account/integrations` の sanitized YouTube connection readiness entry と safe prepared connect/reconnect/disconnect affordances が追加され、Task 5 で expired / refresh-failed / reconnect-required の server-only sanitized boundary が追加され、Task 6 で user-initiated disconnect の server-only cleanup / revocation boundary と sanitized status transition が追加され、Task 7 で server-owned translation session start/stop contract が追加され、Task 8 で server-owned usage/quota/budget ledger foundation が追加されています。
- Task 9 で server-owned filtering/language policy runtime が追加され、source/target selection、same-language prevention、dominant-language classification、emoji-only / URL-only / symbol-only / duplicate / too-short / target-language / unselected-source-language / low-confidence skip、および sensitive material を除外する cache/dedupe key material が provider request 前に適用されるようになっています。
- 最終ゴールは Public Release Roadmap の全タスク完了、verification 通過、必要な deployed/live smoke の sanitized evidence 記録により「公開可能状態」にすることです。

次にやること:
- Public Release Roadmap Task 10: Bounded polling session runtime.
- Task 9 PR が merge 済みであることを確認してから、YouTube Live Chat polling を uncontrolled loop ではなく bounded server session runtime として追加してください。
- Scope は target lookup once at session start、`liveChatMessages.list`、`pollingIntervalMillis` compliance、minimum interval、empty-chat backoff、retry caps、terminal stop states です。
- token values、owner id value、provider channel id value、liveChatId value、Authorization header value、service_role key value、secret value、provider target metadata value は client/docs/PR body/browser storage/handoff payload に表示・保存しないでください。
- `liveChatId` は server-only に留め、browser storage / handoff payload / docs / PR body / client-readable output に出さないでください。
- polling interval は provider response より速くせず、minimum interval、empty-chat backoff、retry caps、terminal stop states を contract で固定してください。
- Task 10 は live/provider execution 承認ではありません。実 provider call / live smoke は same-thread preflight、sanitized output review、explicit approval が揃うまで実行しないでください。
- Billing enforcement、browser storage、handoff payload、remote Supabase mutation/schema change、UI layout/copy change、raw comment logging は Task 10 の completion に必要な最小範囲を超えて変更しないでください。

Verification:
- focused bounded polling/session runtime contracts
- existing relevant comment-translator contracts if touched
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- UI を変更した場合は `/tools/comment-translator` width checks at `390 / 820 / 1024 / 1280 / 1366px`

Completion:
- Task 10 completion criteria を満たした場合のみ `task.md` 更新、commit、push、draft PR targeting `codex/comment-translator-preview` まで進めてください。
- 未達なら commit / push / PR はせず、blocker reason、inspected files/commands、missing evidence/implementation、next safe action を報告してください。
```

## Post-Public Candidates

- Advanced paid tiers, paid-priority scheduling, and provider-usage charging.
- Twitch runtime and EventSub/chat integration.
- `liveChatMessages.streamList` evaluation.
- Background monitoring and automatic session start.
- Multiple concurrent streams per user.
- Additional source languages and advanced mixed-language options.
- User-provided Google Cloud project / OAuth client support.
