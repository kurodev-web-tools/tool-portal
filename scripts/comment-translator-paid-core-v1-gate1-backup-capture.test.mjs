const sourceState = () => ({ historyCount: 22, historySha256: '1'.repeat(64), rowCounts: [{ identitySha256: '2'.repeat(64), rows: 0 }], authUsers: 0, authForeignKeysSha256: '3'.repeat(64), grantsRlsSha256: '4'.repeat(64), legacyRows: 0, vaultRows: 0, storageObjects: 0, vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });
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
    ...(options.now ? { now: options.now } : {}),
    ...(options.monotonicNow ? { monotonicNow: options.monotonicNow } : {}),
    ...(options.persistWhileHeld ? { persistWhileHeld: options.persistWhileHeld } : {}),
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
      child.finish = code => { if (!child.closed) { child.closed = true; if (command === 'pg_dump') options.onDumpClose?.(); child.emit('close', code, code === null ? 'SIGTERM' : null); } };
      child.kill = () => { if (!options.killAbsent) queueMicrotask(() => child.finish(null)); return true; };
      child.stdin = new Writable({ write(chunk, encoding, cb) {
        const text = chunk.toString(); cb();
        if (command === 'psql' && text.includes('BEGIN ISOLATION')) queueMicrotask(() => child.stdout.write(JSON.stringify({ serverMajor: 17,
          t0: options.t0 ?? new Date().toISOString(), snapshot: '00000003-00000009-1', transactionReadOnly: 'on', transactionIsolation: 'repeatable read',
          sourceState: options.sourceState ?? sourceState(),
          tableDefaults:Object.hasOwn(options,"tableDefaults") ? options.tableDefaults : [],
          vectorCounts: options.vectorCounts ?? { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } }) + '\n'));
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
  for (const table of ['storage.buckets_vectors', 'storage.vector_indexes']) {
    assert.equal(dumps[1].args[dumps[1].args.indexOf(table) - 1], '--exclude-table');
    assert.ok(dumps.filter((_, i) => i !== 1).every(x => !x.args.includes(table)));
  }
  assert.deepEqual(JSON.parse(JSON.stringify(result.evidence.vectorExclusion)), { snapshotSha256: hash('00000003-00000009-1'),
    counts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });
  assert.equal(result.artifacts[3].sql, 'SET session_replication_role = replica;\n\n' + data + '\nRESET ALL;\n');
  for (const item of result.artifacts) { assert.equal(item.sha256, hash(item.sql)); assert.equal(item.bytes, Buffer.byteLength(item.sql)); }
  assert.equal(result.evidence.rawHashes.data, hash(data));
  assert.equal(result.evidence.status, 'CAPTURED_NOT_PERSISTED');
  assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
});

test('missing or unsafe native source-state blocks snapshot dumps despite caller state claims', async () => {
  for (const state of [{}, { ...sourceState(), historyCount: 56 }, { ...sourceState(), vaultRows: 1 }]) {
    const f = fixture({ sourceState: state });
    await assert.rejects(f.capture.run({ ...input(), sourceState: sourceState(), requireSourceState: false }), /SNAPSHOT_METADATA_INVALID/);
    assert.equal(f.calls.filter(c => c.command === 'pg_dump' && c.args.includes('--snapshot')).length, 0);
  }
});

test('nonempty or incomplete native vector counts stop before the four dumps despite caller zero claims', async () => {
  for (const vectorCounts of [{}, { 'storage.buckets_vectors': 0 },
    { 'storage.buckets_vectors': 1, 'storage.vector_indexes': 0 },
    { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 1 }]) {
    const f = fixture({ vectorCounts });
    await assert.rejects(f.capture.run({ ...input(), requireEmptyVectorTables: false, vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } }), /SNAPSHOT_METADATA_INVALID/);
    assert.ok(!f.actions.includes('pg_dump')); assert.ok(!f.actions.includes('commit'));
    assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
  }
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

test('capture returns internally observed lifetimes and preserves native T0 without exposing inputs', async () => {
  const base = Date.parse('2026-09-09T00:00:00Z'); let tick = 0;
  const t0 = '2026-09-09T09:00:00.000123+09:00';
  const f = fixture({ now: () => base + ++tick, t0 });
  const result = await f.capture.run({ ...input(), evidence: { t0: 'forged', dumps: [] } });
  const o = result.evidence.processObservations;
  assert.equal(o.t0, t0);
  assert.equal(o.sourceBindingSha256, computeBindingSha256(binding));
  assert.equal(o.snapshotSha256, hash('00000003-00000009-1'));
  assert.deepEqual(o.dumps.map(x => x.name), ['roles', 'schema', 'data', 'historySchema', 'historyData']);
  let previous = Date.parse(o.startedAt);
  for (const [i, d] of o.dumps.entries()) {
    assert.ok(Date.parse(d.startedAt) >= previous);
    assert.ok(Date.parse(d.completedAt) >= Date.parse(d.startedAt));
    previous = Date.parse(d.completedAt);
    assert.equal(d.snapshotSha256, i === 0 ? null : o.snapshotSha256);
    assert.equal(d.rawSha256, result.evidence.rawHashes[d.name]);
    assert.equal(d.exitCode, 0); assert.equal(d.stderrBytes, 0);
    assert.equal(d.captureComplete, true); assert.equal(d.clientMajor, 17);
  }
  assert.ok(Date.parse(o.exporterClosedObservedAt) >= previous);
  assert.ok(Date.parse(o.completedAt) >= Date.parse(o.exporterClosedObservedAt));
  assert.equal(result.evidence.status, 'CAPTURED_NOT_PERSISTED');
  const serialized = JSON.stringify(result.evidence);
  for (const value of ['fixture-only', binding.host, '00000003-00000009-1', roles, data, 'forged']) assert.ok(!serialized.includes(value));
});

test('invalid or reversed observation clock fails closed and cleans up', async () => {
  const base = Date.parse('2026-09-09T00:00:00Z');
  for (const invalid of [NaN, Infinity, base - 1]) {
    let calls = 0;
    const f = fixture({ now: () => ++calls === 1 ? base : invalid });
    await assert.rejects(f.capture.run(input()), e => e.message === 'BACKUP_CLOCK_INVALID' && e.cleanupConfirmed);
    assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
  }
});

test('clock failure at native dump close returns no artifacts and closes the held exporter', async () => {
  const base = Date.parse('2026-09-09T00:00:00Z'); let broken = false, tick = 0;
  const f = fixture({ now: () => broken ? NaN : base + ++tick,
    t0: '2026-09-09T00:00:00Z', onDumpClose: () => { broken = true; } });
  await assert.rejects(f.capture.run(input()), e => e.message === 'BACKUP_CLOCK_INVALID' && e.cleanupConfirmed);
  assert.equal(f.actions.filter(x => x === 'pg_dump').length, 1);
  assert.ok(!f.actions.includes('commit'));
  assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
});


test('persisted hashes are verified while exporter remains held before commit', async () => {
  const f = fixture({ persistWhileHeld: async ({ artifacts }) => {
    assert.ok(!f.actions.includes('commit')); assert.equal(f.children.filter(x => !x.closed).length, 1);
    return { status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: 'a'.repeat(64),
      artifacts: artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })) };
  } });
  const r = await f.capture.run(input());
  assert.equal(r.evidence.status, 'CAPTURED_PERSISTED_NOT_AUTHORITY');
  assert.equal(r.evidence.persistence.manifestSha256, 'a'.repeat(64));
  assert.ok(Date.parse(r.evidence.persistence.checksumCompletedAt) <= Date.parse(r.evidence.processObservations.exporterClosedObservedAt));
  assert.deepEqual(r.evidence.persistence.files, r.artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })));
  assert.ok(f.actions.includes('commit')); assert.ok(f.children.every(x => x.closed));
});

test('failed or mismatched held persistence cannot commit or return a successful capture', async () => {
  for (const mode of ['throw', 'status', 'manifest', 'files']) {
    const f = fixture({ persistWhileHeld: async ({ artifacts }) => {
      if (mode === 'throw') throw Error('private-storage-error');
      return { status: mode === 'status' ? 'OTHER' : 'PERSISTED_BYTES_VERIFIED',
        manifestSha256: mode === 'manifest' ? 'invalid' : 'a'.repeat(64),
        artifacts: artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256: mode === 'files' ? 'b'.repeat(64) : sha256 })) };
    } });
    await assert.rejects(f.capture.run(input()), e => /^BACKUP_/.test(e.message) && e.cleanupConfirmed && !e.message.includes('private'));
    assert.ok(!f.actions.includes('commit')); assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
  }
});

test('persistence finishing after the held snapshot deadline cannot commit', async () => {
  const base = Date.parse('2026-09-09T00:00:00Z'); let clock = base + 10;
  const f = fixture({ now: () => clock, monotonicNow: () => clock, t0: '2026-09-09T00:00:00Z', persistWhileHeld: async ({ artifacts }) => {
    clock = base + 300001;
    return { status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: 'a'.repeat(64),
      artifacts: artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })) };
  } });
  await assert.rejects(f.capture.run(input()), e => e.message === 'SNAPSHOT_DEADLINE_EXCEEDED' && e.cleanupConfirmed);
  assert.ok(!f.actions.includes('commit')); assert.ok(f.children.every(x => x.closed)); assert.equal(f.timers.size, 0);
});

test('capture refuses absent or unsafe same-snapshot defaults, ignoring caller substitutes',async()=>{
 for(const defaults of [undefined,null,[{scope:'auth',role:'anon',privilege:'SELECT',grantable:false}]]){
  const f=fixture({tableDefaults:defaults});
  await assert.rejects(f.capture.run({...input(),tableDefaults:[]}),/SNAPSHOT_METADATA_INVALID/);
 }
});

test('capture binds native snapshot defaults into the schema artifact',async()=>{
 const defaults=[{scope:'',role:'anon',privilege:'SELECT',grantable:false}];
 const f=fixture({tableDefaults:defaults});const result=await f.capture.run(input());
 const schema=result.artifacts.find(x=>x.name==='schema.sql').sql;
 assert.match(schema,/REVOKE ALL ON TABLES/);assert.match(schema,/GRANT SELECT ON TABLES TO "anon"/);
});
