# Gate 1 external recovery controller

This isolated Worker contains a bounded Gate 1 attempt when its operator client disappears. It has no application bindings, SQL connection, backup content, Auth configuration API or Production mutation path. Local acceptance is not deployment or Hosted rehearsal acceptance. Every response keeps `gate: NO-GO` and `formalStopAccepted: false`.

## Ownership and deadlines

One SQLite Durable Object owns a fixed Preview/Recovery pair and all four one-use claims: Preview pause, Recovery resume, Recovery pause and Preview resume. A claim is committed before the outbound attempt; an unknown reply, process restart, repeated command or alarm cannot resend it. Direct Dashboard/MCP pause/resume must not race this owner. Run identifiers remain consumed in SQLite, including runs that ended without a mutation. `NEEDS_OPERATOR` cannot be rearmed automatically.

The client lease is two minutes. A new run's absolute deadline is at most 30 minutes after arming and cannot be extended. Only an authenticated, consecutive command with a new evidence digest can attest progress; repeated receipts and read-only state polling do not refresh the lease. Do not run a background heartbeat that invents progress. The operator must stop rehearsal work when the controller closes or its lease expires. These bounds do not replace the native backup/pause/confirmation watchdog's existing phase deadlines.

On expiry or explicit abort/finish, cleanup observes for at most ten minutes. Recovery pause requires an owned resume attempt followed by a fresh ACTIVE_HEALTHY observation. Preview emergency resume requires its owned pause and observed INACTIVE state, plus fresh Recovery INACTIVE. If Recovery resume was attempted, it additionally requires observed Recovery ACTIVE_HEALTHY, an owned Recovery pause, and two subsequent INACTIVE observations at least one second apart. An uncertain resume never observed active blocks emergency Preview resume because a delayed server-side restore could still be pending. Unknown identity/status blocks mutation. Cleanup exhaustion ends at `NEEDS_OPERATOR`, requiring fresh independent diagnosis and a separately authorized manual action.

Provider response acceptance is distinct from project-state confirmation. Even `RESTORED` proves only this controller's metadata containment predicates. Native/API two-round stopping proofs, preservation comparisons and full Gate 1 acceptance still belong to the independent published operators. The arm preservation digest and resume/progress evidence digests are authenticated operator attestations; this component cannot inspect their underlying files or prove they are correct. `GET /v1/state` exposes the latest stored observations and their timestamps, not a new provider read.

## API and configuration

All routes require `Authorization: Bearer <operator token>`. There is no CORS support. Bodies must be compact `JSON.stringify` objects, at most 8192 UTF-8 bytes, with exact keys and no duplicate keys. Timestamps are integer Unix milliseconds; IDs/digests are lowercase SHA-256 strings and the source commit is a full lowercase Git SHA-1. Preservation verification must be at most five minutes old both when arming and when the first Preview pause is claimed; progress cannot renew it.

| Route | Input |
| --- | --- |
| `POST /v1/arm` | `runId`, `sourceCommit`, `hardEndAt`, `preservationSha256`, `preservationVerifiedAt`, `acknowledgeEmergencyContainment: true` |
| `POST /v1/command` | `runId`, consecutive `sequence` starting at 1, `type` |
| `GET /v1/state` | No input; no lease refresh or project mutation |

Command types are `pause-preview`, `resume-recovery`, `progress`, `abort` and `finish`. `resume-recovery` and `progress` additionally require `evidenceSha256`. Unknown fields, caller-supplied targets/URLs, stale runs, expired leases, reused receipts and consumed claims are rejected. A rejected HTTP request can follow a persisted claim or expiry transition: inspect state, never infer unused allowance from an error response or retry a mutation automatically.

| Binding | Required value |
| --- | --- |
| `CONTROLLER_MODE` | `disabled` by default; explicitly enabled as `simulation` or `live` |
| `CONTROLLER_POLICY_JSON` | Encrypted secret holding a compact exact object: `mode`, `previewRef`, `recoveryRef`, `productionRef`, `organizationId`, `sourceCommit`, `emergencyPreviewResume` |
| `CONTROLLER_OPERATOR_TOKEN` | Secret: 64–256 base64url characters from a cryptographically random generator; never a checked-in value |
| `SUPABASE_SCOPED_TOKEN` | Live only: a separately verified scoped PAT for Preview/Recovery; prohibited in simulation |
| `GUARDIAN` | The component's own SQLite Durable Object namespace |

Simulation accepts only `p` repeated20, `r` repeated20 and `x` repeated20 as its three references, with organization `synthetic-org`. It has no outbound fetch path. Live validates exact project identity, organization, Tokyo region, database host and PostgreSQL17 before using metadata. Its only network paths are the two bound project GETs and POST `/pause` or `/restore` on `https://api.supabase.com/v1/projects/`. Redirects, non-200 replies, duplicate JSON keys, oversized/partial bodies and responses outside three seconds are rejected; no request is automatically retried.

The policy is immutable once stored in this namespace. Do not change targets, source pin, mode or namespace to bypass a consumed claim. A future policy/namespace migration needs a separately reviewed lifecycle transition after all pending actions are reconciled. Do not disable, delete, redeploy or rotate away a valid management secret during an active/closing run. Doing so can prevent containment. Retain the original run ledger and provider evidence even after an operator intervenes.

## Local verification

Use the repository's installed dependencies from the feature worktree root:

```powershell
node --test workers/gate1-recovery-controller/core.test.mjs workers/gate1-recovery-controller/provider.test.mjs workers/gate1-recovery-controller/worker.test.mjs
node node_modules/eslint/bin/eslint.js workers/gate1-recovery-controller/*.mjs --max-warnings 0
node scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs
$env:CLOUDFLARE_SEND_METRICS='false'
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config workers/gate1-recovery-controller/wrangler.jsonc --env simulation --outdir .tmp/gate1-controller-build-simulation
git diff --check
```

Miniflare uses real local workerd, SQLite persistence, object reload and scheduled alarms. The simulation cases reject all outbound traffic. The live adapter integration uses synthetic identities and a local outbound-service fixture; it never contacts Supabase. A test-only subclass induces a real SQLite error before the first claim. Temporary test databases contain synthetic data only. No dependency/lockfile change is required.

## Concrete external execution packet — not yet executed

1. Publish the reviewed component and operational-record changes through the existing Preview-targeted Git review workflow when authorized. Record the accepted full commit and built Worker digest. Source review/merge is independent of Cloudflare deployment.
2. Read-only verify the intended Cloudflare account, applicable Free allowance/current quota and the absence of a conflicting controller. Paid plan changes are excluded. The current account's zero-cost condition remains UNKNOWN. Initially deploy only the separately named `v-streamer-tools-gate1-recovery-controller-sim` environment, with its own namespace and mode disabled. Its `workers.dev` endpoint is separate from the application Worker; preview URLs remain off. Use the explicit `--env simulation` target. Top-level live deployment has `workers_dev: false` and no route by default.
3. After separate authorization, set only a new simulation operator secret and the fixed synthetic policy, pinning the accepted commit. Enable simulation, verify unauthorized requests fail, arm a short synthetic run, issue pause/resume once and close the client. Independently verify the deployed alarm, all four counters exactly1, final metadata simulation states and persistent duplicate rejection. This makes zero Supabase requests. Preserve sanitized receipts. If this external control test fails, stop before any live credential or Hosted action.
4. For a later live activation packet, independently verify scoped-PAT availability on the intended Supabase account and the exact selected Preview/Recovery projects. Use the shortest practical expiration covering the single approved run and cleanup, with only Project Settings read-write. Record scope/expiration evidence without the token. Its `sbp_fc` prefix is only a format check; it does not prove project scope or permissions. Classic full-account PATs are prohibited. Create/store the secret only after authorization; never put it in arguments, logs, source, issue comments or receipts. Record the exact target/source policy and approved emergency predicates before enabling a separate live namespace/endpoint.
5. A new Hosted trial requires new approval, fresh preservation/evidence, a new run ID/deadline and a verified deployed controller. All four mutations then belong exclusively to the controller. The ended post-PR833 attempt remains ended with all four allowances consumed. No old run, receipt, approval or namespace reset grants another attempt. After independently confirmed containment, disable further arming and revoke the short-lived token under the approved execution packet; preserve SQLite/evidence and do not delete the namespace to reset history.

[Cloudflare alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) may be delivered repeatedly and do not guarantee an exact deadline or provider success. [SQLite Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) is subject to the actual account's plan and limits. [Supabase scoped PATs](https://supabase.com/docs/guides/platform/personal-access-tokens) are subject to account availability; Project Settings read-write includes additional powers such as deletion, so it is not a pause/resume-only credential. The fixed controller allowlist is a separate restriction. All of these external facts and the concrete account/policy/secret/activation actions must be checked before the corresponding approved step.
