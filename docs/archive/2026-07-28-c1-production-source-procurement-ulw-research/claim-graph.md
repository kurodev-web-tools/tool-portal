# C1 Production Source Procurement Claim Graph

## Verified claims

| claim_id | Statement | Type | Risk | Scope | Intent ids | Supporting observations | Contradicting observations | Independent groups | Convergence | Counter-search | Primary source | Dependencies | Status | Final location |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CLM-1 | The research base is the exact merged PR #695 integration tip. | repository fact | normal | base | INT-1 | OBS-1 | none | local-git | single-source exception | pending | Git | none | supported | pending |
| CLM-2 | No more than one new candidate envelope is evaluated. | scope fact | high | candidate count | INT-2 | OBS-3 | none | repo, provenance | converged | passed | approved prompt and source log | CLM-1 | supported | active authority |
| CLM-3 | The PR #694 four-class audit must not be repeated. | governance fact | high | prior evidence | INT-3 | OBS-2 | none | repo-authority | single-source exception | pending | merged authority | CLM-1 | supported | pending |
| CLM-4 | The selected candidate has complete official provenance evidence. | provenance | high | source chain | INT-4 | OBS-3, OBS-4 | absence of SBOM/license closure | registry, GitHub, package source | converged negative | passed | official registry/repository metadata | CLM-2 | refuted | active authority |
| CLM-5 | The selected candidate cannot satisfy all seven proof conditions under current evidence. | security verdict | critical | full stack | INT-5 | OBS-5, OBS-6, OBS-7 | local zeroing primitives | repo, runtime, transport, OS, skeptic | converged | passed | official source/docs | CLM-4 | supported | active authority |
| CLM-6 | No prohibited operation occurred. | execution fact | high | task boundary | INT-6 | OBS-1, OBS-8 | none | local-git, command audit | converged | passed | local audit | none | supported | active authority |
| CLM-7 | Final wiring remains disconnected because all seven proofs are not established. | governance verdict | critical | production posture | INT-7 | OBS-2, OBS-5, OBS-6, OBS-7 | none | governance plus independent technical groups | converged | passed | merged authority and official sources | CLM-5 | supported | active authority |
