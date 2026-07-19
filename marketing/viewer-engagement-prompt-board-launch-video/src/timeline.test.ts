import { describe, expect, test } from "vitest";

describe("prompt board video timeline contract", () => {
  test("locks scenes, review frames, transitions, and live action timing", async () => {
    const implementation = await import("./timeline").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { REVIEW_FRAMES, SCENES, TIMELINE, TRANSITIONS } = implementation;

    expect(SCENES).toEqual([
      { id: "hook", from: 0, to: 90 },
      { id: "plan", from: 90, to: 210 },
      { id: "cards", from: 210, to: 390 },
      { id: "live", from: 390, to: 570 },
      { id: "value", from: 570, to: 660 },
      { id: "cta", from: 660, to: 750 },
    ]);
    expect(REVIEW_FRAMES).toEqual([30, 105, 180, 270, 420, 510, 600, 690, 749]);
    expect(TIMELINE.live.makeCurrentSettled).toBeLessThan(TIMELINE.live.openLiveWorkspace);
    expect(TIMELINE.live.openLiveWorkspace).toBeLessThan(TIMELINE.live.nextPromptClick);
    expect(TIMELINE.live).toMatchObject({
      makeCurrentPress: 406,
      makeCurrentSettled: 420,
      openLiveWorkspace: 450,
      promptOneSelected: 474,
      nextPromptClick: 520,
      promptTwoSelected: 534,
    });
    expect(TRANSITIONS).toEqual([
      { id: "hook-to-plan", from: 82, to: 92, duration: 10 },
      { id: "plan-to-cards", from: 200, to: 210, duration: 10 },
      { id: "cards-to-live", from: 380, to: 390, duration: 10 },
      { id: "live-to-value", from: 560, to: 570, duration: 10 },
      { id: "value-to-cta", from: 650, to: 660, duration: 10 },
    ]);
    expect(TRANSITIONS.every(({ duration }) => duration >= 8 && duration <= 14)).toBe(true);
  });

  test("clamps and measures deterministic frame progress", async () => {
    const implementation = await import("./timeline").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { clamp01, progressBetween } = implementation;

    expect(clamp01(-0.1)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(1.2)).toBe(1);
    expect(progressBetween(90, 90, 210)).toBe(0);
    expect(progressBetween(150, 90, 210)).toBe(0.5);
    expect(progressBetween(210, 90, 210)).toBe(1);
    expect(progressBetween(60, 90, 210)).toBe(0);
    expect(progressBetween(240, 90, 210)).toBe(1);
  });

  test("keeps prompt one through the click gap and exposes a legal next-click state", async () => {
    const implementation = await import("./timeline").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { visualStateAt } = implementation;

    expect(visualStateAt(519)).toEqual({ kind: "live", selectedPromptId: "prompt-weekly-recap" });
    expect(visualStateAt(520)).toEqual({
      kind: "next-prompt",
      selectedPromptId: "prompt-weekly-recap",
      pressed: true,
    });
    expect(visualStateAt(533)).toEqual({
      kind: "next-prompt",
      selectedPromptId: "prompt-weekly-recap",
      pressed: false,
    });
    expect(visualStateAt(534)).toEqual({ kind: "live", selectedPromptId: "prompt-current-favorite" });
    expect(visualStateAt(749)).toEqual({
      kind: "live",
      selectedPromptId: "prompt-current-favorite",
    });
  });

  test("keeps the live workspace unselected until prompt one is selected", async () => {
    const implementation = await import("./timeline").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { visualStateAt } = implementation;

    expect(visualStateAt(419)).toEqual({ kind: "make-current", settled: false });
    expect(visualStateAt(420)).toEqual({ kind: "make-current", settled: true });
    expect(visualStateAt(449)).toEqual({ kind: "make-current", settled: true });
    expect(visualStateAt(450)).toEqual({ kind: "live", selectedPromptId: null });
    expect(visualStateAt(473)).toEqual({ kind: "live", selectedPromptId: null });
    expect(visualStateAt(474)).toEqual({
      kind: "live",
      selectedPromptId: "prompt-weekly-recap",
    });
  });

  test("freezes exact dark visual tokens and semantic minimums", async () => {
    const implementation = await import("./tokens").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { TOKENS } = implementation;

    expect(TOKENS).toEqual({
      background: "rgb(10 17 23)",
      foreground: "rgb(232 240 243)",
      surface: "rgb(15 25 33)",
      surfaceMuted: "rgb(22 35 44)",
      border: "rgb(47 65 75)",
      primary: "rgb(31 178 169)",
      primaryStrong: "rgb(78 207 197)",
      primarySoft: "rgb(16 67 66)",
      muted: "rgb(152 166 176)",
      radius: 8,
      safeArea: 96,
      uiInset: 64,
      captionFontSize: 54,
      ctaFontSize: 72,
      semanticLabelFontSize: 28,
    });
  });
});
