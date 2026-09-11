# Gate 1 external recovery controller

This isolated Worker contains a bounded Gate 1 attempt when its operator client disappears. It has no application bindings, SQL connection, backup content, Auth configuration API or Production mutation path. Local acceptance is not deployment or Hosted rehearsal acceptance. Every response keeps `gate: NO-GO` and `formalStopAccepted: false`.

## Ownership and deadlines

One SQLite Durable Object owns a fixed Preview/Recovery pair and all four one-use claims: Preview pause, Recovery resume, Recovery pause and Preview resume. A claim is committed before the outbound attempt; an unknown reply, process restart, repeated command or alarm cannot resend it. Direct Dashboard/MCP pause/resume must not race this owner. Run identifiers remain consumed in SQLite, including runs that ended without a mutation. `NEEDS_OPERATOR` cannot be rearmed automatically.

The client lease is two minutes. A new run's absolute deadline is at most 30 minutes after arming and cannot be extended. Only an authenticated, consecutive command with a new evidence digest can attest progress; repeated receipts and read-only state polling do not refresh the lease. Do not run a background heartbeat that invents progress. The operator must stop rehearsal work when the controller closes or its lease expires. These bounds do not replace the native backup/pause/confirmation watchdog's existing phase deadlines.

An accepted `progress` command also obtains fresh Preview/Recovery metadata. A live pause/restore response can precede its completed transition: for example, the immediate observation can remain `PAUSING`. After independently accepting the formal Preview stop, attest that completed stage with a new progress digest before requesting Recovery resume. A separate evidence digest accompanies the resume command. Only a new accepted stage triggers this refresh; duplicate/stale commands and `GET /v1/state` do not. An unavailable read remains `UNKNOWN`, and progress neither repeats a mutation nor supplies formal stopping acceptance.

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

### Simulation arm diagnostics

Only an authenticated `POST /v1/arm` in a valid simulation configuration may add a fixed `diagnostic` string to an HTTP400 response. For example, `{"error":"CONTROLLER_REJECTED","diagnostic":"ARM_PRESERVATION_IN_FUTURE"}` identifies the failed comparison without returning the submitted timestamp. Successful responses and live, disabled, unauthenticated, invalid-route, configuration-before-authentication and command failures keep their existing response contract. No diagnostic logs, new bindings or additional state writes are introduced.

| Diagnostic | Meaning |
| --- | --- |
| `ARM_PACKET` | Content type, body reading or compact/duplicate-free JSON parsing failed before the arm RPC. |
| `ARM_RPC` | Object binding/RPC failed without a recognized internal stage. It is not a specific server exception diagnosis. |
| `ARM_CONFIGURATION`, `ARM_VALIDATION` | The Durable Object rejected configuration or input without a more specific recognized code. |
| `ARM_INPUT_INVALID`, `ARM_SOURCE_MISMATCH` | Exact input shape/types/digests or the source binding were rejected. |
| `ARM_PRESERVATION_IN_FUTURE`, `ARM_PRESERVATION_STALE` | Preservation was later than the controller's arm time, or more than300000ms old. The strict comparisons are unchanged. |
| `ARM_DEADLINE_INVALID`, `ARM_ACKNOWLEDGEMENT_REQUIRED` | The original finite deadline or explicit acknowledgement requirement failed. |
| `ARM_STORAGE` | Registration transaction failed. This also includes a conflicting existing run or a consumed run ID; it does not by itself prove a SQLite outage. |
| `ARM_ALARM`, `ARM_INITIAL_OBSERVATION` | Failure occurred after registration, during alarm setup or initial observation/acceptance. |

Codes are selected from an allowlist at both the Durable Object and HTTP boundary. Raw RPC errors, stacks, targets, credentials, payloads and arbitrary error properties are never returned. Error fields cross the existing RPC boundary using the configured compatibility date's [error serialization](https://developers.cloudflare.com/workers/runtime-apis/rpc/error-handling/); unknown details degrade to `ARM_RPC`.

A diagnostic does not prove that a run or operation allowance is unused. Preserve its original request/response receipt and independently read state; never retry an uncertain arm or command automatically. A client must save the allowlisted diagnostic before rejecting the non-200 response. In particular, local and deployed [timer behavior differs](https://developers.cloudflare.com/workers/runtime-apis/performance/), and an HTTP Date rounded to whole seconds cannot identify a past controller execution timestamp. A future-preservation code identifies the rejected comparison, not the cause of the clocks' disagreement. It does not authorize freshness relaxation, timestamp backdating or an additional trial.

### Simulation state diagnostics

An authenticated `GET /v1/state` in a valid simulation Worker configuration may also add one fixed `diagnostic` to HTTP400. For example, `{"error":"CONTROLLER_REJECTED","diagnostic":"STATE_STORAGE"}` identifies a failed object-state read without returning the SQL error or stored content. HTTP status, successful state shape, authentication and route checks are unchanged. Worker configuration failures before authentication, live/disabled/unauthenticated requests and command failures expose no state diagnostic. No diagnostic log, binding, state write, lease refresh or automatic retry is added.

| Diagnostic | Meaning |
| --- | --- |
| `STATE_BINDING` | Object ID/stub acquisition failed before the state RPC. |
| `STATE_INITIALIZATION` | The existing object schema-initialization callback threw. The exception is rethrown and runtime reset behavior is retained. |
| `STATE_CONFIGURATION` | The object rejected its own configuration, including a disabled object reached by a valid simulation caller. This does not identify which setting differs. |
| `STATE_STORAGE` | Reading or parsing the stored controller state failed. |
| `STATE_POLICY` | Stored policy comparison failed. |
| `STATE_PROJECTION` | Constructing the public representation of stored state failed. |
| `STATE_RPC_OVERLOADED`, `STATE_RPC_RETRYABLE`, `STATE_RPC_REMOTE` | No recognized object stage arrived, but the corresponding RPC exception flag was exactly `true`. Overload takes precedence over the other flags. |
| `STATE_RPC` | The RPC failed without a recognized object stage or flag. This can include startup, transport or response-transfer errors. |
| `STATE_RESPONSE` | JSON response construction failed after the state RPC returned. |

The non-live object emits only a fixed internal code; the caller exposes it only after its valid simulation configuration and authentication checks. This allows configuration drift between caller and object to remain distinguishable while preserving the public disabled/live behavior. Internal arm and state code sets are separate. Unknown messages, error properties and non-boolean flags cannot become response text. A failure to transfer the internal code falls back to an RPC classification.

Cloudflare documents [RPC exception flags](https://developers.cloudflare.com/durable-objects/best-practices/error-handling/) and [initialization reset behavior](https://developers.cloudflare.com/durable-objects/api/state/#blockconcurrencywhile). `remote` can describe application or infrastructure errors; `retryable` is metadata, not permission to retry this controller's bounded attempt. These labels do not prove a specific platform outage or that an operation allowance is unused. Preserve the failed response before any client assertion, keep the original one-use claim, and apply only the independently authorized state-observation and closure procedure. An initial400 followed by UNARMED can be produced by several distinct failure paths and is not sufficient to select a root cause.

## Local verification

Use the repository's installed dependencies from the feature worktree root:

```powershell
node --test workers/gate1-recovery-controller/core.test.mjs workers/gate1-recovery-controller/provider.test.mjs workers/gate1-recovery-controller/worker.test.mjs workers/gate1-recovery-controller/arm-diagnostics.test.mjs workers/gate1-recovery-controller/state-diagnostics.test.mjs
node node_modules/eslint/bin/eslint.js workers/gate1-recovery-controller/*.mjs --max-warnings 0
node scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs
$env:CLOUDFLARE_SEND_METRICS='false'
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config workers/gate1-recovery-controller/wrangler.jsonc --env simulation --outdir .tmp/gate1-controller-build-simulation
git diff --check
```

Miniflare uses real local workerd, SQLite persistence, object reload and scheduled alarms. The simulation cases reject all outbound traffic. The live adapter integration uses synthetic identities and a local outbound-service fixture; it never contacts Supabase. Test-only subclasses induce real SQLite errors and post-registration alarm/observation failures. Diagnostic tests cover RPC propagation, schema-initialization/read failures, caller/object configuration drift, exact freshness boundaries, state retention and sensitive/unknown error suppression. Temporary test databases contain synthetic data only. No dependency/lockfile change is required.

## Initial external execution workflow

Current attempt results and the next approved scope belong in the [operational readiness record](../../docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md). The initial provisioning workflow below does not authorize recreating an existing Worker/namespace, replacing its policy or repeating a consumed trial. Diagnostic source publication, deployment and a new external trial each require their applicable authorization.

1. Publish the reviewed component and operational-record changes through the existing Preview-targeted Git review workflow when authorized. Record the accepted full commit and built Worker digest. Source review/merge is independent of Cloudflare deployment.
2. Read-only verify the intended Cloudflare account, applicable Free allowance/current quota and the absence of a conflicting controller. Paid plan changes are excluded. The current account's zero-cost condition remains UNKNOWN. Initially deploy only the separately named `v-streamer-tools-gate1-recovery-controller-sim` environment, with its own namespace and mode disabled. Its `workers.dev` endpoint is separate from the application Worker; preview URLs remain off. Use the explicit `--env simulation` target. Top-level live deployment has `workers_dev: false` and no route by default.
3. After separate authorization, set only a new simulation operator secret and the fixed synthetic policy, pinning the accepted commit. Enable simulation, verify unauthorized requests fail, arm a short synthetic run, issue pause/resume once and close the client. Independently verify the deployed alarm, all four counters exactly1, final metadata simulation states and persistent duplicate rejection. This makes zero Supabase requests. Preserve sanitized receipts. If this external control test fails, stop before any live credential or Hosted action.
4. For a later live activation packet, independently verify scoped-PAT availability on the intended Supabase account and the exact selected Preview/Recovery projects. Use the shortest practical expiration covering the single approved run and cleanup, with only Project Settings read-write. Record scope/expiration evidence without the token. Its `sbp_fc` prefix is only a format check; it does not prove project scope or permissions. Classic full-account PATs are prohibited. Create/store the secret only after authorization; never put it in arguments, logs, source, issue comments or receipts. Record the exact target/source policy and approved emergency predicates before enabling a separate live namespace/endpoint.
5. A new Hosted trial requires new approval, fresh preservation/evidence, a new run ID/deadline and a verified deployed controller. All four mutations then belong exclusively to the controller. The ended post-PR833 attempt remains ended with all four allowances consumed. No old run, receipt, approval or namespace reset grants another attempt. After independently confirmed containment, disable further arming and revoke the short-lived token under the approved execution packet; preserve SQLite/evidence and do not delete the namespace to reset history.

[Cloudflare alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) may be delivered repeatedly and do not guarantee an exact deadline or provider success. [SQLite Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) is subject to the actual account's plan and limits. [Supabase scoped PATs](https://supabase.com/docs/guides/platform/personal-access-tokens) are subject to account availability; Project Settings read-write includes additional powers such as deletion, so it is not a pause/resume-only credential. The fixed controller allowlist is a separate restriction. All of these external facts and the concrete account/policy/secret/activation actions must be checked before the corresponding approved step.
