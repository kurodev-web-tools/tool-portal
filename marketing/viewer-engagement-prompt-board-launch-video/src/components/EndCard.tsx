import type { CSSProperties } from "react";
import type { PromptBoardVideoContent } from "../content";
import { PROMPT_BOARD_FONT_FAMILY } from "../fonts";
import { TOKENS } from "../tokens";

export type EndCardProps = {
  readonly content: PromptBoardVideoContent;
  readonly opacity: number;
  readonly translateY: number;
};

export function EndCard({ content, opacity, translateY }: EndCardProps) {
  const rootStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    opacity,
    transform: `translateY(${translateY}px)`,
    background: TOKENS.background,
    color: TOKENS.foreground,
    fontFamily: PROMPT_BOARD_FONT_FAMILY,
  };

  return (
    <section style={rootStyle}>
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          right: -160,
          top: -240,
          border: `96px solid ${TOKENS.primarySoft}`,
          borderRadius: "50%",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: TOKENS.safeArea,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p style={{ margin: 0, color: TOKENS.primaryStrong, fontSize: TOKENS.ctaFontSize, fontWeight: 900 }}>
          {content.captions[5]}
        </p>
        <h1
          style={{
            maxWidth: 1320,
            margin: "24px 0 0",
            fontSize: TOKENS.ctaFontSize,
            fontWeight: 900,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}
        >
          {content.captions[6]}
        </h1>
        <div
          style={{
            width: 160,
            height: 8,
            margin: "48px 0",
            borderRadius: TOKENS.radius,
            background: TOKENS.primary,
          }}
        />
        <p style={{ margin: 0, color: TOKENS.muted, fontSize: 36, fontWeight: 700 }}>{content.captions[7]}</p>
      </div>
    </section>
  );
}
