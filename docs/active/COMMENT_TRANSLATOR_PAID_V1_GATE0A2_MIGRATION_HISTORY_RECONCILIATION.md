# Comment Translator Paid Core v1 Gate 0-A2 Migration History Reconciliation

Status: Gate 0-A2 Task 11 remote evidence closeout. The current repository migration inventory is 35 entries; historical source-era evidence remains 34 and historical Preview post-apply evidence remains 29. A current sanitized Preview read-only observation verifies an exact 30-entry remote inventory containing the Task 11 migration exactly once. This closeout did not apply or repair migration history and does not claim deployed runtime or artifact identity.

## Evidence state

- `repository-merged`: PR #810 merge at `04247e49c7abfd02f7ee9fb0d7fff0de68ddd9a2` is the current compatibility and remote-evidence input authority. PR #809 merge at `8538befbd6513d057bcf1f558fecc7a5ce2d5102` remains the repository rebaseline input contained by that merge.
- `historical-A2-execution-authority`: PR #801 / commit `b1cba3c5fe5191907a512fa2f8d5e975a714a9d8` remains the authority for the historical Preview execution record below; it is not the current authority or latest merge.
- `locally-verified`: the rebaseline contract keeps the historical 33-entry baseline and 34-entry source-era evidence explicit, adds only the one-entry post-reconciliation list, and requires exact current/clean-install inventory equality. The Gate 0-A2 contract uses an LF-canonicalized source SHA assertion: CRLF and standalone CR line endings are normalized to LF before hashing, while non-EOL content changes still change the SHA-256. The current dependency-restored bundle passed all 33 matching contracts.
- `historical-externally-read-only-verified`: after the separately approved historical history-only reconciliation and ordered two-migration apply, a sanitized Preview readback proved 29 total / 29 unique history entries with the exact historical expected inventory, both Task 6 entries exactly once, and no extra, missing, duplicate, or unknown entry. This record is not current Task 11 remote evidence.
- `historical-deployed Preview evidence`: the historical database migrations were externally verified as applied to the then-linked Preview target. This does not prove the current repository migration was remotely applied, a deployed application/Worker artifact, or artifact identity.
- `current-Task-11-externally-read-only-verified`: an explicitly selected unique active Preview candidate returned 30 total / 30 unique migration entries in exact expected order: the historical post-apply 29 plus `20260831100000_comment_translator_paid_task11_message_rate_runtime_repair` exactly once. Both repaired functions have one exact signature and no overload, semantic canonical source equality, expected repair markers, `SECURITY DEFINER`, exact `pg_catalog, public` search path, postgres ownership, and service-role-only execute authority. Raw stored body text is not byte-identical after outer-whitespace normalization, so this evidence claims semantic canonical equality rather than raw textual identity.
- Deterministic contract fixtures are source-contract evidence only, are explicitly `not-live`, and must never be accepted or described as fresh Preview runtime evidence. The operator path requires a separately supplied sanitized external read-only observation with an explicit successful result and current-preflight freshness provenance.
- `ARTIFACT_IDENTITY=UNKNOWN`: no comparable deployed source/build digest is available for the current repository or Task 11 runtime. Scheduler remains outside this source-only change and is not activated here.
- TDD record: the current focused contract first exited 1 at the source-inventory assertion because the Task 11 migration was actual-only; the rebaseline GREEN run verifies the explicit 35-entry current/clean-install inventory and refreshed eighth pair fixture. After the user restored lockfile dependencies with `npm ci`, all 33 matching contracts passed (33/33), including the five checks previously setup-blocked by absent `node_modules/typescript`; tracked manifest and lockfile content remained unchanged.
- Scheduler baseline contract: the previously observed Preview state has exactly one existing job with `active=false`; post-apply checks require that baseline to remain unchanged while every create/alter/activate/deactivate/delete operation delta is zero. An isolated-empty clean-install target expects zero jobs and `active=false`, with the same zero-operation deltas. No scheduler action is performed by this PR.

Current compatibility and remote-evidence input authority is PR #810 merge at `04247e49c7abfd02f7ee9fb0d7fff0de68ddd9a2`, tree `c54a2b4028a1f0dd2388981df0718e4d7ffe9da8`. PR #801 / `b1cba3c5fe5191907a512fa2f8d5e975a714a9d8` is retained only as historical A2 execution evidence authority and is not described as the current authority or latest merge.

## Compatibility rebaseline authority

The current repository inventory is the historical 33-entry local baseline plus the canonical remote-only source (historical source-era 34) plus one explicit post-reconciliation local migration. The filesystem inventory is compared for complete equality; no arbitrary migration is auto-accepted. The current clean-install fixture is the exact chronological 35-entry repository inventory. Task 11 remote presence and function semantics are externally read-only verified; the actor and time of the already-completed apply are not attributed to this closeout. Deployed runtime and artifact identity remain independently unverified.

Sanitized authority markers:

- historical-a2-local-baseline=33
- historical-a2-source-era-local=34
- historical-a2-preview-post-apply=29
- current-repository-clean-install-inventory=35
- task11-remote-apply-evidence=externally-read-only-verified
- current-compatibility-base=04247e49c7abfd02f7ee9fb0d7fff0de68ddd9a2
- task11-preview-target-selection=unique-active-preview-candidate
- task11-local-link-metadata=absent
- task11-preview-history=30-total-30-unique-exact
- task11-preview-history-entry=exactly-once
- task11-preview-function-signatures=2-exact-single-overload
- task11-preview-semantic-canonical=verified
- task11-preview-raw-body-identity=not-byte-identical-semantic-canonical-equal
- task11-preview-security=verified
- task11-preview-scheduler=1-total-0-active
- task11-preview-vault=2-names-values-not-read
- task11-closeout-mutation=none
- task11-deployed-artifact-identity=unknown

## Current Task 11 Preview read-only evidence

The repository checkout had no local Supabase link metadata, so no linked-target fallback was attempted. The authenticated Supabase project list contained two projects and exactly one active candidate whose project name identified it as Preview; only that candidate was selected. Project references, URLs, organization values, credentials, private identifiers, raw SQL output, raw errors, and raw function definitions were not printed or persisted.

The first and final migration-history reads both returned 30 total / 30 unique entries. The complete ordered inventory exactly matched the historical 29-entry Preview post-apply inventory plus the Task 11 migration exactly once, with zero missing, extra, duplicate, or later entries. Because Task 11 was already present, no migration apply, history repair, retry, or dry-run apply was performed.

SELECT-only catalog checks found one exact overload for each of `ct_paid_reserve_message_rate(uuid,text,text,integer,timestamptz)` and `ct_paid_finalize_message_rate(uuid,text,text,integer,timestamptz)`. Both stored bodies matched the repository migration after lowercasing, comment removal, and whitespace canonicalization; both required repair markers were present and the legacy conflict-target marker was absent. The raw stored bodies were not byte-identical after outer-whitespace normalization, so raw textual identity is not claimed. Both functions retained `SECURITY DEFINER`, exact `pg_catalog, public` search path, postgres ownership, PUBLIC/anon/authenticated execute revocation, and service-role execute authority.

The current sanitized side-effect snapshot was one scheduler job with zero active jobs and two relevant Vault names. Vault values were not read. This closeout performed only project listing, migration-history listing, and SELECT-only catalog reads; it invoked no function and performed no database, scheduler, Vault, Cloudflare, Stripe, provider, browser, or production mutation. `ARTIFACT_IDENTITY=UNKNOWN` remains unchanged.

## Historical Preview post-apply execution evidence

The separately approved historical Preview operation completed in strict order. The history-only reconciliation retained the same-version `20260815090000_comment_translator_paid_cron_vault_transport` entry as matched and did not repair or rerun it. A dry-run then selected exactly the two approved Task 6 files and no unrelated local-only migration. The first apply produced an exact 28 total / 28 unique readback with only `20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility` newly present; the second produced the final exact 29 total / 29 unique inventory with `20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair` also present exactly once. The final dry-run proposed zero migrations. This historical record is not evidence that the current Task 11 migration was remotely applied.

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

The historical pre-source observation is local baseline 33, remote 27, timestamp union 42, matched 18, local-only 15, and remote-only 9. The Paid subset is local-only 10 and remote-only 9. Adding the canonical same-version source produced the historical source-era local inventory of 34, matched 19, local-only 15, and remote-only 8. The current repository inventory is separately rebaselined to 35 by the explicit post-reconciliation Task 11 migration, which was local-only in the historical remote observation and is now externally observed exactly once in the current Preview history.

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

The procedure below is retained as the historical fail-closed execution record. It was completed for the then-linked Preview target under separate approvals; it does not authorize repeating any operation. The clean-install path was not used.

### Common read-only preflight

1. Explicitly select exactly one target kind before any target access: `isolated-empty` for clean install, using a separate isolated database, or `preview` for the confirmed Preview database. There is no default target and no automatic fallback between them; an unknown or unconfirmed target is a hard stop.
2. Use a clean operator checkout at the merged A2 source and verify branch/base/tree, migration file SHA-256, independent fixture result, and body semantic MD5.
3. Run a read-only migration history listing against only the explicitly selected target. Do not print project IDs, URLs, tokens, secret values, request IDs, or raw errors.
4. Route to the matching path below only after the target kind and read-only history are confirmed. A target-kind mismatch, unknown target, or uncertain history stops before SQL or history mutation and cannot continue automatically.

### Clean-install path

For a separately selected `isolated-empty` database, do not run migration-history repair. Immediately before any clean-install SQL, re-list migration history read-only and prove it is empty. A Preview target, any non-empty history, an unknown/unconfirmed target, or an uncertain readback is a hard stop before execution and cannot continue automatically. Only after that empty-history revalidation may the operator apply the current canonical local inventory once in strict chronological order, including the canonical `20260815090000` source, both allowlisted Task 6 migrations, and the explicit post-reconciliation Task 11 migration. Submit only one migration at a time. After each submission, wait for an explicit successful history readback proving that exact canonical entry is present once before submitting the next migration. All 35 successful readbacks reach only the intermediate `clean-install-complete` state and prove 35 expected history entries and 35 SQL executions. Completion additionally requires an explicit successful post-apply read-only-check transition covering that exact history, seven-statement source exactness, function security/search path, ACLs, comment, isolated-empty scheduler baseline of zero inactive jobs, and no scheduler/Vault secret side effects. A missing, failed, uncertain, incomplete, duplicate, or mismatched post-check observation enters `stopped` and cannot continue. The checks do not change SQL, history, or operation counts.

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

Rollback for this documentation-and-contract closeout is a normal source/branch revert followed by read-only reinspection. Remote history repair rollback, SQL rollback, `db reset`, destructive DDL/DML, scheduler activation, Vault changes, and any cleanup are outside this approval and require a separate explicit operator decision. Existing RPC privilege, owner/lease, provider idempotency, and Stripe/Supabase boundaries must remain unchanged.

## Approval boundary

Approved for this closeout: the completed sanitized Supabase read-only preflight, documentation and deterministic contract updates, local verification, commit, feature-branch push, and PR creation. The historical remote history repair, two Task 6 additive applies, and already-present Task 11 migration are evidence only and were not executed here. Not authorized here: remote migration/history mutation, SQL write, function invocation, Cron/Vault/project change, scheduler activation, Cloudflare/Stripe/provider operation, deploy, browser QA, merge, dependency installation, or worktree cleanup.
