# Comment Translator Creator Closed Beta Task Board

## Authority And Current State

- Free public beta is complete.
- Current priority: P0 Creator closed beta.
- C1/C2/C3 are merged / integration verified; C4 is locally verified and its publication is the next gate.
- C1 is merged through PR #668 at exact integration commit `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; its merge tree matches C1 head `baf8bf57dd570c3dca6bc29c880f47b7f7444fac`.
- C3 is merged through PR #669 at exact integration commit `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; its merge tree matches and contains C3 head `85fa39896f63e223463a85000eb8e02f538754d4`.
- C2 is merged through PR #670 at exact integration commit `4486c180f68369d6620b9f8f3df33518b7cadc38`; its merge tree matches C2 head `761f503f276a5a7e095c79be5f3ca31c26fe6fff`.
- C2 live activation and C4 publication/live provider execution remain separately approval-gated.
- C5 through C11 are the user-visible closed-beta capability sequence after the entitlement and usage foundations; C12 is the ending final-QA gate.
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

### Verified C4 Local Evidence

- `comment_translator_creator_c4_paid_provider_authority_contract=pass` verifies auth, C2 activation/allowlist, C1 missing/unreadable/expired/mismatched state, C3 missing/unreadable/stale state, provider-selection/configuration, server budget flags, and hard-budget stop all prevent paid provider invocation.
- `comment_translator_creator_c4_paid_provider_route_contract=pass` verifies OpenAI-first Paid execution, strict structured-output parsing, Azure fallback for approved recoverable classes only, no fallback for content/policy/parse classes, C3 recorded/ignored-replay exactly-once behavior, missing-Azure safe degradation, and sanitized result shape.
- `comment_translator_creator_c3_paid_usage_counter_contract=pass` remains green after adding explicit C1 billing-user-reference binding to the shared C3 authority read.
- No OpenAI, Azure, YouTube, Stripe, Supabase remote, Cloudflare, deploy, production/custom-domain, OAuth, target lookup, or browser execution was run. No UI file changed, so browser/width QA is not applicable.

### Residual Risk And Next Handoff

- Remote Supabase query, migration apply, schema mutation, and production data access were not run. Until an explicitly approved migration apply exists, deployed reads safely return Free / paid-inactive.
- Stripe live Product, Price, Checkout, Portal, and webhook operations were not run. Local verifier fixtures are not live billing evidence.
- Local C2 fixtures do not establish live Product/Price interval, billing cadence, trial policy, webhook destination, Customer mapping values, or production configuration; C3 continues to follow only signed period-boundary advances.
- C4 does not infer an OpenAI model, provider pricing/token multiplier, budget amount, billing cadence, or production value. Operator-owned server environment values and provider-account caps remain required before any separately approved live/provider smoke.
- Fresh worktree dependencies are absent and install is prohibited in this task, so repository lint, typecheck, build, dependency-backed historical Stripe/provider contracts, and the focused C1 contract remain unchecked locally.
- Next handoff requires separate approval for commit / push / PR. After merge, the exact integration result must pass focused C1/C2/C3/C4, provider-policy/translation, Stripe readiness, and Creator authority contracts before C5 or any separate live C2/C4 action is considered.

## Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995` |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | merged / integration verified at `4486c180f68369d6620b9f8f3df33518b7cadc38` |
| C3 | Paid usage and monthly reset | merged / integration verified at `5fc3cca2730a58f35279098ec0b2f5c804ce0076` |
| C4 | AI natural translation provider route | local verified / publication approval pending |
| C5 | OBS overlay token runtime | pending |
| C6 | OBS overlay UI route | pending |
| C7 | Moderator share token runtime | pending |
| C8 | Moderator share UI route | pending |
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
- C4 is locally verified only; commit, push, PR, merge, provider live execution, Cloudflare configuration, deploy, activation, and exact integration verification remain approval-gated.
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
