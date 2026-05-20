# Portal Settings Future Direction

## Purpose

Portal shell の Settings 導線を、公開版 polish 後に拡張するときの判断基準を残す。
現時点では実装タスクではなく、将来追加予定の UX 方針として扱う。

## Current Baseline

- HOME / Tools の header には `Language` / `Theme` を表示したままにする。
- 各ツール画面では sidebar / drawer の下部に `Settings` を常時表示する。
- 現在 Settings に入れるものは `Language` と `Theme` のみ。
- 公開直後は、言語切り替えが見えること自体を English support のサインとして残す。

## Future Direction

### Phase A: Keep Current Always-Visible Settings

- 項目が `Language` / `Theme` だけの間は、常時表示でよい。
- PC / tablet landscape では sidebar 下部に見える状態を維持する。
- tablet portrait / mobile drawer では drawer 下部に Settings block を置く。

### Phase B: Move To Settings Button + Popover

Settings 内の項目が増えたら、常時展開ではなく格納タイプへ移行する。

- sidebar / drawer 下部には `Settings` button を常時表示する。
- button を押すと popover / dropdown / small panel で設定を開く。
- first-run tips、表示密度、軽い案内表示、言語 / テーマ程度なら popover を優先する。
- ツール本体の作業領域を圧迫しないことを優先する。

移行目安:

- Settings 項目が 3 - 4 個を超える。
- 説明文つきの設定が増える。
- 表示状態や保存状態を見せる必要が出る。
- 将来ログイン導線が Settings 周辺に入る。

### Phase C: Consider A Dedicated Settings Page

設定内容が重くなったら、popover ではなく dedicated page を検討する。

page 化を検討する条件:

- ログイン / アカウント設定を入れる。
- 外部連携設定を入れる。
- 通知、privacy、data retention、import / export など説明が必要な項目を入れる。
- tool ごとの詳細設定を section 分けして扱う。
- 危険操作や確認 step を伴う設定を入れる。

候補 route:

- `/settings`
- `/tools/settings`

route は、Portal 全体の設定か Tools 専用設定かが決まってから選ぶ。

## Non-Goals For The Current Polish

- 設定ページ新設。
- ログイン実装。
- 外部連携設定。
- 多言語 tips / 初回案内。
- tool body 内の詳細設定再設計。

## Notes For Future Implementation

- `Language` と `Theme` は portal shell の global setting として扱う。
- tool 固有の設定は各 tool body の settings panel と混ぜない。
- sidebar 自体にはスクロールを入れない。Settings が増える場合は popover 内または dedicated page 側で overflow を処理する。
- `1024 - 1279px` の left rail は compact button を維持し、label を増やしすぎない。
- `1280px+` では label 付きの Settings entry を残してよいが、常時展開する内容は最小にする。
