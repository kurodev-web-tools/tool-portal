# Wave 1: TLS And Windows Attestation

- OpenSSL `SSL_OP_CLEANSE_PLAINTEXT` cleanses internal plaintext buffers only; caller I/O buffers remain caller responsibility.
- Winsock shutdown/close can retain or transmit queued data and does not attest memory cleansing.
- Schannel caches session state; `VirtualLock` covers only locked caller pages; Windows pagefiles and crash dumps remain outside the candidate's zeroization acknowledgement.
- Official OpenSSL, curl, and Microsoft sources provide useful local primitives but no end-to-end synchronous complete-zeroization attestation.

Verdict contribution: OS/TLS proof remains unavailable without explicit residual-risk acceptance, which is outside approval.
