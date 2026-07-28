# Wave 2: Attestation Counter-Search

- `RtlSecureZeroMemory` guarantees writes for one caller-selected block only.
- OpenSSL FIPS CSP zeroization is limited to validated-module objects, not application/TLS/allocator/socket/OS state.
- `curl_global_cleanup` need not wait for resolver threads; `curl_easy_cleanup` is void and can run callbacks.
- Schannel cache deletion does not attest synchronous full-stack zeroization.

Expansion result: no vendor or Microsoft attestation makes `synchronousAbortReadQuiescence`, `synchronousDisposeAcknowledgement`, or `completeDownstreamZeroization` true for this candidate.
