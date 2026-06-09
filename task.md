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
   - status: `codex/comment-translator-preview` は PR #391 (`[codex] Record first Google API live call evidence`) merge 済み。`git fetch origin --prune` 後、merge commit `82f34ad38765c54356ab83d84f02d0517298408c` が `origin/codex/comment-translator-preview` history に含まれることを確認した。
   - latest PR metadata: PR #391 `MERGED` at `2026-06-09T04:58:02Z`; base `codex/comment-translator-preview`; head `codex/comment-translator-first-google-api-live-call-execution-post-pr390`。
   - current implementation slice: post-PR390 Task 3 execution evidence として、operator-local same-command-process で first actual Google API live call を 1 回だけ実行した。`--check-env-only --json` は `ready-for-bounded-google-api-live-call-command-foundation`、`--check-token-material-availability --json` は `token-material-available`、実行直前の explicit in-thread approval 後の `--execute --approved-live-google-api-call --json` は `google-api-live-call-sanitized-result` / `executed-bounded-readonly` を返した。
   - current Task 4 foundation slice: `lib/comment-translator-youtube-owner-verification-smoke-foundation.ts` と `scripts/comment-translator-youtube-owner-verification-smoke-command.mjs` を追加した。contract は owner authorization 欠落時に trusted status read / token material resolution / provider fetch へ進まないこと、provider channel mismatch 時に token material / provider fetch へ進まないこと、success path は owner binding verified before provider access 後に `channels.list-mine` だけを bounded readonly に実行し sanitized metadata only を返すことを固定する。
   - sanitized Google API result: endpoint `channels.list-mine`; HTTP status `200`; `ok: true`; `channelReference: present`; `returnedItemCount: 1`; `pageInfoTotalResults: 1`; `longUploadsStatus: present`; `madeForKids: absent`。Google API live call は bounded readonly で 1 回だけ実行。
   - preserved output boundary: command output は `sanitized-metadata-only`。`tokenValue` / `refreshTokenValue` は `never-returned-by-design`。OAuth access token / refresh token / authorization code value、owner user id value、provider channel id value、service_role key value、server authorization header は output / docs / PR body / browser storage に出していない。
   - completed roadmap item: Completion-Oriented Roadmap Task 3 `First actual Google API live call execution` は完了。safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke はすべて `not-run` のまま。
   - current Task 4 preflight: operator-local same-command-process の `node scripts/comment-translator-youtube-owner-verification-smoke-command.mjs --check-env-only --json` は `ready-for-bounded-owner-verification-smoke-command-foundation`、`--check-owner-binding-only --json` は `owner-binding-verified-before-provider-access`、`--check-token-material-availability --json` は `owner-verification-token-material-available` を返した。すべて sanitized metadata only で、provider access は preflight / owner-binding-only / token-material-only では `not-run`。
   - current Task 4 execution evidence: 同じ operator-local PowerShell と同スレッド explicit approval 後、`--execute --approved-owner-verification-smoke --json` を再実行した。結果は `owner-verification-smoke-sanitized-result` / `verified-before-provider-access` / `executed-bounded-readonly` / `providerAccess: channels-list-mine-owner-verification-only`。HTTP status `200`; `ok: true`; `channelReference: present`; `expectedProviderChannelReference: present`; `ownerChannelMatchesExpected: true`; `returnedItemCount: 1`; `pageInfoTotalResults: 1`。
   - immediate next condition: Completion-Oriented Roadmap Task 4 `Owner verification smoke` は完了。Live Chat polling smoke は Task 5 の separate PR で進める。translator pipeline wiring、operator UI flow、refresh runtime、full revocation runtime はまだ別 PR。
   - next PR candidate: Live Chat polling smoke readiness/execution PR。Task 5 では owner verification success を prerequisite とし、no broad polling loop / no quota write / no translator pipeline wiring を維持する。
   - out of scope for current roadmap PR: safe live YouTube OAuth smoke、Live Chat polling smoke、remote Supabase DB mutation、refresh runtime、full revocation runtime、credential status display UI rewiring、localStorage / IndexedDB / sessionStorage / handoff payload 変更、quota write、billing integration、main integration。
   - verification: Task 4 RED -> GREEN contract `node scripts/comment-translator-youtube-owner-verification-smoke-command-contract.mjs` passed. Regression contract `node scripts/comment-translator-youtube-google-api-live-call-command-contract.mjs` passed. `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. Operator-local owner verification smoke output reviewed as sanitized success evidence; Live Chat polling remains `not-run`.
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

Use one Codex thread / one feature branch / one PR per roadmap task. Do not create a PR for a task unless that task's completion criteria are satisfied and verification has been attempted. If a task cannot complete, stop in the thread and report the blocking reason, exact command/result reviewed, missing approval/evidence, and next unblock action.

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
   - PR policy: separate PR only after owner verification smoke is complete.
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
- If the task does not complete, do not commit, push, or create a PR. Reply with: `blocked reason`, `attempted command or inspected file`, `why completion criteria are not met`, `what approval/evidence/implementation is missing`, and `next safe action`.
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
- PR #391 は merge 済み。
- Task 2 actual Google API live call command foundation PR が追加した新規 command は `scripts/comment-translator-youtube-google-api-live-call-command.mjs`。
- post-PR390 Task 3 execution evidence slice で、operator-local same-command-process preflight / token material availability / explicit in-thread approval 後に `--execute --approved-live-google-api-call --json` を 1 回だけ実行し、sanitized `google-api-live-call-sanitized-result` / `executed-bounded-readonly` / HTTP 200 / `ok: true` を記録した。
- actual Google API live call は完了。Task 4 owner verification smoke は `owner-verification-smoke-sanitized-result` / `ownerChannelMatchesExpected: true` の sanitized success evidence を記録した。safe live YouTube OAuth smoke と Live Chat polling smoke はまだ実行していない。

次にやること:
- Fresh worktree / branch from `origin/codex/comment-translator-preview`.
- Task 5 Live Chat polling smoke を separate PR で進める。Task 4 owner verification success を prerequisite とし、one bounded polling result、no broad polling loop、no quota write、no translator pipeline wiring を維持する。
- Current Task 4 foundation command is `scripts/comment-translator-youtube-owner-verification-smoke-command.mjs`; owner verification smoke is completed and should not be rerun unless a fresh same-process preflight, sanitized output review, and explicit in-thread approval are recorded.
- Keep token values, owner user id value, provider channel id value, service_role key value out of output, docs, fixtures, PR body, and browser storage.
- Do not run safe live YouTube OAuth smoke, owner verification smoke, or Live Chat polling smoke unless the new task has a ready preflight, sanitized output review is complete, and this same thread receives explicit in-thread approval immediately before execution.
- If owner authorization evidence, target metadata, approval boundary, or sanitized output review is missing, stop and report the blocker without creating an execution PR.
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
