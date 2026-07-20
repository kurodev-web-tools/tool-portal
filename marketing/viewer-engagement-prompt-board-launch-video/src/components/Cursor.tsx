import type { CSSProperties } from "react";
import { TOKENS } from "../tokens";

export type CursorPhase = "idle" | "moving" | "pressed" | "settled";

export type CursorProps = {
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly phase: CursorPhase;
};

const CURSOR_SCALE: Readonly<Record<CursorPhase, number>> = {
  idle: 1,
  moving: 1.04,
  pressed: 0.86,
  settled: 1,
};

export function Cursor({ x, y, opacity, phase }: CursorProps) {
  const rootStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20,
    width: 64,
    height: 64,
    opacity,
    transform: `translate3d(${x}px, ${y}px, 0) scale(${CURSOR_SCALE[phase]})`,
    transformOrigin: "8px 8px",
    pointerEvents: "none",
  };

  return (
    <div style={rootStyle}>
      {phase === "pressed" ? (
        <div
          style={{
            position: "absolute",
            inset: -16,
            border: `4px solid ${TOKENS.primaryStrong}`,
            borderRadius: "50%",
            opacity: 0.72,
          }}
        />
      ) : null}
      <svg aria-hidden="true" viewBox="0 0 64 64" width="64" height="64">
        <path
          d="M8 5L50 34L31 38L21 56Z"
          fill={TOKENS.foreground}
          stroke={TOKENS.background}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M28 38L42 56" stroke={TOKENS.primaryStrong} strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}
