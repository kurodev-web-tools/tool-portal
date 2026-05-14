# Thumbnail Editor Usecase Preset Candidates

## Purpose

Thumbnail Editor の追加 preset body 実装へ進む前に、既存カテゴリ内で用途違いの候補を整理する。
この planning では実 preset body、asset registration、schema、canvas export、font loading helper、font search / recently used UI は変更しない。

## Prerequisite

- PR #114 `[codex] Apply thumbnail preset fonts` は `main` / `origin/main` に merge 済み。
- merge commit: `615d714de37a8e0124e4b27ac855419041933433`
- planning branch / worktree: `codex/thumbnail-preset-usecase-mocks` / `.worktrees/thumbnail-preset-usecase-mocks`

## Candidate Summary

| Candidate id | Display name | Existing category | Usage label | Initial text | Mock |
| --- | --- | --- | --- | --- | --- |
| `first_stream` | 初配信 | 配信ジャンル | 初回 / 自己紹介 | `初配信` / `DEBUT STREAM` / `20:00 START` / `はじめまして、よろしくね` | `docs/mockups/thumbnail-editor-usecase-preset-candidates/first-stream-mock.png` |
| `anniversary_stream` | 記念配信 | 告知画像 | 記念 / milestone | `1周年記念` / `ANNIVERSARY LIVE` / `21:00 START` / `ありがとうを伝える特別な夜` | `docs/mockups/thumbnail-editor-usecase-preset-candidates/anniversary-stream-mock.png` |
| `endurance_stream` | 耐久配信 | 配信ジャンル | 耐久 / 目標 | `耐久配信` / `CHALLENGE` / `目標 100回` / `達成するまで終われない` | `docs/mockups/thumbnail-editor-usecase-preset-candidates/endurance-stream-mock.png` |
| `project_stream` | 企画配信 | 配信ジャンル | 企画 / 視聴者参加 | `新企画` / `SPECIAL PROGRAM` / `視聴者参加型` / `今日は何が起きる?` | `docs/mockups/thumbnail-editor-usecase-preset-candidates/project-stream-mock.png` |
| `cover_song_notice` | 歌ってみた告知 | 告知画像 | 動画公開 / cover | `歌ってみた` / `COVER PREMIERE` / `20:00 公開` / `新作カバー公開` | `docs/mockups/thumbnail-editor-usecase-preset-candidates/cover-song-notice-mock.png` |
| `event_notice` | イベント告知 | 告知画像 | イベント / 参加情報 | `イベント告知` / `EVENT INFO` / `06.15 SAT` / `参加情報まとめ` | `docs/mockups/thumbnail-editor-usecase-preset-candidates/event-notice-mock.png` |

## First Batch

1. `first_stream`
   - 既存 `配信告知` は通常告知向けだが、初配信は自己紹介と debut 感を前面に出す用途で差別化できる。
   - 右側立ち絵、左側の大見出し、自己紹介サブコピーの基本形を作りやすい。
2. `anniversary_stream`
   - 既存 `お知らせ` / `X告知画像` より祝祭感と milestone badge が必要で、見た目の役割が重なりにくい。
   - gold / rose / navy の上品な記念系 asset を後続素材にも流用しやすい。
3. `endurance_stream`
   - 既存 `ゲーム実況` の HUD とは別に、目標値、進捗、長時間感を扱う preset として用途が明確。
   - goal badge / progress divider / challenge label が必要になり、他候補と asset 方向が被りにくい。

`project_stream`、`cover_song_notice`、`event_notice` は second batch 候補に回す。
同じ用途ラベルの雰囲気違いではなく、まず用途差が大きい preset を増やす。

## Candidate Details

### `first_stream`

- 雰囲気: 新人感、歓迎感、軽い stage / debut 演出。
- 既存との差分: `配信告知` より自己紹介・初回導線寄り。neon stream ではなく ivory / cyan / soft pink の明るい welcome 方向。
- font 傾向: `RocknRoll One` または `M PLUS Rounded 1c` で見出し、`Zen Kaku Gothic New` でサブ、`Bebas Neue` / `Poppins` で英字 label。
- 背景 / 焼き込み装飾: soft spotlight、ribbon / confetti、淡い standee frame glow。文字、時刻、ラベルは text layer 化。
- 後続 asset: background、label plaque、time badge、standee frame glow、small sparkle cluster、ribbon/confetti accent。

### `anniversary_stream`

- 雰囲気: 記念日、周年、登録者 milestone、少し premium。
- 既存との差分: `お知らせ` の official / readable 方向ではなく、祝祭と milestone badge を主役にする。
- font 傾向: `Noto Serif JP` / `Playfair Display` で上品さ、数字や英字は `Montserrat` / `Bebas Neue`。
- 背景 / 焼き込み装飾: midnight navy + champagne gold、glint、corner ornament、layered arch。本文は text layer。
- 後続 asset: background、anniversary badge base、gold corner ornament、glint cluster、label plaque、time badge。

### `endurance_stream`

- 雰囲気: challenge、長時間、達成目標、勢いはあるが情報整理は強め。
- 既存との差分: `ゲーム実況` のゲーム風 HUD とは違い、goal / progress / countdown を見せる。
- font 傾向: 見出しは `M PLUS 1p` / `RocknRoll One`、数字・英字は `Orbitron` / `Anton`、補足は `BIZ UDPGothic`。
- 背景 / 焼き込み装飾: dark charcoal + electric lime / cyan / orange、progress bars、segmented divider、goal panel。
- 後続 asset: background、goal badge panel、progress divider、challenge label plaque、time badge、sharp frame accents。

### `project_stream`

- 雰囲気: variety show、特別企画、視聴者参加、明るいが整理された構成。
- 既存との差分: `コラボ` の複数人配置ではなく、企画名と複数 cue-card を見せる。
- font 傾向: `RocknRoll One` / `M PLUS 1p` で見出し、`Montserrat` / `Fredoka` で label。
- 背景 / 焼き込み装飾: teal / coral / warm yellow、cue-card panels、arrows、sticker tabs。
- 後続 asset: background、cue-card panels、label plaque、time badge、arrow accent、sticker tabs。

### `cover_song_notice`

- 雰囲気: cover MV / premiere、音楽的で release 告知寄り。
- 既存との差分: `歌枠` は live stream、これは動画公開・MV 告知。右側に cover art placeholder を置く。
- font 傾向: 見出しは `M PLUS Rounded 1c` / `Noto Serif JP`、英字は `Playfair Display` / `Pacifico` / `Bebas Neue`。
- 背景 / 焼き込み装飾: black violet + magenta + cyan、soundwave、cover-art frame、soft glow。
- 後続 asset: background、cover-art frame、premiere badge、soundwave accent、music sparkle、label plaque。

### `event_notice`

- 雰囲気: event flyer、参加情報、公式感と見やすさ。
- 既存との差分: `お知らせ` よりイベント参加情報に寄せ、日付、場所/概要、key visual 枠を整理する。
- font 傾向: `Zen Kaku Gothic New` / `BIZ UDPGothic` で情報整理、`Montserrat` / `Oswald` で date / label。
- 背景 / 焼き込み装飾: emerald / off-white / navy、ticket badge、map-line divider、key-visual frame。
- 後続 asset: background、ticket/date badge、info bands、map-line divider、key-visual frame、corner marks。

## Mock Generation Policy

- 生成には `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` の built-in mode を使用した。
- mock は production asset ではなく方向確認用。後続 PR では背景、焼き込み装飾、必要 asset、preset body を 1 preset / 1 PR で実装する。
- mock 内の文字は余白と読みやすさの確認用。実装時は `見出し`、`時刻`、`サブ`、`ラベル` などの text layer に分離する。
- 既存 preset と被らないように、色、構図、装飾密度、用途感を候補ごとに分ける。

## Out Of Scope

- 実 preset body 追加。
- `public/assets/images/thumbnail-editor/**` の production asset 追加。
- material registration、schema、canvas export、font loading helper、font search / recently used UI。
- Schedule Calendar / SNS Split Image Maker 変更。
- 幅別 browser 確認。UI 実装を触らないため不要。
