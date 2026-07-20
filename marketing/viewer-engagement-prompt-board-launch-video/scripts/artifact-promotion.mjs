import { cp, mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export class ArtifactPromotionError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ArtifactPromotionError";
  }
}

const pathExists = async (path) => {
  try {
    const handle = await open(path, "r");
    await handle.close();
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    if (error && typeof error === "object" && "code" in error && error.code === "EISDIR") return true;
    throw new ArtifactPromotionError(`Unable to inspect path: ${path}`, { cause: error });
  }
};

const assertInside = (parent, child, label) => {
  const normalizedParent = resolve(parent);
  const normalizedChild = resolve(child);
  const pathFromParent = relative(normalizedParent, normalizedChild);
  if (pathFromParent === "" || pathFromParent.startsWith("..") || isAbsolute(pathFromParent)) {
    throw new ArtifactPromotionError(`${label} must resolve inside ${normalizedParent}`);
  }
};

const assertPromotionPaths = ({ outRoot, temporaryArtifactRoot, finalRoot, candidateRoot, backupRoot }) => {
  const expectedFinal = resolve(outRoot, "ja");
  if (resolve(finalRoot) !== expectedFinal) {
    throw new ArtifactPromotionError(`Final path must be exactly ${expectedFinal}`);
  }
  const temporaryRoot = resolve(outRoot, ".tmp");
  assertInside(temporaryRoot, temporaryArtifactRoot, "Rendered artifact path");
  assertInside(temporaryRoot, candidateRoot, "Promotion candidate path");
  assertInside(temporaryRoot, backupRoot, "Promotion backup path");
  if (new Set([resolve(temporaryArtifactRoot), resolve(candidateRoot), resolve(backupRoot)]).size !== 3) {
    throw new ArtifactPromotionError("Rendered, candidate, and backup paths must be distinct");
  }
};

export const assertProvenanceUnchanged = (captured, current) => {
  if (
    captured.clean !== true ||
    current.clean !== true ||
    captured.sourceCommit !== current.sourceCommit ||
    captured.sourceTree !== current.sourceTree
  ) {
    throw new ArtifactPromotionError("Artifact source provenance changed during render");
  }
};

const assertApprovalAbsent = async (root, label) => {
  if (await pathExists(join(root, "approval.json"))) {
    throw new ArtifactPromotionError(`${label}/approval.json exists; refusing Stage A promotion`);
  }
};

export const withExclusiveBuildLock = async ({ lockPath, run }) => {
  await mkdir(dirname(lockPath), { recursive: true });
  let handle;
  try {
    handle = await open(lockPath, "wx");
  } catch (cause) {
    const detail =
      cause && typeof cause === "object" && "code" in cause && cause.code === "EEXIST"
        ? "is already present"
        : "could not be created";
    throw new ArtifactPromotionError(`Artifact build lock ${detail}: ${lockPath}`, { cause });
  }
  try {
    return await run();
  } finally {
    try {
      await handle.close();
    } finally {
      await rm(lockPath);
    }
  }
};

const rollbackSwap = async ({ finalRoot, candidateRoot, backupRoot, finalMoved, candidateInstalled }) => {
  if (candidateInstalled) await rename(finalRoot, candidateRoot);
  if (finalMoved) await rename(backupRoot, finalRoot);
  if ((await pathExists(candidateRoot)) && !(await pathExists(join(candidateRoot, "approval.json")))) {
    await rm(candidateRoot, { recursive: true });
  }
};

export const promoteArtifactDirectory = async ({
  outRoot,
  temporaryArtifactRoot,
  finalRoot,
  candidateRoot,
  backupRoot,
  ownedPaths,
  capturedProvenance,
  readProvenance,
  injectFailure = async () => {},
}) => {
  assertPromotionPaths({ outRoot, temporaryArtifactRoot, finalRoot, candidateRoot, backupRoot });
  if (await pathExists(candidateRoot))
    throw new ArtifactPromotionError(`Stale candidate path: ${candidateRoot}`);
  if (await pathExists(backupRoot)) throw new ArtifactPromotionError(`Stale backup path: ${backupRoot}`);
  await assertApprovalAbsent(finalRoot, "Final artifact directory");
  assertProvenanceUnchanged(capturedProvenance, await readProvenance());

  let candidateCreated = false;
  let finalMoved = false;
  let candidateInstalled = false;
  try {
    candidateCreated = true;
    if (await pathExists(finalRoot)) {
      await cp(finalRoot, candidateRoot, { recursive: true, errorOnExist: true, force: false });
    } else {
      await mkdir(candidateRoot, { recursive: false });
    }
    for (const ownedPath of ownedPaths) {
      const source = join(temporaryArtifactRoot, ownedPath);
      const destination = join(candidateRoot, ownedPath);
      assertInside(temporaryArtifactRoot, source, "Owned source path");
      assertInside(candidateRoot, destination, "Owned destination path");
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination, { force: true });
    }
    await assertApprovalAbsent(candidateRoot, "Candidate artifact directory");
    await injectFailure("before-final-approval-recheck");
    await assertApprovalAbsent(finalRoot, "Final artifact directory");
    assertProvenanceUnchanged(capturedProvenance, await readProvenance());

    if (await pathExists(finalRoot)) {
      await rename(finalRoot, backupRoot);
      finalMoved = true;
      await assertApprovalAbsent(backupRoot, "Backup artifact directory");
      await injectFailure("after-backup-rename");
    }
    await rename(candidateRoot, finalRoot);
    candidateInstalled = true;
    await injectFailure("after-candidate-rename");
    await assertApprovalAbsent(finalRoot, "Promoted artifact directory");
    if (finalMoved) await assertApprovalAbsent(backupRoot, "Backup artifact directory");
    assertProvenanceUnchanged(capturedProvenance, await readProvenance());
    await injectFailure("before-backup-delete");
    if (finalMoved) await rm(backupRoot, { recursive: true });
  } catch (cause) {
    try {
      await rollbackSwap({ finalRoot, candidateRoot, backupRoot, finalMoved, candidateInstalled });
    } catch (rollbackCause) {
      throw new ArtifactPromotionError("Artifact promotion failed and rollback failed", {
        cause: new AggregateError([cause, rollbackCause]),
      });
    }
    if (candidateCreated && (await pathExists(candidateRoot))) {
      throw new ArtifactPromotionError("Artifact promotion failed; candidate retained to preserve approval", {
        cause,
      });
    }
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    throw new ArtifactPromotionError(`Artifact promotion failed; original final restored${detail}`, {
      cause,
    });
  }
};
