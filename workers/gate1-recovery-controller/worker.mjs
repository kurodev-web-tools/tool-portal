import { DurableObject } from 'cloudflare:workers';
import { claim, command, confirmDispatch, createRun, nextAction, nextAlarm, observe, publicState, requireThat, settle, terminal, tick, validatePolicy } from './core.mjs';
import { createProvider, parseCanonicalJson, readBody } from './provider.mjs';

const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
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
        const state = await object.state();
        if (stateDiagnosticStage) stateDiagnosticStage = 'STATE_RESPONSE';
        return json(state);
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
  async state() {
    let stage = 'STATE_CONFIGURATION';
    try {
      const policy = configuration(this.env);
      stage = 'STATE_STORAGE';
      const state = this.read();
      stage = 'STATE_POLICY';
      requireThat(!state || samePolicy(state.policy, policy));
      stage = 'STATE_PROJECTION';
      return state ? publicState(state) : { phase: 'UNARMED', gate: 'NO-GO', formalStopAccepted: false };
    } catch (error) {
      throw stateFailure(this.env, error, stage);
    }
  }
  async arm(input) {
    let stage = 'ARM_CONFIGURATION';
    try {
      const policy = configuration(this.env);
      stage = 'ARM_VALIDATION';
      const state = createRun(policy, input, Date.now());
      stage = 'ARM_STORAGE';
      this.ctx.storage.transactionSync(() => {
        const previous = this.read();
        requireThat(!previous || (samePolicy(previous.policy, policy) && ['RESTORED', 'ENDED_NO_MUTATION'].includes(previous.phase)));
        requireThat(this.sql.exec('SELECT run_id FROM used_runs WHERE run_id=?', state.runId).toArray().length === 0);
        this.sql.exec('INSERT INTO used_runs(run_id,value) VALUES(?,?)', state.runId, JSON.stringify(state));
        if (policy.mode === 'simulation' && !previous) {
          this.sql.exec("INSERT INTO simulation(role,status) VALUES('preview','ACTIVE_HEALTHY'),('recovery','INACTIVE')");
        }
        this.write(state);
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
