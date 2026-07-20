import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertProvenanceUnchanged } from "./artifact-promotion.mjs";
import { readProvenance } from "./build-ja-artifacts.mjs";
import {
  JA_COMPOSITION_ID,
  REVIEW_FRAMES,
  REVIEW_OUTPUTS,
  renderReviewStills,
} from "./render-review-stills.mjs";

const execFileAsync = promisify(execFile);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const OUT_ROOT = join(PACKAGE_ROOT, "out");
const APPROVED_ROOT = join(OUT_ROOT, "ja");
const REGRESSION_ROOT = join(OUT_ROOT, ".tmp", "ja-regression");
const FFMPEG = join(PACKAGE_ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const JA_MP4_NAME = "viewer-engagement-prompt-board-launch-ja.mp4";
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export class JapanesePreservationError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "JapanesePreservationError";
  }
}

const execute = async (file, args, options = {}) => {
  try {
    return await execFileAsync(file, args, {
      cwd: PACKAGE_ROOT,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      ...options,
    });
  } catch (cause) {
    throw new JapanesePreservationError(`Command failed: ${file}`, { cause });
  }
};

const sha256 = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

export const assertApprovalShape = (approval) => {
  if (
    approval?.schemaVersion !== 1 ||
    approval?.compositionId !== JA_COMPOSITION_ID ||
    !GIT_SHA_PATTERN.test(approval?.sourceCommit ?? "") ||
    !GIT_SHA_PATTERN.test(approval?.sourceTree ?? "") ||
    !SHA256_PATTERN.test(approval?.mp4Sha256 ?? "") ||
    Number.isNaN(Date.parse(approval?.approvedAt ?? "")) ||
    !Array.isArray(approval?.reviewFrames) ||
    approval.reviewFrames.length !== REVIEW_FRAMES.length
  ) {
    throw new JapanesePreservationError("Japanese approval receipt shape is invalid");
  }
  for (const [index, frame] of REVIEW_FRAMES.entries()) {
    const expectedPath = REVIEW_OUTPUTS[index];
    const approvedFrame = approval.reviewFrames[index];
    if (
      approvedFrame?.frame !== frame ||
      approvedFrame?.path !== expectedPath ||
      !SHA256_PATTERN.test(approvedFrame?.stillSha256 ?? "")
    ) {
      throw new JapanesePreservationError(`Japanese approval frame ${frame} is invalid`);
    }
  }
};

export const countPixelMismatches = (approvedRgba, candidateRgba) => {
  if (approvedRgba.length !== candidateRgba.length || approvedRgba.length % 4 !== 0) {
    throw new JapanesePreservationError("Decoded RGBA dimensions do not match");
  }
  let mismatchCount = 0;
  for (let offset = 0; offset < approvedRgba.length; offset += 4) {
    if (
      approvedRgba[offset] !== candidateRgba[offset] ||
      approvedRgba[offset + 1] !== candidateRgba[offset + 1] ||
      approvedRgba[offset + 2] !== candidateRgba[offset + 2] ||
      approvedRgba[offset + 3] !== candidateRgba[offset + 3]
    ) {
      mismatchCount += 1;
    }
  }
  return mismatchCount;
};

const decodeRgba = async (path) => {
  const { stdout } = await execute(
    FFMPEG,
    ["-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    { encoding: "buffer" },
  );
  return stdout;
};

const readApproval = async () => {
  try {
    return JSON.parse(await readFile(join(APPROVED_ROOT, "approval.json"), "utf8"));
  } catch (cause) {
    throw new JapanesePreservationError("Japanese approval receipt is missing or invalid", { cause });
  }
};

const verifyApprovalArtifacts = async (approval) => {
  assertApprovalShape(approval);
  const approvedTree = await execute("git", ["rev-parse", `${approval.sourceCommit}^{tree}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (approvedTree.stdout.trim() !== approval.sourceTree) {
    throw new JapanesePreservationError("Japanese approval source commit/tree binding is invalid");
  }
  if ((await sha256(join(APPROVED_ROOT, JA_MP4_NAME))) !== approval.mp4Sha256) {
    throw new JapanesePreservationError("Approved Japanese MP4 SHA-256 changed");
  }
  for (const approvedFrame of approval.reviewFrames) {
    if ((await sha256(join(APPROVED_ROOT, approvedFrame.path))) !== approvedFrame.stillSha256) {
      throw new JapanesePreservationError(`Approved Japanese still changed: ${approvedFrame.path}`);
    }
  }
};

export const verifyJaPreservation = async ({ outputRoot, provenance }) => {
  const approval = await readApproval();
  await verifyApprovalArtifacts(approval);
  await rm(REGRESSION_ROOT, { recursive: true, force: true });
  await renderReviewStills({ outputRoot: REGRESSION_ROOT, compositionId: JA_COMPOSITION_ID });

  const frames = [];
  for (const [index, frame] of REVIEW_FRAMES.entries()) {
    const relativePath = REVIEW_OUTPUTS[index];
    const [approvedRgba, candidateRgba] = await Promise.all([
      decodeRgba(join(APPROVED_ROOT, relativePath)),
      decodeRgba(join(REGRESSION_ROOT, relativePath)),
    ]);
    const pixelMismatchCount = countPixelMismatches(approvedRgba, candidateRgba);
    frames.push({
      frame,
      path: relativePath,
      width: 1920,
      height: 1080,
      decodedBytes: approvedRgba.length,
      pixelMismatchCount,
      verdict: pixelMismatchCount === 0 ? "PASS" : "FAIL",
    });
  }

  assertProvenanceUnchanged(provenance, provenance);
  const receipt = {
    schemaVersion: 1,
    approvedJapanese: {
      compositionId: approval.compositionId,
      sourceCommit: approval.sourceCommit,
      sourceTree: approval.sourceTree,
      approvedAt: approval.approvedAt,
      mp4Sha256: approval.mp4Sha256,
    },
    stageBSource: provenance,
    comparison: "decoded RGBA",
    frames,
    verdict: frames.every(({ verdict }) => verdict === "PASS") ? "PASS" : "FAIL",
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    join(outputRoot, "ja-preservation-verification.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  if (receipt.verdict !== "PASS") {
    throw new JapanesePreservationError("Japanese review-frame pixel preservation failed");
  }
  return receipt;
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  readProvenance()
    .then((provenance) => verifyJaPreservation({ outputRoot: join(OUT_ROOT, ".tmp", "en"), provenance }))
    .then(({ verdict }) => console.log(`Japanese preservation ${verdict}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Unknown preservation failure");
      process.exitCode = 1;
    });
}
