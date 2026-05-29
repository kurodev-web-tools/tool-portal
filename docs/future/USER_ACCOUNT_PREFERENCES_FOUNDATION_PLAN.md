# User Account / Preferences Foundation Plan

## Purpose

複数ツール共通の user account / preferences foundation を、login UI、DB、API、billing 実装へ進む前に整理する。
この planning は保存対象の分類、local-only 境界、将来 sync 候補、provider / schema / quota の比較に限定する。

対象ツール:

- Thumbnail Editor
- Schedule Calendar
- Kuro Live Comment Translator
- 将来の local font loading
- 横断 preference としての locale / theme

この文書は `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`、`docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`、`docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md` の個別方針を横断 account / preferences 観点で束ねる。個別 tool の preset、material、font、schema、export、handoff payload はこの planning では変更しない。

## Current Local-Only Inventory

| Area | Current storage | Stored data | Current boundary |
| --- | --- | --- | --- |
| Portal locale | `localStorage`: `v-streamer-tools-locale` | `ja` / `en` preference | 横断 preference として sync 候補。サーバー必須ではない。 |
| Portal theme | `localStorage`: `v-streamer-tools-theme` | `light` / `dark` preference | 横断 preference として sync 候補。サーバー未接続時も local fallback 必須。 |
| Thumbnail draft | `localStorage`: `v-streamer-tools:thumbnail-editor:draft:v1` | canvas、layers、selected layer、preset id、text/image layer metadata | 作業中 draft。個人制作物を含むため自動 server sync の初期対象にしない。明示 save / project 化が必要。 |
| Thumbnail preset discovery | `localStorage`: `v-streamer-tools:thumbnail-editor:preset-discovery:v1` | recent / favorite preset ids、variant refs | preference sync 候補。軽量 ID のみ。 |
| Thumbnail recent fonts | `localStorage`: `v-streamer-tools:thumbnail-editor:recent-fonts:v1` | recent font family list | preference sync 候補。font file ではなく family id のみ。 |
| Thumbnail user material refs | `localStorage`: `v-streamer-tools:thumbnail-editor:user-material-refs:v1` | `id`、`name`、`storageId`、mime、size、timestamps | local-only metadata。server sync は upload / asset library 設計後に限定。 |
| Thumbnail user material images | IndexedDB: `v-streamer-tools:thumbnail-editor:user-materials` / `images` | user uploaded material image blobs | local-only。自動 server sync しない。 |
| Schedule Calendar | `localStorage`: `v-streamer-tools:schedule-calendar-events:v1` | events、settings、post templates、hashtag sets | 現行 v0 は local-only。events / templates は個人情報を含むため sync 設計前に分類が必要。 |
| Tool handoff | `sessionStorage`: `v-streamer-tools:tool-handoff:v1:<token>` | 30分 TTL の一時 payload | local-only / ephemeral。server persistence にしない。 |
| SNS Split draft | `localStorage`: `v-streamer-tools:sns-split-image-maker:draft:v1` | split config、export settings、image refs without body | 今回の対象外だが、handoff 境界確認用。自動 account sync 対象にしない。 |
| SNS Split images | IndexedDB: `v-streamer-tools:sns-split-image-maker` / `images` | uploaded / handoff image data URL | 今回の対象外。画像本体は local-only。 |

## Data Classification

### Sync Candidate

軽量で再現可能、個人制作物そのものではなく、複数ツールで UX を改善するもの。

- 横断 locale、theme。
- Thumbnail Editor:
  - recent / favorite preset ids。
  - recent font families。
  - font listbox preference、将来の font search preference。
  - quality guard の表示密度など、軽い UI preference が追加された場合の opt-in state。
- Schedule Calendar:
  - default view、week start、default start time、default duration。
  - default template id は、template sync と同時でなければ local-only に留める。
  - 将来の custom category / platform definitions は、server schema が決まった後の sync 候補。
- Kuro Live Comment Translator:
  - UI language、target translation language、display density。
  - glossary visibility、summary on/off、OBS Browser Dock display settings。
  - translation model preference は quota / billing と連動するため、free/paid boundary 決定後に扱う。
- Local font loading:
  - user-selected local font family / PostScript name / style / fallback preference。
  - last-used local font ids。
  - permission prompt dismissed state は local-only 優先。

### Store With Explicit User Action Only

ユーザーの制作物、予定、素材、接続情報に近く、暗黙 sync すると事故になりやすいもの。

- Thumbnail draft を project として保存する場合の project metadata と draft body。
- Thumbnail user material を server asset library として upload する場合の uploaded file metadata。
- Schedule events、announcement text、memo、post templates、hashtag sets。
- Kuro Live Comment Translator glossary、blocked terms、stream-specific session settings。
- Translation history / session logs。ただし初期は保存しない方針を推奨する。

### Keep Local-Only

端末、ブラウザ、短時間の作業状態に依存するもの。

- Tool handoff payload と token。
- Thumbnail / SNS Split の IndexedDB image blobs。
- Thumbnail user material refs that point to local IndexedDB storage.
- Undo history、draft history、open panel state、hover / selection state。
- Local Font Access permission state、font availability scan result、last-seen local font state。
- Browser-specific fallback results such as missing IndexedDB image recovery state.

### Do Not Store

保存しない、または初期 foundation では扱わない。

- OAuth access token / refresh token in `localStorage`。
- Raw platform credentials、stream keys、cookies。
- Font file binary from local machine without explicit upload。
- Full comment logs by default。
- Viewer IDs, account IDs, or personal identifiers beyond what is required for an authenticated integration.
- Generated image/export binaries unless user explicitly saves/uploads them.
- Tool handoff payload after TTL expiration.

### Cannot Assume Server Sync

server 側があっても、同期可能とみなしてはいけないもの。

- Local Font Access results: browser support、OS font names、permission state が端末依存。
- IndexedDB-only blobs: browser profile local storage に閉じており、server reference として再現不能。
- Schedule Calendar legacy localStorage payload: 既存 local-only user data のため、初回 migration は explicit import / opt-in が必要。
- Thumbnail draft with local user material refs: `storageId` が server で解決できない。
- Handoff payload: one-time, target-specific, TTL 前提。
- Kuro translator live session state: platform API rate limit、OAuth scope、stream lifecycle に依存する。

## Tool-Specific Preference Candidates

### Thumbnail Editor

最初に sync してよい候補:

- `recentPresetIds`、`favoritePresetIds`、recent / favorite variant refs。
- recent font families。
- text panel preference が追加された場合の UI-only state。

local-only に残すもの:

- current draft autosave。
- user material refs and IndexedDB blobs。
- export preflight transient state。
- handoff-derived text application state。

server sync 前提にしないもの:

- draft layers containing `data:image/` or `materialRef.storage === "indexeddb"`。
- local font family chosen from OS fonts until fallback / missing-font UX is specified。

### Schedule Calendar

最初に sync してよい候補:

- `settings.defaultView`。
- `settings.weekStartsOn`。
- `settings.defaultStartTime`。
- `settings.defaultDurationMinutes`。

server schema 後に検討する候補:

- events。
- post templates。
- hashtag sets。
- custom categories / platforms。
- backup / restore import flow。

local-only に残すもの:

- undo state。
- current open form / sheet / panel state。
- local backup JSON text in import textarea。

server sync 前提にしないもの:

- existing localStorage payload without explicit user migration。
- generated post preview state that can be derived from events/templates。
- handoff payloads to Thumbnail Editor / SNS Split Image Maker。

### Kuro Live Comment Translator

現時点では未実装 tool のため、初回 MVP は保存を小さく保つ。

最初に sync してよい候補:

- target language。
- source platform selection。
- OBS display density / font size / theme preference。
- glossary feature on/off。

server schema 後に検討する候補:

- user glossary。
- per-platform channel connection metadata。
- moderation terms。
- quota usage counters and reset window.

保存しない、または server-only にすべきもの:

- OAuth tokens in browser storage。
- raw comment log by default。
- viewer identifiers unless required by platform policy and retention is documented。
- reply generation drafts that could be mistaken for user-authored output.

### Local Font Loading

最初に sync してよい候補:

- selected local font family name。
- PostScript name / style name。
- fallback font family。
- per-tool preferred font category.

local-only に残すもの:

- permission state。
- full local font list scan result。
- last-seen availability state。
- browser support detection result。

保存しないもの:

- local font binary。
- OS path to font file。
- full system font inventory unless the user explicitly opts in and retention is explained。

## Foundation Shape Options

### Option A: Local-First Preference Registry

Add a shared preference contract and local adapters first. Keep all data local, with a schema that can later map to account storage.

Pros:

- Low risk and matches current local-only app.
- Lets each tool classify preferences before auth / DB decisions.
- No provider lock-in.

Cons:

- Does not deliver multi-device sync yet.
- Later migration still needs explicit account merge policy.

Recommended for first implementation slice.

### Option B: Auth + DB First

Pick provider and schema first, then connect tools to remote preferences.

Pros:

- Faster path to real sync and paid plan gating.
- Quota/account objects can be designed with real constraints.

Cons:

- Higher blast radius.
- Forces migration and privacy decisions before the data boundary is stable.
- Risks mixing login UI, API routes, billing, and tool behavior in one PR.

Not recommended as the next slice.

### Option C: Hybrid Provider Spike

Create a docs-only or prototype-only comparison of auth provider, DB, billing, quota, and migration.

Pros:

- Useful before paid plan work.
- Can settle provider questions without touching tools.

Cons:

- Does not improve code contracts unless followed by Option A.

Recommended after Option A contract planning or in parallel as a separate planning PR.

## Provider / Schema / Billing Candidate Comparison

### Auth Provider Candidates

| Candidate | Fit | Risk |
| --- | --- | --- |
| Supabase Auth | Auth + Postgres + RLS can live in one product. Good for user preferences, projects, and quotas. | Requires careful RLS, migration policy, and edge/runtime config. |
| Clerk | Fast login UI and account management. Good if auth UX speed matters. | Preferences/DB/billing still need separate architecture. Vendor coupling on auth UI. |
| Auth.js | Flexible and framework-native. | More ownership burden for sessions, providers, adapters, security, and account UI. |
| Firebase Auth / Firestore | Quick realtime-ish sync. | Data model and billing/quota can drift away from existing Next/Postgres-friendly plan. |
| Custom auth | Maximum control. | Not justified for this project at foundation stage. |

### DB Shape Candidates

Minimal future shape, not implementation:

- `user_profiles`: public display/preferences shell, no sensitive provider tokens.
- `user_preferences`: cross-tool locale/theme and global flags.
- `tool_preferences`: `tool_id`, `preferences_json`, versioned and small.
- `thumbnail_projects`: explicit user-saved projects only, not automatic local draft sync.
- `user_assets`: explicit uploaded assets only, with storage metadata and quota accounting.
- `schedule_items` / `schedule_templates` / `hashtag_sets`: only after explicit migration/import flow.
- `translator_connections`: platform connection metadata only. Tokens should be provider/server-managed, not browser-visible.
- `usage_quotas`: plan, period, counters, reset time. Keep separate from preference JSON.

### Billing / Quota Candidates

Keep billing and quota out of the first implementation.

- Stripe is the likely billing candidate if paid plan work starts, but no Checkout / subscription / webhook implementation belongs in this planning PR.
- Quota should be server-authoritative, not a synced preference.
- Translator quota should count API-backed actions, not local UI actions.
- Asset storage quota should count uploaded server assets only, not IndexedDB local blobs.
- Free plan should not require migrating existing local-only data.

## Auth Provider Decision Spike

Status: docs-only comparison snapshot, 2026-05-27. This section does not authorize login, database, migration, API route, billing, or tool payload changes.

Reference snapshot:

- Supabase Auth overview: https://supabase.com/docs/guides/auth
- Supabase SSR client setup for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Clerk third-party auth guide: https://supabase.com/docs/guides/auth/third-party/clerk
- Supabase changelog checked on 2026-05-27: https://supabase.com/changelog
- Clerk Next.js SDK reference: https://clerk.com/docs/reference/nextjs/overview
- Clerk user management guide: https://clerk.com/docs/guides/users/managing
- Clerk Billing overview: https://clerk.com/docs/guides/billing/overview
- Clerk Supabase integration guide: https://clerk.com/docs/guides/development/integrations/databases/supabase
- Auth.js session strategies: https://authjs.dev/concepts/session-strategies
- Auth.js database adapters: https://authjs.dev/getting-started/database

Recent Supabase notes that affect this spike:

- Supabase Auth uses JWTs and integrates with Postgres / RLS, so it matches a server-authoritative quota and preference schema if RLS is designed first.
- Supabase SSR for Next.js uses cookie-backed clients via `@supabase/ssr`; public clients should use publishable keys, while secret/service keys remain server-only.
- RLS must be enabled on exposed schema tables and policies must account for unauthenticated requests because `auth.uid()` can be `null`.
- New Supabase projects are moving toward stricter Data API exposure defaults, so future DB work must explicitly verify grants and RLS exposure before client access.
- Supabase changelog includes upcoming runtime/platform changes such as Node.js 20 support ending for Supabase JS packages on 2026-06-30 and Postgres 14 support ending on 2026-07-01. A later implementation should pin runtime assumptions before adding SDKs or migrations.

### Decision Matrix

| Criterion | Supabase Auth | Clerk | Auth.js |
| --- | --- | --- | --- |
| Fit for this plan | Strongest fit when preferences, quotas, explicit projects, uploaded assets, and future schedules live in Postgres. Auth identity and RLS can be designed together. | Strong fit for fast sign-in UI, account portal, and user management. Needs a separate application DB strategy for preferences, quota, and project data. | Strong fit when this project wants full session/provider ownership inside Next.js. Requires more auth UI, adapter, session, and security ownership. |
| DB shape | `auth.users` can anchor app-owned tables such as `user_profiles`, `user_preferences`, `tool_preferences`, `usage_quotas`, explicit `thumbnail_projects`, explicit `user_assets`, and later schedule / translator tables. | App DB should store Clerk user IDs as external IDs, for example `auth_provider_user_id`, or use Supabase third-party auth with Clerk session claims. Clerk does not automatically sync user records to Supabase. | App DB must include Auth.js adapter models or custom equivalents plus app tables. User IDs and session/account tables become this app's responsibility. |
| RLS / session handling | Use Supabase SSR cookie clients and RLS policies scoped by `auth.uid() = user_id`. Every exposed table needs RLS and explicit grants. | Use Clerk session tokens with Supabase third-party auth when using Supabase DB/RLS. RLS policies need `auth.jwt()` claim mapping such as Clerk `sub`; user sync requires webhooks if app tables need mirrored profile data. | JWT sessions are HttpOnly cookie based by default unless a database adapter is configured; database sessions need adapter tables. RLS against Supabase/Postgres would need a custom trusted server boundary or token-to-user mapping. |
| Account merge policy | Prefer provider-native identity linking only after verified email / provider checks. Local-only preferences import explicitly after sign-in; never silently upload drafts, schedules, images, comments, or font inventory. | Similar explicit local import policy, but merge must reconcile Clerk user IDs with app DB rows and webhook-delivered profile state. Email collisions should be manual until trust rules are defined. | Merge rules are fully app-owned. This is flexible but increases risk around duplicate users, provider account linking, and session invalidation edge cases. |
| Quota / paid plan boundary | Best fit for server-authoritative `usage_quotas` tables and RLS-protected entitlements. Billing remains separate, likely Stripe later; quota is not preference JSON. | Clerk Billing exists but is beta and experimental, so do not make it the paid-plan foundation now. Use separate server-authoritative quota tables if Clerk is selected for auth only. | Billing and quota are entirely custom. Good for control, but it expands first auth implementation beyond the current foundation goal. |
| Rollback / migration risk | Main risks are RLS mistakes, Data API exposure, SDK/runtime drift, and Postgres migration discipline. Rollback can leave local-only app behavior intact if account sync is opt-in and tables are additive. | Main risks are auth vendor coupling, separate user identity mapping, webhook drift, and migration away from Clerk IDs. Easier UX start, harder provider exit. | Main risks are security/session ownership, adapter schema changes, and custom account UI. Provider exit is easier than Clerk, but operational burden is highest. |

### Provisional Recommendation

Use Supabase Auth as the provisional candidate for the next auth implementation slice, with Supabase Postgres / RLS as the eventual preference and quota store.

Reasoning:

- It keeps auth identity, preference DB shape, RLS, and quota accounting in one architecture.
- It best matches the existing plan's need for small preference sync first, explicit project / schedule / asset migration later, and server-authoritative paid-plan boundaries.
- It avoids making Clerk Billing beta or custom Auth.js session ownership part of the first account foundation.
- It preserves a local-only fallback because current `localStorage`, IndexedDB, and `sessionStorage` payloads stay unchanged until a user explicitly signs in and opts into import/sync.

Clerk should remain the fallback if prebuilt auth/account UI speed becomes more important than first-party DB/RLS simplicity. If Clerk is selected later, use Clerk as auth only at first, keep app data in Supabase/Postgres or another app-owned DB, and avoid Clerk Billing until its beta / breaking-change risk is acceptable.

Auth.js should remain the fallback if self-hosted auth ownership becomes a project requirement. It should not be the first implementation choice unless the project is ready to own session strategy, adapter schema, account UI, provider linking, and security maintenance.

### Minimal Future DB Shape

If Supabase Auth remains the chosen path, the first schema should stay additive and small:

- `user_profiles`: `user_id uuid primary key references auth.users(id)`, display/account shell metadata only, no provider tokens.
- `user_preferences`: `user_id`, schema version, global locale/theme preference and other cross-tool flags.
- `tool_preferences`: `user_id`, `tool_id`, schema version, small `preferences_json` for approved sync candidates only.
- `usage_quotas`: `user_id`, plan id, period start/end, counters, reset timestamp. This table is server-authoritative and not editable as preference JSON.
- Later explicit-save tables only after separate design: `thumbnail_projects`, `user_assets`, `schedule_items`, `schedule_templates`, `hashtag_sets`, `translator_connections`.

RLS policy direction:

- All exposed app tables must enable RLS before client access.
- User-owned preference rows should be scoped to the authenticated user id.
- `usage_quotas` should be readable by the owner but updated only by trusted server code.
- Uploaded assets and explicit projects need separate quota and deletion policy before implementation.
- Never use browser-local OAuth tokens, raw credentials, local font binaries, IndexedDB blob refs, handoff payloads, or translator live session logs as sync candidates.

### Account Merge And Migration Policy

- First sign-in starts with local app behavior unchanged.
- Initial sync candidate set should be only global locale/theme, then small Thumbnail preference IDs after a separate confirmation.
- Local values may be imported only through an explicit user action. Do not auto-upload current drafts, schedules, user materials, comments, local font inventory, or handoff payloads.
- If remote and local values conflict, prefer a visible one-time choice: keep local, keep account, or merge where the data is an append-only ID list.
- Schedule Calendar legacy payloads require explicit import/backup flow before server sync.
- Account deletion policy must be defined before storing projects, assets, schedules, translator connection metadata, or quota history.

### Next Slice Gate

Do not proceed to login implementation until the next slice has all of the following:

- Supabase project/runtime target and supported Node version pinned.
- Minimal additive DB schema draft with RLS policies and rollback plan.
- Session boundary for Next.js App Router defined, including publishable vs secret key handling.
- Account merge policy copy and conflict behavior for locale/theme.
- Quota read/write ownership defined separately from preferences.
- Explicit out-of-scope list preserving current storage keys, local payloads, IndexedDB blobs, `sessionStorage` handoff, and individual tool UI behavior.

## Supabase Auth Boundary Design

Status: docs-only contract, 2026-05-27. This section refines the Supabase Auth adoption premise from the auth/provider decision spike before login, database, or server sync work starts.

No SDK dependency, `.env.local`, migration, SQL, API route, Server Action, login UI, or storage payload change is authorized by this section.

### Official Reference Snapshot

Use these as the reference points for the first implementation slice:

- Supabase SSR client setup for Next.js / App Router: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase SSR advanced guide: https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Supabase API key model: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Data API exposure changelog: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

Recent points that affect this repo:

- Next.js App Router / SSR should use cookie-backed session boundary via `@supabase/ssr` when implementation begins.
- Server-side authorization should not trust a raw cookie session alone. Use Supabase token validation helpers such as `getClaims()` / `getUser()` at the server boundary before protected user data is used.
- Supabase publishable keys are public application keys. A logged-in user still gets the `authenticated` Postgres role through the user's JWT and RLS policies.
- Supabase secret keys and legacy `service_role` keys are elevated backend credentials and bypass or exceed normal client-side RLS assumptions. They do not belong in browser code, public docs, chat, `.env.local` examples with real values, or source-controlled files.
- New Supabase projects can run with `Automatically expose new tables` OFF, and this project should design for that stricter default.

### Next.js App Router / SSR Session Boundary

The first auth implementation should keep the runtime boundary small:

- Browser UI can use a browser Supabase client only after the SDK dependency is intentionally added. It uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Server Components, Route Handlers, Server Actions, and any future account API should create a request-scoped server client. Do not keep a global request-authenticated Supabase client.
- The cookie-backed session boundary is the only auth transport considered for SSR. Do not store Supabase access tokens or refresh tokens in `localStorage`, IndexedDB, or `sessionStorage`.
- A future `proxy.ts` / session-refresh boundary may refresh cookies and pass them to Server Components. It must preserve Supabase-set cookies when wrapping responses.
- Protected server work should validate the user through Supabase auth helpers before reading or writing user-owned rows.
- The existing local-only app behavior remains valid when no Supabase session exists.

### Environment And Key Handling

Environment names for the later implementation:

| Name | Scope | Handling |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server config | Public project URL. May appear in client bundle. Do not put a secret here. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server public client | Public low-privilege key. It can be bundled, but all user data access still depends on Auth + RLS. |
| `SUPABASE_SECRET_KEY` | Trusted server only, later quota/admin work only | Not needed for the first locale/theme auth slice. Must never use the `NEXT_PUBLIC_` prefix. Do not request, display, commit, paste into docs, or store a secret / service_role key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy trusted server only | Avoid for the first slice. If a later backend-only operation requires it, keep it outside browser/runtime-public env and document the narrow operation. Must never use the `NEXT_PUBLIC_` prefix. |

Implementation notes:

- Do not create `.env.local` in repo work unless a separate implementation task explicitly asks for a placeholder file with no real values.
- Do not include actual Supabase project URL, publishable key, secret key, or service_role key in docs.
- Do not add public env names for secret keys.
- Secret and service_role variables must never use the `NEXT_PUBLIC_` prefix.

### Minimal DB Shape Draft

This is a shape contract, not a migration.

| Table | Ownership | Initial purpose | Client access direction |
| --- | --- | --- | --- |
| `user_profiles` | one row per Supabase Auth user | Account shell metadata and display-safe profile state. No provider tokens. | Owner read/update only after Auth. Insert/upsert path decided during implementation. |
| `user_preferences` | one row per user | Global locale/theme and future cross-tool flags. | Owner read/update. Initial account merge is limited to locale/theme only. |
| `tool_preferences` | one row per user/tool or versioned user/tool record | Small approved sync candidates such as future Thumbnail preset IDs, recent font IDs, or tool UI preferences. | Owner read/update only after each tool preference contract is promoted. Not part of first merge. |
| `usage_quotas` | one row per user/plan/period or normalized quota window | Plan id, period start/end, counters, reset timestamp, and quota state. | Owner read. quota writes are trusted-server-only and server-authoritative. Not editable as preference JSON. |

Columns should stay additive and explicit:

- Use `user_id` anchored to Supabase Auth user identity.
- Include server schema version fields for preference tables. Do not reuse localStorage version numbers as server schema versions.
- Include timestamps for account rows, but do not backfill existing local-only data implicitly.
- Keep quota data separate from preference JSON.

### RLS And GRANT Direction

RLS enabled before any Data API access is the default rule for exposed schema tables.

Baseline direction for later SQL work:

- Treat `Automatically expose new tables` OFF as the expected project setting.
- Grant Data API access only for tables needed by the implementation. Use explicit `GRANT` for the required role/table/action set instead of assuming public schema defaults.
- Every exposed app table needs RLS before it can be used through browser or SSR clients.
- User-owned rows are limited to the authenticated owner. Policy expressions should explicitly account for unauthenticated requests and use `authenticated` plus `auth.uid()` ownership checks.
- `user_profiles`, `user_preferences`, and `tool_preferences` are user-owned. The first implementation should avoid cross-user reads.
- `usage_quotas` read for owner only is acceptable for account UI. quota writes are trusted-server-only and must not be writable by the browser client.
- Do not rely on `raw_user_meta_data` or user-editable JWT claims for authorization decisions.
- Keep any future elevated helper outside exposed schemas and out of the first auth slice.

### Initial Account Merge Policy

Initial account merge is limited to locale/theme only:

- Candidate local keys: `v-streamer-tools-locale` and `v-streamer-tools-theme`.
- If no remote value exists, the signed-in user can copy the local locale/theme into account preferences.
- If remote and local values conflict, show a one-time choice: keep this browser value, keep account value, or apply account value to this browser.
- Do not silently upload or merge any other stored data.
- No Thumbnail, Schedule Calendar, Translator, IndexedDB, handoff, local font, project, asset, or billing data participates in the first merge.
- Existing local preference fallback remains available if Supabase is unavailable or the user signs out.

### Rollback Path And Migration Risks

Rollback path:

- Keep all first tables additive and unused by existing tools until the account implementation explicitly reads them.
- Use additive tables only for the first database slice.
- If Supabase Auth is disabled or removed, local-first behavior remains intact because existing storage keys and payloads are unchanged.
- Do not make account data required for portal rendering, tool loading, or export flows in the first auth slice.
- No existing localStorage, IndexedDB, or sessionStorage key is renamed, deleted, migrated, or rewritten in this slice.

Migration risks:

- RLS or explicit `GRANT` mistakes can either block all reads or expose rows too broadly.
- Cookie/session refresh mistakes in SSR can cause signed-in users to appear signed out.
- Secret/service_role key misuse can bypass intended RLS boundaries.
- Quota counters in preference JSON would be hard to make server-authoritative later, so quota stays separate from the start.
- Locale/theme merge copy must be clear before implementation to avoid surprising users who already rely on browser-local settings.
- Schedule Calendar payloads, Thumbnail drafts/materials, translator state, local font availability, and handoff payloads remain separate explicit migration problems.

### Contract And Verification

- Required contract check: `node scripts/supabase-auth-boundary-design-contract.mjs`
- Continue to run:
  - `node scripts/preference-classification-contract.mjs`
  - `node scripts/local-preference-adapter-contract.mjs`
  - `node scripts/auth-provider-decision-spike-contract.mjs`
- UI width verification is not required for this docs-only / contract-only slice.

## Supabase Auth Implementation First Slice

Status: first implementation contract, 2026-05-27. This section promotes the boundary design into the smallest runtime slice.

Implementation scope:

- Add only `@supabase/supabase-js` and `@supabase/ssr`.
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser and SSR public clients.
- Keep `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` documented as trusted-server-only names. They are not required, read, displayed, or saved in this first slice.
- Add request-scoped SSR cookie clients and a Next.js `proxy.ts` refresh boundary using `auth.getClaims()`.
- Switch the Next.js runtime away from static export because SSR cookie session and proxy are not compatible with `output: "export"`.
- Add `/auth/confirm` for magic-link confirmation and `/account` actions for email magic-link sign-in, sign-out, and explicit locale/theme account save.
- Keep the first account save limited to `user_preferences.locale` and `user_preferences.theme`.
- Keep local fallback intact. Existing `v-streamer-tools-locale` and `v-streamer-tools-theme` keys are read as local values and are not renamed or migrated.

Reviewable SQL:

- Migration file: `supabase/migrations/20260527000000_account_preferences_foundation.sql`.
- The Supabase CLI was not installed in the workspace, so the migration file is authored directly for review instead of generated with `supabase migration new`.
- Tables stay additive and limited to the boundary set: `user_profiles`, `user_preferences`, `tool_preferences`, `usage_quotas`.
- RLS is enabled on all four tables.
- `user_profiles`, `user_preferences`, and `tool_preferences` are owner-scoped for authenticated select / insert / update.
- `usage_quotas` grants owner read only to authenticated users. quota writes are trusted-server-only and are not browser writable.

Out of scope remains:

- Paid plan / billing implementation.
- Thumbnail / Schedule / Translator preferences server sync.
- Individual tool UI changes.
- Existing storage key / payload / localStorage / IndexedDB / sessionStorage shape changes.
- `.env.local` creation or real Supabase value storage.
- Browser code that uses secret / service_role keys.

Verification:

- Required implementation contract: `node scripts/supabase-auth-first-slice-contract.mjs`.
- Continue to run the previous preference/auth boundary contracts before merging.
- UI width verification is required because `/account` runtime UI is updated.

## Migration Principles

- Existing localStorage remains source of truth until the user signs in and explicitly opts into import/sync.
- Account sync must never silently upload drafts, schedules, images, comments, or font inventory.
- Preference sync should be mergeable and reversible. Local values can override remote values on first sign-in only after confirmation or clear preference.
- Server records need per-tool schema version fields. Do not reuse localStorage version numbers as server schema versions.
- Handoff stays browser-local and ephemeral even after account login exists.
- If local data references IndexedDB blobs, server migration must either skip those refs or require explicit asset upload first.

## Suggested Implementation Slices

1. `preference contract foundation`
   - Add docs plus a small shared type/contract for preference classification.
   - No login UI, DB, API, billing, or tool UI changes.
   - Contract should assert that handoff, IndexedDB blobs, OAuth tokens, and local font binaries are not sync candidates.
   - Verification command: `node scripts/preference-classification-contract.mjs`.
2. `local preference adapter`
   - Optional helper around existing localStorage keys.
   - Keep existing keys and payloads unchanged.
   - No migration.
3. `auth/provider decision spike`
   - Compare Supabase Auth, Clerk, Auth.js against this data classification.
   - Decide provider only after preference contract is stable.
4. `account sync MVP`
   - Sync locale/theme and small Thumbnail preferences first.
   - No draft, schedule, user material, translator tokens, billing.
5. `schedule explicit migration`
   - Design import/sync flow for events/templates/hashtag sets.
   - Requires privacy copy, export/import fallback, and conflict policy.
6. `translator account integration`
   - Add OAuth connection and server-side token handling only after auth and quota are ready.
7. `local font preference`
   - Store selected local font refs only.
   - Keep font binaries and full local inventory out of account storage.

## Open Questions

- Should the first account MVP include only global locale/theme, or also Thumbnail recent/favorite preset IDs?
- Should Schedule Calendar sync be account-default from day one, or explicit import-only until users trust the data model?
- Which auth provider best matches the likely hosting target and database preference?
- Do paid plans gate storage, translation quota, export convenience, or all three?
- What retention period, if any, is acceptable for translator session summaries?
- How should account deletion handle server-saved projects, uploaded assets, schedules, and quotas?
- Should local font selected-family preferences be per tool or global?

## Verification

This planning document is the source of truth for preference classification until a later implementation intentionally promotes the contract into shared runtime types.

- Required contract check: `node scripts/preference-classification-contract.mjs`
- Required whitespace check: `git diff --check`
- UI width verification is not required because no UI or copy surfaced in runtime was changed.
- `npm run lint` and `npx tsc --noEmit` are required when contract-only implementation files are touched.
