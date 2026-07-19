import { describe, expect, test } from "vitest";

type RawModuleOptions = {
  readonly eager?: boolean;
  readonly import?: string;
  readonly query?: string;
};

declare global {
  interface ImportMeta {
    readonly glob: (pattern: string, options: RawModuleOptions) => Readonly<Record<string, string>>;
  }
}

describe("Japanese Stage A composition contract", () => {
  test("registers one Japanese composition with locked video metadata", async () => {
    const implementation = await import("./compositions").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { COMPOSITION_EXPORTS, COMPOSITION_IDS, VIDEO_METADATA } = implementation;

    expect(COMPOSITION_IDS).toEqual(["ViewerEngagementPromptBoardLaunchJa"]);
    expect(VIDEO_METADATA).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 750,
    });
    expect(Object.keys(COMPOSITION_EXPORTS)).toEqual(["ja"]);
  });

  test("keeps the forbidden English composition ID out of production source", () => {
    const forbiddenId = ["ViewerEngagementPromptBoardLaunch", "En"].join("");
    const productionSource = Object.entries(
      import.meta.glob("./*.{ts,tsx}", { eager: true, import: "default", query: "?raw" }),
    )
      .filter(([fileName]) => !/\.test\.tsx?$/.test(fileName))
      .map(([, source]) => source)
      .join("\n");

    expect(productionSource).not.toContain(forbiddenId);
  });
});
