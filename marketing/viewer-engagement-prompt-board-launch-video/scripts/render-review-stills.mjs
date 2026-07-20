import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY_POINT = join(PACKAGE_ROOT, "src", "index.ts");
const COMPOSITION_ID = "ViewerEngagementPromptBoardLaunchJa";
const REMOTION_CLI = join(PACKAGE_ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");

export const REVIEW_FRAMES = Object.freeze([30, 105, 180, 270, 420, 510, 600, 690, 749]);
export const REVIEW_OUTPUTS = Object.freeze(
  REVIEW_FRAMES.map((frame) => `review/frame-${String(frame).padStart(4, "0")}.png`),
);

export class ReviewStillError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ReviewStillError";
  }
}

const runRemotion = async (args) => {
  try {
    await execFileAsync(process.execPath, [REMOTION_CLI, ...args], {
      cwd: PACKAGE_ROOT,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (cause) {
    throw new ReviewStillError("Remotion review still render failed", { cause });
  }
};

export const renderReviewStills = async ({ outputRoot, runner = runRemotion }) => {
  const reviewRoot = join(outputRoot, "review");
  await mkdir(reviewRoot, { recursive: true });
  for (const [index, frame] of REVIEW_FRAMES.entries()) {
    const relativeOutput = REVIEW_OUTPUTS[index];
    if (relativeOutput === undefined) {
      throw new ReviewStillError(`Missing review output contract for frame ${frame}`);
    }
    await runner([
      "still",
      ENTRY_POINT,
      COMPOSITION_ID,
      join(outputRoot, relativeOutput),
      `--frame=${frame}`,
      "--concurrency=1",
      "--gl=swiftshader",
      "--overwrite",
      "--timeout=60000",
      "--log=error",
    ]);
  }
  return REVIEW_OUTPUTS.map((relativePath) => join(outputRoot, relativePath));
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const outputRoot = join(PACKAGE_ROOT, "out", ".tmp", "ja");
  renderReviewStills({ outputRoot }).catch((error) => {
    console.error(error instanceof Error ? error.message : "Unknown review still render failure");
    process.exitCode = 1;
  });
}
