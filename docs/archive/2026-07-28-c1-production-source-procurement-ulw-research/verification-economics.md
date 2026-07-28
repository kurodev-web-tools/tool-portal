# C1 Production Source Procurement Verification Economics

| Claim | Risk | Error cost | Verification cost/time | Chosen path | Decision | Outcome | Residual risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Candidate official identity | high | wrong source could invalidate all review | moderate | official repository plus official registry/release metadata | verify | exact tag/commit fixed | unsigned tag and no full SBOM |
| Seven-proof eligibility | critical | guarantee weakening or secret retention | high | independent repository/runtime/native/OS review plus counter-search | verify | 0/7 proven; reject | none accepted |
| Archive checksum | high | unbound source acquisition | low if official registry/release metadata publishes it | verify metadata without download | npm SHA-512 and prebuilt SHA-256 fixed | archive contents not locally inspected |
| Runtime/OS full zeroization | critical | false erasure claim | high | official source/docs and explicit attestation search | classify negative | no end-to-end attestation exists | local primitives do not compose into guarantee |
| Prohibited-operation absence | high | scope breach | low | Git/status/network-action audit | verify | no prohibited path observed | final diff audit required |
