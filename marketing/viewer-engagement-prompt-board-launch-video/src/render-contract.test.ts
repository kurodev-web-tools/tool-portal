import { describe, expect, it } from "vitest";

const buildContractUrl = new URL("../scripts/build-ja-artifacts.mjs", import.meta.url).href;
const reviewContractUrl = new URL("../scripts/render-review-stills.mjs", import.meta.url).href;
const verifyContractUrl = new URL("../scripts/verify-ja-render.mjs", import.meta.url).href;
const { ARTIFACT_MANIFEST_PATHS, assertApprovalExcluded, assertArtifactSourceClean, createManifestLines } =
  await import(buildContractUrl);
const { REVIEW_OUTPUTS } = await import(reviewContractUrl);
const { SCHEMA_VERSION } = await import(verifyContractUrl);

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
});
