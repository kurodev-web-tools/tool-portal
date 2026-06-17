# Kuro Live Comment Translator Free Beta PL-G2A Server Action Route/API Harness

Status: PL-G2A reviewed harness implementation/preflight. Public-release capable: no.

Execution result: reviewed harness implementation/preflight complete; deployed allowed-tester harness execution remains not-run / approval-gated.

This PL-G2A slice adds a safe, inert-by-default route/API harness for the remaining FB-L3 server-owned action surfaces. It does not run deployed smoke, session Start, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, remote Supabase mutation/schema apply, Stripe action, main promotion, limited public beta open, or public launch gate flip.

## Purpose

PL-G2A resolves the FB-L3 gap where the deployed status route had sanitized evidence, but feed, deletion, and Creator locked server action surfaces still lacked a reviewed route/API harness. The harness gives a later approved operator-local run a stable route instead of guessing or scraping Next internal server action endpoints.

## Reviewed Harness Decision

Existing code inspection found no public or semi-public route that safely calls the requested server action surfaces with a deployed allowed-tester cookie while returning sanitized output only. The reviewed choice is an approval-gated/debug-only/server-owned harness route:

- route: `POST /api/comment-translator/free-beta/route-api-harness`;
- inert unless `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED` matches the approval label;
- requires approval header `x-comment-translator-harness-approval`;
- requires the existing private launch allowed-tester gate;
- calls only `getCommentTranslatorRealCommentsFeedAction`, `requestCommentTranslatorDataDeletionAction`, `getCommentTranslatorCreatorLockedWaitlistAction`, and `recordCommentTranslatorCreatorLockedClickAction`;
- returns only action name, status label, count, unavailable reason, and pass/fail.
- Sanitized output summary: action name, status label, count, unavailable reason, pass/fail.

## Existing Route Check

Reviewed inputs:

- `app/tools/comment-translator/actions.ts`
- `app/api/comment-translator/session/route.ts`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`

Finding: `POST /api/comment-translator/session` covers the session route boundary, but no existing reviewed route safely exposes the remaining server action surfaces. Next internal server action endpoints remain out of scope and must not be inferred, scraped, or called.

## Harness Route Contract

The route is intentionally narrow:

- `POST` only;
- no raw request body echo;
- no request header echo;
- no cookie output;
- no cookie values;
- no Authorization header output;
- no Authorization header values;
- no raw action payload output;
- no browser storage read/write;
- no handoff payload expansion;
- no provider target metadata;
- no provider target lookup;
- no liveChatId;
- no liveChatMessages.list;
- no session Start, Stop, or heartbeat;
- no provider/live execution;
- no Azure/OpenAI provider execution;
- no deploy/upload;
- no remote Supabase mutation/schema apply;
- no Stripe.

`recordCommentTranslatorCreatorLockedClickAction` is called with a fixed safe local-draft intent and feature id. It does not persist remote click state and does not mix Paid entitlement C1/C3, Stripe billing, or Creator paid limits into this Free beta harness.

## Sanitized Output Shape

Allowed output fields:

- `action`
- `pass`
- `status`
- `count`
- `unavailableReason`

The route-level wrapper may also return a top-level `status` and `count`. It must not return secret values, OAuth values, token values, Authorization header values, cookie values, service-role values, owner user id values, provider channel id values, credential reference values, provider target metadata, liveChatId values, raw provider payloads, raw comments, server-only cursor values, browser storage payloads, handoff payload expansion, Stripe secret values, or billing identifiers.

## Approval-Gated Execution Preflight

Do not run this against a deployed target until same-thread ready preflight, sanitized output review, and exact explicit approval are present.

Later approved command shape:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/free-beta/route-api-harness" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --header "x-comment-translator-harness-approval: approved-fb-l3-allowed-tester-route-api-smoke" --data "{}"
```

The operator-local command may use only env references for the deployed origin and allowed-tester cookie. Values must not be printed, stored, or documented.

## What This Proves

This PL-G2A implementation proves:

- the remaining FB-L3 server action surfaces have a reviewed harness route;
- the route is disabled unless the debug harness env gate and approval header are present;
- the route still requires private launch allowed-tester authorization;
- output is limited to action name, status label, count, unavailable reason, and pass/fail;
- the harness avoids Next internal server action endpoint guessing.

## What This Does Not Prove

This record does not prove deployed allowed-tester execution because the route was not run against a deployed target in this thread. It also does not prove:

- allowed-tester cookie/session validity;
- deployed target freshness;
- session Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider execution;
- deploy/upload;
- remote Supabase mutation/schema apply;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- main promotion;
- public launch gate flip.

## Unchecked Scope And Residual Risk

Unchecked in PL-G2A:

- deployed harness route execution: not-run / approval-gated
- allowed-tester cookie/session validity: not-run / approval-gated
- deployed target behavior: not-run / approval-gated
- provider/live execution: not-run / approval-gated
- remote Supabase mutation/schema apply: not-run / approval-gated
- deploy/upload: not-run / approval-gated
- Stripe actions: not-run / approval-gated
- public launch gate flip: not-run / approval-gated

Residual risk: PL-G2 remains incomplete until a later approved operator-local run executes the status route and this reviewed harness route with sanitized output. Public release remains blocked and public-release capable: no.

## Completion Verification

Required PL-G2A closeout checks:

- `node scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs`
- changed-files no-secret scan
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

Width checks skipped because PL-G2A changes a server-only route, docs, task notes, and a focused contract only; there is no visible UI/CSS/layout/copy change, rendered page change, browser storage change, or client layout change.
