# Wave 1: Node Runtime And Native Boundary

- Official Node `v22.22.2`: V8 `12.4.254.21`, N-API `10`, source SHA-256 `f4b9606f33aef725a77b6292460102b48b80902571a8bb94cd769837ee0577df`, Windows x64 zip SHA-256 `7c93e9d92bf68c07182b471aa187e35ee6cd08ef0f24ab060dfff605fcc1c57c`.
- N-API Buffer pointers remain VM-managed and require explicit lifetime ownership.
- libuv close/cancel completion is asynchronous; cancellation of pending work does not synchronously complete callbacks.
- OpenSSL plaintext cleansing covers only its documented internal scope and leaves application buffers to the caller.

Verdict contribution: Node/N-API/libuv/OpenSSL primitives do not independently establish any of the three full-stack lifecycle/zeroization proofs.
