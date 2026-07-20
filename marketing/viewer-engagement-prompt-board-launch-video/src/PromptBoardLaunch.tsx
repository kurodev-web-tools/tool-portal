import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "./components/Caption";
import { Cursor, type CursorPhase } from "./components/Cursor";
import { EndCard } from "./components/EndCard";
import { MemoHook } from "./components/MemoHook";
import { PromptBoardMock } from "./components/PromptBoardMock";
import { EN_CONTENT, JA_CONTENT, type PromptBoardVideoContent } from "./content";
import { PromptBoardFontGate } from "./fonts";
import { TIMELINE, TRANSITIONS, visualStateAt } from "./timeline";
import { TOKENS } from "./tokens";

type Point = { readonly x: number; readonly y: number };
type SceneLayerProps = {
  readonly children: ReactNode;
  readonly opacity: number;
  readonly scale?: number;
  readonly translateY?: number;
};

const MAKE_CURRENT_START = { x: 1040, y: 720 } as const satisfies Point;
const MAKE_CURRENT_TARGET = { x: 1370, y: 390 } as const satisfies Point;
const PROMPT_ONE_TARGET = { x: 430, y: 350 } as const satisfies Point;
const NEXT_PROMPT_TARGET = { x: 1360, y: 520 } as const satisfies Point;

function between(frame: number, from: number, to: number): number {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function pointBetween(frame: number, from: number, to: number, start: Point, end: Point): Point {
  const progress = between(frame, from, to);
  return {
    x: interpolate(progress, [0, 1], [start.x, end.x]),
    y: interpolate(progress, [0, 1], [start.y, end.y]),
  };
}

function SceneLayer({ children, opacity, scale = 1, translateY = 0 }: SceneLayerProps) {
  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity,
    transform: `translateY(${translateY}px) scale(${scale})`,
  };
  return <div style={style}>{children}</div>;
}

function sceneOpacity(frame: number, enterFrom: number, enterTo: number, exitFrom: number, exitTo: number) {
  const enter = between(frame, enterFrom, enterTo);
  const exit = 1 - between(frame, exitFrom, exitTo);
  return Math.min(enter, exit);
}

function cursorAt(frame: number): { readonly point: Point; readonly phase: CursorPhase } | null {
  if (frame < TIMELINE.live.from || frame >= TIMELINE.value.from) {
    return null;
  }
  if (frame < TIMELINE.live.makeCurrentPress) {
    return {
      point: pointBetween(
        frame,
        TIMELINE.live.from,
        TIMELINE.live.makeCurrentPress,
        MAKE_CURRENT_START,
        MAKE_CURRENT_TARGET,
      ),
      phase: "moving",
    };
  }
  if (frame < TIMELINE.live.makeCurrentPress + 4) {
    return { point: MAKE_CURRENT_TARGET, phase: "pressed" };
  }
  if (frame < TIMELINE.live.openLiveWorkspace) {
    return { point: MAKE_CURRENT_TARGET, phase: "settled" };
  }
  if (frame < TIMELINE.live.promptOneSelected) {
    return {
      point: pointBetween(
        frame,
        TIMELINE.live.openLiveWorkspace,
        TIMELINE.live.promptOneSelected,
        MAKE_CURRENT_TARGET,
        PROMPT_ONE_TARGET,
      ),
      phase: "moving",
    };
  }
  if (frame < 496) {
    return { point: PROMPT_ONE_TARGET, phase: "settled" };
  }
  if (frame < TIMELINE.live.nextPromptClick) {
    return {
      point: pointBetween(frame, 496, TIMELINE.live.nextPromptClick, PROMPT_ONE_TARGET, NEXT_PROMPT_TARGET),
      phase: "moving",
    };
  }
  if (frame === TIMELINE.live.nextPromptClick) {
    return { point: NEXT_PROMPT_TARGET, phase: "pressed" };
  }
  return { point: NEXT_PROMPT_TARGET, phase: "settled" };
}

export type PromptBoardLaunchProps = {
  readonly content: PromptBoardVideoContent;
};

export function PromptBoardLaunch({ content }: PromptBoardLaunchProps) {
  const frame = useCurrentFrame();
  const [hookToPlan, planToCards, cardsToLive, liveToValue, valueToCta] = TRANSITIONS;
  const hookOpacity = 1 - between(frame, hookToPlan.from, hookToPlan.to);
  const planOpacity = sceneOpacity(frame, hookToPlan.from, hookToPlan.to, planToCards.from, planToCards.to);
  const cardsOpacity = sceneOpacity(
    frame,
    planToCards.from,
    planToCards.to,
    cardsToLive.from,
    cardsToLive.to,
  );
  const liveOpacity = sceneOpacity(frame, cardsToLive.from, cardsToLive.to, liveToValue.from, liveToValue.to);
  const valueOpacity = sceneOpacity(frame, liveToValue.from, liveToValue.to, valueToCta.from, valueToCta.to);
  const ctaOpacity = between(frame, valueToCta.from, valueToCta.to);
  const cursor = cursorAt(frame);

  return (
    <>
      <PromptBoardFontGate />
      <AbsoluteFill style={{ background: TOKENS.background, overflow: "hidden" }}>
        <SceneLayer opacity={hookOpacity} translateY={between(frame, 70, 90) * -16}>
          <MemoHook
            headline={content.captions[0]}
            notes={content.prompts.map(({ body }) => body)}
            opacity={1}
            translateY={0}
          />
        </SceneLayer>
        <SceneLayer opacity={planOpacity} translateY={(1 - planOpacity) * 16}>
          <PromptBoardMock
            content={content}
            state={visualStateAt(Math.max(frame, TIMELINE.plan.from))}
            opacity={1}
            scale={1}
            translateY={0}
          />
          <Caption text={content.captions[1]} opacity={1} translateY={0} />
        </SceneLayer>
        <SceneLayer opacity={cardsOpacity} translateY={(1 - cardsOpacity) * 16}>
          <PromptBoardMock
            content={content}
            state={visualStateAt(Math.max(frame, TIMELINE.cards.from))}
            opacity={1}
            scale={1}
            translateY={0}
          />
          <Caption text={content.captions[2]} opacity={1} translateY={0} />
        </SceneLayer>
        <SceneLayer opacity={liveOpacity} translateY={(1 - liveOpacity) * 16}>
          <PromptBoardMock
            content={content}
            state={visualStateAt(Math.max(frame, TIMELINE.live.from))}
            opacity={1}
            scale={1}
            translateY={0}
          />
          <Caption text={content.captions[3]} opacity={1} translateY={0} />
          {cursor ? <Cursor x={cursor.point.x} y={cursor.point.y} opacity={1} phase={cursor.phase} /> : null}
        </SceneLayer>
        <SceneLayer opacity={valueOpacity} scale={0.9} translateY={(1 - valueOpacity) * 12}>
          <PromptBoardMock
            content={content}
            state={{ kind: "live", selectedPromptId: content.prompts[1].id }}
            opacity={1}
            scale={1}
            translateY={0}
          />
          <Caption text={content.captions[4]} opacity={1} translateY={0} align="center" />
        </SceneLayer>
        <SceneLayer opacity={ctaOpacity} translateY={(1 - ctaOpacity) * 16}>
          <EndCard content={content} opacity={1} translateY={0} />
        </SceneLayer>
      </AbsoluteFill>
    </>
  );
}

export function PromptBoardLaunchJa() {
  return <PromptBoardLaunch content={JA_CONTENT} />;
}

export function PromptBoardLaunchEn() {
  return <PromptBoardLaunch content={EN_CONTENT} />;
}
