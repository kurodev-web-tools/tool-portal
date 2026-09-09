import { prepareBackupSchemaWithDefaults } from './comment-translator-paid-core-v1-gate1-backup-default-acl.mjs';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildPsqlInvocation, computeBindingSha256, parseTargetBinding } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { createBackupSnapshotTransport } from './comment-translator-paid-core-v1-gate1-backup-snapshot.mjs';
import { transformRestoreRoles, transformRestoreSchema } from './comment-translator-paid-core-v1-gate1-restore-sql.mjs';
import { BACKUP_DATA_EXCLUDED_SCHEMAS, BACKUP_DATA_EXCLUDED_TABLES } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { decodeBackupDumpOutput } from './comment-translator-paid-core-v1-gate1-backup-dump-transport.mjs';

const MAX_BYTES = 32 * 1024 * 1024;
const hash = text => createHash('sha256').update(text).digest('hex');
const error = (reason, cleanupConfirmed = true) => Object.assign(new Error(reason), { cleanupConfirmed });
// Pinned CLI 2.109.0 reviewed recipes; these are argv values, never shell text.
const schemaExcluded = 'information_schema pg_* _analytics _realtime _supavisor auth etl extensions pgbouncer realtime storage supabase_functions supabase_migrations cron dbdev graphql graphql_public net pgmq pgsodium pgsodium_masks pgtle repack tiger tiger_data timescaledb_* _timescaledb_* topology vault'.split(' ');
const dataExcluded = BACKUP_DATA_EXCLUDED_SCHEMAS;
const schemaArgs = schemaExcluded.flatMap(name => ['--exclude-schema', name]);
const dataArgs = [...dataExcluded.flatMap(name => ['--exclude-schema', name]),
  ...BACKUP_DATA_EXCLUDED_TABLES.flatMap(name => ['--exclude-table', name]), '--schema', '*'];
const rolesArgs = ['--roles-only', '--role=postgres', '--quote-all-identifiers', '--no-role-passwords', '--no-comments', '--no-password'];
const validText = text => typeof text === 'string' && !text.includes('\0') && Buffer.byteLength(text) <= MAX_BYTES &&
  new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(text)) === text;
const envelope = text => 'SET session_replication_role = replica;\n\n' + text + '\nRESET ALL;\n';

// Returns sensitive artifacts privately; an optional trusted factory callback
// persists/inspects them while the exporter is held. No restore, Auth/Storage
// acquisition, stage authority or Gate decision is established here.
export function createBackupCapture({ spawnImpl = spawn, spawnSyncImpl = spawnSync, fsApi = fs,
  now = Date.now, monotonicNow = () => performance.now(), setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout, persistWhileHeld } = {}) {
  const snapshotTransport = createBackupSnapshotTransport({ spawnImpl, spawnSyncImpl, fsApi, now, monotonicNow, setTimeoutImpl, clearTimeoutImpl });
  function capture(command, args, env, signal, timeout, stamp) {
    if (signal.aborted) return Promise.reject(error('BACKUP_ABORTED'));
    const startedAt = stamp();
    return new Promise((resolve, reject) => {
      let child, timer, killTimer, reason = null, done = false, bytes = 0;
      const chunks = [];
      const finish = (closed, code, nativeSignal) => {
        if (done) return;
        done = true;
        clearTimeoutImpl(timer); clearTimeoutImpl(killTimer);
        signal.removeEventListener('abort', onAbort);
        if (!closed || reason || code !== 0 || nativeSignal) {
          chunks.length = 0; reject(error(reason ?? 'BACKUP_PROCESS_FAILED', closed)); return;
        }
        try {
          const { text, rawSha256, transport } = decodeBackupDumpOutput(Buffer.concat(chunks), command === 'pg_dump' ? 'gzip' : 'plain');
          resolve({ text, observation: { startedAt, completedAt: stamp(), exitCode: code,
            captureComplete: true, stderrBytes: 0, clientMajor: 17, rawSha256, transport } });
        } catch (e) { reject(error(['BACKUP_CLOCK_INVALID', 'BACKUP_CAPTURE_LIMIT'].includes(e.message) ? e.message : 'BACKUP_CAPTURE_INVALID')); }
      };
      const fail = value => {
        if (done || reason) return;
        reason = value;
        chunks.length = 0;
        killTimer = setTimeoutImpl(() => finish(false), 2000);
        try { child?.stdin.destroy(); child?.kill(); } catch { /* close is authoritative */ }
      };
      const onAbort = () => fail('BACKUP_ABORTED');
      try {
        child = spawnImpl(command, args, { env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch { reject(error('BACKUP_START_FAILED')); return; }
      timer = setTimeoutImpl(() => fail('BACKUP_TIMEOUT'), timeout);
      child.on('error', () => fail('BACKUP_PROCESS_FAILED'));
      child.on('close', (code, nativeSignal) => finish(true, code, nativeSignal));
      child.stdout.on('error', () => fail('BACKUP_CAPTURE_INVALID'));
      child.stderr.on('error', () => fail('BACKUP_CAPTURE_INVALID'));
      child.stdin.on('error', () => fail('BACKUP_PROCESS_FAILED'));
      child.stdout.on('data', chunk => {
        if (done || reason) return;
        if (!Buffer.isBuffer(chunk)) { fail('BACKUP_CAPTURE_INVALID'); return; }
        bytes += chunk.length;
        if (bytes > MAX_BYTES) { fail('BACKUP_CAPTURE_LIMIT'); return; }
        chunks.push(chunk);
      });
      child.stderr.on('data', chunk => { if (chunk.length) fail('BACKUP_STDERR'); });
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) onAbort();
      try { child.stdin.end(); } catch { fail('BACKUP_PROCESS_FAILED'); }
    });
  }
  return {
    async run(input = {}) {
      const { target, bindingJson, expectedBindingSha256, env, signal, authStorageSql, authStorageSha256, preconditions } = input;
      const parsed = parseTargetBinding(bindingJson);
      if ((persistWhileHeld !== undefined && typeof persistWhileHeld !== 'function') || !parsed.ok || parsed.binding.target !== target || !/^[a-f0-9]{64}$/.test(expectedBindingSha256 ?? '') ||
          computeBindingSha256(parsed.binding) !== expectedBindingSha256 ||
          (signal !== undefined && !(signal instanceof AbortSignal)) || !validText(authStorageSql) ||
          !/^[a-f0-9]{64}$/.test(authStorageSha256 ?? '') || hash(authStorageSql) !== authStorageSha256 ||
          !preconditions || ['vaultTotal', 'vaultReserved', 'storageObjects'].some(key => preconditions[key] !== 0)) {
        throw error('BACKUP_CONTEXT_INVALID');
      }
      const invocation = buildPsqlInvocation(parsed.binding, env, fsApi);
      if (!invocation.ok) throw error('BACKUP_CONTEXT_INVALID');
      if (signal?.aborted) throw error('BACKUP_ABORTED');
      for (const command of ['pg_dumpall', 'pg_dump']) {
        try {
          const r = spawnSyncImpl(command, ['--version'], { env: invocation.env, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 65536 });
          if (r.error || r.signal || r.status !== 0 || !Buffer.isBuffer(r.stdout) || !Buffer.isBuffer(r.stderr) || r.stderr.length || r.stdout.length > 65536 ||
              !new RegExp('^' + command + ' \\(PostgreSQL\\) 17(?:\\.[0-9]+)*(?: .*)?$').test(new TextDecoder('utf-8', { fatal: true }).decode(r.stdout).trim())) throw new Error();
        } catch { throw error('BACKUP_CLIENT_INVALID'); }
      }
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) controller.abort();
      let session = null, sessionClosed = null;
      let previousTime = -Infinity;
      const stamp = () => {
        const value = now();
        if (!Number.isFinite(value) || value < previousTime || !Number.isFinite(new Date(value).getTime())) throw error('BACKUP_CLOCK_INVALID');
        previousTime = value;
        return new Date(value).toISOString();
      };
      try {
        const startedAt = stamp();
        const rolesCapture = await capture('pg_dumpall', rolesArgs.slice(), invocation.env, controller.signal, 60000, stamp);
        const raw = { roles: rolesCapture.text };
        const dumps = [{ name: 'roles', snapshotSha256: null, ...rolesCapture.observation }];
        // Transform before holding the snapshot; unsupported roles stop early.
        const roles = transformRestoreRoles(raw.roles).sql;
        session = await snapshotTransport.open({ target, bindingJson, expectedBindingSha256, env, signal: controller.signal, requireEmptyVectorTables: true, requireSourceState: true });
        session.closed.then(result => { sessionClosed = result; if (!result.ok) controller.abort(); });
        const recipes = [ ['schema', '--schema-only', schemaArgs], ['data', '--data-only', dataArgs],
          ['historySchema', '--schema-only', ['--schema=supabase_migrations']], ['historyData', '--data-only', ['--schema=supabase_migrations']] ];
        const rawHashes = { roles: hash(raw.roles) };
        const snapshotSha256 = hash(session.snapshot);
        for (const [name, mode, filters] of recipes) {
          session.assertActive();
          const remaining = session.remainingMs();
          if (!(remaining > 0)) throw error('BACKUP_DEADLINE');
          const captured = await capture('pg_dump', [mode, '--compress=gzip', '--role=postgres', '--quote-all-identifiers', '--no-password', '--snapshot', session.snapshot, ...filters],
            invocation.env, controller.signal, Math.min(60000, remaining), stamp);
          raw[name] = captured.text;
          dumps.push({ name, snapshotSha256, ...captured.observation });
          session.assertActive();
          rawHashes[name] = hash(raw[name]);
        }
        session.assertActive();
        const elapsedMs = 300000 - session.remainingMs();
        if (elapsedMs < 0 || elapsedMs >= 300000) throw error('BACKUP_DEADLINE');
        const values = [ ['roles.sql', raw.roles, roles], ['schema.sql', raw.schema, prepareBackupSchemaWithDefaults(transformRestoreSchema(raw.schema).sql, session.tableDefaults)],
          ['auth_storage_changes.sql', authStorageSql, authStorageSql], ['data.sql', raw.data, envelope(raw.data)],
          ['history_schema.sql', raw.historySchema, raw.historySchema], ['history_data.sql', raw.historyData, envelope(raw.historyData)] ];
        const artifacts = values.map(([name, original, sql]) => {
          if (!validText(sql)) throw error('BACKUP_TRANSFORM_LIMIT');
          return Object.freeze({ name, sql, rawSha256: hash(original), sha256: hash(sql), bytes: Buffer.byteLength(sql) });
        });
        let persistence;
        if (persistWhileHeld !== undefined) {
          session.assertActive();
          const inspection = await persistWhileHeld({ artifacts });
          session.assertActive();
          const files = artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }));
          if (inspection?.status !== 'PERSISTED_BYTES_VERIFIED' || !/^[a-f0-9]{64}$/.test(inspection.manifestSha256 ?? '') ||
              !Array.isArray(inspection.artifacts) || inspection.artifacts.length !== files.length ||
              files.some((file, i) => ['name', 'bytes', 'sha256'].some(key => inspection.artifacts[i]?.[key] !== file[key]))) throw error('BACKUP_PERSISTENCE_INVALID');
          persistence = { manifestSha256: inspection.manifestSha256, files, checksumCompletedAt: stamp() };
        }
        session.assertActive();
        const closeResult = await session.commit();
        if (!closeResult.ok || !closeResult.closed) throw error('BACKUP_EXPORT_CLOSE_FAILED', closeResult.closed);
        const exporterClosedObservedAt = stamp();
        return { artifacts, evidence: { status: persistence ? 'CAPTURED_PERSISTED_NOT_AUTHORITY' : 'CAPTURED_NOT_PERSISTED',
          snapshotDumpCount: 4, elapsedMs, exporterClosed: true, rawHashes,
          vectorExclusion: { snapshotSha256, counts: session.vectorCounts },
          sourceState: session.sourceState,
          ...(persistence ? { persistence } : {}),
          // Local observations only: any persistence result, source/run binding
          // and outer native receipt still require independent stage acceptance.
          processObservations: { startedAt, completedAt: stamp(), t0: session.t0,
            sourceBindingSha256: expectedBindingSha256, snapshotSha256, exporterClosedObservedAt, dumps } } };
      } catch (e) {
        controller.abort();
        let cleanupConfirmed = e.cleanupConfirmed !== false;
        if (session) {
          const closed = sessionClosed ?? await session.abort();
          // Snapshot assertions can fail before the exporter has finished
          // closing. Its final close resolves that uncertainty; it must never
          // erase an unconfirmed close from a separate dump process.
          cleanupConfirmed = /^SNAPSHOT_/.test(e.message ?? '')
            ? closed.closed === true : cleanupConfirmed && closed.closed === true;
        }
        // Never propagate native text, connection context, SQL or arbitrary errors.
        const reason = /^(?:BACKUP_[A-Z_]+|SNAPSHOT_[A-Z_]+|RESTORE_(?:SQL_LEXICAL_REJECTED|ROLES_UNSUPPORTED_STATEMENT|SCHEMA_UNSUPPORTED_STATEMENT))$/.test(e.message ?? '') ? e.message : 'BACKUP_FAILED';
        throw error(reason, cleanupConfirmed);
      } finally { signal?.removeEventListener('abort', onAbort); }
    },
  };
}
