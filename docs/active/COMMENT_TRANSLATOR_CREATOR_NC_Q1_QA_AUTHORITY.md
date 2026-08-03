# Comment Translator Creator NC-Q1 Integrated QA Authority

## Status

```text
lane=NC-Q1
scope=local-contract-and-deterministic-fixture-qa
base=codex/comment-translator-free-public-beta-integration
base_merge_commit=10c3adf507d21d61891f62a3b2ee9a24f28ea56d
base_final_head=ce1d064190de3a2db147bc2fedc2633054e1c78e
base_deployment_status=not-confirmed
activation_status=closed
production_proof_status=not-collected
```

NC-Q1 classifies the complete local no-container Creator contract surface before any allowed-tester or live operation. It does not authorize dependency installation, remote reads or writes, migration apply, Stripe/provider/account/token/session operations, authenticated production browser smoke, deploy, activation, or publication.

## Evidence Classes

| Class | Meaning | May prove production/live readiness |
| --- | --- | --- |
| `fixture` | deterministic fake inputs and in-process assertions | no |
| `local` | repository source/contract/build evidence from this checkout | no |
| `gated` | an operation that requires separate approval before execution | no |
| `blocked` | an approved check that cannot run because a prerequisite is absent | no |
| `live` | separately approved, sanitized evidence from the named external target | only for that exact target and operation |

Fixture or local success never satisfies `gated`, `blocked`, `live`, deployed, or production evidence. Merge state is not deployment evidence. Missing evidence stays missing and cannot be inferred from another class.

## Local Matrix

| Area | Required local authority | NC-Q1 assertion |
| --- | --- | --- |
| NC-F1 | existing Free auth/quota/provider behavior | Free remains permanent; unauthenticated and non-paid states cannot enter paid work |
| NC-D1 / NC-E1 | server-derived signed entitlement | missing, unreadable, inactive, incomplete, ambiguous, stale, and replayed evidence fail closed |
| NC-U1 | signed period and idempotent provider-executed usage | pre-provider budget/quota rejection stops provider; provider failure or post-provider usage commit rejection produces no usage success |
| NC-P1 / NC-C1 | server-only provider and bounded dictionary | fixture-only Paid success requires explicit local harness; notes/private data do not become browser output |
| NC-O1 / NC-O2 | digest-only token and safe overlay | one-time secret handling remains outside browser-safe projection; stable route is read-only and token-free |
| NC-M1 / NC-M2 | separate moderator capability and view | OBS/moderator scopes remain separate; browser input is not authority |
| NC-H1 / NC-V1 | seven-day safe history and presentation priority | owner-scoped safe fields only; filters/classification do not authorize, persist, meter, or infer revenue |
| NC-B1 | authenticated allowlisted commands and signed webhook lifecycle | Checkout redirect/completion is not Paid evidence; replay/stale/duplicate/out-of-order failure stays fail closed |
| Legacy 23 | C1-C12, CP1-CP2, P1-1-P1-9 | exactly 23 rows, no unexplained omission, rejected Container recovery count remains zero |

## Deterministic Integration Boundary

The effective NC-Q1 path always observes the fixed closed activation state and performs zero paid accounting, provider, dictionary, billing, token, or persistence side effects. A separate `fixture-only-harness` may exercise the hypothetical cross-lane Paid sequence only when the evidence class is exactly `fixture` and both production and deployed proof are false. That sequence is test coverage, not an activation or production claim.

Only verified signed subscription evidence may create a Paid control case. Checkout completion, local redirect, browser plan state, fixture success, or unsigned lifecycle data cannot write entitlement. Pre-provider budget/quota rejection or unavailability makes no provider call. Provider terminal failure makes no NC-U1 call, while a post-provider duplicate or unavailable NC-U1 commit suppresses the translated result and records no successful usage.

The fixture-only sequence loads and invokes the repository's actual runtime exports without editing production sources: NC-B1 signed webhook → NC-D1 store → NC-E1 authorization → NC-C1 glossary → NC-P1 provider → NC-U1 accounting → NC-V1 classification → NC-H1 projection/store/runtime, with actual NC-O1 → NC-O2 and NC-M1 → NC-M2 capability pairs as parallel consumers. The default actual E1/P1 path remains fixed closed and performs zero downstream calls. The actual H1 Supabase adapter/parser is exercised with an in-memory RPC fixture; exact snapshot/RPC/read-row allowlists ensure owner, session, message reference, unexpected raw fields, and correlation digest do not cross the browser-safe row boundary. The existing persisted-history contract safely downgrades priority to `standard` until a separately approved storage contract change. This behavioral composition is followed by the exact 14 lane contracts; neither part substitutes for live evidence.

## Safety Invariants

- no Container, Docker, Container binding, Container-backed Durable Object, or fallback;
- no secret, cookie, credential, reusable plaintext token, private billing/provider/account identifier, raw external payload, private URL, authorization header, or browser storage authority in evidence;
- browser surfaces receive only server-derived safe projection;
- all production activation gates remain fixed closed;
- Free behavior remains permanent when Creator authority is unavailable or inactive;
- local migrations remain unapplied and cannot be treated as production schema evidence;
- reports contain only sanitized status, classification, command, and count evidence.

## Local Entrypoint

```powershell
node scripts/comment-translator-creator-nc-q1-integrated-qa-contract.mjs
```

The entrypoint runs the exact 14 existing NC-F1/D1/E1/U1/P1/C1/O1/O2/M1/M2/H1/V1/B1 lane contracts plus integrated deterministic assertions. Dependency-backed lint, strict typecheck, Next build, and OpenNext build are separate checks and must be reported as setup-blocked when `node_modules` is absent; dependencies must not be installed without separate approval.

## Non-Claims And Residual Risk

NC-Q1 local acceptance does not prove production Supabase schema/RLS/grants, Stripe signature delivery or pagination, provider/account quota or data handling, real auth/session behavior, real token/capability lifecycle, deployed Worker bindings, browser rendering, or deployment success. Those remain separate external gates. NC-R1 and later release work remain out of scope, and no Product/Price/tax/legal/copy decision is made here.
