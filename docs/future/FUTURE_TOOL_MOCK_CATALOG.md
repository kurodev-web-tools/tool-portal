# Future Tool Mock Catalog

2026-06-01 update: mock-only / docs-only comparison catalog expansion. The images were generated with built-in imagegen mode and then copied into this repository. CLI fallback and `OPENAI_API_KEY` were not used.

This catalog is for priority discussion only. It does not add Next routes, React components, CSS, shared components, storage, schema, auth, billing, quota, OAuth, API calls, localStorage, IndexedDB, handoff payloads, OBS integration, video processing, external posting, or changes to existing tool behavior.

## Image Inventory

Each mocked candidate has exactly three viewport mock files. README files and this catalog use the same filenames:

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
- `docs/mockups/future-tools/stream-run-of-show-planner/desktop.png`
- `docs/mockups/future-tools/stream-run-of-show-planner/tablet-landscape.png`
- `docs/mockups/future-tools/stream-run-of-show-planner/mobile.png`
- `docs/mockups/future-tools/collab-stream-agenda-role-sheet/desktop.png`
- `docs/mockups/future-tools/collab-stream-agenda-role-sheet/tablet-landscape.png`
- `docs/mockups/future-tools/collab-stream-agenda-role-sheet/mobile.png`
- `docs/mockups/future-tools/sponsor-campaign-brief-maker/desktop.png`
- `docs/mockups/future-tools/sponsor-campaign-brief-maker/tablet-landscape.png`
- `docs/mockups/future-tools/sponsor-campaign-brief-maker/mobile.png`
- `docs/mockups/future-tools/viewer-engagement-prompt-board/desktop.png`
- `docs/mockups/future-tools/viewer-engagement-prompt-board/tablet-landscape.png`
- `docs/mockups/future-tools/viewer-engagement-prompt-board/mobile.png`
- `docs/mockups/future-tools/stream-recap-show-notes-generator/desktop.png`
- `docs/mockups/future-tools/stream-recap-show-notes-generator/tablet-landscape.png`
- `docs/mockups/future-tools/stream-recap-show-notes-generator/mobile.png`

## Added Candidate Pool

This pass lists 10 additional unimplemented tool candidates that do not duplicate the existing 5 mocked candidates. Five were selected for viewport mocks because they cover different workflow moments and expose useful priority tradeoffs.

| Candidate | Mock coverage | Why it matters for comparison |
| --- | --- | --- |
| Stream Run-of-Show Planner | New 3-viewport mock | Tests a pre-stream planning workflow that can stay manual and low-dependency. |
| Collab Stream Agenda / Role Sheet | New 3-viewport mock | Tests collaboration coordination without committing to shared editing or external invites. |
| Sponsor / Campaign Brief Maker | New 3-viewport mock | Tests business / monetization value while surfacing legal, billing, and analytics risk early. |
| Viewer Engagement Prompt Board | New 3-viewport mock | Tests a live-operation aid that is useful without reading live chat or calling APIs. |
| Stream Recap / Show Notes Generator | New 3-viewport mock | Tests post-stream workflow value without video import, transcription, or AI API. |
| Giveaway / Raffle Planning Board | Listed only | Useful for stream events, but randomness, fairness, and platform policy make it riskier. |
| Asset Pack Organizer | Listed only | Strong creator-suite fit, but file storage, metadata, and sync boundaries need design first. |
| Thumbnail A/B Comparison Board | Listed only | Strong Thumbnail Editor tie-in, but overlaps existing thumbnail backlog and may need metric policy. |
| Merch Drop Announcement Kit | Listed only | Clear creator commerce value, but storefront, pricing, and fulfillment expectations are out of scope. |
| Community Poll Image Maker | Listed only | Lightweight social asset idea, but overlaps engagement prompts and announcement-image workflows. |

## Comparison

| Candidate | Coverage | Intended user | Main workflow | Strength | Implementation risk | Existing connection |
| --- | --- | --- | --- | --- | --- | --- |
| 配信告知ポストメーカー | PR #284 mock | 配信告知を毎回作る VTuber / 配信者 | 配信情報を入力し、告知文と告知画像を copy / export する | Schedule Calendar と Thumbnail Editor に接続しやすく、posting API なしでも MVP 化しやすい | 自動投稿 / 予約投稿を入れると OAuth、外部 API、platform policy が増える | Thumbnail Editor export、Schedule Calendar、SNS Split Image Maker |
| OBS Scene Checklist / 配信前チェックリスト | PR #284 mock | 配信前の抜け漏れを減らしたい配信者 | scene / audio / capture / network / moderation を checklist で確認する | manual checklist なら storage / auth / external API なしで低リスク | OBS WebSocket / local app integration を求めると browser-only 境界を越える | Schedule Calendar、account preferences later、portal utility |
| Stream Overlay Kit Builder | PR #284 mock | 配信 overlay を自作したい creator | overlay 部品を canvas に配置し、safe area と style を調整して書き出す | creator suite の見た目が強く、Thumbnail Editor の資産を活かしやすい | layer editor、transparent export、safe area、asset 管理が重い | Thumbnail Editor material / font / export 方針 |
| Vtuber Profile / Media Kit Generator | PR #284 mock | 案件 / コラボ向け資料を整えたい VTuber | profile、brand、asset、contact note をまとめて PDF / social card 化する | 商用導線や credibility に効く | public hosting、privacy、contact、asset storage、auth boundary が絡みやすい | account preferences、legal foundation、Thumbnail Editor assets |
| Clip / Shorts Title Card Maker | PR #284 mock | 切り抜き / short video の表紙を作りたい creator | 9:16 title card に title、timestamp、safe area、template を設定して書き出す | Thumbnail Editor の vertical expansion と相性がよい | video import / crop / batch export まで広げると schema follow-up と衝突しやすい | Thumbnail Editor 9:16 / crop / typography backlog |
| Stream Run-of-Show Planner | New mock | 配信の進行、尺、告知枠、休憩、締めを整理したい配信者 | segment、所要時間、話す順番、準備 checklist を進行表として copy / export する | manual planner に閉じやすく、pre-stream の中心 workflow になりやすい | calendar sync、OBS cue、履歴保存、チーム共有を入れると auth / storage / API が増える | Schedule Calendar、配信告知ポストメーカー、Stream Recap / Show Notes Generator |
| Collab Stream Agenda / Role Sheet | New mock | コラボ配信の担当と流れを揃えたい配信者 | agenda、participant role、素材、共有 note を briefing sheet 化する | single-user draft なら低依存で、コラボ前の認識合わせに価値が出る | shared editing、invite、calendar / chat app sync が入ると permission 設計が必要 | Schedule Calendar、Stream Run-of-Show Planner、account preferences later |
| Sponsor / Campaign Brief Maker | New mock | 案件配信やタイアップ要件を整理したい creator | deliverables、talking points、disclosure note、素材 checklist を brief 化する | business / monetization 価値を比較しやすく、media kit と接続しやすい | 契約、支払い、広告表記、成果計測まで扱うと legal / billing / analytics が重い | Media Kit Generator、legal foundation、Thumbnail Editor export |
| Viewer Engagement Prompt Board | New mock | 配信中の話題や返しを手元に置きたい配信者 | prompt を segment / tone / safety note で整理し、次に読む案を copy / cue する | live API なしでも配信中に使える補助 tool として比較しやすい | live chat、AI 生成、viewer data、moderation automation を入れると privacy / quota が必要 | Comment Translator planning、Run-of-Show Planner、Schedule Calendar |
| Stream Recap / Show Notes Generator | New mock | 配信後の概要、リンク、follow-up をまとめたい配信者 | 手入力 note と highlight から recap draft / show notes を copy / export する | post-stream workflow を埋められ、動画処理なしの manual MVP に閉じやすい | video import、transcription、AI summary、external posting を入れると API / storage / privacy が重い | Run-of-Show Planner、Clip / Shorts Title Card Maker、Comment Translator later |
| Giveaway / Raffle Planning Board | Listed only | 企画配信で抽選や景品管理を準備したい配信者 | entry rule、prize、schedule、winner note を整理する | イベント配信で使いやすいが、まずは planning-only に閉じる必要がある | ランダム抽選、参加者 data、platform rule、景品規約が絡む | Schedule Calendar、Viewer Engagement Prompt Board |
| Asset Pack Organizer | Listed only | 素材、フォント、背景、装飾を整理したい creator | asset set、用途、license note、export checklist を管理する | Thumbnail Editor / overlay / media kit を横断する基盤候補 | file storage、metadata、license、sync を扱うと schema / storage が重い | Thumbnail Editor material / font、Overlay Kit、Media Kit |
| Thumbnail A/B Comparison Board | Listed only | サムネ案を比較して選びたい creator | 複数案を並べ、readability、safe area、copy、反応仮説を比較する | Thumbnail Editor の意思決定補助として分かりやすい | metric import、保存履歴、analytics を入れると privacy / schema が必要 | Thumbnail Editor、SNS Split Image Maker |
| Merch Drop Announcement Kit | Listed only | グッズ販売告知を整えたい creator | 商品情報、告知画像、販売期間、注意事項を announcement kit 化する | commerce 近接の creator workflow として差別化しやすい | storefront、pricing、fulfillment、payment expectations が出やすい | Thumbnail Editor export、SNS Split Image Maker、legal foundation |
| Community Poll Image Maker | Listed only | 投票や企画募集の画像を作りたい配信者 | poll question、choices、deadline、visual template を作る | SNS 投稿素材として軽く始めやすい | platform poll API や vote collection を入れると OAuth / storage が必要 | Stream Announcement Post Maker、Viewer Engagement Prompt Board |

## Recommended Next Candidate

推奨次候補は **Stream Run-of-Show Planner**。

理由:

- 初回を `manual planner / copy-export only` に閉じれば、OAuth、OBS、calendar sync、storage schema を避けたまま価値を出しやすい。
- Schedule Calendar、配信告知、配信後 recap の中間に置けるため、既存ツール群との接続を説明しやすい。
- Viewer Engagement Prompt Board や Sponsor Brief よりも、日常的な利用頻度と低実装リスクのバランスがよい。

次点は **配信告知ポストメーカー**。投稿 API なしの copy/export に閉じれば引き続き強いが、外部投稿や予約投稿への期待が出やすいため、Run-of-Show Planner より境界説明が重要になる。

比較目的の三番手は **Viewer Engagement Prompt Board**。Comment Translator と同じ配信中領域を補完できるが、live chat / AI 生成 / moderation automation を初回に入れない判断が必要になる。

この推奨は優先順位判断の材料であり、実装仕様や route 追加を確定するものではない。

## Validation Note

- Existing generated image count: 5 candidates x 3 viewports = 15 files.
- New generated image count: 5 candidates x 3 viewports = 15 files.
- Total mocked image count in this catalog: 10 candidates x 3 viewports = 30 files.
- Filename contract: each mocked candidate README and this catalog reference `desktop.png`, `tablet-landscape.png`, and `mobile.png`.
- Lint / build / width checks are intentionally not run for this mock-only PR because it adds no route, component, CSS, JavaScript, schema, storage, auth, billing, quota, OAuth, API call, OBS integration, video processing, external posting, or runtime behavior. `git diff --check` is still required.
- The generated UI text is illustrative and does not lock product copy or exact specifications.
