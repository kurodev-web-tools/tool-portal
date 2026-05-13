# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 `[codex] Align portal entry freeze copy` から PR #97 `[codex] Polish SNS split export boundary` まで、`main` / `origin/main` に merge 済み。
- PR #97 の merge commit は `1d5e13cb9c3cbb7be73ff9ba1568d5712ceefe24`。
- static export RSC alias fix、production static serve final QA、user material management guard、Schedule Calendar input guard、SNS Split export boundary polish の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の PR #91 / PR #92 / PR #94 / PR #96 / PR #97 欄を参照する。

## Freeze closeout state

- Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 前 final QA は PR #92 で完了済み。
- static export RSC alias は PR #91 で `postbuild` 生成と `--check` 検証が入っている。
- task board closeout は PR #93 / PR #95 で完了済み。
- Thumbnail Editor user material library management v1 は PR #94 で完了済み。
- Schedule Calendar input length / copy guard は PR #96 で完了済み。
- SNS Split Image Maker export boundary polish は PR #97 で完了済み。
- PR #92 の production static serve final QA では、`1024px` の `/tools` と3ツールで dotted `__next.tools*.txt` が 200 / 304、`1280px` / `1366px` で `__next.*.txt` の 400+ response なし。
- docs / task 整理のみの変更では幅別ブラウザ再確認は不要。UI / 表示文言を触る後続PRでは幅別確認を残す。

## 完了済み候補

### Candidate 1: Schedule Calendar input length / copy guard

- 状態: PR #96 `[codex] Add schedule calendar input copy guards` として `main` / `origin/main` に merge 済み。
- merge commit: `c4483c36fcb920a5e63c6e93b69c52dd5f0dafd0`
- 完了内容: 予定タイトル / 告知文 / ハッシュタグ / テンプレート本文の文字数境界、counter / warning copy、storage version `2` と handoff payload 互換を確認。
- 検証: `node scripts/tool-handoff-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、幅別確認 `390 / 820 / 1024 / 1280 / 1366px`。

### Candidate 2: SNS Split Image Maker export boundary polish

- 状態: PR #97 `[codex] Polish SNS split export boundary` として `main` / `origin/main` に merge 済み。
- merge commit: `1d5e13cb9c3cbb7be73ff9ba1568d5712ceefe24`
- 完了内容: `split-2 / split-3 / split-4` の投稿順 `split_1 -> split_n`、main image 未選択 guard、個別 PNG / JPEG export の境界、ZIP / 複数形式 export を後続候補に閉じる policy / docs / copy を確認。
- 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、幅別確認 `390 / 820 / 1024 / 1280 / 1366px`。

## Freeze 後の現行境界

### Schedule Calendar

- freeze 済み:
  - 月 / 週 / 日表示、予定管理、投稿補助、予定一覧、設定、バックアップ / 復元。
  - `localStorage` version `2` の保存 payload と、旧形式読み込みの normalizer。
  - undo toast、投稿補助テンプレート、保存済みハッシュタグセット、input length / copy guard、Schedule -> Thumbnail / SNS Split handoff。
- freeze 後候補:
  - Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。

### Thumbnail Editor

- freeze 済み:
  - 用途別プリセットを選び、文字と立ち絵を差し替え、品質を確認して PNG / JPEG 1枚を書き出す体験。
  - 登録済み装飾素材を追加する軽い素材パネル。
  - user material library UI v1 は、画像本体を IndexedDB に置き、draft / localStorage には軽量 ref を残す境界まで完了済み。
  - user material library management v1 は、容量上限、読み込み不能 fallback、再追加 / 整理導線の最小 UI まで完了済み。
  - preset discovery、partial preset apply、user material storage boundary、font fallback、preset batch readiness、quality guard は contract / helper 境界まで固定済み。
  - Schedule Calendar 由来の予定テキスト handoff と、Thumbnail -> SNS Split の IndexedDB 一時画像 handoff。
- freeze 後候補:
  - quality guard の export 前確認 / 可読性 hint のさらなる小拡張。
  - 縦長 / 正方形 variant body、font asset 追加、preset batch 本体追加。
  - crop 仕様、text / image layer schema、public asset / font 追加は別PRで明示的に扱う。

### SNS Split Image Maker

- freeze 済み:
  - X向け `2分割 / 3分割 / 4分割`。
  - メイン画像 + 追加画像 / フレーム、境界調整、投稿順 `split_1 -> split_n` の個別 PNG / JPEG export。
  - draft metadata は `localStorage`、画像本体は IndexedDB に分離。
  - Schedule Calendar 由来では告知文メモとファイル名候補だけを受け取り、Thumbnail Editor 由来では一時画像を `base` として受け取る。
- freeze 後候補:
  - ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

## 今すぐ着手可能な次PR候補

### Candidate 3: Thumbnail Editor quality guard export-preflight polish

- 目的:
  - 既存の `サムネ品質` / `注意 n件` / `品質チェックOK` の軽い体験を維持したまま、書き出し前に見落としやすい可読性 / 見切れ / 画像未解決の確認を warning / hint として少しだけ増やす。
- 入れるもの:
  - selected layer と overall summary の warning / hint の小拡張。
  - export 前に読める短い品質 summary の contract / UI 最小調整。
  - draft を mutate しない確認。
  - `thumbnail-quality-guard` / `thumbnail-standee-placement` / `thumbnail-material-assets` / `tool-handoff` の既存境界維持。
- 入れないもの:
  - 自動修正、AI生成、modal tutorial、重い onboarding。
  - preset 本体、preset batch 本体、variant body、font asset、public asset 追加。
  - crop 仕様、text / image layer schema、storage schema 変更。
  - Schedule Calendar / SNS Split Image Maker の実装修正。
  - Next.js / React のバージョン変更。
- 主な検証:
  - `node scripts/thumbnail-quality-guard-contract.mjs`
  - `node scripts/thumbnail-standee-placement-contract.mjs`
  - `node scripts/thumbnail-material-assets-contract.mjs`
  - `node scripts/tool-handoff-contract.mjs`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `git diff --check`
  - UI / 表示文言を触った場合のみ `390 / 820 / 1024 / 1280 / 1366px`
- 完了条件:
  - quality guard が warning / hint のまま維持され、自動修正や重い誘導に広がっていない。
  - export 前 summary が短く、既存 `サムネ品質` 表示と矛盾しない。
  - draft / preset / material / schema / handoff 境界を壊していない。
  - 検証結果と、幅別確認または不要理由が `task.md` に残っている。

## 次セッション用プロンプト

```text
対象repo: D:\V_streamer_tools

前提:
- まず AGENTS.md と task.md を読む
- PR #97 `[codex] Polish SNS split export boundary` が main / origin/main に merge 済みか確認する
- この task.md 整理PR `[codex] Organize task board after PR97` が未mergeなら、新規実装へ進まず merge待ち / review対応が必要かだけを blocker summary にする
- main 直作業は避ける
- origin/main から次task用の feature branch / `.worktrees/...` を切る
- ローカル main の未コミット変更があっても触らない

目的:
- Candidate 3: Thumbnail Editor quality guard export-preflight polish を PR-sized に進める
- 既存の `サムネ品質` / `注意 n件` / `品質チェックOK` の軽い体験を維持したまま、書き出し前に見落としやすい可読性 / 見切れ / 画像未解決の確認を warning / hint として少しだけ増やす

読むもの:
- AGENTS.md
- task.md
- docs/archive/TASK_HISTORY_2026-05.md
- docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md
- docs/design-thumbnail-editor.md
- scripts/thumbnail-quality-guard-contract.mjs
- scripts/thumbnail-standee-placement-contract.mjs
- scripts/thumbnail-material-assets-contract.mjs
- scripts/tool-handoff-contract.mjs
- 必要なら `lib/thumbnail-editor.ts` と `components/thumbnail-editor/ThumbnailEditorApp.tsx`

入れるもの:
- selected layer と overall summary の warning / hint の小拡張
- export 前に読める短い品質 summary の contract / UI 最小調整
- draft を mutate しない確認
- 既存 `サムネ品質` 表示、`注意 n件` / `品質チェックOK` の表現維持
- 意味のある実装後は task.md を更新する

入れないもの:
- 自動修正
- AI生成
- modal tutorial / 重い onboarding
- preset 本体追加 / preset batch 本体
- 縦長 / 正方形 variant body
- font asset / public asset 追加
- crop 仕様変更
- text / image layer schema 変更
- storage schema 変更
- Schedule Calendar / SNS Split Image Maker の実装修正
- Next.js / React のバージョン変更

検証:
- node scripts/thumbnail-quality-guard-contract.mjs
- node scripts/thumbnail-standee-placement-contract.mjs
- node scripts/thumbnail-material-assets-contract.mjs
- node scripts/tool-handoff-contract.mjs
- npm run lint
- npx tsc --noEmit
- git diff --check
- UI / 表示文言を触った場合だけ 390 / 820 / 1024 / 1280 / 1366px を確認し task.md に残す

完了条件:
- origin/main 起点の worktree / feature branch で作業している
- quality guard が warning / hint のまま維持され、自動修正や重い誘導に広がっていない
- export 前 summary が短く、既存 `サムネ品質` 表示と矛盾しない
- draft / preset / material / schema / handoff 境界を壊していない
- Schedule Calendar / SNS Split Image Maker の実装へ変更を広げていない
- 必要な検証が通っている
- task.md に実施結果と検証結果が残っている
- commit / push / draft PR 作成まで進める
```

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
