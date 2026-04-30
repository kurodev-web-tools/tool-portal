# PRELAUNCH_CHECKLIST_V0

## 目的

MVP公開対象を `Portal + Tools Index + Schedule Calendar` に固定し、公開前に最低限確認する項目をまとめる。

## 公開対象

- [ ] `/` がポータルTOPとして表示される
- [ ] `/tools` がツール一覧として表示される
- [ ] `/tools/schedule-calendar` が実用ツールとして表示される
- [ ] 上記3点以外の個別ツールは「準備中」表示で、直接利用できる導線を出さない

## ページ導線

- [ ] `/` から `/tools` へ遷移できる
- [ ] `/` から `/tools/schedule-calendar` へ遷移できる
- [ ] `/tools` から `/tools/schedule-calendar` へ遷移できる
- [ ] `/tools` の準備中カードは操作可能な個別ページ導線に見えない
- [ ] サイドバー / モバイルメニューから `Home` / `Tools` / `Schedule Calendar` へ戻れる
- [ ] `/` または `/tools` から「不具合報告 / 要望」の入口を確認できる

## レスポンシブ確認

- [ ] `390px`: モバイル統合UIとして、Home / Tools / Schedule Calendar の導線が見える
- [ ] `820px`: `~1023px` のモバイル統合UIとして、カード・フィルタ・Schedule Calendar の下部操作が崩れない
- [ ] `1024px`: `1024~1279px` のタブレット2ペインとして、Schedule Calendar の右パネルタブとポータル導線が見える
- [ ] `1366px`: `1280px~` のPC表示として、左サイドバー、ツール一覧、Schedule Calendar の作業領域が崩れない

## 基本SEO

- [ ] `/` の title / description が公開最小セットの入口として読める
- [ ] `/tools` の title / description がツール一覧として読める
- [ ] `/tools/schedule-calendar` の title / description が公開中ツールとして読める
- [ ] OG title / description の最低限が `app/layout.tsx` にある
- [ ] `lang="ja"` が維持されている

## Cloudflare Pages成果物

- [ ] `npm run build` で静的成果物 `out/` が生成される
- [ ] `out/index.html` が存在する
- [ ] `out/tools/index.html` が存在する
- [ ] `out/tools/schedule-calendar/index.html` が存在する
- [ ] `public/_headers` が存在し、build後に `out/_headers` として含まれる
- [ ] `_headers` に最低限の security headers と CSP が含まれる

## エラー表示方針

- [ ] 未実装ツールは404に飛ばさず、`/tools` 上の「準備中」表示で扱う
- [ ] 想定外URLの404はNext.js標準表示を許容する
- [ ] 500相当の障害はCloudflare Pages / Next.js標準表示を許容し、MVP後に専用表示を検討する

## 公開判定

- [ ] UI上の公開対象が `Portal + Tools Index + Schedule Calendar` として読み取れる
- [ ] 準備中項目が、すぐ使える機能や確約済み機能に見えない
- [ ] フィードバック入口が見つけられる
- [ ] 実行できなかった確認項目は `task.md` またはPR本文に理由と未確認範囲を残す
