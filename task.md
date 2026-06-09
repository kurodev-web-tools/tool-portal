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
   - status: `codex/comment-translator-preview` は PR #389 (`[codex] Add token material availability gate`) merge 済み。`git fetch origin --prune` 後、merge commit `b86586a24bf8009457f8e76ccab6a403f18fc9c2` が `origin/codex/comment-translator-preview` history に含まれることを確認した。
   - latest PR metadata: PR #389 `MERGED` at `2026-06-09T03:50:30Z`; base `codex/comment-translator-preview`; head `codex/comment-translator-token-material-availability-post-pr388`; checks は Cloudflare Pages `FAILURE`、Workers Builds `SUCCESS`。
   - latest operator evidence: operator PowerShell で `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json` が `ready-for-sanitized-youtube-live-runtime-smoke-command` を返した。続く explicit in-thread approval 後の operator 実行 `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --execute --json` は `resolved-for-server-fetch` / `serverFetchBinding: resolved-for-server-fetch` / `actualSafeLiveRuntimeSmoke: not-run-token-resolution-only` / `googleApiLiveCall: not-run` を返した。これは server-only token resolution / server fetch binding の evidence であり、actual provider execution ではない。
   - root cause for repeated blocker PRs: `scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --execute --json` は current implementation / contract 上、actual Google API live call を実行しない。繰り返し実行しても `resolved-for-server-fetch` / `not-run-token-resolution-only` に戻るため、次は evidence 再記録ではなく actual Google API live call command foundation の実装 PR に進む。
   - current implementation slice: post-PR389 Task 3 pre-execution follow-up として、新 command の token material availability gate に server-only operator-local resolver wiring を追加した。operator-local token material env reference と expiry reference が same-process で揃う場合だけ `--check-token-material-availability --json` は provider fetch なしで sanitized `token-material-available` を返せる。env reference が無い場合は従来通り sanitized unavailable adapter で止まる。
   - preserved output boundary: command output は `sanitized-metadata-only`。`tokenValue` / `refreshTokenValue` は `never-returned-by-design`。client-readable output は opaque non-secret `credentialReferenceId` と sanitized credential status metadata のみに閉じる。
   - current blockers: actual Google API live call、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke はすべて `not-run`。保存済み credential からの decrypt/token material retrieval runtime はまだ未実装。operator-local resolver は actual call 直前の availability/readiness boundary であり、実行承認ではない。
   - immediate next condition: この operator-local resolver wiring PR が merge された後、first actual Google API live call execution thread で same-thread / same-process ready preflight、`--check-token-material-availability --json` の sanitized `token-material-available` evidence、sanitized output review、実行直前の explicit in-thread approval を揃えた場合だけ `--execute --approved-live-google-api-call` へ進む。approval / env / target metadata / token material availability / sanitized output review が不足する場合は実行せず blocker を返す。
   - next PR candidate: first actual Google API live call execution readiness/evidence thread。actual execution は token material availability が `token-material-available` で証明され、same-thread explicit approval がある場合だけ行う。保存済み credential decrypt/token material retrieval runtime は別 PR 候補として残す。
   - out of scope for current roadmap PR: actual Google API live call 実行、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke、remote Supabase DB mutation、refresh runtime、full revocation runtime、credential status display UI rewiring、localStorage / IndexedDB / sessionStorage / handoff payload 変更、provider coupling beyond scoped server-only command、quota write、billing integration、main integration。
   - verification: RED -> GREEN: `node scripts/comment-translator-youtube-google-api-live-call-command-contract.mjs` first failed on missing `createOperatorLocalYouTubeGoogleApiLiveTokenMaterialResolver`, then passed after foundation/command wiring. PASS: `node scripts/comment-translator-youtube-google-api-live-call-command-contract.mjs`; `npm run lint`; `npx tsc --noEmit`; `npm run build`; `git diff --check`。Current process `node scripts/comment-translator-youtube-google-api-live-call-command.mjs --check-env-only --json` and `--check-token-material-availability --json` both returned sanitized blocker `blocked-missing-env-fixture-target-or-live-call-readiness-references` because same-process references are absent. `--execute --approved-live-google-api-call` は実行していない。
   - width verification: UI / rendered text / CSS は変更しない server-only command / foundation resolver wiring のため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。

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
- PR #388 は merge 済み。
- Task 2 actual Google API live call command foundation PR が追加した新規 command は `scripts/comment-translator-youtube-google-api-live-call-command.mjs`。
- post-PR387 runtime wiring readiness slice で、新 command の approved execution dependency wiring は `createYouTubeGoogleApiLiveCallCommandRuntimeWiring` に移った。server-only live token material resolver は command runtime に接続されたが、token material retrieval は未実装 / sanitized unavailable のため `--execute --approved-live-google-api-call` でも actual provider fetch には進まない。
- post-PR388 availability gate slice で、新 command に `--check-token-material-availability` が追加された。この gate は server-only token resolver availability だけを確認し、Google API provider fetch は行わない。現行 runtime は decrypt/token material retrieval 未実装のため sanitized unavailable adapter のまま止まる。
- actual Google API live call、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke はまだ実行していない。

次にやること:
- Fresh worktree / branch from `origin/codex/comment-translator-preview`.
- First actual Google API live call execution の前段として、decrypt/token material retrieval runtime or operator-local resolver wiring を contract-first で進める。新 command の `--check-env-only --json` で same-thread / same-process reference preflight を取り、`--check-token-material-availability --json` で token material resolver が `token-material-available` を返す実装/evidence と sanitized output review を揃える。actual Google API live call はまだ実行しない。
- Keep token values, owner user id value, provider channel id value, service_role key value out of output, docs, fixtures, PR body, and browser storage.
- Do not run the actual live call unless the new command has a ready preflight, token material resolver availability is proven, sanitized output review is complete, and this same thread receives explicit in-thread approval immediately before execution.
- If token material availability, target metadata, approval boundary, or sanitized output review is missing, stop and report the blocker without creating an execution PR.
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
