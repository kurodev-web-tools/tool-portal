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

1. Account auth public readiness before PR #234 main merge
   - status: next immediate task。PR #234 `codex/supabase-auth-first-slice` を main に入れる前に、検証用 account UI / magic link 導線を公開初期版として違和感の少ない Email + Password account flow へ整える。
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

2. User account / preferences foundation
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
       - deploy command は `npm run deploy:cloudflare` を推奨する。build-only validation では `npm run build:cloudflare`。
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
PR #234 `codex/supabase-auth-first-slice` を main に入れる前に、Account auth public readiness として、検証用 magic-link account UI を公開初期版の Email + Password signup/login/reset flow と account page 導線へ整理してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- `docs/future/USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md` を確認してください。
- PR #235 Cloudflare SSR deploy foundation は PR #234 branch へ merge 済み。
- Cloudflare Workers production branch は検証中のみ `codex/supabase-auth-first-slice`。
- Supabase project、Workers URL、publishable env、migration SQL 適用、Custom SMTP、Email template 調整はユーザー側で確認済み。
- secret / service_role key は要求・表示・保存しない。
- ローカルから Workers deploy する場合は Dashboard vars を消さないよう、`npm run build:cloudflare` then `npx wrangler deploy --keep-vars` を使う。

確認元 branch:
- `codex/supabase-auth-first-slice`

推奨 stacked branch:
- `codex/account-email-password-public-readiness`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/account-email-password-public-readiness`

今回の scope:
- 初期公開の主導線を Email + Password にする。
- Magic link は表の主要導線から外す。必要なら fallback / later note に留める。
- `/login` を作成し、email + password login、forgot password 導線、create account への link を置く。
- `/signup` を作成し、email + password registration、利用開始の説明、login への link を置く。
- `/reset-password` を作成し、reset email request を実装する。
- reset link 後の new password 設定 route を作る。route 名は `/account/security` または `/update-password` のどちらが既存構成に合うか確認して決める。
- `/account` はログイン済みユーザー向けの account / shared preferences page として整理する。未ログイン時は `/login?next=/account` へ誘導、または最小案内にする。
- PC 左下の「ログイン予定」カードを実導線に変更する。
  - 未ログイン: `アカウントで設定を保存` / `ログイン / 登録` / `/login`
  - ログイン済み: `アカウント` / email または account 状態 / `アカウント設定` / `/account`
- mobile drawer / narrow layout の account 導線も確認する。
- `/account` から実装者向け文言を弱める / 消す。
  - 消す候補: `Supabase Auth`、`Auth / DB boundary`、`publishable key`、`migration / RLS / GRANT`、`Local Free`、`quota writes trusted server only`
  - 残す: ログイン中 email、共通設定 language / theme、保存状態、ログアウト、将来機能の控えめな説明
- 将来機能の説明には、有料プラン契約状況や外部アカウント連携が後続で入ることを控えめに示す。
- Account / Auth 関連 contract script を追加または更新する。

Out of scope:
- Google / Apple OAuth 実装。
- paid plan / billing / Stripe 実装。
- translation tool 本体、logged-in-only tool boundary、quota enforcement。
- Thumbnail / Schedule / SNS tool の既存 payload migration。
- service_role / secret key を browser / source-controlled docs に入れること。

検証:
- `node scripts/preference-classification-contract.mjs`
- `node scripts/local-preference-adapter-contract.mjs`
- `node scripts/account-preferences-shell-contract.mjs`
- `node scripts/supabase-auth-first-slice-contract.mjs`
- 今回追加または更新した auth/account contract script
- `npm run build`
- `npm run build:cloudflare`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- Workers local preview または production URL smoke。
- UI を触った場合は `/login`、`/signup`、`/reset-password`、`/account` と sidebar / drawer account CTA を `390 / 820 / 1024 / 1280 / 1366px` の必要幅で確認し、結果を `task.md` に残す。
- Supabase 実環境で signup / login / logout / password reset / locale-theme save を確認する。

完了時:
- `task.md` に実装内容、確認結果、残リスク、次候補への引き継ぎを残してください。
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
