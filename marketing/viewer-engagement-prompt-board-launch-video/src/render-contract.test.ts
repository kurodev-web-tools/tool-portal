import { describe, expect, it } from "vitest";

const buildContractUrl = new URL("../scripts/build-ja-artifacts.mjs", import.meta.url).href;
const reviewContractUrl = new URL("../scripts/render-review-stills.mjs", import.meta.url).href;
const verifyContractUrl = new URL("../scripts/verify-ja-render.mjs", import.meta.url).href;
const { ARTIFACT_MANIFEST_PATHS, assertApprovalExcluded, assertArtifactSourceClean, createManifestLines } =
  await import(buildContractUrl);
const { REVIEW_OUTPUTS } = await import(reviewContractUrl);
const { SCHEMA_VERSION, buildMediaChecks, needsNormalization } = await import(verifyContractUrl);

describe("Japanese artifact contract", () => {
  it("uses the exact review and video paths", () => {
    expect(REVIEW_OUTPUTS).toEqual([
      "review/frame-0030.png",
      "review/frame-0105.png",
      "review/frame-0180.png",
      "review/frame-0270.png",
      "review/frame-0420.png",
      "review/frame-0510.png",
      "review/frame-0600.png",
      "review/frame-0690.png",
      "review/frame-0749.png",
    ]);
    expect(ARTIFACT_MANIFEST_PATHS[0]).toBe("viewer-engagement-prompt-board-launch-ja.mp4");
  });

  it("uses schema version 1 and refuses approval membership", () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(ARTIFACT_MANIFEST_PATHS).toHaveLength(12);
    expect(ARTIFACT_MANIFEST_PATHS).not.toContain("approval.json");
    expect(() => assertApprovalExcluded([...ARTIFACT_MANIFEST_PATHS, "approval.json"])).toThrow(
      /exclude approval\.json/,
    );
  });

  it("builds exactly the required manifest members with stable slash paths", async () => {
    const lines = await createManifestLines(ARTIFACT_MANIFEST_PATHS, async () => "a".repeat(64));
    const members = lines.map((line: string) => line.slice(66));
    expect(members).toEqual(ARTIFACT_MANIFEST_PATHS);
    expect(lines.join("\n")).not.toContain("approval.json");
    expect(lines.join("\n")).not.toContain("manifest.sha256");
    expect(members.every((path: string) => !path.includes("\\"))).toBe(true);
  });

  it("refuses dirty artifact source", () => {
    expect(() =>
      assertArtifactSourceClean(" M marketing/viewer-engagement-prompt-board-launch-video/src/index.ts\n"),
    ).toThrow(/dirty/i);
    expect(() =>
      assertArtifactSourceClean(
        "?? docs/superpowers/specs/2026-07-19-viewer-engagement-prompt-board-x-promo-video-design.md\n",
      ),
    ).toThrow(/dirty/i);
    expect(() => assertArtifactSourceClean("")).not.toThrow();
  });

  it("requires 750 decoded frames and exact limited-range bt709 metadata", () => {
    const exactVideo = {
      codec_type: "video",
      codec_name: "h264",
      width: 1920,
      height: 1080,
      pix_fmt: "yuv420p",
      color_range: "tv",
      color_space: "bt709",
      color_transfer: "bt709",
      color_primaries: "bt709",
      r_frame_rate: "30/1",
      avg_frame_rate: "30/1",
      nb_frames: "750",
      nb_read_frames: "750",
    };
    expect(
      buildMediaChecks({ video: exactVideo, duration: 25, audioCount: 0, decodePassed: true }),
    ).toSatisfy((checks: readonly { readonly verdict: string }[]) =>
      checks.every(({ verdict }) => verdict === "PASS"),
    );
    const missingReadCount = { ...exactVideo, nb_read_frames: undefined };
    expect(
      buildMediaChecks({ video: missingReadCount, duration: 25, audioCount: 0, decodePassed: true }),
    ).toContainEqual(expect.objectContaining({ name: "decoded-frame-count", verdict: "FAIL" }));
  });

  it("normalizes unless pixel format and all four color fields are exact", () => {
    const exactVideo = {
      pix_fmt: "yuv420p",
      color_range: "tv",
      color_space: "bt709",
      color_transfer: "bt709",
      color_primaries: "bt709",
    };
    expect(needsNormalization(exactVideo)).toBe(false);
    for (const key of Object.keys(exactVideo)) {
      expect(needsNormalization({ ...exactVideo, [key]: "unknown" })).toBe(true);
    }
  });
});
