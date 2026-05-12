# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- Thumbnail Editor は「用途別プリセットを選んで、文字と立ち絵を差し替える VTuber 向けサムネ組み立てツール」として維持する。
- Thumbnail Editor では、ペイントツール / Canva 的な汎用制作ツールに見えすぎる文言や導線を増やさない。

## この後の順序

1. Thumbnail Editor の残設計を整理する。
   - variant / partial apply / 素材ライブラリ / font / preset batch の順序と境界を固定する。
   - 先に contract を置ける単位へ分ける。
2. Thumbnail Editor の `preset variants` を設計する。
   - 縦横、用途、canvas size、既存 preset id との関係を決める。
   - schema 変更が必要かどうかを先に判断する。
3. Thumbnail Editor の `partial preset apply` を設計する。
   - 文字レイヤー、立ち絵レイヤー、背景 / 装飾 / 色だけをどう守って適用するか決める。
   - 一括配置、自動分割、複数選択に見える表現は入れない。
4. Thumbnail Editor の共通素材ライブラリを設計する。
   - ユーザー追加素材は IndexedDB など画像向けの保管を前提にする。
   - localStorage へ画像本体を詰めない。
   - delete / replace / 容量上限 / 復旧不能時の表示を決める。
5. Thumbnail Editor の font policy を決める。
   - 外部 CDN / font 追加は原則しない。
   - 使うなら self-host / repo 同梱 / fallback の範囲を先に決める。
6. Thumbnail Editor の preset batch を追加検討する。
   - 候補: 初配信、記念配信、耐久配信、歌枠、雑談、ゲーム実況、告知、切り抜き。
   - preset 本体の変更は、variant / partial apply の方針が固まってから行う。
7. Schedule Calendar と SNS Split Image Maker の仕上げに戻る。
   - Schedule Calendar から Thumbnail Editor への引き継ぎ方を先に固定する。
   - SNS Split Image Maker は output UX と freeze 条件を先に詰める。

## Active

### P0: task.md の運用整理

- 状態: done
- 目的:
  - `task.md` を履歴ログではなく、次に進むための軽い作業ボードに戻す。
  - Thumbnail Editor の残作業順を先頭で読めるようにする。
- 完了条件:
  - 完了済みの詳細ログが本文の主役になっていない。
  - Thumbnail Editor の次順序が contract-first で読める。
  - Schedule Calendar / SNS Split Image Maker の残作業が混ざりすぎていない。
  - `git diff --check` を通す。
- 実施内容:
  - 完了済みの長い実装ログを本文から外し、現在の前提、次順序、Active、各ツールの残タスクへ再構成した。
  - Thumbnail Editor の次順序を `残設計 -> preset variants -> partial preset apply -> common material library -> font policy -> preset batch -> 他ツール仕上げ` に整理した。
  - UI / code / contract / asset / preset 本体は変更していない。
- 検証:
  - `git diff --check` PASS。
  - UI 変更なしのため幅別確認は未実施。

### P1: Thumbnail Editor 残設計の切り分け

- 状態: next
- 目的:
  - compact guidance 追加の次に、実装順を崩さず大きい設計を分割する。
- 次に決めること:
  - `preset variants` を preset 定義で持つか、preset family / metadata で持つか。
  - `partial preset apply` が守る対象を text / image / background / decoration / color のどこまでにするか。
  - 素材ライブラリの永続化をどの storage boundary に置くか。
- 入れないもの:
  - 新機能の実装。
  - preset 本体の追加。
  - asset 追加。
  - crop 仕様変更。
  - text layer / image layer schema 変更。

## Thumbnail Editor

### 固定済みの方向性

- ツールの見え方:
  - 用途別プリセットを選ぶ。
  - 文字を差し替える。
  - 立ち絵画像を追加 / 差し替えて配置する。
  - 最後に品質を確認して書き出す。
- 品質ガード:
  - `warning / hint / ok` のみにする。
  - `サムネ品質` / `注意 n件` / `品質チェックOK` の表現を壊さない。
  - 自動修正や AI 生成に見える文言を入れない。
- 変更禁止に近い領域:
  - crop 仕様。
  - text layer / image layer schema。
  - 既存 preset 本体。
  - 素材 asset と素材ライブラリ登録。

### 直近完了

- PR #72 `[codex] Clarify thumbnail editor panel guidance`
  - main / origin/main に merge 済み。
  - panel guidance の表現を軽く調整。
- PR #73 `[codex] Clarify thumbnail editor first flow guidance`
  - main / origin/main に merge 済み。
  - 初回操作で、preset selection -> text replacement -> standee replacement / placement -> export の流れが読めるように短文だけ調整。

### 残タスク候補

- preset variants:
  - 横長 / 縦長 / 正方形など、用途と出力先の切り分けを決める。
  - 既存 preset を壊さず、追加単位を小さくする。
- partial preset apply:
  - レイヤーを保持したまま色や背景だけを変える導線を検討する。
  - 「一括自動制作」に見えないようにする。
- common material library:
  - user materials の登録、削除、置換、容量、復旧不能時の扱いを決める。
  - 画像本体は localStorage に置かない。
- font management:
  - VTuber サムネらしい書体選択をどう扱うか決める。
  - 外部 CDN 追加はしない。
- preset batch:
  - 初配信 / 記念配信 / 耐久配信などの追加候補を整理する。
  - variant / partial apply の仕様が固まるまで本体追加は待つ。
- quality guard expansion:
  - 文字の可読性、立ち絵の見切れ、書き出し前確認を必要最小限で拡張する。
  - 重い説明、チュートリアル、モーダル、チェックリスト化は避ける。

### Thumbnail Editor verification baseline

変更内容に応じて必要なものだけ選ぶ。

- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-discovery-contract.mjs`
- `node scripts/thumbnail-layer-management-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run build`

## Schedule Calendar

### 残タスク

- 仕上げ前の安定性確認。
  - 既存データ、localStorage migration、主要幅の表示を確認する。
- 入力導線の細部整理。
  - 番組タイトル、説明、カテゴリ、配信プラットフォームの編集しやすさ。
  - 文字数上限やカウンターが必要かを決める。
- Thumbnail Editor への引き継ぎ。
  - 週間予定画像をそのまま作るのか、Thumbnail Editor の preset 起点へ渡すのかを決める。

### Schedule Calendar verification baseline

- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- 必要に応じて幅別確認: `390 / 820 / 1024 / 1280 / 1366px`

## SNS Split Image Maker

### 残タスク

- core UX の freeze 条件を決める。
- 初回例、操作 guard、出力後の次アクションを軽く整える。
- export 前確認を必要最小限にする。
- ZIP 出力、X 以外の比率、複数形式は後続候補として分ける。

### SNS Split Image Maker verification baseline

- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI 変更時は幅別確認を残す。

## Portal / Cross Tool

- tool portal の導線が各ツールの現在地と矛盾しないか確認する。
- Schedule Calendar -> Thumbnail Editor -> SNS Split Image Maker の流れを、必要になった段階で共通 doc に切り出す。
- storage policy、asset policy、export policy はツール横断で再利用できる形に寄せる。

## task.md 更新ルール

- Active には、今から作業するものと次に作業するものだけを置く。
- 完了済みの詳細ログは本文に溜めない。
- 長い調査結果、比較、過去ログは `docs/archive` か PR 本文に逃がす。
- 各タスクは以下だけ残す。
  - 目的。
  - 状態。
  - 次アクション。
  - 完了条件。
  - 検証結果。
- 「後でやるかもしれない」案は、Active ではなく各ツールの残タスク候補に置く。

## Archive / reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
