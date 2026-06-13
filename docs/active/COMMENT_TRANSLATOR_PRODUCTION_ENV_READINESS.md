# Kuro Live Comment Translator Production Env Readiness

Status: Task 28 production env readiness/blocker record. Public-release capable: no.

This record inventories production env, secret, and variable references before private-gated main promotion. It is reference-name-only. It is not approval for main promotion, merge to `main`, deploy/upload, production/custom URL smoke, Cloudflare production mutation, remote mutation, remote schema migration, Supabase migration apply, Stripe live-mode action, billing setting mutation, Customer Portal redirect, webhook registration, provider target lookup, liveChatId lookup, or live/provider execution.

Output policy: sanitized-metadata-only. Secret values, token values, OAuth values, authorization code values, owner user id values, provider channel id values, liveChatId values, service-role key values, Authorization header values, Stripe secret values, webhook signing secret values, provider target metadata values, raw comment text, provider response bodies, browser storage payloads, and handoff payload expansion are not requested, displayed, stored, or recorded.

## Classification

- `required`: must be present before a private-gated production route/account/session readiness claim for the listed surface.
- `optional`: hardening, comparison, future, or fallback reference. Missing references must not open access or expose sensitive data.
- `smoke-only`: required only in the operator-local/server-only command process for an approved smoke or live/provider step. Missing references block the smoke and must not be worked around by printing values.

## Inventory

| Reference name | Class | Kind | Runtime surface | Missing or disabled behavior | Operator setting location |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | required | public var | Auth redirects, Stripe return URLs, production/custom target labeling | Auth redirect falls back to request origin or local development origin; Stripe Checkout/Portal returns `missing-config`. Production readiness should fail closed until this points at the approved production/custom URL. | Cloudflare production app var and local verification env, value not recorded. |
| `NEXT_PUBLIC_AUTH_REDIRECT_ORIGINS` | optional | public var | Auth redirect allowlist hardening | Missing means only `NEXT_PUBLIC_SITE_URL` and trusted request host checks are used. It must not widen redirects. | Cloudflare production app var when extra approved origins exist. |
| `NEXT_PUBLIC_SUPABASE_URL` | required | public var | Supabase browser/server auth, account smoke, YouTube trusted adapter endpoint reference | Account auth client becomes unavailable; route/session caller auth becomes unavailable and private launch surfaces fail closed with sanitized states. Token-store/status smoke reports missing reference. | Cloudflare production app var and operator-local smoke env, value not recorded. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | required | public var | Supabase browser/server auth and allowed-tester account smoke | Account auth client becomes unavailable; allowed-tester account smoke cannot prove signed-in production flow. | Cloudflare production app var, value not recorded. |
| `SUPABASE_SERVICE_ROLE_KEY` | smoke-only | server secret | YouTube OAuth trusted status reader, disconnect runtime, service-role persistence smoke, live/provider smoke prerequisites | Trusted adapter returns unavailable or smoke reports missing env reference; session start stays blocked or credential status remains unavailable. It must never be exposed to client/docs/output. | Cloudflare server secret only when production runtime needs trusted token status, and operator-local smoke env for approved checks. |
| `SUPABASE_SECRET_KEY` | optional | server secret | Reserved trusted Supabase boundary reference | Not used by current comment-translator runtime; missing must not affect private-gated route smoke. | Do not set unless a separately approved trusted Supabase runtime requires it. |
| `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES` | required | server var / secret-like reference | Private launch access gate for `/tools/comment-translator`, account integrations, account billing, session API, credential status, disconnect, server actions, billing actions | Missing or invalid hash list produces an empty allowlist. General users are blocked, and allowed-tester smoke cannot pass. This is fail-closed. | Cloudflare production server var or secret. Store only hash references; do not record owner user id values. |
| `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` | smoke-only | server var | YouTube credential status, disconnect, session readiness, token-store smoke commands | Enabled or missing in smoke preflight blocks trusted credential resolution or reports missing env reference. Access remains sanitized/unavailable rather than exposing token values. | Cloudflare production server var when intentionally disabling resolution; operator-local smoke env for approved checks. |
| `YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF` | optional | server secret reference name | Token-store encryption/key-management contract | Missing blocks token-store persistence readiness where the approved key-management runtime requires it. | Secret manager or server-only config reference after separate approval. |
| `YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION` | optional | server var | Token-store key version contract | Missing blocks key-version-specific persistence readiness where required. | Secret manager or server-only config reference after separate approval. |
| `STRIPE_SECRET_KEY` | smoke-only | server secret | Stripe Checkout, Customer Portal, webhook verifier client | Checkout/Portal returns `missing-config`; webhook verifier cannot be constructed. No live-mode Stripe action is approved by this record. | Cloudflare production secret and operator-local Stripe smoke env only after approval. |
| `COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID` | smoke-only | server var | Stripe Checkout paid plan reference | Checkout returns `missing-config`; Free plan remains available and paid upgrade stays unavailable. | Cloudflare production var and operator-local Stripe smoke env, value not recorded. |
| `STRIPE_WEBHOOK_SECRET` | smoke-only | server secret | Stripe signed webhook entitlement sync | Webhook result is rejected as `missing-config`; entitlement sync is not trusted. | Cloudflare production secret and operator-local webhook smoke env after approval. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional | public var | Login, signup, reset-password Turnstile widget display | Captcha widget is not shown by this client-side surface. Auth must still rely on Supabase/server controls. | Cloudflare production public var if Turnstile is enabled. |
| `COMMENT_TRANSLATOR_FREE_TRANSLATION_PROVIDER` | optional | server var | Provider policy documentation/reference | Current runtime routes Free to Azure by implementation contract; missing policy var must not enable another provider. | Cloudflare production var only if a later runtime consumes the policy reference. |
| `COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER` | optional | server var | Provider policy documentation/reference | Current runtime routes Paid to OpenAI mini with Azure recoverable fallback by implementation contract; missing policy var must not enable another provider. | Cloudflare production var only if a later runtime consumes the policy reference. |
| `COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD` | smoke-only | server var | Provider cost/budget policy before paid provider execution | Paid provider execution must remain blocked until budget reference is present; missing should stop paid live/provider smoke. | Cloudflare production var and operator-local smoke env before approved paid provider execution. |
| `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO` | optional | server var | Provider budget warning/soft-stop policy | Missing uses documented policy only where runtime has defaults; must not raise budget limits implicitly. | Cloudflare production var if runtime consumes it. |
| `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO` | optional | server var | Provider budget hard-stop policy | Missing must not permit unbounded paid provider execution. | Cloudflare production var if runtime consumes it. |
| `COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP` | smoke-only | server var | Azure provider budget cap policy | Missing blocks Azure live/provider smoke where cap evidence is required; must not permit unbounded execution. | Cloudflare production var and operator-local smoke env before approved Azure execution. |
| `AZURE_TRANSLATOR_KEY` | smoke-only | server secret | Azure Translator provider execution | Azure provider returns terminal `credential-missing`; Free translation execution and Azure fallback smoke remain unavailable. | Cloudflare production secret and operator-local provider smoke env after approval. |
| `AZURE_TRANSLATOR_ENDPOINT` | optional | server var | Azure Translator endpoint override | Missing uses the runtime default Azure endpoint. Invalid values should fail provider execution without exposing response bodies. | Cloudflare production var only if overriding default endpoint. |
| `AZURE_TRANSLATOR_REGION` | optional | server var | Azure Translator regional header | Missing omits the region header; provider behavior depends on configured Azure resource. | Cloudflare production var when the approved Azure resource requires it. |
| `OPENAI_API_KEY` | smoke-only | server secret | OpenAI mini paid provider execution | OpenAI mini provider returns terminal `credential-missing`; paid translation smoke remains unavailable. | Cloudflare production secret and operator-local provider smoke env after approval. |
| `OPENAI_TRANSLATION_MODEL` | smoke-only | server var | OpenAI mini paid provider execution | OpenAI mini provider returns terminal `credential-missing`; paid translation smoke remains unavailable. | Cloudflare production var and operator-local provider smoke env after approval. |
| `DEEPL_AUTH_KEY` | optional | server secret | DeepL comparison provider | DeepL provider returns terminal `credential-missing`; comparison remains unavailable. It is not initial production routing. | Cloudflare production secret only after separate provider approval. |
| `DEEPL_API_BASE_URL` | optional | server var | DeepL comparison provider endpoint | Missing uses DeepL default API base URL. | Cloudflare production var only if DeepL comparison is approved. |
| `DEEPL_TIMEOUT_MS` | optional | server var | DeepL comparison timeout | Missing uses runtime default timeout. | Cloudflare production var only if DeepL comparison is approved. |
| `GEMINI_API_KEY` | optional | server secret | Gemini comparison-only provider policy | Missing keeps Gemini comparison unavailable. It is not initial production routing. | Cloudflare production secret only after separate provider approval. |
| `GEMINI_TRANSLATION_MODEL` | optional | server var | Gemini comparison-only provider policy | Missing keeps Gemini comparison unavailable. | Cloudflare production var only after separate provider approval. |
| `CLOUDFLARE_WORKERS_AI_MODEL` | optional | server var | Cloudflare Workers AI comparison-only provider policy | Missing keeps Workers AI comparison unavailable. | Cloudflare production var only after separate provider approval. |
| `CLOUDFLARE_AI_GATEWAY_ID` | optional | server var | Cloudflare Workers AI/Gateway comparison policy | Missing keeps Gateway-specific comparison unavailable. | Cloudflare production var only after separate provider approval. |
| `CLOUDFLARE_ACCOUNT_ID` | smoke-only | deploy/provider var | Wrangler upload/deploy account selection; Cloudflare Workers AI comparison policy | Missing can block Wrangler upload/deploy account resolution or comparison-provider execution. This record does not approve upload/deploy. | Operator-local Wrangler/CI/Cloudflare deployment configuration; do not record account id values. |
| `CLOUDFLARE_API_TOKEN` | smoke-only | deploy/provider secret | Wrangler upload/deploy authentication; Cloudflare Workers AI comparison policy | Missing or invalid token blocks deploy/upload or comparison-provider execution. This record does not approve Cloudflare mutation. | Operator-local Wrangler/CI secret; do not record token values. |
| `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` | optional | server/control-plane reference | Edge rate-limit control reference | Missing means only app-side abuse/rate-limit guard evidence is available; it must not bypass private-launch denial throttling. | Cloudflare edge/rate-limit config reference if enabled. |

## Approved-Smoke-Only Operator References

These references are not production app config by default. They are operator-local/server-only inputs for approved smoke commands and must never be copied into docs, PR bodies, browser storage, or handoff payloads.

| Reference name | Class | Runtime surface | Missing behavior |
| --- | --- | --- | --- |
| `YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID` | smoke-only | Token-store/status/live smoke fixture reference | Smoke preflight reports missing fixture reference and blocks execution. |
| `YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID` | smoke-only | Owner authorization and smoke fixture reference | Smoke preflight reports missing fixture reference and blocks execution. |
| `YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID` | smoke-only | Provider channel smoke fixture reference | Smoke preflight reports missing fixture reference and blocks execution. |
| `YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT` | smoke-only | Presence-only target metadata gate | Live runtime smoke preflight blocks execution until presence-only evidence exists. |
| `YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED` | smoke-only | Owner authorization preflight gate | Live/provider smoke must not execute until confirmed in the same thread. |
| `YOUTUBE_GOOGLE_API_LIVE_CALL_READY_PREFLIGHT_CONFIRMED` | smoke-only | Google API live-call approval gate | Google API live-call command blocks execution without the readiness reference. |
| `YOUTUBE_GOOGLE_API_LIVE_CALL_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER` | smoke-only | Operator-local token-material check | Token material availability stays operator-local; value must not be printed or recorded. |
| `YOUTUBE_GOOGLE_API_LIVE_CALL_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO` | smoke-only | Operator-local token-material check | Missing blocks token-material availability evidence. |
| `YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED` | smoke-only | Target lookup and polling prerequisite | Target lookup/polling smoke blocks until owner verification success is recorded as presence-only evidence. |
| `YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED` | smoke-only | Live Chat target lookup approval gate | Target lookup command blocks execution without same-thread readiness. |
| `YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER` | smoke-only | Operator-local target lookup token-material check | Token material availability stays operator-local; value must not be printed or recorded. |
| `YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO` | smoke-only | Operator-local target lookup token-material check | Missing blocks token-material availability evidence. |
| `YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED` | smoke-only | Polling prerequisite | Polling smoke blocks until target lookup presence-only evidence exists. |
| `YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED` | smoke-only | Live Chat polling approval gate | Polling command blocks execution without same-thread readiness. |
| `YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT` | smoke-only | Polling target metadata presence gate | Polling command blocks execution without presence-only target metadata evidence. |
| `YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID` | smoke-only | Operator-local Live Chat target input | Polling command blocks when missing; value must stay operator-local/server-only and never be recorded. |
| `YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER` | smoke-only | Operator-local polling token-material check | Token material availability stays operator-local; value must not be printed or recorded. |
| `YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO` | smoke-only | Operator-local polling token-material check | Missing blocks token-material availability evidence. |

## Production Preflight Interpretation

Before any main promotion or production smoke approval, the release owner should confirm reference presence in the correct boundary without pasting values:

1. Cloudflare production app vars/secrets contain the `required` references for site URL, Supabase public auth, and private-launch allowlist.
2. General users remain blocked by default; missing private-launch allowlist must not open access.
3. Allowed-tester account smoke is blocked until Supabase public auth references and allowed tester hash references exist.
4. Session-start/provider smoke is blocked until trusted Supabase, YouTube, provider, budget, and approval references exist in the approved server-only/operator-local boundary.
5. Stripe Checkout, Portal, and webhook smoke are blocked until Stripe references exist and exact live-mode actions are separately approved.
6. Deploy/upload references are reviewed only as deployment readiness; this record does not approve Cloudflare mutation.

## Width Checks

Width checks skipped for this production env readiness PR. The change is docs, a Node contract script, and task-board notes only; it does not change UI, rendered text, CSS, route behavior, browser storage, or visible layout.

## Next Safe Action

After this readiness/blocker PR is merged, an operator can configure or confirm production references in Cloudflare, Wrangler/CI, Supabase, Stripe, provider dashboards, and operator-local smoke env without sharing values. Task 28 completion still requires separate same-thread ready preflight, sanitized output review, and explicit approval for exact main promotion, deploy/upload, and production/custom smoke actions.
