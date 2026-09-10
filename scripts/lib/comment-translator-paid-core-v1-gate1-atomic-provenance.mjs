import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { BACKUP_ACQUISITION_PRODUCERS } from './comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const hash = x => createHash('sha256').update(x).digest('hex');
const reject = () => { throw Error('ATOMIC_PROVENANCE_REJECTED'); };
export const ATOMIC_EXECUTOR_FILES = Object.freeze([...BACKUP_ACQUISITION_PRODUCERS,
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-provenance.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-attempt-ledger.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-retained.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-postgres-process.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-atomic-sequence.mjs',
]);

// Internal test seam. Operational entry below owns filesystem/Git observations.
export function createAtomicSourceVerifier({ readBlob, readCurrent, published }) {
  const loaded = new Map(ATOMIC_EXECUTOR_FILES.map(p => [p, Buffer.from(readCurrent(p))]));
  return ({ captureCommit, executorCommit, producerFiles }) => {
    try {
      if (![captureCommit, executorCommit].every(c => typeof c === 'string' && /^[a-f0-9]{40}$/.test(c)) ||
          published(captureCommit, executorCommit) !== true || !Array.isArray(producerFiles) ||
          producerFiles.length !== BACKUP_ACQUISITION_PRODUCERS.length) reject();
      producerFiles.forEach((f, i) => {
        if (!f || Object.keys(f).sort().join(',') !== 'path,sha256' || f.path !== BACKUP_ACQUISITION_PRODUCERS[i] ||
            !/^[a-f0-9]{64}$/.test(f.sha256) || hash(readBlob(captureCommit, f.path)) !== f.sha256) reject();
      });
      const executorFiles = ATOMIC_EXECUTOR_FILES.map(p => {
        const blob = readBlob(executorCommit, p);
        if (!Buffer.isBuffer(blob) || !blob.equals(loaded.get(p)) || !blob.equals(readCurrent(p))) reject();
        return { path: p, sha256: hash(blob) };
      });
      return { captureCommit, executorCommit, captureProducerCount: producerFiles.length, executorFiles };
    } catch { reject(); }
  };
}

function readCurrent(p) {
  const file = path.join(root, p), stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) reject();
  return fs.readFileSync(file);
}
const loaded = new Map(ATOMIC_EXECUTOR_FILES.map(p => {
  try { return [p, readCurrent(p)]; } catch { return [p, null]; }
}));
function git(args) {
  const r = spawnSync('git', ['--no-replace-objects', '--no-optional-locks', ...args], {
    cwd: root, shell: false, windowsHide: true, timeout: 5000, maxBuffer: 4 * 1024 * 1024,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot },
  });
  if (r.error || r.signal || r.status !== 0 || !Buffer.isBuffer(r.stdout) || r.stderr?.length) reject();
  return r.stdout;
}
export function verifyAtomicSourceBinding(request) {
  try {
    // Replacements, grafts and shallow ancestry cannot establish publication.
    if (git(['rev-parse', '--is-shallow-repository']).toString().trim() !== 'false' ||
        git(['for-each-ref', '--format=%(refname)', 'refs/replace']).length) reject();
    const graft = git(['rev-parse', '--git-path', 'info/grafts']).toString().trim();
    if (fs.existsSync(path.resolve(root, graft))) reject();
    const verify = createAtomicSourceVerifier({ readCurrent: p => {
      const bytes = readCurrent(p); if (!loaded.get(p)?.equals(bytes)) reject(); return bytes;
    }, readBlob: (c, p) => git(['show', `${c}:${p}`]), published: (capture, executor) => {
      if (git(['rev-parse', 'HEAD']).toString().trim() !== executor) return false;
      git(['merge-base', '--is-ancestor', capture, executor]);
      git(['merge-base', '--is-ancestor', executor, 'refs/remotes/origin/codex/comment-translator-paid-v1-preview']);
      return true;
    } });
    return verify(request);
  } catch { reject(); }
}
