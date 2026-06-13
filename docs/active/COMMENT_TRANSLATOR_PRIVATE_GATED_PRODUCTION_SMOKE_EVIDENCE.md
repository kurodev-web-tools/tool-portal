# Kuro Live Comment Translator Private-Gated Production Smoke Evidence

Status: Task 28 private-gated main promotion / production smoke evidence. Public-release capable: no.

This record stores sanitized evidence after the approved Task 28 Phase 1 main promotion, Phase 2 Cloudflare production build/deploy, and Phase 3 production/custom URL smoke. It does not approve or record Stripe live-mode action, Customer Portal redirect execution, webhook registration, billing setting mutation, remote mutation, remote schema migration, Supabase migration apply, provider target lookup, liveChatId lookup, translation provider API execution, live/provider execution, or public launch gate flip.

Output policy: sanitized-metadata-only. Secret values, token values, OAuth values, authorization code values, owner user id values, provider channel id values, liveChatId values, service-role key values, Authorization header values, Stripe secret values, webhook signing secret values, provider target metadata values, raw comment text, provider response bodies, browser storage payloads, and handoff payload expansion are not requested, displayed, stored, or recorded.

## Merge And Deploy Evidence

- Main promotion PR: #439 `[codex] Promote private-gated comment translator to main`.
- PR state: `MERGED`.
- Base/head: `main` / `codex/comment-translator-main-promotion-post-pr437`.
- Merged at: `2026-06-13T10:36:41Z`.
- Merge commit: `e8508f59e3dbfa3fa0b61dd52e8346f1d1ef0bda`.
- Git containment: merge commit is contained in `origin/main`.
- Production build/deploy evidence: GitHub check run `Workers Builds: v-streamer-tools` completed with conclusion `success` at `2026-06-13T10:38:44Z`.
- Manual Cloudflare upload/deploy command: not run in this evidence PR. Production deployment was represented by the Workers production branch build/deploy check.

## Production Route Smoke

Approved production/custom route smoke used route paths, HTTP status, redirect path labels, and sanitized state labels only.

| Target | Route | Method | Expected sanitized result | Observed |
| --- | --- | --- | --- | --- |
| custom domain | `/tools/comment-translator/` | GET | current app route served | `200` |
| custom domain | `/account/integrations/` | GET | unauthenticated account route redirects to login | `307` -> `/login` |
| custom domain | `/account/billing/` | GET | unauthenticated account route redirects to login | `307` -> `/login` |
| custom domain | `/terms/` | GET | legal route served | `200` |
| custom domain | `/privacy/` | GET | legal route served | `200` |
| custom domain | `/legal/tokushoho/` | GET | legal route served | `200` |
| workers.dev | `/tools/comment-translator/` | GET | current app route served | `200` |
| workers.dev | `/account/integrations/` | GET | unauthenticated account route redirects to login | `307` -> `/login` |
| workers.dev | `/account/billing/` | GET | unauthenticated account route redirects to login | `307` -> `/login` |
| workers.dev | `/terms/` | GET | legal route served | `200` |
| workers.dev | `/privacy/` | GET | legal route served | `200` |
| workers.dev | `/legal/tokushoho/` | GET | legal route served | `200` |

## Private Launch Negative Checks

| Target | Route | Method | Observed sanitized state |
| --- | --- | --- | --- |
| custom domain | `/api/comment-translator/session` | POST | `403`, state `stopped`, launch access `private-launch-gated`, reason `auth-unavailable`, token value `never-returned-by-design`, provider target metadata `forbidden` |
| custom domain | `/api/comment-translator/youtube/credential-status` | GET | `403`, payload status `unavailable`, reason `private-launch-gated`, token value `null`, refresh token value `null` |
| workers.dev | `/api/comment-translator/session` | POST | `403`, state `stopped`, launch access `private-launch-gated`, reason `auth-unavailable`, token value `never-returned-by-design`, provider target metadata `forbidden` |
| workers.dev | `/api/comment-translator/youtube/credential-status` | GET | `403`, payload status `unavailable`, reason `private-launch-gated`, token value `null`, refresh token value `null` |

## Browser And Allowed-Tester Smoke

Unauthenticated route and browser smoke stayed sanitized. The authenticated allowed-tester browser check used the release owner's logged-in browser context and did not inspect cookies, storage, tokens, owner values, provider values, or private identifiers.

| Route | Sanitized result |
| --- | --- |
| `/tools/comment-translator/` | private-launch element absent; `Kuro Live Comment Translator` heading visible; `Start` / `Stop` controls visible; console error count `0`; horizontal overflow `false` |
| `/account/integrations/` | private-launch element absent; YouTube connection controls visible; console error count `0`; horizontal overflow `false` |
| `/account/billing/` | private-launch element absent; Free/Paid plan surface visible; console error count `0`; horizontal overflow `false` |

The allowed-tester allowlist issue observed during smoke was resolved by hashing the lowercase-normalized production Supabase Auth UID before updating `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES`. The UID value and hash value were not recorded.

Width checks on the unauthenticated production tool route passed at `390 / 820 / 1024 / 1280 / 1366px` with no horizontal overflow and no console errors. The allowed-tester checks above were read-only route checks in the authenticated browser context.

## Remaining Gates

Task 28 is not fully complete if the strict `allowed testers can complete account/plan/session smoke` criterion is interpreted to require pressing `Start`. The current evidence covers account and plan surface rendering plus production route/API negative checks, but not session start.

Still not run:

- allowed-tester session start smoke;
- YouTube provider target lookup;
- liveChatId lookup;
- live/provider execution;
- translation provider API execution;
- Stripe Checkout, Customer Portal, webhook registration, live-mode action, or billing setting mutation;
- remote mutation, remote schema migration, or Supabase migration apply;
- public launch gate flip.

## Archived Planning Records

The following planning-only Task 28 records are archived because their externally visible action blockers were resolved or superseded by this evidence record:

- `docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md`
- `docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT.md`

`docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md` remains active as the reference-name-only production environment inventory.

## Width Checks

This evidence/cleanup PR changes docs, task-board notes, and focused contract scripts only. It does not change UI, rendered text, CSS, route behavior, browser storage, or visible layout. New width checks are therefore not required for this PR; production smoke width evidence is recorded above from the approved browser checks.
