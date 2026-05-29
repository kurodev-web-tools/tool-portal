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

1. Workers production route 500 investigation / account navigation polish
   - status: next immediate blocker before PR #234 main merge。
   - trigger:
     - Workers production URL で `/account` と login 系は表示できる一方、account / login 系以外の page が `Internal Server Error` になることを確認した。
     - PR #234 を main に入れる前に、public routes 全体が Workers 上で正常表示されることを確認する。
   - blocker investigation:
     - 対象 URL: `https://v-streamer-tools.kurodev-web-tools.workers.dev`
     - 最優先で `/`、`/tools`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` の Workers 500 原因を特定する。
     - `wrangler tail`、Cloudflare deployment logs、`npm run build:cloudflare`、`npx wrangler deploy --dry-run --keep-vars`、local Worker preview を使って、Cloudflare runtime 固有か build artifact / route 実装由来かを切り分ける。
     - 500 が残る場合、PR #234 の main merge 判断は止めて blocker summary を返す。
   - account navigation polish:
     - Account/settings page ができたため、account / login 系 page の header 右上 language / theme controls は重複を避けて非表示または整理する。
     - Wide desktop sidebar では固定ナビの `アカウント` link と下部 account card が重複しているため、固定ナビ側 account link を削除または wide sidebar で非表示にする。
     - Tablet landscape / collapsed rail では下部 account card が見えないため、rail 下部に compact account/settings button を追加する。
       - logged out: `/login`
       - logged in: `/account`
       - 表示は既存デザインに合わせた小さい account / settings icon 相当。歯車マークなど、状態が分かる形を検討する。
   - verification target:
     - Workers production smoke: `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`, `/login`, `/signup`, `/reset-password`, `/account`。
     - UI 変更時は `390 / 820 / 1024 / 1280 / 1366px` で account/login pages と sidebar/drawer/rail account CTA を確認する。
     - `task.md` に Workers 500 調査結果、UI 整理結果、残リスク、PR #234 merge 可否を残す。
   - current slice result:
     - root cause: `/` と tool 系 page は `PortalShell` で account session を読むが、build 時には Supabase env が無い前提で static route (`○`) として最適化されていた。Cloudflare Workers production / remote dev では `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` が存在するため、static route 上で cookie-backed Supabase session read に進み、Server Components render error で 500 になっていた。
     - fix: `PortalShell` を使う public routes `/`、`/tools`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` に `dynamic = "force-dynamic"` を追加し、Workers 上でも account session read と route mode を一致させた。
     - account nav polish: account / login 系 page の desktop header 右上 language / theme controls は visible 表示しない。drawer / wide sidebar の固定ナビから account link を外し、下部 account CTA に集約した。collapsed rail には compact account CTA を追加し、signed-out は `/login`、signed-in は `/account` に向ける。
     - verification:
       - Before fix production smoke: `/`、`/tools`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` が 500。`/login`、`/signup`、`/reset-password`、`/account` redirect は 200。
       - `npm run build:cloudflare` after fix: affected routes are `ƒ Dynamic` and build passed。
       - Cloudflare remote dev after fix: `/`、`/tools/`、`/tools/schedule-calendar/`、`/tools/thumbnail-editor/`、`/tools/sns-split-image-maker/`、`/login/`、`/signup/`、`/reset-password/`、`/account/` redirect all returned non-500。
       - `npm run deploy:cloudflare` deployed with `--keep-vars`; current Workers version id `748fd6c6-85c2-4560-80c5-5f40b075559c`。
       - Production smoke after deploy: `/`、`/tools`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker`、`/login`、`/signup`、`/reset-password` all 200; `/account` redirects to `/login/?next=%2Faccount` and returns 200。
       - Width checks with Chrome DevTools / local production server: `390 / 820 / 1024 / 1280 / 1366px` representative checks showed no horizontal overflow. account/login routes had 0 visible header language/theme controls. wide sidebar fixed account link count was 0. collapsed rail showed compact account CTA.
       - Contracts passed: `node scripts/preference-classification-contract.mjs`, `node scripts/local-preference-adapter-contract.mjs`, `node scripts/account-preferences-shell-contract.mjs`, `node scripts/supabase-auth-first-slice-contract.mjs`, `node scripts/account-auth-public-readiness-contract.mjs`, `node scripts/workers-route-smoke-account-nav-contract.mjs`。
       - Checks passed: `npm run build`, `npm run build:cloudflare`, `npm run lint`, `npx tsc --noEmit`, `git diff --check`, `npx wrangler deploy --dry-run --keep-vars`。
     - remaining risks:
       - Next.js 16 middleware deprecation warning remains because OpenNext Cloudflare compatibility still uses `middleware.ts` in this branch。
       - OpenNext on Windows continues to print compatibility warnings; deploy/build passed, but CI / Cloudflare runtime should remain the final deployment judge。
       - Supabase actual signup / login / logout / password reset / locale-theme save flows were not re-exercised in this slice beyond route smoke。
     - PR #234 merge judgment: Workers route 500 blocker is resolved on production after deploy. From this blocker perspective, PR #234 can proceed after this stacked PR is reviewed and merged into `codex/supabase-auth-first-slice`; Supabase auth flow smoke remains a separate final pre-main confirmation item。
   - PR #237 follow-up result:
     - branch / worktree: `codex/account-public-copy-polish` / `D:/V_streamer_tools/.worktrees/account-public-copy-polish`。
     - `/account` 上部右の signed-in card を削除し、hero は title / lead のみにした。
     - ログイン中 email は共通の表示設定セクション内に小さく表示する形へ移した。
     - ログアウトはページ最下部の右端寄せ secondary button に移した。
     - `preferences-saved` などの account message は inline 表示ではなく、`role="status"` の transient toast として表示し、一定時間後に URL の `auth` query も消す。
     - 日本語表示の `Preferences` / `Account preference` / `sync候補` / `locale / theme` / `local-only` / `保存 key` などの実装寄り copy を、`表示設定`、`アカウントに保存済みの設定`、`今後保存できるようにする項目`、`表示言語`、`テーマ`、`このブラウザに保存` に寄せた。
     - 未ログインでも表示言語 / テーマがこのブラウザで使えることを hero / 表示設定 copy で説明した。
     - 既存 storage key / payload / Supabase schema は変更していない。
   - PR #237 follow-up verification:
     - RED: `node scripts/account-preferences-shell-contract.mjs` failed on missing user-facing display settings copy before implementation。
     - Account related contracts passed: `node scripts/preference-classification-contract.mjs`, `node scripts/local-preference-adapter-contract.mjs`, `node scripts/account-preferences-shell-contract.mjs`, `node scripts/supabase-auth-first-slice-contract.mjs`, `node scripts/account-auth-public-readiness-contract.mjs`, `node scripts/workers-route-smoke-account-nav-contract.mjs`。
     - `npm run build` passed。server-runtime build のため static export alias postbuild は `out` missing を正常 skip。Next.js middleware deprecation warning と webpack cache warning は既存残リスク。
     - `npm run lint` passed。
     - `npx tsc --noEmit` passed。
     - `/account` width check passed at `390 / 820 / 1024 / 1280 / 1366px` using local production server `next start -p 3027` and Playwright: Japanese copy visible, toast visible, no horizontal overflow, no console error/warn, and no visible `Account preference` / `sync候補` / `将来の sync 候補` / `local-only` / `locale / theme` / `保存 key`。
   - PR #237 follow-up remaining risks:
     - Supabase 実 session での signed-in email / logout button の visual smoke は未実施。local production server は Supabase env missing state での `/account` 表示確認に留まる。
     - 実環境の signup / login / logout / password reset / locale-theme save flow はこの slice では再実行していない。stacked PR merge / deploy 後の Workers branch smoke で確認する。
   - PR #238 browser comment follow-up result:
     - branch / worktree: `codex/account-status-card-layout` / `D:/V_streamer_tools/.worktrees/account-status-card-layout`。
     - 上部の `現在のアカウント` card 見出しを `アカウント状況` / `Account status` に変更した。
     - ログイン中 email 表示を共通の表示設定 section から上部の account status card へ移動した。
     - 右上の重複していた `今後追加予定` card を削除し、account status card を横幅いっぱいの 1 card にした。
     - 下段右側の `アカウントに保存済みの設定`、`今後保存できるようにする項目`、`今後追加予定` は維持した。
     - 既存 storage key / payload / Supabase schema は変更していない。
   - PR #238 browser comment follow-up verification:
     - RED: `node scripts/account-preferences-shell-contract.mjs` failed before implementation because `アカウント状況` / top-card layout expectations were missing。
     - Account related contracts passed: `node scripts/preference-classification-contract.mjs`, `node scripts/local-preference-adapter-contract.mjs`, `node scripts/account-preferences-shell-contract.mjs`, `node scripts/supabase-auth-first-slice-contract.mjs`, `node scripts/account-auth-public-readiness-contract.mjs`, `node scripts/workers-route-smoke-account-nav-contract.mjs`。
     - `npm run build` passed。server-runtime build のため static export alias postbuild は `out` missing を正常 skip。Next.js middleware deprecation warning と webpack cache warning は既存残リスク。
     - `npm run lint` passed。
     - `npx tsc --noEmit` passed。
     - `git diff --check` passed。LF/CRLF conversion warning only。
     - `/account` width check passed at `390 / 820 / 1024 / 1280 / 1366px` using local production server `next start -p 3028` and Playwright: Japanese account status / display settings copy visible, top `今後追加予定` duplicate removed, lower planned card remains one, no horizontal overflow, no console error/warn, and no visible `Account preference` / `sync候補` / `将来の sync 候補` / `local-only` / `locale / theme` / `保存 key`。
   - PR #238 browser comment follow-up remaining risks:
     - Supabase 実 session での signed-in email 位置は code path / contract で確認。実 session visual smoke は stacked PR merge / deploy 後の Workers branch で確認する。
     - 実環境の signup / login / logout / password reset / locale-theme save flow はこの slice では再実行していない。
   - Tool page desktop settings compact follow-up result:
     - branch / worktree: `codex/tool-sidebar-settings-compact` / `D:/V_streamer_tools/.worktrees/tool-sidebar-settings-compact`。
     - PC 幅の各 tool page sidebar 下部に出る global `Settings` panel を、通常時は compact summary に折りたたむ形へ変更した。
     - summary には現在の表示言語 / テーマを小さく表示し、クリックで既存の `LanguageSwitch` / `ThemeToggle` controls を展開する。
     - collapsed rail (`1024px` 付近) と mobile drawer の settings controls は既存表示を維持した。
     - `/account` の表示設定 section、既存 storage key / payload / Supabase schema は変更していない。
   - Tool page desktop settings compact verification:
     - RED: `node scripts/workers-route-smoke-account-nav-contract.mjs` failed before implementation because desktop settings compact summary was missing。
     - Relevant contracts passed: `node scripts/workers-route-smoke-account-nav-contract.mjs`, `node scripts/local-preference-adapter-contract.mjs`, `node scripts/account-preferences-shell-contract.mjs`, `node scripts/tool-portal-entry-contract.mjs`。
     - `npm run build` passed。server-runtime build のため static export alias postbuild は `out` missing を正常 skip。Next.js middleware deprecation warning と webpack cache warning は既存残リスク。
     - `npm run lint` passed。
     - `npx tsc --noEmit` passed。
     - `git diff --check` passed。LF/CRLF conversion warning only。
     - `/tools/schedule-calendar` width check passed at `390 / 820 / 1024 / 1280 / 1366px` using local production server `next start -p 3029` and Playwright: no horizontal overflow, no console error/warn, `1280 / 1366px` desktop settings closed by default and expands controls on click, `1024px` rail settings remains visible。
     - PC tool page smoke passed at `1280 / 1366px` for `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`: each page showed one compact sidebar settings details closed by default, with no horizontal overflow or console error/warn。
   - Tool page desktop settings compact remaining risks:
     - `node scripts/portal-locale-foundation-contract.mjs` and `node scripts/portal-tools-copy-locale-contract.mjs` are stale against the current base and still fail on pre-existing locale/account copy expectations unrelated to this PR。
     - 実 Workers URL への deploy 後 smoke は未実施。local production server での visual / interaction smoke に留めた。
   - Next account registration / remote display settings sequence:
     - order:
       1. ログイン直後に、アカウントに保存済みの `user_preferences.locale/theme` をこのブラウザの既存 local preference keys へ反映する。
       2. その後、Home / sidebar / account CTA でアカウント登録導線を少し強める。
     - rationale:
       - アカウント登録を促すなら、まず `別ブラウザやスマホでも、ログインすると表示言語とテーマを引き継げる` 状態にしておく。
       - 現状は account に `locale/theme` を保存できるが、ログイン直後に別端末の local preference へ自動反映する導線は未実装。
     - first implementation scope:
       - 対象は `locale` / `theme` のみ。
       - login success 後、ログイン済みユーザー自身の `user_preferences` を読み、保存済み値があれば client 側で既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` に反映する。
       - 反映後は必要に応じて軽い toast / transient notice を出す。
       - 既存 storage key / payload / Supabase schema は変更しない。
       - `service_role` / secret key は要求・表示・保存しない。
     - out of scope:
       - 下書き、予定本文、画像、handoff payload、tool data の自動アップロード / 自動同期。
       - Google / Apple OAuth、有料プラン、billing、quota enforcement。
       - 登録導線の強化は remote display settings apply の後続 PR に分ける。
     - follow-up CTA wording direction:
       - `アカウントを作ると、表示言語とテーマを別のブラウザやスマホでも引き継げます。`
       - `今後はツールごとの軽い設定も保存できるようにしていきます。`
       - `下書きや画像、予定本文は自動ではアップロードされません。`

2. Account auth public readiness before PR #234 main merge
   - status: implemented on `codex/account-email-password-public-readiness`。PR #234 `codex/supabase-auth-first-slice` を main に入れる前に、検証用 account UI / magic link 導線を公開初期版として違和感の少ない Email + Password account flow へ整えた。
   - base / branch policy:
     - PR #234 は draft のまま維持する。
     - 直接 `main` では作業しない。
     - 実装は `codex/supabase-auth-first-slice` を base にした stacked branch / PR に分ける。
     - 完了後は stacked PR を #234 branch へ merge し、Workers production branch `codex/supabase-auth-first-slice` で再検証する。
   - auth method decision:
     - 初期公開の主導線は Email + Password。
     - Magic link は表の主要導線から外す。必要なら fallback / later option として docs に留める。
     - Google / Apple など外部アカウント連携は later scope。初期 account id を安定させてから別 PR で追加する。
   - pages / routes:
     - `/login`: email + password login、forgot password 導線、create account への link。
     - `/signup`: email + password registration、利用開始の説明、login への link。
     - `/reset-password`: reset email request。パスワードリセットは都度メールリンクを送り、そのリンクから新 password を設定する方式にする。
     - `/account/security` または `/update-password`: reset link 後の new password 設定先。route 名は実装前に既存構成と Supabase redirect flow に合わせて決める。
     - `/account`: ログイン済みユーザー用の account / shared preferences page。未ログイン時は `/login?next=/account` へ誘導、または最小案内のみ表示する。
   - account page cleanup:
     - 残す: ログイン中 email、共通設定 language / theme、保存状態、ログアウト、将来機能の控えめな説明。
     - 将来機能の説明には、有料プラン契約状況や外部アカウント連携が後続で入ることを軽く示す。
     - ユーザー向け画面から弱める / 消す: `Supabase Auth`、`Auth / DB boundary`、`publishable key`、`migration / RLS / GRANT`、`Local Free`、`quota writes trusted server only` などの実装者向け文言。
   - portal account CTA:
     - PC 左下の「ログイン予定」カードを実導線に変える。
     - 未ログイン: 見出し `アカウントで設定を保存`、button `ログイン / 登録`、href `/login`。
     - ログイン済み: 見出し `アカウント`、email または account 状態、button `アカウント設定`、href `/account`。
     - mobile drawer / narrow layout に同等の account 導線が必要か確認する。
   - Supabase / Cloudflare environment notes:
     - Workers runtime / build variables に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定する。
     - `service_role` / secret key は入れない。
     - ローカルから Cloudflare deploy する場合は Dashboard vars を消さないよう、`npm run build:cloudflare` then `npx wrangler deploy --keep-vars` を使う。
     - Supabase URL Configuration、Email templates、Custom SMTP、migration SQL 適用は実環境確認の前提。
   - out of scope:
     - Google / Apple OAuth 実装。
     - paid plan / billing / Stripe 実装。
     - translation tool 本体、logged-in-only tool boundary、quota enforcement。
     - Thumbnail / Schedule / SNS tool の既存 payload migration。
     - service_role / secret key を browser / source-controlled docs に入れること。
   - verification targets:
     - signup with email + password。
     - login with email + password。
     - logout。
     - password reset email request / reset link / new password update。
     - logged-in `/account` access and signed-out redirect / 案内。
     - language / theme save to `user_preferences` after switching to EN / Light。
     - sidebar / drawer account CTA in signed-out and signed-in states。
     - Workers production URL smoke on `/`, `/tools`, `/login`, `/signup`, `/reset-password`, `/account`。
   - current slice result:
     - `/login` を追加し、email + password login、forgot password、create account link を公開導線にした。
     - `/signup` を追加し、email + password registration と login link を置いた。登録確認後の戻り先は `/auth/confirm?next=/account`。
     - `/reset-password` を追加し、reset email request を実装した。reset link 後の new password 設定 route は account 設定配下に揃えて `/account/security` にした。
     - `/account/security` を追加し、reset session / signed-in session から new password を更新する Server Action を置いた。
     - `/account` は signed-in account / shared preferences page に整理し、signed-out user は `/login?next=/account` へ誘導する。account env missing 時は最小案内を表示する。
     - `/account` から magic link 主導線と実装者向け copy を弱め、ログイン中 email、language / theme、保存状態、logout、将来の有料プラン契約状況 / 外部アカウント連携の控えめな説明に寄せた。
     - PC 左下 CTA と mobile drawer CTA を実導線に変更した。未ログイン相当では `アカウントで設定を保存` / `ログイン / 登録` / `/login`、ログイン済み state では account settings copy / `/account` へ切り替わる。
     - `scripts/account-auth-public-readiness-contract.mjs` を追加し、既存 `account-preferences-shell` / `supabase-auth-first-slice` contracts を Email + Password 公開導線に合わせて更新した。
     - secret / service_role key は要求・表示・保存していない。既存 storage key / payload / IndexedDB / sessionStorage shape は変更していない。
   - verification completed:
     - `node scripts/preference-classification-contract.mjs` passed。
     - `node scripts/local-preference-adapter-contract.mjs` passed。
     - `node scripts/account-preferences-shell-contract.mjs` passed。
     - `node scripts/supabase-auth-first-slice-contract.mjs` passed。
     - `node scripts/account-auth-public-readiness-contract.mjs` passed。
     - `npm run build` passed。server-runtime build のため static export alias postbuild は `out` missing を正常 skip。Next.js middleware deprecation warning は既存 Cloudflare deploy foundation と同じ残リスク。
     - `npm run build:cloudflare` passed。OpenNext Windows compatibility warning と middleware deprecation warning あり。
     - `npm run lint` passed。
     - `npx tsc --noEmit` passed。
     - Workers local preview: `npx wrangler dev --port 8789 --local` で `GET /` が HTTP 200。
   - width verification:
     - production server `next start -p 3014` + Playwright で確認。
     - `/login` at `390 / 820 / 1024 / 1280 / 1366px`: login form、create account link、forgot password link visible、horizontal overflowなし。
     - `/signup` at `390 / 820 / 1024 / 1280 / 1366px`: signup form、login link visible、horizontal overflowなし。
     - `/reset-password` at `390 / 820 / 1024 / 1280 / 1366px`: reset email form、login link visible、horizontal overflowなし。
     - `/account` at `390 / 820 / 1024 / 1280 / 1366px`: account / shared preferences shell、login/register CTA visible、horizontal overflowなし。
     - mobile drawer account CTA at `390 / 820px`: `アカウントで設定を保存` / `ログイン / 登録` visible、horizontal overflowなし。
     - desktop sidebar account CTA at `1280 / 1366px`: `アカウントで設定を保存` / `ログイン / 登録` visible、horizontal overflowなし。
   - remaining risks:
     - Supabase 実環境の signup / login / logout / password reset / locale-theme save は、この local branch を production deploy していないため未実行。ユーザー管理の env / SMTP / template / migration 前提で、stacked PR merge 後に Workers branch で再 smoke する。
     - signed-in sidebar / drawer CTA は code path と contract で確認。実 session での visual smoke は stacked PR merge / deploy 後に実施する。
     - Next.js 16 では `middleware.ts` deprecated だが、OpenNext Cloudflare adapter の現行互換性に合わせて既存方針を維持している。
   - next handoff:
     - Draft PR は base `codex/supabase-auth-first-slice` にする。
     - merge 後、Cloudflare Workers production branch `codex/supabase-auth-first-slice` で `/login`、`/signup`、`/reset-password`、`/account`、signup / login / logout / password reset / locale-theme save を実環境 smoke する。

3. User account / preferences foundation
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
     - completed: account / preferences shell として `/account` route、local-only account status、plan placeholder、preferences placeholder、provider / billing placeholder を追加した。
     - completed: 設定ページ側で既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` key を表示し、既存 `LanguageSwitch` / `ThemeToggle` から言語 / テーマを切り替えられる状態にした。
     - completed: local preference adapter として `lib/local-preferences.ts` を追加し、既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` key を維持したまま locale / theme の読み書き境界を local-only で薄く包んだ。
     - completed: `LocaleProvider` / `ThemeToggle` の localStorage 直接 read/write を adapter 経由へ寄せ、`/account` の storage key 表示も adapter の `localPreferenceStorageKeys` を参照する形にした。
     - completed: Thumbnail recent / favorite preset ids、Schedule settings、translator settings は `FutureLocalPreferenceCandidate` の type placeholder に留め、payload / migration / server sync は実装していない。
     - completed: auth/provider decision spike として Supabase Auth / Clerk / Auth.js を、DB shape、RLS / session handling、account merge policy、quota / paid plan boundary、rollback / migration risk で比較し、Supabase Auth + Supabase Postgres / RLS を次 auth implementation の仮推奨にした。
     - completed: spike は docs-only に閉じ、実ログイン、database / migration、API route、paid plan / billing、preferences server sync、個別 tool UI、既存 storage key / payload 変更は実施していない。
     - completed: Supabase Auth implementation 前の DB/RLS/session boundary design として、Next.js App Router / SSR cookie session、env/key handling、最小 DB shape、RLS / GRANT、locale/theme 初回 merge、rollback / migration risk を docs-only + contract に閉じて整理した。
   - planning results:
     - sync candidate は locale / theme、Thumbnail recent / favorite preset ids、recent fonts、Schedule default view / week start / default time / duration、Translator target language / display preference、local font selected family refs などの軽量 preference に限定する。
     - explicit user action only は Thumbnail project draft、server asset library upload、Schedule events / templates / hashtag sets、Translator glossary / moderation terms / session settings。
     - local-only は tool handoff、IndexedDB image blobs、undo / draft history、Local Font Access permission / full scan result、browser-specific recovery state。
     - store禁止または初期対象外は browser `localStorage` の OAuth tokens、raw credentials、local font binary、full comment logs by default、viewer identifiers、handoff expired payload。
     - server sync 前提不可は local IndexedDB ref を含む draft、legacy localStorage schedule payload、handoff payload、local font availability、translator live session state。
   - recommended next implementation candidates:
     - first: preference contract foundation。保存分類の contract script / docs を追加し、既存 storage key と payload は変更しない。今回 branch で対応済み。
     - second: account / preferences shell。Auth 未接続のアカウント設定ページ、プラン表示枠、preferences 表示枠を作り、local-only 状態で確認する。今回 branch で対応済み。
     - third: local preference adapter。既存 localStorage keys を維持し、migration なしで読み書き境界を薄く包む。今回 branch で対応済み。
     - fourth: auth/provider decision spike。Supabase Auth / Clerk / Auth.js などを plan と quota 境界込みで比較する。今回 branch で対応済み。
     - fifth: Supabase Auth boundary design。Supabase Auth 仮推奨を前提に、ログイン実装前の DB/RLS/session/env/merge/rollback contract を docs-only で固定する。今回 branch で対応済み。
     - sixth: Auth 実装。ログイン / ログアウト、account session、profile / preferences の最小保存に閉じる。Supabase SDK dependency、env placeholder、SSR cookie client、locale/theme 初回 merge UI はこの scope で初めて扱う。
     - seventh: account sync MVP。locale / theme + Thumbnail small preferences までに閉じ、draft / schedule / user material / translator tokens / billing を混ぜない。
     - eighth: Stripe Billing。Checkout Sessions、Customer Portal、webhook、server-authoritative quota を別 scope で扱う。
   - account settings shell direction:
     - 言語切り替えとテーマ切り替えは、ガワ制作時にアカウント設定ページへ持っていく。
     - 初回 shell PR では既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` の localStorage key を維持する。
     - 既存 header / drawer / rail の language / theme 導線は、設定ページ側で確認できる状態を作ってから重複整理する。
     - Auth 未接続時は「ログインすると同期できます」程度の placeholder に留め、実 sync / DB / Stripe は入れない。
     - completed shell scope:
       - `/account` で `Local Free` plan frame、preferences frame、future sync candidates、provider / billing placeholder を表示。
       - header / drawer / rail は account link と account title の最小追加のみ。既存 language / theme 導線の重複整理は未実施。
       - `ThemeToggle` は既存 key を維持したまま、複数 toggle instance の表示が同一ページ内で同期するようにした。
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
     - `node scripts/account-preferences-shell-contract.mjs` passed。
     - `node scripts/local-preference-adapter-contract.mjs` passed。
     - `node scripts/auth-provider-decision-spike-contract.mjs` passed。
     - `npm run lint` passed。
     - `npx tsc --noEmit` passed。
     - `git diff --check` passed。
     - `/account` width check:
       - `390px`: account title / Local Free plan / preferences frame / `v-streamer-tools-locale` / `v-streamer-tools-theme` visible, horizontal overflowなし。
       - `820px`: account title / plan / preferences / storage key labels visible, horizontal overflowなし。
       - `1024px`: desktop rail + account content + storage key labels visible, horizontal overflowなし。
       - `1280px`: two-column layout + storage key labels visible, horizontal overflowなし。
       - `1366px`: two-column layout + storage key labels visible, horizontal overflowなし。
     - remaining risks:
       - Auth provider / DB schema / billing / quota は placeholder のまま。
       - Supabase Auth は仮推奨のみ。Supabase project/runtime target、RLS policy、Data API exposure、Node version、rollback plan は次 slice で固定する。
       - Clerk は fast auth UI の fallback、Auth.js は self-owned auth fallback として残すが、どちらも現時点では実装候補に昇格していない。
       - 既存 header / drawer / rail の language / theme 導線整理は次以降。
       - adapter は local-only で、account merge / server sync / migration policy は未実装。
       - FutureLocalPreferenceCandidate は型 placeholder のみ。Thumbnail / Schedule / Translator の storage payload には触れていない。
       - Next dev server は worktree 内起動時に親 checkout の lockfile を workspace root 候補として警告するが、`/account` は worktree の変更内容で表示確認済み。
   - current slice result:
     - Supabase Auth first slice として、`docs/future/USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md` の `Supabase Auth Boundary Design` を source of truth にし、Next.js App Router / SSR cookie session の最小 foundation を実装した。
     - `@supabase/supabase-js` / `@supabase/ssr` を追加し、browser / SSR client は `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` の publishable key 前提に限定した。
     - secret / service_role key は要求・表示・保存していない。`SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` は trusted server only の境界名として docs / env boundary に残すだけで、この slice の runtime では読まない。
     - `/account` に email magic link login、logout、account session 表示、明示操作による locale/theme account 保存導線を追加した。
     - SSR cookie session / `proxy.ts` は `output: "export"` と両立しないため、Next.js runtime は server runtime に寄せた。
     - `scripts/static-export-rsc-aliases.mjs` は server runtime build で `out` が無い場合は postbuild を skip する。
     - 初回 account merge は `v-streamer-tools-locale` / `v-streamer-tools-theme` の local snapshot を `user_preferences.locale` / `user_preferences.theme` に保存する範囲だけに閉じた。
     - `supabase/migrations/20260527000000_account_preferences_foundation.sql` を reviewable SQL として追加し、`user_profiles` / `user_preferences` / `tool_preferences` / `usage_quotas` の additive tables、RLS、explicit GRANT を定義した。
     - `usage_quotas` は authenticated owner read のみ。quota update は trusted server only のままで、browser writable にしていない。
     - 既存 storage key / payload / localStorage / IndexedDB / sessionStorage の shape は変更していない。
     - Supabase CLI は workspace に未導入だったため、`supabase migration new` は実行できず、migration SQL は直接 reviewable file として作成した。
     - verification completed:
       - `node scripts/preference-classification-contract.mjs` passed。
       - `node scripts/local-preference-adapter-contract.mjs` passed。
       - `node scripts/auth-provider-decision-spike-contract.mjs` passed。
       - `node scripts/supabase-auth-boundary-design-contract.mjs` passed。
       - `node scripts/supabase-auth-first-slice-contract.mjs` passed。
       - `npm run lint` passed。
       - `npx tsc --noEmit` passed。
       - `git diff --check` passed。LF/CRLF conversion warning only。
       - `npm run build` passed。`/account` と `/auth/confirm` は dynamic server route、postbuild は server-runtime build のため static export alias を skip。
     - width verification:
       - `/account` at `390px`: account title / auth panel / sign-in form / preferences / save button visible, horizontal overflowなし。
       - `/account` at `820px`: account title / auth panel / preferences / account preference panel visible, horizontal overflowなし。
       - `/account` at `1024px`: desktop rail + account content + auth / preference panels visible, horizontal overflowなし。
       - `/account` at `1280px`: two-column layout + auth / DB boundary panels visible, horizontal overflowなし。
       - `/account` at `1366px`: two-column layout + account session / locale-theme save導線 visible, horizontal overflowなし。
       - Console error / warn なし。
     - remaining risks:
       - Supabase project URL / publishable key の実値は user-managed env 前提。repository には保存していない。
       - migration SQL は未適用。Supabase project 側で review / apply 後に magic-link auth と `user_preferences` 保存を実環境確認する必要がある。
       - `output: "export"` は SSR cookie session / proxy と両立しないため外した。既存 static export / Cloudflare Pages deploy 前提が残っている場合は、auth 対応 hosting に合わせた deploy workflow 更新が次 scope。
       - Supabase CLI はこの workspace では利用できなかったため、local migration list / advisors は未実行。
       - profile / tool preference / quota table は additive boundary のみ。runtime write は `user_preferences` の locale/theme に限定。
       - `usage_quotas` は trusted-server-only write path 未実装。billing / Stripe は別 scope。
       - Supabase project URL / publishable key はユーザー確認済み前提だが、この branch では値を要求・表示・保存していない。
       - secret / service_role key は今後も browser / docs / source-controlled file に入れない。
       - Thumbnail / Schedule / Translator preferences server sync、既存 payload migration、paid plan / billing は未実装。
   - Cloudflare SSR deploy foundation:
     - cause:
       - PR #234 は Next.js App Router の SSR cookie session、request boundary、dynamic route、`proxy.ts` を使うため、Cloudflare Pages の static export `out/` 前提と両立しない。
       - Preview deploy の `Output directory "out" not found` は、server runtime build では `out/` を生成しない一方で、Cloudflare Pages 側がまだ static output directory を要求していたことが原因。
       - Cloudflare / OpenNext docs では、full stack SSR Next.js は Pages static output ではなく Cloudflare Workers + `@opennextjs/cloudflare` adapter へ移す案内になっている。
     - implementation:
       - `@opennextjs/cloudflare` と `wrangler` を devDependency に追加した。
       - `wrangler.jsonc` を追加し、`.open-next/worker.js`、`.open-next/assets`、`nodejs_compat`、`compatibility_date: 2026-05-27`、Workers Assets binding を定義した。
       - `open-next.config.ts` を追加し、OpenNext Cloudflare adapter の default config を明示した。R2 cache binding は今回 scope では追加していない。
       - `package.json` に `build:cloudflare` / `preview:cloudflare` / `deploy:cloudflare` / `upload:cloudflare` / `cf-typegen` を追加した。
       - `.open-next/` と `.dev.vars*` を ignore し、ESLint でも `.open-next/**` を対象外にした。
       - worktree 内 build tracing が親 checkout の lockfile を拾わないよう、`next.config.mjs` に `outputFileTracingRoot` を project root で固定した。
       - OpenNext adapter は Next.js 16 の Node.js `proxy.ts` をまだ support していないため、PR #234 の session refresh boundary を同じ matcher のまま Edge Middleware `middleware.ts` に戻した。これは Cloudflare deploy compatibility のための最小差分で、auth UI / DB write / Supabase secret handling は広げていない。
     - Cloudflare dashboard / CI setting:
       - Existing Pages static deploy の output directory `out` 前提は解除する。
       - SSR 対応 target は Cloudflare Workers + OpenNext に移す。
       - deploy command は Dashboard vars を保持するため、build は `npm run build:cloudflare`、deploy は `npx wrangler deploy --keep-vars` を推奨する。
       - `package.json` の `deploy:cloudflare` / `upload:cloudflare` も `wrangler ... --keep-vars` 経由に揃えた。非本番 branch upload では `npx wrangler versions upload --keep-vars` を使う。
       - static output directory は設定しない。生成物は `.open-next/worker.js` と `.open-next/assets`。
       - Build variables / secrets には `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を dashboard 側で設定する。secret / service_role key は要求・表示・保存しない。
     - verification completed:
       - `npm run build:cloudflare` passed。`.open-next/worker.js` / `.open-next/assets` generated。
       - `npm run build` passed。server-runtime build のため static export alias postbuild は `out/` missing を正常 skip。
       - `npm run lint` passed。
       - `npx tsc --noEmit` passed。
       - `git diff --check` passed。LF/CRLF conversion warning only。
       - `npx wrangler deploy --dry-run` passed。assets 530 files、Worker upload size 6609.29 KiB / gzip 1519.44 KiB。
       - local Worker preview: `npx wrangler dev --port 8789 --local` で `GET /` が HTTP 200。
     - remaining risks:
       - Windows 上の OpenNext build は adapter から compatibility warning が出る。CI / Cloudflare 側は Linux runtime を想定する。
       - Next.js 16 では `middleware.ts` が deprecated で `proxy.ts` 推奨だが、現時点の OpenNext Cloudflare adapter は Node.js middleware / `proxy.ts` 未対応。adapter が対応したら `proxy.ts` へ戻す。
       - 実 Cloudflare deploy は未実行。Cloudflare account / Workers project / dashboard env vars / custom domain は user-managed。
       - R2 incremental cache は未設定。ISR / cache-heavy routes を増やす場合は別 PR で binding と cache config を検討する。
     - PR #234への戻し方:
       - PR #234 は draft のまま維持し、この deploy foundation branch を base `codex/supabase-auth-first-slice` の stacked PR として先に review する。
       - この foundation が通ったら Cloudflare target を Workers + OpenNext 設定へ変更し、PR #234 の preview deploy を再実行する。
       - Foundation を採用しない場合は、この stacked PR だけを revert / close すれば PR #234 の auth 実装差分には戻れる。ただし static Pages `out/` blocker は残る。
       - `middleware.ts` を `proxy.ts` に戻すのは、OpenNext Cloudflare adapter が Next.js Node.js middleware / proxy を support した後に限定する。
   - Workers auth verification follow-up:
     - Cloudflare Workers URL `https://v-streamer-tools.kurodev-web-tools.workers.dev` で magic link login と session 維持を確認した。
     - Supabase Auth は URL Configuration、Magic Link / Confirm signup template、Custom SMTP、email rate limit、migration SQL 適用が実環境確認に必要だった。
     - `supabase/migrations/20260527000000_account_preferences_foundation.sql` 適用後、`user_preferences` への locale / theme 保存は通った。
     - follow-up fix: Account save form の locale hidden value が初回 local snapshot に固定され、言語切替後も `ja` を送る問題を修正した。locale は current `useLocale()` value、theme は `ThemeToggle` の change event / storage change で更新した snapshot を送る。
     - verification:
       - `node scripts/account-preferences-shell-contract.mjs` passed。
       - `node scripts/supabase-auth-first-slice-contract.mjs` passed。
       - `npm run lint` passed。
       - `npx tsc --noEmit` passed。
       - `git diff --check` passed。LF/CRLF conversion warning only。

3. Kuro Live Comment Translator planning
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

4. Local font loading
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
3. Account / preferences shell。Auth 未接続のまま、アカウント設定ページ、プラン表示枠、preferences 表示枠を作り、言語 / テーマ切り替えを設定ページへ移す。今回 branch で対応済み。
4. Local preference adapter。既存 localStorage keys を維持し、migration なしで locale / theme の読み書き境界を薄く包む。今回 branch で対応済み。
5. Auth/provider decision spike。Supabase Auth / Clerk / Auth.js と DB / quota / account merge policy を比較し、実ログイン前の採用条件を文書化する。今回 branch の前提として完了済み。
6. Supabase Auth boundary design。Supabase Auth 採用前提の DB/RLS/session/env/merge/rollback contract を docs-only で固定する。今回 branch で対応済み。
7. Auth implementation。採用 provider が決まった後、ログイン / ログアウト、account session、最小 profile / preferences 保存を扱う。
8. Preferences sync MVP。locale / theme + Thumbnail small preferences までに閉じる。
9. Stripe Billing / quota foundation。Checkout Sessions、Customer Portal、webhook、server-authoritative quota を別 PR で扱う。
10. Kuro Live Comment Translator planning。
11. Local font loading after user foundation。
12. Thumbnail Editor 9:16 preset / crop / text-image schema / preset typography refinement は、それぞれ別 PR で扱う。
13. Schedule Calendar Google Calendar 連携や server sync は、account foundation の方針が固まってから再評価する。

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
PR #234 `codex/supabase-auth-first-slice` を main に入れる前の account follow-up として、ログイン直後にアカウント保存済みの表示言語 / テーマをこのブラウザへ反映できるようにしてください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- `docs/future/USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md` を確認してください。
- PR #235 Cloudflare SSR deploy foundation は PR #234 branch へ merge 済み。
- PR #236 account email/password public readiness は `codex/supabase-auth-first-slice` へ merge 済み。
- PR #237 / #238 / #239 / #240 の account / public copy / account status / tool sidebar settings follow-ups は `codex/supabase-auth-first-slice` へ merge 済み。
- Cloudflare Dashboard 側の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` は Text variables として設定済み。
- `package.json` の `deploy:cloudflare` / `upload:cloudflare` は `--keep-vars` 対応済み。
- Supabase project、Workers URL、publishable env、migration SQL 適用、Custom SMTP、Email template 調整はユーザー側で確認済み。
- secret / service_role key は要求・表示・保存しない。
- ローカルから Workers deploy する場合は Dashboard vars を消さないよう、`npm run build:cloudflare` then `npx wrangler deploy --keep-vars` を使う。ただし今回 scope では deploy は必須ではなく、必要ならユーザー確認する。

確認元 branch:
- `codex/supabase-auth-first-slice`

推奨 stacked branch:
- `codex/account-remote-display-settings-apply`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/account-remote-display-settings-apply`

今回の scope:
- ログイン成功直後に、ログイン済みユーザー自身の `user_preferences.locale/theme` を読み、このブラウザの既存 local preference keys へ反映する。
  - locale key: `v-streamer-tools-locale`
  - theme key: `v-streamer-tools-theme`
- 保存済み `locale/theme` が無い場合は何もしない。
- 反映対象は `locale` / `theme` のみ。
- 反映後は UI state と `document.documentElement.lang` / dark class が自然に更新されるようにする。
- 必要なら軽い toast / transient notice を出す。
- ログイン直後の redirect 先が `/`、`/tools`、tool page、`/account` のいずれでも反映できる形にする。
- 既存 storage key / payload / Supabase schema / migration は変更しない。
- この PR では登録 CTA の文言強化はまだ行わない。登録 CTA 強化はこの反映導線が入った後の次 PR に分ける。

Out of scope:
- Google / Apple OAuth 実装。
- paid plan / billing / Stripe 実装。
- translation tool 本体、logged-in-only tool boundary、quota enforcement。
- Thumbnail / Schedule / SNS tool の既存 payload migration。
- 下書き、予定本文、画像、handoff payload、tool data の自動アップロード / 自動同期。
- Home / sidebar / account CTA の強い訴求 copy 実装。
- service_role / secret key を browser / source-controlled docs に入れること。

検証:
- account remote display settings apply:
  - `components/account/AccountRemoteDisplaySettingsApplier.tsx` を追加し、signed-in session の `remotePreferences.locale/theme` を既存 `v-streamer-tools-locale` / `v-streamer-tools-theme` key へ反映する。
  - `PortalShell` に applier を接続し、redirect 先が `/`、`/tools`、tool page、`/account` のいずれでも shared account session から反映できる形にした。
  - remote に保存済み値が無い場合は何もしない。反映対象は `locale` / `theme` のみ。
  - 既存 storage key / payload / Supabase schema / migration は変更しない。secret / service_role key は要求・表示・保存しない。
  - 次の CTA 強化 PR: Home / sidebar / account CTA の文言を、`アカウントを作ると、表示言語とテーマを別のブラウザやスマホでも引き継げます。` の方向へ強める。
- `node scripts/account-remote-display-settings-contract.mjs`
- `node scripts/preference-classification-contract.mjs`
- `node scripts/local-preference-adapter-contract.mjs`
- `node scripts/account-preferences-shell-contract.mjs`
- `node scripts/supabase-auth-first-slice-contract.mjs`
- `node scripts/account-auth-public-readiness-contract.mjs`
- `node scripts/workers-route-smoke-account-nav-contract.mjs`
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI / visible copy を触った場合は対象 page を `390 / 820 / 1024 / 1280 / 1366px` で確認し、結果を `task.md` に残す。
- 可能なら Supabase 実環境で、別ブラウザ相当の localStorage 空状態から login し、保存済み locale/theme が反映されることを確認する。
- 実環境 smoke ができない場合は、contract / Playwright / local production server で確認できた範囲と未確認範囲を `task.md` に明記する。

current slice verification:
- RED: `node scripts/account-remote-display-settings-contract.mjs` failed before implementation because `components/account/AccountRemoteDisplaySettingsApplier.tsx` did not exist.
- Account related contracts passed:
  - `node scripts/account-remote-display-settings-contract.mjs`
  - `node scripts/preference-classification-contract.mjs`
  - `node scripts/local-preference-adapter-contract.mjs`
  - `node scripts/account-preferences-shell-contract.mjs`
  - `node scripts/supabase-auth-first-slice-contract.mjs`
  - `node scripts/account-auth-public-readiness-contract.mjs`
  - `node scripts/workers-route-smoke-account-nav-contract.mjs`
- `npm run build` passed。server-runtime build のため static export alias postbuild は `out` missing を正常 skip。Next.js middleware deprecation warning と webpack cache warning は既存残リスク。
- `npm run lint` passed。
- `npx tsc --noEmit` passed。
- `git diff --check` passed。LF/CRLF conversion warning only。
- UI visible copy / layout は変更していないため、幅別 visual check は未実施。

current slice remaining risks:
- Supabase 実環境での「別ブラウザ相当の localStorage 空状態から login し、保存済み locale/theme が反映される」smoke は、テスト用 account credential / authenticated browser session が無いため未実施。
- remote preference apply は code path / contract で確認。stacked PR merge 後、Workers branch 上で `/`、`/tools`、tool page、`/account` それぞれの login redirect 後に `v-streamer-tools-locale` / `v-streamer-tools-theme` が保存済み値へ反映されることを最終確認する。
- 次の CTA 強化 PR では、Home / sidebar / account CTA の登録訴求 copy を強める。ただし下書き、予定本文、画像、handoff payload は自動アップロードされないことを明記する。

完了時:
- `task.md` に実装内容、確認結果、残リスク、次の CTA 強化 PR への引き継ぎを残してください。
- commit / push / draft PR 作成まで進めてください。
- PR の base は `main` ではなく `codex/supabase-auth-first-slice` にしてください。
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
