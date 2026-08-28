# Tokushoho Canonical Trailing Slash Design

## Context

The Preview runtime serves the legal disclosure at `/legal/tokushoho/` because
`next.config.mjs` enables `trailingSlash`. The page metadata currently declares
`/legal/tokushoho`, so post-deploy QA reports a canonical-path mismatch.

## Scope

- Change only the Tokushoho page canonical metadata to `/legal/tokushoho/`.
- Update the existing Task 10 and Task 11 contracts that currently preserve the
  incorrect slashless value.
- Do not normalize canonical metadata for other routes in this change.
- Do not change routing, `trailingSlash`, legal copy, locale behavior, billing,
  Stripe, Supabase, Cloudflare configuration, or deployment state.

## Implementation

Use a test-first regression cycle:

1. Update the focused contracts to require `/legal/tokushoho/` and run them to
   observe the expected failure against the current metadata.
2. Change the Tokushoho metadata canonical value by one string literal.
3. Re-run the focused contracts and relevant sibling verification.

No new runtime abstraction or component is required.

## Verification

- Task 10 legal/security contract.
- Task 11 tax/Checkout policy contract.
- Tokushoho rendering and localization contracts.
- Relevant Paid Core sibling contracts.
- TypeScript, lint, Next build, OpenNext Cloudflare build, Node syntax, and
  `git diff --check` when dependencies are available without installation.
- A later, separately approved Preview deployment and browser check must confirm
  the rendered canonical equals the same-origin `/legal/tokushoho/` URL.

## Safety and Evidence Boundaries

Local verification does not prove deployed Preview state or artifact identity.
Commit, push, pull request creation, merge, deployment, browser mutation, and
all Stripe, Supabase, provider, Production, and activation operations remain
separate approval gates.
