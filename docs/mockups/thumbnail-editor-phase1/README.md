# Thumbnail Editor Phase 1 Mockups

## Purpose

Thumbnail Editor を「用途別プリセットを選び、文字と立ち絵を差し替える」完成型へ寄せるための Phase 1 モック。
今回は全プリセット刷新ではなく、代表3種の背景と完成サムネ方針を固める。

## Adopted Presets

- `配信告知`: Schedule Calendar からの単発予定 handoff の主導線。
- `歌枠`: 音楽配信向けの文字映えと余白設計の代表。
- `週間予定`: 週単位の予定一覧画像の代表。

## Files

| Preset | Background | Finished Mock |
| --- | --- | --- |
| 配信告知 | `stream-announce-background.png` | `stream-announce-mock.png` |
| 歌枠 | `karaoke-background.png` | `karaoke-mock.png` |
| 週間予定 | `weekly-schedule-background.png` | `weekly-schedule-mock.png` |

## Mockup Notes

- 画像生成モック内の文字は方向性確認用。実装時は Thumbnail Editor の canvas テキストレイヤーで再現する。
- `見出し`、`時刻`、`サブ`、`ラベル` のレイヤー名は既存 handoff 反映先として維持する。
- 立ち絵はこの段階では実画像を持たず、挿入場所のガイドだけを置く。
- 背景は `public/assets/images/thumbnail-editor/phase1/` に実装用 asset としてコピー済み。
- 実装用 asset は `lib/thumbnail-editor.ts` の Phase 1 対象3プリセットから参照する。

## Next Implementation Split

1. 実画面で3プリセットの表示バランスを確認する。
2. 必要なら `歌枠` の右側立ち絵挿入ガイド幅を微調整する。
3. Schedule Calendar handoff 後も同じ予定テキストが `見出し` / `時刻` / `サブ` / `ラベル` へ流れることを確認する。
4. 全プリセット刷新、縦横variant、高度な部分適用、素材ライブラリ化は後続候補のまま残す。
