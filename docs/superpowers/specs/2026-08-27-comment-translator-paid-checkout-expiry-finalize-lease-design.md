# Comment Translator Paid Checkout Expiry Finalize Lease Design

## Objective

Prevent a successful reconciler-owned Checkout hold expiry from being reported as `external-action-failed` and `stale` solely because the terminal expiry RPC clears its lease before the common reconciler finalizer runs.

## Root Cause

`ct_paid_expire_checkout_hold` atomically terminalizes the lifecycle, releases the hold and capacity reservation, and clears `reconcile_lease_token` / `reconcile_lease_until`. The control-plane invocation then always calls `ct_paid_finalize_reconciler` with the claimed token. The finalizer rejects the already-cleared lease, the generic adapter error is classified as `external-action-failed`, and failure-safety rejects the same stale token, producing `stale=1` despite a successful terminal transition.

The existing `ct_paid_terminalize_unbound_checkout_hold` path demonstrates the intended contract: the terminal action clears terminal scheduling state but preserves the active lease for the common finalizer.

## Approved Design

Add one new migration that redefines `ct_paid_expire_checkout_hold` without changing its signature, privileges, identity checks, Stripe status/checked-at guards, entitlement boundary, capacity boundary, or idempotent terminal fast path.

- When `p_reconcile_lease_token` is non-null, preserve the matching live lease through the terminal action so `ct_paid_finalize_reconciler` remains the sole lease finalizer.
- When `p_reconcile_lease_token` is null, clear lease token/until as before. Active leases remain rejected before mutation.
- Reject a null owner explicitly before identity comparison so the redefined security-definer RPC does not inherit PostgreSQL three-valued-logic ambiguity from the historical definition.
- Leave the TypeScript reconciler and store interfaces unchanged.
- Do not modify existing migrations or backfill existing rows.

## Verification

A focused contract must fail before the repair migration exists and pass afterward. It must assert lease preservation for reconciler-owned expiry, lease clearing for direct expiry, explicit null-owner rejection, unchanged max-expiry guard, exact service-role privilege boundary, unchanged function signature, and no modification of historical migrations. A shared-state deterministic fixture must exercise expiry lease preservation followed by common finalization and require `success`, `stale=0`, no retry, and no failure-safety call. Existing Gate 0-A, Task 9, store/schema/parser, syntax, typecheck, lint, and diff checks remain required.

Remote apply, deploy, scheduler activation, maintenance invocation, and Checkout/Stripe operations are outside this implementation scope.
