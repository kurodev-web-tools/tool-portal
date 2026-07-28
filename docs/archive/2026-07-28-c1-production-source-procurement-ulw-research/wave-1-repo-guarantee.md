# Wave 1: Repository Guarantee

- Exact seven-proof gate: `completeSourceReview`, `immutableSecretCopyFree`, `completeMutableAllocationRegistry`, `boundedRetention`, `synchronousAbortReadQuiescence`, `synchronousDisposeAcknowledgement`, and `completeDownstreamZeroization`.
- Eligibility requires all seven. A missing predicate rejects the candidate.
- PR #694 fixed `4 candidate classes / 0 eligible / 4 rejected`; those classes were not re-audited.
- PR #695 preserves retained Buffer zero-fill and `production_wiring_status=disconnected-fail-closed`.
- A native candidate must cover repository, Node/V8, native transport/TLS/allocator/socket, OS, and SDK/client layers.

Verdict contribution: the proof burden cannot be reduced to repository-owned Buffers or synthetic lifecycle acknowledgements.
