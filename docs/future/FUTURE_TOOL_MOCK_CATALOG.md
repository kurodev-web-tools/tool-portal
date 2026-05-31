# Future Tool Mock Catalog

2026-05-31 mock-only / docs-only comparison catalog. The images were generated with built-in imagegen mode and then copied into this repository. CLI fallback and `OPENAI_API_KEY` were not used.

This catalog is for priority discussion only. It does not add Next routes, React components, CSS, shared components, storage, schema, auth, billing, quota, OAuth, API calls, localStorage, IndexedDB, handoff payloads, or changes to existing tool behavior.

## Image Inventory

Each candidate has exactly three viewport mock files. README files and this catalog use the same filenames:

- `docs/mockups/future-tools/stream-announcement-post-maker/desktop.png`
- `docs/mockups/future-tools/stream-announcement-post-maker/tablet-landscape.png`
- `docs/mockups/future-tools/stream-announcement-post-maker/mobile.png`
- `docs/mockups/future-tools/obs-scene-checklist/desktop.png`
- `docs/mockups/future-tools/obs-scene-checklist/tablet-landscape.png`
- `docs/mockups/future-tools/obs-scene-checklist/mobile.png`
- `docs/mockups/future-tools/stream-overlay-kit-builder/desktop.png`
- `docs/mockups/future-tools/stream-overlay-kit-builder/tablet-landscape.png`
- `docs/mockups/future-tools/stream-overlay-kit-builder/mobile.png`
- `docs/mockups/future-tools/vtuber-profile-media-kit-generator/desktop.png`
- `docs/mockups/future-tools/vtuber-profile-media-kit-generator/tablet-landscape.png`
- `docs/mockups/future-tools/vtuber-profile-media-kit-generator/mobile.png`
- `docs/mockups/future-tools/clip-shorts-title-card-maker/desktop.png`
- `docs/mockups/future-tools/clip-shorts-title-card-maker/tablet-landscape.png`
- `docs/mockups/future-tools/clip-shorts-title-card-maker/mobile.png`

## Comparison

| Candidate | Intended user | Main workflow | Strength | Implementation risk | Existing connection |
| --- | --- | --- | --- | --- | --- |
| 配信告知ポストメーカー | 配信告知を毎回作る VTuber / 配信者 | 配信情報を入力し、告知文と告知画像を copy / export する | Schedule Calendar と Thumbnail Editor に接続しやすく、posting API なしでも MVP 化しやすい | 自動投稿 / 予約投稿を入れると OAuth、外部 API、platform policy が増える | Thumbnail Editor export、Schedule Calendar、SNS Split Image Maker |
| OBS Scene Checklist / 配信前チェックリスト | 配信前の抜け漏れを減らしたい配信者 | scene / audio / capture / network / moderation を checklist で確認する | manual checklist なら storage / auth / external API なしで低リスク | OBS WebSocket / local app integration を求めると browser-only 境界を越える | Schedule Calendar、account preferences later、portal utility |
| Stream Overlay Kit Builder | 配信 overlay を自作したい creator | overlay 部品を canvas に配置し、safe area と style を調整して書き出す | creator suite の見た目が強く、Thumbnail Editor の資産を活かしやすい | layer editor、transparent export、safe area、asset 管理が重い | Thumbnail Editor material / font / export 方針 |
| Vtuber Profile / Media Kit Generator | 案件 / コラボ向け資料を整えたい VTuber | profile、brand、asset、contact note をまとめて PDF / social card 化する | 商用導線や credibility に効く | public hosting、privacy、contact、asset storage、auth boundary が絡みやすい | account preferences、legal foundation、Thumbnail Editor assets |
| Clip / Shorts Title Card Maker | 切り抜き / short video の表紙を作りたい creator | 9:16 title card に title、timestamp、safe area、template を設定して書き出す | Thumbnail Editor の vertical expansion と相性がよい | video import / crop / batch export まで広げると schema follow-up と衝突しやすい | Thumbnail Editor 9:16 / crop / typography backlog |

## Recommended Next Candidate

推奨次候補は **配信告知ポストメーカー**。

理由:

- 初回 MVP を `posting API なし / OAuth なし / copy + image export only` に閉じやすい。
- 既存の Thumbnail Editor と Schedule Calendar に接続しやすく、今ある creator workflow の延長として説明しやすい。
- storage / schema / auth / billing を触らずに、template-driven UI shell と静的 fixture から始められる。

次点は **OBS Scene Checklist / 配信前チェックリスト**。manual checklist に閉じれば最も低リスクだが、差別化には OBS 連携期待が出やすいので、初回は「連携なし」の価値が十分か確認してから進める。

## Validation Note

- Generated image count target: 5 candidates x 3 viewports = 15 files.
- Filename contract: each README and this catalog reference `desktop.png`, `tablet-landscape.png`, and `mobile.png` for each candidate.
- Lint / build / width checks are intentionally not run for this mock-only PR because it adds no route, component, CSS, JavaScript, schema, storage, auth, billing, or runtime behavior. `git diff --check` is still required.
- The generated UI text is illustrative and does not lock product copy or exact specifications.
