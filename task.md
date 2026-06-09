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
   - status: `codex/comment-translator-preview` は PR #393 (`[codex] Record owner verification smoke success`) merge 済み。`git fetch origin --prune` 後、merge commit `9171455bd7600d813ef7e2ae631343546a0caeee` が `origin/codex/comment-translator-preview` history に含まれることを確認した。
   - latest PR metadata: PR #393 `MERGED` at `2026-06-09T06:06:26Z`; base `codex/comment-translator-preview`; head `codex/comment-translator-owner-verification-success-post-pr392`。
   - current PR scope: Task 5 readiness/blocker PR。ユーザー判断により、Live Streaming availability 反映待ちの間に readiness gate と blocker evidence を PR 化する。Task 5 completion criteria の `one sanitized polling result` は未達のまま、execution PR は別 PR とする。
   - current Task 5 foundation slice: `lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts`、`scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs`、`scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs` を追加した。owner verification smoke success prerequisite、owner authorization、owner binding match、Live Chat target metadata、token material availability が揃うまで `liveChatMessages.list` provider access へ進まないことを固定する。
   - current Task 5 command boundary: command は `--check-env-only --json`、`--check-owner-binding-only --json`、`--check-token-material-availability --json`、`--execute --approved-live-chat-polling-smoke --json` を持つ。実行 path は one bounded `liveChatMessages.list` step のみで、polling loop / quota write / translator pipeline wiring / UI / browser storage / handoff payload changes は追加しない。
   - current Task 5 blocker evidence: operator-local preflight progressed from missing prerequisite/target references to a single placeholder blocker on `YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID`. Google Developers API Explorer then returned HTTP 403 `liveStreamingNotEnabled` / `The user is not enabled for live streaming` while trying to obtain Live Chat target metadata. Provider polling remained `not-run`; no polling execution occurred.
   - preserved output boundary: command output is `sanitized-metadata-only`。`tokenValue` / `refreshTokenValue` は `never-returned-by-design`。OAuth access token / refresh token / authorization code value、owner user id value、provider channel id value、liveChatId value、service_role key value、server authorization header は output / docs / PR body / browser storage に出していない。
   - completed roadmap item: Completion-Oriented Roadmap Task 4 `Owner verification smoke` は完了。safe live YouTube OAuth smoke と Live Chat polling smoke execution は `not-run` のまま。
   - immediate next condition: YouTube Live Streaming availability 反映後、operator-local に Live Chat target metadata を設定し、`--check-env-only`、`--check-owner-binding-only`、`--check-token-material-availability` の sanitized ready output を確認する。その後、同スレッド explicit approval の直後だけ `--execute --approved-live-chat-polling-smoke --json` を 1 回実行する。
   - next PR candidate: Live Chat polling smoke execution evidence PR。Task 5 completion criteria は one sanitized polling result, no broad polling loop, no quota write, no translator pipeline wiring。
   - out of scope for current readiness PR: safe live YouTube OAuth smoke、additional owner verification smoke rerun without fresh approval、actual Live Chat polling execution、translator pipeline wiring、operator UI flow、remote Supabase DB mutation、refresh runtime、full revocation runtime、credential status display UI rewiring、localStorage / IndexedDB / sessionStorage / handoff payload 変更、quota write、billing integration、main integration。
   - verification: Task 5 RED -> GREEN contract `node scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs` passed. Regression contracts `node scripts/comment-translator-youtube-owner-verification-smoke-command-contract.mjs` and `node scripts/comment-translator-youtube-google-api-live-call-command-contract.mjs` passed. `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. Live Chat polling execution remains `not-run`.
   - width verification: UI / rendered text / CSS は変更しない server-only command/foundation/task update のため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。

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
   - Goal: Prove one bounded Live Chat polling step after owner verification.
   - Completion criteria: one sanitized polling result, no broad polling loop, no quota write, no translator pipeline wiring.
   - PR policy: separate PR only after owner verification smoke is complete. Current exception: user approved a readiness/blocker PR for command/foundation/preflight gates while YouTube Live Streaming availability blocks `liveChatId` lookup; the execution evidence PR remains separate.
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
- root checkout / main では作業しないでください。
- 作業先は fresh worktree / feature branch にしてください。
- secret / token / owner user id value / provider channel id value / service_role key value は表示・要求・保存しないでください。
- Google API live call、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke は、same-thread / same-process preflight ready と explicit in-thread approval が揃うまで実行しないでください。
- 既存の `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --execute --json` は token-resolution-only command であり、actual Google API live call を実行しません。これを繰り返して blocker-summary PR を作らないでください。

最初に確認:
1. `git fetch origin --prune`
2. `AGENTS.md` と `task.md` を読む
3. latest PR / branch / merge commit が `origin/codex/comment-translator-preview` に含まれることを確認

現在地:
- PR #393 は merge 済み。
- Task 2 actual Google API live call command foundation PR が追加した新規 command は `scripts/comment-translator-youtube-google-api-live-call-command.mjs`。
- post-PR390 Task 3 execution evidence slice で、operator-local same-command-process preflight / token material availability / explicit in-thread approval 後に `--execute --approved-live-google-api-call --json` を 1 回だけ実行し、sanitized `google-api-live-call-sanitized-result` / `executed-bounded-readonly` / HTTP 200 / `ok: true` を記録した。
- actual Google API live call は完了。Task 4 owner verification smoke は `owner-verification-smoke-sanitized-result` / `ownerChannelMatchesExpected: true` の sanitized success evidence を記録した。
- Task 5 readiness PR adds `scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs`, `lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts`, and the dedicated contract. It proves preflight gates before `liveChatMessages.list`, but does not execute Live Chat polling.
- Task 5 execution is blocked by YouTube Live Streaming availability. Google Developers API Explorer returned HTTP 403 `liveStreamingNotEnabled` while trying to obtain Live Chat target metadata. Live Chat polling execution remains `not-run`.

次にやること:
- Fresh worktree / branch from `origin/codex/comment-translator-preview`.
- After the readiness PR is merged and YouTube Live Streaming availability is ready, continue Task 5 execution evidence as a separate PR. Task 4 owner verification success remains prerequisite; preserve one bounded polling result, no broad polling loop, no quota write, no translator pipeline wiring.
- Current Task 4 foundation command is `scripts/comment-translator-youtube-owner-verification-smoke-command.mjs`; owner verification smoke is completed and should not be rerun unless a fresh same-process preflight, sanitized output review, and explicit in-thread approval are recorded.
- Keep token values, owner user id value, provider channel id value, liveChatId value, service_role key value out of output, docs, fixtures, PR body, and browser storage.
- Do not run safe live YouTube OAuth smoke, owner verification smoke, or Live Chat polling smoke unless the new task has a ready preflight, sanitized output review is complete, and this same thread receives explicit in-thread approval immediately before execution.
- First rerun `--check-env-only --json`, `--check-owner-binding-only --json`, and `--check-token-material-availability --json` after setting operator-local Live Chat target metadata. If any returns blocker output, record sanitized blocker evidence and stop without execution.
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
