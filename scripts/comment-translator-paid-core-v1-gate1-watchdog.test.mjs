import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGate1Watchdog } from './lib/comment-translator-paid-core-v1-gate1-watchdog.mjs';
import { createGate1WatchdogTransport } from './lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { runWatchdogProtocol } from './comment-translator-paid-core-v1-gate1-watchdog-runner.mjs';

const t0 = '2026-09-08T00:00:00.000Z';
const binding = 'a'.repeat(64), source = 'b'.repeat(40), run = 'c'.repeat(64);
const policy = () => ({ schemaVersion: 1, t0, sourceBindingSha256: binding, sourceCommit: source, runId: run });
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function harness(overrides = {}) {
  let elapsed = 0, wallOffset = 0, next = 0;
  const timers = new Map(), records = [], calls = { pause: 0, confirm: 0 };
  const transport = {
    requestPause: async () => { calls.pause++; return { status: 'PAUSE_REQUEST_ACCEPTED', sourceBindingSha256: binding }; },
    confirmStopped: async () => { calls.confirm++; return { status: 'SOURCE_STATUS_UNKNOWN', sourceBindingSha256: binding }; },
    ...overrides.transport,
  };
  const session = createGate1Watchdog({ policy: policy(), transport,
    record: overrides.record ?? (async row => { records.push(row); }),
    clock: { wallNow: () => Date.parse(t0) + elapsed + wallOffset, monotonicNow: () => elapsed },
    timers: { setTimeout: (fn, ms) => { const id = ++next; timers.set(id, { fn, at: elapsed + ms }); return id; }, clearTimeout: id => timers.delete(id) },
  });
  return { session, records, calls, transport, setWallOffset: x => { wallOffset = x; },
    async advance(ms) {
      const end = elapsed + ms;
      for (let i = 0; i < 100000; i++) {
        const due = [...timers].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) { elapsed = end; await flush(); return; }
        timers.delete(due[0]); elapsed = due[1].at; due[1].fn(); await flush();
      }
      throw Error('TEST_TIMER_LOOP');
    },
    backup: () => session.acceptBackup({ runId: run, sourceCommit: source, sourceBindingSha256: binding, t0,
      manifestSha256: 'd'.repeat(64), completedAt: t0, checksumsCompletedAt: t0, inspectedAt: t0 }),
    success: () => session.success({ runId: run, sourceCommit: source, sourceBindingSha256: binding,
      migrationCompletedAt: new Date(Date.parse(t0) + elapsed).toISOString(),
      decisiveReadbackCompletedAt: new Date(Date.parse(t0) + elapsed).toISOString() }),
  };
}

test('malformed policy is rejected before transport or record', () => {
  let called = 0;
  assert.throws(() => createGate1Watchdog({ policy: { ...policy(), t0: 'yesterday' }, transport: {}, record: () => called++ }), /WATCHDOG_CONTEXT_INVALID/);
  assert.equal(called, 0);
});
test('native PostgreSQL microsecond/offset T0 is preserved and impossible dates are rejected', async () => {
  const raw = '2026-09-08T09:00:00.123456+09:00', epoch = Date.parse(raw), p = { ...policy(), t0: raw };
  const options = { policy: p, transport: { requestPause: async () => ({}), confirmStopped: async () => ({}) },
    record: async () => {}, clock: { wallNow: () => epoch + 1, monotonicNow: () => 0 } };
  const session = createGate1Watchdog(options);
  assert.equal(await session.acceptBackup({ runId: run, sourceCommit: source, sourceBindingSha256: binding, t0: raw,
    manifestSha256: 'd'.repeat(64), completedAt: raw, checksumsCompletedAt: raw, inspectedAt: raw }), true);
  assert.equal(await session.arm(), true);
  assert.equal(await session.success({ runId: run, sourceCommit: source, sourceBindingSha256: binding,
    migrationCompletedAt: new Date(epoch + 1).toISOString(), decisiveReadbackCompletedAt: new Date(epoch + 1).toISOString() }), true);
  assert.equal((await session.finished).t0, raw);
  assert.throws(() => createGate1Watchdog({ ...options, policy: { ...p, t0: '2026-02-31T00:00:00.000Z' } }), /WATCHDOG_CONTEXT_INVALID/);
});
test('backup deadline aborts without pausing an unarmed source', async () => {
  const h = harness(); await h.advance(300001);
  assert.equal((await h.session.finished).state, 'ABORTED_NO_DDL_NO_PAUSE');
  assert.equal(h.calls.pause, 0); assert.equal(await h.session.arm(), false);
});
test('wrong-target and late backup receipts cannot arm', async () => {
  const h = harness();
  assert.equal(await h.session.acceptBackup({ sourceBindingSha256: 'e'.repeat(64) }), false);
  assert.equal(await h.session.arm(), false); assert.equal(h.calls.pause, 0);
});
test('arm is explicit; a completed backup alone never authorizes pause', async () => {
  const h = harness(); assert.equal(await h.backup(), true); await h.advance(600001);
  assert.equal((await h.session.finished).state, 'ABORTED_NO_DDL_NO_PAUSE'); assert.equal(h.calls.pause, 0);
});
test('valid success disarms; backup alone and a caller PASS label cannot', async () => {
  const h = harness(); assert.equal(await h.backup(), true); assert.equal(await h.session.arm(), true);
  await h.advance(1000); assert.equal(await h.success(), true);
  const r = await h.session.finished; assert.equal(r.state, 'SUCCESS_DISARMED'); assert.equal(r.restoreEligible, false);
  assert.equal(r.decision, 'NO-GO'); assert.equal(h.calls.pause, 0);
});
test('stalled work triggers one pause before ten minutes and expires unconfirmed', async () => {
  const h = harness(); await h.backup(); await h.session.arm(); await h.advance(599000);
  assert.equal(h.calls.pause, 1); assert.equal(await h.success(), false);
  await h.advance(601001); const r = await h.session.finished;
  assert.equal(r.state, 'PAUSE_UNCONFIRMED'); assert.equal(r.restoreEligible, false); assert.equal(h.calls.pause, 1);
});
test('decisive failure pauses immediately and a late success cannot release the latch', async () => {
  const h = harness(); await h.backup(); await h.session.arm(); h.session.fail(); await flush();
  assert.equal(h.calls.pause, 1); assert.equal(await h.success(), false);
  h.transport.confirmStopped = async () => ({ status: 'SOURCE_INACCESSIBLE', sourceBindingSha256: binding });
  await h.advance(1000); const r = await h.session.finished;
  assert.equal(r.state, 'PAUSE_CONFIRMED'); assert.equal(r.restoreEligible, true);
});
test('pause rejection is not retried; independent confirmation remains mandatory', async () => {
  let pause = 0;
  const h = harness({ transport: { requestPause: async () => { pause++; throw Error('private'); },
    confirmStopped: async () => ({ status: 'SOURCE_INACCESSIBLE', sourceBindingSha256: binding }) } });
  await h.backup(); await h.session.arm(); h.session.fail(); await h.advance(1000);
  const r = await h.session.finished; assert.equal(pause, 1); assert.equal(r.pauseAccepted, false);
  assert.equal(r.state, 'PAUSE_CONFIRMED'); assert.equal(JSON.stringify(r).includes('private'), false);
});
test('wrong target, generic unavailable, and timed-out probes do not confirm', async () => {
  for (const answer of [{ status: 'SOURCE_INACCESSIBLE', sourceBindingSha256: 'e'.repeat(64) },
    { status: 'unavailable', sourceBindingSha256: binding }, null]) {
    const h = harness({ transport: { confirmStopped: () => answer === null ? new Promise(() => {}) : Promise.resolve(answer) } });
    await h.backup(); await h.session.arm(); h.session.fail(); await h.advance(1200001);
    assert.equal((await h.session.finished).restoreEligible, false);
  }
});
test('wall-clock rollback cannot delay the monotonic timeout', async () => {
  const h = harness(); await h.backup(); await h.session.arm(); h.setWallOffset(-3600000);
  await h.advance(599000); assert.equal(h.calls.pause, 1); await h.advance(601001);
  assert.equal((await h.session.finished).restoreEligible, false);
});
test('lost parent input before arm aborts; after arm it requests pause', async () => {
  const before = harness(); before.session.disconnect(); await flush();
  assert.equal((await before.session.finished).state, 'ABORTED_NO_DDL_NO_PAUSE'); assert.equal(before.calls.pause, 0);
  const after = harness(); await after.backup(); await after.session.arm(); after.session.disconnect(); await flush();
  assert.equal(after.calls.pause, 1); await after.advance(1200001); await after.session.finished;
});
test('failed durable arm record cannot acknowledge arm or pause healthy source', async () => {
  const h = harness({ record: async row => { if (row.event === 'ARM_INTENT') throw Error('disk'); } });
  await h.backup(); assert.equal(await h.session.arm(), false);
  assert.equal((await h.session.finished).state, 'ABORTED_NO_DDL_NO_PAUSE'); assert.equal(h.calls.pause, 0);
});
test('record failure after arm never silently disarms or permits recovery', async () => {
  const h = harness({ record: async row => { if (row.event === 'PAUSE_REQUESTED') throw Error('disk'); },
    transport: { confirmStopped: async () => ({ status: 'SOURCE_INACCESSIBLE', sourceBindingSha256: binding }) } });
  await h.backup(); await h.session.arm(); h.session.fail(); await h.advance(1000);
  const r = await h.session.finished; assert.equal(h.calls.pause, 1); assert.equal(r.restoreEligible, false);
});
test('hung pause request is bounded and late confirmation cannot revive an expired run', async () => {
  let late;
  const h = harness({ transport: { requestPause: () => new Promise(() => {}),
    confirmStopped: () => new Promise(resolve => { late = resolve; }) } });
  await h.backup(); await h.session.arm(); h.session.fail(); await h.advance(1200001);
  const before = await h.session.finished; assert.equal(before.state, 'PAUSE_UNCONFIRMED');
  late({ status: 'SOURCE_INACCESSIBLE', sourceBindingSha256: binding }); await flush();
  assert.equal(h.session.snapshot().state, 'PAUSE_UNCONFIRMED'); assert.equal(h.session.snapshot().restoreEligible, false);
});
test('invalid clock after arm still attempts pause and cannot establish an RPO claim', async () => {
  const h = harness(); await h.backup(); await h.session.arm(); h.setWallOffset(NaN);
  assert.doesNotThrow(() => h.session.fail()); await h.advance(5000);
  assert.equal(h.calls.pause, 1); assert.equal((await h.session.finished).restoreEligible, false);
});
test('resumed machine past twenty minutes lets its one bounded pause attempt finish without recovery eligibility', async () => {
  const h = harness(); let complete, signal;
  h.transport.requestPause = ({ signal: s }) => { signal = s; return new Promise(resolve => { complete = resolve; }); };
  await h.backup(); await h.session.arm(); h.setWallOffset(1300000); h.session.fail(); await flush();
  await h.advance(1000); assert.equal(signal.aborted, false);
  complete({ status: 'PAUSE_REQUEST_ACCEPTED', sourceBindingSha256: binding }); await flush(); await h.advance(100);
  const result = await h.session.finished;
  assert.equal(result.state, 'PAUSE_UNCONFIRMED'); assert.equal(result.restoreEligible, false);
});
test('hung backup journal is bounded and cannot acknowledge a completed backup', async () => {
  const h = harness({ record: () => new Promise(() => {}) });
  const receipt = h.backup(); await flush(); await h.advance(1001);
  assert.equal(await receipt, false); assert.equal((await h.session.finished).state, 'ABORTED_NO_DDL_NO_PAUSE');
  assert.equal(h.calls.pause, 0);
});

function nativeFixture(options = {}) {
  const ca = Buffer.from('synthetic-ca');
  const target = { schemaVersion: 1, target: 'production', connectionMode: 'direct', projectRef: 'fixtureproject',
    host: 'db.fixtureproject.supabase.co', port: 5432, database: 'postgres', user: 'postgres', sslMode: 'verify-full',
    caSha256: createHash('sha256').update(ca).digest('hex') };
  const digest = computeBindingSha256(target);
  const nativePolicy = { ...policy(), sourceBindingSha256: digest };
  const context = { policy: nativePolicy, bindingJson: JSON.stringify(target), accessToken: 'synthetic-token-not-a-real-credential',
    authorization: { runId: run, sourceCommit: source, sourceBindingSha256: digest,
      readOnlyPreflight: true, pauseRequest: true, confirmedInaccessibility: true },
    env: { PATH: 'synthetic-path', PGHOST: target.host, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'postgres',
      PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'synthetic-ca', PGPASSWORD: 'fixture-only', UNRELATED_ENV: 'excluded' } };
  const calls = [], settings = { status: 'ACTIVE_HEALTHY', tcp: 'ECONNREFUSED', http: 503, ...options };
  const seams = {
    fsApi: { lstatSync: () => ({ isFile: () => true }), readFileSync: () => ca },
    requestImpl(config, callback) {
      calls.push({ kind: 'https', config }); const req = new EventEmitter();
      req.destroy = () => {};
      req.end = () => queueMicrotask(() => {
        const res = new PassThrough(); res.statusCode = config.hostname === 'api.supabase.com' ? (settings.apiCode ?? 200) : settings.http;
        callback(res);
        if (config.method === 'POST') res.end('{}');
        else if (config.hostname === 'api.supabase.com') res.end(JSON.stringify({ ref: settings.wrongTarget ? 'other' : target.projectRef,
          status: settings.status, database: { host: target.host, postgres_engine: '17' } }));
        else res.end('service unavailable');
      }); return req;
    },
    spawnImpl(command, args, config) {
      calls.push({ kind: 'psql', command, args, config }); const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => true;
      child.stdin.on('finish', () => queueMicrotask(() => {
        child.stdout.end(args.includes('--version') ? 'psql (PostgreSQL) 17.11\n' : '{"serverMajor":17,"readOnly":"on"}\n');
        child.stderr.end(); child.emit('close', settings.pgFailure ? 1 : 0, null);
      })); return child;
    },
    connectImpl(config) {
      calls.push({ kind: 'tcp', config }); const socket = new EventEmitter(); socket.destroy = () => {};
      queueMicrotask(() => settings.tcp === 'connected' ? socket.emit('connect') : socket.emit('error', { code: settings.tcp, port: 5432 }));
      return socket;
    },
  };
  return { context, seams, calls, settings, digest };
}
test('native transport refuses absent or mixed authorization with zero I/O', () => {
  for (const mutate of [c => { c.authorization.pauseRequest = false; }, c => { c.authorization.runId = 'e'.repeat(64); },
    c => { c.policy.sourceBindingSha256 = 'e'.repeat(64); }, c => { c.env.PGSSLMODE = 'disable'; }]) {
    const f = nativeFixture(); mutate(f.context);
    assert.throws(() => createGate1WatchdogTransport(f.context, f.seams), /WATCHDOG_TRANSPORT_CONTEXT_INVALID/);
    assert.equal(f.calls.length, 0);
  }
});
test('native pause is exact-origin, TLS-verified, preflight-gated, and one-shot', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  await assert.rejects(transport.requestPause({ signal: new AbortController().signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
  await transport.preflight({ signal: new AbortController().signal });
  await transport.requestPause({ signal: new AbortController().signal });
  await assert.rejects(transport.requestPause({ signal: new AbortController().signal }), /WATCHDOG_PAUSE_ALREADY_ATTEMPTED/);
  const posts = f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST');
  assert.equal(posts.length, 1); assert.equal(posts[0].config.hostname, 'api.supabase.com');
  assert.equal(posts[0].config.path, '/v1/projects/fixtureproject/pause'); assert.equal(posts[0].config.rejectUnauthorized, true);
  const pg = f.calls.find(c => c.kind === 'psql'); assert.equal(pg.config.shell, false);
  assert.equal(pg.config.env.UNRELATED_ENV, undefined); assert.equal(pg.args.join(' ').includes('fixture-only'), false);
});
test('native confirmation needs INACTIVE plus explicit database refusal and both HTTP503 probes', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  for (const delta of [{ status: 'GOING_DOWN' }, { status: 'INACTIVE', tcp: 'ENOTFOUND' },
    { status: 'INACTIVE', tcp: 'ETIMEDOUT' }, { status: 'INACTIVE', tcp: 'connected' },
    { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 401 }, { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 503, wrongTarget: true }]) {
    Object.assign(f.settings, { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 503, wrongTarget: false }, delta);
    assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  }
  Object.assign(f.settings, { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 503, wrongTarget: false });
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_INACCESSIBLE');
  for (const c of f.calls.filter(c => c.kind === 'https' && c.config.hostname !== 'api.supabase.com')) {
    assert.equal(c.config.headers.Authorization, undefined);
  }
});
test('native preflight rejects wrong identity, HTTP redirects and failed database probe', async () => {
  for (const options of [{ wrongTarget: true }, { apiCode: 302 }, { pgFailure: true }]) {
    const f = nativeFixture(options), transport = createGate1WatchdogTransport(f.context, f.seams);
    await assert.rejects(transport.preflight({ signal: new AbortController().signal }), /WATCHDOG_PREFLIGHT_FAILED/);
    assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
  }
});

test('runner persists a hash-chained receipt before arm acknowledgement and terminal success', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const directory = fs.mkdtempSync(path.join(root, '.tmp/watchdog-journal-test-'));
  const input = new PassThrough(), output = new PassThrough(); let buffer = '', rows = [];
  output.on('data', chunk => { buffer += chunk; const lines = buffer.split('\n'); buffer = lines.pop(); rows.push(...lines.filter(Boolean).map(JSON.parse)); });
  const p = { ...policy(), t0: new Date().toISOString() };
  const execution = runWatchdogProtocol({ input, output, repositoryRoot: root,
    verifySource: async () => {}, createTransport: () => ({
      preflight: async () => ({ status: 'WATCHDOG_TRANSPORT_READY', sourceBindingSha256: binding }),
      requestPause: async () => { throw Error('unexpected pause'); }, confirmStopped: async () => ({}),
    }), inspectBackup: () => ({ status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: 'd'.repeat(64), artifacts: Array(6).fill({}) }) });
  const wait = async type => {
    for (let n = 0; n < 500; n++) { const value = rows.find(r => r.type === type); if (value) return value; await new Promise(r => setTimeout(r, 10)); }
    throw Error('RUNNER_RESPONSE_MISSING_' + type);
  };
  input.write(JSON.stringify({ type: 'init', sequence: 0, context: { policy: p }, journalDirectory: directory }) + '\n');
  await wait('ready');
  const id = { runId: run, sourceCommit: source, sourceBindingSha256: binding };
  input.write(JSON.stringify({ type: 'backup', sequence: 1, receipt: { ...id, t0: p.t0, directory: 'fixture-only', manifestSha256: 'd'.repeat(64), completedAt: p.t0, checksumsCompletedAt: p.t0 } }) + '\n');
  await wait('backup-accepted');
  input.write(JSON.stringify({ type: 'arm', sequence: 2, ...id }) + '\n'); await wait('armed');
  const journal = path.join(directory, `watchdog-${run}.jsonl`);
  assert.ok(fs.readFileSync(journal, 'utf8').includes('ARMED'));
  const completed = new Date().toISOString();
  input.write(JSON.stringify({ type: 'success', sequence: 3, receipt: { ...id, migrationCompletedAt: completed, decisiveReadbackCompletedAt: completed } }) + '\n');
  const result = await execution; assert.equal(result.state, 'SUCCESS_DISARMED');
  const bytes = fs.readFileSync(journal), entries = bytes.toString('utf8').trim().split('\n').map(JSON.parse);
  let previous = '0'.repeat(64);
  for (const [index, entry] of entries.entries()) {
    assert.equal(entry.sequence, index); assert.equal(entry.previousSha256, previous);
    const { sha256, ...payload } = entry;
    assert.equal(createHash('sha256').update(JSON.stringify(payload)).digest('hex'), sha256); previous = sha256;
  }
  assert.equal(result.receiptSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(entries.at(-1).payload.type, 'terminal');
  assert.equal(bytes.includes('fixture-only'), false);
});

test('standalone native runner rejects empty stdin without network or mutation', async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./comment-translator-paid-core-v1-gate1-watchdog-runner.mjs', import.meta.url))],
    { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let out = '', err = ''; child.stdout.on('data', b => out += b); child.stderr.on('data', b => err += b); child.stdin.end();
  const code = await new Promise(resolve => child.once('close', resolve));
  assert.equal(code, 2); assert.equal(err, '');
  const result = JSON.parse(out); assert.equal(result.decision, 'NO-GO'); assert.equal(result.remoteCalls, 0); assert.equal(result.mutations, 0);
});

async function processFixture(scenario) {
  const runner = new URL('./comment-translator-paid-core-v1-gate1-watchdog-runner.mjs', import.meta.url).href;
  const program = `
    import { performance } from 'node:perf_hooks';
    import { runWatchdogProtocol } from ${JSON.stringify(runner)};
    let base, start, digest, pauses=0;
    const factor=${scenario === 'stall' ? 20 : 1};
    const clock={wallNow:()=>base===undefined?Date.now():base+(performance.now()-start)*factor,monotonicNow:()=>performance.now()*factor};
    const result=await runWatchdogProtocol({clock,timers:{setTimeout:(fn,ms)=>setTimeout(fn,ms/factor),clearTimeout},
      verifySource:async()=>{},
      openJournal:async()=>({append:async()=>{},close:async()=>({receiptSha256:'f'.repeat(64),receiptBytes:1})}),
      inspectBackup:()=>({status:'PERSISTED_BYTES_VERIFIED',manifestSha256:'d'.repeat(64),artifacts:Array(6).fill({})}),
      createTransport:context=>{base=Date.parse(context.policy.t0);start=performance.now();digest=context.policy.sourceBindingSha256;return {
        preflight:async()=>({status:'WATCHDOG_TRANSPORT_READY',sourceBindingSha256:digest}),
        requestPause:async()=>{pauses++;return {status:'PAUSE_REQUEST_ACCEPTED',sourceBindingSha256:digest};},
        confirmStopped:async()=>({status:'SOURCE_INACCESSIBLE',sourceBindingSha256:digest})};}});
    console.log(JSON.stringify({type:'fixture-count',pauses,state:result.state}));
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', program], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = ''; const rows = [];
  child.stdout.on('data', b => { buffer += b; const parts = buffer.split('\n'); buffer = parts.pop(); rows.push(...parts.filter(Boolean).map(JSON.parse)); });
  child.stderr.on('data', b => stderr += b);
  const closed = new Promise(resolve => child.once('close', resolve));
  const limit = setTimeout(() => child.kill(), 45000);
  const wait = async type => {
    for (let n = 0; n < 1000; n++) { const r = rows.find(row => row.type === type); if (r) return r; await new Promise(r => setTimeout(r, 10)); }
    throw Error('CHILD_RESPONSE_MISSING_' + type);
  };
  try {
    const p = { ...policy(), t0: new Date().toISOString() }, id = { runId: run, sourceCommit: source, sourceBindingSha256: binding };
    child.stdin.write(JSON.stringify({ type: 'init', sequence: 0, context: { policy: p }, journalDirectory: 'fixture-only' }) + '\n');
    await wait('ready');
    child.stdin.write(JSON.stringify({ type: 'backup', sequence: 1, receipt: { ...id, t0: p.t0, directory: 'fixture-only',
      manifestSha256: 'd'.repeat(64), completedAt: p.t0, checksumsCompletedAt: p.t0 } }) + '\n');
    await wait('backup-accepted');
    child.stdin.write(JSON.stringify({ type: 'arm', sequence: 2, ...id }) + '\n'); await wait('armed');
    if (scenario === 'stall') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 31000);
    else if (scenario === 'eof') child.stdin.end();
    else child.stdin.write(JSON.stringify({ type: 'success', sequence: 99, receipt: {} }) + '\n');
    const result = await wait('terminal'); await closed;
    assert.equal(stderr, ''); assert.equal(rows.find(r => r.type === 'fixture-count').pauses, 1);
    assert.equal(result.state, 'PAUSE_CONFIRMED'); assert.equal(result.pauseAttempts, 1);
    return result;
  } finally { clearTimeout(limit); if (child.exitCode === null) child.kill(); }
}
test('separate-process timers keep running while the parent event loop is blocked (accelerated clock)', async () => {
  const r = await processFixture('stall'); assert.ok(Date.parse(r.pauseRequestedAt) - Date.parse(r.t0) < 600000);
});
test('separate-process runner reacts to parent EOF and wrong message sequence after arm', async () => {
  await processFixture('eof'); await processFixture('sequence');
});
