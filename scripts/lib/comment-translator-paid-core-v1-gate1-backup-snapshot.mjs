import { BACKUP_TABLE_DEFAULTS_SQL, validateBackupTableDefaults } from './comment-translator-paid-core-v1-gate1-backup-default-acl.mjs';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { buildPsqlInvocation, computeBindingSha256, parseTargetBinding } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import { BACKUP_SOURCE_STATE_SQL, validateBackupSourceState } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';

const MAX_BYTES = 64 * 1024;
const LIFETIME_MS = 300_000;
export const BACKUP_CLOCK_SKEW_MS = 1_000;
const ARGS = Object.freeze(['--no-psqlrc', '--no-password', '--set=ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--quiet']);
const SQL = (requireEmptyVectorTables, requireSourceState) => `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL idle_in_transaction_session_timeout = '300000ms';
SET LOCAL search_path = pg_catalog, public;
${requireEmptyVectorTables ? "SET LOCAL statement_timeout = '10000ms';\nSET LOCAL row_security = off;\n" : ''}SELECT json_build_object('serverMajor', current_setting('server_version_num')::int / 10000,
  't0', transaction_timestamp(), 'snapshot', pg_export_snapshot(),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'transactionIsolation', current_setting('transaction_isolation')${requireEmptyVectorTables ? `,
  'vectorCounts', json_build_object(
    'storage.buckets_vectors', (SELECT count(*) FROM storage.buckets_vectors),
    'storage.vector_indexes', (SELECT count(*) FROM storage.vector_indexes))` : ''}${requireSourceState ? `,
  'sourceState', ${BACKUP_SOURCE_STATE_SQL}, 'tableDefaults', ${BACKUP_TABLE_DEFAULTS_SQL}` : ''});
`;
const safeError = (reason, cleanupConfirmed = true) => Object.assign(new Error(reason), { cleanupConfirmed });

// This transport only holds a read-only transaction. Closing it does not prove
// backup completion, source authority, restore readiness or any Gate decision.
export function createBackupSnapshotTransport({
  spawnImpl = spawn, spawnSyncImpl = spawnSync, fsApi = fs,
  now = Date.now, monotonicNow = () => performance.now(), setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout,
} = {}) {
  return {
    async open({ target, bindingJson, expectedBindingSha256, env, signal, requireEmptyVectorTables = false, requireSourceState = false } = {}) {
      if (signal !== undefined && !(signal instanceof AbortSignal)) throw safeError('SNAPSHOT_CONTEXT_INVALID');
      if (typeof requireEmptyVectorTables !== 'boolean') throw safeError('SNAPSHOT_CONTEXT_INVALID');
      if (typeof requireSourceState !== 'boolean' || (requireSourceState && !requireEmptyVectorTables)) throw safeError('SNAPSHOT_CONTEXT_INVALID');
      const parsed = parseTargetBinding(bindingJson);
      if (!parsed.ok || parsed.binding.target !== target ||
          !/^[a-f0-9]{64}$/.test(expectedBindingSha256 ?? '') ||
          computeBindingSha256(parsed.binding) !== expectedBindingSha256) throw safeError('SNAPSHOT_CONTEXT_INVALID');
      const invocation = buildPsqlInvocation(parsed.binding, env, fsApi);
      if (!invocation.ok) throw safeError('SNAPSHOT_CONTEXT_INVALID');
      if (signal?.aborted) throw safeError('SNAPSHOT_ABORTED');
      let version;
      try {
        const r = spawnSyncImpl(invocation.command, ['--version'], {
          env: invocation.env, shell: false, windowsHide: true, timeout: 10_000, maxBuffer: MAX_BYTES,
        });
        if (r.error || r.signal || r.status !== 0 || !Buffer.isBuffer(r.stdout) ||
            !Buffer.isBuffer(r.stderr) || r.stderr.length || r.stdout.length > MAX_BYTES) throw new Error();
        version = new TextDecoder('utf-8', { fatal: true }).decode(r.stdout).trim();
        if (!/^psql \(PostgreSQL\) 17(?:\.[0-9]+)*(?: .*)?$/.test(version)) throw new Error();
      } catch { throw safeError('SNAPSHOT_CLIENT_INVALID'); }
      if (signal?.aborted) throw safeError('SNAPSHOT_ABORTED');

      let child;
      try {
        child = spawnImpl(invocation.command, [...ARGS], {
          env: invocation.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch { throw safeError('SNAPSHOT_START_FAILED'); }
      let state = 'starting', failure = null, childClosed = false, finished = false;
      let readySettled = false, closeRequested = false;
      let stdout = '', byteCount = 0, metadata = null, deadline = null;
      let startupTimer, lifetimeTimer, closeTimer, killTimer;
      let previousMono = -Infinity;
      const remainingMs = () => {
        const value = monotonicNow();
        if (!Number.isFinite(value) || value < previousMono) return NaN;
        previousMono = value;
        return deadline - value;
      };
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let readyResolve, readyReject, closedResolve;
      const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
      const closed = new Promise(resolve => { closedResolve = resolve; });
      const clearTimers = () => {
        for (const timer of [startupTimer, lifetimeTimer, closeTimer, killTimer]) if (timer !== undefined) clearTimeoutImpl(timer);
      };
      const settleClosed = () => {
        if (finished) return;
        finished = true;
        state = 'closed';
        clearTimers();
        signal?.removeEventListener('abort', onAbort);
        closedResolve(Object.freeze({ ok: failure === null && closeRequested, closed: childClosed, reason: failure }));
      };
      const fail = (reason) => {
        if (finished) return;
        failure ??= reason;
        state = 'failed';
        if (!readySettled) { readySettled = true; readyReject(safeError(failure, false)); }
        if (childClosed) { settleClosed(); return; }
        if (killTimer !== undefined) return;
        killTimer = setTimeoutImpl(settleClosed, 2_000);
        try { child.stdin.destroy(); } catch { /* Completion still requires close. */ }
        try { child.kill(); } catch { /* The bounded result will be unconfirmed. */ }
      };
      const onAbort = () => fail('SNAPSHOT_ABORTED');
      const parseMetadata = () => {
        try {
          const receivedMono = monotonicNow();
          const value = parseStrictJson(stdout.trim());
          const keys = ['serverMajor', 't0', 'snapshot', 'transactionReadOnly', 'transactionIsolation'];
          if (requireEmptyVectorTables) keys.push('vectorCounts');
          if (requireSourceState) keys.push('sourceState', 'tableDefaults');
          if (!value || typeof value !== 'object' || Array.isArray(value) ||
              Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)) ||
              value.serverMajor !== 17 || value.transactionReadOnly !== 'on' || value.transactionIsolation !== 'repeatable read' ||
              typeof value.t0 !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value.t0) ||
              typeof value.snapshot !== 'string' || !/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{8}-[1-9][0-9]{0,9}$/.test(value.snapshot)) throw new Error();
          if (requireEmptyVectorTables) {
            const counts = value.vectorCounts, tables = ['storage.buckets_vectors', 'storage.vector_indexes'];
            if (!counts || typeof counts !== 'object' || Array.isArray(counts) ||
                Object.keys(counts).length !== tables.length || tables.some(name => counts[name] !== 0)) throw new Error();
            Object.freeze(counts);
          }
          if (requireSourceState) {
            validateBackupSourceState(value.sourceState);
            validateBackupTableDefaults(value.tableDefaults);
            value.tableDefaults.forEach(Object.freeze); Object.freeze(value.tableDefaults);
            value.sourceState.rowCounts.forEach(Object.freeze);
            Object.freeze(value.sourceState.rowCounts); Object.freeze(value.sourceState.vectorCounts); Object.freeze(value.sourceState);
          }
          const t0 = Date.parse(value.t0), age = now() - t0;
          const fractionalMicros = Number((value.t0.match(/\.(\d{1,6})/)?.[1] ?? '').padEnd(6, '0'));
          const exactAge = age - (fractionalMicros % 1000) / 1000;
          const parts = value.t0.slice(0, 19).split(/[-T:]/).map(Number);
          const calendar = new Date(0);
          calendar.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
          calendar.setUTCHours(parts[3], parts[4], parts[5], 0);
          const actualParts = [calendar.getUTCFullYear(), calendar.getUTCMonth() + 1, calendar.getUTCDate(),
            calendar.getUTCHours(), calendar.getUTCMinutes(), calendar.getUTCSeconds()];
          if (parts.some((value, index) => value !== actualParts[index])) throw new Error();
          if (!Number.isFinite(t0) || !Number.isFinite(age) || exactAge < -BACKUP_CLOCK_SKEW_MS || age + BACKUP_CLOCK_SKEW_MS >= LIFETIME_MS) throw new Error();
          metadata = Object.freeze(value);
          previousMono = receivedMono;
          if (!Number.isFinite(previousMono) || previousMono < 0) throw new Error();
          // Charge the full allowed skew as age; never add it to the five-minute window.
          const remaining = LIFETIME_MS - age - BACKUP_CLOCK_SKEW_MS;
          deadline = previousMono + remaining;
          clearTimeoutImpl(startupTimer);
          lifetimeTimer = setTimeoutImpl(() => fail('SNAPSHOT_DEADLINE_EXCEEDED'), remaining);
          state = 'ready';
          readySettled = true;
          readyResolve();
        } catch { fail('SNAPSHOT_METADATA_INVALID'); }
      };
      child.on('error', () => fail('SNAPSHOT_PROCESS_FAILED'));
      child.stdin.on('error', () => fail('SNAPSHOT_PROCESS_FAILED'));
      child.stdout.on('error', () => fail('SNAPSHOT_PROCESS_FAILED'));
      child.stderr.on('error', () => fail('SNAPSHOT_PROCESS_FAILED'));
      child.stderr.on('data', () => fail('SNAPSHOT_STDERR'));
      child.stdout.on('data', chunk => {
        if (finished || failure) return;
        if (!Buffer.isBuffer(chunk) || (byteCount += chunk.length) > MAX_BYTES) { fail('SNAPSHOT_OUTPUT_INVALID'); return; }
        if (metadata !== null) { fail('SNAPSHOT_OUTPUT_INVALID'); return; }
        try { stdout += decoder.decode(chunk, { stream: true }); }
        catch { fail('SNAPSHOT_OUTPUT_INVALID'); return; }
        if (stdout.includes('\n')) {
          try {
            if (decoder.decode() !== '' || !/^\{[^\r\n]*\}\r?\n$/.test(stdout)) throw new Error();
          } catch { fail('SNAPSHOT_OUTPUT_INVALID'); return; }
          parseMetadata();
        }
      });
      child.on('close', (code, processSignal) => {
        childClosed = true;
        if (finished) return;
        try { if (decoder.decode() !== '') fail('SNAPSHOT_OUTPUT_INVALID'); }
        catch { fail('SNAPSHOT_OUTPUT_INVALID'); }
        if (finished) return;
        if (code !== 0 || processSignal) fail('SNAPSHOT_PROCESS_FAILED');
        else if (!closeRequested || metadata === null) fail('SNAPSHOT_EARLY_EXIT');
        else if (!(remainingMs() > 0)) fail('SNAPSHOT_DEADLINE_EXCEEDED');
        if (!finished) settleClosed();
      });
      startupTimer = setTimeoutImpl(() => fail('SNAPSHOT_START_TIMEOUT'), 10_000);
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
      try { if (!failure) child.stdin.write(SQL(requireEmptyVectorTables, requireSourceState)); }
      catch { fail('SNAPSHOT_PROCESS_FAILED'); }
      try {
        await ready;
        if (state !== 'ready') throw safeError(failure ?? 'SNAPSHOT_PROCESS_FAILED', childClosed);
      }
      catch {
        const cleanup = await closed;
        throw safeError(failure ?? 'SNAPSHOT_PROCESS_FAILED', cleanup.closed);
      }
      const assertActive = () => {
        if (state !== 'ready') throw safeError(failure ?? 'SNAPSHOT_NOT_ACTIVE', childClosed);
        if (!(remainingMs() > 0)) {
          fail('SNAPSHOT_DEADLINE_EXCEEDED');
          throw safeError('SNAPSHOT_DEADLINE_EXCEEDED', childClosed);
        }
      };
      return Object.freeze({
        snapshot: metadata.snapshot, t0: metadata.t0, closed, assertActive, remainingMs,
        ...(requireEmptyVectorTables ? { vectorCounts: metadata.vectorCounts } : {}),
        ...(requireSourceState ? { sourceState: metadata.sourceState, tableDefaults: metadata.tableDefaults } : {}),
        async commit() {
          assertActive();
          closeRequested = true;
          state = 'closing';
          closeTimer = setTimeoutImpl(() => fail('SNAPSHOT_CLOSE_TIMEOUT'), 10_000);
          try { child.stdin.end('COMMIT;\n'); } catch { fail('SNAPSHOT_PROCESS_FAILED'); }
          return closed;
        },
        async abort() { fail('SNAPSHOT_ABORTED'); return closed; },
      });
    },
  };
}
