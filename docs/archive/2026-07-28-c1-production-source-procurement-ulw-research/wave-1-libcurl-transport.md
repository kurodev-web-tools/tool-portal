# Wave 1: libcurl Transport

- node-libcurl `v5.1.2` build metadata selects libcurl `>=8.17.0`; the candidate envelope fixes the documented release value `8.17.0`.
- libcurl header lists are caller-owned pointers, while auth/user-password paths allocate and later free internal values.
- `curl_easy_cleanup` releases resources but can run callbacks during cleanup and does not promise secure wiping.
- Abort through progress callbacks can terminate transfer, but pause/callback behavior retains internal buffers and is not a full-stack synchronous quiescence barrier.
- TLS backend and static dependency scope are build-configurable.

Verdict contribution: release and cleanup APIs provide resource release, not synchronous complete zeroization.
