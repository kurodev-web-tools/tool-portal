# NC-R1 Eight-Row Staged Resolution Design

## Status

- Design approved in principle by release owner `kurodev` on 2026-08-09.
- This document is documentation-only. It authorizes no command, authenticated/private read, payment or funding action, migration, configuration change, deploy, live operation, activation, Git publication, or cleanup.
- Current state remains `NO-GO`, `activation_status=closed`, `Free=permanent`, and `NC-L1=not-started`.

## Goal

Resolve the eight current NC-R1 hard requirements other than `EVID-RISK-ACCEPTANCE` while preserving row-level approval, evidence, stop, rollback, freshness, target, and closure boundaries:

1. `EVID-WORKER-CPU`
2. `EVID-PROVIDER-COST`
3. `EVID-STRIPE-COST`
4. `EVID-PRODUCT-PRICE`
5. `EVID-LEGAL`
6. `EVID-COPY`
7. `EVID-DEPLOYED-TARGET`
8. `EVID-LIVE-PAID-FLOW`

The first goal is complete only when all eight rows are individually `fresh`, `exact`, `approved`, and `satisfied`, and the only unresolved hard requirement is `EVID-RISK-ACCEPTANCE`. This goal does not include risk acceptance, final release GO, public activation, or NC-L1.

## Architecture

Use one non-executable staged resolution manifest containing eight independent row groups. A row group may contain prerequisite child units and one row-closing evidence or judgment unit. The manifest reduces approval-message overhead but never creates cross-row approval or cross-row closure.

## Post-PR Row-by-Row Execution Model

After this control-plane PR is merged, one fresh task covers exactly one evidence row or one prerequisite child step. Do not carry a persistent eight-row execution goal into the successor task. Each successor task re-reads the canonical ledger, uses a fresh isolated worktree, obtains only the exact current approval needed for that row or prerequisite, records either a truthful satisfied transition or partial stop, and leaves every other row unchanged.

The default order is outcome-first rather than document-first: attempt the shortest currently satisfiable independent row, then continue through prerequisites and dependent rows. Current expected sequencing is A3 Stripe Cost first; A2 Provider Cost and the independent A1 Worker CPU path follow as their fresh approvals become available; A4 Product/Price waits for actual A2 and A3 result fingerprints; A5 waits for A4; A6 waits for A4 and A5; B1 waits for the required upstream artifacts; B2 waits for B1 and separate signed-entitlement evidence. A successor task may change this order only from fresh canonical evidence, never from convenience or inferred completion.

One human message may list multiple approval IDs for convenience, but every approval unit remains independently scoped, target-matched, stoppable, rollback-owned, and non-transitive. By default, execute and close at most one row or one prerequisite child step before returning for review. Repository publication, merge, external reads, deploy, live flow, final GO, activation, and cleanup remain separate boundaries.

The manifest has two waves:

- Wave A resolves Worker CPU, Provider Cost, Stripe Cost, Product/Price, Legal, and Copy.
- Wave B resolves Deployed Target and Live Paid Flow only after every applicable Wave A prerequisite is complete.

Every executable child unit remains non-executable until its exact target, operation, time window, operator, retention location, stop owner, rollback owner, and approval ID are complete and explicitly approved. Every documentation-only judgment remains unapproved until its exact scope, bound decision input, effective date, named approver, retention location, stop owner, rollback owner, and approval ID are complete and explicitly approved.

## Manifest Control Plane

The staged manifest must contain:

```text
manifest_type=multi-unit-staged-resolution-control-plane
approval_effect=none
row_group_count=8
row_isolation=required
closure_rule=per-row-only-after-fresh-exact-approved-complete-target-matched-evidence
cross_row_approval=forbidden
cross_row_closure=forbidden
dependency_skip=forbidden
partial_stop_rule=stop-current-row-and-all-dependent-child-units
global_stop_rule=private-exposure,target-mismatch,scope-expansion,unsigned-paid-transition,activation-drift,migration-drift,unapproved-cost-bearing-action,rollback-unavailable
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

The manifest has no approval effect and closes no row. It cannot be cited as approval for an authenticated read, documentation-only judgment, payment/funding action, migration, configuration or binding change, Git operation, deploy, or live operation. Each child retains its canonical `approval_unit`, unique approval ID, explicit approval decision, exact target or decision scope, stop owner, rollback owner, and retention location. Only a completed row-closing child unit may change one canonical row from incomplete or missing to satisfied.

## Wave A: Cost And Owner Decisions

### A0: Provisional Cost-Model Input

Create a documentation-only, non-closing input that defines the candidate Paid scope, provisional price posture, expected provider usage boundary, Stripe charge path, and explicit exclusions. This breaks the existing Provider Cost and Product/Price dependency cycle without prematurely closing either row.

Required behavior:

- `row_closure=none`
- no price, margin, tax, provider funding, or Stripe applicability claim may be invented;
- material changes invalidate dependent Provider Cost, Stripe Cost, and Product/Price decisions;
- Product/Price remains missing until A2 and A3 complete.

### A1: Worker CPU

1. Documentation-only source disposition selects one safe evidence source or retains NO-GO.
2. If a safe source is selected, a separately approved authenticated/private read collects only the exact Worker CPU completeness and request-completeness evidence.
3. Close `EVID-WORKER-CPU` only when the result is fresh, exact, approved, complete, and supports the canonical sanitized CPU headroom classification.

The child units must not reopen the just-completed dashboard surface without a materially different, owner-approved evidence source. They must not open Trace or logs, authorize Workers Paid, retain raw metric values or private identifiers, or infer safety from percentile summaries alone.

### A2: Provider Cost

1. Bind the provider funding requirement to the approved provisional cost-model input.
2. If positive funded headroom is required and absent, represent any payment, credit, budget, or funding change as its own cost-bearing prerequisite child unit.
3. After a separately approved prerequisite completes, perform a separately approved authenticated/private read limited to funded-headroom and aggregation-completeness classification.
4. Close `EVID-PROVIDER-COST` only when the result is fresh, exact, approved, complete, and reconciled with the bound cost model.

Zero usage, zero spend, zero requests, or Checkout completion never proves funded headroom. No payment or provider write is authorized by the manifest design or by a read-only child unit.

### A3: Stripe Cost

1. Bind the Stripe cost requirement to the exact candidate Paid charge path from A0.
2. Select an owner-approved source that can establish the exact base payment-processing fee, standard/custom applicability, and full cost-model completeness for the approved account scope.
3. Perform only the separately approved read or judgment needed by that selected source.
4. Close `EVID-STRIPE-COST` only when the exact Paid-flow applicability and full cost-model inputs are complete.

The existing dashboard partial stops remain incomplete evidence. Public pricing cannot silently replace account-specific applicability. No payment, refund, settings change, customer/event access, export, or raw payload access is implied.

### A4: Product And Price

After A2 and A3 are satisfied, bind their exact sanitized material inputs to a named Product/Price judgment. The decision must state the approved product scope, price posture, effective date, exclusions, owner, retention, stop, rollback, and material-change revalidation rule.

Close only `EVID-PRODUCT-PRICE`. Legal/tax, Copy, Risk Acceptance, deploy, live flow, GO, and activation remain separate.

### A5: Legal

Bind the legal/tax judgment to the exact Product/Price scope and effective artifact set. The decision must state what was reviewed, the approved or rejected posture, effective date, owner, retention, stop, rollback, and revalidation trigger.

Close only `EVID-LEGAL`. No legal conclusion may be inferred from public pricing, SLA, Support, Copy, or Risk Acceptance.

### A6: Copy

Bind the Copy judgment to one exact public-copy artifact identifier or content fingerprint and the exact Product/Price and legal posture it represents. The decision must state scope, owner, effective date, retention, stop, rollback, and material-change invalidation.

Close only `EVID-COPY`. Approval of Copy does not publish it or authorize a public Paid gate.

## Wave B: Deployed And Live Evidence

### B1: Deployed Target

1. Preflight the exact approved commit alias and deployed target without exposing raw URLs, account identifiers, bindings, secrets, or configuration values.
2. If the approved commit is already deployed and exact binding can be proven, collect deployed-target proof without redeploying.
3. If it is not deployed, any migration, configuration, binding, Git publication, merge, or deploy prerequisite remains outside NC-R1 and must run in its own independently authorized authority lane. The NC-R1 manifest records only a non-authorizing reference to that lane and may consume only its sanitized completed prerequisite result. No prerequisite operation or execution ownership is implied by the manifest or by approval of deployed verification.
4. Close `EVID-DEPLOYED-TARGET` only from fresh, exact, approved deployed proof bound to the approved commit and target.

Deployment success is never inferred from merge, CI, build, or local artifacts. Public activation stays closed.

### B2: Live Paid Flow

1. Start only after B1 is satisfied and every required production prerequisite is separately proven.
2. Use an owner-approved non-public operator/tester seam that does not open the public Paid gate.
3. Use only compatible signed subscription evidence as Paid authority. Checkout redirect or completion is non-evidence.
4. Verify the exact bounded flow, Free fallback, accounting/provider ordering, and sanitized stop/rollback result.
5. Close `EVID-LIVE-PAID-FLOW` only when live evidence is fresh, exact, approved, complete, and bound to the deployed target.

Before B2 may close, the bounded live evidence must cover all applicable mandatory negative scenarios: unauthenticated, authenticated Free, paid-inactive, missing/incomplete/ambiguous/unreadable authority, Checkout redirect/completion without signed entitlement, incompatible or inactive signed evidence, duplicate Checkout prevention, signed-webhook idempotency, stale/replay/out-of-order events, owner/price/subscription mismatch, pre-provider budget or quota rejection with no provider call, provider failure with no usage commit, post-provider usage-commit rejection with suppressed output and no success, cross-owner input, cross-capability input, and rollback/authority-unavailable Free fallback. Any unexpected Paid transition, paid side effect, accounting/provider order violation, cross-owner/capability access, or unsanitized output is a partial stop and cannot be closure evidence.

If the current runtime cannot perform a non-public live flow while public activation remains closed, stop. Any new test seam or gate exception requires a separate design and approval; it must not be invented by this manifest.

## Dependency Order

```text
A0 provisional input
  -> A2 provider cost
  -> A3 Stripe cost
  -> A4 Product/Price
       -> A5 Legal
       -> A6 Copy

A1 Worker CPU ------------------------------+
A4/A5/A6 satisfied -------------------------+--> B1 Deployed Target --> B2 Live Paid Flow
all required production prerequisites ------+
```

A1 may proceed independently of A0. A5 and A6 may be prepared in parallel but may close only after their exact Product/Price dependency is fixed. B2 cannot begin before B1.

## State Machine

Each row group uses:

```text
unapproved
  -> approved-not-started
  -> running
  -> partial-stop | complete-not-closure-eligible | satisfied

satisfied
  -> stale | invalidated
  -> incomplete | unapproved
```

- `partial-stop` preserves the prior canonical row status and stops dependent units.
- `complete-not-closure-eligible` records a complete operation whose evidence does not satisfy the row contract.
- `satisfied` requires all canonical freshness, target, approval, completeness, canonical row-specific evidence-class, primary-approval-unit, and row-specific conditions. Wave A remains `gated` with `production_proof=no`; only B1 requires deployed evidence and only B2 requires live evidence. Evidence-class promotion is forbidden.
- `stale` applies when the row exceeds its freshness rule or its approved execution window can no longer support the release decision.
- `invalidated` applies when a material prerequisite, target, scope, artifact, cost model, deployed binding, signed-entitlement contract, or approval input changes.
- A0 material change invalidates dependent A2, A3, A4, A5, A6, B1, and B2 evidence as applicable. A2 or A3 material change invalidates A4 and its dependent A5, A6, B1, and B2 evidence. A4 material change invalidates A5, A6, B1, and B2. B1 target or deployed-binding change invalidates B2.
- Every stale or invalidated transition immediately recomputes the canonical unresolved set, restores the affected row to incomplete or unapproved as appropriate, keeps NO-GO, and stops dependent child units until revalidation succeeds.
- No batch-level status may override a row state.

## Security And Privacy

- Never request, display, retain, or log credentials, tokens, cookies, raw URLs, raw payloads, private account/project/customer/subscription identifiers, browser storage, query contents, raw logs, migration contents, binding values, or configuration values.
- Browser-visible selections are observation inputs only and never authority.
- Reports retain sanitized aliases, classifications, timestamps, approval IDs, counts only when supported, and stop/rollback outcomes.
- Stop immediately on private exposure, scope expansion, unexpected authenticated surface, or target mismatch.

## Verification

Before any child executes:

- exact packet-field completeness and approval validation;
- exact target and prerequisite fingerprint validation;
- prohibited-bundle and dependency-order negative tests;
- NO-GO, closed activation, permanent Free, and NC-L1-not-started assertions.

After every child:

- exact sanitized result validation;
- row-only closure eligibility;
- unresolved-set/count recomputation;
- no-secret/private identifier/raw payload/browser storage/query/log/migration/config retention scan;
- stop/rollback result validation.

At the first-goal boundary:

- all eight named rows are individually `fresh`, `exact`, `approved`, and `satisfied`;
- unresolved hard requirements equal exactly `EVID-RISK-ACCEPTANCE`;
- decision remains NO-GO;
- activation remains closed;
- Free remains permanent;
- NC-L1 remains not started;
- Risk Acceptance, final GO, activation, public gate, and cleanup remain separately unapproved.

## Git And Publication Boundary

This design does not authorize staging, commit, push, PR, merge, branch creation, deploy, or cleanup. Repository publication and every external operation remain separately approval-gated.
