# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 `[codex] Align portal entry freeze copy` から PR #92 `[codex] Freeze production final QA` まで、`main` / `origin/main` に merge 済み。
- PR #92 の merge commit は `05c4223de146976d5e84ff2b30e79e17854b261c`。この closeout は PR #92 merge 後の `origin/main` 起点で行う。
- static export RSC alias fix と production static serve final QA の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の PR #91 / PR #92 欄を参照する。

## Freeze closeout state

- Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 前 final QA は PR #92 で完了済み。
- static export RSC alias は PR #91 で `postbuild` 生成と `--check` 検証が入っている。
- PR #92 の production static serve final QA では、`1024px` の `/tools` と3ツールで dotted `__next.tools*.txt` が 200 / 304、`1280px` / `1366px` で `__next.*.txt` の 400+ response なし。
- この closeout では UI / 表示文言 / tool 実装 / storage schema / export 機能本体は触らない。
- docs / task 整理のみのため、幅別ブラウザ再確認は不要。UI / 表示文言を触る後続PRでは幅別確認を残す。

## Freeze 後の現行境界

### Schedule Calendar

- freeze 済み:
  - 月 / 週 / 日表示、予定管理、投稿補助、予定一覧、設定、バックアップ / 復元。
  - `localStorage` version `2` の保存 payload と、旧形式読み込みの normalizer。
  - undo toast、投稿補助テンプレート、保存済みハッシュタグセット、Schedule -> Thumbnail / SNS Split handoff。
- freeze 後候補:
  - Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。

### Thumbnail Editor

- freeze 済み:
  - 用途別プリセットを選び、文字と立ち絵を差し替え、品質を確認して PNG / JPEG 1枚を書き出す体験。
  - 登録済み装飾素材を追加する軽い素材パネル。
  - user material library UI v1 は、画像本体を IndexedDB に置き、draft / localStorage には軽量 ref を残す境界まで完了済み。
  - preset discovery、partial preset apply、user material storage boundary、font fallback、preset batch readiness、quality guard は contract / helper 境界まで固定済み。
  - Schedule Calendar 由来の予定テキスト handoff と、Thumbnail -> SNS Split の IndexedDB 一時画像 handoff。
- freeze 後候補:
  - ユーザー素材ライブラリ管理 UI の容量 / 復旧 / 整理導線。
  - 縦長 / 正方形 variant body、font asset 追加、preset batch 本体追加、quality guard のさらなる拡張。
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

### Candidate 1: Thumbnail Editor user material library management v1

- 状態: implemented in current branch
- 目的:
  - 既存 user material UI v1 の保存 / 削除 / 置換境界を保ったまま、容量上限、読み込み不能、再追加、整理導線を小さく固める。
- 入れるもの:
  - 既存 IndexedDB / lightweight ref 境界の contract 追加。
  - 容量超過、壊れた参照、削除済み fallback、再追加 guidance の copy / helper 最小調整。
  - `task.md` への検証結果。
- 入れないもの:
  - 新規 public asset、font asset、preset body、variant body、crop 仕様変更、text / image layer schema 変更、AI生成、他ツール実装。
- 主な検証:
  - `node scripts/thumbnail-material-assets-contract.mjs`
  - `node scripts/tool-handoff-contract.mjs`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `git diff --check`
- 実施結果:
  - PR #92 `[codex] Freeze production final QA` は merge commit `05c4223de146976d5e84ff2b30e79e17854b261c`、freeze closeout task cleanup は PR #93 `[codex] Organize freeze closeout task board` / merge commit `84153e88ee38d195587d2820e5d808095ba7d86c` として `origin/main` に merge 済みであることを確認した。
  - `codex/thumbnail-user-material-management-v1` / `.worktrees/thumbnail-user-material-management-v1` を `origin/main` 起点で作成して実装した。ローカル `main` は触っていない。
  - `thumbnailUserMaterialStoragePolicy` に `最大24件 / 1点8MB / 合計48MB` の軽い容量境界を追加し、使用量 summary / 追加可否 helper / byte 表示 helper を contract 化した。
  - user material 追加時は既存 `ThumbnailUserMaterialRef` metadata から容量を判定し、画像本体は引き続き IndexedDB に保存、localStorage / draft / handoff payload へ混ぜない。
  - IndexedDB から画像 URL を解決できない ref は `読み込み失敗` fallback へ寄せ、既存 layer geometry / crop / lightweight ref は維持する。
  - ユーザー素材パネルには容量表示と「要再追加の素材は置換で復旧 / 不要なら削除」の短い整理導線だけを追加した。重い管理画面や modal tutorial は入れていない。
  - public asset、font asset、preset body、variant body、crop 仕様、text / image layer schema、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
- 幅別表示結果:
  - `next dev` / `http://127.0.0.1:3020/tools/thumbnail-editor` を Playwright で確認。
  - `390 / 820px`: 素材タブを開き、`h1` 表示、横 overflow なし、console error / warning なし、ユーザー素材の容量 copy / 再追加 guidance 表示を確認。
  - `1024 / 1280 / 1366px`: 初期表示で `h1` 表示、横 overflow なし、console error / warning なし、ユーザー素材の容量 copy / 再追加 guidance 表示を確認。
- 検証:
  - `node scripts/thumbnail-material-assets-contract.mjs` PASS。RED は `formatThumbnailUserMaterialBytes` 未export で失敗することを確認済み。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。

### Candidate 2: Schedule Calendar input length / copy guard

- 目的:
  - 予定タイトル、告知文、ハッシュタグ、テンプレート本文の長文入力で保存 / 投稿補助 / handoff が読みにくくならない境界を決める。
- 入れるもの:
  - 文字数上限 / カウンター / warning copy の contract または最小 UI。
  - 既存 `localStorage` version `2` と handoff payload を壊さない確認。
- 入れないもの:
  - storage schema 変更、Google Calendar 連携、ログイン、サーバー同期、週間予定画像生成。
- 主な検証:
  - `node scripts/tool-handoff-contract.mjs`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `git diff --check`
  - UI を触った場合のみ `390 / 820 / 1024 / 1280 / 1366px`

### Candidate 3: SNS Split Image Maker export boundary polish

- 目的:
  - 現行の個別 PNG / JPEG export を保ったまま、ZIP / 複数形式 export を現行機能に見せない境界と、未選択 guard / 成功 feedback を再確認する。
- 入れるもの:
  - export boundary の contract / docs / copy 最小調整。
  - split-2 / split-3 / split-4 の出力順と main image guard の確認。
- 入れないもの:
  - ZIP 出力本体、X以外比率、複数形式一括 export、重い onboarding。
- 主な検証:
  - `node scripts/sns-split-image-maker-contract.mjs`
  - `node scripts/tool-handoff-contract.mjs`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `git diff --check`
  - UI を触った場合のみ `390 / 820 / 1024 / 1280 / 1366px`

## 次セッション用プロンプト

```text
対象repo: D:\V_streamer_tools

前提:
- まず AGENTS.md と task.md を読む
- PR #92 `[codex] Freeze production final QA` と、その後の freeze closeout task cleanup PR が main / origin/main に merge 済みか確認する
- 未mergeなら新規実装へ進まず、merge待ち / review対応が必要かだけを blocker summary にする
- main 直作業は避ける
- origin/main から次task用の feature branch / `.worktrees/...` を切る
- ローカル main の未コミット変更があっても触らない

目的:
- Thumbnail Editor user material library management v1 を PR-sized に進める
- 既存 user material UI v1 の IndexedDB / lightweight ref 境界を保ったまま、容量上限、読み込み不能、再追加、削除済み fallback、整理導線を小さく固める

読むもの:
- AGENTS.md
- task.md
- docs/design-thumbnail-editor.md
- docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md
- docs/archive/TASK_HISTORY_2026-05.md
- scripts/thumbnail-material-assets-contract.mjs
- scripts/tool-handoff-contract.mjs

入れるもの:
- user material metadata と画像本体の分離境界を壊さない contract / helper / copy の必要最小限の調整
- 容量超過、壊れた参照、削除済み fallback、再追加 guidance の検証
- 必要なら UI を軽く触る。ただし重い管理画面や modal tutorial にはしない
- 意味のある実装後は task.md を更新する

入れないもの:
- public asset 追加
- font asset 追加
- preset 本体追加 / 差し替え
- variant body 実装
- crop 仕様変更
- text / image layer schema 変更
- AI生成
- Schedule Calendar / SNS Split Image Maker の実装修正
- 重い onboarding / modal tutorial
- Next.js / React のバージョン変更

検証:
- node scripts/thumbnail-material-assets-contract.mjs
- node scripts/tool-handoff-contract.mjs
- npm run lint
- npx tsc --noEmit
- git diff --check
- UI / 表示文言を触った場合だけ 390 / 820 / 1024 / 1280 / 1366px を確認し task.md に残す

完了条件:
- origin/main 起点の worktree / feature branch で作業している
- user material の画像本体が localStorage / draft / handoff payload に混ざらない
- 既存 registered material / preset body / crop / schema / other tools を壊していない
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
