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

The original first / second batch split has been implemented through PR #123.

1. `first_stream`: implemented in PR #116.
2. `anniversary_stream`: implemented in PR #117.
3. `endurance_stream`: implemented in PR #118, with frame asset split in PR #119.
4. `project_stream`: implemented in PR #121.
5. `cover_song_notice`: implemented in PR #122.
6. `event_notice`: implemented in PR #123.

## Next Candidate Mock Split

Next candidates are documented in `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`.
No new mock images have been generated in this planning pass.
When a candidate needs visual direction, generate only that candidate's mock with `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode, then implement it as a separate 1 preset / 1 PR follow-up.

Recommended order:

1. `goods_notice`: merch release / product card direction.
2. `membership_stream`: member-only / premium room direction.
3. `asmr_stream`: quiet audio / relax night direction.
4. `relay_stream`: stream relay / next slot direction.
5. `collab_recruit_notice`: partner call / application CTA direction.
