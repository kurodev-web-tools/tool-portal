import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { buildPsqlInvocation, computeBindingSha256, parseTargetBinding } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';

const LIMIT = 65536, TIMEOUT = 3000;
const failure = code => new Error(code);
const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).sort().join(',') === [...keys].sort().join(',');
const SQL = "BEGIN READ ONLY; SET LOCAL statement_timeout='2000ms'; SELECT json_build_object('serverMajor',current_setting('server_version_num')::int/10000,'readOnly',current_setting('transaction_read_only')); ROLLBACK;\n";

// Native defaults are used by the standalone runner. Test seams are not an
// evidence authority or an operational approval. No configurable API origin.
export function createGate1WatchdogTransport(context, {
  requestImpl = https.request, spawnImpl = spawn, connectImpl = net.connect, fsApi = fs,
} = {}) {
  const { policy, bindingJson, authorization, accessToken, env } = context ?? {};
  const parsed = parseTargetBinding(bindingJson);
  if (!parsed.ok || parsed.binding.target !== 'production' ||
      computeBindingSha256(parsed.binding) !== policy?.sourceBindingSha256 ||
      !/^[a-f0-9]{40}$/.test(policy?.sourceCommit ?? '') || !/^[a-f0-9]{64}$/.test(policy?.runId ?? '') ||
      !exact(authorization, ['runId', 'sourceCommit', 'sourceBindingSha256', 'readOnlyPreflight', 'pauseRequest', 'confirmedInaccessibility']) ||
      authorization.runId !== policy.runId || authorization.sourceCommit !== policy.sourceCommit ||
      authorization.sourceBindingSha256 !== policy.sourceBindingSha256 || authorization.readOnlyPreflight !== true ||
      authorization.pauseRequest !== true || authorization.confirmedInaccessibility !== true ||
      typeof accessToken !== 'string' || !/^[\x21-\x7e]{20,4096}$/.test(accessToken)) throw failure('WATCHDOG_TRANSPORT_CONTEXT_INVALID');
  const binding = Object.freeze({ ...parsed.binding });
  const digest = policy.sourceBindingSha256;
  const invocation = buildPsqlInvocation(binding, env, fsApi);
  if (!invocation.ok) throw failure('WATCHDOG_TRANSPORT_CONTEXT_INVALID');
  let ready = false, pauseUsed = false;
  const answer = status => ({ status, sourceBindingSha256: digest });

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
          headers: management ? { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } : { Accept: 'application/json' },
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
              const body = management ? parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) : null;
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

  function pg(args, input, signal) {
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
          env: { ...invocation.env, PGCONNECT_TIMEOUT: '2' }, stdio: ['pipe', 'pipe', 'pipe'] });
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
  function refused(signal) {
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
        socket = connectImpl({ host: binding.host, port: 5432 });
        socket.on('connect', () => finish(false));
        socket.on('error', error => finish(error?.code === 'ECONNREFUSED' && error.port === 5432));
      } catch { finish(false); }
    });
  }
  return Object.freeze({
    async preflight({ signal } = {}) {
      ready = false;
      try {
        const current = (await project(signal)).body;
        if (!sameProject(current) || current.status !== 'ACTIVE_HEALTHY') throw Error();
        const version = await pg(['--version'], '', signal);
        if (!/^psql \(PostgreSQL\) 17(?:\.[0-9]+)+(?:\s.*)?$/.test(version)) throw Error();
        const raw = await pg(['--no-psqlrc', '--no-password', '--set=ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--quiet'], SQL, signal);
        const observed = parseStrictJson(raw);
        if (!exact(observed, ['serverMajor', 'readOnly']) || observed.serverMajor !== 17 || observed.readOnly !== 'on') throw Error();
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
      if (!ready || !pauseUsed) return answer('SOURCE_STATUS_UNKNOWN');
      try {
        const current = (await project(signal)).body;
        if (!sameProject(current) || current.status !== 'INACTIVE') return answer('SOURCE_STATUS_UNKNOWN');
        const [db, rest, auth] = await Promise.all([
          refused(signal),
          request(`${binding.projectRef}.supabase.co`, '/rest/v1/', 'GET', signal, false),
          request(`${binding.projectRef}.supabase.co`, '/auth/v1/health', 'GET', signal, false),
        ]);
        return answer(!signal.aborted && db && rest.status === 503 && auth.status === 503 ? 'SOURCE_INACCESSIBLE' : 'SOURCE_STATUS_UNKNOWN');
      } catch { return answer('SOURCE_STATUS_UNKNOWN'); }
    },
  });
}
