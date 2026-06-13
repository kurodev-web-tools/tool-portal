# Kuro Live Comment Translator Provider Cost Policy

Status: Task 19 provider and cost policy for the pre-main launch hardening roadmap.

Verified on 2026-06-12 JST against primary provider documentation linked below. Pricing, model availability, data-use terms, and regional restrictions are unstable and must be rechecked before enabling live provider smoke or paid launch. This document records policy only. It does not approve provider API calls, live/provider execution, deploy/upload, remote mutation, browser storage changes, handoff payload changes, Stripe live-mode actions, or provider secret collection.

## Initial Recommendation

- Free plan primary: Azure Translator.
  - Reason: dedicated text translation service, public free-tier stop behavior, broad JA / EN / KR / CN coverage to target JA / EN, and predictable character-based accounting.
  - Free traffic should stop on cap exhaustion or shared-service budget stop. Do not silently fail over Free traffic to a paid LLM.
- Paid plan primary: OpenAI mini.
  - Reason: low token price for a mini text model, strong promptable glossary/style behavior, structured output support for Task 20 alignment, and default API no-training posture for business/API data.
  - The exact mini model stays environment-selected and must be reverified before launch. Current source evidence used `gpt-4o-mini` pricing as the documented mini reference.
- Paid deterministic fallback: Azure Translator when OpenAI mini returns recoverable timeout/rate-limit/temporary-unavailable and Azure budget remains available.
- Optional quality/comparison provider: DeepL.
  - Reason: quality reputation, glossary/formality features, and existing server-only prototype support.
  - Not the initial paid default because current public API plan availability/pricing must be confirmed in the operator account before paid launch.
- Cost comparison candidates only for initial launch: Gemini Flash/Lite and Cloudflare Workers AI.
  - Gemini Flash/Lite remains a cost/quality comparison path because free-tier data-use posture and regional terms differ from paid services.
  - Cloudflare Workers AI remains a Cloudflare-native low-latency/fallback comparison path, not a default text translation provider, because the launch path needs stable dedicated translation quality and careful AI Gateway logging controls.

## Provider Comparison

| Provider | Cost posture | Quality posture | Privacy/data-use posture | Latency/deployment fit | Fallback fit | Initial decision |
|---|---|---|---|---|---|---|
| DeepL | API Free is documented at 500,000 characters/month for existing public support docs; current paid API plan availability/pricing requires account confirmation. | Strong quality candidate, especially for natural translation and terminology. | DeepL states texts are not stored or used for model training without consent. | Server-only prototype already exists; not Cloudflare-native but simple REST fit. | Good optional quality fallback after pricing/account confirmation. | Keep as optional paid quality/comparison provider, not default. |
| Azure Translator | Free tier stops at 2 million characters/month according to Microsoft Translator FAQ; pricing page is consumption-based and should be checked in Azure before paid launch. | Dedicated NMT service, broad language coverage, predictable behavior for short chat rows. | Microsoft states Translator customer data is not written to persistent storage. | Good REST fit from server-only runtime; character accounting maps cleanly to budget ledger. | Best deterministic fallback for paid and primary for Free. | Free plan primary and paid deterministic fallback. |
| OpenAI mini | Current mini reference `gpt-4o-mini` is documented at low per-token pricing; exact mini model must stay env-selected. | Good for glossary/style constraints and strict JSON output, but Task 20 must enforce output parsing and no prompt chatter. | OpenAI states API/business data is not used for training by default unless opted in. | Good server-only API fit; token accounting needs estimates, not exact character caps. | Best paid primary when quality/glossary flexibility matters. | Paid plan primary. |
| Gemini Flash/Lite | Official pricing lists Flash/Lite token pricing and free/paid tiers; terms and "used to improve products" differ by tier. | Good cost/performance family, but launch legal/copy must account for service tier and region restrictions. | Terms restrict availability and require paid services for API clients in some regions. | Good API fit, but not already wired and region/terms need final review. | Candidate fallback only after paid-service posture is locked. | Comparison-only for Task 19; do not enable by default. |
| Cloudflare Workers AI | Free allocation is 10,000 Neurons/day; paid usage is charged per Neuron after the free allocation. | Model catalog includes multilingual text generation and translation models, but model-level quality and availability are not equivalent to a dedicated translation API. | Cloudflare states it does not train products using Customer Content without consent, but AI Gateway can log prompts/responses if enabled. | Excellent Cloudflare deployment fit and default rate-limit primitives; Workers AI Translation limit is documented separately. | Useful emergency or edge-native comparison path only with logging disabled or tightly retained. | Comparison-only for Task 19; do not enable by default. |

## Language Coverage

Initial release source candidates remain JA / EN / KR / CN and target JA / EN. Source and target same-language selections remain invalid.

| Provider | JA/EN/KR/CN source to JA/EN target policy |
|---|---|
| DeepL | Treat as supported only for pairs returned by the official DeepL languages endpoint at runtime or by the current docs review. Do not hard-code unsupported variants. |
| Azure Translator | Treat JA / EN / KR / CN to target JA / EN as supported by Azure Translator cloud text translation. Use provider language codes from Azure docs at implementation time. |
| OpenAI mini | Treat as model-capability supported for policy, not a dedicated language-pair SLA. Task 20 must validate output language and parse strict structured output. |
| Gemini Flash/Lite | Treat as model-capability supported for policy, not a dedicated language-pair SLA. Do not enable until paid-service data-use and region posture are accepted. |
| Cloudflare Workers AI | Treat translation support as model-specific. Do not assume every Workers AI text-generation model supports all initial pairs. |

## Fallback And Stop Policy

- cap exhaustion stops translation instead of provider hopping.
- Free plan cap/error behavior:
  - Azure monthly cap or service budget cap: stop the session or refuse new session with sanitized `ai-budget-stop` or `global-budget-stop`.
  - Azure recoverable timeout/429/5xx: bounded retry/backoff, then fallback-to-original/skip for that comment batch. Do not move Free traffic to OpenAI, Gemini, DeepL, or paid Workers AI.
  - Azure unsupported-language or invalid-request: terminal policy error for the comment/batch; do not retry on another provider.
- Paid plan cap/error behavior:
  - OpenAI mini recoverable timeout/429/5xx: bounded retry/backoff, then Azure Translator fallback only if Azure env is configured and budget remains below hard stop.
  - OpenAI mini policy/content/output-parse failure: do not fallback automatically. Skip with sanitized provider-error class so Task 20 can distinguish moderation, parser, and provider errors.
  - Azure fallback cap exhaustion: stop translation; do not cascade to Gemini, DeepL, or Workers AI without a separate policy update.
- Gemini, DeepL, and Workers AI are not automatic fallback providers for initial launch. They require a later implementation alignment PR plus legal/cost acceptance.
- Fallback output remains sanitized metadata only. Do not record raw comments, provider target metadata, provider identifiers, token values, Authorization header values, liveChatId values, owner user id values, or provider channel id values in docs, logs, PR body, browser storage, or handoff payload.

## Budget Controls

Initial policy defaults:

- The monthly budget is an operator-owned safety ceiling for translation provider spend and must be lower than provider account hard limits.
- `COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD` is required before paid provider execution is enabled.
- `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO=0.70` policy value: stop starting new paid translation sessions and show operator/admin warning.
- `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO=0.85` policy value: stop new and ongoing translation execution with sanitized budget stop.
- Free Azure policy cap:
  - Soft stop Free plan new sessions at 80% of the Azure F0 monthly character allowance.
  - Hard stop Free plan translation execution at 90% of the Azure F0 monthly character allowance.
  - Never depend on provider-side hard stop as the first protection.
- Per-session controls from the public requirements remain in force: 30 min/day/user, 30 min/session, 1 active session/user, and 30 translated messages/min for Free.
- Provider-specific dashboard spend caps, usage alerts, and account-level hard limits must be configured by the operator before live/provider smoke. This document records environment names only, not values.
- Monthly/yearly plan presentation implication: current paid value starts from Comment Translator limit expansion. Future covered tools may be added later; price/content changes must be announced in advance. This policy does not create Stripe Prices or approve billing setting mutation.

## Provider Environment Names

Environment names only. Values must remain operator-local/server-only and must not appear in docs, fixtures, browser storage, PR body, or handoff payload.

Policy and budget:

- `COMMENT_TRANSLATOR_FREE_TRANSLATION_PROVIDER`
- `COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER`
- `COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD`
- `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO`
- `COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO`
- `COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP`

Azure Translator:

- `AZURE_TRANSLATOR_KEY`
- `AZURE_TRANSLATOR_ENDPOINT`
- `AZURE_TRANSLATOR_REGION`

OpenAI mini:

- `OPENAI_API_KEY`
- `OPENAI_TRANSLATION_MODEL`

Gemini Flash/Lite:

- `GEMINI_API_KEY`
- `GEMINI_TRANSLATION_MODEL`

Cloudflare Workers AI:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_MODEL`
- `CLOUDFLARE_AI_GATEWAY_ID`

DeepL:

- `DEEPL_AUTH_KEY`
- `DEEPL_API_BASE_URL`
- `DEEPL_TIMEOUT_MS`

## No-Live-Call Boundary

No provider API call was made for Task 19. No DeepL, Azure, OpenAI, Gemini, Cloudflare Workers AI, YouTube, Stripe, deploy/upload, remote mutation, provider target lookup, liveChatId lookup, browser storage expansion, or handoff payload expansion is approved or executed by this policy.

Live/provider execution still requires same-thread/operator-local same-command-process ready preflight, sanitized output review, and explicit in-thread approval.

## Official Source Notes

Primary official sources inspected for this policy:

- DeepL supported languages: https://developers.deepl.com/docs/getting-started/supported-languages
- DeepL data security: https://www.deepl.com/en/pro-data-security
- DeepL API plans: https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans
- Azure Translator pricing: https://azure.microsoft.com/en-us/pricing/details/translator/
- Azure Translator language support: https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support
- Microsoft Translator FAQ/free-tier behavior: https://www.microsoft.com/en-us/translator/business/faq/
- Microsoft Translator no-trace/data posture: https://www.microsoft.com/en-us/translator/business/notrace/
- Azure Translator data/privacy/security: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/translator/data-privacy-security
- OpenAI mini model pricing reference: https://developers.openai.com/api/docs/models/gpt-4o-mini
- OpenAI data-use policy: https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Gemini API terms: https://ai.google.dev/gemini-api/terms
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare Workers AI model catalog: https://developers.cloudflare.com/workers-ai/models/
- Cloudflare Workers AI limits: https://developers.cloudflare.com/workers-ai/platform/limits/
- Cloudflare responsible AI posture: https://www.cloudflare.com/trust-hub/responsible-ai/
- Cloudflare AI Gateway logging: https://developers.cloudflare.com/ai-gateway/observability/logging/
- Cloudflare AI Gateway rate limiting: https://developers.cloudflare.com/ai-gateway/features/rate-limiting/

Pricing and terms must be rechecked in the provider dashboard/account immediately before Task 20 implementation alignment, live/provider smoke, and Stripe paid launch. If official pricing pages display region/account-specific values, use the account quote as launch evidence but record only sanitized metadata.

## Task 20 Handoff

Task 20 should align runtime implementation to this policy without widening storage or live execution:

- Add server-owned provider routing from Free/Paid entitlement to Azure/OpenAI mini policy.
- Keep exact provider selection and model ids in server-only env.
- Enforce strict JSON/output parsing for OpenAI mini before returning translated text.
- Preserve same-language validation, language filters, dedupe/cache, per-minute caps, and budget stops before provider calls.
- Keep provider usage estimates sanitized and server-owned.
- Do not run live provider calls until the explicit live/provider smoke gate is satisfied.
