import { DurableObject } from 'cloudflare:workers';
import { claim, command, compatiblePredecessor, confirmDispatch, createRun, exact, nextAction, nextAlarm, observe, predecessorStateText, publicState, requireThat, settle, terminal, tick, validatePolicy } from './core.mjs';
import { createProvider, parseCanonicalJson, readBody } from './provider.mjs';
import { GRANT_HEADER, grantSha256, parseSafeClosureGrant, policySha256, sha256Text, validateClosureBinding, validateWorkerClosureTime } from './safe-closure.mjs';

const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const CLOSURE_TABLE = 'CREATE TABLE safe_closure_transitions (grant_id TEXT PRIMARY KEY NOT NULL, prior_run_id TEXT NOT NULL UNIQUE, successor_run_id TEXT NOT NULL UNIQUE, grant_sha256 TEXT NOT NULL UNIQUE, grant_json TEXT NOT NULL, prior_state_json TEXT NOT NULL, closure_evidence_sha256 TEXT NOT NULL, registered_at INTEGER NOT NULL)';
const samePolicy = (a, b) => Object.keys(a).every(key => a[key] === b[key]);
const ARM_VALIDATION_DIAGNOSTICS = new Set(['ARM_INPUT_INVALID', 'ARM_SOURCE_MISMATCH', 'ARM_PRESERVATION_IN_FUTURE', 'ARM_PRESERVATION_STALE', 'ARM_DEADLINE_INVALID', 'ARM_ACKNOWLEDGEMENT_REQUIRED']);
const ARM_DIAGNOSTICS = new Set([...ARM_VALIDATION_DIAGNOSTICS, 'ARM_CONFIGURATION', 'ARM_VALIDATION', 'ARM_STORAGE', 'ARM_ALARM', 'ARM_INITIAL_OBSERVATION']);
const STATE_DIAGNOSTICS = new Set(['STATE_INITIALIZATION', 'STATE_CONFIGURATION', 'STATE_STORAGE', 'STATE_POLICY', 'STATE_PROJECTION']);
function stateFailure(env, error, diagnostic) {
  // A disabled object can be reached by a valid simulation caller during mode
  // mismatch. Visibility still belongs to the authenticated HTTP boundary.
  if (env.CONTROLLER_MODE === 'live') return error;
  return Object.assign(Error('CONTROLLER_REJECTED'), { controllerDiagnostic: diagnostic });
}
function stateRpcDiagnostic(error) {
  if (STATE_DIAGNOSTICS.has(error?.controllerDiagnostic)) return error.controllerDiagnostic;
  // These flags describe the exception; they never authorize another attempt.
  if (error?.overloaded === true) return 'STATE_RPC_OVERLOADED';
  if (error?.retryable === true) return 'STATE_RPC_RETRYABLE';
  if (error?.remote === true) return 'STATE_RPC_REMOTE';
  return 'STATE_RPC';
}
function configuration(env) {
  const policy = validatePolicy(parseCanonicalJson(env.CONTROLLER_POLICY_JSON));
  requireThat(policy.mode === env.CONTROLLER_MODE);
  requireThat(/^[A-Za-z0-9_-]{64,256}$/.test(env.CONTROLLER_OPERATOR_TOKEN ?? ''));
  if (policy.mode === 'live') createProvider(policy, env.SUPABASE_SCOPED_TOKEN);
  else requireThat(!env.SUPABASE_SCOPED_TOKEN);
  return policy;
}
function authorized(request, token) {
  const supplied = request.headers.get('Authorization') ?? '', expected = 'Bearer ' + token;
  if (supplied.length !== expected.length) return false;
  let different = 0;
  for (let i = 0; i < expected.length; i++) different |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return different === 0;
}
async function packet(request) {
  requireThat(request.headers.get('Content-Type') === 'application/json');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try { return parseCanonicalJson(await readBody(request, 8192, controller.signal)); }
  finally { clearTimeout(timer); }
}

const controllerWorker = {
  async fetch(request, env) {
    if (!['simulation', 'live'].includes(env.CONTROLLER_MODE)) return json({ error: 'DISABLED' }, 503);
    let diagnosticStage = null;
    let stateDiagnosticStage = null;
    try {
      const policy = configuration(env);
      if (!authorized(request, env.CONTROLLER_OPERATOR_TOKEN)) return json({ error: 'UNAUTHORIZED' }, 401);
      const url = new URL(request.url);
      const method = { '/v1/state': 'GET', '/v1/arm': 'POST', '/v1/command': 'POST' }[url.pathname];
      if (!method || url.search || url.hash || request.method !== method) return json({ error: 'NOT_FOUND' }, 404);
      if (policy.mode === 'simulation' && url.pathname === '/v1/arm') diagnosticStage = 'ARM_RPC';
      if (policy.mode === 'simulation' && url.pathname === '/v1/state') stateDiagnosticStage = 'STATE_BINDING';
      // Role swaps still address the same owner. No caller-selected object/run namespace.
      const pair = [policy.previewRef, policy.recoveryRef].sort().join(':');
      const id = env.GUARDIAN.idFromName(policy.mode + ':' + pair);
      const object = env.GUARDIAN.get(id);
      if (url.pathname === '/v1/state') {
        if (stateDiagnosticStage) stateDiagnosticStage = 'STATE_RPC';
        const result = await object.state(true);
        if (stateDiagnosticStage) stateDiagnosticStage = 'STATE_RESPONSE';
        // Legacy internal callers still receive the original projection. The
        // HTTP caller requests an envelope from the same DO snapshot; an older
        // object cannot accidentally supply a grant digest from outer env.
        if (exact(result, ['state', 'safeClosureGrantSha256'])) {
          requireThat(result.safeClosureGrantSha256 === null || typeof result.safeClosureGrantSha256 === 'string' && /^[a-f0-9]{64}$/.test(result.safeClosureGrantSha256));
          return json(result.state, 200, result.safeClosureGrantSha256 ? { [GRANT_HEADER]: result.safeClosureGrantSha256 } : {});
        }
        return json(result);
      }
      if (diagnosticStage) diagnosticStage = 'ARM_PACKET';
      const input = await packet(request);
      if (diagnosticStage) diagnosticStage = 'ARM_RPC';
      return json(url.pathname === '/v1/arm' ? await object.arm(input) : await object.accept(input));
    } catch (error) {
      // Only authenticated simulation arm/state errors expose a fixed code. Never
      // return an RPC message, stack, target, timestamp or arbitrary property.
      const armDiagnostic = diagnosticStage && (ARM_DIAGNOSTICS.has(error?.controllerDiagnostic) ? error.controllerDiagnostic : diagnosticStage);
      const stateDiagnostic = stateDiagnosticStage && (stateDiagnosticStage === 'STATE_RPC' ? stateRpcDiagnostic(error) : stateDiagnosticStage);
      const diagnostic = armDiagnostic || stateDiagnostic;
      return json({ error: 'CONTROLLER_REJECTED', ...(diagnostic ? { diagnostic } : {}) }, 400);
    }
  },
};
export default controllerWorker;

export class Gate1RecoveryController extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      try {
        this.sql.exec('CREATE TABLE IF NOT EXISTS controller_state (slot INTEGER PRIMARY KEY CHECK(slot=1), value TEXT NOT NULL)');
        this.sql.exec('CREATE TABLE IF NOT EXISTS used_runs (run_id TEXT PRIMARY KEY, value TEXT NOT NULL)');
        this.sql.exec('CREATE TABLE IF NOT EXISTS simulation (role TEXT PRIMARY KEY, status TEXT NOT NULL)');
        this.sql.exec(CLOSURE_TABLE.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS '));
        // Do not silently adopt an unknown existing audit-table contract.
        const schema = this.sql.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='safe_closure_transitions'").toArray();
        requireThat(schema.length === 1 && schema[0].sql === CLOSURE_TABLE);
      } catch (error) {
        // Rethrow: initialization must still fail and the runtime must reset.
        throw stateFailure(env, error, 'STATE_INITIALIZATION');
      }
    });
  }

  read() {
    const rows = this.sql.exec('SELECT value FROM controller_state WHERE slot=1').toArray();
    return rows.length ? JSON.parse(rows[0].value) : null;
  }
  write(state) {
    const value = JSON.stringify(state);
    this.sql.exec('INSERT INTO controller_state(slot,value) VALUES(1,?) ON CONFLICT(slot) DO UPDATE SET value=excluded.value', value);
    // Retain every run's last ledger after an explicitly armed successor replaces the slot.
    this.sql.exec('UPDATE used_runs SET value=? WHERE run_id=?', value, state.runId);
  }
  change(runId, update) {
    return this.ctx.storage.transactionSync(() => {
      const state = this.read();
      requireThat(state && state.runId === runId);
      update(state);
      this.write(state);
      return state;
    });
  }
  provider(policy) {
    if (policy.mode === 'live') return createProvider(policy, this.env.SUPABASE_SCOPED_TOKEN);
    // Simulation has no fetch path and no real target identifiers or management secret.
    return {
      read: async role => {
        const now = Date.now();
        const rows = this.sql.exec('SELECT status FROM simulation WHERE role=?', role).toArray();
        requireThat(rows.length === 1);
        return { status: rows[0].status, startedAt: now, completedAt: now };
      },
      mutate: async operation => {
        const roles = { previewPause: 'preview', recoveryResume: 'recovery', recoveryPause: 'recovery', previewResume: 'preview' };
        requireThat(Object.hasOwn(roles, operation));
        this.sql.exec('UPDATE simulation SET status=? WHERE role=?', operation.endsWith('Pause') ? 'INACTIVE' : 'ACTIVE_HEALTHY', roles[operation]);
        return 'ACCEPTED';
      },
    };
  }
  async schedule() {
    // Never push an existing alarm later. A stale early wake simply rechecks current state.
    // Do not delete alarms: a terminal request must not erase a concurrently armed run's alarm.
    const existing = await this.ctx.storage.getAlarm();
    const state = this.read();
    const when = state && nextAlarm(state, Date.now());
    if (when && (existing === null || when < existing)) await this.ctx.storage.setAlarm(when);
  }
  async refresh(runId, provider) {
    const results = await Promise.all(['preview', 'recovery'].map(async role => {
      try { return [role, await provider.read(role)]; }
      catch { const now = Date.now(); return [role, { status: 'UNKNOWN', startedAt: now, completedAt: now }]; }
    }));
    return this.change(runId, state => {
      for (const [role, result] of results) observe(state, role, result, Date.now());
      tick(state, Date.now());
    });
  }
  async perform(runId, operation, provider) {
    this.change(runId, state => claim(state, operation, Date.now()));
    // Durable claim and a future wake must both succeed before the only outbound attempt.
    await this.ctx.storage.sync();
    await this.schedule();
    try {
      const current = this.read();
      requireThat(current?.runId === runId);
      confirmDispatch(current, operation, Date.now());
    } catch {
      this.change(runId, state => { settle(state, operation, 'UNKNOWN', Date.now()); tick(state, Date.now()); });
      await this.schedule();
      return;
    }
    const outcome = await provider.mutate(operation);
    this.change(runId, state => { settle(state, operation, outcome, Date.now()); tick(state, Date.now()); });
    await this.refresh(runId, provider);
    await this.schedule();
  }
  async closureSnapshot(previous, policy) {
    const previousText = JSON.stringify(previous), grantText = this.env.CONTROLLER_SAFE_CLOSURE_GRANT_JSON;
    const grant = parseSafeClosureGrant(grantText), priorStateText = validateClosureBinding(previous, policy, grant);
    const rows = this.sql.exec('SELECT value FROM used_runs WHERE run_id=?', previous.runId).toArray();
    requireThat(rows.length === 1 && rows[0].value === previousText);
    const [stateDigest, grantDigest, policyDigest] = await Promise.all([sha256Text(priorStateText), grantSha256(grantText), policySha256(policy)]);
    requireThat(stateDigest === grant.predecessor.stateSha256 && policyDigest === grant.policySha256);
    return { previous, previousText, priorRowText: rows[0].value, priorStateText, grantText, grant, grantDigest };
  }
  checkClosureSnapshot(snapshot) {
    requireThat(JSON.stringify(this.read()) === snapshot.previousText && this.env.CONTROLLER_SAFE_CLOSURE_GRANT_JSON === snapshot.grantText);
    const rows = this.sql.exec('SELECT value FROM used_runs WHERE run_id=?', snapshot.previous.runId).toArray();
    requireThat(rows.length === 1 && rows[0].value === snapshot.priorRowText);
  }
  checkClosureMetadata(observations, now) {
    for (const [role, result] of observations) {
      requireThat(exact(result, ['status', 'startedAt', 'completedAt']) && result.status === (role === 'preview' ? 'ACTIVE_HEALTHY' : 'INACTIVE'));
      requireThat([now, result.startedAt, result.completedAt].every(t => Number.isSafeInteger(t) && t >= 0));
      requireThat(result.startedAt <= result.completedAt && result.completedAt <= now && result.completedAt - result.startedAt <= 3000 && now - result.startedAt <= 10000);
    }
  }
  async state(envelope = false) {
    let stage = 'STATE_CONFIGURATION';
    try {
      const policy = configuration(this.env);
      stage = 'STATE_STORAGE';
      const state = this.read();
      stage = 'STATE_POLICY';
      let closure = null;
      // Optional settings are irrelevant to active/closing/ordinary runs. A bad
      // setting must never prevent their existing GET or recovery operations.
      if (state?.phase === 'RESTORED' && state.reason === 'MUTATION_OUTCOME_UNKNOWN' && state.operations?.previewPause?.outcome === 'UNKNOWN') {
        try { closure = await this.closureSnapshot(state, policy); }
        catch (error) { if (!samePolicy(state.policy, policy)) throw error; }
      }
      if (closure) this.checkClosureSnapshot(closure);
      requireThat(!state || samePolicy(state.policy, policy) || compatiblePredecessor(state, policy) || closure);
      stage = 'STATE_PROJECTION';
      const projection = state ? publicState(state) : { phase: 'UNARMED', gate: 'NO-GO', formalStopAccepted: false };
      return envelope ? { state: projection, safeClosureGrantSha256: closure?.grantDigest ?? null } : projection;
    } catch (error) {
      throw stateFailure(this.env, error, stage);
    }
  }
  async arm(input) {
    let stage = 'ARM_CONFIGURATION';
    try {
      const policy = configuration(this.env);
      stage = 'ARM_VALIDATION';
      createRun(policy, input, Date.now());
      stage = 'ARM_STORAGE';
      const previous = this.read(), previousText = JSON.stringify(previous);
      let closure = null, closureObservations = null;
      if (Object.hasOwn(input, 'safeClosure')) {
        requireThat(previous);
        closure = await this.closureSnapshot(previous, policy);
        const { grant, grantDigest } = closure;
        requireThat(input.safeClosure.grantSha256 === grantDigest && input.safeClosure.manifestSha256 === grant.successor.manifestSha256);
        requireThat(input.runId === grant.successor.runId && input.sourceCommit === grant.successor.sourceCommit && input.hardEndAt === grant.successor.hardEndAt);
        requireThat(Object.keys(grant.predecessor).every(key => input.predecessor[key] === grant.predecessor[key]));
        this.checkClosureSnapshot(closure);
        validateWorkerClosureTime(previous, grant, Date.now());
        requireThat(this.sql.exec('SELECT grant_id FROM safe_closure_transitions WHERE grant_id=? OR prior_run_id=? OR successor_run_id=? OR grant_sha256=?', grant.grantId, previous.runId, input.runId, grantDigest).toArray().length === 0);
        const provider = this.provider(policy);
        closureObservations = await Promise.all(['preview', 'recovery'].map(async role => [role, await provider.read(role)]));
        this.checkClosureMetadata(closureObservations, Date.now());
      } else if (previous) {
        requireThat(compatiblePredecessor(previous, policy) && input.predecessor?.runId === previous.runId && input.predecessor.sourceCommit === previous.sourceCommit);
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(predecessorStateText(publicState(previous))));
        requireThat(input.predecessor.stateSha256 === Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''));
      } else requireThat(!Object.hasOwn(input, 'predecessor'));
      const state = this.ctx.storage.transactionSync(() => {
        // Hashing yields. Recheck the entire prior snapshot atomically with new
        // registration; retain its used-run row byte for byte, including claims.
        requireThat(JSON.stringify(this.read()) === previousText);
        if (previous) {
          const rows = this.sql.exec('SELECT value FROM used_runs WHERE run_id=?', previous.runId).toArray();
          requireThat(rows.length === 1 && rows[0].value === previousText);
        }
        const state = createRun(policy, input, Date.now());
        requireThat(this.sql.exec('SELECT run_id FROM used_runs WHERE run_id=?', state.runId).toArray().length === 0);
        if (closure) {
          this.checkClosureSnapshot(closure);
          validateWorkerClosureTime(previous, closure.grant, Date.now());
          this.checkClosureMetadata(closureObservations, Date.now());
          const { grant, grantDigest } = closure;
          // UNIQUE constraints repeat the unused-grant checks atomically. The
          // audit insert, new ledger and current-slot writes roll back together.
          this.sql.exec('INSERT INTO safe_closure_transitions(grant_id,prior_run_id,successor_run_id,grant_sha256,grant_json,prior_state_json,closure_evidence_sha256,registered_at) VALUES(?,?,?,?,?,?,?,?)', grant.grantId, previous.runId, state.runId, grantDigest, closure.grantText, closure.priorStateText, grant.closureEvidenceSha256, Date.now());
          state.safeClosureTransition = { grantId: grant.grantId, grantSha256: grantDigest, manifestSha256: grant.successor.manifestSha256, closureEvidenceSha256: grant.closureEvidenceSha256 };
        }
        this.sql.exec('INSERT INTO used_runs(run_id,value) VALUES(?,?)', state.runId, JSON.stringify(state));
        if (policy.mode === 'simulation' && !previous) {
          this.sql.exec("INSERT INTO simulation(role,status) VALUES('preview','ACTIVE_HEALTHY'),('recovery','INACTIVE')");
        }
        this.write(state);
        return state;
      });
      stage = 'ARM_ALARM';
      await this.schedule();
      stage = 'ARM_INITIAL_OBSERVATION';
      const checked = await this.refresh(state.runId, this.provider(policy));
      if (checked.observed.preview?.status !== 'ACTIVE_HEALTHY' || checked.observed.recovery?.status !== 'INACTIVE') {
        this.change(state.runId, s => { command(s, { runId: s.runId, sequence: s.sequence + 1, type: 'abort' }, Date.now()); tick(s, Date.now()); });
        throw Error('INITIAL_STATE_REJECTED');
      }
      return publicState(this.read());
    } catch (error) {
      if (this.env.CONTROLLER_MODE !== 'simulation') throw error;
      const controllerDiagnostic = stage === 'ARM_VALIDATION' && ARM_VALIDATION_DIAGNOSTICS.has(error?.armDiagnostic) ? error.armDiagnostic : stage;
      throw Object.assign(Error('CONTROLLER_REJECTED'), { controllerDiagnostic });
    }
  }
  async accept(input) {
    const policy = configuration(this.env), original = this.read();
    requireThat(original && samePolicy(original.policy, policy));
    // Persist expiry independently: rejection of a stale command must not roll it back.
    this.change(original.runId, s => tick(s, Date.now()));
    await this.schedule();
    const state = this.change(original.runId, s => { command(s, input, Date.now()); tick(s, Date.now()); });
    await this.schedule();
    const provider = this.provider(policy);
    if (state.requested && state.phase === 'ARMED') {
      await this.refresh(state.runId, provider);
      await this.perform(state.runId, state.requested, provider);
    } else if (state.phase === 'ARMED' && input.type === 'progress') {
      // A genuine new evidence stage may observe a provider transition that
      // completed after its one-use mutation. State polling remains passive.
      await this.refresh(state.runId, provider);
      await this.schedule();
    } else if (state.phase === 'CLOSING') await this.cleanup(state.runId, provider);
    return publicState(this.read());
  }
  async cleanup(runId, provider) {
    await this.refresh(runId, provider);
    const state = this.change(runId, s => tick(s, Date.now()));
    const operation = nextAction(state, Date.now());
    if (operation) await this.perform(runId, operation, provider);
    await this.schedule();
  }
  async alarm() {
    const state = this.read();
    if (!state || terminal(state)) return;
    const current = this.change(state.runId, s => tick(s, Date.now()));
    // Install another wake before network work; alarm retry cannot replay consumed claims.
    await this.schedule();
    const policy = configuration(this.env);
    requireThat(samePolicy(current.policy, policy));
    if (current.phase === 'CLOSING') await this.cleanup(current.runId, this.provider(policy));
  }
}
