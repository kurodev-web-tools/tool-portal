import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { decodeBackupDumpOutput } from './lib/comment-translator-paid-core-v1-gate1-backup-dump-transport.mjs';

// Explicit local-only native test. No hosted inputs, cached image only, one
// uniquely labelled container with tmpfs data and a loopback-only random port.
const root = process.cwd();
const docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe';
const pgDump = path.join(root, '.tmp/tools/postgresql-17.11/bin/pg_dump.exe');
const image = 'public.ecr.aws/supabase/postgres:17.6.1.140';
const label = 'com.comment_translator.gate1.dump-transport';
const runId = randomBytes(16).toString('hex');
const name = 'gate1-dump-transport-' + runId;
const baseEnv = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
  USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, LOCALAPPDATA: process.env.LOCALAPPDATA };
let id = null, imageId = null, attempted = false, result;
function native(command, args, { input, env = baseEnv, allowExit = false } = {}) {
  const r = spawnSync(command, args, { input, env, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  if (r.error || r.signal || !Buffer.isBuffer(r.stdout) || !Buffer.isBuffer(r.stderr) ||
      (!allowExit && (r.status !== 0 || r.stderr.length))) throw Error('NATIVE_PROBE_PROCESS_FAILED');
  return r;
}
const dock = (args, options) => native(docker, ['--context', 'desktop-linux', ...args], options);
function owned() {
  const v = JSON.parse(dock(['inspect', id ?? name]).stdout)[0];
  assert.equal(v.Name, '/' + name); assert.equal(v.Config.Labels?.[label], runId);
  assert.equal(v.Image, imageId); assert.equal(v.HostConfig.Privileged, false);
  assert.equal((v.HostConfig.Binds ?? []).length, 0);
  assert.equal(v.Mounts.filter(m => m.Type !== 'tmpfs').length, 0);
  if (id) assert.equal(v.Id, id);
  assert.match(v.Id, /^[a-f0-9]{64}$/);
  id = v.Id;
  return v;
}
function sql(database, statement, transaction = false) {
  owned();
  return dock(['exec', '-i', id, 'psql', '-X', '-qAt', '--no-password', '-U', 'postgres', '-d', database,
    '-v', 'ON_ERROR_STOP=1', ...(transaction ? ['--single-transaction'] : []), '--file=-'], { input: statement }).stdout.toString('utf8').trim();
}
try {
  if (process.argv.length !== 3 || process.argv[2] !== '--local-only' || process.platform !== 'win32') throw Error('LOCAL_WINDOWS_PROBE_REQUIRED');
  if (!fs.statSync(pgDump).isFile()) throw Error('NATIVE_CLIENT_MISSING');
  assert.match(native(pgDump, ['--version']).stdout.toString('utf8').trim(), /^pg_dump \(PostgreSQL\) 17\.11$/);
  const cached = JSON.parse(dock(['image', 'inspect', image]).stdout)[0];
  assert.equal(Object.keys(cached.Config.Volumes ?? {}).length, 0);
  imageId = cached.Id; assert.match(imageId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(dock(['ps', '-aq', '--filter', 'name=^/' + name + '$']).stdout.toString('utf8').trim(), '');
  const password = randomBytes(32).toString('base64url');
  attempted = true;
  const started = dock(['run', '--detach', '--pull=never', '--name', name, '--label', label + '=' + runId,
    '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data', '--env', 'POSTGRES_PASSWORD',
    '--env', 'POSTGRES_DB=postgres', imageId], { env: { ...baseEnv, POSTGRES_PASSWORD: password } });
  id = started.stdout.toString('utf8').trim(); assert.match(id, /^[a-f0-9]{64}$/);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    owned();
    const r = dock(['exec', id, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres'], { allowExit: true });
    if (r.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw Error('NATIVE_DATABASE_NOT_READY');
  const v = owned(), ports = v.NetworkSettings.Ports['5432/tcp'];
  assert.equal(ports.length, 1); assert.equal(ports[0].HostIp, '127.0.0.1'); assert.match(ports[0].HostPort, /^\d{1,5}$/);
  const env = { ...baseEnv, PGHOST: '127.0.0.1', PGPORT: ports[0].HostPort, PGUSER: 'postgres',
    PGPASSWORD: password, PGDATABASE: 'gate1_probe_source', PGSSLMODE: 'disable', PGCONNECT_TIMEOUT: '5', PGCLIENTENCODING: 'UTF8' };
  for (const database of ['gate1_probe_source', 'gate1_probe_plain', 'gate1_probe_gzip']) sql('postgres', 'CREATE DATABASE ' + database + ';');
  const forms = [['lf', '\n'], ['crlf', '\r\n'], ['cr', '\r']];
  const setup = 'CREATE SCHEMA gate1_dump_probe AUTHORIZATION postgres;\n' + forms.map(([kind, newline]) =>
    `CREATE FUNCTION gate1_dump_probe.newline_${kind}() RETURNS text LANGUAGE sql AS $body$\nSELECT '日本語${newline}😀';\n$body$;`).join('\n');
  sql('gate1_probe_source', setup, true);
  const readback = "SELECT jsonb_agg(jsonb_build_object('name',p.proname,'definitionMd5',md5(pg_get_functiondef(p.oid)),'bodyMd5',md5(p.prosrc)) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='gate1_dump_probe';";
  const before = JSON.parse(sql('gate1_probe_source', readback)); assert.equal(before.length, 3);
  const args = ['--schema-only', '--schema=gate1_dump_probe', '--role=postgres', '--quote-all-identifiers', '--no-password'];
  owned();
  const plain = native(pgDump, args, { env }).stdout;
  sql('gate1_probe_plain', plain, true);
  const old = JSON.parse(sql('gate1_probe_plain', readback));
  const plainMismatchCount = before.filter((f, i) => f.definitionMd5 !== old[i].definitionMd5).length;
  assert.equal(plainMismatchCount, 3, 'uncompressed Windows stdout must reproduce the original failure');
  owned();
  const compressed = native(pgDump, ['--compress=gzip', ...args], { env }).stdout;
  const decoded = decodeBackupDumpOutput(compressed, 'gzip');
  sql('gate1_probe_gzip', decoded.text, true);
  assert.deepEqual(JSON.parse(sql('gate1_probe_gzip', readback)), before);
  result = { status: 'NATIVE_DUMP_ROUNDTRIP_PASS', clientMajor: 17, platform: 'win32', functions: 3,
    plainMismatchCount, gzipDefinitionMatches: 3, gzipBodyMatches: 3, hostedConnections: 0 };
} catch (e) {
  result = { status: 'NATIVE_DUMP_ROUNDTRIP_FAILED', reason: /^[A-Z_]+$/.test(e.message) ? e.message : 'NATIVE_ASSERTION_FAILED' };
} finally {
  if (attempted) {
    try {
      owned(); dock(['rm', '-f', id]);
      assert.equal(dock(['ps', '-aq', '--filter', 'label=' + label + '=' + runId]).stdout.toString('utf8').trim(), '');
      result.cleanup = 'PASS';
    } catch { result.cleanup = 'UNCONFIRMED'; }
  }
}
console.log(JSON.stringify(result));
if (result.status !== 'NATIVE_DUMP_ROUNDTRIP_PASS' || result.cleanup !== 'PASS') process.exitCode = 1;
