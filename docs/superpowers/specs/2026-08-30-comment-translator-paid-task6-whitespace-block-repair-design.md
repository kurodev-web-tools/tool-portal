# Comment Translator Paid Task 6 Whitespace Block Repair Design

## Context

Preview read-only diagnosis proved that the generated function definition still matches the pinned pre-apply MD5 and the expected hardened semantics, but PostgreSQL function-definition formatting can reflow whitespace inside the large Azure uncertain-retry guard. The two unapplied Task 6 migrations currently require a byte-exact occurrence of that block, so they reject a semantically identical definition.

## Approved change

- Modify only the two unapplied Task 6 migrations and their focused provider contract.
- Normalize runs of whitespace in both the marker-stripped semantic definition and the canonical hardened uncertain-retry block. Apply the same normalization to the bounded-opening/stem and legacy-exclusion needles so token line wrapping is accepted inside the one complete block without allowing whitespace-reflowed legacy fragments to coexist.
- Require the normalized hardened block to occur exactly once wherever hardened-state classification is performed.
- Keep all other exact and semantic checks intact, including first-guard cardinality, bounded provider retries, legacy guard absence, privilege boundaries, owner/lease checks, and the pinned generated-definition MD5.
- Continue rejecting absent, duplicated, partial, mixed legacy/hardened, and malformed guard shapes. Canonical legacy positive repair checks remain exact and are not broadened.

## Verification and safety

The focused contract must fail before either migration changes, then pass after the minimal SQL change. Both migration files must use the same normalization rule and exactly-one predicate. Relevant Gate 0-A2 contracts, syntax checks, `git diff --check`, and a scoped diff review must pass. This repair performs no remote query or mutation, migration apply, history repair, scheduler/Vault change, commit, push, or PR creation.
