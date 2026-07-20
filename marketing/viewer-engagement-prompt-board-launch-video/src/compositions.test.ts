/// <reference types="vite/client" />

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { COMPOSITION_IDS, VIDEO_METADATA } from "./compositions";
import { TOKENS } from "./tokens";

const remotionState = vi.hoisted(() => ({ frame: 0 }));

vi.mock("./fonts", () => ({
  PROMPT_BOARD_FONT_FAMILY: "test-font",
  PromptBoardFontGate: () => null,
}));
vi.mock("remotion", () => ({
  AbsoluteFill: ({ children }: { readonly children?: React.ReactNode }) =>
    createElement("div", null, children),
  Composition: ({
    component,
    durationInFrames,
    fps,
    height,
    id,
    width,
  }: {
    readonly component: { readonly name: string };
    readonly durationInFrames: number;
    readonly fps: number;
    readonly height: number;
    readonly id: string;
    readonly width: number;
  }) =>
    createElement("div", {
      "data-component": component.name,
      "data-duration": durationInFrames,
      "data-fps": fps,
      "data-height": height,
      "data-id": id,
      "data-width": width,
    }),
  interpolate: () => 1,
  registerRoot: vi.fn(),
  useCurrentFrame: () => remotionState.frame,
}));

afterEach(() => {
  remotionState.frame = 0;
});

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

  test("keeps the forbidden English composition ID out of recursive production source", () => {
    const forbiddenId = ["ViewerEngagementPromptBoardLaunch", "En"].join("");
    const sourceModules = import.meta.glob("./**/*.{ts,tsx}", {
      eager: true,
      import: "default",
      query: "?raw",
    });
    const productionModules = Object.entries(sourceModules).filter(
      ([fileName]) => !/\.test\.tsx?$/.test(fileName),
    );
    const productionSource = productionModules.map(([, source]) => source).join("\n");

    expect(productionModules.map(([fileName]) => fileName)).toContain("./compositions.ts");
    expect(productionSource).not.toContain(forbiddenId);
  });

  test("registers exactly one Root composition owned by PromptBoardLaunch", async () => {
    const implementation = await import("./Root").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const markup = renderToStaticMarkup(createElement(implementation.Root));
    expect(markup.match(/data-id=/g)).toHaveLength(1);
    expect(markup).toContain(`data-id="${COMPOSITION_IDS[0]}"`);
    expect(markup).toContain(`data-width="${VIDEO_METADATA.width}"`);
    expect(markup).toContain(`data-height="${VIDEO_METADATA.height}"`);
    expect(markup).toContain(`data-fps="${VIDEO_METADATA.fps}"`);
    expect(markup).toContain(`data-duration="${VIDEO_METADATA.durationInFrames}"`);
    expect(markup).toContain('data-component="PromptBoardLaunch"');
  });

  test("owns font readiness inside the rendered composition", () => {
    const sourceModules = import.meta.glob("./**/*.{ts,tsx}", {
      eager: true,
      import: "default",
      query: "?raw",
    });
    const entrySource = sourceModules["./index.ts"];
    const compositionSource = sourceModules["./PromptBoardLaunch.tsx"];

    expect(entrySource).not.toContain('import "./fonts";');
    expect(compositionSource).toContain("<PromptBoardFontGate />");
  });

  test("targets the visible next-prompt action at its pressed frame", async () => {
    remotionState.frame = 520;
    const { PromptBoardLaunch } = await import("./PromptBoardLaunch");
    const markup = renderToStaticMarkup(createElement(PromptBoardLaunch));
    const pressedCursor = /translate3d\([^,]+px,\s*([\d.]+)px,\s*0\) scale\(0\.86\)/.exec(markup);

    expect(pressedCursor).not.toBeNull();
    const cursorY = Number(pressedCursor?.[1]);
    expect(cursorY).toBeGreaterThanOrEqual(500);
    expect(cursorY).toBeLessThanOrEqual(560);
    expect(markup).toContain(`border:4px solid ${TOKENS.primaryStrong}`);
  });
});
