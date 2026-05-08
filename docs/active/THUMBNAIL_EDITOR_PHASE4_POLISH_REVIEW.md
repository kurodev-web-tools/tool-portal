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
