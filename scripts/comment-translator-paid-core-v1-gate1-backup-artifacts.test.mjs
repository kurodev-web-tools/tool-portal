import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createBackupArtifactStore } from './lib/comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';

const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const sha = text => createHash('sha256').update(text).digest('hex');
const input = () => ({ directory: 'Z:/gate1-synthetic-store', artifacts: names.map((name, i) => {
  const sql = i === 2 ? '' : `-- 日本語 😀 ${i}\n`;
  return { name, sql, sha256: sha(sql), rawSha256: sha(sql), bytes: Buffer.byteLength(sql) };
}) });
function fixture(options = {}) {
  const files = new Map(), handles = new Map(), calls = [], writes = [], probes = [];
  let next = 1;
  const stat = file => ({ isFile: () => true, isSymbolicLink: () => !!options.symlink, nlink: options.links ?? 1,
    dev: 1, ino: files.get(file).id, size: files.get(file).data.length, mtimeMs: 1, ctimeMs: 1 });
  const fsApi = {
    readdirSync() { return options.nonempty ? ['foreign'] : [...files.keys()].map(x => path.basename(x)); },
    lstatSync(file) { calls.push('stat'); return stat(file); },
    realpathSync(file) { return file; },
    openSync(file, flags) {
      if (flags === 'r') { assert.ok(files.has(file)); const fd = next++; handles.set(fd, file); return fd; }
      assert.equal(flags, 'wx'); calls.push('open');
      if (files.has(file) || (options.failOpen && files.size === 2)) throw Error('private-native-error');
      const id = next++; files.set(file, { id, data: Buffer.alloc(0) }); handles.set(id, file); return id;
    },
    fstatSync(fd) { return stat(handles.get(fd)); },
    writeFileSync(fd, data) {
      calls.push('write'); writes.push(path.basename(handles.get(fd)));
      assert.ok(Buffer.isBuffer(data)); files.get(handles.get(fd)).data = Buffer.from(data);
    },
    fsyncSync() { calls.push('fsync'); if (options.fsyncFailure) throw Error('private-native-error'); },
    closeSync(fd) { handles.delete(fd); },
    readFileSync(fileOrFd) {
      const file = typeof fileOrFd === 'number' ? handles.get(fileOrFd) : fileOrFd;
      calls.push('read');
      if (options.replaceDuringRead && typeof fileOrFd === 'number') files.get(file).id++;
      return options.corrupt ? Buffer.from('wrong') : Buffer.from(files.get(file).data);
    },
  };
  const store = createBackupArtifactStore({ fsApi, spawnSyncImpl(command, args, config) {
    if (command === 'git') {
      assert.ok(args.includes('--git-common-dir')); assert.equal(config.shell, false);
      return { status: 0, signal: null, stdout: Buffer.from('Z:/primary/.git\n'), stderr: Buffer.alloc(0) };
    }
    probes.push({ command, args, config });
    assert.equal(config.shell, false); assert.equal(config.timeout, 10000);
    assert.deepEqual(Object.keys(config.env).sort(), ['PATH', 'PSModulePath', 'SystemRoot', 'WINDIR']);
    assert.equal(config.env.PSModulePath, path.join(path.dirname(command), 'Modules'));
    assert.ok(Buffer.isBuffer(config.input));
    return { status: options.aclFailure ? 2 : 0, signal: null,
      stdout: Buffer.from(options.aclFailure ? '{"ok":false}' : '{"ok":true}'), stderr: Buffer.alloc(0) };
  } });
  return { store, files, handles, calls, writes, probes };
}
test('exact six UTF8 artifacts are exclusively saved, flushed/read back; manifest is last', () => {
  const f = fixture(), result = f.store.persist(input());
  assert.equal(result.status, 'PERSISTED_AUTHORITY_UNESTABLISHED'); assert.equal(result.artifactCount, 6);
  assert.deepEqual(f.writes, [...names, 'backup-artifacts.json']); assert.equal(f.handles.size, 0);
  const manifestBytes = [...f.files.values()].at(-1).data;
  assert.equal(result.manifestSha256, sha(manifestBytes));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.acquisitionAuthority, 'UNESTABLISHED');
  assert.equal(f.calls.filter(x => x === 'fsync').length, 7);
  assert.ok(f.probes.length > 7);
});
test('paths and malformed/mismatched artifacts reject before any filesystem or native operation', () => {
  for (const mutate of [i => { i.directory = process.cwd(); }, i => { i.directory = 'relative'; },
    i => { i.directory = 'C:/'; }, i => { i.directory = '\\\\host\\share'; }, i => { i.directory = 'Z:/dir/file:stream'; },
    i => { i.directory = 'Z:/dir/trailing.'; }, i => { i.artifacts[0].sha256 = '0'.repeat(64); },
    i => { i.artifacts[0].name = '../escape'; }, i => { i.artifacts[0].sql = '\ud800'; },
    i => { i.artifacts[0].bytes = 32 * 1024 * 1024 + 1; }, i => { i.artifacts.reverse(); }]) {
    const f = fixture(), i = input(); mutate(i);
    assert.throws(() => f.store.persist(i), /^Error: BACKUP_PERSISTENCE_REJECTED$/);
    assert.equal(f.calls.length, 0); assert.equal(f.probes.length, 0);
  }
});
test('ACL and nonempty directory refusal cannot create a file', () => {
  for (const options of [{ aclFailure: true }, { nonempty: true }]) {
    const f = fixture(options);
    assert.throws(() => f.store.persist(input()), /BACKUP_PERSISTENCE_REJECTED/);
    assert.equal(f.files.size, 0);
  }
});
test('reparse/hardlink refusal occurs before sensitive bytes are written', () => {
  for (const options of [{ symlink: true }, { links: 2 }]) {
    const f = fixture(options);
    assert.throws(() => f.store.persist(input()), /BACKUP_PERSISTENCE_REJECTED/);
    assert.equal(f.writes.length, 0); assert.equal(f.handles.size, 0);
  }
});
test('partial open, flush and readback failure retains files without completion manifest', () => {
  for (const options of [{ failOpen: true }, { fsyncFailure: true }, { corrupt: true }]) {
    const f = fixture(options);
    assert.throws(() => f.store.persist(input()), /^Error: BACKUP_PERSISTENCE_REJECTED$/);
    assert.ok(f.files.size > 0); assert.equal(f.handles.size, 0);
    assert.ok(!f.writes.includes('backup-artifacts.json'));
  }
});
test('same destination cannot overwrite an existing successful set', () => {
  const f = fixture(); f.store.persist(input()); const before = f.writes.length;
  assert.throws(() => f.store.persist(input()), /BACKUP_PERSISTENCE_REJECTED/);
  assert.equal(f.writes.length, before);
});
test('primary checkout is excluded even from a different worktree', () => {
  const f = fixture();
  assert.throws(() => f.store.persist({ ...input(), directory: 'Z:/primary/.tmp/backups' }), /BACKUP_PERSISTENCE_REJECTED/);
  assert.equal(f.files.size, 0); assert.equal(f.probes.length, 0);
});
test('observation independently reads six hashes with no SQL/raw-hash authority or writes', () => {
  const f = fixture(), saved = f.store.persist(input()), written = f.writes.length;
  const result = f.store.inspect({ directory: input().directory, expectedManifestSha256: saved.manifestSha256 });
  assert.equal(result.status, 'PERSISTED_BYTES_VERIFIED'); assert.equal(result.acquisitionAuthority, 'UNESTABLISHED');
  assert.equal(result.writes, 0); assert.equal(f.writes.length, written); assert.equal(f.handles.size, 0);
  assert.deepEqual(result.artifacts, input().artifacts.map(({name,bytes,sha256}) => ({name,bytes,sha256})));
  assert.ok(!JSON.stringify(result).includes('日本語')); assert.ok(!JSON.stringify(result).includes('rawSha256'));
});
test('observation rejects missing expected digest, corrupt data and missing/extra entries', () => {
  const empty = fixture();
  assert.throws(() => empty.store.inspect({directory: input().directory}), /BACKUP_OBSERVATION_REJECTED/);
  assert.equal(empty.calls.length, 0); assert.equal(empty.probes.length, 0);
  for (const failure of ['hash', 'data', 'missing', 'extra']) {
    const f = fixture(), saved = f.store.persist(input());
    if (failure === 'data') f.files.get(path.join(input().directory, 'data.sql')).data = Buffer.from('tampered');
    if (failure === 'missing') f.files.delete(path.join(input().directory, 'data.sql'));
    if (failure === 'extra') f.files.set(path.join(input().directory, 'foreign'), {id:100,data:Buffer.alloc(0)});
    const before = f.writes.length;
    assert.throws(() => f.store.inspect({directory: input().directory, expectedManifestSha256: failure === 'hash' ? '0'.repeat(64) : saved.manifestSha256}), /BACKUP_OBSERVATION_REJECTED/);
    assert.equal(f.writes.length, before); assert.equal(f.handles.size, 0);
  }
});
test('even a hash-pinned manifest cannot change schema, order, names, bounds or add authority', () => {
  for (const mutate of [m => {m.artifacts.reverse();}, m => {m.artifacts[0].name='../escape';},
    m => {m.artifacts[0].bytes=33554433;}, m => {m.artifacts[0].bytes=-1;}, m => {m.extra=true;},
    m => {m.acquisitionAuthority='TRUSTED';}, m => {m.artifacts[0].sha256=42;}]) {
    const f = fixture(); f.store.persist(input());
    const file = f.files.get(path.join(input().directory, 'backup-artifacts.json'));
    const manifest = JSON.parse(file.data); mutate(manifest); file.data = Buffer.from(JSON.stringify(manifest));
    assert.throws(() => f.store.inspect({directory: input().directory, expectedManifestSha256: sha(file.data)}), /BACKUP_OBSERVATION_REJECTED/);
    assert.equal(f.handles.size, 0);
  }
});
test('observation rechecks ACL, reparse, hardlinks and native handle identity', () => {
  for (const option of ['aclFailure', 'symlink', 'links', 'replaceDuringRead']) {
    const options = {}, f = fixture(options), saved = f.store.persist(input());
    options[option] = option === 'links' ? 2 : true;
    assert.throws(() => f.store.inspect({directory: input().directory, expectedManifestSha256: saved.manifestSha256}), /BACKUP_OBSERVATION_REJECTED/);
    assert.equal(f.handles.size, 0);
  }
});


test('acquisition record uses a separate exclusive flushed and hash-verified file', () => {
  const f = fixture(), directory = 'Z:/gate1-synthetic-receipt';
  assert.equal(f.store.prepareDirectory({ directory }).status, 'EMPTY_RESTRICTED_DIRECTORY_VERIFIED');
  assert.equal(f.files.size, 0);
  const record = { schemaVersion: 1, kind: 'backup-acquisition-observation', runId: 'a'.repeat(64) };
  const saved = f.store.persistRecord({ directory, record });
  assert.equal(saved.status, 'PERSISTED_RECORD_VERIFIED');
  assert.deepEqual(f.writes, ['backup-acquisition.json']);
  assert.equal(f.calls.filter(x => x === 'fsync').length, 1);
  const readback = f.store.inspectRecord({ directory, expectedSha256: saved.sha256 });
  assert.deepEqual(JSON.parse(JSON.stringify(readback.record)), record); assert.equal(readback.sha256, saved.sha256);
  assert.throws(() => f.store.persistRecord({ directory, record }), /BACKUP_PERSISTENCE_REJECTED/);
  assert.throws(() => f.store.inspectRecord({ directory, expectedSha256: '0'.repeat(64) }), /BACKUP_OBSERVATION_REJECTED/);
  assert.equal(f.handles.size, 0);
});

test('record storage rejects unsafe directories, nonempty roots, oversized records and failed flushes', () => {
  for (const options of [{ aclFailure: true }, { nonempty: true }, { fsyncFailure: true }, { corrupt: true }]) {
    const f = fixture(options);
    assert.throws(() => f.store.persistRecord({ directory: 'Z:/gate1-synthetic-receipt', record: { value: 1 } }), /BACKUP_PERSISTENCE_REJECTED/);
    assert.equal(f.handles.size, 0);
  }
  const f = fixture();
  assert.throws(() => f.store.persistRecord({ directory: 'relative', record: {} }), /BACKUP_PERSISTENCE_REJECTED/);
  assert.throws(() => f.store.persistRecord({ directory: 'Z:/gate1-synthetic-receipt', record: { value: 'x'.repeat(65536) } }), /BACKUP_PERSISTENCE_REJECTED/);
  assert.equal(f.files.size, 0);
});

test('outer process record has an explicit fixed filename; arbitrary filenames reject', () => {
  const directory = 'Z:/gate1-synthetic-process-receipt', f = fixture();
  assert.throws(() => f.store.persistRecord({ directory, name: '../unsafe', record: {} }), /BACKUP_PERSISTENCE_REJECTED/);
  assert.equal(f.files.size, 0);
  const result = f.store.persistRecord({ directory, name: 'backup-process.json', record: { kind: 'backup-native-process-observation' } });
  assert.deepEqual(f.writes, ['backup-process.json']);
  const observed = f.store.inspectRecord({ directory, name: 'backup-process.json', expectedSha256: result.sha256 });
  assert.equal(observed.record.kind, 'backup-native-process-observation');
});
