# Wave 1: node-libcurl Provenance

- Official repository: `https://github.com/JCMais/node-libcurl`.
- Release/tag: `v5.1.2`; annotated tag object `dc4e6c9ee8be85140a7bf94b0a0327e139a0a13d`; exact commit `1e0bbefa8062043b34e89a7f04897304d7a7ffe7`.
- npm tarball integrity: `sha512-lpPIQu7JqYhrlDbd3esuHyQ9lusvSReQfkpLRw7S80NdJ8hFBRlqHgwQ8RHUIf2JLaAmdUazj26sw0KR+5YsbQ==`.
- Windows Node ABI v127 asset SHA-256: `da05a3b1e51503a2df33f442cfa430926b386018647a37ebcfcd8a7d6c2a74e5`.
- License: MIT. Node engine: `>=22.14`.
- Documented URL/string-list interfaces use strings; binary/data callbacks use Buffer only on selected paths.
- `close()` is void and terminal. `addAbortListener` manages listener disposal but does not attest native transfer cancellation.
- No complete SBOM or transitive license closure was found.

Verdict contribution: identity is sufficiently fixed for rejection, but the interface is not byte-only and provenance is not full-stack complete.
