# Kuro Live Comment Translator Free Beta PL-G6D Preview Rate-Limit Smoke Override

Status: local repository readiness only. No Cloudflare environment mutation, deploy/upload, preview browser smoke, live/provider execution, OAuth flow, target lookup, Supabase operation, Stripe action, public gate change, or main promotion was performed. Public-release capable: no.

## Purpose And Fixed Boundaries

PL-G6D prepares a narrowly bounded way to browser-verify the Free translated-messages-per-minute boundary when one account cannot produce enough eligible provider executions in one rolling window.

- Normal Free behavior remains the standard production per-minute limit.
- The smoke limit is fixed in server code; no numeric environment value is accepted.
- The override is inactive for unset, malformed, numeric-only, non-preview, production, or non-allowed-tester states.
- The server-owned entitlement is the sole override authority. Browser-safe usage display, pre-provider enforcement, polling stop reason, and rolling-window recovery all consume that entitlement.
- Cache hits, filtered messages, and other non-provider-executed messages do not consume the translated-message provider limit.
- Browser output remains limited to sanitized usage and stop-reason metadata.

## Cloudflare Preview-Only Operator Setup

Apply only after a separate same-thread approval for the exact preview environment mutation. This document does not grant that approval.

In the Cloudflare Workers preview version's Variables and Secrets surface, add these non-secret text bindings only to the reviewed preview version:

| Label | Required | Scope | Operator instruction |
| --- | --- | --- | --- |
| `COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL` | smoke-only | Cloudflare preview only | Set the reviewed Cloudflare preview runtime-channel label. Do not add it to production. |
| `COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE` | smoke-only | Cloudflare preview only | Set the exact reviewed fixed smoke-marker label defined by the repository. Do not substitute a numeric value. |
| `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES` | existing private-launch requirement | existing allowed-tester boundary | Keep the existing hash allowlist unchanged except through its established approved process. |

The marker is a reviewed non-secret label, not a credential. Do not place it in browser storage, client code, raw logs, screenshots containing private state, or production configuration. Do not treat `VERCEL_ENV`, a branch name, a preview URL, or a numeric value by itself as activation evidence.

Cloudflare Workers preview uploads create a preview version. The reviewed preview version must carry the runtime-channel binding; production must remain unset or explicitly non-preview. Version-specific binding changes and any later upload/deploy are external mutations and require a separate same-thread approval.

## Local Contract Coverage

`node scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs` verifies:

- normal limit for unset, malformed, numeric-only, and production-channel states;
- activation only for the exact marker plus Cloudflare preview channel plus existing allowed tester;
- non-allowed callers cannot activate the override;
- entitlement, display, provider preflight, and rolling-window code consume the same server-owned limit boundary;
- cache-hit/provider-executed accounting separation and sixty-second rolling-window reset wiring remain present.

Before an approved browser smoke, run the focused contract and its affected sibling contracts locally. Stop before the first environment apply, preview upload/deploy, or live/provider/browser operation and request exact approval with a sanitized scope.

UI/browser width QA is skipped for this repository slice because it changes only server-owned entitlement resolution, server route/action wiring, deterministic contracts, and operator documentation. It adds no client component, rendered copy, CSS, layout, browser storage, or visible normal-state change.

## Sanitized Production Boundary Attempt Record

| Label | Status |
| --- | --- |
| `total` | `31` |
| `peak_rolling` | `14-of-30` |
| `boundary_status` | `inconclusive-window-not-saturated` |
| `post_stop` | `pass` |
| `post_stop_window` | `0-of-30` |

This is not a product failure and does not establish a per-minute boundary pass. Manual one-account posting was not suitable for producing the required eligible provider executions within one rolling window.
