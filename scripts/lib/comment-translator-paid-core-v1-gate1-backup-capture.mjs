import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildPsqlInvocation, computeBindingSha256, parseTargetBinding } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { createBackupSnapshotTransport } from './comment-translator-paid-core-v1-gate1-backup-snapshot.mjs';
import { transformRestoreRoles, transformRestoreSchema } from './comment-translator-paid-core-v1-gate1-restore-sql.mjs';

const MAX_BYTES = 32 * 1024 * 1024;
const hash = text => createHash('sha256').update(text).digest('hex');
const error = (reason, cleanupConfirmed = true) => Object.assign(new Error(reason), { cleanupConfirmed });
// Pinned CLI 2.109.0 reviewed recipes; these are argv values, never shell text.
const schemaExcluded = 'information_schema pg_* _analytics _realtime _supavisor auth etl extensions pgbouncer realtime storage supabase_functions supabase_migrations cron dbdev graphql graphql_public net pgmq pgsodium pgsodium_masks pgtle repack tiger tiger_data timescaledb_* _timescaledb_* topology vault'.split(' ');
const dataExcluded = 'information_schema pg_* graphql graphql_public pgsodium pgsodium_masks pgtle repack tiger tiger_data timescaledb_* _timescaledb_* topology vault etl extensions pgbouncer realtime supabase_migrations _analytics _realtime _supavisor'.split(' ');
const schemaArgs = schemaExcluded.flatMap(name => ['--exclude-schema', name]);
const dataArgs = [...dataExcluded.flatMap(name => ['--exclude-schema', name]),
  ...['auth.schema_migrations', 'storage.migrations', 'supabase_functions.migrations',
    'storage.buckets_vectors', 'storage.vector_indexes'].flatMap(name => ['--exclude-table', name]), '--schema', '*'];
const rolesArgs = ['--roles-only', '--role=postgres', '--quote-all-identifiers', '--no-role-passwords', '--no-comments', '--no-password'];
const validText = text => typeof text === 'string' && !text.includes('\0') && Buffer.byteLength(text) <= MAX_BYTES &&
  new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(text)) === text;
const envelope = text => 'SET session_replication_role = replica;\n\n' + text + '\nRESET ALL;\n';

// Returns sensitive artifacts privately. This module does not persist, restore,
// acquire Auth/Storage changes, certify stage provenance, or decide Gate status.
export function createBackupCapture({ spawnImpl = spawn, spawnSyncImpl = spawnSync, fsApi = fs,
  now = Date.now, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout } = {}) {
  const snapshotTransport = createBackupSnapshotTransport({ spawnImpl, spawnSyncImpl, fsApi, now, setTimeoutImpl, clearTimeoutImpl });
  function capture(command, args, env, signal, timeout) {
    if (signal.aborted) return Promise.reject(error('BACKUP_ABORTED'));
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
          const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
          if (!validText(text) || !text.trim()) throw new Error();
          resolve(text);
        } catch { reject(error('BACKUP_CAPTURE_INVALID')); }
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
      if (!parsed.ok || parsed.binding.target !== target || !/^[a-f0-9]{64}$/.test(expectedBindingSha256 ?? '') ||
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
      try {
        const raw = { roles: await capture('pg_dumpall', rolesArgs.slice(), invocation.env, controller.signal, 60000) };
        // Transform before holding the snapshot; unsupported roles stop early.
        const roles = transformRestoreRoles(raw.roles).sql;
        session = await snapshotTransport.open({ target, bindingJson, expectedBindingSha256, env, signal: controller.signal, requireEmptyVectorTables: true });
        session.closed.then(result => { sessionClosed = result; if (!result.ok) controller.abort(); });
        const recipes = [ ['schema', '--schema-only', schemaArgs], ['data', '--data-only', dataArgs],
          ['historySchema', '--schema-only', ['--schema=supabase_migrations']], ['historyData', '--data-only', ['--schema=supabase_migrations']] ];
        const rawHashes = { roles: hash(raw.roles) };
        for (const [name, mode, filters] of recipes) {
          session.assertActive();
          const remaining = 300000 - (now() - Date.parse(session.t0));
          if (!(remaining > 0)) throw error('BACKUP_DEADLINE');
          raw[name] = await capture('pg_dump', [mode, '--role=postgres', '--quote-all-identifiers', '--no-password', '--snapshot', session.snapshot, ...filters],
            invocation.env, controller.signal, Math.min(60000, remaining));
          session.assertActive();
          rawHashes[name] = hash(raw[name]);
        }
        session.assertActive();
        const elapsedMs = now() - Date.parse(session.t0);
        if (elapsedMs < 0 || elapsedMs >= 300000) throw error('BACKUP_DEADLINE');
        const closeResult = await session.commit();
        if (!closeResult.ok || !closeResult.closed) throw error('BACKUP_EXPORT_CLOSE_FAILED', closeResult.closed);
        const values = [ ['roles.sql', raw.roles, roles], ['schema.sql', raw.schema, transformRestoreSchema(raw.schema).sql],
          ['auth_storage_changes.sql', authStorageSql, authStorageSql], ['data.sql', raw.data, envelope(raw.data)],
          ['history_schema.sql', raw.historySchema, raw.historySchema], ['history_data.sql', raw.historyData, envelope(raw.historyData)] ];
        const artifacts = values.map(([name, original, sql]) => {
          if (!validText(sql)) throw error('BACKUP_TRANSFORM_LIMIT');
          return Object.freeze({ name, sql, rawSha256: hash(original), sha256: hash(sql), bytes: Buffer.byteLength(sql) });
        });
        return { artifacts, evidence: { status: 'CAPTURED_NOT_PERSISTED', snapshotDumpCount: 4, elapsedMs, exporterClosed: true, rawHashes,
          vectorExclusion: { snapshotSha256: hash(session.snapshot), counts: session.vectorCounts } } };
      } catch (e) {
        controller.abort();
        let cleanupConfirmed = e.cleanupConfirmed !== false;
        if (session) {
          const closed = sessionClosed ?? await session.abort();
          cleanupConfirmed &&= closed.closed === true;
        }
        // Never propagate native text, connection context, SQL or arbitrary errors.
        const reason = /^(?:BACKUP_[A-Z_]+|SNAPSHOT_[A-Z_]+|RESTORE_(?:SQL_LEXICAL_REJECTED|ROLES_UNSUPPORTED_STATEMENT|SCHEMA_UNSUPPORTED_STATEMENT))$/.test(e.message ?? '') ? e.message : 'BACKUP_FAILED';
        throw error(reason, cleanupConfirmed);
      } finally { signal?.removeEventListener('abort', onAbort); }
    },
  };
}
