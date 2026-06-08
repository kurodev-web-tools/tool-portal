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
   - status: `codex/comment-translator-preview` は PR #384 (`[codex] Clean up comment translator task board`) merge 済み。`git fetch origin --prune` 後、merge commit `cee1575b772cfa2768d3fd640442361998db96de` が `origin/codex/comment-translator-preview` history に含まれることを確認した。
   - latest PR metadata: PR #384 `MERGED` at `2026-06-08T14:06:59Z`; base `codex/comment-translator-preview`; head `codex/comment-translator-google-api-live-call-preflight-post-pr383`; checks は Cloudflare Pages `FAILURE`、Workers Builds `SUCCESS`。
   - latest operator evidence: operator PowerShell で `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json` が `ready-for-sanitized-youtube-live-runtime-smoke-command` を返した。続く operator 実行の `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --execute --json` は `resolved-for-server-fetch` / `serverFetchBinding: resolved-for-server-fetch` / `actualSafeLiveRuntimeSmoke: not-run-token-resolution-only` を返した。これは server-only token resolution / server fetch binding の evidence であり、actual provider execution ではない。
   - latest Codex same-process preflight: this branch ran `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json` only. Result was `blocked-missing-env-fixture-or-target-references`; missing categories were env references, fixture references, target metadata reference, and owner authorization preflight reference. No `--execute`, Google API live call, safe live smoke, owner verification smoke, or Live Chat polling smoke was run.
   - preserved output boundary: command output は `sanitized-metadata-only`。`tokenValue` / `refreshTokenValue` は `never-returned-by-design`。client-readable output は opaque non-secret `credentialReferenceId` と sanitized credential status metadata のみに閉じる。
   - current blockers: Google API live call、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke はすべて `not-run`。Codex process 側では env / fixture / target metadata / owner authorization preflight references が揃っていないため、Codex が provider execution を行うには same-thread / same-process の `--check-env-only` ready evidence と explicit in-thread approval が必要。
   - immediate next condition: first Google API live call gate は、fresh merge metadata、concrete non-secret target metadata、env reference presence、fixture reference presence、owner authorization preflight、server-only live token resolution runtime、sanitized output policy、no token value logging、same-thread/same-process evidence、explicit human approval が同一 thread / Codex process で揃った場合のみ進める。
   - next PR candidate: env / fixture / target metadata / owner authorization preflight references が same-process で揃うまで blocker summary に留める。揃った後も Google API live call gate は explicit in-thread approval 後の separate PR として扱う。owner verification smoke / Live Chat polling smoke は Google API live call gate 後の別候補に留める。
   - out of scope for current blocker-summary PR: Google API live call、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke、additional `--execute --json`、remote Supabase DB mutation、refresh runtime、full revocation runtime、credential status display UI rewiring、localStorage / IndexedDB / sessionStorage / handoff payload 変更、provider coupling、quota write、billing integration、main integration。
   - width verification: UI / rendered text / CSS は変更しない task-board cleanup のため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。

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
  - Historical Cloudflare Pages / Workers Builds repetitions except the latest relevant PR #383 check summary.

## Recommended Roadmap

1. Finish this task-board cleanup as a docs-only PR against `codex/comment-translator-preview`.
2. Re-enter the Google API live call gate only after same-thread / same-process preflight evidence and explicit in-thread approval are available.
3. After Google API live call gate, split owner verification smoke and Live Chat polling smoke into separate small PRs.
4. Wire proven live comment intake into the translator pipeline only after provider smoke boundaries are verified.
5. Treat UI/operator flow changes as a separate UI PR with width verification.

## Next Session Prompt

```text
D:/V_streamer_tools の Kuro Live Comment Translator preview line を続けます。

重要:
- root checkout / main では作業しないでください。
- 作業先は fresh worktree / feature branch にしてください。
- secret / token / owner user id value / provider channel id value / service_role key value は表示・要求・保存しないでください。
- Google API live call、safe live YouTube OAuth smoke、owner verification smoke、Live Chat polling smoke、追加の `node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --execute --json` は、same-thread / same-process preflight ready と explicit in-thread approval が揃うまで実行しないでください。

最初に確認:
1. `git fetch origin --prune`
2. `AGENTS.md` と `task.md` を読む
3. latest PR / branch / merge commit が `origin/codex/comment-translator-preview` に含まれることを確認

現在地:
- PR #384 は merge 済み。
- operator 実行の sanitized `--execute --json` は `resolved-for-server-fetch` / `not-run-token-resolution-only`。
- これは server-only token resolution / server fetch binding の evidence であり、Google API live call / safe live smoke / owner verification / Live Chat polling は未実行。
- latest Codex same-process `--check-env-only --json` は `blocked-missing-env-fixture-or-target-references`。env / fixture / target metadata / owner authorization preflight references が揃っていない。

次にやること:
- Google API live call gate に進む場合は、まず同じ Codex process で `--check-env-only --json` ready を確認し、同じ thread 内の explicit human approval を待つ。
- readiness が揃わなければ blocker summary のみ返し、`--execute` や live API には進まない。
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
