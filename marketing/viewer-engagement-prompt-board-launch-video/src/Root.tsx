import { Composition } from "remotion";
import { COMPOSITION_IDS, VIDEO_METADATA } from "./compositions";
import { PromptBoardLaunch } from "./PromptBoardLaunch";

export function Root() {
  return (
    <Composition
      id={COMPOSITION_IDS[0]}
      component={PromptBoardLaunch}
      durationInFrames={VIDEO_METADATA.durationInFrames}
      fps={VIDEO_METADATA.fps}
      width={VIDEO_METADATA.width}
      height={VIDEO_METADATA.height}
    />
  );
}
