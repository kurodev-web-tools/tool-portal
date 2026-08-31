# Plan: Comment Translator Paid v1 Task 11 Preview Load Harness

## Goal

Add a Preview-only, bounded, fail-closed Task 11 load harness that uses synthetic run-scoped data, keeps workload execution transactional, and separates SQL/runtime evidence from Supabase Management/Dashboard Egress and Realtime evidence.

## Scope

- Add a standalone Node CLI with `--dry-run`, read-only `--preflight`, transactional `--execute`, and exact run-scoped `--cleanup` modes.
- Add runtime, storage, and cleanup SQL templates with strict run-id markers and no provider, Stripe, Cloudflare, scheduler, or production calls.
- Add a focused static contract test before implementation and keep the existing local-container fixture unchanged.
- Update the existing Task 11 Runbook and `task.md` with commands, official measurement boundaries, and evidence-state labels.

## Acceptance checks

- The contract rejects missing target identity, missing explicit approval, unsafe flags, service-role/db-url paths, raw output, broad cleanup, and unbounded session/run scope.
- The harness only accepts an explicit Preview target, a strict synthetic run ID, and a bounded mode; execution is one transaction with rollback and exact cleanup assertions.
- Runtime fixtures cover 20 sessions, bounded poll/heartbeat/message-rate samples, empty-poll behavior, same-hour OpenAI/Azure fixture receipts, latency percentiles, and sanitized results.
- Storage fixtures cover run-scoped receipt/detail/summary rows and relation/index size observations without claiming Dashboard quota evidence.
- Focused contract, syntax, lint, typecheck, build, and diff checks are run where available. No remote execution is used in this task.

## TDD sequence

1. Write the focused contract against the intended CLI/templates and run it to capture the expected RED failure.
2. Add the smallest CLI and SQL templates that satisfy the contract.
3. Run the contract GREEN, then run repository checks and inspect the complete diff.
4. Obtain a read-only `sol-reviewer` review at medium reasoning and apply only specified corrections.
