import type { CSSProperties } from "react";
import { PROMPT_BOARD_FONT_FAMILY } from "../fonts";
import { TOKENS } from "../tokens";

export type MemoHookProps = {
  readonly headline: string;
  readonly notes: readonly string[];
  readonly opacity: number;
  readonly translateY: number;
};

export function MemoHook({ headline, notes, opacity, translateY }: MemoHookProps) {
  const rootStyle: CSSProperties = {
    position: "absolute",
    inset: TOKENS.safeArea,
    opacity,
    transform: `translateY(${translateY}px)`,
    fontFamily: PROMPT_BOARD_FONT_FAMILY,
    color: TOKENS.foreground,
  };

  return (
    <section style={rootStyle}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 32,
          paddingTop: 64,
        }}
      >
        {notes.slice(0, 3).map((note, index) => (
          <div
            key={note}
            style={{
              minHeight: 168,
              padding: 32,
              border: `2px solid ${index === 1 ? TOKENS.primary : TOKENS.border}`,
              borderRadius: TOKENS.radius,
              background: index === 1 ? TOKENS.primarySoft : TOKENS.surfaceMuted,
              color: index === 1 ? TOKENS.foreground : TOKENS.muted,
              fontSize: TOKENS.semanticLabelFontSize,
              fontWeight: 700,
              lineHeight: 1.5,
              transform: `translateY(${index % 2 === 0 ? 16 : 0}px) rotate(${index - 1}deg)`,
            }}
          >
            {note}
          </div>
        ))}
      </div>
      <h1
        style={{
          position: "absolute",
          right: 0,
          bottom: 112,
          left: 0,
          margin: 0,
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1.35,
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        {headline}
      </h1>
    </section>
  );
}
