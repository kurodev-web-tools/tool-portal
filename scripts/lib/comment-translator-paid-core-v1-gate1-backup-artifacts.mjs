import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';

const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const manifestName = 'backup-artifacts.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inside = (candidate, root) => {
  const relative = path.win32.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..\\') && relative !== '..' && !path.win32.isAbsolute(relative));
};
const fail = () => { throw new Error('BACKUP_PERSISTENCE_REJECTED'); };
const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
function resolveSafeRoot(directory) {
  if (process.platform !== 'win32' || typeof directory !== 'string' || !/^[A-Za-z]:[\\/]/.test(directory) ||
      /[:\x00-\x1f]/.test(directory.slice(2)) || directory.split(/[\\/]/).some(part => /[. ]$/.test(part))) fail();
  const root = path.resolve(directory);
  if ([repo, path.dirname(repo), process.cwd()].some(value => inside(root, value)) ||
      root.toLowerCase() === path.resolve(os.homedir()).toLowerCase() || root === path.parse(root).root) fail();
  return root;
}
// Fixed native probe; user-controlled paths travel only through strict UTF8 stdin.
const aclScript = String.raw`
$ErrorActionPreference='Stop'
try {
  $utf8=[Text.UTF8Encoding]::new($false,$true)
  [Console]::InputEncoding=$utf8;[Console]::OutputEncoding=$utf8;$OutputEncoding=$utf8
  $request=ConvertFrom-Json ([Console]::In.ReadToEnd())
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $allowed=@($sid,'S-1-5-18','S-1-5-32-544')
  $root=Get-Item -LiteralPath $request.root -Force
  if(-not $root.PSIsContainer){throw 'reject'}
  $current=$root
  while($null -ne $current){
    if(($current.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'reject'}
    $current=$current.Parent
  }
  $targets=@($root)
  if($request.file -ne ''){$targets+=Get-Item -LiteralPath $request.file -Force}
  foreach($item in $targets){
    if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'reject'}
    $acl=Get-Acl -LiteralPath $item.FullName
    if($item.FullName -eq $root.FullName -and -not $acl.AreAccessRulesProtected){throw 'reject'}
    $owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
    if($allowed -notcontains $owner){throw 'reject'}
    $full=$false
    foreach($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){
      if($rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or $allowed -notcontains $rule.IdentityReference.Value){throw 'reject'}
      if($rule.IdentityReference.Value -eq $sid -and ($rule.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0 -and
         ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl){$full=$true}
    }
    if(-not $full){throw 'reject'}
  }
  [Console]::Write('{"ok":true}')
} catch { [Console]::Write('{"ok":false}'); exit 2 }
`;

// A completion manifest attests only to persisted bytes. It is never a native
// backup execution receipt, trusted authority input, or recovery readiness proof.
export function createBackupArtifactStore({ fsApi = fs, spawnSyncImpl = spawnSync } = {}) {
  function verifyRepositoryBoundary(root) {
    const git = spawnSyncImpl('git', ['--no-optional-locks', '-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { shell: false, windowsHide: true, timeout: 10000, maxBuffer: 4096,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot } });
    if (git.error || git.signal || git.status !== 0 || !Buffer.isBuffer(git.stdout) || !Buffer.isBuffer(git.stderr) || git.stderr.length || git.stdout.length > 4096) fail();
    const common = new TextDecoder('utf-8', { fatal: true }).decode(git.stdout).trim();
    if (!/^[A-Za-z]:[\\/]/.test(common) || /[\x00-\x1f]/.test(common) || path.basename(common) !== '.git' || inside(root, path.dirname(common))) fail();
  }
  function probe(root, file = '') {
    if (process.platform !== 'win32' || !path.win32.isAbsolute(process.env.SystemRoot ?? '')) fail();
    const powershellHome = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0');
    const result = spawnSyncImpl(path.join(powershellHome, 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-Command', aclScript], { shell: false, windowsHide: true,
        env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot, PATH: powershellHome, PSModulePath: path.join(powershellHome, 'Modules') },
        input: Buffer.from(JSON.stringify({ root, file })), timeout: 10000, maxBuffer: 4096 });
    if (result.error || result.signal || result.status !== 0 || !Buffer.isBuffer(result.stdout) ||
        !Buffer.isBuffer(result.stderr) || result.stderr.length || result.stdout.length > 4096 ||
        result.stdout.toString('utf8') !== '{"ok":true}') fail();
  }
  function metadata(root, file) {
    probe(root, file);
    const stat = fsApi.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
        path.win32.resolve(fsApi.realpathSync(file)).toLowerCase() !== path.win32.resolve(file).toLowerCase()) fail();
    return stat;
  }
  function write(root, name, bytes) {
    const file = path.join(root, name);
    let fd;
    try {
      probe(root);
      fd = fsApi.openSync(file, 'wx');
      const created = metadata(root, file), opened = fsApi.fstatSync(fd);
      if (created.dev !== opened.dev || created.ino !== opened.ino || opened.size !== 0) fail();
      fsApi.writeFileSync(fd, bytes);
      fsApi.fsyncSync(fd);
      fsApi.closeSync(fd); fd = undefined;
      const before = metadata(root, file);
      const readback = fsApi.readFileSync(file);
      const after = metadata(root, file);
      if (before.dev !== created.dev || before.ino !== created.ino || after.dev !== before.dev || after.ino !== before.ino ||
          before.size !== bytes.length || after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
          after.ctimeMs !== before.ctimeMs || !Buffer.isBuffer(readback) || !readback.equals(bytes)) fail();
    } finally { if (fd !== undefined) { try { fsApi.closeSync(fd); } catch { /* failure remains terminal */ } } }
  }
  function readVerified(root, name, expectedBytes, expectedSha256, limit) {
    const file = path.join(root, name);
    let fd;
    try {
      const before = metadata(root, file);
      if (!Number.isSafeInteger(before.size) || before.size < 0 || before.size > limit ||
          (expectedBytes !== null && before.size !== expectedBytes)) fail();
      fd = fsApi.openSync(file, 'r');
      const opened = fsApi.fstatSync(fd);
      if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) fail();
      const bytes = fsApi.readFileSync(fd);
      const afterRead = fsApi.fstatSync(fd);
      fsApi.closeSync(fd); fd = undefined;
      const after = metadata(root, file);
      for (const field of ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs']) {
        if (before[field] !== opened[field] || before[field] !== afterRead[field] || before[field] !== after[field]) fail();
      }
      if (!Buffer.isBuffer(bytes) || bytes.length !== before.size || sha(bytes) !== expectedSha256) fail();
      return bytes;
    } finally { if (fd !== undefined) { try { fsApi.closeSync(fd); } catch { /* terminal failure */ } } }
  }
  return {
    inspect({ directory, expectedManifestSha256 } = {}) {
      try {
        if (typeof expectedManifestSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(expectedManifestSha256)) fail();
        const root = resolveSafeRoot(directory);
        verifyRepositoryBoundary(root);
        probe(root);
        const inventory = [...names, manifestName].sort().join(',');
        if (fsApi.readdirSync(root).sort().join(',') !== inventory) fail();
        const manifestBytes = readVerified(root, manifestName, null, expectedManifestSha256, 65536);
        const manifest = parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
        if (!exactKeys(manifest, ['schemaVersion', 'kind', 'acquisitionAuthority', 'artifacts']) || manifest.schemaVersion !== 1 ||
            manifest.kind !== 'backup-artifact-persistence' || manifest.acquisitionAuthority !== 'UNESTABLISHED' ||
            !Array.isArray(manifest.artifacts) || manifest.artifacts.length !== 6) fail();
        for (const [index, item] of manifest.artifacts.entries()) {
          if (!exactKeys(item, ['name', 'rawSha256', 'sha256', 'bytes']) || item.name !== names[index] ||
              typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) ||
              typeof item.rawSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.rawSha256) ||
              !Number.isSafeInteger(item.bytes) || item.bytes < (index === 2 ? 0 : 1) || item.bytes > 32 * 1024 * 1024) fail();
        }
        const artifacts = manifest.artifacts.map(item => {
          const bytes = readVerified(root, item.name, item.bytes, item.sha256, 32 * 1024 * 1024);
          const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          if (text.includes('\0')) fail();
          return { name: item.name, bytes: bytes.length, sha256: sha(bytes) };
        });
        // Recheck the pinned manifest and complete inventory after the bulk reads.
        readVerified(root, manifestName, manifestBytes.length, expectedManifestSha256, 65536);
        if (fsApi.readdirSync(root).sort().join(',') !== inventory) fail();
        return { status: 'PERSISTED_BYTES_VERIFIED', acquisitionAuthority: 'UNESTABLISHED',
          manifestSha256: expectedManifestSha256, artifacts, writes: 0, remoteCalls: 0 };
      } catch { throw new Error('BACKUP_OBSERVATION_REJECTED'); }
    },
    persist({ directory, artifacts } = {}) {
      try {
        const root = resolveSafeRoot(directory);
        if (!Array.isArray(artifacts) || artifacts.length !== names.length) fail();
        const entries = artifacts.map((item, index) => {
          if (!item || Object.keys(item).sort().join(',') !== 'bytes,name,rawSha256,sha256,sql' || item.name !== names[index] ||
              typeof item.sql !== 'string' || item.sql.includes('\0') || !Number.isSafeInteger(item.bytes) || item.bytes < 0 || item.bytes > 32 * 1024 * 1024 ||
              !/^[a-f0-9]{64}$/.test(item.rawSha256 ?? '') || !/^[a-f0-9]{64}$/.test(item.sha256 ?? '')) fail();
          const bytes = Buffer.from(item.sql, 'utf8');
          if (bytes.length !== item.bytes || bytes.toString('utf8') !== item.sql || sha(bytes) !== item.sha256 || (index !== 2 && bytes.length === 0)) fail();
          return { bytes, reference: { name: item.name, rawSha256: item.rawSha256, sha256: item.sha256, bytes: item.bytes } };
        });
        // A linked worktree must also exclude its primary checkout. Derive that
        // location from native Git, never from caller-provided path allowances.
        verifyRepositoryBoundary(root);
        probe(root);
        if (fsApi.readdirSync(root).length !== 0) fail();
        for (const entry of entries) write(root, entry.reference.name, entry.bytes);
        if (fsApi.readdirSync(root).sort().join(',') !== [...names].sort().join(',')) fail();
        for (const entry of entries) {
          const file = path.join(root, entry.reference.name);
          if (metadata(root, file).size !== entry.bytes.length || !fsApi.readFileSync(file).equals(entry.bytes)) fail();
        }
        const manifest = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'backup-artifact-persistence',
          acquisitionAuthority: 'UNESTABLISHED', artifacts: entries.map(x => x.reference) }) + '\n');
        write(root, manifestName, manifest);
        probe(root);
        if (fsApi.readdirSync(root).sort().join(',') !== [...names, manifestName].sort().join(',')) fail();
        return { status: 'PERSISTED_AUTHORITY_UNESTABLISHED', artifactCount: 6, manifestSha256: sha(manifest), manifestBytes: manifest.length };
      } catch { fail(); }
    },
  };
}

// Native read-only public collector: no caller-supplied filesystem/process seam.
export function inspectBackupArtifacts({ directory, expectedManifestSha256 } = {}) {
  return createBackupArtifactStore().inspect({ directory, expectedManifestSha256 });
}
