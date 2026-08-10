# NC-R1 Eight-Row Staged Resolution Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the eight NC-R1 hard requirements other than `EVID-RISK-ACCEPTANCE` through independently approved row groups while retaining NO-GO, closed activation, permanent Free behavior, and NC-L1 not started.

**Architecture:** First add a non-executable, approval-effect-none control-plane manifest to the existing NC-R1 authority/checklist/contract. Then execute Wave A and Wave B only through separately approved child units, recomputing the canonical ledger after every result. NC-R1 may consume sanitized results from independently authorized migration/config/Git/deploy lanes but never owns or implicitly authorizes those operations.

**Tech Stack:** Markdown operational authorities, Node.js `node:assert/strict` contract, existing Comment Translator no-container and NC-Q1 contract suite, authenticated/private tools only after exact child approval.

**Publication boundary:** Commit, push, PR, merge, deploy, activation, and cleanup are not authorized by this plan. Do not add commit steps unless the user separately authorizes Git publication.

## Post-PR Continuation Policy

Do not use a persistent multi-row goal for post-PR execution. After this manifest/contract PR is merged, start a fresh isolated task for exactly one evidence row or one prerequisite child step. That task must re-fetch the integration base, re-read the current ledger and authority documents, issue only a fresh target-matched approval packet, perform no unrelated operation, and finish with either one truthful row closure or one explicit partial stop. It must then report and stop before selecting the next row.

Use the shortest satisfiable path first. Begin with A3 Stripe Cost when its current-day manual account-document read is separately approved; otherwise take only another independently approved row or prerequisite. Continue A2 and A1 independently. Create A4 only from actual satisfied A2/A3 fingerprints, A5 only from the actual A4 artifact, A6 only from the actual A4/A5 artifacts plus exact Copy artifact, B1 only from its actual upstream artifacts and separate deployed proof, and B2 only from B1 plus separate signed-entitlement and live-operation evidence. Never prefill downstream approval IDs or fingerprints.

The current PR publishes the non-executable control plane only. Its merge does not approve any authenticated/private read, provider or Stripe action, funding, payment, migration, configuration, deploy, live flow, public Paid gate, final GO, activation, or cleanup.

---

## Chunk 1: Non-Executable Manifest And Contract

### Task 1: Characterize The Current Contract

**Files:**
- Read: `task.md`
- Read: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md`
- Read: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md`
- Test: `scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs`

- [ ] **Step 1: Reconfirm current Git and dependency state**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
Test-Path node_modules
```

Expected: detached exact base remains recorded; the exact six-path documentation/contract/spec/plan diff is preserved (`task.md`, two NC-R1 docs, the NC-R1 contract, this design, and this plan); `node_modules` is absent unless independently changed by the user.

- [ ] **Step 2: Run the existing focused contract**

Run:

```powershell
node --check scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
```

Expected before manifest implementation: syntax PASS, then focused contract RED only because the approved untracked design and plan are outside the historical four-file authority allowlist. Record the exact two paths; do not misclassify this as runtime/product regression. After Task 3 updates the exact allowlist, require PASS with `decision=no-go; unresolved-hard=9; activation=closed`.

- [ ] **Step 3: Run the staged-manifest RED characterization**

Run:

```powershell
@'
const fs = require('node:fs');
const paths = [
  'docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md',
  'docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md'
];
const text = paths.map((path) => fs.readFileSync(path, 'utf8')).join('\n');
const required = [
  'manifest_type=multi-unit-staged-resolution-control-plane',
  'approval_effect=none',
  'row_group_count=8'
];
if (required.every((marker) => text.includes(marker))) process.exit(0);
console.error('RED: approved eight-row staged manifest is absent');
process.exit(1);
'@ | node
```

Expected: RED because the approved design has not yet been implemented in authority/checklist/contract.

### Task 2: Add The Control-Plane Manifest

**Files:**
- Modify: `task.md`
- Modify: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md`
- Modify: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md`

- [ ] **Step 1: Add the manifest status to the readiness authority**

Add one canonical section containing exactly:

```text
manifest_execution_status=unapproved-non-executable
manifest_type=multi-unit-staged-resolution-control-plane
approval_effect=none
row_group_count=8
row_groups=EVID-WORKER-CPU,EVID-PROVIDER-COST,EVID-STRIPE-COST,EVID-PRODUCT-PRICE,EVID-LEGAL,EVID-COPY,EVID-DEPLOYED-TARGET,EVID-LIVE-PAID-FLOW
row_isolation=required
closure_rule=per-row-only-after-fresh-exact-approved-complete-target-matched-evidence
cross_row_approval=forbidden
cross_row_closure=forbidden
dependency_skip=forbidden
partial_stop_rule=stop-current-row-and-all-dependent-child-units
global_stop_rule=private-exposure,target-mismatch,scope-expansion,unsigned-paid-transition,activation-drift,migration-drift,unapproved-cost-bearing-action,rollback-unavailable
default_incremental_spend_jpy=0
stop_before_any_incremental_charge=yes
unapproved_cost_bearing_action=partial-stop-and-request-separate-budget-approval
risk_acceptance=excluded
final_release_go=excluded
activation_status=closed
free_behavior=permanent
nc_l1_status=not-started
child_approval_unit=required-per-child
child_approval_id=required-unique-per-child
child_explicit_decision=required-per-child
child_target_scope_stop_rollback=required-exact-per-child
```

The section must state that it closes no row and authorizes no operation.

- [ ] **Step 2: Add eight row-group skeletons to the checklist**

Each row group must contain:

```text
row_group_id=<exact-evidence-id>
canonical_primary_approval_unit=<exact-canonical-unit>
row_group_status=unapproved
prerequisite_children=<exact-list-or-none>
row_closing_child=<exact-child-name>
child_approval_ids=<required-unique-approval-ids>
child_exact_target_or_scope=<required>
child_explicit_approval_decision=<required>
executable_child_operation=<exact-operation-or-not-applicable>
executable_child_time_window=<exact-window-or-not-applicable>
executable_child_operator=<named-operator-or-not-applicable>
judgment_child_bound_input=<exact-input-fingerprint-or-not-applicable>
judgment_child_effective_date=<exact-date-or-not-applicable>
judgment_child_named_approver=<kurodev-or-not-applicable>
child_stop_owner=kurodev
child_rollback_owner=kurodev
child_evidence_retention_location=<required>
row_closure=none-until-row-specific-closure-eligible
```

Use these canonical primary units:

- Worker CPU, Provider Cost, Stripe Cost: `authenticated-private-read`
- Product/Price, Legal, Copy: `release-owner-judgment`
- Deployed Target: `deploy-deployed-proof`
- Live Paid Flow: `live-operation`

- [ ] **Step 3: Encode the two-wave dependency order**

Record:

```text
A0 -> A2,A3 -> A4 -> A5,A6
A1 independent
A1,A4,A5,A6,required-external-prerequisites -> B1 -> B2
```

State that migration, configuration, binding, Git publication, merge, and deploy execution remain outside NC-R1. The manifest may reference only their sanitized completed results.

- [ ] **Step 4: Update task.md operational status**

Record that the approved design exists, the manifest remains unapproved/non-executable, unresolved remains exactly 9, and the next action is manifest/contract implementation rather than any external operation.

### Task 3: Implement Contract Guards

**Files:**
- Modify: `scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs`

- [ ] **Step 1: Add canonical manifest fields**

Add an exact object matching the control-plane fields. Do not name it an approval packet.

```js
const canonicalEightRowManifestFields = {
  manifest_execution_status: "unapproved-non-executable",
  manifest_type: "multi-unit-staged-resolution-control-plane",
  approval_effect: "none",
  row_group_count: "8",
  row_groups: "EVID-WORKER-CPU,EVID-PROVIDER-COST,EVID-STRIPE-COST,EVID-PRODUCT-PRICE,EVID-LEGAL,EVID-COPY,EVID-DEPLOYED-TARGET,EVID-LIVE-PAID-FLOW",
  row_isolation: "required",
  closure_rule: "per-row-only-after-fresh-exact-approved-complete-target-matched-evidence",
  cross_row_approval: "forbidden",
  cross_row_closure: "forbidden",
  dependency_skip: "forbidden",
  partial_stop_rule: "stop-current-row-and-all-dependent-child-units",
  global_stop_rule: "private-exposure,target-mismatch,scope-expansion,unsigned-paid-transition,activation-drift,migration-drift,unapproved-cost-bearing-action,rollback-unavailable",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  unapproved_cost_bearing_action: "partial-stop-and-request-separate-budget-approval",
  risk_acceptance: "excluded",
  final_release_go: "excluded",
  activation_status: "closed",
  free_behavior: "permanent",
  nc_l1_status: "not-started",
  child_approval_unit: "required-per-child",
  child_approval_id: "required-unique-per-child",
  child_explicit_decision: "required-per-child",
  child_target_scope_stop_rollback: "required-exact-per-child"
};
```

- [ ] **Step 2: Update the exact changed-path allowlist**

Replace the historical four-file-only assertion with the exact six-path set: `task.md`, the two NC-R1 active docs, the NC-R1 contract, the approved design, and this plan. Continue rejecting every runtime, migration, config, manifest, lockfile, UI, or unrelated untracked path. Add a negative fixture proving a seventh path fails.

- [ ] **Step 3: Parse and validate exactly eight row groups**

Require unique IDs and the exact canonical order. Reject missing, duplicate, extra, or reordered row groups.

- [ ] **Step 4: Validate per-child approval independence**

Require every child to have its own canonical approval unit, unique approval ID placeholder or exact approved ID, explicit decision, exact target/scope, retention, stop owner, and rollback owner. Executable children additionally require exact operation, time window, and named operator. Documentation-only judgment children additionally require a bound input fingerprint, effective date, and named approver. Reject any batch approval ID used as a child approval substitute.

- [ ] **Step 5: Add dependency and reverse-transition guards**

Require:

- A2 and A3 cannot start or close before the exact approved A0 provisional input is complete and fingerprint-bound;
- Product/Price cannot close before Provider Cost and Stripe Cost;
- Legal and Copy cannot close before exact Product/Price;
- B1 cannot start or close before A1, A4, A5, A6, and every required sanitized external-prerequisite result are satisfied, fresh, exact, and fingerprint-bound;
- Live Paid Flow cannot close before Deployed Target;
- the only forward transitions are `unapproved -> approved-not-started -> running -> partial-stop | complete-not-closure-eligible | satisfied`;
- `partial-stop` preserves the prior canonical row status and stops dependent children;
- `complete-not-closure-eligible` closes no row;
- `satisfied -> stale | invalidated -> incomplete | unapproved` is mandatory when freshness, target, scope, artifact, approval input, or prerequisite binding changes;
- material A0, A1, A2, A3, A4, A5, A6, required external-prerequisite result, B1 deployed binding, signed-entitlement contract, or child approval-input changes invalidate every dependent row defined by the approved design;
- A1/A5/A6/external-prerequisite change invalidates B1 and B2 as applicable; B1 change always invalidates B2;
- stale/invalidated rows immediately return to the unresolved set and retain NO-GO;
- Wave A rows remain `gated` with `production_proof=no`; only B1 is deployed evidence and only B2 is live evidence.

- [ ] **Step 6: Add prohibited-operation guards**

Reject manifest language that directly authorizes payment/funding, migration, configuration, binding, Git, deploy, live flow, activation, public gate, or cleanup.

Also reject any child or manifest state that permits incremental spend when `default_incremental_spend_jpy=0`, omits `stop_before_any_incremental_charge=yes`, or converts an unapproved cost-bearing action into anything other than a partial stop and separate budget-approval request.

- [ ] **Step 7: Add B2 mandatory-negative-scenario guards**

Require the full scenario set from the approved design: unauthenticated, Free, paid-inactive, missing/incomplete/ambiguous/unreadable authority, redirect-only, incompatible/inactive signed evidence, duplicate Checkout prevention, signed-webhook idempotency, stale/replay/out-of-order, ownership/price/subscription mismatch, cross-owner/capability, and rollback Free fallback. Add separate exact assertions that pre-provider budget/quota rejection produces provider-call count zero; provider failure produces usage-commit count zero; and post-provider usage-commit rejection suppresses output, records no success, and preserves Free/fail-closed state.

- [ ] **Step 8: Add adversarial negative fixtures**

At minimum, assert failures for:

```text
approval_effect=approved
row_group_count=7
seventh changed path outside the exact six-path allowlist
duplicate EVID-WORKER-CPU
batch approval ID substituted for child IDs
Product/Price closes before cost rows
A2 or A3 starts without a complete fingerprint-bound A0 input
B1 starts or closes while A1, A4, A5, A6, or a required external prerequisite is incomplete
Live flow closes before deployed target
Wave A promoted to production proof
manifest authorizes provider funding
manifest authorizes deploy
material Product/Price change leaves Legal/Copy satisfied
material Worker CPU/Legal/Copy/external-prerequisite change leaves B1/B2 satisfied
signed-entitlement contract drift leaves Live Paid Flow satisfied
partial-stop changes the prior canonical row status
invalid direct unapproved-to-running transition
approval-input drift leaves dependent rows satisfied
stale or invalidated evidence remains absent from the unresolved set
complete-not-closure-eligible closes a row
Wave A promoted to live or deployed evidence
redirect completion accepted as Paid evidence
budget/quota rejection allows a provider call
provider failure allows a usage commit
post-provider commit rejection returns output or success
incremental charge allowed while default spend is zero
```

- [ ] **Step 9: Run focused GREEN**

Run:

```powershell
node --check scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
git diff --check
```

Expected: focused contract passes with unresolved 9 and activation closed.

### Task 4: Root Verification And Review

**Files:**
- Verify all changed files; do not edit unrelated files.

- [ ] **Step 1: Inspect the actual diff and path allowlist**

Expected changed paths are the existing four authority/contract files plus the approved design and plan documents. No runtime, migration, config, manifest, lockfile, or UI file may change.

- [ ] **Step 2: Run dependency-free broad contracts**

Run:

```powershell
node scripts/comment-translator-creator-no-container-architecture-contract.mjs
node scripts/comment-translator-creator-nc-q1-integrated-qa-contract.mjs
```

Expected: architecture PASS; NC-Q1 14/14 fixture/local-only PASS; activation closed.

- [ ] **Step 3: Verify legacy and invariant coverage**

Require legacy exactly 23, Free permanence, fixed-closed public activation, signed-entitlement-only authority, redirect non-evidence, and exact unresolved 9.

- [ ] **Step 4: Run isolation scans**

Scan added content for secrets, private identifiers, raw URLs/payloads, browser storage/query/log authority, migration/config values, unsupported numeric claims, and cost-bearing authorization.

- [ ] **Step 5: Classify dependency-backed checks**

If `node_modules` remains absent, record lint, strict typecheck, Next build, and OpenNext build as setup-blocked. Do not install.

- [ ] **Step 6: Request fresh read-only Sol review**

Review the manifest semantics, child isolation, dependency graph, reverse invalidation, no-cost-without-approval boundary, and NO-GO/closed state. Resolve every material finding before acceptance.

---

## Chunk 2: Wave A Execution

### Common Before/After-Child Protocol

**Files for every recorded child result:**
- Modify: `task.md`
- Modify: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md`
- Modify: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md`
- Modify/Test: `scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs`

Before execution, run the focused contract and require the exact current ledger. Validate the child packet's unique approval ID, explicit approval decision, exact target/scope, applicable operation/window/operator or bound-input/effective-date/approver fields, retention, `stop_owner=kurodev`, `rollback_owner=kurodev`, prerequisite fingerprints, and zero-cost guard. If any required field is absent or a placeholder, stop without external action.

After every completed or partial-stop child, update the four files above and run exactly:

```powershell
node --check scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-no-container-architecture-contract.mjs
node scripts/comment-translator-creator-nc-q1-integrated-qa-contract.mjs
git diff --check
```

Also run an added-lines scan that reports counts only and fails on secret, credential, email, raw URL, private identifier, UUID/account identifier, raw payload, browser storage/query/log authority, migration/config value, unsupported numeric claim, or unapproved cost-bearing authorization. Require an exact sanitized stop/rollback result and recompute the unresolved set/count from canonical rows rather than handwritten prose.

Run this exact count-only scan. It inspects added tracked lines plus the full untracked design/plan documents, permits only the already-canonical official public-source domains, and never prints matched content:

```powershell
$operational = [string](git diff --unified=0 -- task.md docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md)
$contract = [string](git diff --unified=0 -- scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs)
$operationalAdded = @($operational -split "`n" | Where-Object { $_ -match '^\+(?!\+\+)' })
$contractAdded = @($contract -split "`n" | Where-Object { $_ -match '^\+(?!\+\+)' })
$spec = @(Get-Content -LiteralPath docs/superpowers/specs/2026-08-09-nc-r1-eight-row-staged-resolution-design.md)
$added = @($operationalAdded) + @($contractAdded) + @($spec)
$added += @(Get-Content -LiteralPath docs/superpowers/plans/2026-08-09-nc-r1-eight-row-staged-resolution.md)
$authorizationSurface = @($operationalAdded) + @($spec)
$checks = [ordered]@{
  credential = @($added | Where-Object { $_ -match '\b(?:sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b' }).Count
  email = @($added | Where-Object { $_ -match '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' }).Count
  private_url = @($added | Where-Object { $_ -match 'https?://' -and $_ -notmatch 'developers\.cloudflare\.com|supabase\.com|azure\.microsoft\.com|learn\.microsoft\.com|developers\.deepl\.com|developers\.openai\.com|stripe\.com' }).Count
  uuid_or_account_id = @($added | Where-Object { $_ -match '\b[a-f0-9]{32}\b|\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b' }).Count
  provider_private_id = @($authorizationSurface | Where-Object { $_ -match '\b(?:acct_|cus_|sub_|price_|prod_|org-|proj_|whsec_|pi_|cs_(?:test|live)_)[A-Za-z0-9_-]{6,}\b' }).Count
  raw_payload_shape = @($authorizationSurface | Where-Object { $_ -match '(?:raw_payload|raw_request|raw_response)=(?!no\b|none\b|forbidden\b|not-|<required)' -or $_ -match '\{\s*"(?:customer|subscription|account|token|secret|payload)"\s*:' }).Count
  unsafe_retention = @($added | Where-Object { $_ -match '^(?:raw_payload|browser_storage|query|raw_log|migration_value|config_value)_retained=(?!no\b)' }).Count
  browser_query_log_authority = @($authorizationSurface | Where-Object { $_ -match '(?:browser_storage|query_authority|log_authority)=(?!no\b|none\b|forbidden\b|not-|<required)' }).Count
  migration_config_value = @($authorizationSurface | Where-Object { $_ -match '(?:migration_value|config_value)=(?!no\b|none\b|forbidden\b|not-|<required)' }).Count
  unsupported_numeric_claim = @($authorizationSurface | Where-Object { $_ -match '(?:headroom|remaining(?:\s+capacity)?|margin|fee|price|cost)\s*(?:=|is|:)\s*(?:[$¥€]\s*)?\d' -and $_ -notmatch 'default_incremental_spend_jpy=0|row_group_count=8' }).Count
  unauthorized_cost = @($authorizationSurface | Where-Object { $_ -match 'approval_effect=(?!none\b)|stop_before_any_incremental_charge=(?!yes\b)|unapproved_cost_bearing_action=(?!partial-stop-and-request-separate-budget-approval\b)' }).Count
}
$checks.GetEnumerator() | ForEach-Object { Write-Output "$($_.Key)_matches=$($_.Value)" }
if (($checks.Values | Measure-Object -Sum).Sum -ne 0) { exit 1 }
```

Expected: every reported count is `0` and the command exits `0`.

### Task 5: Complete A0 Provisional Cost-Model Input

**Files:**
- Modify only the NC-R1 readiness authority, checklist, contract, and task status after an exact documentation-only packet is approved.

- [ ] **Step 1: Prepare the A0 owner-input packet**

Include candidate Paid scope, provisional price posture, expected provider usage boundary, Stripe charge path, exclusions, effective date, retention, stop, rollback, and material-change rule. Set `row_closure=none`.

- [ ] **Step 2: Obtain explicit owner approval**

Do not infer approval from this plan or the staged manifest.

- [ ] **Step 3: Record and contract-test the exact input fingerprint**

Expected: no evidence row closes; dependent rows bind to the fingerprint.

- [ ] **Step 4: Run the common post-child verification**

Expected unresolved set/count remains the original 9. Verify `row_closure=none`, no external action, sanitized retention, and A0 material-change invalidation bindings for A2/A3/A4/A5/A6/B1/B2.

### Task 6: Resolve Worker CPU

**Files:** Use all four Common Before/After-Child Protocol files.

- [ ] **Step 1: Prepare a documentation-only source-disposition child**

Select a materially different safe evidence source or retain NO-GO. The source must support aggregation and request completeness without Trace/log/private exposure.

- [ ] **Step 2: Obtain separate approval for the exact read**

Include target alias, operation, time window, operator, retention, stop, rollback, and prohibited surfaces.

- [ ] **Step 3: Execute only the approved read**

Stop on missing completeness, scope expansion, private exposure, or target mismatch.

- [ ] **Step 4: Close or partial-stop EVID-WORKER-CPU**

Close only with fresh/exact/approved/complete canonical gated evidence. Otherwise retain incomplete.

- [ ] **Step 5: Run the common post-child verification**

On closure, expect unresolved count 8 with exactly Provider Cost, Stripe Cost, Product/Price, Legal, Copy, Risk Acceptance, Live Paid Flow, and Deployed Target. On partial stop, expect the prior unresolved set/count unchanged and verify dependent execution did not start.

### Task 7: Resolve Provider Cost

**Files:** Use all four Common Before/After-Child Protocol files.

- [ ] **Step 1: Determine whether positive funded headroom already exists**

Use no authenticated read until separately approved.

- [ ] **Step 2: If funding is required, prepare a cost-bearing prerequisite packet**

Default incremental spend is zero. Stop before any payment, credit, budget, or funding action and request a separate exact budget approval.

- [ ] **Step 3: Consume only the sanitized result of an independently approved funding lane**

Do not let NC-R1 execute or infer the prerequisite.

- [ ] **Step 4: Obtain and execute the exact provider-cost re-read approval**

Limit it to funded-headroom and aggregation-completeness classification.

- [ ] **Step 5: Close or partial-stop EVID-PROVIDER-COST**

Zero usage/spend/request count is never funded headroom.

- [ ] **Step 6: Run the common post-child verification**

After A1 and A2 closure, expect unresolved count 7 with exactly Stripe Cost, Product/Price, Legal, Copy, Risk Acceptance, Live Paid Flow, and Deployed Target. On partial stop, preserve the prior set/count and sanitized rollback result.

### Task 8: Resolve Stripe Cost

**Files:** Use all four Common Before/After-Child Protocol files.

- [ ] **Step 1: Bind the exact candidate charge path from A0**

- [ ] **Step 2: Prepare the source/applicability child packet**

Require exact base processing fee, standard/custom applicability, and full cost-model completeness. No public-price substitution without an explicit applicability judgment.

- [ ] **Step 3: Obtain and execute only the exact approved read or judgment**

Do not access customers, events, exports, raw payloads, payment/refund writes, or unrelated settings.

- [ ] **Step 4: Close or partial-stop EVID-STRIPE-COST**

Close only when the exact Paid-flow cost model is complete.

- [ ] **Step 5: Run the common post-child verification**

After A1-A3 closure, expect unresolved count 6 with exactly Product/Price, Legal, Copy, Risk Acceptance, Live Paid Flow, and Deployed Target. On partial stop, preserve the prior set/count.

### Task 9: Resolve Product/Price, Legal, And Copy

**Files:** Use all four Common Before/After-Child Protocol files.

- [ ] **Step 1: Verify Provider Cost and Stripe Cost are satisfied**

- [ ] **Step 2: Prepare and obtain the Product/Price judgment**

Bind it to exact cost-input fingerprints. Close only EVID-PRODUCT-PRICE.

- [ ] **Step 3: Record Product/Price and run the common post-child verification**

Expected unresolved count 5 with exactly Legal, Copy, Risk Acceptance, Live Paid Flow, and Deployed Target.

- [ ] **Step 4: Prepare and obtain the Legal judgment**

Bind it to exact Product/Price scope and artifact set. Close only EVID-LEGAL.

- [ ] **Step 5: Record Legal and run the common post-child verification**

Expected unresolved count 4 with exactly Copy, Risk Acceptance, Live Paid Flow, and Deployed Target.

- [ ] **Step 6: Prepare and obtain the Copy judgment**

Bind it to an exact copy artifact ID/fingerprint and approved Product/Price/Legal posture. Close only EVID-COPY; do not publish.

- [ ] **Step 7: Record Copy and run the common post-child verification**

Expected unresolved count 3 with exactly Risk Acceptance, Deployed Target, and Live Paid Flow. Each judgment must retain its own approval ID, bound input, effective date, named approver, retention, stop, rollback, sanitization result, and row-only closure.

---

## Chunk 3: Wave B Execution

### Task 10: Resolve Deployed Target

**Files:** Use all four Common Before/After-Child Protocol files. Any migration/config/binding/Git/merge/deploy execution belongs to a separately authorized external lane and is not a modification or execution step in this task.

- [ ] **Step 1: Verify every B1 forward prerequisite**

Require A1 Worker CPU, A4 Product/Price, A5 Legal, A6 Copy, and every required sanitized external-prerequisite result to be individually satisfied, fresh, exact, approved, and fingerprint-bound. If any prerequisite is missing, incomplete, stale, invalidated, target-mismatched, or unapproved, reject both B1 start and closure.

- [ ] **Step 2: Prepare the deployed-target verification packet**

Include exact commit alias, target alias, read method, window, operator, retention, stop, and rollback owner.

- [ ] **Step 3: Obtain and validate the unique B1 read approval**

Require a unique approval ID, explicit `approved` decision, and exact packet match immediately before the read. If any value is absent, placeholder, stale, target-mismatched, or shared with another child, stop without reading.

- [ ] **Step 4: Verify before proposing deploy**

If the exact commit is already deployed and binding is provable, collect sanitized proof without redeploying.

- [ ] **Step 5: If deployment prerequisites are missing, stop NC-R1**

Prepare separate external-lane packets for any required migration, config/binding, Git publication, merge, or deploy. NC-R1 does not execute them.

- [ ] **Step 6: Consume sanitized completed prerequisite results**

Revalidate exact commit/target/freshness after the external lane completes.

- [ ] **Step 7: Close EVID-DEPLOYED-TARGET**

Never infer deployment from merge, CI, build, or local artifacts.

- [ ] **Step 8: Run the common post-child verification**

After Wave A and B1 closure, expect unresolved count 2 with exactly Risk Acceptance and Live Paid Flow. On partial stop, preserve unresolved count 3 and verify no live-operation child started.

### Task 11: Resolve Live Paid Flow

**Files:** Use all four Common Before/After-Child Protocol files. Any new seam, migration, configuration, binding, deploy, or activation work remains outside this task until separately designed and approved.

- [ ] **Step 1: Verify B1 and all production prerequisites**

- [ ] **Step 2: Prepare the exact non-public live-operation packet**

Name the target, allowed operator/tester, signed-compatible subscription evidence source, scenarios, window, retention, stop, rollback, and `default_incremental_spend_jpy=0`. Public activation remains closed.

- [ ] **Step 3: Obtain and validate the unique B2 live-operation approval**

Require a unique approval ID, explicit `approved` decision, exact target/tester/scenario/window match, signed-evidence source, retention, `stop_owner=kurodev`, `rollback_owner=kurodev`, and zero-cost guard immediately before execution. If any value is absent, placeholder, stale, mismatched, or shared with another child, stop without a live operation.

- [ ] **Step 4: Stop if no compatible non-public seam exists**

Any new seam or gate exception requires a separate design and approval.

- [ ] **Step 5: Execute mandatory positive and negative scenarios**

Run the complete B2 scenario set from the approved design. Record sanitized counts proving: budget/quota rejection has zero provider calls; provider failure has zero usage commits; post-provider usage-commit rejection has no output and no success; duplicate/replay/out-of-order inputs do not create duplicate or stale Paid authority; cross-owner/capability inputs are denied; and Checkout redirect/completion alone never grants Paid.

- [ ] **Step 6: Close or partial-stop EVID-LIVE-PAID-FLOW**

Close only from fresh/exact/approved/complete live evidence bound to B1. Keep Free fallback and public activation closed.

- [ ] **Step 7: Run the common post-child verification**

On closure, expect unresolved count 1 with exactly Risk Acceptance. On partial stop, preserve unresolved count 2. Require exact sanitized scenario counts, stop/rollback result, NO-GO, closed activation, permanent Free, and NC-L1 not started.

---

## Chunk 4: First-Goal Completion Audit

### Task 12: Prove The Eight-Row Goal

- [ ] **Step 1: Derive the eight expected satisfied rows from the canonical ledger**

- [ ] **Step 2: Inspect every row's authoritative packet and result**

Require fresh, exact, approved, complete, correct evidence class, canonical primary approval unit, and row-only closure.

- [ ] **Step 3: Recompute unresolved state**

Expected exactly:

```text
unresolved_hard_requirements=EVID-RISK-ACCEPTANCE
unresolved_hard_requirement_count=1
decision=no-go
activation_status=closed
free_behavior=permanent
nc_l1_status=not-started
```

- [ ] **Step 4: Run the full allowed verification bundle**

Run:

```powershell
node --check scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-no-container-architecture-contract.mjs
node scripts/comment-translator-creator-nc-q1-integrated-qa-contract.mjs
git diff --check
git status --short --branch
```

The NC-R1 contract must directly assert legacy exactly 23, Free permanence, fixed-closed public activation, signed-compatible-subscription-only authority, redirect/completion non-evidence, the eight satisfied rows, and unresolved exactly Risk Acceptance. Run the added-lines sanitized isolation scan from the Common Protocol. Run lint, strict typecheck, Next build, and OpenNext build only if `node_modules` already exists under valid authority; otherwise record each as setup-blocked and do not install.

- [ ] **Step 5: Obtain final fresh read-only Sol review**

- [ ] **Step 6: Present the exact residual-risk acceptance packet**

Do not approve or execute it. First-goal completion ends with the exact packet ready for the user's separate decision.

- [ ] **Step 7: Keep Git and cleanup untouched**

Report the actual dirty diff, checks, external results, cost-bearing actions, partial stops, and remaining approval boundaries. Do not commit, push, open a PR, merge, deploy, activate, or clean up without separate approval.
