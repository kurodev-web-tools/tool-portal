# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 `[codex] Align portal entry freeze copy` から PR #94 `[codex] Add thumbnail user material management guards` まで、`main` / `origin/main` に merge 済み。
- PR #94 の merge commit は `77ce20233fc56c665919273da8abddcc7a5f8630`。
- static export RSC alias fix、production static serve final QA、user material management guard の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の PR #91 / PR #92 / PR #94 欄を参照する。

## Freeze closeout state

- Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 前 final QA は PR #92 で完了済み。
- static export RSC alias は PR #91 で `postbuild` 生成と `--check` 検証が入っている。
- task board closeout は PR #93 で完了済み。
- Thumbnail Editor user material library management v1 は PR #94 で完了済み。
- PR #92 の production static serve final QA では、`1024px` の `/tools` と3ツールで dotted `__next.tools*.txt` が 200 / 304、`1280px` / `1366px` で `__next.*.txt` の 400+ response なし。
- docs / task 整理のみの変更では幅別ブラウザ再確認は不要。UI / 表示文言を触る後続PRでは幅別確認を残す。

## Current PR result

- 2026-05-13 `codex/schedule-calendar-input-copy-guard` / `.worktrees/schedule-calendar-input-copy-guard` で Candidate 1 を実施。
- 予定タイトル `120` 文字、予定ごとの告知文 `1200` 文字、予定 / テンプレートのハッシュタグ `300` 文字、テンプレート本文 `2000` 文字を上限にした。
- UI には counters と上限付近の warning copy のみを追加し、重い onboarding / modal tutorial は入れていない。
- `localStorage` key と version `2` は維持。旧形式 / 既存 payload は normalizer で同じ上限へ丸める。
- Schedule -> Thumbnail / SNS Split handoff は URL 本文なしのまま、sessionStorage payload へ入る title / announcementText / hashtags を同じ境界で clamp する。
- Thumbnail Editor / SNS Split Image Maker の実装、storage schema、Next.js / React version は変更していない。
- 幅別確認: `390 / 820 / 1024 / 1280 / 1366px` で予定フォーム counters 表示、layout signal OK、console error / warning 0。`1366px` でテンプレート本文 / タグ counters と title 上限 warning も確認。
- 検証: `node scripts/tool-handoff-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は成功。最終確認では `git diff --check` も実行する。

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
  - user material library management v1 は、容量上限、読み込み不能 fallback、再追加 / 整理導線の最小 UI まで完了済み。
  - preset discovery、partial preset apply、user material storage boundary、font fallback、preset batch readiness、quality guard は contract / helper 境界まで固定済み。
  - Schedule Calendar 由来の予定テキスト handoff と、Thumbnail -> SNS Split の IndexedDB 一時画像 handoff。
- freeze 後候補:
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

### Candidate 1: Schedule Calendar input length / copy guard

- 状態:
  - このブランチで実装 / 検証中。merge 後は Candidate 2 に進む。
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

### Candidate 2: SNS Split Image Maker export boundary polish

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
- Schedule Calendar input length / copy guard PR が main / origin/main に merge 済みか確認する
- 未mergeなら新規実装へ進まず、merge待ち / review対応が必要かだけを blocker summary にする
- main 直作業は避ける
- origin/main から次task用の feature branch / `.worktrees/...` を切る
- ローカル main の未コミット変更があっても触らない

目的:
- Candidate 2: SNS Split Image Maker export boundary polish を PR-sized に進める
- 現行の個別 PNG / JPEG export を保ったまま、ZIP / 複数形式 export を現行機能に見せない境界と、未選択 guard / 成功 feedback を再確認する

読むもの:
- AGENTS.md
- task.md
- docs/design-sns-split-image-maker.md
- docs/archive/TASK_HISTORY_2026-05.md
- scripts/tool-handoff-contract.mjs
- scripts/sns-split-image-maker-contract.mjs
- 必要なら SNS Split Image Maker 関連 component / storage helper / contract

入れるもの:
- export boundary の contract / docs / copy 最小調整
- split-2 / split-3 / split-4 の出力順と main image guard の確認
- 未選択時の guard と export 成功 feedback が現行 freeze 境界と矛盾しない確認
- 必要なら UI を軽く触る。ただし重い onboarding / modal tutorial にはしない
- 意味のある実装後は task.md を更新する

入れないもの:
- ZIP 出力本体
- X 以外の比率
- 複数形式一括 export
- storage schema 変更
- ログイン / サーバー同期
- シリーズ一括編集 / 例外日
- AI生成
- Schedule Calendar / Thumbnail Editor の実装修正
- 重い onboarding / modal tutorial
- Next.js / React のバージョン変更

検証:
- node scripts/sns-split-image-maker-contract.mjs
- node scripts/tool-handoff-contract.mjs
- npm run lint
- npx tsc --noEmit
- git diff --check
- UI / 表示文言を触った場合だけ 390 / 820 / 1024 / 1280 / 1366px を確認し task.md に残す

完了条件:
- origin/main 起点の worktree / feature branch で作業している
- SNS Split の現行 export は個別 PNG / JPEG として読める
- ZIP / 複数形式 export を現行機能のように見せていない
- Schedule Calendar / Thumbnail Editor の実装へ変更を広げていない
- 必要な検証が通っている
- task.md に実施結果と検証結果が残っている
- commit / push / draft PR 作成まで進める

その次の流れ:
- この PR merge 後に、別セッションで次の freeze 後候補を task.md から選ぶ
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
