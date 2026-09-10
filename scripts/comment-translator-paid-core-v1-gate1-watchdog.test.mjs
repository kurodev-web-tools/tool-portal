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
import { createGate1WatchdogTransport, observeGate1PauseRound, observeGate1DirectAddress } from './lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { runWatchdogProtocol } from './comment-translator-paid-core-v1-gate1-watchdog-runner.mjs';

const t0 = '2026-09-08T00:00:00.000Z';
const binding = 'a'.repeat(64), source = 'b'.repeat(40), run = 'c'.repeat(64);
const stopEvidencePolicy = 'supabase-inactive-v2';
const policy = () => ({ schemaVersion: 2, stopEvidencePolicy, t0, sourceBindingSha256: binding, sourceCommit: source, runId: run });
const round = (delta = {}) => ({ status: 'SOURCE_PAUSE_ROUND_COMPLETE', stopEvidencePolicy,
  sourceBindingSha256: binding, sourceCommit: source, runId: run, pinSetId: 'e'.repeat(64),
  pinnedAddressCount: 2, directRefusedCount: 2, directNoConnectCount: 0, ...delta });
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
  h.transport.confirmStopped = async () => round();
  await h.advance(2000); const r = await h.session.finished;
  assert.equal(r.state, 'PAUSE_CONFIRMED'); assert.equal(r.restoreEligible, true);
});
test('pause rejection is not retried; independent confirmation remains mandatory', async () => {
  let pause = 0;
  const h = harness({ transport: { requestPause: async () => { pause++; throw Error('private'); },
    confirmStopped: async () => round() } });
  await h.backup(); await h.session.arm(); h.session.fail(); await flush(); await h.advance(1000);
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
    transport: { confirmStopped: async () => round() } });
  await h.backup(); await h.session.arm(); h.session.fail(); await flush(); await h.advance(1000);
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
    publicProbe: { projectRef: target.projectRef, apiKey: 'sb_publishable_synthetic_fixture_key' },
    authorization: { runId: run, sourceCommit: source, sourceBindingSha256: digest, stopEvidencePolicy,
      readOnlyPreflight: true, pauseRequest: true, confirmedInaccessibility: true },
    env: { PATH: 'synthetic-path', PGHOST: target.host, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'postgres',
      PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'synthetic-ca', PGPASSWORD: 'fixture-only', UNRELATED_ENV: 'excluded' } };
  const calls = [], settings = { status: 'ACTIVE_HEALTHY', tcp: 'ECONNREFUSED',
    addresses: [{ address: '2001:db8::10', family: 6 }, { address: '192.0.2.10', family: 4 }], elapsed: 0, ...options };
  const scheduled = new Map(); let timerId = 0;
  const seams = {
    timers: { setTimeout: (fn, ms) => { const id = ++timerId; scheduled.set(id, { fn, at: settings.elapsed + ms }); return id; },
      clearTimeout: id => scheduled.delete(id) },
    clock: { wallNow: () => Date.parse(t0) + settings.elapsed, monotonicNow: () => settings.elapsed },
    lookupImpl(host, config, callback) {
      calls.push({ kind: 'dns', host, config });
      if (settings.deferDns) { settings.pendingDns = callback; settings.dnsEntered?.(); return; }
      queueMicrotask(() => callback(settings.dnsError ? { code: settings.dnsError } : null,
        settings.addressSequence?.shift() ?? settings.addresses));
    },
    fsApi: { lstatSync: () => ({ isFile: () => true }), readFileSync: () => ca },
    requestImpl(config, callback) {
      calls.push({ kind: 'https', config }); const req = new EventEmitter();
      req.destroy = () => {};
      req.end = () => queueMicrotask(() => {
        if (config.hostname !== 'api.supabase.com' && settings.httpDelayJump) {
          settings.elapsed += settings.httpDelayJump; settings.httpDelayJump = 0;
        }
        const res = new PassThrough(); res.statusCode = config.hostname === 'api.supabase.com' ? (settings.apiCode ?? 200) :
          (config.path.startsWith('/rest/v1/') ? settings.restCode : settings.authCode) ?? settings.http ??
          (config.path.startsWith('/rest/v1/') ? 401 : 200);
        callback(res);
        if (settings.abortResponse && config.hostname !== 'api.supabase.com') {
          res.destroy(Error('synthetic interrupted response')); return;
        }
        if (config.method === 'POST') res.end('{}');
        else if (config.hostname === 'api.supabase.com') res.end(JSON.stringify({ ref: settings.wrongTarget ? 'other' : target.projectRef,
          status: settings.projectStatusSequence?.shift() ?? settings.status, database: { host: target.host, postgres_engine: '17' } }));
        else if (settings.rawBody !== undefined) res.end(settings.rawBody);
        else if (res.statusCode === 540) res.end('project paused');
        else res.end(JSON.stringify(config.path.startsWith('/rest/v1/') ?
          (settings.restBody ?? { code: '42501', message: 'permission denied for table comment_translator_paid_entitlements', details: null, hint: null }) :
          (settings.authBody ?? { name: 'GoTrue', version: 'v2.fixture', description: 'fixture' })));
      }); return req;
    },
    spawnImpl(command, args, config) {
      calls.push({ kind: 'psql', command, args, config }); const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => true;
      child.stdin.on('finish', () => queueMicrotask(() => {
        child.stdout.end(args.includes('--version') ? 'psql (PostgreSQL) 17.11\n' : JSON.stringify(
          settings.pgBody ?? { serverMajor: 17, readOnly: 'on', tls: true, anonSelect: false }));
        child.stderr.end(); child.emit('close', settings.pgFailure || (settings.failedAddress && settings.failedAddress === config.env.PGHOSTADDR) ? 1 : 0, null);
      })); return child;
    },
    connectImpl(config) {
      calls.push({ kind: 'tcp', config }); const socket = new EventEmitter(); let destroyed = false;
      if (settings.setupFailure) throw Error('synthetic socket setup failure');
      socket.destroy = () => {
        if (destroyed) return; destroyed = true;
        queueMicrotask(() => {
          if (settings.lateConnect) socket.emit('connect');
          if (!settings.missingClose) socket.emit('close');
        });
      };
      const result = settings.tcpByAddress?.[config.host] ?? settings.tcp;
      queueMicrotask(() => {
        if (result === 'silent') return;
        if (result === 'connected') socket.emit('connect');
        else socket.emit('error', { code: result, port: settings.errorPort ?? 5432, address: settings.errorAddress ?? config.host });
      });
      return socket;
    },
  };
  return { context, seams, calls, settings, digest, async advance(ms) {
    const settleIO = async () => { await flush(); await new Promise(resolve => setImmediate(resolve)); await flush(); };
    const end = settings.elapsed + ms; await settleIO();
    for (let n = 0; n < 10000; n++) {
      const next = [...scheduled].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) { settings.elapsed = end; await settleIO(); return; }
      scheduled.delete(next[0]); settings.elapsed = next[1].at; next[1].fn(); await settleIO();
    }
    throw Error('FIXTURE_TIMER_LOOP');
  } };
}
test('v2 native silence needs the full observation window and terminal close before final readback', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams), signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540, tcp: 'silent' });
  const before = f.calls.length; let settled = false;
  const pending = transport.confirmStopped({ signal }).then(r => { settled = true; return r; });
  await f.advance(2999); assert.equal(settled, false);
  assert.equal(f.calls.slice(before).filter(c => c.kind === 'dns').length, 1);
  await f.advance(1); const result = await pending;
  assert.equal(result.status, 'SOURCE_PAUSE_ROUND_COMPLETE'); assert.equal(result.directNoConnectCount, 2);
  assert.equal(result.directRefusedCount, 0); assert.equal(f.calls.slice(before).filter(c => c.kind === 'dns').length, 2);
});
test('v2 native early cancellation, missing close and late connect cannot become pause evidence', async () => {
  for (const mode of ['cancel', 'missing-close', 'late-connect']) {
    const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams), controller = new AbortController();
    await transport.preflight({ signal: controller.signal }); await transport.requestPause({ signal: controller.signal });
    Object.assign(f.settings, { status: 'INACTIVE', http: 540, tcp: 'silent', missingClose: mode === 'missing-close', lateConnect: mode === 'late-connect' });
    const pending = transport.confirmStopped({ signal: controller.signal });
    await f.advance(1000); if (mode === 'cancel') controller.abort();
    await f.advance(3001); assert.notEqual((await pending).status, 'SOURCE_PAUSE_ROUND_COMPLETE');
    Object.assign(f.settings, { tcp: 'ECONNREFUSED', missingClose: false, lateConnect: false });
    if (mode === 'late-connect') assert.notEqual((await transport.confirmStopped({ signal: new AbortController().signal })).status, 'SOURCE_PAUSE_ROUND_COMPLETE');
  }
});
test('native transport refuses absent or mixed authorization with zero I/O', () => {
  for (const mutate of [c => { c.authorization.pauseRequest = false; }, c => { c.authorization.runId = 'e'.repeat(64); },
    c => { delete c.authorization.stopEvidencePolicy; }, c => { c.authorization.stopEvidencePolicy = 'legacy'; },
    c => { delete c.policy.stopEvidencePolicy; }, c => { c.policy.schemaVersion = 1; },
    c => { c.policy.sourceBindingSha256 = 'e'.repeat(64); }, c => { c.env.PGSSLMODE = 'disable'; },
    c => { delete c.publicProbe; }, c => { c.publicProbe.projectRef = 'other'; },
    c => { c.publicProbe.apiKey = 'sb_secret_never_accepted'; }]) {
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
test('native confirmation needs INACTIVE, terminal Direct outcomes and both HTTP540 probes', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  for (const delta of [{ status: 'GOING_DOWN' }, { status: 'INACTIVE', tcp: 'ENOTFOUND' },
    { status: 'INACTIVE', tcp: 'ETIMEDOUT' }, { status: 'INACTIVE', tcp: 'connected' },
    { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 401 }, { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 540, wrongTarget: true }]) {
    const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
    await transport.preflight({ signal }); await transport.requestPause({ signal });
    Object.assign(f.settings, { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 540, wrongTarget: false }, delta);
    assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  }
  Object.assign(f.settings, { status: 'INACTIVE', tcp: 'ECONNREFUSED', http: 540, wrongTarget: false });
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_PAUSE_ROUND_COMPLETE');
  for (const c of f.calls.filter(c => c.kind === 'https' && c.config.hostname !== 'api.supabase.com')) {
    assert.equal(c.config.headers.Authorization, undefined);
  }
});
test('native documented project pause accepts bounded complete HTTP540 without trusting the body format', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540 });
  for (const body of ['', 'Project paused', '{"message":"Project paused"}', 'x'.repeat(65536)]) {
    f.settings.rawBody = body;
    assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_PAUSE_ROUND_COMPLETE');
  }
  f.settings.rawBody = 'x'.repeat(65537);
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  Object.assign(f.settings, { rawBody: 'Project paused', abortResponse: true });
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
});
test('v2 policy is explicit and legacy pause evidence cannot authorize recovery', async () => {
  const h = harness({ transport: { confirmStopped: async () => ({ status: 'SOURCE_INACCESSIBLE', sourceBindingSha256: binding }) } });
  await h.backup(); await h.session.arm(); h.session.fail(); await h.advance(1200001);
  assert.equal((await h.session.finished).restoreEligible, false);
  for (const p of [{ ...policy(), schemaVersion: 1 }, { ...policy(), stopEvidencePolicy: undefined }]) {
    assert.throws(() => createGate1Watchdog({ policy: p, transport: h.transport, record: async () => {} }), /WATCHDOG_CONTEXT_INVALID/);
  }
});
test('v2 requires two complete rounds and records UNKNOWN Direct evidence for fully observed silence', async () => {
  const h = harness({ transport: { confirmStopped: async () => round({ directRefusedCount: 0, directNoConnectCount: 2 }) } });
  await h.backup(); await h.session.arm(); h.session.fail(); await flush();
  assert.equal(h.session.snapshot().restoreEligible, false);
  await h.advance(999); assert.equal(h.session.snapshot().restoreEligible, false);
  await h.advance(1); const r = await h.session.finished;
  assert.equal(r.restoreEligible, true); assert.equal(r.stopEvidencePolicy, stopEvidencePolicy);
  assert.equal(r.stoppingEvidence.status, 'SOURCE_PAUSED_VERIFIED');
  assert.equal(r.stoppingEvidence.rounds.length, 2); assert.equal(r.stoppingEvidence.directEvidence, 'UNKNOWN');
  assert.ok(h.records.every(row => row.stopEvidencePolicy === stopEvidencePolicy));
});
test('v2 unknown intervening round resets the pair, and pin identity changes permanently veto', async () => {
  const answers = [round(), null, round(), round()];
  const h = harness({ transport: { confirmStopped: async () => answers.shift() } });
  await h.backup(); await h.session.arm(); h.session.fail(); await flush();
  await h.advance(2000); assert.equal(h.session.snapshot().restoreEligible, false);
  await h.advance(1000); assert.equal((await h.session.finished).restoreEligible, true);
  const invalid = harness({ transport: { confirmStopped: async () => round() } });
  await invalid.backup(); await invalid.session.arm(); invalid.session.fail(); await flush();
  invalid.transport.confirmStopped = async () => round({ pinSetId: 'f'.repeat(64) });
  await invalid.advance(1000); invalid.transport.confirmStopped = async () => round();
  await invalid.advance(1199001); assert.equal((await invalid.session.finished).restoreEligible, false);
});
test('v2 confirmation allows a full round but rejects a result after twelve seconds', async () => {
  for (const duration of [11000, 12001]) {
    let resolveRound;
    const h = harness({ transport: { confirmStopped: () => new Promise(resolve => { resolveRound = resolve; }) } });
    await h.backup(); await h.session.arm(); h.session.fail(); await flush();
    await h.advance(duration); resolveRound(round()); await flush();
    h.transport.confirmStopped = async () => round();
    await h.advance(1000);
    assert.equal(h.session.snapshot().restoreEligible, duration === 11000);
    if (duration === 12001) { await h.advance(1200001); await h.session.finished; }
  }
});
test('v2 pair expires after thirty seconds and source or run changes cannot recover later', async () => {
  const h = harness({ transport: { confirmStopped: async () => round() } });
  await h.backup(); await h.session.arm(); h.session.fail(); await flush();
  h.setWallOffset(30001); await h.advance(1000); assert.equal(h.session.snapshot().restoreEligible, false);
  await h.advance(1000); assert.equal((await h.session.finished).restoreEligible, true);
  for (const mismatch of [{ runId: 'f'.repeat(64) }, { sourceCommit: 'f'.repeat(40) }, { stopEvidencePolicy: 'legacy' }]) {
    const invalid = harness({ transport: { confirmStopped: async () => round(mismatch) } });
    await invalid.backup(); await invalid.session.arm(); invalid.session.fail(); await flush();
    invalid.transport.confirmStopped = async () => round();
    await invalid.advance(1200001); assert.equal((await invalid.session.finished).restoreEligible, false);
  }
});
test('v2 durable final evidence arriving after twenty minutes never grants eligibility', async () => {
  let h;
  h = harness({ transport: { confirmStopped: async () => round() }, record: async row => {
    if (row.event === 'SOURCE_PAUSED_VERIFIED') h.setWallOffset(1200001);
  } });
  await h.backup(); await h.session.arm(); h.session.fail(); await flush(); await h.advance(2000);
  assert.equal((await h.session.finished).restoreEligible, false);
});
test('v2 native Direct rejects setup and mismatched refusal and latches open and identity drift', async () => {
  for (const delta of [{ setupFailure: true }, { errorPort: 5433 }, { errorAddress: '192.0.2.99' },
    { tcp: 'ECONNRESET' }, { tcp: 'EHOSTUNREACH' }, { tcp: 'connected' }, { wrongTarget: true }]) {
    const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams), signal = new AbortController().signal;
    await transport.preflight({ signal }); await transport.requestPause({ signal });
    Object.assign(f.settings, { status: 'INACTIVE', http: 540 }, delta);
    assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
    if (delta.tcp === 'connected' || delta.wrongTarget) {
      Object.assign(f.settings, { tcp: 'ECONNREFUSED', wrongTarget: false });
      assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
    }
  }
});
test('v2 shared round supervises hung readers by phase and cancels all work at the absolute deadline', async () => {
  for (const mode of ['before', 'http', 'after', 'absolute']) {
    const f = nativeFixture(), controller = new AbortController(); let reads = 0, cancelled = 0;
    const hang = signal => new Promise(() => { signal.addEventListener('abort', () => { cancelled++; }); });
    const pending = observeGate1PauseRound({ signal: controller.signal, pins: ['192.0.2.10'], sameProject: p => p.ref === 'fixture',
      project: async s => { reads++; return mode === 'before' || (mode === 'after' && reads === 2) ? hang(s) : { ref: 'fixture', status: 'INACTIVE' }; },
      addresses: async () => null, http: async (_, s) => mode === 'http' || mode === 'absolute' ? hang(s) : { status: 540 },
      remainingMs: () => (mode === 'absolute' ? 2000 : 1200000) - f.settings.elapsed, invalidate: () => {},
    }, f.seams);
    await f.advance(mode === 'absolute' ? 2000 : 4000);
    assert.equal(await pending, null); assert.ok(cancelled > 0);
  }
});
test('v2 full round wall duration and malformed pins cannot bypass supervision', async () => {
  const f = nativeFixture(); let entered = 0;
  assert.equal(await observeGate1DirectAddress('not-an-ip', new AbortController().signal,
    { ...f.seams, onConnect: () => { entered++; } }), 'UNKNOWN');
  assert.equal(f.calls.length, 0); assert.equal(entered, 0);
  const result = await observeGate1PauseRound({ signal: new AbortController().signal, pins: ['192.0.2.10'],
    project: async () => ({ status: 'INACTIVE' }), sameProject: () => true, addresses: async () => null,
    http: async () => { f.settings.elapsed += 7000; return { status: 540 }; },
    remainingMs: () => 1200000 - f.settings.elapsed, invalidate: () => {},
  }, f.seams);
  assert.equal(result, null);
});
test('v2 native observer and supervisor accept only the second full silent round', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams), rows = [];
  await transport.preflight({ signal: new AbortController().signal });
  const session = createGate1Watchdog({ policy: f.context.policy, transport, record: async row => rows.push(row),
    clock: f.seams.clock, timers: f.seams.timers });
  assert.equal(await session.acceptBackup({ runId: run, sourceCommit: source, sourceBindingSha256: f.digest, t0,
    manifestSha256: 'd'.repeat(64), completedAt: t0, checksumsCompletedAt: t0, inspectedAt: t0 }), true);
  assert.equal(await session.arm(), true);
  Object.assign(f.settings, { status: 'INACTIVE', http: 540, tcp: 'silent' }); session.fail();
  await f.advance(3000); assert.equal(session.snapshot().restoreEligible, false);
  await f.advance(5000); const result = await session.finished;
  assert.equal(result.restoreEligible, true); assert.equal(result.stoppingEvidence.directEvidence, 'UNKNOWN');
  assert.equal(result.stoppingEvidence.rounds.length, 2);
  assert.equal(f.calls.filter(c => c.kind === 'tcp').length, 4);
  assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 1);
  assert.equal(rows.at(-1).event, 'SOURCE_PAUSED_VERIFIED');
});
test('v2 observed identity or address drift latches even when its sibling reader fails', async () => {
  for (const mode of ['identity', 'address']) {
    const f = nativeFixture(); let reason;
    const result = await observeGate1PauseRound({ signal: new AbortController().signal, pins: ['192.0.2.10'],
      project: async () => { if (mode === 'address') throw Error('failed'); return { ref: 'other', status: 'INACTIVE' }; },
      sameProject: p => p.ref === 'expected',
      addresses: async () => { if (mode === 'identity') throw Error('failed'); return ['192.0.2.20']; },
      http: async () => ({ status: 540 }), remainingMs: () => 1200000, invalidate: value => { reason = value; },
    }, f.seams);
    assert.equal(result, null); assert.equal(reason, mode === 'identity' ? 'IDENTITY_CHANGED' : 'ADDRESS_COVERAGE_CHANGED');
  }
});
test('v2 individual HTTP bound rejects a response at 3500ms even inside the phase allowance', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams), signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540, httpDelayJump: 3500 });
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
});

test('native project pause rejects generic503, other errors and mixed endpoint status codes', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540, rawBody: '{"message":"Project paused"}' });
  for (const status of [200, 204, 301, 401, 403, 500, 503, 541, 544, 546]) {
    for (const [restCode, authCode] of [[status, status], [540, status], [status, 540]]) {
      Object.assign(f.settings, { restCode, authCode });
      assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
    }
  }
});

test('native preflight rejects wrong identity, HTTP redirects and failed database probe', async () => {
  for (const options of [{ wrongTarget: true }, { apiCode: 302 }, { pgFailure: true }]) {
    const f = nativeFixture(options), transport = createGate1WatchdogTransport(f.context, f.seams);
    await assert.rejects(transport.preflight({ signal: new AbortController().signal }), /WATCHDOG_PREFLIGHT_FAILED/);
    assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
  }
});

test('native endpoint baseline failure prevents pause, including after earlier readiness', async () => {
  for (const route of ['restCode', 'authCode']) {
    for (const status of [route === 'restCode' ? 200 : 401, 204, 302, 403, 404, 500, 503, 540]) {
      const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
      const signal = new AbortController().signal;
      await transport.preflight({ signal });
      f.settings[route] = status;
      await assert.rejects(transport.preflight({ signal }), /WATCHDOG_PREFLIGHT_FAILED/);
      await assert.rejects(transport.requestPause({ signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
      assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
    }
  }
});

test('native baseline binds public key and validates every resolved address with original TLS hostname', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  await transport.preflight({ signal: new AbortController().signal });
  const probes = f.calls.filter(c => c.kind === 'psql' && !c.args.includes('--version'));
  assert.deepEqual(probes.map(c => c.config.env.PGHOSTADDR).sort(), f.settings.addresses.map(a => a.address).sort());
  for (const p of probes) { assert.equal(p.config.env.PGHOST, 'db.fixtureproject.supabase.co'); assert.equal(p.config.env.PGSSLMODE, 'verify-full'); }
  for (const c of f.calls.filter(c => c.kind === 'https' && c.config.hostname !== 'api.supabase.com')) {
    assert.equal(c.config.headers.apikey, f.context.publicProbe.apiKey);
    assert.equal(c.config.headers.Authorization, undefined);
    assert.ok(['/auth/v1/health', '/rest/v1/comment_translator_paid_entitlements?select=*&limit=0'].includes(c.config.path));
  }
});

test('native table permission baseline accepts advisory text without treating it as authority', async () => {
  const permission = { code: '42501', message: 'permission denied for table comment_translator_paid_entitlements',
    details: null, hint: 'Synthetic operator guidance; not an authorization result.' };
  const f = nativeFixture({ restBody: permission }), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  assert.equal((await transport.preflight({ signal })).status, 'WATCHDOG_TRANSPORT_READY');
  for (const delta of [{ hint: {} }, { hint: [] }, { hint: true }, { hint: 1 }, { hint: undefined },
    { code: 'PGRST301' }, { message: 'permission denied for table unrelated' }, { details: 'unexpected detail' }]) {
    f.settings.restBody = { ...permission, ...delta };
    await assert.rejects(transport.preflight({ signal }), /WATCHDOG_PREFLIGHT_FAILED/);
    await assert.rejects(transport.requestPause({ signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
  }
  assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
});

test('native preflight rejects malformed backend evidence and incomplete address validation without pause', async () => {
  for (const options of [{ authBody: { name: 'other' } }, { restBody: { code: '42501', message: 'permission denied for schema public' } },
    { restBody: { code: 'PGRST301', message: 'invalid JWT' } }, { rawBody: '{' }, { rawBody: 'x'.repeat(65537) },
    { pgBody: { serverMajor: 17, readOnly: 'on', tls: true, anonSelect: true } },
    { pgBody: { serverMajor: 17, readOnly: 'on', tls: false, anonSelect: false } },
    { addresses: [] }, { addresses: [{ address: 'not-an-ip', family: 4 }] },
    { addresses: Array.from({ length: 9 }, (_, n) => ({ address: `192.0.2.${n+1}`, family: 4 })) },
    { dnsError: 'ENOTFOUND' }, { dnsError: 'EAI_AGAIN' }, { failedAddress: '192.0.2.10' }]) {
    const f = nativeFixture(options), transport = createGate1WatchdogTransport(f.context, f.seams);
    const signal = new AbortController().signal;
    await assert.rejects(transport.preflight({ signal }), /WATCHDOG_PREFLIGHT_FAILED/);
    await assert.rejects(transport.requestPause({ signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
    assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
  }
});

test('native DNS absence retains all pins; partial connectivity and transient DNS stay unknown', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540, dnsError: 'ENOTFOUND' });
  for (const value of ['connected', 'ETIMEDOUT', 'ENOTFOUND']) {
    const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
    await transport.preflight({ signal }); await transport.requestPause({ signal });
    Object.assign(f.settings, { status: 'INACTIVE', http: 540, dnsError: 'ENOTFOUND' });
    f.settings.tcpByAddress = { '192.0.2.10': value };
    assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  }
  f.settings.tcpByAddress = {};
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_PAUSE_ROUND_COMPLETE');
  assert.ok(f.calls.filter(c => c.kind === 'tcp').every(c => ['192.0.2.10', '2001:db8::10'].includes(c.config.host)));
  f.settings.dnsError = 'EAI_AGAIN';
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
});

test('native new address invalidates same-run coverage and cannot be silently repinned after pause', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540 });
  const original = f.settings.addresses;
  f.settings.addresses = [...original, { address: '192.0.2.20', family: 4 }];
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  f.settings.addresses = original;
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  await assert.rejects(transport.preflight({ signal }), /WATCHDOG_PREFLIGHT_FAILED/);
});

test('native stopped evidence expires at the original deadline and cannot use an aborted signal', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540 });
  const controller = new AbortController(); controller.abort();
  assert.equal((await transport.confirmStopped({ signal: controller.signal })).status, 'SOURCE_STATUS_UNKNOWN');
  f.settings.elapsed = 1200001;
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
});

test('native preflight rejects address changes during validation and project state changes before readiness', async () => {
  for (const options of [{ addressSequence: [[{ address: '192.0.2.10', family: 4 }], [{ address: '192.0.2.20', family: 4 }]] },
    { projectStatusSequence: ['ACTIVE_HEALTHY', 'GOING_DOWN'] }]) {
    const f = nativeFixture(options), transport = createGate1WatchdogTransport(f.context, f.seams);
    const signal = new AbortController().signal;
    await assert.rejects(transport.preflight({ signal }), /WATCHDOG_PREFLIGHT_FAILED/);
    await assert.rejects(transport.requestPause({ signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
    assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
  }
});

test('native confirmation brackets endpoint checks with project and DNS readback', async () => {
  for (const change of ['resumed', 'new-address']) {
    const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
    const signal = new AbortController().signal;
    await transport.preflight({ signal }); await transport.requestPause({ signal });
    Object.assign(f.settings, { status: 'INACTIVE', http: 540 });
    if (change === 'resumed') f.settings.projectStatusSequence = ['INACTIVE', 'ACTIVE_HEALTHY'];
    else f.settings.addressSequence = [f.settings.addresses, [{ address: '192.0.2.20', family: 4 }]];
    assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
    assert.equal(f.calls.filter(c => c.kind === 'tcp').length, 2);
  }
});

test('native cancelled DNS cannot later establish readiness or send a pause', async () => {
  let dnsEntered;
  const entered = new Promise(resolve => { dnsEntered = resolve; });
  const f = nativeFixture({ deferDns: true, dnsEntered }), transport = createGate1WatchdogTransport(f.context, f.seams);
  const controller = new AbortController();
  const pending = transport.preflight({ signal: controller.signal });
  const rejected = assert.rejects(pending, /WATCHDOG_PREFLIGHT_FAILED/);
  await entered; assert.equal(typeof f.settings.pendingDns, 'function'); controller.abort(); await rejected;
  f.settings.pendingDns(null, f.settings.addresses); await flush();
  await assert.rejects(transport.requestPause({ signal: new AbortController().signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
  assert.equal(f.calls.filter(c => c.kind === 'https' && c.config.method === 'POST').length, 0);
});

test('native clock rollback cannot refresh expired pins and a new transport has no inherited readiness', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const signal = new AbortController().signal;
  await transport.preflight({ signal }); await transport.requestPause({ signal });
  Object.assign(f.settings, { status: 'INACTIVE', http: 540, elapsed: 1200001 });
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  f.settings.elapsed = 0;
  assert.equal((await transport.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  const next = createGate1WatchdogTransport(f.context, f.seams);
  assert.equal((await next.confirmStopped({ signal })).status, 'SOURCE_STATUS_UNKNOWN');
  await assert.rejects(next.requestPause({ signal }), /WATCHDOG_TRANSPORT_NOT_READY/);
});

test('native transport captures the key so caller mutation cannot change the bound probe credentials', async () => {
  const f = nativeFixture(), transport = createGate1WatchdogTransport(f.context, f.seams);
  const original = f.context.publicProbe.apiKey;
  f.context.publicProbe.apiKey = 'sb_publishable_other_fixture_key';
  await transport.preflight({ signal: new AbortController().signal });
  const requests = f.calls.filter(c => c.kind === 'https' && c.config.hostname !== 'api.supabase.com');
  assert.equal(requests.length, 2); assert.ok(requests.every(c => c.config.headers.apikey === original));
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
    let base, start, digest, pauses=0,checks=0;
    const factor=${scenario === 'stall' ? 20 : scenario === 'source-drift' ? 1000 : 1};
    const clock={wallNow:()=>base===undefined?Date.now():base+(performance.now()-start)*factor,monotonicNow:()=>performance.now()*factor};
    const result=await runWatchdogProtocol({clock,timers:{setTimeout:(fn,ms)=>setTimeout(fn,ms/factor),clearTimeout},
      verifySource:async()=>{checks++;if(${scenario === 'source-drift'}&&checks>=3)throw Error('source changed');},
      openJournal:async()=>({append:async()=>{},close:async()=>{if(${scenario === 'receipt-expired'})base+=1200001;return {receiptSha256:'f'.repeat(64),receiptBytes:1};}}),
      inspectBackup:()=>({status:'PERSISTED_BYTES_VERIFIED',manifestSha256:'d'.repeat(64),artifacts:Array(6).fill({})}),
      createTransport:context=>{base=Date.parse(context.policy.t0);start=performance.now();digest=context.policy.sourceBindingSha256;return {
        preflight:async()=>({status:'WATCHDOG_TRANSPORT_READY',sourceBindingSha256:digest}),
        requestPause:async()=>{pauses++;return {status:'PAUSE_REQUEST_ACCEPTED',sourceBindingSha256:digest};},
        confirmStopped:async()=>({status:'SOURCE_PAUSE_ROUND_COMPLETE',stopEvidencePolicy:'supabase-inactive-v2',sourceBindingSha256:digest,sourceCommit:context.policy.sourceCommit,runId:context.policy.runId,pinSetId:'e'.repeat(64),pinnedAddressCount:1,directRefusedCount:1,directNoConnectCount:0})};}});
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
    assert.equal(result.state, scenario === 'source-drift' ? 'PAUSE_UNCONFIRMED' : 'PAUSE_CONFIRMED'); assert.equal(result.pauseAttempts, 1);
    return result;
  } finally { clearTimeout(limit); if (child.exitCode === null) child.kill(); }
}
test('separate-process timers keep running while the parent event loop is blocked (accelerated clock)', async () => {
  const r = await processFixture('stall'); assert.ok(Date.parse(r.pauseRequestedAt) - Date.parse(r.t0) < 600000);
});
test('separate-process runner reacts to parent EOF and wrong message sequence after arm', async () => {
  await processFixture('eof'); await processFixture('sequence');
});
test('separate-process runner rejects source drift during a round and late final receipt readback', async () => {
  const changed = await processFixture('source-drift'); assert.equal(changed.restoreEligible, false);
  const expired = await processFixture('receipt-expired'); assert.equal(expired.restoreEligible, false);
  assert.equal(expired.reason, 'WATCHDOG_FINAL_RECEIPT_DEADLINE_EXCEEDED');
});
