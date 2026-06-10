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

## Active Priorities

1. Kuro Live Comment Translator preview branch
   - status: `codex/comment-translator-preview` は PR #398 (`[codex] Add Live Chat target lookup failure diagnostics`) merge 済み。`git fetch origin --prune` 後、merge commit `07d4d068f1acd72dc6371bb111d6cf8fce893c44` が `origin/codex/comment-translator-preview` に含まれることを確認した。
   - latest PR metadata: PR #398 `MERGED` at `2026-06-10T07:45:45Z`; base `codex/comment-translator-preview`; head `codex/comment-translator-live-chat-polling-execution-post-pr397`。
   - current PR scope: Live Chat target lookup request filter fix after PR #398. `liveBroadcasts.list` は official API rule に合わせて exactly one filter (`mine=true`) にし、active broadcast 判定は sanitized response metadata から local に行う。Polling execution / translator runtime wiring / UI はまだ変更しない。
   - completed target lookup readiness slice: `lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts`、`scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs`、`scripts/comment-translator-youtube-live-chat-target-lookup-command-contract.mjs` は merge 済み。既存境界に合わせて `liveBroadcasts.list` の `snippet.liveChatId` を source とし、出力は target presence / absence の sanitized metadata only に留める。
   - current target lookup command boundary: command は `--check-env-only --json`、`--check-owner-binding-only --json`、`--check-token-material-availability --json`、`--execute --approved-live-chat-target-lookup --json` を持つ。missing owner authorization、owner verification prerequisite missing、owner mismatch、missing token material、no active owned broadcast、missing/disabled target、`liveStreamingNotEnabled`、generic HTTP failure は polling execution へ進まない。
   - target lookup execution readiness checklist: YouTube Live Streaming availability 反映後、operator-local same-command-process で `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-env-only --json` -> `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-owner-binding-only --json` -> `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-token-material-availability --json` の順に確認する。sanitized output review は `status`、`outputPolicy: sanitized-metadata-only`、`targetMetadataHandling: live-chat-id-presence-only-never-returned`、`ownerBinding`、`providerAccess`、`tokenValue: never-returned-by-design`、`refreshTokenValue: never-returned-by-design` を見る。secret value / owner user id value / provider channel id value / liveChatId value / Authorization header value が出ていないことを確認する。
   - target lookup execution approval boundary: same-thread / operator-local same-command-process の 3 checks、sanitized output review、explicit in-thread approval が揃うまで `--execute --approved-live-chat-target-lookup --json` は実行しない。この task board 更新は live/provider execution approval ではない。
   - current polling prerequisite contract: polling smoke は target lookup readiness と presence-only evidence が confirmed になるまで readiness / token-material check / execution に進めない。`liveChatId` value の保存・表示・handoff payload 変更はしない。
   - future integration policy: YouTube / Twitch integration、provider quota / rate limits、AI API cost controls、free / paid session limits、language filtering の設計メモは `docs/future/COMMENT_TRANSLATOR_API_INTEGRATION_LIMITS.md` に置く。
   - preserved output boundary: command output is `sanitized-metadata-only`。`tokenValue` / `refreshTokenValue` は `never-returned-by-design`。OAuth access token / refresh token / authorization code value、owner user id value、provider channel id value、liveChatId value、service_role key value、server authorization header は output / docs / PR body / browser storage に出していない。
   - execution state: actual Live Chat target lookup API execution は PR #399 merge 後、same-thread explicit approval と operator-local same-process preflight success 後に rerun され、sanitized target-present evidence を取得した。result は `live-chat-target-lookup-sanitized-result` / `liveChatTarget: present` / `liveChatTargetLookup: executed-bounded-readonly-one-step` / `providerAccess: liveBroadcasts-list-target-lookup-only` / `serverFetchBinding: resolved-for-server-fetch` / `responseMetadata.httpStatus: 200` / `responseMetadata.activeOwnedBroadcast: present` / `responseMetadata.targetIdValue: not-returned-by-design`。
   - polling smoke execution state: PR #400 merge 後、same-thread explicit approval と operator-local same-process preflight success 後に 1 回実行し、sanitized polling result を取得した。result は `live-chat-polling-smoke-sanitized-result` / `liveChatPollingSmoke: executed-bounded-readonly-one-step` / `providerAccess: liveChatMessages-list-one-step-only` / `serverFetchBinding: resolved-for-server-fetch` / `responseMetadata.httpStatus: 200` / `responseMetadata.nextPageToken: present` / `responseMetadata.returnedItemCount: 0` / `responseMetadata.textPayload: not-returned-by-design`。safe live YouTube OAuth smoke、additional owner verification smoke rerun は `not-run`。
   - external state: Google API Explorer と command runtime の target lookup が sanitized target-present 相当まで到達した。`liveChatId` value は output / docs / PR body / browser storage に出していない。
   - diagnostic update: failed-sanitized target lookup results now include sanitized `failureMetadata` with only `providerFailureClass`, `httpStatus`, and `ok`; provider body / provider reason / token / owner id / provider channel id / liveChatId / Authorization header values remain unreturned.
   - maintenance note: target lookup / polling contract fixtures use future-dated fake operator-local token expiry values so contract verification does not expire on the real calendar date.
   - immediate next condition: record and verify the Live Chat polling smoke execution evidence PR. Do not put `liveChatId` value, token value, Authorization header, or text payload in docs / PR body / output.
   - next PR candidate: Live Chat polling smoke execution evidence PR. After merge, Task 5 can be considered complete; next roadmap candidate is live comment intake to translator pipeline as a separate server-only / contract-first PR.
   - out of scope for current PR: Live Chat polling smoke execution、safe live YouTube OAuth smoke、additional owner verification smoke rerun、translator pipeline wiring、operator UI flow、remote Supabase DB mutation、refresh runtime、full revocation runtime、credential status display UI rewiring、localStorage / IndexedDB / sessionStorage / handoff payload 変更、quota write、billing integration、main integration。
   - verification: polling smoke command contract and `git diff --check` passed for the polling smoke execution evidence update.
   - width verification: UI / rendered text / CSS は変更しない docs-only update のため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。

## Task Board Retention Cleanup

- Keep in active board:
  - Current Premises and hard safety boundaries.
  - Latest merge-state / PR metadata for the current preview branch.
  - Latest sanitized operator evidence and what it does, and does not, prove.
  - Current blockers, next condition, next PR candidate, out-of-scope list, verification baseline, and short backlog.
- Moved to archive:
  - The previous full `task.md` was moved to `docs/archive/task-board-pre-pr384-cleanup-2026-06-08.md`.
  - The archived file preserves the long PR #325 - #383 task-board history, detailed verification bundles, old next-session prompts, and compatibility notes that no longer need to be on the active board.
- Removed from the active board:
  - Repeated per-PR post-merge sections for already completed PRs.
  - Old prompt variants and stale next-session instructions.
  - Duplicate compatibility anchor paragraphs already represented by the latest status and archive file.
  - Historical Cloudflare Pages / Workers Builds repetitions except the latest active PR metadata.

## Completion-Oriented Roadmap

Use one Codex thread / one feature branch / one PR per roadmap task. Do not create a PR for a task unless that task's completion criteria are satisfied and verification has been attempted, except when the user explicitly approves a readiness/blocker PR while an external wait blocks execution. If a task cannot complete and no readiness/blocker PR is approved, stop in the thread and report the blocking reason, exact command/result reviewed, missing approval/evidence, and next unblock action.

1. Roadmap and anti-loop operating rule
   - Goal: Replace repeated token-resolution evidence loops with a completion-oriented task sequence.
   - Completion criteria: `task.md` records the root cause that current `--execute --json` does not run Google APIs, defines per-task PR rules, and updates the next-session prompt.
   - PR policy: create PR only after docs verification passes.
2. Actual Google API live call command foundation
   - Goal: Add a server-only, contract-first command path for one bounded readonly Google API call, separate from the existing token-resolution-only smoke command.
   - Expected endpoint shape: a minimal readonly request such as `channels.list?mine=true` or an equivalent owner-safe metadata call, selected in implementation after checking existing adapter boundaries.
   - Completion criteria: completed in the Task 2 command foundation slice. Contract proves token values are never printed, output remains sanitized metadata only, endpoint is bounded to `channels.list-mine`, abort conditions are explicit, and current token-resolution-only command remains clearly scoped.
   - PR policy: create PR only if contract/runtime foundation and relevant verification pass. Actual Google API live call execution remains out of this PR.
3. First actual Google API live call execution
   - Goal: Run the new bounded server-only live-call command once.
   - Completion criteria: same-thread / same-process ready preflight, explicit in-thread approval, sanitized result showing the Google API call outcome, and no token / owner user id / provider channel id / service_role key value exposure.
   - PR policy: create PR only if the run succeeds and a small evidence/update change is needed. If approval, env, target metadata, or sanitized output review is missing, do not create PR; report the blocker.
4. Owner verification smoke
   - Goal: Prove the credential owner binding is checked before provider access.
   - Completion criteria: bounded owner verification smoke with sanitized metadata only and explicit abort behavior for mismatch / missing owner authorization.
   - PR policy: separate PR only after Google API live call execution is complete.
5. Live Chat polling smoke
   - Goal: Prove one bounded Live Chat polling step after owner verification and Live Chat target lookup.
   - Completion criteria: one sanitized polling result, no broad polling loop, no quota write, no translator pipeline wiring.
   - PR policy: separate PR only after owner verification smoke and Live Chat target lookup readiness are complete. Current exception: readiness/preflight PRs may be split while YouTube Live Streaming availability blocks target lookup execution; target lookup execution evidence and polling execution evidence remain separate.
6. Live comment intake to translator pipeline
   - Goal: Connect proven live comment intake into the translator pipeline.
   - Completion criteria: server-only data flow, no browser storage / handoff payload expansion, focused contract coverage, and no UI rewiring unless explicitly scoped.
   - PR policy: separate PR after provider smoke boundaries are verified.
7. Operator UI flow
   - Goal: Add or adjust UI/operator controls only after runtime smoke boundaries are proven.
   - Completion criteria: UI behavior, status copy, and width checks at `390 / 820 / 1024 / 1280 / 1366px`.
   - PR policy: separate UI PR only.

## Thread And PR Handoff Rules

- Start each roadmap task in a fresh Codex thread and fresh worktree / feature branch from `origin/codex/comment-translator-preview` after confirming the previous task PR is merged.
- At thread start, run `git fetch origin --prune`, read `AGENTS.md` and `task.md`, and verify the latest merged PR commit is in `origin/codex/comment-translator-preview`.
- For each task, first identify whether the task is implementation, execution, or evidence-only. If the task is execution, confirm same-thread / same-process ready preflight and explicit in-thread approval before running provider-affecting commands.
- If the task completes and verification passes, update `task.md`, commit, push, and create a draft PR targeting `codex/comment-translator-preview`.
- If an external wait blocks execution and the user explicitly approves a readiness/blocker PR, record the incomplete completion criteria and blocker evidence in `task.md`, verify, commit, push, and create a draft PR targeting `codex/comment-translator-preview`.
- If the task does not complete and no readiness/blocker PR is approved, do not commit, push, or create a PR. Reply with: `blocked reason`, `attempted command or inspected file`, `why completion criteria are not met`, `what approval/evidence/implementation is missing`, and `next safe action`.
- Do not create blocker-summary PRs just to record that the same token-resolution-only output appeared again.

## Next Session Prompt

```text
D:/V_streamer_tools の Kuro Live Comment Translator preview line を続けます。

重要:
- 最初に必ず `git fetch origin --prune` を実行してください。
- `AGENTS.md` と `task.md` を読んでください。
- root checkout / main では作業しないでください。
- 作業先は fresh worktree / feature branch にしてください。
- secret / token / OAuth access token / refresh token / authorization code / owner user id value / provider channel id value / liveChatId value / service_role key value / Authorization header value は表示・要求・保存しないでください。
- safe live YouTube OAuth smoke、additional owner verification smoke rerun、Live Chat target lookup execution、Live Chat polling smoke execution は、same-thread / operator-local same-command-process ready preflight、sanitized output review、explicit in-thread approval が揃うまで実行しないでください。
- この prompt は live/provider execution 承認ではありません。まず merge gate と readiness / blocker を確認してください。

最初に確認:
1. `git fetch origin --prune`
2. `AGENTS.md` と `task.md` を読む
3. PR #395 / branch / merge commit `b52ab0e609ff52d6c3b5ed0513df552525bdb757` が `origin/codex/comment-translator-preview` に含まれることを確認

現在地:
- PR #395 `[codex] Add Live Chat target lookup preflight` は merge 済み。merge commit は `b52ab0e609ff52d6c3b5ed0513df552525bdb757`。
- Task 3 actual Google API live call は完了。Task 4 owner verification smoke は sanitized success evidence を記録済み。
- Task 5 polling readiness foundation は `scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs` と `lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts`。`liveChatMessages.list` 前の gates はあるが、polling execution は `not-run`。
- Live Chat target lookup readiness slice は `scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs`、`lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts`、dedicated contract を追加した。`liveBroadcasts.list` の target lookup を server-only / sanitized metadata only / approval-gated にしている。
- Polling smoke は target lookup readiness と presence-only evidence が confirmed になるまで readiness / token-material check / execution に進めない。`liveChatId` value の保存・表示・handoff payload 変更はしない。
- Google Developers API Explorer で Live Chat target metadata 取得時に HTTP 403 `liveStreamingNotEnabled` / `The user is not enabled for live streaming` が出た。YouTube Live Streaming availability 反映待ち。
- actual Live Chat target lookup API execution と Live Chat polling smoke execution はまだ無い。

次にやること:
- Fresh worktree / branch from `origin/codex/comment-translator-preview`.
- After YouTube Live Streaming availability is ready, continue Live Chat target lookup execution evidence as a separate PR. Task 4 owner verification success remains prerequisite; preserve one bounded `liveBroadcasts.list` target lookup, no polling execution, no quota write, no translator pipeline wiring.
- Current Task 4 foundation command is `scripts/comment-translator-youtube-owner-verification-smoke-command.mjs`; owner verification smoke is completed and should not be rerun unless a fresh same-process preflight, sanitized output review, and explicit in-thread approval are recorded.
- For target lookup, first run `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-env-only --json`, then `--check-owner-binding-only --json`, then `--check-token-material-availability --json` in the same command-process context where operator-local references are available. If any returns blocker output, record sanitized blocker evidence and stop without execution.
- Review target lookup check outputs for presence-only metadata only: expected status/readiness fields, `targetMetadataHandling: live-chat-id-presence-only-never-returned`, no secret value, no target value, no Authorization header value.
- Do not run Live Chat polling smoke until target lookup execution has produced sanitized presence-only evidence and the polling command's target lookup prerequisite references are confirmed in the same operator-local context.
- Keep token values, owner user id value, provider channel id value, liveChatId value, service_role key value, Authorization header value out of output, docs, fixtures, PR body, and browser storage.
- Do not run safe live YouTube OAuth smoke, owner verification smoke, target lookup execution, or Live Chat polling smoke unless the new task has ready preflight, sanitized output review is complete, and the same thread receives explicit in-thread approval immediately before execution.
```

## Verification Baseline

- Docs/task-board cleanup only:
  - `git diff --check`
  - targeted markdown/content inspection
- Runtime or code changes:
  - relevant contract script(s)
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `git diff --check`
- UI changes:
  - `/tools/comment-translator` width checks at `390 / 820 / 1024 / 1280 / 1366px`

## Contract Compatibility Anchors

- Keep `import "server-only";` on server-only translator / YouTube runtime boundaries.
- Keep provider requests input-source independent until actual provider integration is explicitly scoped.
- Keep token values out of client components, docs, fixtures, PR bodies, browser storage, and command output.
- Treat `resolved-for-server-fetch` as token-resolution / server-fetch-binding evidence only.
- Do not overclaim `not-run-token-resolution-only` as actual Google API live call, actual safe live smoke, owner verification smoke, or Live Chat polling smoke.

## Backlog

- First Google API live call gate with same-process preflight and explicit approval.
- Owner verification smoke after Google API live call gate.
- Live Chat polling smoke after owner verification boundary.
- Live comment to translator pipeline connection.
- Operator UI flow only after runtime smoke boundaries are proven.
- Refresh runtime and full revocation runtime as separate server-only slices.
