# Comment Translator Creator Closed Beta Task Board

## Authority And Current State

- Free public beta is complete.
- Current priority: P0 Creator public paid launch readiness.
- C1-C11 are merged / integration verified. C12 is merged through PR #679 at exact integration commit `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.
- CP1 local readiness is complete through `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md`; Creator public paid launch readiness remains blocked by approval-gated remote/deployed/billing/provider/browser/release-owner evidence.
- PR #684 is merged at exact current integration tip `dd698bf093615c1741e25b73b37761a68804c45b`; the synthetic-only C1 runtime-role classifier harness is locally verified with fixed 14-field sanitized output. The first actual-authority classification approval is consumed and aborted with `required_count_mismatch`; the corrected trusted-factory handoff classification approval is consumed and passed with the exact two-role server-owned result. The role-aware source discovery is consumed and aborted with `0 endpoint / 0 server-secret / 0 complete source`. The first `same-process-ephemeral` approval is consumed at attempt 0, and the first opaque runner approval is consumed/aborted on input separation. `RETRY-1` is consumed and passed with `1 endpoint / 1 server-secret / 1 complete same-process source`. Its stop-only approval is now consumed and aborted because the one allowed stop result could not be reduced to a permitted termination status; no retry or post-stop status check ran, so process retention is unchecked. Static inspection still confirms the runner has no adapter/read execution control action. The hash-bound stop-result static diagnosis is consumed/pass with zero runner control and classifies the mismatch as `contract-wrapper-drift`; current process state remains unchecked. The contract-expectation remediation design is consumed/pass with one mismatch locus, one proposed contract-only edit, two synthetic fixture requirements, and no artifact change or execution. The contract-only remediation implementation is consumed/aborted after one of two fixture outcomes mismatched; the exact pre-change contract hash was restored. The fixture-result diagnosis is consumed/aborted before verifier execution because the negative fixture identity was ambiguous. The first fixture-pair identity design is consumed/aborted at attempt 0 after local parser syntax failure. RETRY-1 is consumed/aborted on an unreduced nested result envelope; S2Q diagnosis and S2R transient reducer remediation pass, RETRY-2 is consumed/aborted before artifact access on local encoding failure, and the S2T full local driver pipeline preflight passes with `2/2` synthetic fixtures and zero artifact/nested-tool/runner access. RETRY-3 is consumed/aborted before fixture design on `artifact-read-command-failure`; S2V static diagnosis is consumed/aborted as ambiguous with all access/control counts at zero. S2W synthetic command-construction design is consumed/pass with exactly three placeholders, explicit positional binding, one sanitized result-envelope contract, and zero access/execution/control counts. S2X synthetic command execution is consumed/pass with exactly one nested Git Bash command, three inert ASCII positional arguments, one reduced envelope, one sanitized payload, and zero artifact/runner/persistent access. RETRY-4 is consumed/aborted before its driver invocation because explicit artifact-path inputs were unavailable; artifact access, nested command execution, fixture design, and runner control remained zero. S2Z explicit artifact-path positional binding is consumed/pass with exactly three ordered roles, operator-supplied path-source policy, one sanitized result-envelope contract, and zero artifact/nested-command/runner/persistent access. RETRY-5 is consumed/aborted before driver execution because the three private path inputs were absent. S2AB repository-local artifact-path resolution is consumed/aborted after one tracked scripts enumeration with zero content/hash reads and suppressed path output. S2AC basename-predicate cardinality diagnosis is consumed/pass with all three role counts at zero and `all-role-zero-match`; the goal-bound hash-first fixture-identity unit is consumed/aborted before nested Git Bash or artifact access because its local driver script did not parse.
- C1 is merged through PR #668 at exact integration commit `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; its merge tree matches C1 head `baf8bf57dd570c3dca6bc29c880f47b7f7444fac`.
- C3 is merged through PR #669 at exact integration commit `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; its merge tree matches and contains C3 head `85fa39896f63e223463a85000eb8e02f538754d4`.
- C2 is merged through PR #670 at exact integration commit `4486c180f68369d6620b9f8f3df33518b7cadc38`; its merge tree matches C2 head `761f503f276a5a7e095c79be5f3ca31c26fe6fff`.
- C4 is merged through PR #671 at exact integration commit `fa0d5582a296c2164bd3945c37cbec746315f357`; C4 head `5be49c1995f484145e5989384f0bfd36bbcbe1bb` is contained in integration and both trees are `414ad101c5bdaa56fe205a967a3e63bbb1e5f1b9`.
- C5 is merged through PR #672 at exact integration commit `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; C5 head `609786cca868c976bf33ee197fe069cf22b9ec40` is contained in integration and both trees are `2c5c762a99ac85343f1521c13aec81ede6a661f1`.
- C6 is merged through PR #673 at exact integration commit `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; C6 head `60729f844b099d687e8c28ae794d38398d5a31ad` is contained in integration and both trees are `9090e9af7d2f20a1258eca5e2840895cb7e35c8b`.
- C7 is merged through PR #674 at exact integration commit `0307b5542c8ac9957370533228ec02893bd48c27`; C7 head `23369de66fe75d4068c923334b09712ef0bd9831` is contained as the second merge parent.
- C8 is merged through PR #675 at exact integration commit `1ec79ca222149626670ec6692c19356bc56bb2c6`; C8 head `b2bfc5e52ef529a626440334654738a1b4c0e799` is contained as the second merge parent and both trees are `5e06baefd75b8a00010581956953cb6547debff9`.
- C9 is merged through PR #676 at exact integration commit `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; C9 head `10b48d524901c54e4c0402c05709d95bdfe92792` is contained in integration.
- C10 is merged through PR #677 at exact integration commit `c0ac7152687dc0c91470037ec164fda57d7f4259`; C10 head `834284011252782d98139072c7a183c854f9302a` is contained in integration.
- C11 is merged through PR #678 at exact integration commit `d1ce9b0d063f65bac968c85f3242398be4b8317f`; C11 head `4bf598f7fca3f21175de7b3aeda0d001121b376b` is contained in integration.
- C2 live activation, C4 live provider execution, and C5/C6/C7/C8 remote migration apply remain separately approval-gated.
- C6 authenticated safe-feed rendering, C8 browser rendering, and C11 authenticated history rendering remain unchecked and approval-gated. CP1 preserves those gates without treating local, planned, or reference-presence evidence as live proof.
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

### Verified C8 Merge And Integration Evidence

- `comment translator creator C8 moderator share route contract passed` verifies POST-only body redemption, stable token-free redirect, C8 cookie policy, digest-only C8 persistence, per-read C7 revalidation, revoke/expiry/reissue/session-replacement replay rejection, C5/C6/C7 cross-token rejection, missing/unreadable state, sanitized unavailable output, safe-feed projection, and service-role-only migration policy.
- `comment translator creator C8 moderator share HTTP transport contract passed` invokes the actual route module and verifies body parsing, 303 token-free redirect, no-store response, success cookie attributes, failure cookie expiry, and absence of non-POST method exports without installing dependencies.
- Focused C7 runtime/store contracts remain green after adding the private server-only authorization seam; the existing public C7 result stays sanitized.
- Node syntax checks pass for changed `.ts` server files. Full ESLint, TypeScript, Next build, and 390/820/1280/1920 browser QA are unavailable in this worktree because `node_modules` is absent and dependency installation was not approved.
- The local C8 migration was reviewed only as repository source. Remote migration apply, production persistence, authenticated/live-token QA, Cloudflare changes, deploy, and activation were not run.
- PR #675 is merged into `codex/comment-translator-free-public-beta-integration` at `1ec79ca222149626670ec6692c19356bc56bb2c6`; C8 head `b2bfc5e52ef529a626440334654738a1b4c0e799` is its second parent and both commits resolve to tree `5e06baefd75b8a00010581956953cb6547debff9`.

## C9 Acceptance Boundary

- Create, read, update, and delete require an authenticated creator caller. The owner id is accepted only from the server-derived caller authorization and is not present in dictionary input.
- Each owner has at most 30 current entries. Each entry has a validated term, replacement, optional sanitized note, and an explicit source/target language pair limited to source `ja/en/ko/zh`, target `ja/en`, with same-language pairs rejected.
- NFKC/case-normalized term identity plus language scope rejects duplicates and conflicting replacements. Update and delete are owner-scoped and require the current entry timestamp, so missing, cross-owner, or stale writes fail closed.
- Durable rows and CRUD RPCs are service-role-only with RLS, revoked anon/authenticated access, owner filters on every read/mutation, and an atomic per-owner lock around the 30-term and collision boundaries.
- The effective dictionary version is the SHA-256 digest of sorted normalized term/replacement/language-scope content. Note-only edits keep the version; effective create/update/delete changes the version and separates provider cache keys.
- C4 Paid reads the authenticated owner's current durable dictionary before provider execution and passes only language-pair-filtered `glossaryTerms` plus `glossaryVersion` into the existing intake/provider seam. Missing, unreadable, or unconfigured storage fails closed before provider execution.
- CRUD does not execute providers. C9 adds no public/deployed API, UI, client storage, logging, analytics payload, Cloudflare configuration, or live/provider behavior.

### Verified C9 Merge And Integration Evidence

- `comment translator creator C9 custom dictionary runtime contract passed` verifies authenticated owner-only CRUD, owner isolation, 30-term enforcement, bounded term/replacement/note validation, note sanitization, supported language pairs, duplicate/conflict behavior, stale update/delete rejection, deterministic effective versions, and sanitized mutation results.
- `comment translator creator C9 custom dictionary durable store contract passed` verifies missing service-role configuration, owner-filtered reads and RPC params, unreadable-row failure, service-role-only migration policy, per-owner locking, 30-term enforcement, and optimistic update/delete authority.
- `comment translator creator C9 provider and cache integration contract passed` verifies owner-derived glossary injection, no note forwarding, cache reuse for an unchanged dictionary, cache separation after an effective change, and provider suppression for missing/unreadable storage.
- Available dependency-free C2-C9, provider authority/route, OBS, and Creator roadmap contracts pass. Nine dependency-backed checks remain unavailable because `node_modules` is absent and installation was not approved; two historical dependency-free contracts retain the already-known stale Mock-provider/feed-action assertions.
- No browser-visible file changed, so browser/width QA is not applicable. No provider, Stripe, Supabase remote, Cloudflare, deploy, OAuth, target lookup, token/session, or production operation was run.
- PR #676 is merged into `codex/comment-translator-free-public-beta-integration` at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; C9 head `10b48d524901c54e4c0402c05709d95bdfe92792` is contained in integration.

## C10 Acceptance Boundary

- C10 classifies only existing server-normalized, browser-safe event and role signals. Deterministic precedence is `Super Chat -> Super Sticker -> owner -> moderator -> member -> standard`.
- Super Chat and Super Sticker require an exact matching normalized purchase kind. Unknown event kinds, mismatched purchase metadata, malformed role metadata, and moderation tombstones resolve to standard unless a separate valid lower-precedence role signal exists.
- Provider role flags grant owner, moderator, or member state only when the provider-safe boundary supplies the exact boolean `true`; truthy strings, numbers, objects, and missing values do not grant privilege.
- The classification is attached once during the existing F8 browser-safe projection and is preserved through the F9 display row, F10 translation projection, durable safe-feed snapshot, Creator feed, C6 OBS overlay, and C8 moderator view.
- Pre-C10 rows with no classification and inconsistent projected classification objects remain displayable as standard; display filters validate the projected object and do not infer privilege from browser input.
- Creator and moderator surfaces reuse existing chip-filter patterns for an `all / priority` display-only filter. OBS and moderator cards reuse existing Safe Feed Card badge patterns with category-specific labels.
- Browser input can only filter already projected safe rows. It cannot set event kind, role, priority, owner identity, purchase status, feed contents, session state, or provider behavior.
- Original and translated text, deleted state, source attribution, translation status, purchase display label, and member month display remain preserved. Priority display does not aggregate revenue or expose new analytics.
- C10 adds no public/deployed API, session or token capability, account-role management, provider execution, polling, target lookup, OAuth operation, remote migration, or browser storage.

### Verified C10 Merge And Integration Evidence

- `comment translator creator C10 priority display contract passed` verifies category normalization, deterministic precedence, exact-match revenue classification, normalized new-member event classification, malformed/unknown fail-safe behavior, strict boolean role normalization, browser-safe projection, priority lane filtering, C6/C8 compatibility, deleted/source/original preservation, and sensitive-field exclusion.
- Focused C6, C8, C9, C10, and Creator roadmap contracts pass. The broader C1-C10/provider/feed run has 16 passes out of 28: nine checks remain blocked by missing dependencies and three dependency-free historical contracts retain the same baseline assertions seen before C10.
- Changed `.ts` and `.mjs` files pass dependency-free Node syntax checks. Full ESLint, TypeScript, and production build remain unavailable because `node_modules` is absent and dependency installation was not approved.
- Browser-visible files changed, but width QA at `390 / 820 / 1024 / 1280 / 1366px` is blocked because there is no local server and dependencies are absent. C6/C8 authenticated/live-token browser QA remains separately approval-gated and was not run.
- No provider, polling, OAuth, YouTube, target lookup, live session, Supabase remote, Stripe, Cloudflare, deploy, activation, or production operation was run.

- PR #677 is merged into `codex/comment-translator-free-public-beta-integration` at `c0ac7152687dc0c91470037ec164fda57d7f4259`; C10 head `834284011252782d98139072c7a183c854f9302a` is contained in integration.

## C11 Acceptance Boundary

- C11 history persistence and reads require an authenticated caller plus server-derived paid-active Creator entitlement. Free, inactive, missing, or unreadable entitlement state cannot persist or display Creator history. Cleanup remains authenticated and owner-scoped so previously eligible owners can remove retained history after entitlement changes. Browser input cannot select the owner, entitlement, session, provider target, retention state, cleanup target, or deletion authority.
- The durable store is service-role-only and persists one owner/session snapshot containing only the minimum browser-safe history projection: safe author display, original and translated text, translation status, deleted/moderation state, source attribution, safe purchase/member display, and the validated C10 priority category.
- Reads enforce an exact rolling seven-day boundary from a server-derived clock using parsed instants rather than timestamp string ordering. The exact cutoff is included; older rows are removed owner-scoped, while malformed, unreadable, cross-owner, future, or unconfigured state returns sanitized unavailable or empty state without inventing history.
- Repeated session persistence replaces the same owner/session snapshot so deleted-message tombstones propagate into history without returning message references or private session references. A deleted tombstone containing original or translated text is treated as unreadable and fails closed.
- Expiry, OAuth disconnect, and account-deletion cleanup use one deterministic, idempotent owner-scoped store seam. Both translator and Account Integrations disconnect paths invoke the seam after credential revocation; account deletion is ready through the same seam and database cascade, without adding a scheduler, cron, queue, or deployed cleanup infrastructure.
- The existing authenticated Creator surface adds one bounded history panel. It does not expose search, CSV export, 30-day history, analytics, aggregates, revenue totals, or a new public/deployed API.
- History reads use only the existing server-owned durable entitlement read to enforce paid-active Creator access. They and cleanup do not execute providers, polling, OAuth/YouTube calls, target lookup, translation, live sessions, Stripe calls, or billing mutations.

### Verified C11 Local Evidence

- `comment translator creator C11 history contract passed` verifies authenticated owner isolation, paid-active Creator gating, Free-plan non-retention, exact inclusive instant cutoff behavior across timezone offsets, older-row expiry, store-construction/malformed/unreadable/cross-owner fail-closed handling, browser-safe projection, strict deleted-message replacement, original/translated/source/translation-status preservation, C10 priority preservation, sensitive-field exclusion, cleanup idempotency, and OAuth/account cleanup readiness.
- `comment translator creator C11 history UI contract passed` verifies the no-input authenticated history server action, server-derived paid-active entitlement gate, paid-only existing Creator surface integration, safe source/priority/deleted rendering, paid-session safe-feed persistence wiring, both OAuth-disconnect cleanup paths, unique entry keys, and absence of browser-selected owner/session authority.
- A final read-only semantic re-audit confirmed the OAuth path, Creator-only access, exact timestamp boundary, store-construction fail-closed behavior, strict tombstone correlation, and React entry-key fixes with no remaining concrete finding.
- The focused C1-C11, Creator authority, session/feed, retention/deletion, OAuth cleanup, provider-boundary, OBS Dock, and UI regression run has 18 passes out of 30 with no unexpected failure: nine checks are blocked by missing dependencies and three dependency-free historical contracts retain their pre-C11 stale assertions.
- Changed server `.ts` and contract `.mjs` files pass dependency-free Node syntax checks. LSP, ESLint, TypeScript, production build, and real browser QA remain unavailable because dependencies are absent and installation was not approved.
- No provider, polling, OAuth/YouTube, target lookup, live session, translation, Supabase remote query/mutation/migration apply, Stripe, Cloudflare, deploy, activation, or production operation was run.

### Residual Risk And C12 Handoff

- Remote Supabase query, migration apply, schema mutation, and production data access were not run. Until an explicitly approved migration apply exists, deployed reads safely return Free / paid-inactive.
- Stripe live Product, Price, Checkout, Portal, and webhook operations were not run. Local verifier fixtures are not live billing evidence.
- Local C2 fixtures do not establish live Product/Price interval, billing cadence, trial policy, webhook destination, Customer mapping values, or production configuration; C3 continues to follow only signed period-boundary advances.
- C4 does not infer an OpenAI model, provider pricing/token multiplier, budget amount, billing cadence, or production value. Operator-owned server environment values and provider-account caps remain required before any separately approved live/provider smoke.
- Dependency-backed contracts, ESLint, TypeScript, build, and browser QA remain blocked in this worktree by missing `node_modules`; installation was not approved. Three dependency-free historical contracts retain known stale provider-fixture, task-history, and feed-owner assertions and remain baseline limitations.
- C5-C9 and C11 remote migration apply and production persistence remain unverified and separately approval-gated. Until reviewed migrations are applied, deployed token/browser-session/share/dictionary/history stores remain unavailable and fail closed.
- C11 browser-visible files changed, but width QA at `390 / 820 / 1024 / 1280 / 1366px` is blocked because dependencies and a local server are absent. C6/C8 authenticated/live-token browser QA remains separately approval-gated and was not run.
- C11 is merged / integration verified at `d1ce9b0d063f65bac968c85f3242398be4b8317f`; C11 head `4bf598f7fca3f21175de7b3aeda0d001121b376b` is contained in integration.
- C12 final QA owns the task-specific readiness matrix. C5-C9/C11 remote migration apply, C6/C8/C11 authenticated browser QA, and all Stripe/provider/live operations remain separate approval gates.

## C12 Acceptance Boundary

- C12 is a docs/contracts/readiness slice. It must classify every Creator closed-beta gate as `locally verified`, `approval-gated`, `dependency-blocked`, `known historical limitation`, or `missing` without turning fixture, planned, or fail-closed evidence into production proof.
- The allowed-tester checklist covers billing, entitlement, usage/reset/cost, provider routing/fallback, OBS, moderator, dictionary, C10 projection, C11 retention/cleanup, and browser-safe/no-secret boundaries.
- Existing authenticated server actions and routes remain authoritative. C12 adds no public/deployed API, route, Worker binding, Cloudflare configuration, backend surface, demonstration UI, or parallel shell.
- Local completion does not authorize remote migration, production persistence, Stripe action, provider/live execution, authenticated token/session/browser work, deploy, activation, CP2, or public paid launch.
- Sanitized evidence is limited to gate/action labels, classifications, pass/fail/block status, counts, stop reasons, missing reference names, and commit/contract identifiers.

### Verified C12 Local Evidence

- `comment translator creator C12 final QA readiness contract passed` verifies the 24-gate classification matrix, exact C11 integration state, authority reconciliation, allowed changed-file scope, no-new-API boundary, and sanitized evidence posture.
- The pre-edit and post-edit 30-contract set is expected to remain `18 pass / 9 dependency-blocked / 3 known historical / 0 unexpected`; dependency-backed checks are unavailable because `node_modules` is absent and installation was not approved.
- Browser QA at `390 / 820 / 1024 / 1280 / 1366px` is dependency-blocked because dependencies, the local Next binary, and an existing local server are absent. Authenticated C6/C8/C11 rendering remains separately approval-gated.
- `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_FINAL_QA_READINESS.md` is the task-specific allowed-tester smoke/readiness authority.
- C12 local readiness is complete. Its recorded handoff was CP1; CP1 is now locally complete without collecting the approval-gated operational evidence.

## CP1 Acceptance Boundary

- CP1 is docs/contracts/readiness only. Existing authenticated server actions and routes remain authoritative; no public/deployed API, route, Worker binding, Cloudflare configuration, backend surface, runtime, UI, or browser authority is added.
- CP1 records five non-substitutable evidence lanes and an ordered CP1-S0 through CP1-S10 sequence covering remote migrations/stores, Stripe, entitlement, usage/cost/limits, Paid provider/fallback, OBS/moderator, dictionary, C10/C11 history/cleanup, authenticated browser QA, and release-owner decision.
- Every external or actual-authority operation has an independent approval unit. The active CP1 authority now records 71 independent approval units, including the C1 target discovery/mapping, migration, fail-closed read, adapter-runtime presence discovery, consumed runtime-role classifications, role-aware source discovery, consumed attempt-0 same-process ephemeral provisioning, consumed initial opaque runner provisioning, consumed/pass opaque runner retry, consumed/aborted held-runner stop, consumed/pass stop-result static diagnosis, consumed/pass contract-expectation remediation design, consumed/aborted contract-only remediation implementation, consumed/aborted pure-fixture outcome diagnosis, consumed/aborted attempt-0 fixture-pair identity design, consumed/aborted RETRY-1, consumed/pass local result-envelope diagnosis and reducer remediation, consumed/aborted RETRY-2, consumed/pass local driver pipeline preflight, consumed/aborted RETRY-3 through RETRY-5, consumed/aborted artifact-read command static diagnosis and repository-local path resolution, consumed/pass synthetic command-construction design and execution preflight, consumed/pass explicit artifact-path positional binding static design, consumed/pass filename-predicate cardinality diagnosis, the consumed/aborted goal-bound hash-first fixture-identity unit, its consumed/aborted syntax-preflighted RETRY-1, its consumed/aborted in-memory-compiled RETRY-2, its consumed/aborted transient-driver RETRY-3, its consumed/aborted canonical-byte-source RETRY-4, its consumed/aborted ancestor-blob RETRY-5, its consumed/aborted original-untracked-artifact RETRY-6, its consumed/aborted structure-reducer RETRY-7, its consumed/aborted balanced assert-match argument RETRY-8, its consumed/aborted ordered-regex-window RETRY-9, its consumed/aborted corrected ordered-regex-window RETRY-10, and the consumed/pass runtime-ordinal-4 hash-min static-invariant fixture-identity design. Approval for one classification, discovery, provisioning, mapping, migration, store check, Stripe/provider/capability/cleanup/browser operation, retry, rollback, deploy, CP2, promotion, or public launch does not authorize another.
- Browser QA is planned for Creator, OBS, moderator, dictionary, history, and priority/deleted/source display at `390 / 820 / 1024 / 1280 / 1366px`; it is not run without remote-store readiness, reviewed deployed revision, allowed-tester state, sanitized capture policy, and exact browser-QA approval.
- Fixture, local deterministic, reference-presence, planned, and fail-closed evidence never become remote, deployed, billing, provider, authenticated-browser, or public-release proof.
- CP1 does not authorize remote query/mutation/migration apply, Stripe action, provider/live execution, token/session operation, authenticated browser QA, dependency installation, deploy, activation, CP2, promotion to `main`, or public paid launch.

### Verified CP1 Local Evidence

- C12 PR #679 is merged into `codex/comment-translator-free-public-beta-integration` at `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.
- `comment translator creator CP1 paid launch readiness contract passed` verifies the fixed C12 state, five evidence lanes, 11 ordered stages, 71 independent approval units, six browser surfaces, allowed docs/contracts file scope, and sanitized evidence boundary.
- PR #683 is merged and the current fetched integration tip for the C1 follow-up is `09ada36691185be9775940ce653952901bfc64d8`. Both C1 fail-closed read approvals stopped before a remote read. `CP1-A-C1-ADAPTER-RUNTIME-DISCOVERY` is consumed and aborted with `2 required / 0 available / 0 eligible`; no adapter initialization, remote read, query, mutation, or configuration change ran. The synthetic-only classifier harness is locally GREEN, while actual authority classification and runtime-source provisioning remain unchecked / separately approval-gated.
- PR #684 is merged and the current fetched integration tip is `dd698bf093615c1741e25b73b37761a68804c45b`. `CP1-A-C1-ADAPTER-RUNTIME-ROLE-CLASSIFICATION-HARNESS` is consumed and aborted with `required_count_mismatch` / `no_changes_applied`; it is not reusable. `CP1-A-C1-ADAPTER-RUNTIME-ROLE-CLASSIFICATION-HARNESS-FACTORY-HANDOFF` is consumed and passed with `2 server-runtime roles / 1 noncredential endpoint / 1 privileged server-secret / 0 client-consumed / 0 ambiguous / 1 constructor`. `CP1-A-C1-ADAPTER-RUNTIME-ROLE-AWARE-SOURCE-DISCOVERY` is consumed and aborted with `0/0/0` presence. `CP1-A-C1-ADAPTER-RUNTIME-ROLE-SAME-PROCESS-EPHEMERAL-PROVISIONING` is consumed and blocked at attempt 0. The initial opaque runner unit is consumed and aborted on input separation. `RETRY-1` is consumed/pass and established held-idle state, but its control surface is limited to presence/status/stop and has no adapter/read consumer. `CP1-A-C1-OPAQUE-EPHEMERAL-RUNNER-STOP-NO-EXECUTION-SEAM` is consumed/aborted after one stop action because termination status was unconfirmed; no retry or post-stop status inspection ran, and process retention is unchecked. `CP1-A-C1-OPAQUE-RUNNER-STOP-RESULT-STATIC-DIAGNOSIS` is consumed/pass with `1 stop output field / 1 termination field / 0 exit-status bindings / 6 contract expectations / contract-wrapper-drift / 0 runner controls`. `CP1-A-C1-OPAQUE-RUNNER-CONTRACT-EXPECTATION-REMEDIATION-DESIGN` is consumed/pass with `1 mismatch / 1 proposed contract-only edit / 2 synthetic fixture requirements / 0 artifact changes / 0 contract executions / 0 runner controls`. `CP1-A-C1-OPAQUE-RUNNER-CONTRACT-EXPECTATION-REMEDIATION-IMPLEMENTATION` is consumed/aborted with `1 edit / 2 fixtures / 1 fixture pass / syntax pass / pre-hash restored / 0 runner controls`. `CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-RESULT-DIAGNOSIS` is consumed/aborted with `3 hash matches / 0 fixture executions / 0 runner controls / fixture identity ambiguous`. The first deterministic fixture-pair identity design is consumed/aborted with `design attempt 0 / artifact hash reads 0 / local parser parse failure`. RETRY-1 is consumed/aborted on `nested-tool-result-envelope-not-reduced`; the transient reducer remediation passes `2/2` fixtures with no persistent change. RETRY-2 is consumed/aborted before artifact access on local encoding failure. The local driver pipeline preflight passes encoding/decoding/single-envelope/fixed14 validation with `2/2` synthetic fixtures and zero artifact/nested-tool/runner access. RETRY-3 is consumed/aborted with `design attempt 0 / artifact hash matches 0 / artifact-read command failure`; S2V static diagnosis is consumed/aborted as ambiguous with zero artifact/nested-command/runner access. S2W synthetic command-construction design is consumed/pass with `3 placeholders / static tokenization pass / explicit positional binding / single sanitized result envelope / 0 artifact access / 0 nested command / 0 runner control`. S2X synthetic execution preflight is consumed/pass with `1 attempt / 0 artifact access / 1 nested command / 0 runner control / 3 arguments / binding pass / shell pass / single-envelope pass / sanitized payload pass / no persistent change`. RETRY-4 is consumed/aborted before its driver invocation with `design attempt 0 / artifact hash matches 0 / runner controls 0 / explicit path binding unavailable`; it did not access an artifact, execute a nested command, or design a fixture. S2Z explicit artifact-path positional binding is consumed/pass with `3 roles / explicit operator-supplied positional paths / no document-shell-env-metadata extraction / one sanitized result envelope / no persistent change`. RETRY-5 is consumed/aborted with design attempt 0 because private path inputs were absent; no driver, artifact access, nested command, fixture design, or runner control ran. S2AB repository-local artifact-path resolution is consumed/aborted with zero candidate content/hash reads and ambiguous role binding. S2AC basename-predicate cardinality diagnosis is consumed/pass with `0 wrapper / 0 runner / 0 contract / all-role-zero-match`; S2AD is consumed/aborted before its nested command, S2AE RETRY-1 is consumed/aborted at syntax-only preflight, S2AF RETRY-2 is consumed/aborted after one compiled-driver invocation returned `triggered-nested-command-failure`, and S2AG RETRY-3 is consumed/aborted after one syntax-passed transient-driver execution found zero unique reviewed-hash matches. The transient driver was deleted; hash binding and deterministic fixture-pair identity remain incomplete. Client/adapter and remote behavior remain separate gates.
- S2AH canonical-byte-source RETRY-4 is consumed/aborted after one syntax-passed transient-driver execution found zero reviewed-hash matches across the permitted tracked working-tree/index/LF/CRLF byte sources. The transient driver was deleted; fixture identity design, artifact execution/change, runner control, and external action remain not-run.
- S2AI ancestor-blob RETRY-5 is consumed/aborted after one syntax-passed transient-driver execution found zero reviewed-hash matches across permitted tracked `scripts/` blobs reachable from the reviewed revision. The transient driver was deleted; fixture identity design, artifact execution/change, runner control, and external action remain not-run.
- S2AJ original-untracked-artifact RETRY-6 is consumed/aborted after all three reviewed hashes bound uniquely and distinctly, because the six fixed-wrapper expectations did not reduce to one numeric-remediation ordinal. The transient driver was deleted; no transform, artifact execution/change, runner control, or external action ran.
- S2AK structure-reducer RETRY-7 is consumed/aborted after all three reviewed hashes again bound uniquely and distinctly, because the approved structure reducer still did not reduce the fixed-wrapper expectations to one numeric-remediation ordinal. The transient driver was deleted; no transform, artifact execution/change, runner control, or external action ran.
- S2AL balanced assert-match argument RETRY-8 is consumed/aborted after all three reviewed hashes again bound uniquely and distinctly, because the reducer did not produce one canonical first-argument binding and six-expectation candidate. The transient driver was deleted; no transform, dependency installation, artifact execution/change, runner control, or external action ran.
- S2AM ordered-regex-window RETRY-9 is consumed/aborted at its five-shape synthetic gate before artifact access. The transient driver was deleted; no artifact content/hash read, fixture design, transform, dependency installation, runner control, or external action ran.
- S2AN corrected ordered-regex-window RETRY-10 is consumed/aborted after its synthetic gate passed and all three reviewed hashes matched, because the candidate set remained ambiguous. The transient driver was deleted; no transform, artifact execution/change, runner control, or external action ran.
- S2AO goal-bound fixture identity design is consumed/pass with runtime remediation ordinal 4 retained and the negative fixture selected from three valid static-invariant candidates by lexicographically smallest negative SHA-256. The fixed14 identity is recorded; fixture/verifier/full-contract execution, artifact change, runner control, client/adapter invocation, and external action remain not-run.
- `CP1-A-MIG-C1` is consumed and passed: one attempt, one apply, and one committed transaction. No post-apply query, inspection, retry, remediation, rollback, or cleanup ran.
- `CP1-A-TARGET-DISCOVERY-C1-PREVIEW` is consumed. Its one approved list returned `1 accessible / 1 active / 0 marker-qualified candidate`; no private project metadata was output or stored, no mapping was retained, and no mutation was run.
- `CP1-A-TARGET-MAP-C1-SOLE-ACTIVE` is consumed with sanitized result `1 accessible / 1 active`, mapping resolved, and execution pass. The opaque target identifier is held only in trusted transient execution state; no project metadata, query, mutation, or migration apply was output or run.
- The C12 30-contract baseline remains `18 pass / 9 dependency-blocked / 3 known historical / 0 unexpected`. Missing `node_modules` remains a setup limitation; installation was not approved.
- C1 adapter execution remains blocked because the held runner has no adapter/read execution control action. No runtime/UI or configuration change is authorized by the synthetic harness or presence-only runner. `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md` is the exact approval-sequencing authority.
- CP1 local readiness is complete. Every external/deployed/browser/release-owner lane remains not-run / blocked / approval-gated.

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
| C8 | Moderator share UI route | merged / integration verified at `1ec79ca222149626670ec6692c19356bc56bb2c6`; authenticated feed QA pending / gated |
| C9 | Custom dictionary minimum | merged / integration verified at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb` |
| C10 | Priority display polish | merged / integration verified at `c0ac7152687dc0c91470037ec164fda57d7f4259` |
| C11 | Simple 7-day history | merged / integration verified at `d1ce9b0d063f65bac968c85f3242398be4b8317f` |
| C12 | Creator closed beta final QA | local readiness complete; operational readiness blocked / approval-gated |

## Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | local readiness complete; external evidence blocked / approval-gated |
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
- C8 merge is complete at `1ec79ca222149626670ec6692c19356bc56bb2c6`; Cloudflare configuration, deploy, activation, and any live token/session operation remain approval-gated.
- C9 merge / integration verification is complete through PR #676 at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; remote migration apply and production persistence remain approval-gated.
- C10 merge / integration verification is complete through PR #677 at `c0ac7152687dc0c91470037ec164fda57d7f4259`.
- C11 merge / integration verification is complete through PR #678 at `d1ce9b0d063f65bac968c85f3242398be4b8317f`; remote migration apply, production persistence, and authenticated browser history verification remain approval-gated.
- C12 is merged / integration verified through PR #679 at `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.
- CP1 local readiness is complete. Its 71 independent approval units remain consumed, ready-not-approved, or not-run as recorded by the active authority; deploy, activation, CP2, promotion to `main`, and public paid launch remain out of CP1.
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
