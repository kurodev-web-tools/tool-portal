# Thumbnail Editor Usecase Preset Candidate Mocks

## Purpose

既存カテゴリ内に追加する用途違い preset の方向確認用 mock 置き場。
ここに置く画像は production asset ではなく、後続の 1 preset / 1 PR 実装で背景、焼き込み装飾、必要 asset、preset body を作るための visual reference として扱う。

## Files

| Candidate | Mock | First batch | Notes |
| --- | --- | --- | --- |
| 初配信 | `first-stream-mock.png` | yes | debut / welcome。既存 `配信告知` より明るく自己紹介向け。 |
| 記念配信 | `anniversary-stream-mock.png` | yes | milestone / anniversary。既存 `お知らせ` より祝祭感を強める。 |
| 耐久配信 | `endurance-stream-mock.png` | yes | challenge / progress。既存 `ゲーム実況` とは goal 表示で差別化。 |
| 企画配信 | `project-stream-mock.png` | no | variety / cue-card。second batch 候補。 |
| 歌ってみた告知 | `cover-song-notice-mock.png` | no | cover premiere。既存 `歌枠` と live / release の役割を分ける。 |
| イベント告知 | `event-notice-mock.png` | no | event flyer。既存 `お知らせ` より参加情報と key visual 枠に寄せる。 |

## Generation Notes

- Generated with `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode.
- Generated source files remain under `$CODEX_HOME/generated_images/...`; project-bound copies are stored in this directory.
- All files are 16:9 PNG mock images (`1672 x 941` in the generated output).
- Text inside the images is for spacing and readability checks only. Implementation should recreate text as editable Thumbnail Editor text layers.
- Standee / cover / key-visual areas are placeholders. Do not treat them as final user-facing character or artwork assets.

## Follow-up Split

1. Implement `first_stream` as one PR: background + baked decoration assets + required registered assets + preset body.
2. Implement `anniversary_stream` as one PR with separate milestone / gold ornament assets.
3. Implement `endurance_stream` as one PR with goal / progress / challenge assets.
4. Implement `project_stream` as one PR with cue-card / label / tab assets.
5. Implement `cover_song_notice` as one PR with cover-art frame / premiere / soundwave assets.
6. Implement `event_notice` as one PR with event flyer / date / key-visual assets.
