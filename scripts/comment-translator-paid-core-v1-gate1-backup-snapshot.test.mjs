import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createBackupSnapshotTransport } from './lib/comment-translator-paid-core-v1-gate1-backup-snapshot.mjs';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';

const NOW = Date.parse('2026-09-08T00:00:00Z');
const ca = Buffer.from('synthetic-ca');
const binding = { schemaVersion: 1, target: 'production', connectionMode: 'direct', projectRef: 'fixtureproject',
  host: 'db.fixtureproject.supabase.co', port: 5432, database: 'postgres', user: 'postgres', sslMode: 'verify-full',
  caSha256: createHash('sha256').update(ca).digest('hex') };
const env = { PATH: 'synthetic-path', PGHOST: binding.host, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'postgres',
  PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'synthetic-ca', PGPASSWORD: 'fixture-only', UNRELATED_ENV: 'excluded' };
const input = () => ({ target: 'production', bindingJson: JSON.stringify(binding), expectedBindingSha256: computeBindingSha256(binding), env: { ...env } });
const metadata = () => ({ serverMajor: 17, t0: new Date(NOW).toISOString(), snapshot: '00000003-00000009-1', transactionReadOnly: 'on', transactionIsolation: 'repeatable read' });

function fixture(options = {}) {
  let clock = options.now ?? NOW, nextTimer = 1;
  const timers = new Map(), calls = [], children = [];
  const setTimer = (fn, delay) => { const id = nextTimer++; timers.set(id, { fn, at: clock + delay }); return id; };
  const clearTimer = id => timers.delete(id);
  const advance = ms => {
    clock += ms;
    for (;;) {
      const due = [...timers].find(([, t]) => t.at <= clock);
      if (!due) break;
      timers.delete(due[0]); due[1].fn();
    }
  };
  const transport = createBackupSnapshotTransport({
    now: () => clock, setTimeoutImpl: setTimer, clearTimeoutImpl: clearTimer,
    fsApi: { lstatSync: () => ({ isFile: () => true }), readFileSync: () => options.badCa ? Buffer.from('wrong') : ca },
    spawnSyncImpl(command, args, config) {
      calls.push({ kind: 'version', command, args, config });
      return options.version ?? { status: 0, signal: null, stdout: Buffer.from('psql (PostgreSQL) 17.11\n'), stderr: Buffer.alloc(0) };
    },
    spawnImpl(command, args, config) {
      calls.push({ kind: 'session', command, args, config });
      const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.inputs = []; child.kills = 0; child.didClose = false;
      child.finish = (code, signal = null) => { if (!child.didClose) { child.didClose = true; child.emit('close', code, signal); } };
      child.kill = () => { child.kills++; if (options.killCloses !== false) queueMicrotask(() => child.finish(null, 'SIGTERM')); return true; };
      child.stdin = new Writable({ write(chunk, encoding, callback) {
        const sql = chunk.toString('utf8'); child.inputs.push(sql); callback();
        if (sql.includes('BEGIN ISOLATION')) queueMicrotask(() => {
          if (options.start === 'silent') return;
          if (options.start === 'exit') { child.finish(0); return; }
          if (options.start === 'stderr') { child.stderr.write('private failure detail'); return; }
          if (options.start === 'error') { child.emit('error', new Error('private failure detail')); return; }
          const payload = options.payload ?? Buffer.from(JSON.stringify(metadata()) + '\n');
          if (options.chunked) {
            child.stdout.write(payload.subarray(0, 13)); child.stdout.write(payload.subarray(13));
          } else child.stdout.write(payload);
        });
        if (sql === 'COMMIT;\n' && options.commitCloses !== false) queueMicrotask(() => child.finish(options.commitCode ?? 0));
      } });
      children.push(child); return child;
    },
  });
  return { transport, calls, children, timers, advance };
}

test('invalid target, digest, CA, environment and cancellation cannot spawn', async () => {
  for (const mutate of [
    i => { i.target = 'preview'; }, i => { i.expectedBindingSha256 = '0'.repeat(64); },
    i => { i.bindingJson = '{}'; }, i => { i.env.PGUSER = 'other'; },
    i => { i.env.PGSERVICE = 'forbidden'; }, i => { i.env.PGSSLMODE = 'require'; },
    i => { i.signal = {}; }, i => { i.signal = AbortSignal.abort('private reason'); },
  ]) {
    const f = fixture(), i = input(); mutate(i);
    await assert.rejects(f.transport.open(i), /^Error: SNAPSHOT_(CONTEXT_INVALID|ABORTED)$/);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture({ badCa: true });
  await assert.rejects(f.transport.open(input()), /SNAPSHOT_CONTEXT_INVALID/);
  assert.equal(f.calls.length, 0);
});
test('native version must be complete strict UTF8 PostgreSQL17 before session spawn', async () => {
  for (const version of [
    { status: 0, stdout: Buffer.from('psql (PostgreSQL) 16.0'), stderr: Buffer.alloc(0) },
    { status: 0, stdout: Buffer.from([0xff]), stderr: Buffer.alloc(0) },
    { status: 0, stdout: Buffer.from('psql (PostgreSQL) 17.11'), stderr: Buffer.from('private') },
    { status: 0, error: new Error('private'), stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) },
  ]) {
    const f = fixture({ version });
    await assert.rejects(f.transport.open(input()), /SNAPSHOT_CLIENT_INVALID/);
    assert.equal(f.children.length, 0);
  }
});
test('real transport implementation keeps session open until explicit clean commit', async () => {
  const f = fixture({ chunked: true }), session = await f.transport.open(input());
  assert.equal(session.snapshot, metadata().snapshot); session.assertActive();
  assert.equal(f.children[0].didClose, false);
  const call = f.calls[1];
  assert.equal(call.command, 'psql'); assert.equal(call.config.shell, false);
  assert.equal(call.config.env.PGSSLMODE, 'verify-full'); assert.equal(call.config.env.UNRELATED_ENV, undefined);
  assert.ok(call.config.env.PGOPTIONS.includes('default_transaction_read_only=on'));
  for (const flag of ['--no-psqlrc', '--no-password', '--set=ON_ERROR_STOP=1']) assert.ok(call.args.includes(flag));
  assert.match(f.children[0].inputs[0], /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.match(f.children[0].inputs[0], /idle_in_transaction_session_timeout = '300000ms'/);
  assert.deepEqual(await session.commit(), { ok: true, closed: true, reason: null });
  assert.deepEqual(f.children[0].inputs.slice(1), ['COMMIT;\n']);
  assert.equal(f.children[0].kills, 0); assert.equal(f.timers.size, 0);
  assert.throws(session.assertActive, /SNAPSHOT_NOT_ACTIVE/);
});
test('metadata corruption and non-readonly/non17 response rejects with confirmed cleanup', async () => {
  const invalid = [
    { ...metadata(), extra: 1 }, { ...metadata(), serverMajor: 16 }, { ...metadata(), transactionReadOnly: 'off' },
    { ...metadata(), transactionIsolation: 'read committed' }, { ...metadata(), snapshot: 'private-invalid' },
    { ...metadata(), t0: new Date(NOW + 1).toISOString() }, { ...metadata(), t0: new Date(NOW - 300000).toISOString() },
  ].map(value => Buffer.from(JSON.stringify(value) + '\n'));
  invalid.push(Buffer.from('{"serverMajor":17,"serverMajor":17}\n'), Buffer.from([0xff, 10]),
    Buffer.from('x'.repeat(65537)), Buffer.from(JSON.stringify(metadata()) + '\nextra\n'),
    Buffer.concat([Buffer.from(JSON.stringify(metadata()) + '\n'), Buffer.from([0xc3])]));
  for (const payload of invalid) {
    const f = fixture({ payload });
    await assert.rejects(f.transport.open(input()), e => {
      assert.match(e.message, /^SNAPSHOT_(METADATA_INVALID|OUTPUT_INVALID)$/); assert.equal(e.cleanupConfirmed, true); return true;
    });
    assert.equal(f.children[0].kills, 1); assert.equal(f.timers.size, 0);
  }
});
test('unexpected close, stderr and process error never establish a ready session', async () => {
  for (const start of ['exit', 'stderr', 'error']) {
    const f = fixture({ start });
    await assert.rejects(f.transport.open(input()), e => {
      assert.match(e.message, /^SNAPSHOT_(EARLY_EXIT|STDERR|PROCESS_FAILED)$/); assert.equal(e.cleanupConfirmed, true); return true;
    });
  }
});
test('calendar dates cannot normalize silently into an otherwise acceptable T0', async () => {
  const f = fixture({ now: Date.parse('2026-10-01T00:00:00Z'),
    payload: Buffer.from(JSON.stringify({ ...metadata(), t0: '2026-09-31T00:00:00Z' }) + '\n') });
  await assert.rejects(f.transport.open(input()), /SNAPSHOT_METADATA_INVALID/);
  assert.equal(f.children[0].kills, 1);
});
test('startup timeout and unconfirmed termination are bounded', async () => {
  const f = fixture({ start: 'silent', killCloses: false });
  const rejection = assert.rejects(f.transport.open(input()), e => {
    assert.equal(e.message, 'SNAPSHOT_START_TIMEOUT'); assert.equal(e.cleanupConfirmed, false); return true;
  });
  f.advance(10000); f.advance(2000); await rejection;
  assert.equal(f.children[0].kills, 1); assert.equal(f.timers.size, 0);
});
test('external abort and explicit abort terminate the held session', async () => {
  for (const external of [false, true]) {
    const f = fixture(), controller = new AbortController();
    const session = await f.transport.open({ ...input(), signal: controller.signal });
    if (external) controller.abort('private reason'); else void session.abort();
    assert.deepEqual(await session.closed, { ok: false, closed: true, reason: 'SNAPSHOT_ABORTED' });
    assert.throws(session.assertActive, /SNAPSHOT_ABORTED/);
    assert.equal(f.timers.size, 0);
  }
});
test('deadline and stalled commit terminate instead of reporting completion', async () => {
  const f = fixture(), session = await f.transport.open(input());
  f.advance(300000);
  assert.deepEqual(await session.closed, { ok: false, closed: true, reason: 'SNAPSHOT_DEADLINE_EXCEEDED' });
  const g = fixture({ commitCloses: false }), held = await g.transport.open(input());
  const closing = held.commit(); g.advance(10000);
  assert.deepEqual(await closing, { ok: false, closed: true, reason: 'SNAPSHOT_CLOSE_TIMEOUT' });
});
test('output after readiness and nonzero commit exit invalidate closure', async () => {
  const f = fixture(), session = await f.transport.open(input());
  f.children[0].stdout.write('unexpected private output');
  assert.deepEqual(await session.closed, { ok: false, closed: true, reason: 'SNAPSHOT_OUTPUT_INVALID' });
  const g = fixture({ commitCode: 1 }), held = await g.transport.open(input());
  assert.deepEqual(await held.commit(), { ok: false, closed: true, reason: 'SNAPSHOT_PROCESS_FAILED' });
});
