import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remotion = vi.hoisted(() => ({
  cancelRender: vi.fn(),
  continueRender: vi.fn(),
  delayRender: vi.fn(() => 73),
  staticFile: vi.fn((path: string) => `/static/${path}`),
  useDelayRender: vi.fn(),
}));

const reactHooks = vi.hoisted(() => ({
  useEffect: vi.fn((effect: () => void) => effect()),
  useState: vi.fn((initialize: () => number) => [initialize()]),
}));

vi.mock("remotion", () => remotion);
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: reactHooks.useEffect,
  useState: reactHooks.useState,
}));

type LoadedFace = {
  readonly family: string;
  readonly source: string | ArrayBuffer;
  readonly descriptors: FontFaceDescriptors;
};

type LoadControl = {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
};

const constructedFaces: LoadedFace[] = [];
const loadControls = new Map<string, LoadControl>();
const fontBytes = {
  "700": new Uint8Array([7, 0, 0]).buffer,
  "900": new Uint8Array([9, 0, 0]).buffer,
} as const;

class TestFontFace {
  readonly family: string;
  readonly source: string | ArrayBuffer;
  readonly descriptors: FontFaceDescriptors;

  constructor(family: string, source: string | ArrayBuffer, descriptors: FontFaceDescriptors) {
    this.family = family;
    this.source = source;
    this.descriptors = descriptors;
    constructedFaces.push(this);
  }

  load(): Promise<TestFontFace> {
    return new Promise((resolve, reject) => {
      loadControls.set(this.descriptors.weight ?? "", {
        resolve: () => resolve(this),
        reject,
      });
    });
  }
}

describe("prompt-board package fonts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    remotion.useDelayRender.mockReturnValue({
      cancelRender: remotion.cancelRender,
      continueRender: remotion.continueRender,
      delayRender: remotion.delayRender,
    });
    constructedFaces.length = 0;
    loadControls.clear();
    vi.stubGlobal("FontFace", TestFontFace);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        arrayBuffer: async () => (url.includes("700") ? fontBytes["700"] : fontBytes["900"]),
      })),
    );
    vi.stubGlobal("document", {
      fonts: {
        add: vi.fn(),
        get ready(): never {
          throw new Error("document.fonts.ready must not own render readiness");
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("continues rendering only after both exact package-local weights load", async () => {
    const module = await import("./fonts");

    expect(fetch).not.toHaveBeenCalled();
    const loading = module.loadPromptBoardFonts();
    await vi.waitFor(() => expect(constructedFaces).toHaveLength(2));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, "/static/fonts/noto-sans-jp-700-promo-v1.woff2");
    expect(fetch).toHaveBeenNthCalledWith(2, "/static/fonts/noto-sans-jp-900-promo-v1.woff2");
    expect(constructedFaces.map(({ descriptors }) => descriptors.weight)).toEqual(["700", "900"]);
    expect(constructedFaces.map(({ source }) => source)).toEqual([fontBytes["700"], fontBytes["900"]]);

    loadControls.get("700")?.resolve();
    await Promise.resolve();
    expect(document.fonts.add).not.toHaveBeenCalled();

    loadControls.get("900")?.resolve();
    await loading;

    expect(document.fonts.add).toHaveBeenCalledTimes(2);
  });

  it.each(["700", "900"])(
    "cancels rendering without continuing when package-local weight %s fails",
    async (failedWeight) => {
      const module = await import("./fonts");
      const otherWeight = failedWeight === "700" ? "900" : "700";
      const loading = module.loadPromptBoardFonts();

      await vi.waitFor(() => expect(loadControls.size).toBe(2));

      loadControls.get(otherWeight)?.resolve();
      loadControls.get(failedWeight)?.reject(new Error(`font ${failedWeight} rejected`));
      await expect(loading).rejects.toThrow(`font ${failedWeight} rejected`);

      expect(document.fonts.add).not.toHaveBeenCalled();
    },
  );

  it("owns readiness in the composition gate and cancels a failed package response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
      })),
    );
    const module = await import("./fonts");

    expect(module.PromptBoardFontGate()).toBeNull();
    expect(remotion.delayRender).toHaveBeenCalledExactlyOnceWith("Loading package-local prompt-board fonts");
    await vi.waitFor(() => expect(remotion.cancelRender).toHaveBeenCalledExactlyOnceWith(expect.any(Error)));
    expect(remotion.continueRender).not.toHaveBeenCalled();
  });

  it("continues the composition gate exactly once after both weights load", async () => {
    const module = await import("./fonts");

    expect(module.PromptBoardFontGate()).toBeNull();
    await vi.waitFor(() => expect(loadControls.size).toBe(2));
    expect(remotion.continueRender).not.toHaveBeenCalled();

    loadControls.get("700")?.resolve();
    loadControls.get("900")?.resolve();

    await vi.waitFor(() => expect(remotion.continueRender).toHaveBeenCalledExactlyOnceWith(73));
    expect(document.fonts.add).toHaveBeenCalledTimes(2);
    expect(remotion.cancelRender).not.toHaveBeenCalled();
  });
});
