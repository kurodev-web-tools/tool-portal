import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import dns from 'node:dns';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { buildPsqlInvocation, computeBindingSha256, parseTargetBinding } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import { parseWatchdogTimestamp, STOP_EVIDENCE_POLICY, STOP_ROUND_MS } from './comment-translator-paid-core-v1-gate1-watchdog.mjs';

const LIMIT = 65536, TIMEOUT = 3000;
// Supabase's documented project-paused response; generic 5xx is insufficient.
// https://supabase.com/docs/guides/troubleshooting/http-status-codes
const PAUSED_HTTP = 540;
const failure = code => new Error(code);
const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).sort().join(',') === [...keys].sort().join(',');
const REST = '/rest/v1/comment_translator_paid_entitlements?select=*&limit=0', AUTH = '/auth/v1/health';
const SQL = "BEGIN READ ONLY; SET LOCAL statement_timeout='2000ms'; SELECT json_build_object('serverMajor',current_setting('server_version_num')::int/10000,'readOnly',current_setting('transaction_read_only'),'tls',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),'anonSelect',has_table_privilege('anon','public.comment_translator_paid_entitlements','SELECT')); ROLLBACK;\n";

// Shared with separately bound rehearsal observers. Callers supply verified
// pins and exact-origin readers; these helpers do not grant operational authority.
export function observeGate1DirectAddress(address, signal, { connectImpl = net.connect,
  timers = { setTimeout, clearTimeout }, clock = { monotonicNow: () => performance.now() }, onConnect } = {}) {
  return new Promise(resolve => {
    if (!(signal instanceof AbortSignal) || signal.aborted || !net.isIP(address)) { resolve('UNKNOWN'); return; }
    let socket, done = false, closed = false, timer, candidate = 'UNKNOWN', started;
    const finish = value => {
      if (done) return; done = true; timers.clearTimeout(timer); signal.removeEventListener('abort', abort); resolve(value);
    };
    const destroy = () => { try { socket?.destroy(); } catch { finish('UNKNOWN'); } };
    const abort = () => { candidate = 'UNKNOWN'; destroy(); finish('UNKNOWN'); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      started = clock.monotonicNow();
      if (!Number.isFinite(started)) throw Error();
      socket = connectImpl({ host: address, port: 5432 });
      // Keep this listener through terminal close, even after cancellation.
      socket.on('connect', () => { if (!closed) { candidate = 'UNKNOWN'; onConnect(); destroy(); } });
      socket.on('error', error => {
        if (closed || done) return;
        candidate = error?.code === 'ECONNREFUSED' && error.port === 5432 && error.address === address ? 'CLOSED_REFUSED' : 'UNKNOWN';
        timers.clearTimeout(timer); destroy();
      });
      socket.on('close', () => { closed = true; finish(signal.aborted ? 'UNKNOWN' : candidate); });
      timer = timers.setTimeout(() => {
        const duration = clock.monotonicNow() - started;
        candidate = Number.isFinite(duration) && duration >= TIMEOUT && !signal.aborted ? 'NO_CONNECT_WITHIN_WINDOW' : 'UNKNOWN';
        destroy();
      }, TIMEOUT);
    } catch { destroy(); finish('UNKNOWN'); }
  });
}

export async function observeGate1PauseRound({ signal, pins, project, addresses, http, sameProject,
  remainingMs, invalidate, reportDirect = () => {} }, { connectImpl = net.connect, timers = { setTimeout, clearTimeout },
  clock = { monotonicNow: () => performance.now() } } = {}) {
  const outer = new AbortController(), start = clock.monotonicNow(); let outerTimer, invalid = false;
  const abort = () => outer.abort();
  const veto = reason => { invalid = true; invalidate(reason); };
  const validAddresses = rows => Array.isArray(rows) && rows.length > 0 && rows.length <= 8 &&
    rows.every(address => typeof address === 'string' && net.isIP(address)) && new Set(rows).size === rows.length;
  const budget = () => { const left = remainingMs(); if (!Number.isFinite(left) || left < 0) throw Error(); return left; };
  const readProject = async s => { const value = await project(s); if (!sameProject(value)) veto('IDENTITY_CHANGED'); return value; };
  const readAddresses = async s => {
    const value = await addresses(s);
    if (value !== null && !validAddresses(value)) throw Error();
    if (value?.some(address => !pins.includes(address))) veto('ADDRESS_COVERAGE_CHANGED');
    return value;
  };
  async function phase(fn) {
    const controller = new AbortController(), began = clock.monotonicNow(); let timer, listener;
    const cancel = () => controller.abort();
    outer.signal.addEventListener('abort', cancel, { once: true });
    try {
      if (outer.signal.aborted) throw Error();
      const value = await Promise.race([Promise.resolve().then(() => fn(controller.signal)), new Promise((_, reject) => {
        listener = () => reject(Error('WATCHDOG_PHASE_CANCELLED'));
        controller.signal.addEventListener('abort', listener, { once: true });
        timer = timers.setTimeout(cancel, Math.max(1, Math.min(4000, budget())));
      })]);
      const duration = clock.monotonicNow() - began;
      if (outer.signal.aborted || controller.signal.aborted || !Number.isFinite(duration) || duration < 0 || duration > 4000) throw Error();
      return value;
    } finally {
      timers.clearTimeout(timer); outer.signal.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', listener); controller.abort();
    }
  }
  function check([metadata]) {
    return !invalid && metadata.status === 'INACTIVE';
  }
  try {
    if (!(signal instanceof AbortSignal) || signal.aborted || !Number.isFinite(start) || !validAddresses(pins)) return null;
    signal.addEventListener('abort', abort, { once: true });
    outerTimer = timers.setTimeout(abort, Math.max(1, Math.min(STOP_ROUND_MS, budget())));
    if (!check(await phase(s => Promise.all([readProject(s), readAddresses(s)])))) return null;
    const [direct, rest, auth] = await phase(s => Promise.all([
      Promise.all(pins.map(async address => {
        const outcome = await observeGate1DirectAddress(address, s, { connectImpl, timers, clock, onConnect: () => veto('DIRECT_CONNECTED') });
        reportDirect(outcome); return outcome;
      })),
      http('rest', s), http('auth', s),
    ]));
    if (!check(await phase(s => Promise.all([readProject(s), readAddresses(s)])))) return null;
    const duration = clock.monotonicNow() - start;
    if (invalid || signal.aborted || outer.signal.aborted || !Number.isFinite(duration) || duration < 0 ||
        duration > STOP_ROUND_MS || budget() < 0 || rest.status !== PAUSED_HTTP || auth.status !== PAUSED_HTTP ||
        !direct.every(v => ['CLOSED_REFUSED', 'NO_CONNECT_WITHIN_WINDOW'].includes(v))) return null;
    return { pinnedAddressCount: pins.length, directRefusedCount: direct.filter(v => v === 'CLOSED_REFUSED').length,
      directNoConnectCount: direct.filter(v => v === 'NO_CONNECT_WITHIN_WINDOW').length };
  } catch { return null; }
  finally { timers.clearTimeout(outerTimer); signal?.removeEventListener('abort', abort); outer.abort(); }
}

// Native defaults are used by the standalone runner. Test seams are not an
// evidence authority or an operational approval. No configurable API origin.
export function createGate1WatchdogTransport(context, {
  requestImpl = https.request, spawnImpl = spawn, connectImpl = net.connect, fsApi = fs,
  lookupImpl = dns.lookup, clock = { wallNow: Date.now, monotonicNow: () => performance.now() }, timers = { setTimeout, clearTimeout },
} = {}) {
  const { policy, bindingJson, authorization, accessToken, env, publicProbe } = context ?? {};
  const parsed = parseTargetBinding(bindingJson);
  if (!parsed.ok || parsed.binding.target !== 'production' ||
      !exact(policy, ['schemaVersion', 'stopEvidencePolicy', 't0', 'sourceBindingSha256', 'sourceCommit', 'runId']) ||
      computeBindingSha256(parsed.binding) !== policy?.sourceBindingSha256 ||
      policy?.schemaVersion !== 2 || policy.stopEvidencePolicy !== STOP_EVIDENCE_POLICY ||
      !/^[a-f0-9]{40}$/.test(policy?.sourceCommit ?? '') || !/^[a-f0-9]{64}$/.test(policy?.runId ?? '') ||
      !exact(authorization, ['runId', 'sourceCommit', 'sourceBindingSha256', 'stopEvidencePolicy', 'readOnlyPreflight', 'pauseRequest', 'confirmedInaccessibility']) ||
      authorization.stopEvidencePolicy !== STOP_EVIDENCE_POLICY ||
      authorization.runId !== policy.runId || authorization.sourceCommit !== policy.sourceCommit ||
      authorization.sourceBindingSha256 !== policy.sourceBindingSha256 || authorization.readOnlyPreflight !== true ||
      authorization.pauseRequest !== true || authorization.confirmedInaccessibility !== true ||
      typeof accessToken !== 'string' || !/^[\x21-\x7e]{20,4096}$/.test(accessToken) ||
      !exact(publicProbe, ['projectRef', 'apiKey']) || publicProbe.projectRef !== parsed.binding.projectRef ||
      typeof publicProbe.apiKey !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]{10,200}$/.test(publicProbe.apiKey)) throw failure('WATCHDOG_TRANSPORT_CONTEXT_INVALID');
  const binding = Object.freeze({ ...parsed.binding });
  const digest = policy.sourceBindingSha256;
  const invocation = buildPsqlInvocation(binding, env, fsApi);
  if (!invocation.ok) throw failure('WATCHDOG_TRANSPORT_CONTEXT_INVALID');
  const apiKey = publicProbe.apiKey, epoch = parseWatchdogTimestamp(policy.t0);
  const started = clock.monotonicNow(), initialAge = clock.wallNow() - epoch;
  if (!Number.isFinite(epoch) || !Number.isFinite(started) || !Number.isFinite(initialAge) || initialAge < 0 || initialAge > 300000) throw failure('WATCHDOG_TRANSPORT_CONTEXT_INVALID');
  let ready = false, pauseUsed = false, pins = [], generation = 0, coverageLost = false, age = initialAge, pinSetId, probing = false;
  const proofIdentity = Object.freeze({ stopEvidencePolicy: STOP_EVIDENCE_POLICY, runId: policy.runId, sourceCommit: policy.sourceCommit, sourceBindingSha256: digest });
  const answer = status => ({ status, sourceBindingSha256: digest });
  const fresh = (limit = 1200000) => {
    const mono = clock.monotonicNow() - started, wall = clock.wallNow() - epoch;
    if (!Number.isFinite(mono) || mono < 0 || !Number.isFinite(wall)) return false;
    age = Math.max(age, initialAge + mono, wall);
    return age <= limit;
  };

  function request(hostname, path, method, signal, management = true) {
    return new Promise((resolve, reject) => {
      if (!(signal instanceof AbortSignal) || signal.aborted) { reject(failure('WATCHDOG_TRANSPORT_ABORTED')); return; }
      let done = false, req, response, timer; const began = clock.monotonicNow();
      const complete = (error, value) => {
        if (done) return; done = true; timers.clearTimeout(timer); signal.removeEventListener('abort', abort);
        response?.destroy(); req?.destroy();
        const duration = clock.monotonicNow() - began;
        if (error || !Number.isFinite(duration) || duration < 0 || duration > TIMEOUT) reject(failure('WATCHDOG_HTTP_FAILED')); else resolve(value);
      };
      const abort = () => complete(true);
      signal.addEventListener('abort', abort, { once: true });
      timer = timers.setTimeout(abort, TIMEOUT);
      try {
        req = requestImpl({ protocol: 'https:', hostname, port: 443, path, method,
          agent: false, rejectUnauthorized: true, ca: tls.rootCertificates, servername: hostname,
          headers: management ? { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } : { apikey: apiKey, Accept: 'application/json' },
        }, res => {
          if (done) { res.on('error', () => {}); res.destroy(); return; }
          response = res; const chunks = []; let bytes = 0;
          res.on('error', () => complete(true));
          res.on('aborted', () => complete(true));
          res.on('data', chunk => {
            bytes += chunk.length;
            if (bytes > LIMIT) complete(true); else chunks.push(Buffer.from(chunk));
          });
          res.on('end', () => {
            if (done) return;
            // No redirects, no permissive 2xx range, and no raw response output.
            if (management && res.statusCode !== 200) { complete(true); return; }
            try {
              // Only the required stopping response may have a non-JSON body.
              const body = !management && res.statusCode === PAUSED_HTTP ? null : parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
              complete(false, { status: res.statusCode, body });
            } catch { complete(true); }
          });
        });
        req.on('error', () => complete(true)); req.end();
      } catch { complete(true); }
    });
  }
  const project = signal => request('api.supabase.com', `/v1/projects/${binding.projectRef}`, 'GET', signal);
  const sameProject = p => p?.ref === binding.projectRef && p.database?.host === binding.host && p.database.postgres_engine === '17';

  function addresses(signal, allowAbsent = false) {
    return new Promise((resolve, reject) => {
      if (!(signal instanceof AbortSignal) || signal.aborted) { reject(failure('WATCHDOG_DNS_FAILED')); return; }
      let done = false, timer; const began = clock.monotonicNow();
      const finish = (error, result) => {
        if (done) return; done = true; timers.clearTimeout(timer); signal.removeEventListener('abort', abort);
        const duration = clock.monotonicNow() - began;
        if (error || !Number.isFinite(duration) || duration < 0 || duration > TIMEOUT) reject(failure('WATCHDOG_DNS_FAILED')); else resolve(result);
      };
      const abort = () => finish(true);
      signal.addEventListener('abort', abort, { once: true }); timer = timers.setTimeout(abort, TIMEOUT);
      try {
        lookupImpl(binding.host, { all: true, verbatim: true }, (error, rows) => {
          if (done) return;
          // Completed absence is not stopping evidence; retain the validated pins.
          if (error) { finish(!(allowAbsent && error.code === 'ENOTFOUND'), null); return; }
          if (!Array.isArray(rows) || !rows.length || rows.length > 8 || rows.some(r =>
            !r || ![4, 6].includes(r.family) || net.isIP(r.address) !== r.family)) { finish(true); return; }
          finish(false, [...new Set(rows.map(r => r.address))].sort());
        });
      } catch { finish(true); }
    });
  }
  function pg(args, input, signal, address) {
    return new Promise((resolve, reject) => {
      if (!(signal instanceof AbortSignal) || signal.aborted) { reject(failure('WATCHDOG_TRANSPORT_ABORTED')); return; }
      let child, done = false, timer, bytes = 0;
      const stdout = [], stderr = [];
      const finish = (ok, text) => {
        if (done) return; done = true; timers.clearTimeout(timer); signal.removeEventListener('abort', abort);
        if (ok) resolve(text); else { try { child?.kill(); } catch { /* Never arm after failure. */ } reject(failure('WATCHDOG_PG_PROBE_FAILED')); }
      };
      const abort = () => finish(false);
      signal.addEventListener('abort', abort, { once: true }); timer = timers.setTimeout(abort, TIMEOUT);
      try {
        child = spawnImpl(invocation.command, args, { shell: false, windowsHide: true,
          env: { ...invocation.env, PGCONNECT_TIMEOUT: '2', ...(address ? { PGHOSTADDR: address } : {}) }, stdio: ['pipe', 'pipe', 'pipe'] });
        const collect = list => chunk => { bytes += chunk.length; if (bytes > LIMIT) finish(false); else list.push(Buffer.from(chunk)); };
        child.on('error', () => finish(false)); child.stdin.on('error', () => finish(false));
        child.stdout.on('data', collect(stdout)); child.stderr.on('data', collect(stderr));
        child.on('close', (code, killed) => {
          if (code !== 0 || killed !== null || Buffer.concat(stderr).length) { finish(false); return; }
          try { finish(true, new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(stdout)).trim()); }
          catch { finish(false); }
        });
        child.stdin.end(input);
      } catch { finish(false); }
    });
  }
  return Object.freeze({
    async preflight({ signal } = {}) {
      ready = false; pins = []; const attempt = ++generation;
      try {
        if (pauseUsed || !fresh(300000)) throw Error();
        const current = (await project(signal)).body;
        if (!sameProject(current) || current.status !== 'ACTIVE_HEALTHY') throw Error();
        const version = await pg(['--version'], '', signal);
        if (!/^psql \(PostgreSQL\) 17(?:\.[0-9]+)+(?:\s.*)?$/.test(version)) throw Error();
        const captured = await addresses(signal);
        await Promise.all(captured.map(async address => {
          const raw = await pg(['--no-psqlrc', '--no-password', '--set=ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--quiet'], SQL, signal, address);
          const observed = parseStrictJson(raw);
          if (!exact(observed, ['serverMajor', 'readOnly', 'tls', 'anonSelect']) || observed.serverMajor !== 17 ||
              observed.readOnly !== 'on' || observed.tls !== true || observed.anonSelect !== false) throw Error();
        }));
        // REST permission denial proves dispatch, not authorization or full health.
        const [rest, auth] = await Promise.all([
          request(`${binding.projectRef}.supabase.co`, REST, 'GET', signal, false),
          request(`${binding.projectRef}.supabase.co`, AUTH, 'GET', signal, false),
        ]);
        if (rest.status !== 401 || !exact(rest.body, ['code', 'message', 'details', 'hint']) || rest.body.code !== '42501' ||
            rest.body.message !== 'permission denied for table comment_translator_paid_entitlements' ||
            rest.body.details !== null || (rest.body.hint !== null && typeof rest.body.hint !== 'string') || auth.status !== 200 ||
            !exact(auth.body, ['name', 'version', 'description']) || auth.body.name !== 'GoTrue' ||
            typeof auth.body.version !== 'string' || !auth.body.version || typeof auth.body.description !== 'string') throw Error();
        const [finalProject, finalAddresses] = await Promise.all([project(signal), addresses(signal)]);
        if (signal.aborted || attempt !== generation || !fresh(300000) || !sameProject(finalProject.body) ||
            finalProject.body.status !== 'ACTIVE_HEALTHY' || JSON.stringify(finalAddresses) !== JSON.stringify(captured)) throw Error();
        pins = Object.freeze(captured); coverageLost = false; pinSetId = randomBytes(32).toString('hex');
        ready = true; return answer('WATCHDOG_TRANSPORT_READY');
      } catch { throw failure('WATCHDOG_PREFLIGHT_FAILED'); }
    },
    async requestPause({ signal } = {}) {
      if (!ready) throw failure('WATCHDOG_TRANSPORT_NOT_READY');
      if (pauseUsed) throw failure('WATCHDOG_PAUSE_ALREADY_ATTEMPTED');
      pauseUsed = true;
      const r = await request('api.supabase.com', `/v1/projects/${binding.projectRef}/pause`, 'POST', signal);
      if (!exact(r.body, [])) throw failure('WATCHDOG_PAUSE_OUTCOME_UNKNOWN');
      return answer('PAUSE_REQUEST_ACCEPTED');
    },
    async confirmStopped({ signal } = {}) {
      if (!ready || !pauseUsed || coverageLost || probing || !pins.length || !fresh()) return answer('SOURCE_STATUS_UNKNOWN');
      probing = true;
      try {
        const counts = await observeGate1PauseRound({ signal, pins, project: async s => (await project(s)).body,
          addresses: s => addresses(s, true), sameProject, invalidate: () => { coverageLost = true; },
          remainingMs: () => fresh() ? 1200000 - age : -1,
          http: (route, s) => request(`${binding.projectRef}.supabase.co`, route === 'rest' ? REST : AUTH, 'GET', s, false),
        }, { connectImpl, timers, clock });
        return counts && !coverageLost ? { status: 'SOURCE_PAUSE_ROUND_COMPLETE', ...proofIdentity, pinSetId, ...counts } : answer('SOURCE_STATUS_UNKNOWN');
      } finally { probing = false; }
    },
  });
}
