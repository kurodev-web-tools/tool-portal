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

describe("bilingual Stage B composition contract", () => {
  test("registers Japanese and English compositions with locked video metadata", async () => {
    const implementation = await import("./compositions").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { COMPOSITION_EXPORTS, COMPOSITION_IDS, VIDEO_METADATA } = implementation;

    expect(COMPOSITION_IDS).toEqual([
      "ViewerEngagementPromptBoardLaunchJa",
      "ViewerEngagementPromptBoardLaunchEn",
    ]);
    expect(VIDEO_METADATA).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 750,
    });
    expect(COMPOSITION_EXPORTS).toEqual({
      ja: "ViewerEngagementPromptBoardLaunchJa",
      en: "ViewerEngagementPromptBoardLaunchEn",
    });
  });

  test("registers exactly two locale wrappers owned by the shared PromptBoardLaunch", async () => {
    const implementation = await import("./Root").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const markup = renderToStaticMarkup(createElement(implementation.Root));
    expect(markup.match(/data-id=/g)).toHaveLength(2);
    expect(markup).toContain(`data-id="${COMPOSITION_IDS[0]}"`);
    expect(markup).toContain(`data-id="${COMPOSITION_IDS[1]}"`);
    expect(markup).toContain(`data-width="${VIDEO_METADATA.width}"`);
    expect(markup).toContain(`data-height="${VIDEO_METADATA.height}"`);
    expect(markup).toContain(`data-fps="${VIDEO_METADATA.fps}"`);
    expect(markup).toContain(`data-duration="${VIDEO_METADATA.durationInFrames}"`);
    expect(markup).toContain('data-component="PromptBoardLaunchJa"');
    expect(markup).toContain('data-component="PromptBoardLaunchEn"');
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

  test("renders the English composition with English-only locale copy", async () => {
    const { PromptBoardLaunchEn } = await import("./PromptBoardLaunch");
    remotionState.frame = 420;
    const markup = renderToStaticMarkup(createElement(PromptBoardLaunchEn));

    expect(markup).toContain("Live Prompt Board");
    expect(markup).toContain("Weekend Chat");
    expect(markup).toContain("Use for Current Stream");
    expect(markup).toContain("Stay focused on the current topic");
    expect(markup).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/u);
  });

  test("targets the visible next-prompt action at its pressed frame", async () => {
    remotionState.frame = 520;
    const { PromptBoardLaunch } = await import("./PromptBoardLaunch");
    const { JA_CONTENT } = await import("./content");
    const markup = renderToStaticMarkup(createElement(PromptBoardLaunch, { content: JA_CONTENT }));
    const pressedCursor = /translate3d\([^,]+px,\s*([\d.]+)px,\s*0\) scale\(0\.86\)/.exec(markup);

    expect(pressedCursor).not.toBeNull();
    const cursorY = Number(pressedCursor?.[1]);
    expect(cursorY).toBeGreaterThanOrEqual(500);
    expect(cursorY).toBeLessThanOrEqual(560);
    expect(markup).toContain(`border:4px solid ${TOKENS.primaryStrong}`);
  });
});
