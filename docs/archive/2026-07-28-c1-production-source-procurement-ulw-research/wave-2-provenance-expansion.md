# Wave 2: Provenance Expansion

- Official registry metadata filled the npm SHA-512/SHA-1 and SLSA attestation URL without downloading the archive.
- Official GitHub metadata peeled the annotated tag to exact commit and supplied the selected prebuilt asset digest.
- Pinned package/vcpkg configuration fixed the Node engine, direct package dependencies, libcurl feature envelope, and vcpkg baseline.
- Exact source pages for every native implementation and a complete SBOM/license closure remain absent.

Expansion result: provenance is strong enough to identify and reject this exact envelope, but not to prove `completeSourceReview`.
