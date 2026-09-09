import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BACKUP_SOURCE_STATE_SQL, BACKUP_DATA_EXCLUDED_SCHEMAS, BACKUP_DATA_EXCLUDED_TABLES } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { transformRestoreRoles, transformRestoreSchema } from './lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs';
import { createRehearsalRestore } from './lib/comment-translator-paid-core-v1-gate1-rehearsal-restore.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe';
const hostArgs = ['--host', 'npipe:////./pipe/dockerDesktopLinuxEngine'];
const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot };
const schemaExcluded = 'information_schema pg_* _analytics _realtime _supavisor auth etl extensions pgbouncer realtime storage supabase_functions supabase_migrations cron dbdev graphql graphql_public net pgmq pgsodium pgsodium_masks pgtle repack tiger tiger_data timescaledb_* _timescaledb_* topology vault'.split(' ');
const fixedPsql = ['psql', '-X', '-qAt', '--no-password', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'];
const readSql = `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL search_path=pg_catalog,public; SET LOCAL row_security=off; SET LOCAL statement_timeout='10000ms'; SELECT ${BACKUP_SOURCE_STATE_SQL}; COMMIT;`;
const reject = () => { throw Error('LOCAL_REHEARSAL_PROBE_REJECTED'); };

// Explicit synthetic-only entry: no caller target, credentials, SQL or paths.
// It can touch only two containers it creates on the fixed local named pipe.
export async function runSyntheticRehearsal() {
  if (process.platform !== 'win32' || arguments.length) reject();
  const run = randomBytes(16).toString('hex'), owned = new Map(), plannedNames = new Set();
  let phase = 'image', result, failure, image;
  const invoke = (args, input, maxBuffer = 32 * 1024 * 1024) => {
    const r = spawnSync(docker, [...hostArgs, ...args], { input, env, shell: false, windowsHide: true, timeout: 30000, maxBuffer });
    if (r.error || r.signal || r.status !== 0 || !Buffer.isBuffer(r.stdout) || !Buffer.isBuffer(r.stderr) || r.stderr.length) reject();
    return r.stdout;
  };
  const assertOwned = id => {
    if (!owned.has(id) || !/^[a-f0-9]{64}$/.test(id)) reject();
    const actual = JSON.parse(invoke(['inspect', '--format', '{{json .}}', id], undefined, 65536));
    if (actual.Id !== id || actual.Config.Labels?.['com.comment_translator.gate1.synthetic'] !== run ||
      actual.Image !== owned.get(id) || actual.HostConfig.NetworkMode !== 'none' || actual.HostConfig.Privileged ||
      Object.keys(actual.HostConfig.PortBindings ?? {}).length || (actual.HostConfig.Binds ?? []).length ||
      actual.Mounts.some(m => m.Type !== 'tmpfs')) reject();
  };
  const sql = (id, text, atomic = false) => { assertOwned(id); return invoke(['exec', '-i', id, ...fixedPsql, ...(atomic ? ['--single-transaction', '--file=-'] : [])], Buffer.from(text)); };
  try {
    image = invoke(['image', 'inspect', '--format', '{{.Id}}', 'postgres:17'], undefined, 4096).toString().trim();
    if (!/^sha256:[a-f0-9]{64}$/.test(image)) reject();
    const create = async suffix => {
      const name = `gate1-rehearsal-${run}-${suffix}`; plannedNames.add(name);
      const id = invoke(['run', '-d', '--pull=never', '--name', name, '--label', `com.comment_translator.gate1.synthetic=${run}`,
        '--network', 'none', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image], undefined, 4096).toString().trim();
      if (!/^[a-f0-9]{64}$/.test(id)) reject(); owned.set(id, image); assertOwned(id);
      for (let i = 0; i < 40; i++) {
        const r = spawnSync(docker, [...hostArgs, 'exec', id, 'pg_isready', '-U', 'postgres'], { env, windowsHide: true, timeout: 2000, maxBuffer: 4096 });
        if (!r.error && !r.signal && r.status === 0) return id;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      reject();
    };
    phase = 'create'; const source = await create('source'), target = await create('target');
    phase = 'fixture';
    const managed = `CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA vault;
CREATE TABLE auth.users(id integer PRIMARY KEY); CREATE TABLE storage.objects(id integer);
CREATE TABLE storage.buckets_vectors(id integer); CREATE TABLE storage.vector_indexes(id integer); CREATE TABLE vault.secrets(id integer);`;
    for (const id of [source, target]) {
      if (Number(sql(id, "SELECT current_setting('server_version_num')::int / 10000;").toString().trim()) !== 17) reject();
      sql(id, managed);
    }
    sql(source, `CREATE ROLE fixture_reader; CREATE SCHEMA custom_scope;
CREATE TABLE public.items(id integer PRIMARY KEY, owner_id integer REFERENCES auth.users(id), body text);
INSERT INTO auth.users VALUES(1); INSERT INTO public.items VALUES(1,1,E'Unicode_日本語\\nCOPY-like; payload');
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY; CREATE POLICY own ON public.items USING(owner_id=1);
GRANT SELECT ON public.items TO fixture_reader; CREATE SEQUENCE custom_scope.seq; GRANT USAGE ON SEQUENCE custom_scope.seq TO fixture_reader;
CREATE FUNCTION custom_scope.fn() RETURNS integer LANGUAGE sql AS 'SELECT 1';
ALTER DEFAULT PRIVILEGES IN SCHEMA custom_scope GRANT SELECT ON TABLES TO fixture_reader;
CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY, name text, statements text[]);
INSERT INTO supabase_migrations.schema_migrations SELECT lpad(n::text,14,'0'), 'synthetic_' || n, ARRAY['SELECT 1;'] FROM generate_series(1,22)n;`);
    phase = 'capture';
    const rawRoles = invoke(['exec', source, 'pg_dumpall', '--roles-only', '--role=postgres', '--quote-all-identifiers', '--no-role-passwords', '--no-comments', '--no-password', '-U', 'postgres']).toString('utf8');
    const roles = transformRestoreRoles(rawRoles).sql;
    assertOwned(source);
    const child = spawn(docker, [...hostArgs, 'exec', '-i', source, ...fixedPsql], { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', stderr = 0, settle, rejectReady;
    const ready = new Promise((resolve, reject) => { settle = resolve; rejectReady = reject; });
    const closed = new Promise(resolve => child.on('close', code => { rejectReady(Error('LOCAL_EXPORTER_CLOSED')); resolve(code); }));
    child.on('error', () => rejectReady(Error('LOCAL_EXPORTER_FAILED')));
    for (const stream of [child.stdin, child.stdout, child.stderr]) stream.on('error', () => rejectReady(Error('LOCAL_EXPORTER_STREAM_FAILED')));
    child.stderr.on('data', b => { stderr += b.length; rejectReady(Error('LOCAL_EXPORTER_STDERR')); });
    child.stdout.on('data', b => { out += b.toString('utf8'); if (Buffer.byteLength(out) > 65536) rejectReady(Error('LOCAL_EXPORTER_LIMIT')); else if (out.endsWith('\n')) { try { settle(JSON.parse(out)); } catch { rejectReady(Error('LOCAL_EXPORTER_OUTPUT')); } } });
    let timer;
    const deadline = new Promise((resolve, reject) => { timer = setTimeout(() => { child.kill(); reject(Error('LOCAL_EXPORTER_TIMEOUT')); }, 60000); });
    let sourceState, snapshot, dumpBuffers;
    try {
      child.stdin.write(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL search_path=pg_catalog,public; SET LOCAL row_security=off; SELECT json_build_object('snapshot',pg_export_snapshot(),'state',${BACKUP_SOURCE_STATE_SQL});\n`);
      const observed = await Promise.race([ready, deadline]); sourceState = observed.state; snapshot = observed.snapshot;
      if (!/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{8}-[1-9][0-9]*$/.test(snapshot)) reject();
      const dataFilters = [...BACKUP_DATA_EXCLUDED_SCHEMAS.flatMap(s => ['--exclude-schema', s]), ...BACKUP_DATA_EXCLUDED_TABLES.flatMap(s => ['--exclude-table', s]), '--schema', '*'];
      const recipes = [['--schema-only', ...schemaExcluded.flatMap(s => ['--exclude-schema', s])], ['--data-only', ...dataFilters],
        ['--schema-only', '--schema=supabase_migrations'], ['--data-only', '--schema=supabase_migrations']];
      dumpBuffers = recipes.map(recipe => { assertOwned(source); return invoke(['exec', source, 'pg_dump', '-U', 'postgres', '--role=postgres', '--quote-all-identifiers', '--no-password', '--snapshot', snapshot, ...recipe]); });
      child.stdin.end('COMMIT;\n'); if (await Promise.race([closed, deadline]) !== 0 || stderr) reject();
    } finally {
      clearTimeout(timer);
      if (child.exitCode === null) {
        child.kill(); child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); child.unref();
      }
    }
    const envelope = s => 'SET session_replication_role = replica;\n' + s + '\nRESET ALL;\n';
    const contents = [roles, transformRestoreSchema(dumpBuffers[0].toString('utf8')).sql, '', envelope(dumpBuffers[1].toString('utf8')),
      dumpBuffers[2].toString('utf8'), envelope(dumpBuffers[3].toString('utf8'))];
    const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
    const artifacts = contents.map((text, i) => ({ name: names[i], sql: text, bytes: Buffer.byteLength(text), sha256: hash(text) }));
    phase = 'restore';
    const restored = await createRehearsalRestore({ execute: async a => {
      const output = sql(target, a.sql, true);
      return { exitCode: 0, signal: null, captureComplete: true, stdoutBytes: output.length, stderrBytes: 0, onErrorStop: true, transaction: true };
    }, readState: async () => JSON.parse(sql(target, readSql)) }).run({ artifacts, sourceState });
    phase = 'atomicity';
    let failed = false;
    try { sql(target, 'CREATE TABLE public.must_rollback(id integer); SELECT * FROM public.deliberately_missing;', true); }
    catch { failed = true; }
    if (!failed || sql(target, "SELECT to_regclass('public.must_rollback') IS NULL;").toString().trim() !== 't') reject();
    result = { status: 'SYNTHETIC_SIX_FILE_RESTORE_MATCH', transactions: restored.transactions, restoredState: restored.restoredState,
      sourceStateSha256: hash(JSON.stringify(sourceState)), imageSha256: image.slice(7), targetKind: 'isolated-local-postgres',
      snapshotDumpCount: 4, schemaVersion: 1, failedTransactionRollbackObserved: true, hostedCalls: 0, stageAuthority: false, gate: 'NO-GO',
      pending: ['isolated-local-supabase-cli-2.109.0', 'bridge-canonical-replay', 'native-nine-stage-authority'] };
  } catch { failure = Error('LOCAL_REHEARSAL_PROBE_REJECTED'); failure.phase = phase; }
  finally {
    let cleanup = true;
    // A timed-out docker run may have created its container before returning ID.
    // Recover only this run's exact planned names/label/image, never broad cleanup.
    try {
      const ids = invoke(['ps', '-a', '--filter', `label=com.comment_translator.gate1.synthetic=${run}`, '--format', '{{.ID}}', '--no-trunc'], undefined, 4096).toString().trim().split(/\r?\n/).filter(Boolean);
      for (const id of ids) {
        if (!/^[a-f0-9]{64}$/.test(id)) reject();
        const meta = JSON.parse(invoke(['inspect', '--format', '{{json .}}', id], undefined, 65536));
        if (!plannedNames.has(meta.Name?.slice(1)) || meta.Image !== image || meta.Config.Labels?.['com.comment_translator.gate1.synthetic'] !== run) reject();
        owned.set(id, image);
      }
    } catch { cleanup = false; }
    for (const id of owned.keys()) {
      try { assertOwned(id); invoke(['rm', '-f', id], undefined, 4096); } catch { cleanup = false; }
    }
    try { if (invoke(['ps', '-a', '--filter', `label=com.comment_translator.gate1.synthetic=${run}`, '--format', '{{.ID}}'], undefined, 4096).toString().trim()) cleanup = false; }
    catch { cleanup = false; }
    if (!cleanup) { failure = Error('LOCAL_REHEARSAL_CLEANUP_UNCONFIRMED'); failure.phase = 'cleanup'; }
    else if (result) result.remainingOwnedContainers = 0;
  }
  if (failure) throw failure;
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || process.argv[2] !== '--run-synthetic') { console.log('{"status":"LOCAL_REHEARSAL_NOT_REQUESTED"}'); process.exitCode = 2; }
  else { try { console.log(JSON.stringify(await runSyntheticRehearsal())); } catch (e) { console.log(JSON.stringify({ status: e.message, phase: e.phase })); process.exitCode = 1; } }
}
