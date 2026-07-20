import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { EN_POST_COPY } from "../src/content.ts";
import { assertProvenanceUnchanged, withExclusiveBuildLock } from "./artifact-promotion.mjs";
import { normalizePixelFormat, readProvenance } from "./build-ja-artifacts.mjs";
import { EN_COMPOSITION_ID, REVIEW_OUTPUTS, renderReviewStills } from "./render-review-stills.mjs";
import { verifyJaPreservation } from "./verify-ja-preservation.mjs";
import { verifyRender } from "./verify-ja-render.mjs";

const execFileAsync = promisify(execFile);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const MP4_NAME = "viewer-engagement-prompt-board-launch-en.mp4";
const REMOTION_CLI = join(PACKAGE_ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");

export const EN_ARTIFACT_MANIFEST_PATHS = Object.freeze([
  MP4_NAME,
  ...REVIEW_OUTPUTS,
  "post.txt",
  "verification.json",
  "ja-preservation-verification.json",
]);

export class EnglishArtifactBuildError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "EnglishArtifactBuildError";
  }
}

const execute = async (file, args) => {
  try {
    return await execFileAsync(file, args, {
      cwd: PACKAGE_ROOT,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (cause) {
    throw new EnglishArtifactBuildError(`Command failed: ${file}`, { cause });
  }
};

const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

const renderMp4 = async (outputPath) => {
  await execute(process.execPath, [
    REMOTION_CLI,
    "render",
    "src/index.ts",
    EN_COMPOSITION_ID,
    outputPath,
    "--codec=h264",
    "--crf=18",
    "--pixel-format=yuv420p",
    "--color-space=bt709",
    "--muted",
    "--concurrency=1",
    "--gl=swiftshader",
    "--overwrite",
    "--timeout=60000",
    "--log=error",
  ]);
};

const writeManifest = async (outputRoot) => {
  const lines = await Promise.all(
    EN_ARTIFACT_MANIFEST_PATHS.map(
      async (path) => `${await sha256(join(outputRoot, path))}  ${path.replaceAll("\\", "/")}`,
    ),
  );
  await writeFile(join(outputRoot, "manifest.sha256"), `${lines.join("\n")}\n`, "utf8");
};

const promoteEnglishDirectory = async ({ temporaryRoot, finalRoot, backupRoot, provenance }) => {
  await rm(backupRoot, { recursive: true, force: true });
  const current = await readProvenance();
  assertProvenanceUnchanged(provenance, current);
  let finalMoved = false;
  try {
    try {
      await rename(finalRoot, backupRoot);
      finalMoved = true;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
    }
    await rename(temporaryRoot, finalRoot);
  } catch (cause) {
    if (finalMoved) await rename(backupRoot, finalRoot);
    throw new EnglishArtifactBuildError("English artifact promotion failed", { cause });
  }
  if (finalMoved) await rm(backupRoot, { recursive: true });
};

export const buildEnArtifacts = async () => {
  const outRoot = join(PACKAGE_ROOT, "out");
  const temporaryRoot = join(outRoot, ".tmp", "en");
  const finalRoot = join(outRoot, "en");
  const backupRoot = join(outRoot, ".tmp", "en-promotion-backup");
  const lockPath = join(outRoot, ".tmp", "en-artifact-build.lock");
  return withExclusiveBuildLock({
    lockPath,
    run: async () => {
      const provenance = await readProvenance();
      await rm(temporaryRoot, { recursive: true, force: true });
      await mkdir(temporaryRoot, { recursive: true });
      await verifyJaPreservation({ outputRoot: temporaryRoot, provenance });
      await renderReviewStills({ outputRoot: temporaryRoot, compositionId: EN_COMPOSITION_ID });
      const videoPath = join(temporaryRoot, MP4_NAME);
      await renderMp4(videoPath);
      await normalizePixelFormat(videoPath);
      await verifyRender({
        outputRoot: temporaryRoot,
        ...provenance,
        compositionId: EN_COMPOSITION_ID,
        mp4Name: MP4_NAME,
      });
      await writeFile(join(temporaryRoot, "post.txt"), `${EN_POST_COPY}\n`, "utf8");
      await writeManifest(temporaryRoot);
      await promoteEnglishDirectory({ temporaryRoot, finalRoot, backupRoot, provenance });
      return { ...provenance, outputRoot: relative(REPO_ROOT, finalRoot).replaceAll(sep, "/") };
    },
  });
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  buildEnArtifacts()
    .then(console.log)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Unknown English artifact build failure");
      process.exitCode = 1;
    });
}
