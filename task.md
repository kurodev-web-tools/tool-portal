# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 `[codex] Align portal entry freeze copy` は `main` / `origin/main` に merge 済み。merge commit は `e2ef089`。
- PR #87 `[codex] Organize freeze docs task board` は `main` / `origin/main` に merge 済み。merge commit は `f6f7d08`。

## Freeze 前の現行境界

### Schedule Calendar

- 現行 freeze 対象:
  - 月 / 週 / 日表示、予定管理、投稿補助、予定一覧、設定、バックアップ / 復元。
  - `localStorage` version `2` の保存 payload と、旧形式読み込みの normalizer。
  - undo toast、投稿補助テンプレート、保存済みハッシュタグセット、Schedule -> Thumbnail / SNS Split handoff。
- freeze 前に見るもの:
  - 既存データ、localStorage migration、主要幅表示、入力導線の final QA。
  - `docs/SCHEDULE_CALENDAR_README.md` と `docs/SCHEDULE_CALENDAR_STABILITY_CHECK_2026-04-28.md` の未確認範囲。
- freeze 後候補:
  - Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。

### Thumbnail Editor

- 現行 freeze 対象:
  - 用途別プリセットを選び、文字と立ち絵を差し替え、品質を確認して PNG / JPEG 1枚を書き出す体験。
  - 登録済み装飾素材を追加する軽い素材パネル。ユーザー素材の保存 / 削除 / 置換 / 容量管理 UI は含めない。
  - preset discovery、partial preset apply、user material storage boundary、font fallback、preset batch readiness、quality guard は contract / helper 境界まで固定済み。
  - Schedule Calendar 由来の予定テキスト handoff と、Thumbnail -> SNS Split の IndexedDB 一時画像 handoff。
- freeze 前に見るもの:
  - 汎用ペイントツールや多機能制作ツールに見える表現が増えていないか。
  - 現行機能、軽い登録済み素材パネル、contract-only / readiness-only、ユーザー素材管理UIの境界が docs 上で混ざっていないか。
- freeze 後候補:
  - 縦長 / 正方形 variant body、ユーザー素材ライブラリ管理 UI、font asset 追加、preset batch 本体追加、quality guard のさらなる拡張。
  - crop 仕様、text / image layer schema、public asset / font 追加は別PRで明示的に扱う。

### SNS Split Image Maker

- 現行 freeze 対象:
  - X向け `2分割 / 3分割 / 4分割`。
  - メイン画像 + 追加画像 / フレーム、境界調整、投稿順 `split_1 -> split_n` の個別 PNG / JPEG export。
  - draft metadata は `localStorage`、画像本体は IndexedDB に分離。
  - Schedule Calendar 由来では告知文メモとファイル名候補だけを受け取り、Thumbnail Editor 由来では一時画像を `base` として受け取る。
- freeze 前に見るもの:
  - メイン画像未選択 guard、handoff 後の次アクション、個別 download の環境差。
  - 現行 export が ZIP / 複数形式一括出力のように読めないか。
- freeze 後候補:
  - ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

## Active

### P0: Freeze final QA / docs consistency

- 状態: review-ready
- 目的:
  - Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 対象と freeze 後候補を、docs と portal entry の表現で再確認する。
  - 新機能追加ではなく、最終QAで固定する範囲と後続PRへ送る範囲を切り分ける。
- 次アクション:
  - `docs/SCHEDULE_CALENDAR_README.md`、`docs/design-thumbnail-editor.md`、`docs/design-sns-split-image-maker.md`、`docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` の freeze / future 表現を再読する。
  - UI 文言を触る場合だけ `390 / 820 / 1024 / 1280 / 1366px` の幅別確認を残す。
- 完了条件:
  - ZIP、X以外比率、複数形式 export、重い onboarding、Thumbnail Editor の大きな次機能が現行機能のように読めない。
  - final QA で見る対象と freeze 後候補が task / docs 間で矛盾しない。
  - 関連 contract、lint、typecheck、`git diff --check` の結果を記録する。
- 実施結果:
  - PR #87 merge commit `f6f7d08` が `origin/main` に含まれることを確認し、`codex/freeze-final-qa` / `.worktrees/freeze-final-qa` を `origin/main` 起点で作成。
  - Schedule Calendar docs は、予定追加 / 編集 / 削除 / undo / 投稿補助 / handoff を freeze 対象として読み取れる。Google Calendar、ログイン、週間予定画像生成は non-goals / freeze 後候補として読める。
  - Thumbnail Editor docs は、用途別プリセット、文字差し替え、立ち絵 / 画像差し替え、品質確認、PNG / JPEG 1枚 export を freeze 対象として読み取れる。登録済み装飾素材の軽い追加パネルと、future のユーザー素材管理 UI の境界を明確化した。
  - SNS Split Image Maker docs は、X向け `2分割 / 3分割 / 4分割`、メイン画像 guard、個別 PNG / JPEG export、Schedule / Thumbnail handoff の next action を freeze 対象として読み取れる。ZIP、X 以外比率、複数形式 export、重い onboarding は freeze 後候補として読める。
  - Cross tool handoff は、URL本文なし、`sessionStorage` token、Thumbnail -> SNS の IndexedDB 一時画像境界として contract / docs 上で崩れていない。
  - 明確な copy drift として、root / home metadata が Schedule Calendar のみ提供のように読めたため、公開中3ツール表記へ修正し、`tool-portal-entry` contract の検査対象へ追加。
- 幅別表示結果:
  - Chrome DevTools viewport emulation / `http://localhost:3003` で確認。
  - `/tools/schedule-calendar`: `390 / 820 / 1024 / 1280 / 1366px` で `h1` 表示、横 overflow なし、console error なし。
  - `/tools/thumbnail-editor`: `390 / 820 / 1024 / 1280 / 1366px` で `h1` 表示、横 overflow なし、console error なし。
  - `/tools/sns-split-image-maker`: `390 / 820 / 1024 / 1280 / 1366px` で `h1` 表示、横 overflow なし、console error なし。
- 検証:
  - `node scripts/sns-split-image-maker-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `node scripts/tool-portal-entry-contract.mjs` PASS。
  - `node scripts/thumbnail-material-assets-contract.mjs` PASS。
  - `node scripts/thumbnail-quality-guard-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-batch-readiness-contract.mjs` PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。

## 残タスク候補

### Schedule Calendar

- final QA:
  - 既存データ、localStorage migration、主要幅、投稿補助、handoff の回帰確認。
- 後続PR候補:
  - 入力文字数上限 / カウンターの扱い。
  - 週間予定画像生成を Thumbnail Editor preset 起点にするか、Schedule Calendar 内で生成するかの設計。
  - 例外日、繰り返し終了日、シリーズ一括編集。

### Thumbnail Editor

- final QA:
  - preset selection -> text replacement -> standee replacement / placement -> quality guard -> export の流れ。
  - 登録済み装飾素材の軽い追加パネルは、ユーザー素材の保存 / 削除 / 置換 / 容量管理 UI と混同しない。
  - Schedule Calendar 由来テキストの再適用と Thumbnail -> SNS Split handoff。
  - `サムネ品質` / `注意 n件` / `品質チェックOK` の軽い品質ガード表現。
- 後続PR候補:
  - variant body 実装。
  - ユーザー素材ライブラリ管理 UI。
  - self-host font / repo同梱 font の検討。
  - preset batch 本体追加。
  - quality guard expansion の追加分。

### SNS Split Image Maker

- final QA:
  - `split-2 / split-3 / split-4` の出力順、メイン画像未選択 guard、handoff 後 next action。
  - 個別 PNG / JPEG export と success toast。
- 後続PR候補:
  - ZIP 出力。
  - X 以外の比率。
  - 複数形式 export。
  - 初回 onboarding の重い導線。

## 直近の棚卸し

- 2026-05-12:
  - PR #86 merge 済みを確認し、`origin/main` 起点で `codex/freeze-docs-task-cleanup` / `.worktrees/freeze-docs-task-cleanup` を作成。
  - `task.md` から完了済み P0〜P11 の詳細ログを外し、`docs/archive/TASK_HISTORY_2026-05.md` へ退避。
  - `task.md` は現在の freeze 境界、次アクション、残タスク候補、未確認範囲が読める active-only board へ再整理。
  - アプリ UI / 表示文言 / tool 実装 / storage schema / export 機能本体は変更していない。
- 未確認範囲:
  - docs / task.md のみの変更のため、幅別ブラウザ確認は未実施。
  - UI / 表示文言を触る後続PRでは `390 / 820 / 1024 / 1280 / 1366px` を確認する。
- 検証:
  - `node scripts/sns-split-image-maker-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `node scripts/tool-portal-entry-contract.mjs` PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。

## Verification baseline

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/tool-portal-entry-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Archive / reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
