import { describe, expect, it } from "vitest";

const buildEnUrl = new URL("../scripts/build-en-artifacts.mjs", import.meta.url).href;
const preservationUrl = new URL("../scripts/verify-ja-preservation.mjs", import.meta.url).href;
const { EN_ARTIFACT_MANIFEST_PATHS } = await import(buildEnUrl);
const { assertApprovalShape, countPixelMismatches } = await import(preservationUrl);

const SHA = "a".repeat(64);
const REVIEW_FRAMES = [30, 105, 180, 270, 420, 510, 600, 690, 749] as const;
const approval = {
  schemaVersion: 1,
  compositionId: "ViewerEngagementPromptBoardLaunchJa",
  sourceCommit: SHA,
  sourceTree: SHA,
  approvedAt: "2026-07-20T12:00:00.000Z",
  mp4Sha256: SHA,
  reviewFrames: REVIEW_FRAMES.map((frame) => ({
    frame,
    path: `review/frame-${String(frame).padStart(4, "0")}.png`,
    stillSha256: SHA,
  })),
};

describe("English Stage B artifact contract", () => {
  it("includes the English media, review set, verification, preservation receipt, and post copy", () => {
    expect(EN_ARTIFACT_MANIFEST_PATHS).toEqual([
      "viewer-engagement-prompt-board-launch-en.mp4",
      ...REVIEW_FRAMES.map((frame) => `review/frame-${String(frame).padStart(4, "0")}.png`),
      "post.txt",
      "verification.json",
      "ja-preservation-verification.json",
    ]);
  });

  it("requires a hash-bound Japanese approval receipt", () => {
    expect(() => assertApprovalShape(approval)).not.toThrow();
    expect(() => assertApprovalShape({ ...approval, mp4Sha256: "missing" })).toThrow(/approval/i);
    expect(() =>
      assertApprovalShape({
        ...approval,
        reviewFrames: approval.reviewFrames.slice(0, -1),
      }),
    ).toThrow(/approval/i);
  });

  it("counts mismatched decoded RGBA pixels instead of PNG byte differences", () => {
    const approved = new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]);
    expect(countPixelMismatches(approved, new Uint8Array(approved))).toBe(0);
    expect(countPixelMismatches(approved, new Uint8Array([1, 2, 3, 255, 4, 9, 6, 255]))).toBe(1);
    expect(() => countPixelMismatches(approved, new Uint8Array([1, 2, 3, 255]))).toThrow(/dimensions/i);
  });
});
