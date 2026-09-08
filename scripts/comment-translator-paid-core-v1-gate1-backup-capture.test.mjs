import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createBackupCapture } from './lib/comment-translator-paid-core-v1-gate1-backup-capture.mjs';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const ca = Buffer.from('synthetic-ca');
const binding = { schemaVersion: 1, target: 'production', connectionMode: 'direct', projectRef: 'fixtureproject',
  host: 'db.fixtureproject.supabase.co', port: 5432, database: 'postgres', user: 'postgres', sslMode: 'verify-full', caSha256: hash(ca) };
const input = () => ({ target: 'production', bindingJson: JSON.stringify(binding), expectedBindingSha256: computeBindingSha256(binding),
  env: { PATH: 'synthetic', PGHOST: binding.host, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'postgres',
    PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'synthetic-ca', PGPASSWORD: 'fixture-only', UNRELATED: 'excluded' },
  authStorageSql: '', authStorageSha256: hash(''), preconditions: { vaultTotal: 0, vaultReserved: 0, storageObjects: 0 } });
const roles = "SET standard_conforming_strings = on;\nCREATE ROLE \"fixture_role\";\n";
const schema = "SET standard_conforming_strings = on;\nCREATE SCHEMA \"fixture\";\n";
const data = "-- 日本語 😀\nCOPY fixture.t (v) FROM stdin;\n\\restrict literal\n\\.\n";
function fixture(options = {}) {
  const calls = [], children = [], actions = [], timers = new Map();
  let next = 0, dumps = 0;
  const capture = createBackupCapture({
    fsApi: { lstatSync: () => ({ isFile: () => true }), readFileSync: () => ca },
    setTimeoutImpl(fn, delay) { const id = ++next; timers.set(id, fn); if ((options.timeout && delay === 60000) || (options.killAbsent && delay === 2000)) queueMicrotask(fn); return id; },
    clearTimeoutImpl(id) { timers.delete(id); },
    spawnSyncImpl(command, args, config) {
      calls.push({ command, args, config });
      return { status: 0, stdout: Buffer.from(`${command} (PostgreSQL) ${options.major ?? '17.11'}\n`), stderr: Buffer.alloc(0) };
    },
    spawnImpl(command, args, config) {
      calls.push({ command, args, config }); actions.push(command);
      const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.closed = false;
      child.finish = code => { if (!child.closed) { child.closed = true; child.emit('close', code, code === null ? 'SIGTERM' : null); } };
      child.kill = () => { if (!options.killAbsent) queueMicrotask(() => child.finish(null)); return true; };
      child.stdin = new Writable({ write(chunk, encoding, cb) {
        const text = chunk.toString(); cb();
        if (command === 'psql' && text.includes('BEGIN ISOLATION')) queueMicrotask(() => child.stdout.write(JSON.stringify({ serverMajor: 17,
          t0: new Date().toISOString(), snapshot: '00000003-00000009-1', transactionReadOnly: 'on', transactionIsolation: 'repeatable read' }) + '\n'));
        if (text === 'COMMIT;\n') { actions.push('commit'); queueMicrotask(() => child.finish(options.commitFailure ? 1 : 0)); }
      } });
      if (command !== 'psql') queueMicrotask(() => {
        if (options.timeout) return;
        if (command === 'pg_dump') dumps++;
        if (dumps === (options.failDump ?? -1)) {
          if (options.failure === 'stderr') child.stderr.write('private detail');
          else if (options.failure === 'utf8') { child.stdout.write(Buffer.from([0xff])); child.finish(0); }
          else if (options.failure === 'limit') child.stdout.write(Buffer.alloc(32 * 1024 * 1024 + 1));
          else if (options.failure === 'abort') options.controller.abort('private detail');
          else child.finish(1);
          return;
        }
        child.stdout.write(command === 'pg_dumpall' ? roles : args.includes('--schema-only') ? schema : data);
        child.finish(0);
      });
      children.push(child); return child;
    },
  });
  return { capture, calls, children, actions, timers };
}

test('input/context/preconditions reject before native calls', async () => {
  for (const mutate of [i => { i.authStorageSha256 = '0'.repeat(64); }, i => { i.authStorageSql = '\ud800'; },
    i => { i.preconditions.vaultTotal = 1; }, i => { i.preconditions.storageObjects = 1; },
    i => { i.expectedBindingSha256 = '0'.repeat(64); }, i => { i.env.PGSSLMODE = 'require'; },
    i => { i.signal = {}; }, i => { i.signal = AbortSignal.abort(); }]) {
    const f = fixture(), i = input(); mutate(i);
    await assert.rejects(f.capture.run(i), /BACKUP_(CONTEXT_INVALID|ABORTED)/);
    assert.equal(f.calls.length, 0);
  }
});
test('wrong native major rejects before any exporter or dump', async () => {
  const f = fixture({ major: '16.0' });
  await assert.rejects(f.capture.run(input()), /BACKUP_CLIENT_INVALID/); assert.equal(f.children.length, 0);
});
test('five captures, four identical snapshots, exact six-stage output and clean commit', async () => {
  const f = fixture(), result = await f.capture.run(input());
  assert.deepEqual(f.actions, ['pg_dumpall', 'psql', 'pg_dump', 'pg_dump', 'pg_dump', 'pg_dump', 'commit']);
  assert.deepEqual(result.artifacts.map(x => x.name), ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql']);
  const dumps = f.calls.filter(x => x.command === 'pg_dump' && !x.args.includes('--version'));
  for (const call of dumps) {
    assert.equal(call.args[call.args.indexOf('--snapshot') + 1], '00000003-00000009-1');
    assert.equal(call.config.shell, false); assert.equal(call.config.env.UNRELATED, undefined);
    assert.equal(call.config.env.PGSSLMODE, 'verify-full');
    assert.ok(!call.args.includes('--file')); assert.ok(!call.args.includes('--inserts'));
  }
  assert.ok(dumps[0].args.includes('auth')); assert.ok(!dumps[1].args.includes('auth'));
  assert.ok(dumps[1].args.includes('auth.schema_migrations'));
  assert.equal(result.artifacts[3].sql, 'SET session_replication_role = replica;\n\n' + data + '\nRESET ALL;\n');
  for (const item of result.artifacts) { assert.equal(item.sha256, hash(item.sql)); assert.equal(item.bytes, Buffer.byteLength(item.sql)); }
  assert.equal(result.evidence.rawHashes.data, hash(data));
  assert.equal(result.evidence.status, 'CAPTURED_NOT_PERSISTED');
  assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
});
test('each failed snapshot dump stops before commit and closes exporter', async () => {
  for (const failDump of [1, 2, 3, 4]) {
    const f = fixture({ failDump });
    await assert.rejects(f.capture.run(input()), e => e.message === 'BACKUP_PROCESS_FAILED' && e.cleanupConfirmed);
    assert.ok(!f.actions.includes('commit')); assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
  }
});
test('stderr, invalid UTF8, limit and cancellation never return partial artifacts', async () => {
  for (const failure of ['stderr', 'utf8', 'limit', 'abort']) {
    const controller = new AbortController(), f = fixture({ failDump: 2, failure, controller });
    await assert.rejects(f.capture.run({ ...input(), signal: controller.signal }), e => /^BACKUP_/.test(e.message) && e.cleanupConfirmed);
    assert.ok(!f.actions.includes('commit')); assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
  }
});
test('timeout and failed exporter commit cannot claim completion', async () => {
  for (const options of [{ timeout: true }, { commitFailure: true }]) {
    const f = fixture(options);
    await assert.rejects(f.capture.run(input()), e => /^BACKUP_/.test(e.message) && e.cleanupConfirmed);
    assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
  }
});
test('missing native close remains explicitly cleanup-unconfirmed', async () => {
  const f = fixture({ timeout: true, killAbsent: true });
  await assert.rejects(f.capture.run(input()), e => e.message === 'BACKUP_TIMEOUT' && e.cleanupConfirmed === false);
  assert.equal(f.children.length, 1); assert.equal(f.children[0].closed, false); assert.equal(f.timers.size, 0);
});
