# Comment Translator Paid Core v1 Gate 0-A2 Migration History Reconciliation

Status: Preview post-apply evidence closeout. The approved history reconciliation and the two additive Task 6 migrations are complete for the currently linked Preview target. This document does not authorize another history repair, migration apply, SQL write, scheduler/Vault change, deploy, activation, or live provider/payment operation.

## Evidence state

- `repository-merged`: PR #799 introduced the Gate 0-A2 canonical source and reconciliation contract; PR #800 repaired the Task 6 guard shape; PR #801 completed the approved whitespace-normalized exactly-one correction. The current authority is the merged Preview branch described below.
- `locally-verified` (focused evidence only): the provider contract and migration parser pass at the current authority. The Gate 0-A2 contract uses an LF-canonicalized source SHA assertion: CRLF and standalone CR line endings are normalized to LF before hashing, while non-EOL content changes still change the SHA-256.
- `externally-read-only-verified`: after the approved history-only reconciliation and ordered two-migration apply, a fresh sanitized Preview readback proved 29 total / 29 unique history entries with the exact expected inventory, both Task 6 entries exactly once, and no extra, missing, duplicate, or unknown entry. The post-apply semantic, privilege, ownership, lease, scheduler, and Vault-name-count checks described below passed without invoking an RPC/function or performing another mutation.
- `deployed Preview`: the database migrations are externally verified as applied to the known linked Preview target. This is not evidence that a separately deployed application/Worker artifact corresponds to the repository authority.
- Deterministic contract fixtures are source-contract evidence only, are explicitly `not-live`, and must never be accepted or described as fresh Preview runtime evidence. The operator path requires a separately supplied sanitized external read-only observation with an explicit successful result and current-preflight freshness provenance.
- `ARTIFACT_IDENTITY=UNKNOWN`: no comparable deployed source/build digest was available. Scheduler remains outside this source-only change and is not activated here.
- TDD record: before the canonical source existed, the focused contract exited 1 at the canonical-source existence assertion (`false !== true`); after adding the source, `node --check` and the focused contract exited 0 with PASS. The current bundle result is 24/29 runnable PASS and 5/29 setup-blocked because `node_modules/typescript` is absent; no dependency installation was performed. Final spec and code-quality reviews are GO. Remaining full toolchain checks are setup-blocked, and setup-blocked checks are not represented as passes.
- Scheduler baseline contract: the previously observed Preview state has exactly one existing job with `active=false`; post-apply checks require that baseline to remain unchanged while every create/alter/activate/deactivate/delete operation delta is zero. An isolated-empty clean-install target expects zero jobs and `active=false`, with the same zero-operation deltas. No scheduler action is performed by this PR.

Authority is `origin/codex/comment-translator-paid-v1-preview` at `b1cba3c5fe5191907a512fa2f8d5e975a714a9d8`, tree `2e1274c7cc796f9575425d47b5fa4f2ed298767e`. PR #799, PR #800, and PR #801 are merged into that authority; PR #801 is the latest merge.

## Post-apply execution closeout

The approved Preview operation completed in strict order. The history-only reconciliation retained the same-version `20260815090000_comment_translator_paid_cron_vault_transport` entry as matched and did not repair or rerun it. A dry-run then selected exactly the two approved Task 6 files and no unrelated local-only migration. The first apply produced an exact 28 total / 28 unique readback with only `20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility` newly present; the second produced the final exact 29 total / 29 unique inventory with `20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair` also present exactly once. The final dry-run proposed zero migrations.

Sanitized post-apply evidence:

- the eight fixed remote-to-canonical mapping pairs were 8/8 for semantic, privilege, owner, and lease evidence;
- the canonical Azure fallback semantic source SHA-256 was `5a8b759532ebba939a8c2d5331d24782b9ece7647adcbb71b588cd7985c3ca5f`, and the generated remote function-definition MD5 was `db0a213efd8c48f30fb0353fc27eb723`;
- the hardened uncertain-retry guard, compatibility marker, provider idempotency and provider authority boundaries, function ownership, `SECURITY DEFINER`, fixed search path, and ACL restrictions matched the contract;
- the transport helper remained unchanged: normalized body semantic MD5 `ee28c4f97fb47ab70e0ae48248e56693`, generated function-definition MD5 `3c83f5957755dd833bd077c83163e1ea`, and LF-canonicalized source SHA-256 `df6fea22e6be4be7563b272088b26813f99394fcb7ddcbd76125e69663b1b9ca`;
- the existing lifecycle/capacity SELECT boundaries, maintenance wrapper, owner/lease behavior, Azure uncertain-retry/provider boundary, and Stripe/Supabase separation were not weakened;
- remote statements were verified through sanitized booleans/hashes to contain no environment-specific value, HTTPS literal, token value/header, job name, Vault write, or scheduler mutation;
- scheduler state remained exactly one existing job with the expected schedule and `active=false`; create/alter/activate/deactivate/delete deltas were all zero;
- relevant Vault names count was 2; Vault values were never selected, displayed, or stored;
- RPC/function invocation count was zero, and no Cloudflare, Stripe, provider, browser, deploy, Production, or activation operation was performed.

The isolated operator directory is retained as ignored local evidence and was not cleaned up. It is not part of this repository closeout patch. `ARTIFACT_IDENTITY=UNKNOWN` remains unchanged because no comparable deployed application artifact digest was available.

## Observed history baseline

The counts below are the pre-source observation: local baseline 33, remote 27, timestamp union 42, matched 18, local-only 15, and remote-only 9. The Paid subset is local-only 10 and remote-only 9. After adding the same-version source in this PR, the expected local source inventory is 34, matched is 19, local-only is 15, and remote-only is 8.

| Remote observed entry | Canonical local entry | Classification and safe treatment |
| --- | --- | --- |
| `20260815090000_comment_translator_paid_cron_vault_transport` | `20260815090000_comment_translator_paid_cron_vault_transport` | Same-version source match; never repair or rerun it. |
| `20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair` | `20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair` | Same-name timestamp mismatch; history-only mapping. |
| `20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair` | `20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair` | Semantic lifecycle repair already applied under a noncanonical remote name/timestamp; history-only mapping. |
| `20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair` | `20260819110000_comment_translator_paid_gate0a_capacity_read_repair` | Semantic capacity repair already applied under a noncanonical remote name/timestamp; history-only mapping. |
| `20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery` | `20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery` | Same-name timestamp mismatch; history-only mapping. |
| `20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair` | `20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair` | Same-name timestamp mismatch; history-only mapping. |
| `20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor` | `20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor` | Same-name timestamp mismatch; history-only mapping. |
| `20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization` | `20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization` | Same-name timestamp mismatch; history-only mapping. |
| `20260827024331_comment_translator_paid_checkout_expiry_finalize_lease` | `20260827020609_comment_translator_paid_checkout_expiry_finalize_lease` | Same-name timestamp mismatch; history-only mapping. |

The six requested same-name timestamp mismatches are poll budget, unbound hold, schedule privilege, checkout recovery floor, recovery floor second canonicalization, and checkout expiry finalize lease. Lifecycle and capacity are the two semantic noncanonical mappings. The two genuinely absent remote migrations, and the only A2 additive allowlist, are:

1. `20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility`
2. `20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair`

The contract embeds the complete observed local and remote inventories, so a swapped mapping cannot pass merely by preserving aggregate counts.

## Remote-only source exactness

The remote-only `20260815090000` migration was observed as exactly seven statements, in this order:

1. create the `private` schema if absent;
2. revoke public/anon/authenticated usage on that schema;
3. grant schema usage to `service_role`;
4. create the zero-argument `private.ct_paid_invoke_maintenance_from_vault()` function;
5. revoke default function execute from public/anon/authenticated/`service_role`;
6. grant function execute only to `service_role`;
7. set the exact sanitized function comment.

The source contract compares the file to an independent fixture and asserts balanced SQL, exact statement order, fixed `SECURITY DEFINER` search path, the two stable Vault reference names, count/null/blank fail-closed guards, delegation to the existing `public.ct_paid_invoke_maintenance_http(..., 'supabase-cron')`, and the service-role-only boundary. It rejects scheduler creation/alteration, Vault writes, URL/token values or headers, private identifiers, destructive operations, and unrelated SQL.

Read-only catalog evidence for the already-applied function was:

- function body semantic MD5 after lower-case/whitespace normalization: `ee28c4f97fb47ab70e0ae48248e56693`;
- generated PostgreSQL function-definition MD5: `3c83f5957755dd833bd077c83163e1ea` (formatting-sensitive catalog output, not a byte-equality claim);
- LF-canonicalized source file SHA-256 in this worktree: `df6fea22e6be4be7563b272088b26813f99394fcb7ddcbd76125e69663b1b9ca`;
- `private` schema ACL: only database owner and `service_role` usage;
- function ACL: only database owner and `service_role` execute;
- `SECURITY DEFINER` and the exact sanitized comment were present;
- no Vault values were read or stored, and the observed remote migration contained no HTTPS literal, token header/value, job name, or environment-specific value.

## Historical operator convergence plan

The procedure below is retained as the fail-closed execution record. It was completed for the currently linked Preview target under separate approvals; it does not authorize repeating any operation. The clean-install path was not used.

### Common read-only preflight

1. Explicitly select exactly one target kind before any target access: `isolated-empty` for clean install, using a separate isolated database, or `preview` for the confirmed Preview database. There is no default target and no automatic fallback between them; an unknown or unconfirmed target is a hard stop.
2. Use a clean operator checkout at the merged A2 source and verify branch/base/tree, migration file SHA-256, independent fixture result, and body semantic MD5.
3. Run a read-only migration history listing against only the explicitly selected target. Do not print project IDs, URLs, tokens, secret values, request IDs, or raw errors.
4. Route to the matching path below only after the target kind and read-only history are confirmed. A target-kind mismatch, unknown target, or uncertain history stops before SQL or history mutation and cannot continue automatically.

### Clean-install path

For a separately selected `isolated-empty` database, do not run migration-history repair. Immediately before any clean-install SQL, re-list migration history read-only and prove it is empty. A Preview target, any non-empty history, an unknown/unconfirmed target, or an uncertain readback is a hard stop before execution and cannot continue automatically. Only after that empty-history revalidation may the operator apply the canonical local inventory once in strict chronological order, including the new `20260815090000` source and both allowlisted Task 6 migrations. Submit only one migration at a time. After each submission, wait for an explicit successful history readback proving that exact canonical entry is present once before submitting the next migration. All 34 successful readbacks reach only the intermediate `clean-install-complete` state and prove 34 expected history entries and 34 SQL executions. Completion additionally requires an explicit successful post-apply read-only-check transition covering that exact history, seven-statement source exactness, function security/search path, ACLs, comment, isolated-empty scheduler baseline of zero inactive jobs, and no scheduler/Vault secret side effects. A missing, failed, uncertain, incomplete, duplicate, or mismatched post-check observation enters `stopped` and cannot continue. The checks do not change SQL, history, or operation counts.

### Already-applied Preview path

The existing Preview database already contains the remote-only source and the eight semantically applied repairs under noncanonical history entries. The order is fixed:

1. Read-only preflight and semantic/hash verification.
   Before the first history operation, confirm the explicitly selected target kind is exactly `preview`, compare the externally observed complete and unique history inventory exactly to the contract inventory, and require body semantic MD5 `ee28c4f97fb47ab70e0ae48248e56693` plus generated function-definition MD5 `3c83f5957755dd833bd077c83163e1ea`. Collect one explicit sanitized evidence envelope containing all eight pair records, with each pair's semantic, privilege, owner, and lease evidence externally revalidated and with an explicit successful result plus fresh external read-only-observation provenance. Missing, wrong-count, duplicate, mismatched, unverified, failed, or uncertain records stop before any history mutation. Only that complete envelope sets the `pairEvidenceVerified` preflight gate, which is required again before every revert/apply; each operation also retains its per-pair evidence check. Deterministic source fixtures are `not-live` contract evidence and cannot satisfy the operator gate. Confirm the two absent Task 6 files are the only approved Paid additive files; if the CLI presents any other pending migration, including unrelated non-Paid local-only baseline entries, stop before apply.
2. For each of the eight fixed pairs, perform history-only `reverted(remote_version)` as a distinct operation, then explicitly re-list the complete externally observed history and compare it exactly to the expected post-revert inventory. Only a complete, unique, exact readback permits the distinct next operation, `applied(local_version)`. Explicitly re-list the complete externally observed history again and compare it exactly to the expected post-apply inventory before advancing to the next pair. Any unknown, duplicate, extra, missing, failed, or uncertain readback stops in the partial state and cannot continue; the readback must never synthesize an expected entry. The same-version `20260815090000` target remains untouched throughout. These operations change migration history labels only and must execute zero historical SQL. Process exactly one pair at a time and exactly two history-only operations per pair, in that order.
3. Leave the same-version `20260815090000` entry matched; never repair or rerun it. The expected state is `history-repair-complete`.
4. Run a dry-run using an explicit two-file allowlist containing only the two Task 6 files above. The full repository has five unrelated non-Paid local-only baseline entries, so a command that proposes them or any other file is a hard stop. The expected state is `only-two-allowlisted-additive-pending`.
5. With separate apply approval, apply the allowlist in order: `20260813135500` first, then `20260829100000`. Each successful SQL submission enters an awaiting-readback phase; only an explicit successful readback of that exact migration enables the next submission. Both readbacks reach only the intermediate `additive-complete` state. Any apply or readback failure or uncertainty stops the next phase and cannot automatically continue.
6. From `additive-complete`, submit an explicit post-apply read-only-check result and an exact sanitized observation set proving: history has the eight canonical repaired versions plus the matched `20260815090000` entry; both Task 6 entries are present once; canonical source exactness, catalog/RPC privileges, comment, maintenance-wrapper security-definer/search path, and the pre-existing Preview scheduler baseline of one inactive job with zero create/alter/activate/deactivate/delete deltas, plus absence of new Vault side effects, all match. The same exact check set must include the ordered two-migration Task 6 result, the fixed `ct_paid_azure_direct_fallback` semantic SHA-256, exact function ACL and owner, `SECURITY DEFINER` and `pg_catalog,public` search path, and the hardened uncertain-retry, provider-idempotency, and provider-boundary markers. Only the complete exact successful set reaches final `post-apply-read-only-check`. Missing, failed, uncertain, incomplete, duplicate, or mismatched checks enter `stopped`, cannot continue, and do not change SQL, history, or operation counts.

Blind `db push` is prohibited. A CLI command is acceptable only when its dry-run and explicit selection prove that the exact two-file allowlist is the complete apply set; if the CLI cannot express that selection safely, stop and use a separately approved operator mechanism. Do not invoke the transport function as part of this history reconciliation.

### Stop and rollback conditions

Stop before the next operation or phase on any semantic or hash mismatch, incomplete or invalid eight-pair evidence envelope, missing external provenance/freshness, secret/URL/private-identifier detection, wrong order, unknown or duplicate migration, unexpected pending migration, target mutation, repair/apply/readback error, partial history or clean-install completion, invalid post-apply check result/set, or uncertain external state. In particular, if `reverted(remote_version)` succeeds but `applied(local_version)` fails or is uncertain, preserve that partial history state, enter stopped, and do not automatically continue or retry. A history, clean-install, or post-apply read-only-check failure also enters stopped. Preserve only sanitized state evidence.

Rollback for this source-only PR is a normal source/branch revert followed by read-only reinspection. Remote history repair rollback, SQL rollback, `db reset`, destructive DDL/DML, scheduler activation, Vault changes, and any cleanup are outside this approval and require a separate explicit operator decision. Existing RPC privilege, owner/lease, provider idempotency, and Stripe/Supabase boundaries must remain unchanged.

## Approval boundary

Approved for this closeout: sanitized documentation update, local verification, commit, feature-branch push, and PR creation. The completed remote history repair and two additive applies are evidence recorded from separately approved operations; they are not performed by this closeout change. Not authorized here: another remote migration/history operation, SQL write, Cron/Vault/project change, scheduler activation, Cloudflare/Stripe/provider operation, deploy, browser QA, merge, dependency installation, or worktree cleanup.
