import { describe, expect, it } from "vitest";

const buildContractUrl = new URL("../scripts/build-ja-artifacts.mjs", import.meta.url).href;
const reviewContractUrl = new URL("../scripts/render-review-stills.mjs", import.meta.url).href;
const verifyContractUrl = new URL("../scripts/verify-ja-render.mjs", import.meta.url).href;
const promotionContractUrl = new URL("../scripts/artifact-promotion.mjs", import.meta.url).href;
const { ARTIFACT_MANIFEST_PATHS, assertApprovalExcluded, assertArtifactSourceClean, createManifestLines } =
  await import(buildContractUrl);
const { REVIEW_OUTPUTS } = await import(reviewContractUrl);
const { SCHEMA_VERSION, buildMediaChecks, needsNormalization } = await import(verifyContractUrl);
const { assertProvenanceUnchanged, promoteArtifactDirectory, withExclusiveBuildLock } = await import(
  promotionContractUrl
);
const { mkdir, readFile, rm, writeFile } = await import(["node:fs", "promises"].join("/"));
const { dirname, join } = await import(["node:path"].join(""));
const { fileURLToPath } = await import(["node:url"].join(""));

const PROMOTION_TEST_ROOT = fileURLToPath(
  new URL("../out/.tmp/task6-promotion-contract-test/", import.meta.url),
);
const TEST_OWNED_PATHS = ["video.mp4", "review/frame.png", "manifest.sha256"] as const;

const writeTree = async (root: string, values: Readonly<Record<string, string>>) => {
  for (const [relativePath, value] of Object.entries(values)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, value, "utf8");
  }
};

const readTree = async (root: string, paths: readonly string[]) =>
  Object.fromEntries(
    await Promise.all(
      paths.map(async (relativePath) => [relativePath, await readFile(join(root, relativePath), "utf8")]),
    ),
  );

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

  it("refuses changed provenance before promotion without mutating final", async () => {
    const captured = { sourceCommit: "a".repeat(40), sourceTree: "b".repeat(40), clean: true };
    expect(() => assertProvenanceUnchanged(captured, captured)).not.toThrow();
    expect(() => assertProvenanceUnchanged(captured, { ...captured, sourceTree: "c".repeat(40) })).toThrow(
      /provenance changed/i,
    );
    const root = join(PROMOTION_TEST_ROOT, "provenance-mismatch");
    const finalRoot = join(root, "ja");
    const temporaryRoot = join(root, ".tmp", "rendered");
    await rm(root, { recursive: true, force: true });
    await writeTree(finalRoot, { "video.mp4": "old-video" });
    await writeTree(temporaryRoot, {
      "video.mp4": "new-video",
      "review/frame.png": "new-frame",
      "manifest.sha256": "new-manifest",
    });
    await expect(
      promoteArtifactDirectory({
        outRoot: root,
        temporaryArtifactRoot: temporaryRoot,
        finalRoot,
        candidateRoot: join(root, ".tmp", "candidate"),
        backupRoot: join(root, ".tmp", "backup"),
        ownedPaths: TEST_OWNED_PATHS,
        capturedProvenance: captured,
        readProvenance: async () => ({ ...captured, sourceTree: "c".repeat(40) }),
      }),
    ).rejects.toThrow(/provenance changed/i);
    expect(await readFile(join(finalRoot, "video.mp4"), "utf8")).toBe("old-video");
    await rm(root, { recursive: true, force: true });
  });

  it.each(["after-backup-rename", "after-candidate-rename"])(
    "rolls back the complete existing final tree on injected %s failure",
    async (failurePhase) => {
      const root = join(PROMOTION_TEST_ROOT, failurePhase);
      const finalRoot = join(root, "ja");
      const temporaryRoot = join(root, ".tmp", "rendered");
      const candidateRoot = join(root, ".tmp", "candidate");
      const backupRoot = join(root, ".tmp", "backup");
      await rm(root, { recursive: true, force: true });
      await writeTree(finalRoot, {
        "video.mp4": "old-video",
        "review/frame.png": "old-frame",
        "unknown.txt": "keep",
      });
      await writeTree(temporaryRoot, {
        "video.mp4": "new-video",
        "review/frame.png": "new-frame",
        "manifest.sha256": "new-manifest",
      });
      const provenance = { sourceCommit: "a".repeat(40), sourceTree: "b".repeat(40), clean: true };
      await expect(
        promoteArtifactDirectory({
          outRoot: root,
          temporaryArtifactRoot: temporaryRoot,
          finalRoot,
          candidateRoot,
          backupRoot,
          ownedPaths: TEST_OWNED_PATHS,
          capturedProvenance: provenance,
          readProvenance: async () => provenance,
          injectFailure: (phase: string) => {
            if (phase === failurePhase) throw new Error(`injected ${phase}`);
          },
        }),
      ).rejects.toThrow(/promotion failed/i);
      expect(await readTree(finalRoot, ["video.mp4", "review/frame.png", "unknown.txt"])).toEqual({
        "video.mp4": "old-video",
        "review/frame.png": "old-frame",
        "unknown.txt": "keep",
      });
      await expect(readFile(candidateRoot)).rejects.toThrow();
      await expect(readFile(backupRoot)).rejects.toThrow();
      await rm(root, { recursive: true, force: true });
    },
  );

  it("refuses approval appearing after the initial check without swapping final", async () => {
    const root = join(PROMOTION_TEST_ROOT, "approval-race");
    const finalRoot = join(root, "ja");
    const temporaryRoot = join(root, ".tmp", "rendered");
    await rm(root, { recursive: true, force: true });
    await writeTree(finalRoot, { "video.mp4": "old-video" });
    await writeTree(temporaryRoot, {
      "video.mp4": "new-video",
      "review/frame.png": "new-frame",
      "manifest.sha256": "new-manifest",
    });
    const provenance = { sourceCommit: "a".repeat(40), sourceTree: "b".repeat(40), clean: true };
    await expect(
      promoteArtifactDirectory({
        outRoot: root,
        temporaryArtifactRoot: temporaryRoot,
        finalRoot,
        candidateRoot: join(root, ".tmp", "candidate"),
        backupRoot: join(root, ".tmp", "backup"),
        ownedPaths: TEST_OWNED_PATHS,
        capturedProvenance: provenance,
        readProvenance: async () => provenance,
        injectFailure: async (phase: string) => {
          if (phase === "before-final-approval-recheck") {
            await writeFile(join(finalRoot, "approval.json"), "approved", "utf8");
          }
        },
      }),
    ).rejects.toThrow(/approval\.json/i);
    expect(await readFile(join(finalRoot, "video.mp4"), "utf8")).toBe("old-video");
    expect(await readFile(join(finalRoot, "approval.json"), "utf8")).toBe("approved");
    await rm(root, { recursive: true, force: true });
  });

  it("holds an exclusive package-local build lock and releases it", async () => {
    const root = join(PROMOTION_TEST_ROOT, "exclusive-lock");
    const lockPath = join(root, "artifact.lock");
    await rm(root, { recursive: true, force: true });
    const result = await withExclusiveBuildLock({
      lockPath,
      run: async () => {
        await expect(withExclusiveBuildLock({ lockPath, run: async () => "unexpected" })).rejects.toThrow(
          /lock is already present/i,
        );
        return "complete";
      },
    });
    expect(result).toBe("complete");
    await expect(readFile(lockPath, "utf8")).rejects.toThrow();
    await rm(root, { recursive: true, force: true });
  });
});
