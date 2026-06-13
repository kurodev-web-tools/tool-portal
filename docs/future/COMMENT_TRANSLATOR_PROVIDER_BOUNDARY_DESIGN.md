# Kuro Live Comment Translator Provider Boundary Design

Status: provider boundary design plus server-only prototype notes for `codex/comment-translator-preview`.

This note defines the translation provider boundary and the first server-only provider prototype. It keeps the Manual / Paste Input MVP and mock provider behavior intact.

## Scope

- Add a server-only provider interface and pure request / response / error types.
- Keep provider credentials in server runtime env only. Do not put credential values in the client bundle, fixtures, task notes, docs, or PR text.
- Define the quota / billing / usage logging handoff shape for a later trusted server writer.
- No database write, quota enforcement, billing implementation, or usage persistence is included.
- No YouTube OAuth, owner verification, Google API, or platform token handling is included.
- No Live Chat polling is included.
- No public provider endpoint, server action, storage key, IndexedDB key, localStorage key, Supabase schema, migration, RLS policy, or handoff payload change is included.

## Boundary Shape

The provider module is `lib/comment-translator-provider-boundary.ts` and starts with `import "server-only";`.

The boundary has five responsibilities:

1. `CommentTranslationProviderRequest` carries text, language intent, glossary version, cache key material, privacy policy, and usage handoff metadata.
2. `CommentTranslationProviderResponse` carries translated text, detected language, confidence, cache outcome, and usage handoff metadata.
3. `CommentTranslationProviderRecoverableError` represents retryable provider states such as rate limits, temporary unavailability, timeout, or content filtering.
4. `CommentTranslationProviderTerminalError` represents invalid request, unsupported language, missing server runtime credential, or policy-blocked states.
5. `CommentTranslationUsageHandoff` describes what a future quota / billing / usage logging writer would need without writing to a database or enforcing a plan in this slice.

The request boundary is input-source independent. It accepts generic `manual-preview`, `live-comment`, or `fixture-replay` inputs and does not carry YouTube channel IDs, owner verification state, OAuth state, polling cursors, or platform token data.

## Secret Boundary

Provider credentials belong to server runtime env only.

- Client bundle: forbidden.
- Fixtures: forbidden.
- `task.md`, docs, and PR body: no secret values.
- Runtime reading: implemented only in the server-only DeepL prototype module.

The first real provider prototype stays in server-only code and remains separate from the client component and mock fixture module.

## Server-Side Prototype

The prototype module is `lib/comment-translator-deepl-provider.ts` and starts with `import "server-only";`.

Prototype provider:

- provider id: `deepl-text-v2`
- provider candidate: DeepL Text Translation API v2
- server env names: `DEEPL_AUTH_KEY`, `DEEPL_API_BASE_URL`, `DEEPL_TIMEOUT_MS`
- default API base URL: `https://api-free.deepl.com`
- public env prefix: forbidden
- UI / route usage: not wired

Failure semantics:

- Missing server runtime credential returns terminal `credential-missing`.
- Empty text returns terminal `invalid-request`.
- Unsupported source or target language returns terminal `unsupported-language`.
- 429 returns recoverable `rate-limited` with `retryAfterMs` when available.
- Request abort, 408, or 504 returns recoverable `timeout`.
- 5xx returns recoverable `temporary-unavailable`.
- 400 / 413 returns terminal `invalid-request`.
- 401 / 403 / 404 returns terminal `provider-not-configured`.
- Other provider rejections return terminal `policy-blocked`.

Successful responses and recoverable errors include `CommentTranslationUsageHandoff`. The module does not write usage data, enforce quota, or update billing state.

## Quota / Billing / Usage Logging Handoff

This slice only defines the handoff point.

`CommentTranslationUsageHandoff` contains:

- provider id
- billing category
- estimated metered units
- cache outcome
- short-lived diagnostic log policy
- `enforcement: "not-implemented"`
- `databaseWrite: "not-implemented"`

The later server-side prototype may emit this object to a trusted server writer. It must not write `usage_quotas`, update billing state, or enforce paid-plan limits until the billing / quota foundation exists.

## Provider Comparison Axes

| Axis | Decision question | Why it matters |
|---|---|---|
| latency | Can short chat translations return quickly under live stream load? | Prevents stale dock rows. |
| cost | Is per-comment or per-character cost predictable? | Feeds future quota and paid plan thresholds. |
| language-coverage | Are the first source and target languages reliable enough? | Keeps language menus and unsupported-language behavior honest. |
| streaming-suitability | Can many small requests back off gracefully? | Live chat differs from batch translation. |
| glossary-support | Can streamer names and community terms be preserved? | Determines glossary design and provider fit. |
| rate-limit | Are request limits and retry windows explicit? | Maps temporary provider states to recoverable errors. |
| data-retention | How is submitted text retained or used for diagnostics? | Controls privacy copy and provider eligibility. |
| failure-semantics | Are temporary failures, invalid input, policy blocks, and unsupported languages distinguishable? | Keeps recoverable error, terminal error, and moderation skip states separate. |

## Privacy And Cache Notes

- Logs should be short-lived and diagnostic-only.
- PII minimization: exclude author name, channel id, viewer id, stream id, and credential material from provider diagnostics and cache key material.
- Raw text logging stays disabled by default. If diagnostics need samples later, they need an explicit privacy review first.
- Moderation skip reason stays a separate typed value from provider errors. Examples: same language, too short, blocked term, spam suspected, unsupported language, policy review.
- Cache key material should be derived from a normalized text hash, source language, target language, provider capability version, glossary version, and moderation policy version.
- The cache key design does not create or change any storage key, IndexedDB key, localStorage key, database schema, or handoff payload in this slice.

## Future Slices

1. YouTube OAuth / owner verification / Live Chat polling design: platform input boundary separate from provider translation boundary.
2. Billing / quota foundation: trusted server writer, plan state, quota enforcement, and audit policy.
3. Provider comparison follow-up: measure latency, cost, and failure behavior with safe server-only credentials outside source control.
