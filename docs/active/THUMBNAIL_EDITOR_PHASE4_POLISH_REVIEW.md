# Thumbnail Editor Phase 4 Polish Review

## Scope

- 対象: `配信告知` / `歌枠` / `週間予定` / `雑談` / `切り抜き` / `X告知画像` / `お知らせ`
- 対象外: `ゲーム実況` / `コラボ`
- 背景asset、画像asset色変更、`tintColor`、素材ライブラリUI、装飾ON/OFF、背景への焼き込みは行わない。
- `配信告知` / `歌枠` のみ専用小物assetを最小追加し、他プリセットは既存Phase 4 SVGと editable shape layer の再配置で寄せる。

## Preset Review

| Preset | モックとの差分 | 対応 | 残す差分 |
| --- | --- | --- | --- |
| 配信告知 | モックは見出し背面のシアン発光、左下/右側の大きい三角片、時刻バナー右端の矢印感、星光り、右立ち絵枠の発光が強い。単純shapeの時刻バッジ/ラベル帯は線幅とハイライトの一体感が弱い。 | 専用asset `stream-title-glow-backplate.svg` / `stream-star-sparks.svg` / `stream-time-banner-base.svg` / `stream-label-band-base.svg` を追加し、`stream-emphasis-bursts.svg` を大きい三角片寄りに調整。時刻バッジとラベル帯は1枚SVG土台 + editable textに置換し、見出し/立ち絵frame/HUD線の位置とopacityも再調整。 | 太い文字の完全な立体縁取り、背景と一体化した細線、ピクセル単位の発光は、テキスト編集性と背景焼き込み回避のため追いすぎない。 |
| 歌枠 | モックは右立ち絵枠の曲線感、ラベル帯と時刻バッジの発光一体感、見出し背面のマゼンタグロー、sparkle/light粒子の密度が強い。既存shape土台は線が硬く、右frameも矩形感が残っていた。初回polish後は大きい四芒星と音符SVGがやや玩具っぽく、全面PNG overlayもまだSVG風の硬さが残った。小さい星や点もSVG由来だと硬さが出やすい。 | 専用SVG `karaoke-label-band-base.svg` / `karaoke-title-glow-backplate.svg` / `karaoke-time-banner-base.svg` / `karaoke-ornate-frame.svg` / `karaoke-spark-field.svg` を追加。さらに `imagegen` 生成素材から背景透過PNG `karaoke-ornament-note-*.png` / `karaoke-ornament-star-*.png` / `karaoke-ornament-sparkle-cluster-pink-cyan.png` / `karaoke-sparkle-dust-white-gold.png` / `karaoke-sparkle-dust-pink-cyan.png` / `karaoke-glint-single-soft-white.png` を切り出し、`歌枠` presetでは個別小物レイヤーとして配置。`karaoke-spark-field.svg` は抽象三角片と曲線に絞り、小さい星/点の密度はPNG粒子へ置換。ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、右立ち絵frameは装飾SVG + 薄いeditable frame guideに分離。 | マイク、譜面、読める小物記号、外部素材は追加しない。多色PNGは将来の `tintColor` では直接色変換しづらいため、色違いは別assetとして増やす。モックの文字ごとの立体縁取りや背景と一体化した細い曲線は、背景焼き込みなし・editable text維持のため追いすぎない。 |
| 週間予定 | 背景側に予定表の行枠があるため、追加shapeで行panelを重ねると枠が二重に見える。 | 曜日別テキスト座標は維持し、追加行panelは入れず、予定表frameと区切りlineのopacity/線幅だけを調整。 | モックのアイコン列や読める小物アイコンは権利物/小物方針により追加しない。 |
| 雑談 | モックは立ち絵guideが右側に大きく薄く、全体の装飾は控えめ。既存presetはguideの線と塗りがやや強く、時刻バッジが単純な角丸shapeに見え、見出し/サブの余白も少し窮屈だった。 | 新規assetは追加せず、既存 `soft-light-particles.svg` / `sparkle-small.svg` の位置とopacityを控えめに調整。立ち絵guideは右側へ広げて薄くし、見出しは少し大型化しつつstroke/shadowを暖色寄りに調整。時刻バッジは横幅/角丸を整え、既存shapeだけで小さな時計ディテールを追加。サブテキストは下へ逃がして余白を確保し、下線opacityも抑えた。 | 人物シルエットに近い複雑なguide形状はshapeだけでは作らず、frameに留める。モックの曲線スウォッシュや背景と一体化した発光は、背景焼き込みなし・editable layer維持のため追いすぎない。 |
| お知らせ | モックはアイボリーの上部ラベルバッジ、太めで読みやすい見出し、横長の日付バッジ、右側の薄い立ち絵guide、背景と一体化した金線/光粒が強い。既存presetは本文パネルと単純shapeバッジがやや硬く、右guideの主張も強かった。 | 既存 `announcement-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` のeditable text layerを維持。専用抽象SVG `announcement-label-band-base.svg` / `announcement-date-badge-base.svg` / `announcement-guide-lines.svg` / `announcement-soft-glints.svg` を追加し、ラベル帯と日付バッジをSVG土台 + editable textに変更。本文パネルは薄くし、見出しを大型化、時刻バッジを横長化、サブは下部余白を取って中央寄せにした。右立ち絵guideは細線asset + 薄いframe guideへ分離し、背景の金線と馴染む位置に調整。 | モックの文字ごとの立体処理、背景に焼き込まれた紙/革の細かな質感、完全な曲線フレームは追いすぎない。読める文字・人物・ロゴ・外部画像参照は追加せず、SVG内にも `<text>` / `font-family` / `<image>` / `href=` を含めない。 |
| 切り抜き | モックは動画フレームが大きく、強調ラベルと時刻バッジがステッカー風。 | 動画frameを大きく左上寄りへ調整。強調ラベルと時刻バッジを `polygon` 化し、集中線/スピード線/矢印/衝撃マークを再配置。 | ブラシ塗り風のギザギザや白フチ多重線は新規asset化せず残す。 |
| X告知画像 | モックは全体が明るく、カードと立ち絵guideがかなり薄い。現行は装飾がやや強い。 | 投稿カード、角飾り、光粒、ドット点線、日付バッジ、立ち絵guideのopacityと線幅を下げ、罫線を本文下へ移動。 | モックの細い金色ラインや柔らかい紙質感は背景/asset変更なしでは追わない。 |

## Verification Notes

- `ゲーム実況` / `コラボ` は今回の差分対象外のため、プリセット定義を変更しない。
- 追加した `配信告知` / `歌枠` 専用小物assetには、読める文字、ロゴ、人物、キャラクター、権利物、外部画像参照を含めていない。
- 週間予定の曜日/時間/予定テキストレイヤー構造は維持する。
