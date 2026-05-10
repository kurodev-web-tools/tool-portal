# Thumbnail Editor Phase 4 Polish Review

## Scope

- 対象: `配信告知` / `歌枠` / `週間予定` / `雑談` / `ゲーム実況` / `切り抜き` / `X告知画像` / `お知らせ` / `コラボ`
- 対象外: なし
- 背景asset、画像asset色変更、`tintColor`、素材ライブラリUI、装飾ON/OFF、背景への焼き込みは行わない。
- 単体polish済みプリセットでは必要最小限の抽象assetを追加し、背景と editable text layer は維持する。

## Preset Review

| Preset | モックとの差分 | 対応 | 残す差分 |
| --- | --- | --- | --- |
| 配信告知 | モックは見出し背面のシアン発光、左下/右側の大きい三角片、時刻バナー右端の矢印感、星光り、右立ち絵枠の発光が強い。単純shapeの時刻バッジ/ラベル帯は線幅とハイライトの一体感が弱い。 | 専用asset `stream-title-glow-backplate.svg` / `stream-star-sparks.svg` / `stream-time-banner-base.svg` / `stream-label-band-base.svg` を追加し、`stream-emphasis-bursts.svg` を大きい三角片寄りに調整。時刻バッジとラベル帯は1枚SVG土台 + editable textに置換し、見出し/立ち絵frame/HUD線の位置とopacityも再調整。 | 太い文字の完全な立体縁取り、背景と一体化した細線、ピクセル単位の発光は、テキスト編集性と背景焼き込み回避のため追いすぎない。 |
| 歌枠 | モックは右立ち絵枠の曲線感、ラベル帯と時刻バッジの発光一体感、見出し背面のマゼンタグロー、sparkle/light粒子の密度が強い。既存shape土台は線が硬く、右frameも矩形感が残っていた。初回polish後は大きい四芒星と音符SVGがやや玩具っぽく、全面PNG overlayもまだSVG風の硬さが残った。小さい星や点もSVG由来だと硬さが出やすい。 | 専用SVG `karaoke-label-band-base.svg` / `karaoke-title-glow-backplate.svg` / `karaoke-time-banner-base.svg` / `karaoke-ornate-frame.svg` / `karaoke-spark-field.svg` を追加。さらに `imagegen` 生成素材から背景透過PNG `karaoke-ornament-note-*.png` / `karaoke-ornament-star-*.png` / `karaoke-ornament-sparkle-cluster-pink-cyan.png` / `karaoke-sparkle-dust-white-gold.png` / `karaoke-sparkle-dust-pink-cyan.png` / `karaoke-glint-single-soft-white.png` を切り出し、`歌枠` presetでは個別小物レイヤーとして配置。`karaoke-spark-field.svg` は抽象三角片と曲線に絞り、小さい星/点の密度はPNG粒子へ置換。ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、右立ち絵frameは装飾SVG + 薄いeditable frame guideに分離。 | マイク、譜面、読める小物記号、外部素材は追加しない。多色PNGは将来の `tintColor` では直接色変換しづらいため、色違いは別assetとして増やす。モックの文字ごとの立体縁取りや背景と一体化した細い曲線は、背景焼き込みなし・editable text維持のため追いすぎない。 |
| 週間予定 | 背景側に予定表の行枠があるため、追加shapeで行panelを重ねると枠が二重に見える。既存presetは予定表frame、週範囲バッジ、立ち絵guideが単純shape寄りで、曜日/時間/予定内容の文字も背景の表と少し馴染みすぎていた。 | 既存 `weekly-schedule-background.png` と `見出し` / `時刻` / `ラベル`、曜日別の `曜日` / `時間` / `予定` editable text layerを維持。専用抽象SVG `weekly-table-accent-lines.svg` / `weekly-range-badge-base.svg` / `weekly-standee-guide-lines.svg` / `weekly-soft-glints.svg` を追加し、予定表には行panelを重ねず、薄い外枠/縦罫線/角アクセントだけを足した。週範囲バッジはSVG土台 + editable textへ補強し、立ち絵guideは細線asset + 薄いframe guideに分離。曜日/時間/予定内容は同じ座標を維持しつつ、フォント、stroke、影、色を調整して一覧性を優先した。 | モックの読める小物アイコン、ロゴ、人物、キャラクター、外部画像参照は追加しない。背景側の7行パネルを活かすため、追加の行panelや濃い塗りは重ねない。曜日別テキスト座標は既存draft互換と layer-management contract を優先して維持する。 |
| 雑談 | モックは立ち絵guideが右側に大きく薄く、全体の装飾は控えめ。既存presetはguideの線と塗りがやや強く、時刻バッジが単純な角丸shapeに見え、見出し/サブの余白も少し窮屈だった。 | 新規assetは追加せず、既存 `soft-light-particles.svg` / `sparkle-small.svg` の位置とopacityを控えめに調整。立ち絵guideは右側へ広げて薄くし、見出しは少し大型化しつつstroke/shadowを暖色寄りに調整。時刻バッジは横幅/角丸を整え、既存shapeだけで小さな時計ディテールを追加。サブテキストは下へ逃がして余白を確保し、下線opacityも抑えた。 | 人物シルエットに近い複雑なguide形状はshapeだけでは作らず、frameに留める。モックの曲線スウォッシュや背景と一体化した発光は、背景焼き込みなし・editable layer維持のため追いすぎない。 |
| ゲーム実況 | モックは黒地にネオングリーンのラベル帯、白太字見出し、シアンの時刻HUD、右側の立ち絵guide、背景へ馴染むHUD線とスピード感が強い。既存presetはラベル帯/時刻バッジが単純shapeで、guideの線が太く、見出しとサブの余白もやや硬かった。 | 既存 `game-live-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` のeditable text layerを維持。専用抽象SVG `game-live-label-band-base.svg` / `game-live-time-banner-base.svg` / `game-live-hud-lines.svg` / `game-live-standee-guide-lines.svg` を追加し、ラベル帯と時刻バッジをSVG土台 + editable textに変更。見出しは大型化して白太字の読みやすさを優先し、右立ち絵guideは専用HUD枠 + 薄いframe guideへ分離。サブは下部に余白を取り、下部スピード線と重なりすぎない位置へ調整。 | モックの読める英字ラベルや人物シルエットはeditable text / guideに留める。ゲームタイトルロゴ、実ゲームUI、コントローラー等の具体物、背景焼き込み、テキストの完全な立体縁取りは追加しない。 |
| コラボ | モックは左のカプセル型ラベル、太い白見出し、時計アイコン付きの横長時刻バッジ、下部サブの余白、右側2人分のスポットライト/円形guide、2人をつなぐ曲線と舞台感が強い。既存presetはラベル帯と時刻バッジが単純shapeで、2人guideの線幅が強く、背景のステージ光との一体感が弱かった。 | 既存 `collaboration-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` のeditable text layerを維持。専用抽象SVG `collaboration-label-band-base.svg` / `collaboration-time-badge-base.svg` / `collaboration-duo-guide-lines.svg` / `collaboration-connection-lines.svg` / `collaboration-soft-glints.svg` を追加。ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、見出しを大型化。2人分の立ち絵guideは右側に薄いframeを2つ残しつつ、スポットライト/円形ステージ/点線arcをSVGで補った。サブは下部ラインの間に収め、左右または右側複数人配置の余白を優先した。 | モックの紙吹雪やリボンを大量には追加しない。人物シルエット、キャラクター、ロゴ、読める小物文字、背景焼き込み、文字ごとの完全な立体縁取りは追加しない。SVG内にも `<text>` / `font-family` / `<image>` / `href=` を含めない。 |
| お知らせ | モックはアイボリーの上部ラベルバッジ、太めで読みやすい見出し、横長の日付バッジ、右側の薄い立ち絵guide、背景と一体化した金線/光粒が強い。既存presetは本文パネルと単純shapeバッジがやや硬く、右guideの主張も強かった。 | 既存 `announcement-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` のeditable text layerを維持。専用抽象SVG `announcement-label-band-base.svg` / `announcement-date-badge-base.svg` / `announcement-guide-lines.svg` / `announcement-soft-glints.svg` を追加し、ラベル帯と日付バッジをSVG土台 + editable textに変更。本文パネルは薄くし、見出しを大型化、時刻バッジを横長化、サブは下部余白を取って中央寄せにした。右立ち絵guideは細線asset + 薄いframe guideへ分離し、背景の金線と馴染む位置に調整。 | モックの文字ごとの立体処理、背景に焼き込まれた紙/革の細かな質感、完全な曲線フレームは追いすぎない。読める文字・人物・ロゴ・外部画像参照は追加せず、SVG内にも `<text>` / `font-family` / `<image>` / `href=` を含めない。 |
| 切り抜き | モックは動画フレームが大きく、強調ラベルと時刻バッジがステッカー風で、集中線/スピード線/矢印/衝撃マークが一体になって短い強調語と公開時刻へ視線を誘導している。既存presetはフレーム余白がやや狭く、ラベル/時刻バッジが単純shapeで、見出しと動画フレームの重なりも強かった。 | 既存 `clip-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` のeditable text layerを維持。専用抽象SVG `clip-label-band-base.svg` / `clip-time-badge-base.svg` / `clip-video-frame-accent.svg` / `clip-impact-marks.svg` を追加し、既存 `clip-focus-rays.svg` / `clip-speed-lines.svg` / `arrow-accent.svg` と組み合わせた。動画frameは左上寄りに大きく取り、フレーム装飾をSVGで補強。ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、見出しは右下に2行で大きく配置。サブは下部に逃がして、動画フレーム/強調装飾との余白を確保した。 | ブラシ塗り風のギザギザ、多重白フチ、モック内の人物・実動画サムネ・読める小物文字は追加しない。背景焼き込み、schema変更、新しい `shapeType`、`tintColor`、素材ライブラリUI変更は行わず、動画内容は利用者が後から差し込む前提の抽象フレームに留める。 |
| X告知画像 | モックは明るい背景上に薄い投稿カード、上部ラベル、読みやすい大見出し、細い金色罫線、横長の日付バッジ、控えめな立ち絵guideが一体化している。既存presetはカード/ラベル/日付バッジが単純shapeで、立ち絵guideと角飾りの主張が少し強く、本文と日付の余白もやや窮屈だった。 | 既存 `x-announcement-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` のeditable text layerを維持。専用抽象SVG `x-post-card-base.svg` / `x-label-band-base.svg` / `x-date-badge-base.svg` / `x-standee-guide-lines.svg` を追加し、投稿カード、ラベル帯、日付バッジ、立ち絵guide細線をSVG土台へ置換。既存 `soft-light-particles.svg` / `x-corner-ornaments.svg` / `dot-dash-row.svg` はopacityと配置を抑え、本文罫線を見出し下へ移動。見出しは少し大型化し、サブは中央寄せで日付バッジ上に余白を確保した。 | モックの読める小物文字、人物シルエット、背景に焼き込まれた紙質感、細い金線の完全再現は追いすぎない。背景焼き込み、schema変更、新しい `shapeType`、`tintColor`、素材ライブラリUI変更は行わず、立ち絵guideは利用者が後から差し込む前提の抽象線に留める。 |

## Verification Notes

- `週間予定` は今回の単体polish対象。追加assetは抽象SVGのみで、背景とeditable text layerは維持する。
- 追加した `配信告知` / `歌枠` / `ゲーム実況` 専用小物assetには、読める文字、ロゴ、人物、キャラクター、権利物、外部画像参照を含めていない。
- `X告知画像` の追加SVGには、読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を含めていない。
- 週間予定の曜日/時間/予定テキストレイヤー構造と既存座標は維持する。

## Phase 5 Cross-Preset Visual Review

- 確認日: 2026-05-08
- 対象: Phase 4 polish済み全9プリセット
- 確認環境: `http://localhost:3018/tools/thumbnail-editor/`
- 確認幅: browser screenshot `1686x928`、キャンバス `1280 x 720 (16:9)`、zoom `72%`
- 確認方法: 各プリセットを上部プリセットメニューから選択し、`新規キャンバスを作成` 後の初期状態で確認
- 証跡: `output/phase5-visual-review-clean/1-配信告知.png` から `9-週間予定.png`
- Console: error / warn 0件

| Preset | 配置 / 余白 | 文字可読性 | asset品質 | フォント | 過剰装飾 / 引き算 | 優先度 |
| --- | --- | --- | --- | --- | --- | --- |
| 配信告知 | 右側の立ち絵guide余白は確保できている。下部サブは時刻バッジ直下に寄っているため、次の横断調整で少し下げる候補。 | 見出し、時刻、ラベルは強い。サブは細く、下部背景と重なるため少し太らせる候補。 | 専用SVGは現状維持でよい。 | 現フォントで成立。追加検討は最後。 | 星と三角片は十分強いので増やさない。 | P2 |
| 歌枠 | 左寄せ構成は成立。上部ラベル帯と見出しの距離が近く、右立ち絵frameが少し大きいため、横断調整後に個別微調整候補。 | 見出しと時刻は読める。サブは発光背景上で少し埋もれやすい。 | PNG小物は他presetより高品質だが、粒子密度はこれ以上増やさない。 | 歌枠だけ先行してフォントを足す段階ではない。 | 装飾量は上限に近い。足すより余白とopacity整理を優先。 | P2 |
| 雑談 | 全体の余白バランスは良い。右立ち絵guideは薄く、実用上の差し替え余白も残っている。 | 見出し、時刻、サブとも読める。サブだけやや小さく見えるが致命ではない。 | 新規assetなしで成立している。 | 現フォントで十分。 | 引き算方針が合っているため大きく触らない。 | P3 |
| お知らせ | 中央パネル、日付、サブの縦関係は整理済み。右guide余白も確保できている。 | 見出しは読みやすい。日付バッジとサブは淡い背景でも読めるが、少しだけstroke/影を整理する候補。 | 金線とバッジは十分。 | 現フォントで成立。 | 公式告知感が出ているため、装飾追加は不要。 | P2 |
| ゲーム実況 | 見出し、時刻、サブの流れは分かりやすい。右側HUD guide余白も残る。 | 全体に高コントラストで読める。サブは緑背景と近いため、白文字の影を少し強める候補。 | HUD系SVGは現状で十分。 | 現フォントで成立。 | スピード線とHUD線は強いので増やさない。 | P2 |
| コラボ | 2人用guide余白は明確。下部サブは時刻バッジとの距離が近く、右側ステージ余白との関係で少し上げ下げを検討。 | 見出し、時刻、ラベルは読める。サブは背景粒子上でやや埋もれる。 | 専用SVGは十分。 | 現フォントで成立。 | 紙吹雪/リボン追加は不要。現状の密度を維持。 | P2 |
| 切り抜き | 右下見出し、右側時刻バッジ、下部サブが右端に詰まり、初期状態で一部テキストが窮屈に見える。最初の修正候補。 | 見出しは強いが、時刻とサブが右端で読み切りづらい。文字サイズ、幅、x座標を優先調整。 | 動画フレームとステッカー土台は十分。asset追加より配置修正が先。 | 現フォントで成立。 | 強調装飾は十分強い。引き算しながら余白を作る。 | P1 |
| X告知画像 | 中央カードの余白は良い。日付バッジと下部要素は少し低く、細い装飾と近い。 | 明るい背景に対して、上部ラベルと日付バッジの白文字がやや淡い。文字色/影/バッジ濃度の調整候補。 | 淡いカードと線は方向性良い。asset追加よりコントラスト調整が先。 | 現フォントで成立。 | 角飾りや粒子は控えめでよい。増やさない。 | P1 |
| 週間予定 | 表の情報密度が高く、曜日/時間/予定の列間が少し詰まって見える。左下guideは差し替え余白としては大きめ。 | 見出しと表テキストは読めるが、表は長い予定名に弱い。列幅、文字サイズ、strokeを優先検討。 | 予定表補助線とバッジは十分。行panel追加はしない。 | 現フォントで成立。表だけfont追加で解決しようとしない。 | 行panelや装飾を増やすと重くなるため、引き算寄りで調整。 | P1 |

## Phase 5 PR Split Recommendation

Phase 5 は単なる配置微調整ではなく、プリセット構造を「完成背景 + 差し替えasset + editable text」へ寄せる。

1. PR 1: 既存モックを再確認し、全9プリセットについて背景へ焼き込む範囲、個別asset化する範囲、shape layerで残す範囲を表にする。
2. PR 2: 各プリセット1種目の完成背景を作る。背景には大きな枠、パネル、予定表フレーム、動画フレーム、立ち絵用の光/余白を必要に応じて焼き込む。文字、人物、キャラクター、ロゴ、読めるUIは入れない。
3. PR 3: バッジ、ステッカー、ラベル土台、時刻バッジ土台、小物を個別assetとして作る。プリセットで使うものに加えて、色違いや未使用候補も少数含め、利用者が置き換え/追加できる余地を残す。
4. PR 4: 1種目背景と個別assetをプリセットへ組み込み、ライン、下線、区切り線、補助線はshape layerとして追加/削除しやすい状態にする。見出し、時刻、サブ、ラベル文字、週間予定の曜日/時間/予定はtext layerで維持する。
5. PR 5: 位置、文字サイズ、stroke、影、余白、レイヤー順を調整する。フォント追加は最後に検討し、外部CDNは避け、ライセンス確認済みself-host fontを少数に絞る。
6. PR 6以降: 同じ流れで各プリセット2種目を追加する。公開段階のゴールは「全9プリセットが各1種完成背景を持ち、必要に応じて2種目まで選べる」状態とする。

初期段階では背景と大きな枠の焼き込みを許容し、MVPの見た目完成度を優先する。数を増やす段階では、週間予定の右側予定表枠、切り抜きの動画フレーム、告知系の本文パネルなど、流用価値が高い大枠から独立asset化する。

最初に着手する候補は `切り抜き` または `週間予定`。どちらも大枠を背景と一体化した場合の効果が見えやすく、後から独立asset化したい部位も明確。

### Phase 5 Layer Responsibility

| Layer / Asset | 初期方針 | 将来方針 |
| --- | --- | --- |
| 背景本体 | 1プリセット1種から作成し、テキスト安全領域と立ち絵安全領域を空ける。 | 各プリセット2種目まで追加し、用途別に選べるようにする。 |
| 大きな枠 / パネル | 初期は背景へ焼き込み、完成度を優先する。 | 週間予定の表枠や切り抜きの動画フレームなど、流用価値が高いものから独立asset化する。 |
| ラベル / バッジ / ステッカー | 文字なしの個別assetとして作る。色違い、雰囲気違い、未使用候補も少数用意する。 | asset libraryから差し替え/追加できる対象にする。 |
| ライン / 補助線 | shape layerで扱い、追加/削除/色変更しやすくする。 | 必要ならプリセットごとの初期shapeセットとして整理する。 |
| テキスト | 既存どおり editable text layer。 | フォント追加は最後にまとめて検討する。 |

## Phase 5 `切り抜き` Kickoff Design Memo

- 確認日: 2026-05-08
- 作業branch / worktree: `codex/thumbnail-phase5-clip-preset` / `.worktrees/thumbnail-phase5-clip-preset`
- 前提確認: PR #42 `[codex] Document thumbnail phase 5 direction` は `main` に merge済み。merge commit `e8c0a7fba055c177756d8f4d42fef87d5bef1c55` を作業開始時のlocal `main` が含むことを確認した。
- 対象: `切り抜き` presetのみ。全9プリセットへは広げない。
- 参照元: `docs/mockups/thumbnail-editor-phase3-candidates/clip-mock.png`、`public/assets/images/thumbnail-editor/phase3/clip-background.png`、現行 `lib/thumbnail-editor.ts` の `clip` preset、既存 Phase 4 `clip-*` decoration asset。

### 背景へ焼き込む範囲

| 範囲 | 初期MVP方針 | 将来分離候補 |
| --- | --- | --- |
| 背景本体 | 既存 `clip-background.png` と `clip-mock.png` を参照し、紫/橙の勢い、光、粒子、奥行き、右側のスピード感を再生成する。読める文字、ロゴ、人物、キャラクター、実動画スクショ、実ゲーム画面、SNS UIは入れない。 | 背景variantを増やす場合は、光量違い、暗め、橙強めなどを別背景として追加する。 |
| 大きな動画フレーム風の枠 | 初期MVPでは背景へ焼き込み可。中央左からやや上寄りへ大きく斜め配置し、フレーム内は利用者が動画画像を重ねても読みやすい暗い抽象面に留める。実画面や読めるUIは入れない。 | 差し替え需要が高いため、Phase 5後続で `clip-video-frame-*` の独立asset化候補にする。枠のみ / 内側暗面 / 角装飾を分けられるよう記録する。 |
| テキスト安全領域 | 右下に見出し2行、右中に時刻、左上にラベルを置く前提で、背景側の強い光や粒子が文字背面へ入りすぎないようにする。 | 背景variant追加時も安全領域の座標は維持し、preset側のtext座標変更を最小化する。 |
| 右下見出し用の余白 | Phase 5 visual reviewで右端詰まりがP1のため、見出しの右端に最低でも約64pxの逃げを残す。背景側の強い橙光は見出し右端の外側へ逃がす。 | 見出し背面の強調ベースは背景焼き込みではなく、shapeまたは個別assetとして分離する。 |
| 時刻バッジが乗る余白 | 現行は右側で窮屈なため、時刻バッジは右中ではなく右上寄りから中央寄りへ少し戻せる余白を確保する。 | 時刻バッジ土台は個別assetとして差し替え可能にし、背景にはバッジ形状を焼き込まない。 |
| 光、影、勢い、奥行き | 背景として焼き込む主役。フレーム周辺の影、右奥から左下へ流れる光、粒子、抽象破片で勢いを出す。 | フレーム前面の衝撃マークや矢印など、利用者がオン/オフしたい要素は焼き込まない。 |

### 個別asset化する範囲

| Asset候補 | 初期MVP方針 |
| --- | --- |
| ラベル土台 | 文字なしのステッカー風PNGまたはSVGとして生成/整備する。現行 `clip-label-band-base.svg` 相当を、背景再生成後の色味に合わせて使う。 |
| 時刻バッジ土台 | 文字なしassetとして維持する。右端詰まりを避けるため、横幅と配置を背景側安全領域に合わせて調整する。 |
| ステッカー | 見出し背面や周辺の黒白フチ、ギザギザ紙片、紫グロー系を文字なしで少数用意する。読める文字は入れない。 |
| 矢印 | 現行 `arrow-accent.svg` の役割を維持しつつ、黄色/紫/白黒フチの色違いを少数候補にする。 |
| 衝撃マーク | 黄色の集中三角、burst、短いスラッシュを文字なしassetとして用意する。強すぎるものは未使用候補に回す。 |
| 小物 | 抽象破片、スパーク、白フチの短い勢い線を少数。実アイコン、ロゴ、権利物に見える具体物は入れない。 |
| 色違い / 未使用候補 | プリセットで使うものに加え、黄色強め、紫強め、白黒控えめの候補を各1から2点までに抑える。 |

透明assetが必要な場合は、まず built-in `image_gen` で均一なchroma-key背景の素材を生成し、ローカルで背景除去する。true/native transparency が必要そうな場合は、CLI fallbackへ進む前に確認する。

### Shape Layerで残す範囲

| 範囲 | 方針 |
| --- | --- |
| 下線 | サブテキストや見出し下の線はshape layerで残し、色、長さ、削除をしやすくする。 |
| 補助ライン | フレーム外側の短い勢い線、区切り線はshape layer優先。生成背景には焼き込みすぎない。 |
| 区切り線 | 動画フレームと右側テキスト領域の境界を示す線はshape layerで調整可能にする。 |
| 簡易ガイド | 動画差し込み位置や安全領域の確認に使う薄いframe/lineは、公開プリセットで邪魔にならない opacity にするか、初期状態には入れず実装メモに留める。 |

### Text Layerで維持する範囲

| Text | 方針 |
| --- | --- |
| 見出し | editable text layerで維持する。右下2行を基本にし、Phase 5では右端詰まりを避けるためx座標、幅、fontSize、strokeを優先調整する。 |
| 時刻 | editable text layerで維持する。時刻バッジ土台とは分離し、`20:00 公開` などのhandoff反映を維持する。 |
| サブ | editable text layerで維持する。下部右寄せで窮屈にならないよう、幅とx座標を中央寄りへ戻す。 |
| ラベル文字 | editable text layerで維持する。ラベル土台assetには文字を焼き込まない。 |

### 最小PR範囲候補

1. `切り抜き` 用の Phase 5 背景を1枚生成し、`public/assets/images/thumbnail-editor/phase5/clip-background-v1.png` のような新規assetとして保存する。
2. `切り抜き` 用の文字なし個別assetを最小数だけ追加する。必須はラベル土台、時刻バッジ土台、ステッカー/衝撃マーク/矢印の各1点。色違い・未使用候補は合計3から5点まで。
3. `lib/thumbnail-editor.ts` の `clip` presetだけを更新し、背景参照、asset配置、shape layer、text layer座標を調整する。schema変更、素材ライブラリUI変更、フォント追加、他preset変更は行わない。
4. 既存contractに必要な Phase 5 asset contract を追加または既存contractを拡張する。対象は `clip` の背景参照、禁止要素を含まないassetファイル、editable text layer維持。
5. `task.md` とこのdocsへ、生成prompt、保存path、確認幅、検証結果、未採用asset候補を記録する。

実装に進む場合の最初の確認点は、背景の大きな動画フレームを初期MVPで焼き込むか、フレームだけは最初から個別assetにするか。現時点の推奨は、Phase 5構造検証を速く進めるため「背景 + 大きな動画フレームは焼き込み、ラベル/時刻/小物/ライン/テキストは分離」で開始する。

### Phase 5 `切り抜き` Implementation Notes

- 実装日: 2026-05-08
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。
- 背景: `public/assets/images/thumbnail-editor/phase5/clip-background-v1.png`
  - 既存 `clip-background.png` / `clip-mock.png` の方向性を参照し、動画フレーム風の大きな枠を初期MVPとして焼き込んだ。
  - 読める文字、ロゴ、人物、キャラクター、実動画スクショ、実ゲーム画面、SNS UIは入れていない。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `clip-label-sticker-yellow-uniform-cell.png`
  - `clip-time-badge-sticker-purple-uniform-cell.png`
  - `clip-title-sticker-backplate-uniform-cell.png`
  - `clip-arrow-yellow-uniform-cell.png`
  - `clip-impact-burst-yellow-uniform-cell.png`
  - `clip-spark-shards-purple-uniform-cell.png`
- 透明assetは built-in `image_gen` で #00ff00 chroma-key asset sheet を生成し、6点を同じセルサイズ / 同じ内部余白で配置する方針へ切り替えた。ローカル処理では2列x3行を6等分し、chroma-key除去後に最大オブジェクトだけを残し、全6点を同じ `768 x 512` canvas / 同じ内側セーフボックスへ配置した。個別トリムによる見切れや同名キャッシュ差分を避けるため `*-uniform-cell.png` のファイル名にした。true/native transparency のCLI fallbackは使っていない。
- `lib/thumbnail-editor.ts` は `clip` presetだけを更新した。schema変更、素材ライブラリUI変更、フォント追加、他preset変更は行っていない。
- 大きな動画フレームは背景へ焼き込んだため、Phase 5 `clip` presetから `図形 3（動画フレーム）` は外した。将来分離する場合は、背景内の枠、内側暗面、角装飾を `clip-video-frame-*` assetとして再生成する。
- 見出しステッカー土台と時刻バッジは、右端の見切れ感を避けるため初期配置を少し左へ戻した。
- 見出しステッカー土台は、sheet生成だけでは輪郭が途中で終わったように見える個体が残ったため、最終版のみ `1 asset = 1 canvas` で個別再生成し、同じ `768 x 512` / `*-uniform-cell.png` に正規化した。
- Phase 5小物assetの次回方針: sheet一括生成は候補比較用に留め、最終採用assetは基本 `1 asset = 1 canvas` で生成してから、同一canvas / 同一セーフボックスへ正規化する。隣接セル混入、余白不足、生成時点の輪郭見切れを避けるため。
- ラベル / 時刻 / 見出し / サブの文字は editable text layerとして維持した。
- 下線 / 補助ライン / 区切り線は shape layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-clip-preset-contract.mjs`
  - Phase 5背景、個別asset、editable text layer、shape layer責務に加え、個別asset 6点が同一 `768 x 512` セルcanvasであることを検証する。
  - 個別asset 6点はPNG alpha境界を読み取り、上下左右に最低76px以上の透明余白が残ることも検証する。

## Phase 5 `お知らせ` Kickoff Design Memo

- 確認日: 2026-05-08
- 作業branch / worktree: `codex/thumbnail-phase5-announcement-preset` / `.worktrees/thumbnail-phase5-announcement-preset`
- 前提確認: PR #43 `[codex] Renew clip thumbnail phase 5 preset` は `main` に merge済み。merge commit `98e5e9d949e75298165fb0ebac2f24ebee25d7c6` を作業開始時のlocal `main` が含むことを確認した。
- 対象: `お知らせ` presetのみ。全9プリセットへは広げない。
- 参照元: `docs/mockups/thumbnail-editor-phase2-candidates/announcement-mock.png`、`docs/mockups/thumbnail-editor-phase2-candidates/announcement-background-candidate.png`、`public/assets/images/thumbnail-editor/phase2/announcement-background.png`、現行 `lib/thumbnail-editor.ts` の `announcement` preset、既存 Phase 4 `announcement-*` decoration asset、Phase 5 `切り抜き` の `1 asset = 1 canvas` 方針。

### 背景へ焼き込む範囲

| 範囲 | 初期MVP方針 | 将来分離候補 |
| --- | --- | --- |
| 背景本体 | 既存 `announcement-background.png` の濃紺、金線、右上からの落ち着いた光、粒子、紙/布に近い浅い質感を参照して再生成する。告知らしい静かな高級感を優先し、読める文字、ロゴ、人物、キャラクター、SNS UI、実画面は入れない。 | 背景variantを増やす場合は、暗め、金光強め、よりフラットな情報整理向けを別背景として追加する。 |
| 本文パネル / 大きな情報枠 | 初期MVPでは背景へ焼き込み可。左側に大きな本文パネルを置き、角丸、薄い金縁、内側の暗い面、控えめな影まで背景と一体化させる。テキストは焼き込まない。 | 利用者が枠色や情報量を変えたくなる可能性があるため、後続で `announcement-info-panel-*` の独立asset化候補にする。枠線、内側面、角飾りを分けられるよう記録する。 |
| テキスト安全領域 | 左パネル内にラベル、見出し2行、日付/時刻、サブを置く前提で、強い粒子や金線を文字背面に入れすぎない。見出しは左寄せでも中央寄せでも成立する広さを残す。 | 背景variant追加時も左パネル内の主要座標は維持し、handoff後のテキスト再適用を崩さない。 |
| 日付バッジが乗る余白 | 左パネル下寄りに横長の日付/時刻バッジを置ける余白を確保する。背景にはバッジ形状を焼き込まず、バッジ土台は個別assetで差し替え可能にする。 | 日付のみ、時刻のみ、日付+曜日の3パターンに対応できるよう、バッジ幅はpreset側で調整可能にする。 |
| 右側立ち絵guideや余白 | 右側は立ち絵配置用に明るい縦の光と静かな余白を残す。guide枠自体は焼き込みすぎず、背景には「置きやすい光の場」だけを含める。 | guide線や薄いframeはshape layerまたは個別assetへ分離し、非表示/削除しやすくする。 |
| 光、影、奥行き、読みやすさ | 右上から左パネルへ流れる斜め光、パネル背面の影、控えめな金粒、奥行き感は背景に焼き込む。告知用途なので装飾量は増やさず、読みやすさを最優先にする。 | 前面に重ねるグリントや角飾りはオン/オフ需要があるため、個別assetに寄せる。 |

### 個別asset化する範囲

| Asset候補 | 初期MVP方針 |
| --- | --- |
| ラベル土台 | アイボリーまたは金系の文字なしラベル土台を `1 asset = 1 canvas` で生成し、`ラベル` text layerを重ねる。現行 `announcement-label-band-base.svg` の役割をPhase 5 PNG/SVG assetへ更新する。 |
| 日付 / 時刻バッジ土台 | 横長の文字なしバッジを個別asset化する。日付、時刻、公開予定のいずれにも使えるよう、中央の文字領域を広く取り、縁と光は控えめにする。 |
| 角飾り | 左パネルの角または右上光に馴染む小さな金線/角装飾を少数用意する。本文パネルに焼き込む角飾りと、前面に置く角飾りを混ぜない。 |
| 小さな光やアクセント | 控えめなグリント、金粒、短い斜線を文字なし個別assetとして用意する。告知用途なので強いburstやステッカー感は避ける。 |
| 未使用候補や色違い | プリセット採用品に加え、アイボリー強め、金強め、濃紺影強めなど少数だけ用意する。最終採用assetは同一canvas / 同一セーフボックスへ正規化する。 |

透明assetが必要な場合は、まず built-in `image_gen` で均一なchroma-key背景の素材を生成し、ローカルで背景除去する。true/native transparency が必要そうな場合は、CLI fallbackへ進む前に確認する。

### Shape Layerで残す範囲

| 範囲 | 方針 |
| --- | --- |
| 本文罫線 | 見出しと日付/サブの区切りはshape layerで残し、長さ、色、opacityを後から調整できるようにする。 |
| サブ下ライン | サブの読みやすさを補う短い金線はshape layerで維持し、不要な場合に削除しやすくする。 |
| 立ち絵guide枠 | 右側の薄いframe guideはshape layerを第一候補にし、背景には焼き込まない。必要ならPhase 4 `announcement-guide-lines.svg` 相当を低opacity個別assetとして併用する。 |
| 必要な簡易ガイド | テキスト安全領域やパネル内余白を示す線は公開presetで邪魔にならない薄さにする。実装時は初期表示に入れるものを最小限に絞る。 |

### Text Layerで維持する範囲

| Text | 方針 |
| --- | --- |
| 見出し | editable text layerで維持する。`大切な\nお知らせ` の2行を基準にし、Phase 5背景では左パネル内でより余白を持たせる。 |
| 日付または時刻 | editable text layerで維持する。Schedule Calendar handoffの時刻反映を壊さず、文言は `5/10 公開`、`20:00 公開` などに差し替え可能にする。 |
| サブ | editable text layerで維持する。本文パネル内の下部に置き、日付バッジとの距離を十分取る。 |
| ラベル文字 | editable text layerで維持する。ラベル土台assetには `NEWS` などの文字を焼き込まない。 |

### 最小PR範囲候補

1. `お知らせ` 用の Phase 5 背景を1枚生成し、`public/assets/images/thumbnail-editor/phase5/announcement-background-v1.png` のような新規assetとして保存する。初期MVPでは背景 + 本文パネル / 大きな情報枠を焼き込み可にする。
2. `お知らせ` 用の文字なし個別assetを最小数だけ追加する。必須はラベル土台、日付/時刻バッジ土台、角飾り、小さな光/アクセント。色違い・未使用候補は合計3から5点まで。
3. 透明小物は `1 asset = 1 canvas` を原則にし、採用assetは同一canvas / 同一セーフボックスへ正規化する。sheet一括生成は候補比較用までに留める。
4. `lib/thumbnail-editor.ts` の `announcement` presetだけを更新し、背景参照、asset配置、shape layer、text layer座標を調整する。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行わない。
5. `scripts/thumbnail-phase5-announcement-preset-contract.mjs` を追加する。対象は Phase 5背景参照、個別asset存在、禁止要素を含まないassetファイル、editable `見出し` / `時刻` / `サブ` / `ラベル` text layer維持、本文罫線 / サブ下ライン / 立ち絵guide枠のshape layer責務。
6. `task.md` とこのdocsへ、生成prompt、保存path、確認幅、検証結果、未採用asset候補、将来分離候補を記録する。

実装に進む場合の推奨は、「背景 + 本文パネル / 大きな情報枠は初期MVPで焼き込み、ラベル土台 / 日付バッジ / 角飾り / 小さな光は個別asset、本文罫線 / サブ下ライン / 立ち絵guide枠はshape、見出し / 日付または時刻 / サブ / ラベル文字はeditable text」で開始する。

### Phase 5 `お知らせ` Implementation Notes

- 実装日: 2026-05-08
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。CLI fallback / true native transparency は使っていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/announcement-background-v1.png`
  - 既存 `announcement-background.png` / `announcement-mock.png` の方向性を参照し、濃紺、金線、右上スポットライト、紙/布に近い浅い質感、左側の大きな本文パネルを初期MVPとして焼き込んだ。
  - 読める文字、ロゴ、人物、キャラクター、実動画スクショ、実ゲーム画面、SNS UI、日付バッジ、ラベル文字は入れていない。
  - 初回生成ではラベル枠に見える小枠が背景へ入ったため不採用にし、ラベル/日付バッジ形状を焼き込まない条件で再生成した。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `announcement-label-plaque-ivory-uniform-cell.png`
  - `announcement-date-badge-navy-gold-uniform-cell.png`
  - `announcement-corner-ornament-gold-uniform-cell.png`
  - `announcement-soft-glint-cluster-gold-uniform-cell.png`
  - `announcement-label-plaque-navy-candidate-uniform-cell.png` は未使用候補。
- 透明assetは built-in `image_gen` で #00ff00 chroma-key 背景つき素材として生成し、`C:\Users\taka\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py` で背景除去した。採用assetはすべて `768 x 512` canvas / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `announcement` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- 本文パネル / 大きな情報枠は背景へ焼き込んだため、Phase 5 `announcement` presetから `図形 1（本文パネル）` は外した。将来分離する場合は、背景内の枠線、内側暗面、角飾りを `announcement-info-panel-*` assetとして再生成する。
- ラベル / 日付 / 見出し / サブの文字は editable text layerとして維持した。
- 本文罫線 / サブ下ライン / 立ち絵guide枠は shape layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-announcement-preset-contract.mjs`
  - Phase 5背景、個別asset、editable text layer、shape layer責務に加え、個別asset 5点が同一 `768 x 512` canvasであること、PNG alpha境界に上下左右最低76px以上の透明余白が残ることを検証する。
  - `announcement-label-plaque-navy-candidate-uniform-cell.png` は存在だけ検証し、preset未使用候補として扱う。
- 既存contract更新:
  - `scripts/thumbnail-phase2-preset-assets-contract.mjs` は `announcement` がPhase 5へ移った前提に変更した。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `announcement` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- UI確認:
  - static outputを `localhost:3027` で配信し、Playwrightで `お知らせ` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 各幅でcanvas非blank、水平overflow 0を確認。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputではPhase 5 asset requestはすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加assetの読み込み失敗ではない。
  - dev server確認はNext.jsのworkspace root推定によりroot側bundleを参照する可能性があったため、採用証跡から外した。
  - preset切替直後に古い非同期描画が新しいpreset canvasを上書きしないよう、main canvas / mobile preview canvasの描画をrender version付きoffscreen buffer経由に変更した。
  - 確認スクリーンショット: `output/playwright/phase5-announcement-final-390.png` / `phase5-announcement-final-820.png` / `phase5-announcement-final-1024.png` / `phase5-announcement-final-1280.png` / `phase5-announcement-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-announcement-canvas-static-clean-1280x720.png`

## Phase 5 `X告知画像` Implementation Notes

- 実装日: 2026-05-09
- 作業branch / worktree: `codex/thumbnail-phase5-x-announcement-preset` / `.worktrees/thumbnail-phase5-x-announcement-preset`
- 前提確認: PR #44 `[codex] Renew announcement thumbnail phase 5 preset` は `main` に merge済み。merge commit `e73f8b4555455df768643eb3222aefdb1bc20c69` を作業開始時のlocal `main` / `origin/main` が含むことを確認した。
- 対象: `X告知画像` presetのみ。全9プリセットへは広げない。
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。CLI fallback / true native transparency は使っていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/x-announcement-background-v1.png`
  - 既存 `x-announcement-background.png` / `x-announcement-mock.png` の方向性を参照し、明るい紙質、淡い青白グラデーション、控えめな金線、左中央の大きな投稿カード / 情報パネル、右側の立ち絵差し替え余白を初期MVPとして焼き込んだ。
  - 読める文字、ロゴ、SNS UI、X/Twitterロゴ、人物、キャラクター、実画面、日付バッジ、ラベル文字は入れていない。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `x-announcement-label-plaque-blue-uniform-cell.png`
  - `x-announcement-date-badge-blue-gold-uniform-cell.png`
  - `x-announcement-corner-ornament-gold-uniform-cell.png`
  - `x-announcement-soft-glint-cluster-blue-uniform-cell.png`
  - `x-announcement-label-plaque-ivory-candidate-uniform-cell.png` は未使用候補。
- 透明assetは built-in `image_gen` で #00ff00 chroma-key 背景つき素材として生成し、`C:\Users\taka\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py` で背景除去した。採用assetはすべて `768 x 512` canvas / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `x_announcement` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- 投稿カード / 大きな情報パネルは背景へ焼き込んだため、Phase 5 `x_announcement` presetから Phase 4 `x-post-card-base.svg` は外した。将来分離する場合は、カード面、枠線、角飾り、薄い影を `x-announcement-post-card-*` assetとして再生成する。
- ラベル / 日付 / 見出し / サブの文字は editable text layerとして維持した。
- 本文罫線 / サブ下ライン / 立ち絵guide枠は shape layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-x-announcement-preset-contract.mjs`
  - Phase 5背景、個別asset、editable text layer、shape layer責務に加え、個別asset 5点が同一 `768 x 512` canvasであること、PNG alpha境界に上下左右最低76px以上の透明余白が残ることを検証する。
  - `x-announcement-label-plaque-ivory-candidate-uniform-cell.png` は存在だけ検証し、preset未使用候補として扱う。
- 既存contract更新:
  - `scripts/thumbnail-phase3-preset-assets-contract.mjs` は `x_announcement` がPhase 5へ移った前提に変更した。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `x_announcement` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- UI確認:
  - static outputを `localhost:3028` で配信し、Playwrightで `X告知画像` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 各幅でcanvas非blank、水平overflow 0を確認。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputではPhase 5 asset requestはすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404と、静的配信中の内部HEAD request abort、1280px確認時のGoogle Fonts request abortが出たが、今回追加assetの読み込み失敗ではない。
  - 確認スクリーンショット: `output/playwright/phase5-x-announcement-final-390.png` / `phase5-x-announcement-final-820.png` / `phase5-x-announcement-final-1024.png` / `phase5-x-announcement-final-1280.png` / `phase5-x-announcement-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-x-announcement-canvas-static-clean-1280x720.png`

## Phase 5 `ゲーム実況` Implementation Notes

- 実装日: 2026-05-09
- 作業branch / worktree: `codex/thumbnail-phase5-game-live-preset` / `.worktrees/thumbnail-phase5-game-live-preset`
- 前提確認: PR #45 `[codex] Renew x announcement thumbnail phase 5 preset` は `main` に merge済み。merge commit `1a251ba7528ffd13f57398df0581d9eb41c12e18` を作業開始時のlocal `main` が含むことを確認した。
- 対象: `ゲーム実況` presetのみ。全9プリセットへは広げない。
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。CLI fallback / true native transparency は使っていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/game-live-background-v1.png`
  - 既存 `game-live-background.png` / `game-live-mock.png` の方向性を参照し、黒/濃紺ベース、シアンとネオングリーンのHUD感、左側の大きなタイトルパネル、右側の立ち絵差し替え余白を初期MVPとして焼き込んだ。
  - 読める文字、ロゴ、ゲームスクリーンショット、実UI、人物、キャラクター、コントローラー、ラベル文字は入れていない。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `game-live-label-plaque-neon-uniform-cell.png`
  - `game-live-time-badge-cyan-uniform-cell.png`
  - `game-live-hud-corner-frame-uniform-cell.png`
  - `game-live-speed-accent-green-uniform-cell.png`
  - `game-live-soft-glint-cyan-candidate-uniform-cell.png` は未使用候補。
- 透明assetは built-in `image_gen` で #00ff00 chroma-key 背景つき素材sheetとして生成し、ローカルで背景除去した。採用assetはすべて `768 x 512` canvas / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `game_live` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- 大きなHUDパネルは背景へ焼き込んだため、Phase 5 `game_live` presetから `図形 5（斜め強調ベース）` は外した。将来分離する場合は、背景内の左HUDパネル、右立ち絵用の光、下部HUD床を `game-live-panel-*` assetとして再生成する。
- ラベル / 時刻 / 見出し / サブの文字は editable text layerとして維持した。
- 時刻下ライン / ゲーム感ライン / 立ち絵guide枠は shape layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-game-live-preset-contract.mjs`
  - Phase 5背景、個別asset、editable text layer、shape layer責務に加え、個別asset 5点が同一 `768 x 512` canvasであること、PNG alpha境界に上下左右最低76px以上の透明余白が残ることを検証する。
  - `game-live-soft-glint-cyan-candidate-uniform-cell.png` は存在だけ検証し、preset未使用候補として扱う。
- 既存contract更新:
  - `scripts/thumbnail-phase2-preset-assets-contract.mjs` は `game_live` がPhase 5へ移った前提に変更した。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `game_live` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- UI確認:
  - static outputを `localhost:3029` で配信し、in-app browserで `ゲーム実況` presetを適用。1366pxでPhase 5背景、Phase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることと console error / warn 0件を確認。
  - Playwrightで 390 / 820 / 1024 / 1280 / 1366px を確認。各幅でcanvas非blank、水平overflow 0。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputでは Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加したPhase 5 asset requestの404ではない。
  - 確認スクリーンショット: `output/playwright/phase5-game-live-final-390.png` / `phase5-game-live-final-820.png` / `phase5-game-live-final-1024.png` / `phase5-game-live-final-1280.png` / `phase5-game-live-final-1366.png`

## Phase 5 `コラボ` Implementation Notes

- 実装日: 2026-05-09
- 作業branch / worktree: `codex/thumbnail-phase5-collaboration-preset` / `.worktrees/thumbnail-phase5-collaboration-preset`
- 前提確認: PR #46 `[codex] Renew game live thumbnail phase 5 preset` は `main` に merge済み。merge commit `84160c9d317bebb2c47ef78411ad0e6c1de29959` を作業開始時の `origin/main` が指していることを確認した。
- 対象: `コラボ` presetのみ。全9プリセットへは広げていない。
- 参照モック: `docs/mockups/thumbnail-editor-phase2-candidates/collaboration-mock-imagegen-2026-05-08.png`
- 背景: `public/assets/images/thumbnail-editor/phase5/collaboration-background-v1.png`
  - 参照モックの右側ステージ、2人分のスポットライト、円形guide、紙吹雪密度を基準にした。
  - 背景assetには読める文字、ロゴ、人物、キャラクター、実画面、SNS UI、ラベル文字、時刻文字は入れていない。
  - 左側はテキスト安全領域として暗く開け、参照モックに含まれる見出し / ラベル / 時刻 / サブは焼き込まず、editable text layerで再構成した。
- 追加調整: user確認後に `imagegen` で背景 / ラベル土台 / 時刻バッジ / 接続アクセントを再生成し、背景側へステージ光と2人配置の大きな空間を焼き込んだ。2人guideスポットは人物シルエットや濁りが残らない透明PNGへ再正規化し、preset上では補助レイヤーとして低opacityにした。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `collaboration-label-plaque-warm-uniform-cell.png`
  - `collaboration-time-badge-rose-gold-uniform-cell.png`
  - `collaboration-duo-guide-spotlight-uniform-cell.png`
  - `collaboration-connection-accent-uniform-cell.png`
  - `collaboration-soft-glint-candidate-uniform-cell.png` は未使用候補。
- 個別assetは `768 x 512` canvas / 透明PNG / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `collaboration` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- ラベル / 時刻 / 見出し / サブの文字は editable text layerとして維持した。
- 左右2人分のguideと二人配置ラインは shape layerとして残し、2人guideスポットと接続アクセントは個別asset layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-collaboration-preset-contract.mjs`
  - Phase 5背景、背景asset存在 / `1280 x 720`、個別asset存在 / `768 x 512` / alpha余白、editable text layer、2人guide / 舞台接続要素、draft normalization 後の背景維持を検証する。
  - `collaboration-soft-glint-candidate-uniform-cell.png` は存在だけ検証し、preset未使用候補として扱う。
- 既存contract更新:
  - `scripts/thumbnail-phase2-preset-assets-contract.mjs` は `collaboration` がPhase 5へ移った前提に変更した。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `collaboration` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- 検証:
  - `node scripts/thumbnail-phase5-collaboration-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-game-live-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS
  - `npm run build` PASS。worktree内 `package-lock.json` と root 側 lockfile の重複による Next.js workspace root 推定 warning は出たが、build は成功した。
- UI確認:
  - static outputを `localhost:3030` で配信し、Playwrightで `コラボ` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 追加調整後は worktree dev server `localhost:3000` でも Playwrightで同じ5幅を確認した。
  - 各幅でcanvas非blank、水平overflow 0を確認。1024px以上ではPhase 5背景、Phase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputではPhase 5 `collaboration` asset requestはすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加したPhase 5 assetの読み込み失敗ではない。
  - pixel sampling時のみChromeのCanvas readback warningが出る。
  - 確認スクリーンショット: `output/playwright/phase5-collaboration-final-390.png` / `phase5-collaboration-final-820.png` / `phase5-collaboration-final-1024.png` / `phase5-collaboration-final-1280.png` / `phase5-collaboration-final-1366.png`

## Phase 5 `雑談` Implementation Notes

- 実装日: 2026-05-09
- 作業branch / worktree: `codex/thumbnail-phase5-chatting-preset` / `.worktrees/thumbnail-phase5-chatting-preset`
- 前提確認: PR #47 `[codex] Renew collaboration thumbnail phase 5 preset` は `main` に merge済み。merge commit `32b38c5e21602cf922a413755376b7856e745252` を作業開始時の `origin/main` が指していることを確認した。
- 対象: `雑談` presetのみ。全9プリセットへは広げていない。
- 対象選定: `雑談` は Phase 4 review で余白、可読性、控えめな装飾方針が安定しており、既存asset追加量も少ないため、`歌枠` より Phase 5背景 + 最小個別assetへ移しやすいと判断した。
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。CLI fallback / true native transparency は使っていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/chatting-background-v1.png`
  - 既存 `chatting-background.png` / `chatting-mock.png` の落ち着いた暖色、右側の立ち絵余白、トーク向けのやわらかい光を参照し、Phase 5背景として再生成した。
  - 背景assetには読める文字、ロゴ、人物、キャラクター、実画面、SNS UI、ラベル文字、時刻文字は入れていない。
- 追加調整:
  - 初回Phase 5背景は明るいパネル感が強く、元モックの夜の部屋感と奥行きが弱かったため、背景を暗めの室内、ペンダントライト、窓のbokeh、右側の差し替え余白へ寄せて再生成した。
  - 背景には人物、キャラクター、顔、体、人物シルエット、読める文字、SNS UI、実画面は入れていない。
  - ラベル土台は大きいステッカー風から、元モックに近い細いカプセルへ差し替えた。
  - 時刻バッジ、見出し、サブ、右立ち絵guideは、Phase 5構造を維持したまま元モック寄りに縮めて再配置した。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `chatting-label-plaque-cozy-uniform-cell.png`
  - `chatting-time-badge-cozy-uniform-cell.png`
  - `chatting-soft-glow-dots-uniform-cell.png`
- 透明assetは built-in `image_gen` で #00ff00 chroma-key 背景つき素材として生成し、`C:\Users\taka\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py` で背景除去した。採用assetはすべて `768 x 512` canvas / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `chatting` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- ラベル / 時刻 / 見出し / サブの文字は editable text layerとして維持した。
- 立ち絵guide、やわらかい下線、時刻アイコンは shape layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-chatting-preset-contract.mjs`
  - Phase 5背景、背景asset存在 / `1280 x 720`、個別asset存在 / `768 x 512` / alpha余白、editable text layer、guide / 装飾のshape・asset責務、draft normalization 後の背景維持を検証する。
- 既存contract更新:
  - `scripts/thumbnail-phase3-preset-assets-contract.mjs` は `chatting` がPhase 5へ移った前提に変更した。既存 Phase 3背景assetは保存済みdraft互換のため残す。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `chatting` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- RED確認:
  - 新規contractは実装前に `chatting uses the phase 5 generated background` で失敗し、実装後にPASSした。
- 検証:
  - `node scripts/thumbnail-phase5-chatting-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-collaboration-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-game-live-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS
  - `npm run build` PASS。worktree内 `package-lock.json` と root 側 lockfile の重複による Next.js workspace root 推定 warning は出たが、build は成功した。
- UI確認:
  - static outputを `localhost:3031` で配信し、Playwrightで `雑談` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 各幅でcanvas非blank、horizontal overflow 0を確認。1024px以上ではPhase 5背景、Phase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputでは追加した Phase 5 `chatting` asset request はすべて 200。1024px以上では Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加したPhase 5 assetの読み込み失敗ではない。
  - 390 / 820pxでは RSC prefetch 404は出ず、pixel sampling時のみChromeのCanvas readback warningが出る。静的配信中の内部HEAD request abortは追加assetの失敗ではない。
  - 確認スクリーンショット: `output/playwright/phase5-chatting-final-390.png` / `phase5-chatting-final-820.png` / `phase5-chatting-final-1024.png` / `phase5-chatting-final-1280.png` / `phase5-chatting-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-chatting-canvas-static-clean-1280x720.png`

## Phase 5 `歌枠` Implementation Notes

- 実装日: 2026-05-09
- 作業branch / worktree: `codex/thumbnail-phase5-karaoke-preset` / `.worktrees/thumbnail-phase5-karaoke-preset`
- 前提確認: PR #48 `[codex] Renew chatting thumbnail phase 5 preset` は `main` に merge済み。merge commit `97986f46cd6e8d8853f981ff1a29f8830856ee69` を作業開始時の `origin/main` が指していることを確認した。
- 対象: `歌枠` presetのみ。全9プリセットへは広げていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/karaoke-background-v1.png`
  - 既存 `karaoke-background.png` / `karaoke-mock.png` の紫基調、左側のテキスト安全領域、右側の立ち絵差し替え余白、光と曲線の方向性を参照した。
  - 背景assetには読める文字、ロゴ、人物、キャラクター、実画面、SNS UI、ラベル文字、時刻文字は入れていない。
- 追加調整: 初回Phase 5背景はモックに比べて密度とステージ感が落ち、見出しも小さくなりすぎていたため、Phase 1の高密度背景を `1280 x 720` へ正規化して採用し直した。見出しは巨大な `歌枠` と `SINGING STREAM` の2つのeditable text layerへ分け、右立ち絵枠は縦長の角付きフレームへ寄せた。
- 追加調整2: user確認後、モック右側の装飾枠と音符の存在感がまだ弱かったため、右立ち絵枠asset、ピンク/金の音符asset、ピンク三角アクセントassetを追加した。初回追加assetは手描き線が太く低品質に見えたため、user提供のグリーンバック素材からキー抜きし、Phase 5用 `768 x 512` 透明PNGへ正規化し直した。小物追加はモック上の主要要素に絞り、対象preset外、schema、素材ライブラリUI、フォントは変更していない。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `karaoke-label-plaque-rose-uniform-cell.png`
  - `karaoke-time-badge-gold-uniform-cell.png`
  - `karaoke-sparkle-cluster-rose-cyan-uniform-cell.png`
  - `karaoke-standee-frame-glow-uniform-cell.png`
  - `karaoke-music-note-rose-uniform-cell.png`
  - `karaoke-music-note-gold-uniform-cell.png`
  - `karaoke-triangle-burst-rose-uniform-cell.png`
- 個別assetは `768 x 512` canvas / 透明PNG / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `karaoke` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- ラベル / 時刻 / 見出し / サブの文字は editable text layerとして維持した。
- 立ち絵guide、ラベル横ライン、見出し下ライン、時刻下ラインは shape layerとして残した。Phase 4の多数小物から、モック再現に必要な右枠、音符、sparkle、ラベル、時刻土台の7点のPhase 5個別assetへ整理した。
- 追加contract: `scripts/thumbnail-phase5-karaoke-preset-contract.mjs`
  - Phase 5背景、背景asset存在 / `1280 x 720`、個別asset存在 / `768 x 512` / alpha余白、editable text layer、guide / 装飾のshape・asset責務、draft normalization 後の背景維持を検証する。
- 既存contract更新:
  - `scripts/thumbnail-phase1-preset-assets-contract.mjs` は `karaoke` がPhase 5へ移った前提に変更した。既存 Phase 1背景assetは保存済みdraft互換のため残す。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `karaoke` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- RED確認:
  - 新規contractは実装前に `karaoke uses the phase 5 generated background` で失敗し、実装後にPASSした。
- 検証:
  - `node scripts/thumbnail-phase5-karaoke-preset-contract.mjs` PASS
  - 既存Phase 5 contract群 PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `npm run build` PASS。worktree内 `package-lock.json` と root 側 lockfile の重複による Next.js workspace root 推定 warning は出たが、build は成功した。
- UI確認:
  - static outputを `localhost:3032` で配信し、Playwrightで `歌枠` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 各幅でcanvas非blank、horizontal overflow 0を確認。1024px以上ではPhase 5背景、Phase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputでは追加した Phase 5 `karaoke` asset request はすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加したPhase 5 assetの読み込み失敗ではない。
  - 追加調整2後は static outputを `localhost:3034` で配信し、同じ 390 / 820 / 1024 / 1280 / 1366px を再確認した。各幅でcanvas非blank、horizontal overflow 0。1024px以上では追加した音符 / 右枠 / ピンク三角アクセントassetを含むPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認した。追加asset requestの404はなし。
  - pixel sampling時のみChromeのCanvas readback warningが出る。
  - 確認スクリーンショット: `output/playwright/phase5-karaoke-final-390.png` / `phase5-karaoke-final-820.png` / `phase5-karaoke-final-1024.png` / `phase5-karaoke-final-1280.png` / `phase5-karaoke-final-1366.png`

## Phase 5 `配信告知` Implementation Notes

- 実装日: 2026-05-09
- 前提確認: PR #49 `[codex] Renew karaoke thumbnail phase 5 preset` は `main` に merge済み。merge commit `eef2748cf22f97d753fbd06f6d8ab6659a8e7c35` を作業開始時のlocal `main` / `origin/main` が含むことを確認した。
- 作業branch / worktree: `codex/thumbnail-phase5-stream-preset` / `.worktrees/thumbnail-phase5-stream-preset`
- 対象: `配信告知` presetのみ。`週間予定` や全9プリセットへは広げていない。
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。CLI fallback / true native transparency は使っていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/stream-announce-background-v1.png`
  - 既存 `stream-announce-background.png` / `stream-announce-mock.png` の方向性を参照し、濃紺のサイバー背景、シアン発光、右側の立ち絵配置余白、左側のテキスト安全領域を持つ Phase 5 背景として生成した。
  - 読める文字、ロゴ、人物、キャラクター、実動画スクショ、実ゲーム画面、SNS UI、ラベル文字、時刻文字は入れていない。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `stream-label-plaque-cyan-uniform-cell.png`
  - `stream-time-badge-magenta-cyan-uniform-cell.png`
  - `stream-standee-frame-glow-uniform-cell.png`
  - `stream-spark-cluster-cyan-uniform-cell.png`
  - `stream-triangle-accent-magenta-uniform-cell.png`
- 透明assetは built-in `image_gen` で #00ff00 chroma-key 背景つき素材として生成し、`C:\Users\taka\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py` で背景除去した。採用assetはすべて `768 x 512` canvas / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `stream_announce` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- ラベル / 時刻 / 見出し / サブの文字は editable text layerとして維持した。
- ラベル横ライン / 見出し下ライン / 時刻下ライン / 立ち絵挿入ガイドは shape layerとして残した。
- 追加contract: `scripts/thumbnail-phase5-stream-preset-contract.mjs`
  - 実装前REDは `stream_announce uses the phase 5 generated background` で確認した。
  - Phase 5背景、個別asset、editable text layer、shape layer責務に加え、個別asset 5点が同一 `768 x 512` canvasであること、PNG alpha境界に上下左右最低76px以上の透明余白が残ることを検証する。
- 既存contract更新:
  - `scripts/thumbnail-phase1-preset-assets-contract.mjs` は `stream_announce` がPhase 5へ移った前提に変更した。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `stream_announce` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す。
- 検証:
  - `node scripts/thumbnail-phase5-stream-preset-contract.mjs` PASS
  - 既存Phase 5 contract群 PASS
  - Phase 1〜4 / preset safety / discovery / layer management / handoff / sns split contracts PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS。LF -> CRLF warningのみ
  - `npm run build` PASS。worktree と root のlockfile重複によるNext.js workspace root推定warningのみ発生。
- UI確認:
  - static outputを `localhost:3036` で配信し、Playwrightで `配信告知` presetを確認。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 各幅でcanvas非blank、horizontal overflow 0を確認。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。
  - static outputではPhase 5 asset requestはすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加assetの読み込み失敗ではない。Canvas pixel sampling由来の readback warning も確認した。
  - 確認スクリーンショット: `output/playwright/phase5-stream-final-390.png` / `phase5-stream-final-820.png` / `phase5-stream-final-1024.png` / `phase5-stream-final-1280.png` / `phase5-stream-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-stream-canvas-static-clean-1280x720.png`

## Phase 5 `週間予定` Implementation Notes

- 実装日: 2026-05-10
- 前提確認: PR #50 `[codex] Renew stream announcement thumbnail phase 5 preset` は `main` に merge済み。merge commit `d80ca2e0e97b959c79bede1a4c0faf39d3d7103b` を作業開始時の `origin/main` が含むことを確認した。
- 作業branch / worktree: `codex/thumbnail-phase5-weekly-schedule-preset` / `.worktrees/thumbnail-phase5-weekly-schedule-preset`
- 対象: `週間予定` presetのみ。全9プリセットへは広げていない。
- 画像生成: `imagegen` skill + built-in `image_gen` toolを使用した。CLI fallback / true native transparency は使っていない。
- 背景: `public/assets/images/thumbnail-editor/phase5/weekly-schedule-background-v1.png`
  - 既存 `weekly-schedule-background.png` / `weekly-schedule-mock.png` の夜配信部屋、青シアンの発光、右側7行予定表、左側テキスト安全領域の方向性を参照した。
  - 背景には大きな予定表フレーム、7行の空パネル、光、抽象ガラスパネル、奥行き、非編集の装飾要素を焼き込んだ。
  - 初回確認後の表示feedbackを受け、曜日専用の小枠を背景から外し、右側予定一覧は分断しない連続横長パネルへ差し替えた。
  - 読める文字、曜日、日付、ロゴ、人物、キャラクター、実画面、SNS UI、ラベル文字、予定テキストは入れていない。
- 個別asset: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - `weekly-schedule-label-plaque-cyan-uniform-cell.png`
  - `weekly-schedule-range-badge-blue-uniform-cell.png`
  - `weekly-schedule-table-accent-cyan-uniform-cell.png`
  - `weekly-schedule-corner-glints-cyan-uniform-cell.png`
- 透明assetは built-in `image_gen` で #00ff00 chroma-key 背景つき素材として生成し、ローカルで背景除去 / despill / 同一canvas配置を行った。採用assetはすべて `768 x 512` canvas / 最低76px以上の透明余白へ正規化した。
- `lib/thumbnail-editor.ts` は `weekly_schedule` presetだけをPhase 5構造へ更新した。schema変更、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は行っていない。
- `見出し` / `時刻` / `ラベル`、曜日別の `曜日` / `時間` / `予定` は editable text layerとして維持した。背景の予定表パネル位置に合わせ、曜日 / 時間 / 予定の列x座標と幅はPhase 5配置へ更新した。曜日列は小枠前提をやめ、横長パネル内で読める幅へ広げた。
- `予定表フレーム` / `予定表区切り線 上` / `予定表区切り線 下` / `立ち絵挿入ガイド` は shape layerとして残した。行panelは背景へ焼き込んだため、プリセット側で追加の行panelは重ねていない。
- 追加contract: `scripts/thumbnail-phase5-weekly-schedule-preset-contract.mjs`
  - 実装前REDは `weekly_schedule uses the phase 5 generated background` で確認した。
  - Phase 5背景、背景asset存在 / `1280 x 720`、個別asset存在 / `768 x 512` / alpha余白、editable `見出し` / `時刻` / `ラベル`、曜日別の `曜日` / `時間` / `予定`、予定表 / guide のshape・asset責務、draft normalization 後の背景維持を検証する。
- 既存contract更新:
  - `scripts/thumbnail-phase1-preset-assets-contract.mjs` は `weekly_schedule` がPhase 5へ移った前提に変更した。
  - `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `weekly_schedule` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は保存済みdraft互換のため残す。
  - `scripts/thumbnail-layer-management-contract.mjs` はPhase 5の週間予定配置へ更新した。
- 検証:
  - `node scripts/thumbnail-phase5-weekly-schedule-preset-contract.mjs` PASS
  - 既存Phase 5 contract群 PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS。LF -> CRLF warningのみ
  - `npm run build` PASS。worktree と root のlockfile重複によるNext.js workspace root推定warningのみ発生。
- UI確認:
  - static outputを `localhost:3044` で配信し、Browser / Playwrightで `週間予定` presetを確認。確認幅は 390 / 820 / 1024 / 1280 / 1366px。
  - 各幅でcanvas非blank、horizontal overflow 0を確認。1024px以上ではPhase 5背景、Phase 5個別asset、shape layer、editable text layer、曜日別グループ内の `曜日` / `時間` / `予定` がレイヤー一覧に残ることを確認。
  - static outputでは追加した Phase 5 `weekly_schedule` asset request はすべて 200。1024px以上では Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加したPhase 5 assetの読み込み失敗ではない。
  - 確認スクリーンショット: `output/playwright/phase5-weekly-final-390.png` / `phase5-weekly-final-820.png` / `phase5-weekly-final-1024.png` / `phase5-weekly-final-1280.png` / `phase5-weekly-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-weekly-canvas-static-clean-1280x720.png`
