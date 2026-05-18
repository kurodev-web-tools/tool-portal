# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- ブラウザー実見は、通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 から PR #123 まで `main` / `origin/main` に merge 済み。PR #103 以降の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の P27 を参照する。
- PR #124 `[codex] Plan next thumbnail presets and prelaunch board` は `main` / `origin/main` に merge 済み。merge commit は `105cc457aac1963bc17582dfbfde964598ca44b7`。次 preset 候補 planning の詳細は `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md` と `docs/mockups/thumbnail-editor-usecase-preset-candidates/README.md` を参照する。

## Active

- English support initial coverage / preview integration branch
  - 統合先: `codex/en-support-preview`。`origin/main` 起点で作成し、B scope 完了までの EN 対応 PR はこの branch 宛てに積む。
  - 初回到達点: B scope として、portal / tool list / `Schedule Calendar` / `Thumbnail Editor` / `SNS分割画像メーカー` の主要見出し、CTA、empty state、export / handoff copy、metadata を英語表示で読める状態にする。C scope の全 UI 文言置換は B 確認後に main 起点の小分け PR へ移す。
  - language switch 方針: 初回表示は browser language (`navigator.languages`) で `en*` を英語、それ以外を日本語にする。手動選択後は保存値を優先する。desktop は theme toggle 付近、mobile は hamburger menu 内に置く。
  - 非対象: URL 設計変更、大規模 i18n framework 導入、保存 schema / IndexedDB / localStorage 既存 key / handoff payload 変更、Google Calendar 連携、外部投稿連携追加は B scope に含めない。
  - PR 分割: 1) locale foundation + language switch、2) Portal / Tools、3) Schedule Calendar、4) Thumbnail Editor / SNS Split Image Maker の主要導線。各 PR は `codex/en-support-preview` 宛てにし、B 完了時点でまとめて確認してから `main` へ持っていくか判断する。
  - 検証方針: 日本語表示を壊さず、英語表示で主要導線が読めること。UI 変更 PR では `390 / 820 / 1024 / 1280 / 1366px` の幅別確認を残す。

## Backlog

- English support initial coverage
  - 目的: 公開初期から EN 圏ユーザーが入口と3ツールの主要導線を理解できる状態にする。
  - 現在は Active の `English support initial coverage / preview integration branch` を実行元にする。
  - B scope 完了後、C scope として残った細部 UI 文言、設定文言、補助説明、validation / error / aria label などを main 起点の小分け PR で進める。

- Thumbnail Editor next preset candidates
  - PR #124 planning の推奨順: `goods_notice` -> `membership_stream` -> `asmr_stream` -> `relay_stream` -> `collab_recruit_notice`。
  - 公開前調整が一段落してから、1 preset / 1 PR で進める。
  - 候補ごとに mock / asset 生成が必要になった時点で `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode を使う。
  - `goods_notice` 実装時は、物販 / merch release 用途として、既存 `イベント告知`、`歌ってみた告知`、通常 `お知らせ` と用途差が分かる preset body / production asset / contract を追加する。

- Freeze 後候補
  - Schedule Calendar: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。
  - Thumbnail Editor: 新規 usecase preset、crop 仕様、text / image layer schema、public asset / font 追加。
  - SNS Split Image Maker: ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

## Verification baseline

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Archive / reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
