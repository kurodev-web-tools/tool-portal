# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯、古い next-session prompt は `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential / OAuth token / authorization code / owner id / provider target metadata / liveChatId は表示・要求・保存しない。
- Provider target metadata and liveChatId are consumed only through server-only boundaries and must not appear in output, docs, PR bodies, browser storage, or handoff payloads.

## Current Branch

- Current branch: `codex/browser-safe-account-session-view-model`.
- Base: latest `origin/codex/comment-translator-free-public-beta-integration`.
- Scope: Browser-safe account session view model for the Free public beta integration line. Keep internal account identifiers server-only for authorization, ownership, allowlist hashing, credential ownership, durable session/usage/feed ownership, and waitlist duplicate prevention; pass only browser-safe account status, intentionally visible email, and display preferences to client components.
- Non-actions: remote migration apply, Supabase remote mutation, deploy/upload, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Checkout/Portal redirect, webhook registration, rate-limit mutation actions: not implemented, Private launch access gate behavior unchanged, OBS and moderation controls unchanged.
- Public gate state label: unchanged / blocked.
- Public-release capable label: no.

## Primary Goal

Make Free beta actually usable by approved testers, then decide whether it is ready for broader public access.

Practical meaning:

1. A user can connect YouTube safely.
2. Connection alone does not start monitoring, polling, translation, or quota use.
3. The user explicitly presses Start.
4. The server resolves the owned live target without exposing liveChatId or provider target metadata.
5. Bounded `liveChatMessages.list` polling receives non-empty comments.
6. Eligible comments are translated through the Free Azure route.
7. The UI shows server-owned live comments, usage, source attribution, deletion/ended states, and stop reasons without leaking private provider data.
8. Durable session/usage/feed persistence works in the deployed target.
9. Public launch remains blocked until the release owner approves the final gate flip.

Current public-launch decision: `public-release capable: no`.

## Branch Strategy

- Keep `codex/comment-translator-youtube-oauth-integration` as the completed YouTube OAuth Integration Roadmap collection branch.
- Keep `codex/comment-translator-free-public-beta-integration` as the Free beta collection branch.
- Next PRs should target `codex/comment-translator-free-public-beta-integration` until Free beta public usability evidence is accepted.
- After Free beta public usability is accepted, promote `codex/comment-translator-free-public-beta-integration` to `main` through a separate approval-gated promotion PR.
- Creator closed beta can start after the Free path is proven, or use a later dedicated collection branch if the release owner wants separation.

## Current Free Public Beta State

| Area | State | Notes |
| --- | --- | --- |
| YouTube OAuth integration | complete | Final QA/readiness doc remains canonical. |
| Free Public Beta P0-0 / F1-F15 | complete | Local/server-only implementation and readiness foundation complete. |
| PL-G1 Remote durable enforcement | complete | Approved remote durable enforcement and deployed fail-closed evidence recorded. |
| PL-G2 Allowed-tester route/API smoke | complete | PL-G2K approved sanitized route/API harness smoke complete. |
| PL-G3 Start-to-translation smoke | complete | Core path, browser-visible feed, auto refresh, newest-first, JST display, cache hit/miss, diagnostics, Stop confirmed. |
| PL-G4 Production/custom deployed smoke | complete for preview custom URL | `https://preview.streamer-tools.kuro-lab.com/tools/comment-translator/` passed with allowed tester YouTube account. Final main production domain remains unpromoted. |
| PL-G5 Release-owner public launch decision | pending | Do not record public capable until pre-Step 5 hardening below is resolved or explicitly accepted. |
| PL-G6 Public access change / promotion | not-run / approval-gated | No main promotion, public gate flip, deploy/upload, or production domain cutover was run. |

## Public Launch Next Flow

Use this order for the remaining Free public beta work unless the release owner explicitly changes priorities.

| Step | Work | Current state | Boundary |
| --- | --- | --- | --- |
| 1 | Implement PPF-1 / PPF-2 | complete | Active-session periodic refresh and newest-first ordering verified after PR #577 merge. |
| 2 | Decide timestamp display scope | complete | JST / selected timezone display verified. Runtime quota/rate-limit authority stays UTC. |
| 3 | Approved browser-visible preview retest | complete | Start-before exclusion, Start-after feed, cache hit/miss, diagnostics counts, and Stop verified with sanitized labels/counts only. |
| 4 | PL-G4 production/custom deployed smoke | complete for preview custom URL | Preview deployed URL verified. Main production domain remains separate and not promoted. |
| 5 | Record PL-G5 release-owner decision | pending | First resolve or explicitly accept pre-Step 5 hardening items. |
| 6 | Execute PL-G6 public access change / promotion | not-run / approval-gated | Separate approval-gated operation after PL-G5. |

## Pre-Step 5 Hardening Board

Do these before recording `public-release capable: yes` unless the release owner explicitly accepts the risk.

| Priority | Item | Current decision / expected handling |
| --- | --- | --- |
| P0 | Free beta usage display resets to 30 minutes after page refresh while an active session exists | Complete in `codex/pre-step5-p0-quota-session-hardening`: dock now restores session state from server status on mount/target-language change, and status restore is provider non-executing. Active-session behavior is contract-covered; local browser was private-gate fallback only. |
| P0 | Active-session page refresh leaves feed blank until periodic/manual refresh | Complete in `codex/post-579-feed-quota-ledger-p0`: mount/status restore hydrates persisted server-owned safe feed rows immediately through `restoreCommentTranslatorPersistedRealCommentsFeedAction`, which only reads durable/session-scoped feed state and does not run provider polling or target lookup. |
| P0 | Per-minute translated message cap enforcement | Complete in `codex/pre-step5-p0-quota-session-hardening`: F10 provider execution blocks before provider calls when `translatedMessagesInCurrentMinute` is at/over the Free cap, and pending batches that would exceed the cap are usage-limit rows. |
| P0 | Monthly translated character cap enforcement | Complete in `codex/pre-step5-p0-quota-session-hardening`: F10 estimates pending provider-candidate source characters before provider execution and blocks batches that would exceed `20,000 translated characters/month`. |
| P0 | Live translation success path does not durably increment usage counters | Complete in `codex/post-579-feed-quota-ledger-p0`: F10 writes sanitized provider request and AI usage estimate events to the durable usage ledger after provider success; deterministic contract proves a later durable snapshot sees provider request, current-minute translated message, and monthly translated character increments. Durable write failure surfaces a sanitized feed-unavailable state instead of displaying translated rows without durable accounting. |
| P0 | Cache-hit translations count toward provider/AI quota accounting | Complete in `codex/post-580-cache-hit-quota-accounting-f033`: provider runtime and F10 durable handoff now count provider/AI usage only for provider-executed/cache-miss translations. Cache-hit rows can still hydrate/translate from server-owned cache, including at per-minute/monthly cap boundaries, without provider execution or durable usage writes. |
| P0 | Source-language selection stops comments/translations when target is EN | Complete in `codex/comment-translator-ja-en-source-wiring`: dock source selection is passed with target language to server actions and route heartbeat, then forwarded as `sourceLanguages` into live-provider translation execution. Deterministic contract proves `JA -> EN` and `KR/CN -> EN` are policy-ready, source comments become EN provider requests, and EN target-language comments are skipped without rejecting the batch. |
| P0 | Low-value short reactions and punctuation-only variants consume provider/quota | Complete in `codex/comment-translator-short-reaction-filter`: language policy now skips curated low-value short reactions before provider handoff, keeps short meaningful questions/requests/warnings eligible, and uses shared punctuation-light normalization for policy dedupe, provider cache lookup, and F10 same-batch text dedupe. |
| P0 | Public UI diagnostics surface | Complete in `codex/comment-translator-public-ui-cleanup`: normal public UI no longer renders the pre-public diagnostics count surface. Server policy behavior is unchanged and no public gate flip was run. |
| P1 | Preview feed `skipped` UI | Complete in `codex/comment-translator-public-ui-cleanup`: normal preview filters internal skipped rows out of public rendering while preserving server-side skip policy and deterministic filtering behavior. |
| P1 | Duplicate text cache display | Complete in `codex/comment-translator-public-ui-cleanup`: public badges use localized reused/new translation wording instead of raw cache hit/cache miss/cached terms while preserving duplicate text reuse semantics. |
| P1 | Free beta usage panel vs right-side Today panel | Complete in `codex/comment-translator-public-ui-cleanup`: duplicate Today/usage surfaces are consolidated into one authoritative right-side Free beta usage/status panel. |
| P1 | Data deletion / retention / source attribution panel | Removed from the normal public bottom details/test-input surface in `codex/comment-translator-creator-waitlist-admin-ui`. Server-owned deletion/retention boundaries remain unchanged and are still contract-covered. |
| P1 | Stop behavior and preview retention | Complete in `codex/comment-translator-stop-preview-retention`: Stop no longer clears the server-owned safe feed boundary, stopped retained rows show a previous-results state, manual Clear preview clears via the safe feed boundary and locally replaces the preview, and the next active Start clears retained rows before new session/feed results. Stop/Clear remain provider/polling/target-lookup/translation/quota-accounting non-executing by deterministic contract. |
| P1 | Preview author display name for moderation context | Implemented in `codex/comment-translator-preview-author-display-name`: server-owned safe feed boundary now carries only `authorDisplayName`, operator preview renders it with generic fallback, and channel id, author URL/profile image, liveChatId, provider target metadata, owner id, moderation controls, OBS Dock behavior, live/provider execution, quota writes, deploys, migrations, and public gate flips stay out of scope. |
| P1 | Step 5 evidence docs | Update PL-G4 / PL-G5 evidence docs with sanitized preview URL labels, pass/fail labels, and counts only. Do not include raw comments or screenshots containing raw comments. |

Recommended next PR order:

1. `Public UI cleanup`: complete / merged as PR #589.
2. `Creator waitlist admin + public UI trim`: complete / merged as PR #590.
3. `Comment Translator admin shortcut + dashboard shell`: complete / merged as PR #591.
4. `Portal sidebar navigation resilience + global admin dashboard`: complete / merged as PR #592.
5. `Portal sidebar divider polish`: complete / merged as PR #593.
6. `Supabase DB/Auth/RLS security audit`: complete / merged as PR #594.
7. `Browser-safe account session view model`: complete / merged as PR #595.
8. `Supabase default privileges guard`: current branch; add a local reviewable guard and deterministic contract so future `public` tables do not inherit accidental browser-role privileges. Keep existing 9 public tables unchanged.
9. `OBS Dock display-name policy`: defer until the OBS Dock implementation slice; decide display-name on/off setting, compact layout, and stream-safe visibility there.

## Latest Sanitized Evidence Summary

- Browser-safe account session view model local slice in `codex/browser-safe-account-session-view-model`: PR #594 merge state and merge-commit containment in `origin/codex/comment-translator-free-public-beta-integration` were confirmed before editing, the branch was created from the integration base, and the worktree was clean before edits. Added `AccountSessionBrowserSafeViewModel` plus `createBrowserSafeAccountSessionViewModel`, switched account/portal client props to that browser-safe model, removed the internal account id from the remote display-settings client apply key, and kept server-only account id usage in auth/admin/private-launch/credential/billing/durable ownership paths. Private launch access gate behavior unchanged. Rate-limit mutation actions: not implemented. Remote migration apply: not-run. No remote mutation, deploy/upload, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe/billing action, Checkout/Portal redirect, webhook registration, raw account identity output, raw response capture, browser storage capture, or credential exposure was run.
- Browser-safe account session view model verification passed: `node scripts/account-browser-safe-session-view-model-contract.mjs`, `node scripts/account-remote-display-settings-contract.mjs`, `node scripts/account-preferences-shell-contract.mjs`, `node scripts/account-cta-display-settings-copy-contract.mjs`, `node scripts/comment-translator-private-launch-access-gate-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `git diff --check`, changed-files high-confidence secret scan (`changed_files=17`, `secret_scan_matches=0`), and changed TS/TSX type-escape scan (`checked_files=14`, `type_escape_matches=0`). `comment-translator-portal-admin-navigation`, `comment-translator-creator-waitlist-admin`, `supabase-auth-first-slice`, `comment-translator-youtube-oauth-account-status-wiring`, and `comment-translator-youtube-oauth-tool-credential-source` contracts were attempted but not used as final verifiers because stale task markers or older changed-file/action allowlists reject this current branch rather than the browser-safe account session behavior. Internal account id client prop minimization is covered by `account-browser-safe-session-view-model-contract`. Width/browser QA was skipped because this slice changes prop shape and a client apply key only; no CSS, layout, rendered copy, route structure, or visible account/portal text changed.
- Supabase default privileges guard local slice in `codex/supabase-default-privileges-guard`: PR #595 merge state and merge-commit containment in `origin/codex/comment-translator-free-public-beta-integration` were confirmed before editing, the branch was created from the integration base, and the worktree was clean. Added `supabase/migrations/20260706073204_supabase_default_privileges_guard.sql` as a local reviewable migration proposal that revokes future `public` table, sequence, and function default privileges for `anon`, `authenticated`, and `service_role`, plus future function execute defaults from `PUBLIC`. Existing 9 public tables remain unchanged and keep their explicit grants/RLS policies. Remote migration apply: not-run. Remote Supabase mutation, deploy/upload, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Checkout/Portal redirect, webhook registration, raw response capture, browser storage capture, credential exposure, and public access change: not-run.
- Supabase default privileges guard verification passed in this branch: `node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs`, `node scripts/comment-translator-supabase-db-auth-rls-security-audit-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false`, `git diff --check`, and changed-files high-confidence secret scan (`changed_files=4`, `secret_scan_matches=0`). `npm run build` was skipped because runtime TS/TSX was unchanged; this slice changes SQL, docs, and a deterministic contract only. UI/browser width QA was skipped because no rendered UI, CSS, route, layout, or client behavior changed.
- Supabase DB/Auth/RLS security audit local slice in `codex/supabase-db-auth-rls-security-audit`: PR #592 and PR #593 merge states and merge-commit containment in `origin/codex/comment-translator-free-public-beta-integration` were confirmed before editing, the branch was created from the integration base, and the worktree was clean. Local migration audit found 9 `public` tables, all with RLS enabled. Browser-owned tables use owner predicates; user-owned update policies include `USING` plus `WITH CHECK`; trusted-server tables revoke browser roles and grant trusted server access only; no local views/functions/triggers/definer functions/storage policies were found. Added `docs/active/COMMENT_TRANSLATOR_SUPABASE_DB_AUTH_RLS_SECURITY_AUDIT.md` and `node scripts/comment-translator-supabase-db-auth-rls-security-audit-contract.mjs`. Remote read-only Supabase posture check was unavailable locally (`global-supabase-missing`, `local-npx-supabase-missing`, `supabase-link-metadata-missing`), so deployed metadata/advisors/grant drift remain unchecked. No remote mutation/apply, live/provider execution, OAuth live flow, deploy/upload, Stripe/billing action, Google target lookup, public gate flip, raw response capture, browser storage capture, or credential exposure was run.
- Supabase DB/Auth/RLS security audit verification passed: `node scripts/comment-translator-supabase-db-auth-rls-security-audit-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan (`changed_files=3`, `secret_scan_matches=0`). Existing Supabase/durable contracts were attempted but not used as final verifiers because their stale `task.md` handoff assertions require older slice markers unrelated to this audit.
- Sidebar divider polish follow-up after PR #592: desktop sidebar section labels now render as a single inline divider (`line - label - line`) and no longer stack an extra top border above the label. Verification passed: `node scripts/comment-translator-portal-admin-navigation-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false` after restoring lockfile dependencies with `npm ci --prefer-offline`, and Chrome screenshot review at `1366px` for `/tools/comment-translator`. Local authenticated allowlisted-admin browser state remains unavailable; Admin uses the same section label component and remains deterministic-contract covered.
- Portal sidebar navigation resilience + global admin dashboard local implementation completed in `codex/portal-sidebar-navigation-resilience`: PR #591 merge was reconfirmed first (`merged`, merge commit contained in `origin/codex/comment-translator-free-public-beta-integration`), the branch was created from the integration base, and the worktree was clean before edits. Implementation adds server-gated `/admin`, points the server-resolved admin shortcut to `/admin`, keeps `/admin/comment-translator` and `/admin/comment-translator/creator-waitlist` under the admin hierarchy, splits the desktop sidebar into stable top / scrollable nav / bottom account-settings regions, removes persistent future placeholder clutter, and keeps the lg-to-xl rail plus mobile drawer limited to top-level destinations. Rate-limit mutation tools, admin mutation endpoints/server actions, public gate flip, live/provider execution, deploy/upload, remote migration apply, Stripe, OAuth live flow, and Google target lookup: not-run / not implemented.
- Portal sidebar navigation deterministic verification passed: `node scripts/comment-translator-portal-admin-navigation-contract.mjs`, `node scripts/comment-translator-creator-waitlist-admin-contract.mjs`, `node scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs`, `node scripts/comment-translator-public-ui-cleanup-contract.mjs`, `node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs`, `node scripts/comment-translator-public-operator-session-ui-contract.mjs`, `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`, `node scripts/comment-translator-public-preview-feed-ux-contract.mjs`, `node scripts/comment-translator-stop-preview-retention-contract.mjs`, `node scripts/comment-translator-ui-live-provider-runtime-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `git diff --check`, changed-files high-confidence secret scan (`changed_files=12`, `secret_scan_matches=0`), and changed TS/TSX type-excuse scan (`checked_files=7`, `matches=0`). `scripts/portal-tools-copy-locale-contract.mjs` and `scripts/portal-locale-foundation-contract.mjs` were attempted but have stale baseline assertions unrelated to this branch, so they were not used as final verifiers.
- Browser/width verification for this slice used local dev server plus Playwright/Chrome at `390 / 820 / 1024 / 1280 / 1366px` for `/tools/comment-translator`, `/tools`, `/admin`, `/admin/comment-translator`, and `/admin/comment-translator/creator-waitlist`. All 25 route/width checks passed with no horizontal overflow, no forbidden admin/private text in unauthenticated rendered state, admin gated markers present, admin shortcut not visible locally, and desktop sidebar bottom account/settings reachable at desktop widths. Mobile/tablet drawer follow-up passed at `390 / 820px` for `/tools`, `/tools/comment-translator`, and `/admin`: Home/Tools only, no Admin in unauthenticated state, no individual tool list, and no horizontal overflow. Representative screenshots were visually checked for expanded desktop, icon rail, and mobile drawer. Authenticated allowlisted-admin browser state was unavailable locally; allowlisted admin shortcut visibility and allowed dashboard cards are deterministic-contract covered.
- Comment Translator admin shortcut + dashboard shell local verification completed in `codex/comment-translator-admin-dashboard-shortcut`: PR #590 merge was confirmed first (`merged`, merge commit contained in `origin/codex/comment-translator-free-public-beta-integration`), the branch was created from the integration base, and the worktree was clean before edits. Implementation resolves the admin shortcut in `PortalShell` through the server-only hash allowlist gate, passes only sanitized shortcut state to portal navigation, adds `/admin/comment-translator`, links the dashboard to `/admin/comment-translator/creator-waitlist`, and links the waitlist page back to the dashboard. Rate-limit tools: planned-only. Public-release capable: no. Remote migration apply: not-run. Stripe/live/provider/deploy/public gate/OAuth live flow/Google target lookup/admin mutation actions: not-run.
- Comment Translator admin shortcut + dashboard shell deterministic verification passed: `node scripts/comment-translator-creator-waitlist-admin-contract.mjs`, `node scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs`, `node scripts/comment-translator-public-ui-cleanup-contract.mjs`, `node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs`, `node scripts/comment-translator-public-operator-session-ui-contract.mjs`, `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`, `node scripts/comment-translator-public-preview-feed-ux-contract.mjs`, `node scripts/comment-translator-stop-preview-retention-contract.mjs`, `node scripts/comment-translator-ui-live-provider-runtime-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `git diff --check`, changed-files high-confidence secret scan (`changed_files=11`, `secret_scan_matches=0`), and changed TS/TSX type-excuse scan (`checked_files=7`, `matches=0`).
- Browser/width verification for this slice used local dev server plus Chrome DevTools MCP at `390 / 820 / 1024 / 1280 / 1366px` for `/tools/comment-translator`, `/admin/comment-translator`, and `/admin/comment-translator/creator-waitlist`. All 15 route/width checks passed with `scrollWidth == innerWidth`, local unauth/admin-denied state did not render the admin shortcut, tool private gate marker was present, admin dashboard/waitlist gated markers were present, waitlist back link was present, and no owner/internal id, provider-private identifier, token, Authorization header, browser storage payload, or raw response labels were found in rendered text. Authenticated allowlisted-admin browser state and the allowed dashboard planned-card view were unavailable locally and remain deterministic-contract covered. Console output contained only Next dev HMR WebSocket handshake noise.
- Creator waitlist admin + public UI trim local verification completed in `codex/comment-translator-creator-waitlist-admin-ui`: PR #589 merge was confirmed first (`merged`, merge commit contained in `origin/codex/comment-translator-free-public-beta-integration`), the branch was created from the integration base, and the worktree was clean before edits. Implementation removes normal-public Manual/Paste input and bottom details/test-input UI, keeps normal translation settings, adds server-owned Creator pre-registration with duplicate prevention for campaign `creator_closed_beta_2026` and discount intent `first_month_discount`, adds service-role-only durable table migration, adds a hash-allowlisted admin waitlist page, and keeps route/API harness waitlist access read-only/non-mutating. Public-release capable: no. Remote migration apply: not-run. Stripe/live/provider/deploy/public gate actions: not-run.
- Creator waitlist admin + public UI trim deterministic verification passed: `node scripts/comment-translator-creator-waitlist-admin-contract.mjs`, `node scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs`, `node scripts/comment-translator-public-ui-cleanup-contract.mjs`, `node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs`, `node scripts/comment-translator-public-operator-session-ui-contract.mjs`, `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`, `node scripts/comment-translator-public-preview-feed-ux-contract.mjs`, `node scripts/comment-translator-stop-preview-retention-contract.mjs`, `node scripts/comment-translator-ui-live-provider-runtime-contract.mjs`, `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan (`changed_files=20`, `secret_scan_matches=0`).
- Browser/width verification for this slice used local dev server plus fresh Chrome DevTools Protocol screenshots at `390 / 820 / 1024 / 1280 / 1366px` for `/tools/comment-translator` and `/admin/comment-translator/creator-waitlist`. Local authenticated allowed-tester/admin state was unavailable, so browser-visible normal UI reached the private-gate fallback and admin reached the denied/gated surface only; authenticated waitlist states, duplicate prevention, admin allowlist behavior, and admin list rows are deterministic-contract covered. CDP metrics passed with `scrollWidth == innerWidth` at every checked width, private/admin gate markers present as expected, and no forbidden manual/details text or private id/provider/token labels in rendered text. Independent visual subagent review was not run because the active multi-agent tool policy requires explicit user subagent permission.
- Public UI cleanup local verification passed in `codex/comment-translator-public-ui-cleanup`: normal public rendering now hides internal skipped rows/diagnostics, uses localized reused/new translation badge copy instead of raw cache wording, consolidates Free beta usage/status into one right-side authoritative panel, moves retention/source attribution into details, and reduces F14 Creator locked cards / waitlist / click tracking to one compact Creator closed beta panel. The new public UI cleanup contract plus public operator session UI, public preview feed UX, real comments UI wiring, Stop preview retention, preview author display-name, UI live provider runtime, Free beta usage display, Creator locked waitlist, and PL-G3 feed bridge/session persistence contracts passed. `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan passed with `count=0`.
- Width verification for local private-gate fallback passed at `390 / 820 / 1024 / 1280 / 1366px`: private launch fallback visible, normal operator dock not available without authenticated allowed-tester state, horizontal overflow was 0, offscreen element count was 0, dev overlay was closed, and console error/warning count was 0. Authenticated allowed-tester browser-visible cleanup behavior was not run locally; operator UI cleanup, Stop/Clear retention, author display, source/target controls, and filtering behavior are deterministic-contract covered only.
- Preview author display name browser follow-up local verification passed in `codex/comment-translator-preview-author-display-name-fix`: root cause was the trusted YouTube live provider runtime adapter mapping `authorDetails.displayName` but not requesting the `authorDetails` part/field from `liveChatMessages.list`, so real browser rows fell back to the generic viewer label. The fix requests only `authorDetails(displayName)` and keeps channel id, author URL, profile image URL, provider target metadata, liveChatId, owner id, raw provider payloads, raw comments, tokens, cookies, and browser storage payloads out of browser-readable output and task notes. Red-to-green coverage was added to the UI live provider runtime contract, and related author-display/feed/session/usage/provider contracts, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, changed-files high-confidence secret scan, and type-suppression scan passed. No UI/CSS/rendered layout changed in this follow-up, so width checks at `390 / 820 / 1024 / 1280 / 1366px` were skipped. Authenticated allowed-tester live/provider browser confirmation was not run because live/provider execution, OAuth live flow, deploy/upload, migration, Stripe action, public gate flip, moderation controls, and OBS Dock behavior are out of scope/approval-gated for this slice.
- Preview author display name local verification passed in `codex/comment-translator-preview-author-display-name`: safe `authorDisplayName` now flows from YouTube provider-safe comment payload / runtime sanitization through normalized/browser-safe rows and server-owned feed rows into the operator preview, with generic viewer fallback when blank. The new deterministic contract and updated normalization, real-comments UI wiring, UI live provider runtime, YouTube input/runtime/intake/API adapter, PL-G3 feed bridge/session persistence, public preview feed UX, Stop preview retention, and public operator session UI contracts passed. `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, changed-files high-confidence secret scan, and type-suppression scan passed.
- Width verification for local private-gate fallback passed at `390 / 820 / 1024 / 1280 / 1366px`: private gate visible, no horizontal overflow, no framework overlay, and console error/warning counts were 0. Authenticated allowed-tester state was unavailable locally, so browser-visible author-display rows are deterministic-contract covered only.
- Stop preview retention local verification passed in `codex/comment-translator-stop-preview-retention`: new `comment-translator-stop-preview-retention-contract` covered Stop retaining server-owned safe feed rows, manual Clear preview clearing through the safe feed boundary without provider/polling/target-lookup/translation/quota-accounting work, stopped previous-results UI, and active Start clearing retained rows before new session/feed results. Existing session start/stop, public operator session UI, UI live provider runtime, real comments UI wiring, PL-G3 feed bridge/session persistence, and public preview feed UX contracts passed. `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, TypeScript no-excuse scan, runtime changed-files high-confidence secret scan, and all added-lines high-confidence secret scan passed.
- Width verification for local private-gate fallback passed at `390 / 820 / 1024 / 1280 / 1366px`: page identity OK, private-gate fallback visible, no horizontal overflow, no framework overlay, and console error/warning counts were 0. Authenticated allowed-tester state was unavailable locally, so Stop-retention/Clear browser-visible behavior is deterministic-contract covered only.
- PR #584 `[codex] Skip low-value short reactions before quota` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `4384fb3`; containment was confirmed before this docs/task-board follow-up branch.
- PR #582 `[codex] Exclude cache hits from quota accounting` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `fd032b2`; containment was confirmed before this JA->EN follow-up branch.
- Short-reaction / punctuation-only normalization local verification passed for this implementation slice: new `comment-translator-short-reaction-filter-contract` covers low-value short reaction skip before provider handoff, short meaningful question/request/warning eligibility, punctuation-only policy dedupe, same-batch provider-request dedupe, and cross-batch provider cache lookup reuse. `comment-translator-ja-en-source-wiring-contract`, `comment-translator-ui-live-provider-runtime-contract`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan also passed. Legacy Task/F contract scripts with old changed-file allowlists were attempted but rejected the current touched files rather than product behavior.
- Source-language wiring local verification passed for this implementation slice: new `comment-translator-ja-en-source-wiring-contract` covers `JA -> EN` and `KR/CN -> EN`; public operator session UI contract, UI live provider runtime contract, `npm run lint`, `npx tsc --noEmit`, and `npm run build` also passed. `real-comments-ui-wiring`, `session-start-stop`, and F10 translation execution legacy contracts were attempted but their old changed-file allowlists rejected unrelated/current-branch files (`.codegraph/.gitignore` or the new source-wiring contract), so they were not used as final verifiers for this slice.
- Width verification: UI layout/CSS/rendered text did not change; only action wiring and backend source-language propagation changed, so `390 / 820 / 1024 / 1280 / 1366px` visual checks were skipped.
- PR #577 `[codex] Retain pre-public diagnostics counts` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `f60e197`.
- PR #578 `[codex] Document pre-step5 public launch board` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `ccd6cf6`; containment was confirmed before this slice.
- PR #579 `[codex] Harden pre-step5 quota session P0` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `af28255`; containment was confirmed before this follow-up branch.
- PR #580 `[codex] Harden feed hydrate usage ledger follow-up` is merged into `origin/codex/comment-translator-free-public-beta-integration` as `b90f9f5`; containment was confirmed before this cache-hit quota follow-up branch.
- PR #580 cache-hit quota accounting local verification passed for the implementation slice: Azure F10 normal translation execution contract, provider execution runtime contract, usage quota/budget ledger, durable usage counter schema adapter, Free beta usage display, real comments UI wiring, PL-G3 feed bridge/session persistence, public operator session UI, UI live provider runtime, session start/stop, bounded live chat polling wiring, public preview feed UX, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan. F7 bounded `liveChatMessages.list` polling wiring is unchanged. Width checks skipped because this slice has no UI/CSS/rendered route/visible layout change.
- PR #579 follow-up local verification passed for the implementation slice: active-session persisted-feed hydrate contract, Azure F10 durable usage write/snapshot contract, PL-G3 feed bridge/session persistence, real comments UI wiring, usage quota/budget ledger, durable usage counter schema adapter, Free beta usage display, session start/stop, UI live provider runtime, PL-G3 completion contract, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan.
- Pre-Step 5 P0 quota/session hardening local verification passed: active-session mount restore/status-provider non-execution contract, per-minute provider preflight cap, monthly character provider preflight cap, durable usage/session/feed contracts, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and changed-files high-confidence secret scan.
- Width verification for local private-gate fallback passed at `390 / 820 / 1024 / 1280 / 1366px`: page identity OK, no horizontal overflow, no framework overlay, no relevant console errors/warnings. Authenticated allowed-tester state was unavailable locally, so active-session visual restore is contract-covered only.
- Browser-visible preview retest after PR #577 merge confirmed Start-before exclusion, Start-after feed display, newest-first ordering, JST timestamp display, cache miss for new text, cache hit/cached for repeated text, non-zero diagnostics retention, and Stop.
- Preview custom deployed smoke was performed at `https://preview.streamer-tools.kuro-lab.com/tools/comment-translator/` with a Cloud Console allowed YouTube account and passed for connection, comment retrieval, translation, cache behavior, diagnostics, timezone display, and Stop.
- Final main production domain is `https://streamer-tools.kuro-lab.com`; no main promotion, public access change, production domain cutover, deploy/upload, remote mutation, migration, Stripe action, or public gate flip was run in this cleanup slice.
- Raw stdout/stderr, raw response bodies, secrets, tokens, cookies, OAuth values, Authorization headers, provider target metadata, liveChatId, owner/session identifiers, raw comments, raw provider payloads, browser storage payloads, URL query values, handoff payloads, quota values, raw provider error bodies/messages/reasons, provider target values, and screenshots containing raw comments must not be recorded in docs.

## Current Blockers / Residual Risks

- Supabase DB/Auth/RLS audit residuals: no local current-table P0 RLS disablement was found. Browser-safe account session view model work removes internal account id from account/portal client props while keeping server-only account identifiers available for authorization and ownership decisions. The local future public-table default privilege guard now exists as a reviewable migration proposal and deterministic contract; remote migration apply remains approval-gated and not-run, and any non-`postgres` remote object owner would need an equivalent approved default-privileges block. Remote read-only Supabase posture check remains unchecked until CLI/MCP link/auth is safely available and approved for metadata/advisor reads only.
- Portal sidebar navigation resilience browser-visible allowlisted-admin state was not available locally; admin shortcut visibility for allowlisted admins, normal-user/unauthenticated hidden state, `/admin` gate, `/admin/comment-translator` gate, and waitlist hierarchy are deterministic-contract covered. No future favorites/recent/pinned tools, rate-limit unblock/reset action, admin mutation endpoint/server action, deploy/upload, remote migration apply, live/provider execution, OAuth live flow, Stripe action, Google target lookup, public gate flip, OBS behavior, or moderation control was run or implemented in this slice.
- Comment Translator admin shortcut + dashboard shell browser-visible allowlisted-admin state was not available locally; admin shortcut visibility for allowlisted admins, normal-user hidden state, dashboard gate, and disabled/planned rate-limit entry are deterministic-contract covered. No rate-limit unblock/reset action, admin mutation endpoint/server action, deploy/upload, remote migration apply, live/provider execution, OAuth live flow, Stripe action, Google target lookup, public gate flip, OBS behavior, or moderation control was run or implemented in this slice.
- Public-release capable remains `no` until pre-Step 5 hardening is resolved or explicitly accepted, PL-G5 release-owner approval is recorded, and PL-G6 public access change is separately approved and executed.
- Normal public UI no longer renders the pre-public diagnostics surface. Server/action diagnostics remain sanitized and contract-covered for internal evidence paths, but deployed/browser confirmation was not run in this cleanup slice.
- Authenticated allowed-tester browser-visible normal operator UI was not run locally; local browser coverage is private-gate fallback only. Live/provider execution, OAuth live flow, deployed/browser confirmation, deploy/upload, migration, Stripe action, public gate flip, OBS Dock behavior, moderation action controls, and paid/Creator activation were not run or changed in this slice.
- Active-session reload, Stop-retention/Clear, author display, source/target controls, and translation filtering browser-visible operator behavior remain deterministic-contract covered only until an approved same-thread allowed-tester browser retry.
- Live provider execution and deployed/browser confirmation were not run for the short-reaction / punctuation-only normalization slice. Browser testing should use selected source-language pairs and include low-value short reactions, short meaningful comments, and punctuation-only repeats with sanitized observation only.
- Live provider execution and deployed/browser confirmation were not run in this cache-hit quota follow-up. Cache-hit quota accounting is deterministic-contract covered only until an approved same-thread live retry confirms it against deployed state.
- `comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs` and PL-G4 deployed-smoke contract still contain older evidence-shape assertions and were not used as final verifiers for this cache-hit quota slice.
- Existing connected YouTube credentials created before sealed token material persistence may contain irreversible reference-only material. Those rows must fail closed with sanitized unavailable/reconnect-required behavior until reconnect.
- Production/main domain launch remains unexecuted and approval-gated.

## Account Limits / Entitlement Control

- Per-account judgment is server-owned: authenticated caller authorization binds work to the owner account, and browser-readable output must not expose owner ids, provider channel ids, provider target metadata, liveChatId, OAuth values, tokens, or billing identifiers.
- Free public beta limit authority is the Free entitlement baseline plus durable usage/session state.
- Current Free caps: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month.
- Enforcement happens before Start, while the session is active, during status/heartbeat/feed usage checks, and before provider translation execution.
- If durable usage/session state is unavailable or unreadable, the safe behavior is fail closed with sanitized stop/status output.
- Free beta usage accounting uses a fixed UTC quota day for enforcement and ledger accounting. UI timestamp display can use local/JST preference, but quota/rate-limit reset authority stays UTC until an explicitly approved policy change.
- Paid access after C1/C3 should be controlled by signed Stripe webhook evidence, durable paid entitlement rows, paid usage counters, monthly reset state, and server-owned fallback/stop reasons.

## Approval-Gated Actions

Do not perform the following without same-thread ready preflight, sanitized output review, and exact explicit approval:

- Google OAuth live connect execution.
- YouTube OAuth live connect execution.
- live authorization code exchange.
- live token persistence smoke.
- provider target lookup.
- liveChatId lookup / live target lookup.
- session start smoke.
- real `liveChatMessages.list`.
- translation provider API execution.
- live/provider execution.
- deploy/upload.
- production/custom deployed smoke.
- remote mutation.
- remote schema migration / Supabase migration apply.
- Stripe live-mode action.
- Product/Price creation.
- Checkout execution.
- Customer Portal redirect.
- webhook registration.
- billing setting mutation.
- public launch gate flip.
- promotion to `main`.

## Canonical Documents

- Free beta final QA/readiness: `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- Free beta public usability preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- Free beta PL-G1 remote durable enforcement execution evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`
- Free beta PL-G2K approved allowed-tester route/API harness smoke execution: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2K_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2J.md`
- Free beta PL-G3 Start-to-translation smoke completion after PL-G2K: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md`
- Free beta PL-G4 production/custom deployed smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md`
- Free beta PL-G5 public launch gate decision evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`
- Public beta gap audit: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- Public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`
- Future design/decision log: `docs/future/COMMENT_TRANSLATOR_API_INTEGRATION_LIMITS.md`

## Initial Release Decisions

These decisions are fixed for the current public-release roadmap unless the user explicitly changes them:

- Free public beta ships before Creator public paid launch.
- Creator price intent can be shown during Free public beta as locked/waitlist UI, but paid access starts with closed beta.
- Free plan starts conservatively. Treat `20,000 characters/month` as an added monthly character cap on top of existing time/per-minute caps, not a replacement for `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`.
- Source languages: initial selectable source languages are JA / EN / KR / CN.
- Target languages: initial selectable target languages include JA / EN.
- Source and target cannot be the same. UI and server validation must reject same-language pairs.
- Provider scope: YouTube ships first; Twitch remains future unless explicitly pulled into public-release scope.
- YouTube connection alone must not start background monitoring, polling, translation, or quota use.
- Raw text logging: disabled by default; diagnostics are short-lived and sanitized.
- Account path: `/account/integrations` is the preferred provider settings entry; `/tools/comment-translator` should also show a direct integration CTA when YouTube is not connected.
- Translation provider policy: Free routes to Azure Translator primary; Creator/Paid routes to OpenAI mini primary with Azure Translator as recoverable-error fallback unless later provider policy changes.
- `liveChatMessages.list` is acceptable for Free MVP when bounded by `pollingIntervalMillis`, server-only cursor/liveChatId handling, session limits, and quota/budget stop. `streamList` is Public-after-P1 primary migration work.
- Public UI must not expose liveChatId entry. Any debug/manual target path must be isolated from public build and gated.
- MVP should not persist author channel id, author channel URL, or author profile image URL. If BAN-event historical updates require an author key, use a short-lived server-only/session-scoped hash design or defer past-comment bulk updates to P1.

## Later Work / Post-MVP Roadmap

Keep this visible so public-launch cleanup does not erase the next roadmap, but do not treat these items as Step 5 blockers unless explicitly pulled into release scope.

### Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | pending |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |
| C3 | Paid usage and monthly reset | pending |
| C4 | AI natural translation provider route | pending / gated |
| C5 | OBS overlay token runtime | pending |
| C6 | OBS overlay UI route | pending |
| C7 | Moderator share token runtime | pending |
| C8 | Moderator share UI route | pending |
| C9 | Custom dictionary minimum | pending |
| C10 | Priority display polish | pending |
| C11 | Simple 7-day history | pending |
| C12 | Creator closed beta final QA | pending |

### Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | pending |
| CP2 | Creator public paid gate flip | pending / gated |

### Public-after-P1 / Post-MVP

| ID | Task | Status |
| --- | --- | --- |
| P1-1 | `streamList` primary migration | later |
| P1-2 | 30-day history and search | later |
| P1-3 | CSV export | later |
| P1-4 | Overlay templates | later |
| P1-5 | Dictionary import and suggestions | later |
| P1-6 | AI operations helpers | later |
| P1-7 | Provider comparisons | later |
| P1-8 | Platform expansion | later |
| P1-9 | Voice translation / subtitle work | later |

## Verification Baseline

- Docs/task-board only:
  - targeted markdown/content inspection
  - changed-files no-secret scan
  - `git diff --check`
- Runtime or code changes:
  - relevant contract script(s)
  - changed-files no-secret scan
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `git diff --check`
- UI changes:
  - relevant UI/action contract(s)
  - width checks at `390 / 820 / 1024 / 1280 / 1366px`
- Live/provider execution:
  - same-thread / operator-local same-command-process ready preflight
  - sanitized output review
  - explicit in-thread approval
  - sanitized evidence only

## Contract Compatibility Anchors

- Keep `import "server-only";` on server-only translator / YouTube runtime boundaries.
- Keep provider requests input-source independent unless the current task explicitly scopes the bridge.
- Keep token values out of client components, docs, fixtures, PR bodies, browser storage, and command output.
- Treat credential status and provider target metadata as sanitized metadata only.
- Do not overclaim readiness-only or token-resolution-only evidence as live/provider execution.
- Do not add quota write, billing integration, remote Supabase mutation/migration, browser storage expansion, or handoff payload expansion unless the current roadmap task explicitly scopes it.
