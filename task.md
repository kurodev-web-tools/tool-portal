# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- 完了済みの Thumbnail Editor IRIAM 1:1 / material / font expansion の詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` に寄せる。

## Active Priorities

1. User account / preferences foundation
   - status: preference contract foundation completed on `codex/preference-contract-foundation`。Foundation plan is `docs/future/USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md`。
   - direction:
     - 今後の複数ツールと paid plan を前提にした共通基盤として設計する。
     - Thumbnail Editor、Schedule Calendar、Kuro Live Comment Translator、将来の local font feature で使い回す。
     - 保存対象候補は user preferences、recent fonts、tool settings、language / translation settings、plan / quota state。
     - auth provider、DB schema、billing、plan boundary、migration は候補比較に留め、実装は次 scope へ分ける。
   - first scope:
     - completed: 既存ツールの local-only 保存境界と、将来 account 保存へ移す候補を棚卸しした。
     - completed: login / paid plan / server sync の実装に進む前に、保存対象、非保存対象、移行しない payload を文書化した。
     - completed: `docs/future/USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md` を source of truth として、分類と禁止境界を検証する `scripts/preference-classification-contract.mjs` を追加した。
   - planning results:
     - sync candidate は locale / theme、Thumbnail recent / favorite preset ids、recent fonts、Schedule default view / week start / default time / duration、Translator target language / display preference、local font selected family refs などの軽量 preference に限定する。
     - explicit user action only は Thumbnail project draft、server asset library upload、Schedule events / templates / hashtag sets、Translator glossary / moderation terms / session settings。
     - local-only は tool handoff、IndexedDB image blobs、undo / draft history、Local Font Access permission / full scan result、browser-specific recovery state。
     - store禁止または初期対象外は browser `localStorage` の OAuth tokens、raw credentials、local font binary、full comment logs by default、viewer identifiers、handoff expired payload。
     - server sync 前提不可は local IndexedDB ref を含む draft、legacy localStorage schedule payload、handoff payload、local font availability、translator live session state。
   - recommended next implementation candidates:
     - first: preference contract foundation。保存分類の contract script / docs を追加し、既存 storage key と payload は変更しない。今回 branch で対応済み。
     - second: account / preferences shell。Auth 未接続のアカウント設定ページ、プラン表示枠、preferences 表示枠を作り、local-only 状態で確認する。次候補。
     - third: local preference adapter。既存 localStorage keys を維持し、migration なしで読み書き境界を薄く包む。
     - fourth: auth/provider decision spike。Supabase Auth / Clerk / Auth.js などを plan と quota 境界込みで比較する。
     - fifth: Auth 実装。ログイン / ログアウト、account session、profile / preferences の最小保存に閉じる。
     - sixth: account sync MVP。locale / theme + Thumbnail small preferences までに閉じ、draft / schedule / user material / translator tokens / billing を混ぜない。
     - seventh: Stripe Billing。Checkout Sessions、Customer Portal、webhook、server-authoritative quota を別 scope で扱う。
   - account settings shell direction:
     - 言語切り替えとテーマ切り替えは、ガワ制作時にアカウント設定ページへ持っていく。
     - 初回 shell PR では既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` の localStorage key を維持する。
     - 既存 header / drawer / rail の language / theme 導線は、設定ページ側で確認できる状態を作ってから重複整理する。
     - Auth 未接続時は「ログインすると同期できます」程度の placeholder に留め、実 sync / DB / Stripe は入れない。
   - unresolved:
     - 最初の account MVP を global locale/theme のみにするか、Thumbnail recent/favorite preset ids も含めるか。
     - Schedule Calendar は初回から sync するか、explicit import-only で始めるか。
     - auth provider と DB の最終候補。
     - paid plan が storage、translation quota、export convenience のどれを gate するか。
     - Translator session summary / glossary の retention。
     - account deletion 時の projects / uploaded assets / schedules / quota handling。
   - out of scope:
     - この段階の `task.md` では provider / schema / billing 実装を固定しない。
     - 個別ツールの大きな UI 実装と同時に進めない。
     - Thumbnail Editor preset / material / font / schema / export / handoff payload は変更しない。
   - verification:
     - `node scripts/preference-classification-contract.mjs` passed。
     - `npm run lint` passed。
     - `npx tsc --noEmit` passed。
     - `git diff --check` passed。
     - UI 変更なしのため browser width check は不要。

2. Kuro Live Comment Translator planning
   - status: user foundation の後に設計を見直す。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
     - ログイン / user settings / paid plan 基盤の方針に合わせて、保存項目と制限設計をタスク開始時に見直す。
   - out of scope:
     - 複数 platform 同時対応。
     - 自動返信 / 自動投稿。
     - quota / moderation 未設計の外部 API 実装。

3. Local font loading
   - status: user account / preferences foundation 後の later scope。
   - direction:
     - 端末に入っている font を直接読む Local Font Access 系は、ログイン / user settings 基盤の後に扱う。
     - DB に保存する場合も、基本は font family / PostScript name / style / fallback / last-seen state などの選択情報に留める。
     - font file 本体の保存は、ユーザーが明示的に upload した場合だけ別途検討する。
   - out of scope:
     - Google Fonts standard batch と同じ PR に混ぜない。
     - preset 初期値、handoff payload、schema に local font を混ぜない。

## Recommended Roadmap

1. User account / preferences foundation planning。
2. Preference contract foundation。
3. Account / preferences shell。Auth 未接続のまま、アカウント設定ページ、プラン表示枠、preferences 表示枠を作り、言語 / テーマ切り替えを設定ページへ移す。
4. Auth implementation。Supabase Auth などを接続し、ログイン / ログアウト、account session、最小 profile / preferences 保存を扱う。
5. Preferences sync MVP。locale / theme + Thumbnail small preferences までに閉じる。
6. Stripe Billing / quota foundation。Checkout Sessions、Customer Portal、webhook、server-authoritative quota を別 PR で扱う。
7. Kuro Live Comment Translator planning。
8. Local font loading after user foundation。
9. Thumbnail Editor 9:16 preset / crop / text-image schema / preset typography refinement は、それぞれ別 PR で扱う。
10. Schedule Calendar Google Calendar 連携や server sync は、account foundation の方針が固まってから再評価する。

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
複数ツール共通の user account / preferences foundation の次 slice として、account / preferences shell を小さく実装してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- `docs/future/USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md` を確認してください。
- preference contract foundation は `codex/account-preferences-confirmation` に積まれている前提です。
- 既存ツールの local-only 保存境界と、将来 account / preferences へ移す候補は planning / contract 済みです。

確認用 integration branch:
- `codex/account-preferences-confirmation`

推奨 branch:
- `codex/account-preferences-shell`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/account-preferences-shell`

今回の scope:
- Auth 未接続の account / preferences shell に留める。
- アカウント設定ページ、プラン表示枠、preferences 表示枠を local-only placeholder として確認できる状態にする。
- 既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` の localStorage key は維持する。
- 言語 / テーマ切り替えを設定ページ側で確認できる状態にするが、既存 header / drawer / rail 導線の大きな整理は次に回す。
- 既存 storage key / payload / localStorage / IndexedDB / sessionStorage の shape は変更しない。
- auth provider / DB schema / billing / quota は候補比較または placeholder 表示までに留める。

Out of scope:
- 実ログイン / logout 実装。
- database / migration / API route 実装。
- paid plan / billing 実装。
- preferences server sync 実装。
- 個別ツールの UI 改修。
- Thumbnail Editor preset / material / font / schema / export / handoff payload 変更。
- Schedule Calendar storage payload / handoff payload 変更。
- Kuro Live Comment Translator 本体実装。

検証:
- `node scripts/preference-classification-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI を触るため `/account` または追加した account route を `390 / 820 / 1024 / 1280 / 1366px` で確認し、結果を `task.md` に残す。

完了時:
- `task.md` に実装内容、確認結果、残リスク、次候補への引き継ぎを残してください。
- commit / push / draft PR 作成まで進めてください。
- PR の base は `main` ではなく `codex/account-preferences-confirmation` にしてください。
```

## Backlog

- Thumbnail Editor:
  - 9:16 preset for YouTube Shorts / vertical streams。
  - crop 仕様。
  - text / image layer schema。
  - local font loading after user account / preferences foundation。
  - preset typography refinement。
- Account / monetization:
  - user account / preferences foundation。
  - paid plan / quota foundation。
- Schedule Calendar:
  - Google Calendar 連携。
  - ログイン / サーバー同期。
  - シリーズ一括編集、例外日。
  - 週間予定画像そのものの生成。
- SNS Split Image Maker:
  - ZIP 出力。
  - X 以外の比率。
  - 複数形式の大規模 export。
  - 重い onboarding。
- EN / locale:
  - 細かい内部説明、debug 文、保存済みデータ本文、網羅的 aria 全面翻訳。
  - Next metadata の動的 locale 切替。
- New tools:
  - Kuro Live Comment Translator planning。

## Verification Baseline

docs / contract / material / font 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/preference-classification-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-font-policy-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-variants-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/portal-tools-copy-locale-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Completed / Archive Summary

- Thumbnail Editor IRIAM square preview branch:
  - PR #200 - #220 で 1:1 IRIAM 5 preset、settings modal、background / title swap、EN title asset、registered material expansion、final confirmation、main integration を完了。
  - 詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P30 / P31 を参照する。
- Thumbnail Editor font expansion:
  - PR #221 - #226 で font expansion check branch、IRIAM title parity fonts、Standard Batch B plan、Batch B-JA、Batch B-EN、main integration を完了。
  - 詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P32 を参照する。
- Thumbnail Editor usecase presets:
  - `goods_notice` / `membership_stream` / `asmr_stream` などの usecase preset sequence は完了済み。詳細は PR bodies と archive history を参照する。
- Portal / public prelaunch:
  - Portal settings visibility polish、Thumbnail Editor inline text edit、EN support は完了または各 PR body に集約済み。
- EN support:
  - PR #154 - #171 で EN support preview から main 向け final integration check まで完了。
  - main merge: 2026-05-20, merge commit `270b81f`。
  - completed details are kept in PR bodies and archive docs, not repeated here.
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
- Thumbnail Editor registered material expansion plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_DECORATION_MATERIAL_CONTRACT.md`
