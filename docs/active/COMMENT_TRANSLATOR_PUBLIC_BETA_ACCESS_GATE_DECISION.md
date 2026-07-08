# Comment Translator Public Beta Access Gate Decision

Status: Public Launch Next Flow Step 9 access gate decision. Public-release capable: no.

Decision: `public_beta_access_gate_selected=login-only`.

Rejected option for Free public beta: `waitlist-approved`.

Waitlist boundary: waitlist remains for Creator/paid beta access, not the Free public beta entry path.

Current runtime gate unchanged: the tool remains behind the existing private launch SHA-256 owner allowlist until a later approval-gated public access change. Public gate flip: not-run. Deploy/upload: not-run. Remote mutation: not-run.

## Purpose

Step 9 decides the public beta entry policy before PL-G5 records release-owner public launch capability and before PL-G6 performs any public access change. This is a policy/contract/documentation slice only.

## Decision

| Item | Status |
| --- | --- |
| `public_beta_access_gate_decision_status` | `complete` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_access_gate_rejected` | `waitlist-approved-for-free-public-beta` |
| `waitlist_boundary` | `creator-paid-beta-only` |
| `current_runtime_gate` | `private-launch-sha256-owner-allowlist` |
| `runtime_gate_change` | `not-run-in-this-slice` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `not-run` |
| `deploy_upload_status` | `not-run` |
| `remote_mutation_status` | `not-run` |

`login-only` is the selected Free public beta entry policy because it avoids fully anonymous use while keeping the beta reachable enough for signed-in users to try Free usage and decide later whether Free is sufficient or a paid/Creator path is worth joining.

`waitlist-approved` is rejected for Free public beta because it would make the Free trial path feel closer to a closed beta. Waitlist approval remains appropriate for Creator/paid beta access.

## Boundary

This slice does not implement a Free public beta login gate runtime change, public beta waitlist approval store, admin approval workflow, invite email flow, public gate flip, production domain cutover, deploy/upload, remote Supabase mutation, migration, provider/live execution, OAuth live flow, Google target lookup, Stripe/billing action, Product/Price creation, Checkout/Portal redirect, webhook registration, rate-limit mutation action, or main promotion.

The existing private launch gate remains the current runtime gate until a separate reviewed operation implements and activates the selected public beta access policy.

## Sanitized Evidence Shape

Allowed evidence fields:

- safe branch label;
- decision status label;
- selected gate label;
- rejected gate label;
- runtime gate label;
- public-release capable label;
- public gate flip status;
- pass/fail/count labels.

Forbidden output/storage:

- secrets, tokens, cookies, or Authorization header values;
- browser storage payloads;
- owner/internal user id values;
- provider target metadata;
- provider private identifiers;
- liveChatId;
- raw provider payloads;
- raw comments;
- private account values;
- support ticket ids;
- private owner role values;
- raw SQL output.

## Verification Boundary

Width checks skipped because this slice changes only server-only policy labels, docs, deterministic scripts, and `task.md`. There is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.
