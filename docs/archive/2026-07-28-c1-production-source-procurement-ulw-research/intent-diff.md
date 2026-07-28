# C1 Production Source Procurement Intent Diff

| intent_id | Expected truth | Observed reality | Diff | Violated invariant | Intent source | Supporting observations | Status | Claim ids |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INT-1 | Research starts from integration tip `d206ff2c07cc10aeb701d0d2034a29b17f58d42b`. | Isolated worktree is clean at that revision. | none | exact-base binding | approved prompt and Git baseline | OBS-1 | true | CLM-1 |
| INT-2 | At most one new byte-only adapter/client/transport candidate is investigated. | One node-libcurl/libcurl Windows native envelope was investigated. | none | maximum-one-candidate | approved prompt | OBS-3 | true | CLM-2 |
| INT-3 | The four PR #694 candidate classes are not re-audited. | Their merged `4 / 0 / 4` decision is authoritative. | none | no-repeat-audit | PR #694/#695 authorities | OBS-2 | true | CLM-3 |
| INT-4 | Any candidate is bound to official repository, registry/runtime sources, exact revision/tag, checksums, license, and transitive scope. | Exact package/tag/commit/tarball integrity/prebuilt digest/license and dependency envelope are recorded; complete SBOM/license closure is absent. | full-stack provenance remains incomplete | provenance completeness | approved prompt | OBS-3, OBS-4 | false | CLM-4 |
| INT-5 | Eligibility requires all seven full-stack proof conditions without weakening the current guarantee. | All seven remain not proven for the sole candidate. | candidate rejected | full-stack proof gate | active CP1 authority | OBS-5, OBS-6, OBS-7 | false | CLM-5 |
| INT-6 | No archive download, dependency install, production wiring, real input/read, remote operation, guarantee change, or residual-risk acceptance occurs. | Metadata-only reads and local authority edits occurred. | none | approval boundary | approved prompt | OBS-8 | true | CLM-6 |
| INT-7 | If no feasible candidate is identified, production remains `disconnected-fail-closed` with a concrete blocker. | Candidate rejected; missing byte-only API and full-stack lifecycle/zeroization attestation are recorded. | none | fail-closed default | active governance authority | OBS-5, OBS-6, OBS-7 | true | CLM-7 |
