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
