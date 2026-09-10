import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import dns from 'node:dns';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { buildPsqlInvocation, computeBindingSha256, parseTargetBinding } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import { parseWatchdogTimestamp } from './comment-translator-paid-core-v1-gate1-watchdog.mjs';

const LIMIT = 65536, TIMEOUT = 3000;
// Supabase's documented project-paused response; generic 5xx is insufficient.
// https://supabase.com/docs/guides/troubleshooting/http-status-codes
const PAUSED_HTTP = 540;
const failure = code => new Error(code);
const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).sort().join(',') === [...keys].sort().join(',');
const REST = '/rest/v1/comment_translator_paid_entitlements?select=*&limit=0', AUTH = '/auth/v1/health';
const SQL = "BEGIN READ ONLY; SET LOCAL statement_timeout='2000ms'; SELECT json_build_object('serverMajor',current_setting('server_version_num')::int/10000,'readOnly',current_setting('transaction_read_only'),'tls',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),'anonSelect',has_table_privilege('anon','public.comment_translator_paid_entitlements','SELECT')); ROLLBACK;\n";

// Native defaults are used by the standalone runner. Test seams are not an
// evidence authority or an operational approval. No configurable API origin.
export function createGate1WatchdogTransport(context, {
  requestImpl = https.request, spawnImpl = spawn, connectImpl = net.connect, fsApi = fs,
  lookupImpl = dns.lookup, clock = { wallNow: Date.now, monotonicNow: () => performance.now() },
} = {}) {
  const { policy, bindingJson, authorization, accessToken, env, publicProbe } = context ?? {};
  const parsed = parseTargetBinding(bindingJson);
  if (!parsed.ok || parsed.binding.target !== 'production' ||
      computeBindingSha256(parsed.binding) !== policy?.sourceBindingSha256 ||
      !/^[a-f0-9]{40}$/.test(policy?.sourceCommit ?? '') || !/^[a-f0-9]{64}$/.test(policy?.runId ?? '') ||
      !exact(authorization, ['runId', 'sourceCommit', 'sourceBindingSha256', 'readOnlyPreflight', 'pauseRequest', 'confirmedInaccessibility']) ||
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
  let ready = false, pauseUsed = false, pins = [], generation = 0, coverageLost = false, age = initialAge;
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
      let done = false, req, response, timer;
      const complete = (error, value) => {
        if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
        response?.destroy(); req?.destroy();
        if (error) reject(failure('WATCHDOG_HTTP_FAILED')); else resolve(value);
      };
      const abort = () => complete(true);
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(abort, TIMEOUT);
      try {
        req = requestImpl({ protocol: 'https:', hostname, port: 443, path, method,
          agent: false, rejectUnauthorized: true, ca: tls.rootCertificates, servername: hostname,
          headers: management ? { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } : { apikey: apiKey, Accept: 'application/json' },
        }, res => {
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
      let done = false, timer;
      const finish = (error, result) => {
        if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
        if (error) reject(failure('WATCHDOG_DNS_FAILED')); else resolve(result);
      };
      const abort = () => finish(true);
      signal.addEventListener('abort', abort, { once: true }); timer = setTimeout(abort, TIMEOUT);
      try {
        lookupImpl(binding.host, { all: true, verbatim: true }, (error, rows) => {
          if (done) return;
          // Absence is not stopping evidence. Pinned-address refusals remain mandatory.
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
        if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
        if (ok) resolve(text); else { try { child?.kill(); } catch { /* Never arm after failure. */ } reject(failure('WATCHDOG_PG_PROBE_FAILED')); }
      };
      const abort = () => finish(false);
      signal.addEventListener('abort', abort, { once: true }); timer = setTimeout(abort, TIMEOUT);
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
  function refused(address, signal) {
    return new Promise(resolve => {
      if (!(signal instanceof AbortSignal) || signal.aborted) { resolve(false); return; }
      let socket, done = false, timer;
      const finish = value => {
        if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
        socket?.destroy(); resolve(value);
      };
      const abort = () => finish(false);
      signal.addEventListener('abort', abort, { once: true }); timer = setTimeout(abort, TIMEOUT);
      try {
        socket = connectImpl({ host: address, port: 5432 });
        socket.on('connect', () => finish(false));
        socket.on('error', error => finish(error?.code === 'ECONNREFUSED' && error.port === 5432 && error.address === address));
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
        pins = Object.freeze(captured); coverageLost = false;
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
      if (!ready || !pauseUsed || coverageLost || !pins.length || !fresh()) return answer('SOURCE_STATUS_UNKNOWN');
      try {
        const current = (await project(signal)).body;
        if (!sameProject(current) || current.status !== 'INACTIVE') return answer('SOURCE_STATUS_UNKNOWN');
        const currentAddresses = await addresses(signal, true);
        if (currentAddresses?.some(address => !pins.includes(address))) { coverageLost = true; return answer('SOURCE_STATUS_UNKNOWN'); }
        const [db, rest, auth] = await Promise.all([
          Promise.all(pins.map(address => refused(address, signal))),
          request(`${binding.projectRef}.supabase.co`, REST, 'GET', signal, false),
          request(`${binding.projectRef}.supabase.co`, AUTH, 'GET', signal, false),
        ]);
        const [finalProject, finalAddresses] = await Promise.all([project(signal), addresses(signal, true)]);
        if (finalAddresses?.some(address => !pins.includes(address))) coverageLost = true;
        return answer(!signal.aborted && ready && !coverageLost && fresh() && db.every(Boolean) &&
          rest.status === PAUSED_HTTP && auth.status === PAUSED_HTTP && sameProject(finalProject.body) && finalProject.body.status === 'INACTIVE'
          ? 'SOURCE_INACCESSIBLE' : 'SOURCE_STATUS_UNKNOWN');
      } catch { return answer('SOURCE_STATUS_UNKNOWN'); }
    },
  });
}
