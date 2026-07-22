# Comment Translator Creator Closed Beta Task Board

## Authority And Current State

- Free public beta is complete.
- Current priority: P0 Creator closed beta.
- First implementation sequence: C1 -> C3.
- Dependency order: C1 → C3. C3 remains blocked until C1 is merged and verified.
- C2 and C4 are separately approval-gated work and do not bypass the C1 → C3 dependency.
- C5 through C11 are the user-visible closed-beta capability sequence after the entitlement and usage foundations; C12 is the ending final-QA gate.
- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.
- PRs target `codex/comment-translator-free-public-beta-integration` from short-lived feature branches.

## C1 Acceptance Boundary

C1 is accepted only when all of the following are verified:

- Durable, server-owned paid entitlement rows are authoritative for access decisions.
- Signed billing evidence is the only accepted billing-state input.
- Browser-readable and operator-visible output is sanitized and contains no secrets, private identifiers, provider metadata, credentials, or billing identifiers.
- Missing, unreadable, incomplete, or inactive entitlement state fails safely to Free / paid-inactive.

- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.

## Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | pending |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |
| C3 | Paid usage and monthly reset | pending |
| C4 | AI natural translation provider route | pending / gated |
| C5 | OBS overlay token runtime | pending |
| C6 | OBS overlay UI route | pending |
| C7 | Moderator share token runtime | pending |
| C8 | Moderator share UI route | pending |
| C9 | Custom dictionary minimum | pending |
| C10 | Priority display polish | pending |
| C11 | Simple 7-day history | pending |
| C12 | Creator closed beta final QA | pending |

## Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | pending |
| CP2 | Creator public paid gate flip | pending / gated |

## Public-after-P1 / Post-MVP

| ID | Task | Status |
| --- | --- | --- |
| P1-1 | `streamList` primary migration | later |
| P1-2 | 30-day history and search | later |
| P1-3 | CSV export | later |
| P1-4 | Overlay templates | later |
| P1-5 | Dictionary import and suggestions | later |
| P1-6 | AI operations helpers | later |
| P1-7 | Provider comparisons | later |
| P1-8 | Platform expansion | later |
| P1-9 | Voice translation / subtitle work | later |

## Approval And Scope Boundary

This authority is a task board only. Every gated operation requires a separate, same-thread preflight and explicit approval.

- Out of scope: C1/C3 implementation.
- Out of scope: Stripe mutation.
- Out of scope: Supabase mutation.
- Out of scope: provider mutation.
- Out of scope: manual deploy.

The following operations are not performed in this task-board authority slice:

- Any Stripe live action, including live Checkout, Customer Portal, or webhook operations.
- Translation-provider execution.
- Any Cloudflare mutation, configuration change, binding change, or environment change.
- Any production gate change, activation, or public release action.

No secrets, private identifiers, provider metadata, or credentials belong in this board, its verification evidence, PR body, or handoff.
