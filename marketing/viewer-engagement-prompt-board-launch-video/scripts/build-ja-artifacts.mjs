import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { JA_POST_COPY } from "../src/content.ts";
import { promoteArtifactDirectory, withExclusiveBuildLock } from "./artifact-promotion.mjs";
import { REVIEW_OUTPUTS, renderReviewStills } from "./render-review-stills.mjs";
import { needsNormalization, probeVideo, verifyJaRender } from "./verify-ja-render.mjs";

const execFileAsync = promisify(execFile);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const PACKAGE_PATHSPEC = "marketing/viewer-engagement-prompt-board-launch-video";
const SPEC_PATHSPEC =
  "docs/superpowers/specs/2026-07-19-viewer-engagement-prompt-board-x-promo-video-design.md";
const COMPOSITION_ID = "ViewerEngagementPromptBoardLaunchJa";
const MP4_NAME = "viewer-engagement-prompt-board-launch-ja.mp4";
const REMOTION_CLI = join(PACKAGE_ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
const FFMPEG = join(PACKAGE_ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");

export const ARTIFACT_MANIFEST_PATHS = Object.freeze([
  MP4_NAME,
  ...REVIEW_OUTPUTS,
  "post.txt",
  "verification.json",
]);

export class ArtifactBuildError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ArtifactBuildError";
  }
}

const execute = async (file, args, cwd = PACKAGE_ROOT) => {
  try {
    return await execFileAsync(file, args, { cwd, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  } catch (cause) {
    throw new ArtifactBuildError(`Command failed: ${file}`, { cause });
  }
};

export const assertArtifactSourceClean = (status) => {
  if (status.trim() !== "")
    throw new ArtifactBuildError("Artifact source is dirty; commit package/spec changes first");
};

export const readProvenance = async () => {
  const status = await execute(
    "git",
    ["status", "--porcelain", "--", PACKAGE_PATHSPEC, SPEC_PATHSPEC],
    REPO_ROOT,
  );
  assertArtifactSourceClean(status.stdout);
  const head = await execute("git", ["rev-parse", "HEAD"], REPO_ROOT);
  const tree = await execute("git", ["rev-parse", "HEAD^{tree}"], REPO_ROOT);
  return { sourceCommit: head.stdout.trim(), sourceTree: tree.stdout.trim(), clean: true };
};

const ensureApprovalAbsent = async (finalRoot) => {
  try {
    await access(join(finalRoot, "approval.json"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw new ArtifactBuildError("Unable to inspect approval.json", { cause: error });
  }
  throw new ArtifactBuildError("Refusing to build while out/ja/approval.json exists");
};

export const assertApprovalExcluded = (artifactPaths) => {
  if (artifactPaths.includes("approval.json")) {
    throw new ArtifactBuildError("Stage A artifacts must exclude approval.json");
  }
};

const renderMp4 = async (outputPath) => {
  await execute(process.execPath, [
    REMOTION_CLI,
    "render",
    "src/index.ts",
    COMPOSITION_ID,
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

export const normalizePixelFormat = async (videoPath) => {
  const probe = await probeVideo(videoPath);
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  if (!needsNormalization(video)) return;
  const normalized = `${videoPath}.normalized.mp4`;
  await execute(FFMPEG, [
    "-y",
    "-v",
    "error",
    "-i",
    videoPath,
    "-vf",
    "scale=in_range=auto:out_range=tv,format=yuv420p",
    "-c:v",
    "libx264",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_range",
    "tv",
    "-x264-params",
    "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
    "-an",
    normalized,
  ]);
  await rm(videoPath);
  await rename(normalized, videoPath);
  const normalizedProbe = await probeVideo(videoPath);
  const normalizedVideo = normalizedProbe.streams?.find((stream) => stream.codec_type === "video");
  if (needsNormalization(normalizedVideo)) {
    throw new ArtifactBuildError("Bundled ffmpeg normalization did not produce exact yuv420p bt709 metadata");
  }
};

const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

export const createManifestLines = async (artifactPaths, hashForPath) => {
  assertApprovalExcluded(artifactPaths);
  return Promise.all(
    artifactPaths.map(
      async (relativePath) => `${await hashForPath(relativePath)}  ${relativePath.replaceAll("\\", "/")}`,
    ),
  );
};

export const writeManifest = async (outputRoot) => {
  const lines = await createManifestLines(ARTIFACT_MANIFEST_PATHS, (relativePath) =>
    sha256(join(outputRoot, relativePath)),
  );
  await writeFile(join(outputRoot, "manifest.sha256"), `${lines.join("\n")}\n`, "utf8");
};

export const buildJaArtifacts = async () => {
  const outRoot = join(PACKAGE_ROOT, "out");
  const temporaryRoot = join(outRoot, ".tmp", "ja");
  const finalRoot = join(outRoot, "ja");
  const candidateRoot = join(outRoot, ".tmp", "ja-promotion-candidate");
  const backupRoot = join(outRoot, ".tmp", "ja-promotion-backup");
  const lockPath = join(outRoot, ".tmp", "ja-artifact-build.lock");
  return withExclusiveBuildLock({
    lockPath,
    run: async () => {
      await ensureApprovalAbsent(finalRoot);
      assertApprovalExcluded(ARTIFACT_MANIFEST_PATHS);
      const provenance = await readProvenance();
      await rm(temporaryRoot, { recursive: true, force: true });
      await mkdir(temporaryRoot, { recursive: true });
      await renderReviewStills({ outputRoot: temporaryRoot });
      const videoPath = join(temporaryRoot, MP4_NAME);
      await renderMp4(videoPath);
      await normalizePixelFormat(videoPath);
      await verifyJaRender({ outputRoot: temporaryRoot, ...provenance });
      await writeFile(join(temporaryRoot, "post.txt"), `${JA_POST_COPY}\n`, "utf8");
      await writeManifest(temporaryRoot);
      await ensureApprovalAbsent(finalRoot);
      await promoteArtifactDirectory({
        outRoot,
        temporaryArtifactRoot: temporaryRoot,
        finalRoot,
        candidateRoot,
        backupRoot,
        ownedPaths: [...ARTIFACT_MANIFEST_PATHS, "manifest.sha256"],
        capturedProvenance: provenance,
        readProvenance,
      });
      await rm(temporaryRoot, { recursive: true, force: true });
      return { ...provenance, outputRoot: relative(REPO_ROOT, finalRoot).replaceAll(sep, "/") };
    },
  });
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  buildJaArtifacts()
    .then(console.log)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Unknown artifact build failure");
      process.exitCode = 1;
    });
}
