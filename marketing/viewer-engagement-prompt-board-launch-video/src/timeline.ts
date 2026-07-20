import type { PromptBoardVisualState } from "./content";

export type SceneId = "hook" | "plan" | "cards" | "live" | "value" | "cta";

export type TimelineScene = {
  readonly id: SceneId;
  readonly from: number;
  readonly to: number;
};

export const SCENES = [
  { id: "hook", from: 0, to: 90 },
  { id: "plan", from: 90, to: 210 },
  { id: "cards", from: 210, to: 390 },
  { id: "live", from: 390, to: 570 },
  { id: "value", from: 570, to: 660 },
  { id: "cta", from: 660, to: 750 },
] as const satisfies readonly TimelineScene[];

export const REVIEW_FRAMES = [30, 105, 180, 270, 420, 510, 600, 690, 749] as const;

export const TIMELINE = {
  durationInFrames: 750,
  hook: { from: 0, to: 90 },
  plan: { from: 90, to: 210 },
  cards: { from: 210, to: 390 },
  live: {
    from: 390,
    to: 570,
    makeCurrentPress: 406,
    makeCurrentSettled: 420,
    openLiveWorkspace: 450,
    promptOneSelected: 474,
    nextPromptClick: 520,
    promptTwoSelected: 534,
  },
  value: { from: 570, to: 660 },
  cta: { from: 660, to: 750 },
} as const;

export type TransitionId =
  | "hook-to-plan"
  | "plan-to-cards"
  | "cards-to-live"
  | "live-to-value"
  | "value-to-cta";

export type TimelineTransition = {
  readonly id: TransitionId;
  readonly from: number;
  readonly to: number;
  readonly duration: 10;
};

export const TRANSITIONS = [
  { id: "hook-to-plan", from: 82, to: 92, duration: 10 },
  { id: "plan-to-cards", from: 200, to: 210, duration: 10 },
  { id: "cards-to-live", from: 380, to: 390, duration: 10 },
  { id: "live-to-value", from: 560, to: 570, duration: 10 },
  { id: "value-to-cta", from: 650, to: 660, duration: 10 },
] as const satisfies readonly TimelineTransition[];

export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function progressBetween(frame: number, from: number, to: number): number {
  if (to <= from) {
    return frame < to ? 0 : 1;
  }
  return clamp01((frame - from) / (to - from));
}

function normalizeFrame(frame: number): number {
  if (!Number.isFinite(frame)) {
    return frame === Number.POSITIVE_INFINITY ? 749 : 0;
  }
  return Math.max(0, Math.min(749, Math.floor(frame)));
}

export function visualStateAt(frame: number): PromptBoardVisualState {
  const currentFrame = normalizeFrame(frame);

  if (currentFrame < TIMELINE.plan.from) {
    return { kind: "plan-editor", typedCharacters: 0 };
  }
  if (currentFrame < 150) {
    return {
      kind: "plan-editor",
      typedCharacters: Math.round(progressBetween(currentFrame, 90, 150) * 4),
    };
  }
  if (currentFrame < TIMELINE.cards.from) {
    return { kind: "plan-created" };
  }
  if (currentFrame < 270) {
    return { kind: "cards", visibleCards: 1 };
  }
  if (currentFrame < 330) {
    return { kind: "cards", visibleCards: 2 };
  }
  if (currentFrame < TIMELINE.live.from) {
    return { kind: "cards", visibleCards: 3 };
  }
  if (currentFrame < TIMELINE.live.makeCurrentSettled) {
    return { kind: "make-current", settled: false };
  }
  if (currentFrame < TIMELINE.live.openLiveWorkspace) {
    return { kind: "make-current", settled: true };
  }
  if (currentFrame < TIMELINE.live.promptOneSelected) {
    return { kind: "live", selectedPromptId: null };
  }
  if (currentFrame < TIMELINE.live.nextPromptClick) {
    return { kind: "live", selectedPromptId: "prompt-weekly-recap" };
  }
  if (currentFrame < TIMELINE.live.promptTwoSelected) {
    return {
      kind: "next-prompt",
      selectedPromptId: "prompt-weekly-recap",
      pressed: currentFrame === TIMELINE.live.nextPromptClick,
    };
  }
  return { kind: "live", selectedPromptId: "prompt-current-favorite" };
}
