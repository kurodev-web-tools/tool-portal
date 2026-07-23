# Comment Translator Creator Closed Beta Task Board

## Authority And Current State

- Free public beta is complete.
- Current priority: P0 Creator closed beta.
- C1-C7 are merged / integration verified; C8 focused route/browser-capability contract is locally verified, while commit / push / PR remain approval-gated.
- C1 is merged through PR #668 at exact integration commit `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; its merge tree matches C1 head `baf8bf57dd570c3dca6bc29c880f47b7f7444fac`.
- C3 is merged through PR #669 at exact integration commit `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; its merge tree matches and contains C3 head `85fa39896f63e223463a85000eb8e02f538754d4`.
- C2 is merged through PR #670 at exact integration commit `4486c180f68369d6620b9f8f3df33518b7cadc38`; its merge tree matches C2 head `761f503f276a5a7e095c79be5f3ca31c26fe6fff`.
- C4 is merged through PR #671 at exact integration commit `fa0d5582a296c2164bd3945c37cbec746315f357`; C4 head `5be49c1995f484145e5989384f0bfd36bbcbe1bb` is contained in integration and both trees are `414ad101c5bdaa56fe205a967a3e63bbb1e5f1b9`.
- C5 is merged through PR #672 at exact integration commit `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; C5 head `609786cca868c976bf33ee197fe069cf22b9ec40` is contained in integration and both trees are `2c5c762a99ac85343f1521c13aec81ede6a661f1`.
- C6 is merged through PR #673 at exact integration commit `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; C6 head `60729f844b099d687e8c28ae794d38398d5a31ad` is contained in integration and both trees are `9090e9af7d2f20a1258eca5e2840895cb7e35c8b`.
- C7 is merged through PR #674 at exact integration commit `0307b5542c8ac9957370533228ec02893bd48c27`; C7 head `23369de66fe75d4068c923334b09712ef0bd9831` is contained as the second merge parent.
- C2 live activation, C4 live provider execution, and C5/C6/C7/C8 remote migration apply remain separately approval-gated.
- C6 authenticated safe-feed rendering and C8 browser rendering remain unchecked. C8 has a local read-only implementation and focused contract; C9 through C11 remain later capability slices and C12 is the ending final-QA gate.
- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.
- PRs target `codex/comment-translator-free-public-beta-integration` from short-lived feature branches.

## C1 Acceptance Boundary

C1 is accepted only when all of the following are verified:

- Durable, server-owned paid entitlement rows are authoritative for access decisions.
- Signed billing evidence is the only accepted billing-state input.
- Browser-readable and operator-visible output is sanitized and contains no secrets, private identifiers, provider metadata, credentials, or billing identifiers.
- Missing, unreadable, incomplete, or inactive entitlement state fails safely to Free / paid-inactive.

- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.

### Verified C1 Merge Evidence

- `comment_translator_creator_c1_paid_entitlement_store_contract=pass` verifies signed-evidence-only persistence, durable reads, atomic stale/replay rejection, unexpected-price rejection, sanitized webhook output, and Free / paid-inactive fallback.
- The server-owned store targets `comment_translator_paid_entitlements` through the existing trusted service-role boundary; anon and authenticated table access are revoked in the local migration.
- Billing access reads no longer use process-local paid entitlement state. Missing store configuration, unreadable rows, incomplete active evidence, inactive state, and expired active periods do not activate Paid.
- Browser-readable billing state omits billing references and provider metadata; webhook output is limited to sanitized status, plan, billing state, or reason labels.
- PR #668 is merged into `codex/comment-translator-free-public-beta-integration` at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; the focused C1 entitlement contract and Creator authority contract were verified at that integration state.

## C3 Acceptance Boundary

- Paid usage is entered only through the server-derived billing-user reference and a readable C1 `paid-active` entitlement derived from signed Stripe webhook evidence.
- A trusted trigger creates the zero counter and resets it only when signed entitlement evidence advances `current_period_end`; repeated evidence for the same period preserves usage and an older period cannot roll the counter back.
- The trusted RPC rechecks paid-active state and the exact signed period, serializes the counter row, and deduplicates a private server-derived usage-event reference before incrementing.
- C3 counts only already-established provider-executed translated-message, provider-input-character, and estimated-cost fields. It does not invent a paid quota amount, reset day, timezone, plan interval, token multiplier, or provider charging rule.
- Missing, unreadable, incomplete, expired, paid-inactive, stale-period, or missing-counter state fails closed to a sanitized Free / paid-inactive result.
- Browser / operator output contains counts and status labels only; owner ids, billing identifiers, provider metadata, credentials, raw payloads, event references, and private reset/counter keys remain server-only.

### Verified C3 Merge Evidence

- `comment_translator_creator_c3_paid_usage_counter_contract=pass` verifies concurrent duplicate counting exactly once, signed-period rollover to zero, old/future timestamp rejection, entitlement downgrade, incomplete/unreadable entitlement and usage state, missing-counter fail-closed behavior, and sanitized output.
- The local migration defines service-role-only `comment_translator_paid_usage_counters` and private deduplication events plus an entitlement-triggered reset and entitlement-gated atomic RPC.
- PR #669 is merged into `codex/comment-translator-free-public-beta-integration` at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; the integration tree matches C3 head `85fa39896f63e223463a85000eb8e02f538754d4`, and the focused C3 and Creator authority contracts pass at that merged tree.
- No UI files changed, so browser / width QA is not applicable to C3.

## C2 Acceptance Boundary

- Checkout and Customer Portal entry require an authenticated account, the existing server-owned SHA-256 owner allowlist, and the exact C2 billing activation marker. Direct calls recheck this boundary before a Stripe adapter is invoked.
- Checkout first requires a readable C1 durable ownership store, rejects an existing Customer mapping in favor of Portal, then selects only the server-configured private Price reference and binds the authenticated account to a server-derived billing-user reference. Browser input, query parameters, client storage, or raw owner ids do not select billing identifiers or create duplicate subscription entry.
- Portal resolves its Customer reference only through the authenticated caller's C1 durable entitlement record. Missing, unreadable, incomplete, or unconfigured records do not invoke Stripe.
- C1 entitlement reads and C3 usage reads recheck the same activation and owner allowlist. Disabling activation or removing the owner from the allowlist immediately suppresses an otherwise active durable row to sanitized Free / paid-inactive behavior without resetting or rewriting C3 counters.
- Webhook processing requires the exact C2 activation marker, configured private Price reference, Stripe signature verification, supported subscription event shape, and C1 durable persistence. Duplicate or older signed evidence is ignored by the atomic C1 stale/replay boundary.
- Only signed active subscription evidence with a future signed period end may activate Paid. Trialing remains paid-inactive unless a separate exact server-owned policy marker is reviewed; failed, canceled, expired, incomplete, unreadable, mismatched, or unconfigured state degrades to Free / paid-inactive.
- Client/operator metadata responses and verification evidence contain sanitized status, reason, plan, billing state, or missing environment reference names only. A separately approved live server action may consume a Stripe redirect target solely to perform the redirect; the URL is never logged, serialized as evidence, placed in docs/PR/handoff text, or exposed as billing authority. No owner, Customer, Subscription, Price, event, payload, secret, credential, provider, target, or private URL value is recorded.

### Verified C2 Merge Evidence

- `comment_translator_creator_c2_stripe_closed_beta_gate_contract=pass` verifies authenticated owner binding, allowlist denial before Stripe invocation, exact activation fail-closed behavior across Checkout/Portal/C1/C3 reads, unreadable ownership and duplicate-Customer Checkout denial, server-configured Checkout Price selection, C1-owned Portal Customer resolution, missing-signature rejection, signed active entitlement, duplicate/stale replay rejection, missing/unexpected Price rejection, unapproved trial fail-closed behavior, and sanitized output.
- Existing Checkout/Portal server actions and the webhook route remain the surface owners; no new client storage, query authority, public gate, or browser-visible billing identifier was added.
- No Stripe Product/Price mutation, live Checkout/Portal execution, webhook registration/delivery/replay, billing mutation, Supabase remote operation, deploy, Cloudflare change, provider execution, or activation was run.
- The browser-safe view-model contract verifies Checkout/Portal remain disabled while C2 activation is closed. No UI/CSS/rendered layout file changed, so width-based layout QA is not applicable; no real Checkout/Portal browser execution was run.
- PR #670 is merged into `codex/comment-translator-free-public-beta-integration` at `4486c180f68369d6620b9f8f3df33518b7cadc38`; C2 head `761f503f276a5a7e095c79be5f3ca31c26fe6fff` is contained in integration and both commits resolve to tree `176e7ec82d054552408333d4fe55f7645a58a169`.

## C4 Acceptance Boundary

- Paid provider execution requires an authenticated caller, the exact C2 activation marker and owner-hash allowlist, a readable C1 signed active entitlement bound to that caller, a readable C3 current-period counter, and complete server-owned provider/budget configuration.
- Missing, unreadable, incomplete, expired, mismatched, paid-inactive, stale-period, unconfigured, provider-unavailable, or over-budget state returns a sanitized fail-closed result before a paid provider is invoked.
- Paid routes to the environment-selected OpenAI mini provider first. Azure fallback is available only when Azure credentials, endpoint, region, and character cap are configured and the current C3 counter remains within budget capacity.
- Only OpenAI timeout, rate-limit, and temporary-unavailable classes may retry or fall back. Content-policy and strict-output-parse failures do not retry or fall back.
- Provider-executed translations are recorded through the C3 server-only atomic/deduplicated boundary. Cache hits are not counted as provider execution, and an accounting failure suppresses the translated result.
- Returned C4 state omits caller/owner ids, billing ids, C3 event ids, provider/model/config values, raw comments, prompts, responses, provider metadata, target metadata, liveChatId, private URLs, and private authority references.

### Verified C4 Merge Evidence

- `comment_translator_creator_c4_paid_provider_authority_contract=pass` verifies auth, C2 activation/allowlist, C1 missing/unreadable/expired/mismatched state, C3 missing/unreadable/stale state, provider-selection/configuration, server budget flags, and hard-budget stop all prevent paid provider invocation.
- `comment_translator_creator_c4_paid_provider_route_contract=pass` verifies OpenAI-first Paid execution, strict structured-output parsing, Azure fallback for approved recoverable classes only, no fallback for content/policy/parse classes, C3 recorded/ignored-replay exactly-once behavior, missing-Azure safe degradation, and sanitized result shape.
- `comment_translator_creator_c3_paid_usage_counter_contract=pass` remains green after adding explicit C1 billing-user-reference binding to the shared C3 authority read.
- No OpenAI, Azure, YouTube, Stripe, Supabase remote, Cloudflare, deploy, production/custom-domain, OAuth, target lookup, or browser execution was run. No UI file changed, so browser/width QA is not applicable.
- PR #671 is merged into `codex/comment-translator-free-public-beta-integration` at `fa0d5582a296c2164bd3945c37cbec746315f357`; C4 head `5be49c1995f484145e5989384f0bfd36bbcbe1bb` is contained in integration and both commits resolve to tree `414ad101c5bdaa56fe205a967a3e63bbb1e5f1b9`.

## C5 Acceptance Boundary

- Issue, read, rotate, and revoke require an authenticated caller and resolve owner authority only from the trusted server caller boundary. Browser input never selects an owner, session, scope, expiry, or revocation state.
- Validation accepts only the opaque token as untrusted input, hashes it before lookup, resolves the private owner/session binding from the service-role-only record, and rechecks the current authoritative translator session before granting read-only overlay scope.
- Tokens are cryptographically strong opaque 32-byte values. Only a SHA-256 digest is persisted; plaintext is returned only once by authenticated issue or rotate and is absent from reads, storage RPCs, logs, docs, fixtures, errors, and evidence.
- One current token exists per owner and `obs-overlay-read` scope. Duplicate issue fails closed, rotate atomically replaces the digest and invalidates the prior token, revoke invalidates the current token, and a later authenticated issue is allowed after revocation or expiry.
- Expiry is derived from the authoritative server-owned session expiry. Missing/unreadable storage, missing/replaced/expired sessions, malformed/missing tokens, expired/revoked tokens, and owner/session mismatches fail closed with sanitized states.
- C5 adds no browser route, URL, UI, CSS, client storage, Cloudflare configuration, or public API. C6 remains the separate browser-visible overlay route.

### Verified C5 Merge Evidence

- `comment translator creator C5 OBS overlay token runtime contract passed` verifies authenticated issue/read/rotate/revoke, owner and authoritative-session binding, malformed/missing/unreadable/unconfigured fail-closed behavior, expiry, rotation/revocation, previous-token replay rejection, digest-only persistence, and sanitized result shapes.
- `comment translator creator C5 OBS overlay token durable store contract passed` verifies missing service-role configuration fail-closed behavior, digest-only RPC persistence, service-role-only schema policy, and atomic current-token migration semantics.
- The local migration defines service-role-only `comment_translator_obs_overlay_tokens`, a session foreign key, one current owner/scope row, a unique digest, RLS, revoked anon/authenticated access, and atomic write/revoke functions. Remote migration apply was not run.
- The runtime exposes only read-only `obs-overlay-read` capability metadata. Owner ids, session references, digests, provider/billing metadata, liveChatId, raw comments, private URLs, and other private authority references are never returned.
- No browser-visible file changed, so width/browser QA is not applicable. No live token, provider, Stripe, Supabase remote, Cloudflare, deploy, production/custom-domain, OAuth, target lookup, or browser operation was run.
- PR #672 is merged into `codex/comment-translator-free-public-beta-integration` at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; C5 head `609786cca868c976bf33ee197fe069cf22b9ec40` is contained in integration and both commits resolve to tree `2c5c762a99ac85343f1521c13aec81ede6a661f1`.

## C6 Acceptance Boundary

- C5 remains the sole token-validation authority. C6 accepts the opaque C5 token only in a POST body, redeems it server-side into a separate HttpOnly browser capability, and redirects to a stable route that contains no credential in its path, query, or fragment.
- Only the browser capability SHA-256 digest is persisted in a service-role-only store. The plaintext C5 token is not persisted, logged, documented, placed in browser storage, or exposed in errors or evidence.
- Every overlay read resolves the browser capability server-side and rechecks the C5 current token version, authoritative session binding, expiry, and revocation. Missing, malformed, rotated, revoked, expired, mismatched, unreadable, or unconfigured state renders a sanitized unavailable view.
- The route reads only the existing server-owned safe feed. It does not query providers, start or mutate sessions, mutate comments, expose raw/private feed fields, execute translation, or make browser state authoritative.
- The transparent overlay projects translated text with the established generic stream-safe display-name policy, existing safe role badges and priority metadata, existing Super Chat purchase labels, sanitized original text through an optional disclosure, and source attribution.

### Verified C6 Merge And Integration Evidence

- `comment translator creator C6 OBS overlay route contract passed` verifies POST-only redemption, stable no-token URL handling, digest-only browser-session persistence, C5-backed authorization on every read, rotation/revocation/replay rejection, sanitized unavailable output, safe display names, role/priority/Super Chat projection, original-text disclosure, source attribution, and service-role-only schema policy.
- Focused C5 runtime and durable-store contracts remain green after the private server-only authorization seam was added. The existing browser-safe public C5 validation result remains sanitized.
- The local C6 migration defines service-role-only `comment_translator_obs_overlay_browser_sessions`, a unique capability digest, one current row per owner, RLS, and revoked anon/authenticated access. Remote migration apply was not run.
- An explicitly approved `npm ci` restored locked dependencies. Changed-file ESLint passes, and the production build compiles before the repository-wide TypeScript phase stops on pre-existing C1/C3 Supabase structural-type errors; C6 and directly consumed C5 store type errors were resolved without weakening their contracts.
- The actual local route returned a sanitized fail-closed view at 1280x720 and 1920x1080. Both canvases verified transparent computed `html`/`body` backgrounds, no horizontal overflow, an empty password credential input, stable URL with no credential, empty local/session storage, no token/private identifier material in visible DOM or screenshots, and no browser console warning/error.
- Authenticated safe-feed rendering remains unchecked because the local C5/C6 migrations were not applied and no real token/session/feed operation was authorized. This check may follow the approved PR merge and separately approved environment readiness.
- PR #673 is merged into `codex/comment-translator-free-public-beta-integration` at `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; C6 head `60729f844b099d687e8c28ae794d38398d5a31ad` is contained in integration and both commits resolve to tree `9090e9af7d2f20a1258eca5e2840895cb7e35c8b`.

## C7 Acceptance Boundary

- Issue, sanitized metadata read, and revoke require an authenticated creator caller. Owner authority is accepted only from the server-derived caller; browser/operator input cannot select owner, session, scope, expiry, or revocation state.
- Validation accepts only an opaque token as untrusted input, hashes it before a C7-only lookup, and rechecks the bound current authoritative translator session and server-owned expiry before granting `moderator-share-read` access.
- Tokens are cryptographically strong opaque 32-byte values. Only a SHA-256 digest is persisted; plaintext is returned once at authenticated issue and is absent from metadata reads, durable RPCs, logs, docs, fixtures, errors, analytics, and evidence.
- One current C7 token exists per owner and C7 scope. Duplicate issue fails closed; reissue is allowed only after revocation or expiry. C7 has no rotation behavior.
- C7 uses its own scope, types, durable table, and RPCs. C5 OBS tokens, C6 browser capabilities, their digests, scopes, or stores cannot validate as C7 moderator share authority.
- The token establishes only a session-scoped read-only capability for a future C8 surface. It does not infer moderator identity, account ownership, recipient email, role assignment, login policy, delivery transport, URL policy, cookie policy, or browser storage authority.
- Missing, malformed, expired, revoked, replayed, owner/session-mismatched, unreadable, or unconfigured token/session/store state fails closed with sanitized results.

### Verified C7 Merge And Integration Evidence

- `comment translator creator C7 moderator share token runtime contract passed` verifies authenticated issue/read/revoke, current-session and expiry binding, digest-only persistence, duplicate rejection, post-revoke reissue, revoked/expired/prior-token replay rejection, owner/session mismatch, cross-token-type rejection, malformed/missing/unreadable/unconfigured fail-closed behavior, and sanitized public result shapes.
- `comment translator creator C7 moderator share token durable store contract passed` verifies missing service-role configuration fail-closed behavior, digest-only issue/revoke RPC persistence, C7-only read filters and table/scope/RPC separation, unreadable-row rejection, and service-role-only local migration policy.
- The local migration defines service-role-only `comment_translator_moderator_share_tokens`, a session foreign key, one current owner/scope row, a unique digest, RLS, revoked anon/authenticated access, and atomic issue/reissue/revoke functions. Concurrent first issue uses conflict-safe insertion followed by locked current-row classification, so one request applies and a duplicate resolves to the sanitized current-token state. Remote migration apply was not run.
- Available C2-C6 focused regressions and the Creator authority contract remain green. Dependency-backed C1/provider/Stripe/session/feed contracts, ESLint, TypeScript, and production build remain unchecked in this worktree because `node_modules` is absent and dependency installation was not approved.
- PR #674 is merged into `codex/comment-translator-free-public-beta-integration` at `0307b5542c8ac9957370533228ec02893bd48c27`; C7 head `23369de66fe75d4068c923334b09712ef0bd9831` is contained as the second merge parent.

## C8 Acceptance Boundary

- The only new API is a POST-only redemption endpoint. It accepts the opaque C7 credential from the request body, never from the path/query/fragment, and redirects to the stable token-free `/tools/comment-translator/moderator/` route.
- Redemption persists only a SHA-256 digest in the separate service-role-only C8 browser-session store and sets a C8-only HttpOnly, Secure, SameSite=Strict cookie. C7 plaintext is never persisted or re-exposed.
- Every moderator-route read revalidates the current C7 token version, authoritative session, expiry, and revocation before reading the existing server-owned safe feed.
- The surface is read-only and browser input is never feed, session, translation, provider, quota, or billing authority. It shows only the existing safe-feed projection and sanitized source attribution.
- Missing, malformed, expired, revoked, replayed, reissued, session-replaced, unreadable, or unconfigured C7/C8/session/store/feed state fails closed to a sanitized unavailable view.
- C8 scope, digest, store, and cookie remain separate from C5 OBS tokens, C6 OBS browser capabilities, and C7 share tokens. The capability conveys no moderator identity, account ownership, recipient, email, or role assignment.

### Verified C8 Local Evidence

- `comment translator creator C8 moderator share route contract passed` verifies POST-only body redemption, stable token-free redirect, C8 cookie policy, digest-only C8 persistence, per-read C7 revalidation, revoke/expiry/reissue/session-replacement replay rejection, C5/C6/C7 cross-token rejection, missing/unreadable state, sanitized unavailable output, safe-feed projection, and service-role-only migration policy.
- `comment translator creator C8 moderator share HTTP transport contract passed` invokes the actual route module and verifies body parsing, 303 token-free redirect, no-store response, success cookie attributes, failure cookie expiry, and absence of non-POST method exports without installing dependencies.
- Focused C7 runtime/store contracts remain green after adding the private server-only authorization seam; the existing public C7 result stays sanitized.
- Node syntax checks pass for changed `.ts` server files. Full ESLint, TypeScript, Next build, and 390/820/1280/1920 browser QA are unavailable in this worktree because `node_modules` is absent and dependency installation was not approved.
- The local C8 migration was reviewed only as repository source. Remote migration apply, production persistence, authenticated/live-token QA, Cloudflare changes, deploy, and activation were not run.

### Residual Risk And Next Handoff

- Remote Supabase query, migration apply, schema mutation, and production data access were not run. Until an explicitly approved migration apply exists, deployed reads safely return Free / paid-inactive.
- Stripe live Product, Price, Checkout, Portal, and webhook operations were not run. Local verifier fixtures are not live billing evidence.
- Local C2 fixtures do not establish live Product/Price interval, billing cadence, trial policy, webhook destination, Customer mapping values, or production configuration; C3 continues to follow only signed period-boundary advances.
- C4 does not infer an OpenAI model, provider pricing/token multiplier, budget amount, billing cadence, or production value. Operator-owned server environment values and provider-account caps remain required before any separately approved live/provider smoke.
- Dependency-backed contracts, ESLint, TypeScript, build, and browser QA remain blocked in this worktree by missing `node_modules`; installation was not approved. Two dependency-free historical contracts also retain known stale task-history/feed-owner assertions and are baseline limitations rather than C8 regressions.
- C5, C6, C7, and C8 remote migration apply and production persistence remain unverified and separately approval-gated. Until reviewed migrations are applied, deployed token/browser-session/share stores remain unavailable and fail closed.
- Next handoff requires separate approval for C8 commit / push / PR. C6/C8 authenticated-feed browser QA remains a separately approved candidate after reviewed migrations and environment readiness.

## Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995` |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | merged / integration verified at `4486c180f68369d6620b9f8f3df33518b7cadc38` |
| C3 | Paid usage and monthly reset | merged / integration verified at `5fc3cca2730a58f35279098ec0b2f5c804ce0076` |
| C4 | AI natural translation provider route | merged / integration verified at `fa0d5582a296c2164bd3945c37cbec746315f357` |
| C5 | OBS overlay token runtime | merged / integration verified at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8` |
| C6 | OBS overlay UI route | merged / integration verified at `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; authenticated feed QA pending / gated |
| C7 | Moderator share token runtime | merged / integration verified at `0307b5542c8ac9957370533228ec02893bd48c27` |
| C8 | Moderator share UI route | local focused contract verified / commit, push, and PR approval pending |
| C9 | Custom dictionary minimum | pending |
| C10 | Priority display polish | pending |
| C11 | Simple 7-day history | pending |
| C12 | Creator closed beta final QA | pending |

## Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | pending |
| CP2 | Creator public paid gate flip | pending / gated |

## Public-after-P1 / Post-MVP

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

## Approval And Scope Boundary

This authority is a task board only. Every gated operation requires a separate, same-thread preflight and explicit approval.

- C1 is merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; remote migration apply remains approval-gated.
- C3 is merged / integration verified through PR #669 at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; remote migration apply remains approval-gated.
- C2 merge / integration verification is complete through PR #670 at `4486c180f68369d6620b9f8f3df33518b7cadc38`; live Stripe action and activation remain approval-gated.
- C4 is merged / integration verified through PR #671 at `fa0d5582a296c2164bd3945c37cbec746315f357`; provider live execution remains approval-gated.
- C5 merge / integration verification is complete through PR #672 at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; remote migration apply remains approval-gated.
- C5/C6/C7/C8 remote migration apply and deployed authenticated-feed browser verification remain approval-gated.
- C8 commit / push / PR, Cloudflare configuration, deploy, activation, and any live token/session operation remain approval-gated.
- Out of scope: Stripe mutation.
- Out of scope: Supabase mutation.
- Out of scope: provider mutation.
- Out of scope: manual deploy.

The following operations are not performed in this task-board authority slice:

- Any Stripe live action, including live Checkout, Customer Portal, or webhook operations.
- Translation-provider execution.
- Any Cloudflare mutation, configuration change, binding change, or environment change.
- Any production gate change, activation, or public release action.

No secrets, private identifiers, provider metadata, or credentials belong in this board, its verification evidence, PR body, or handoff.
