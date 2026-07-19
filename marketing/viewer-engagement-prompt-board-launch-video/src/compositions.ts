export type VideoMetadata = {
  readonly width: 1920;
  readonly height: 1080;
  readonly fps: 30;
  readonly durationInFrames: 750;
};

export const COMPOSITION_IDS = ["ViewerEngagementPromptBoardLaunchJa"] as const;

export const VIDEO_METADATA = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 750,
} as const satisfies VideoMetadata;

export const COMPOSITION_EXPORTS = {
  ja: COMPOSITION_IDS[0],
} as const;
