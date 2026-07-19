import type { CSSProperties } from "react";
import { PROMPT_BOARD_FONT_FAMILY } from "../fonts";
import { TOKENS } from "../tokens";

export type CaptionProps = {
  readonly text: string;
  readonly opacity: number;
  readonly translateY: number;
  readonly align?: "left" | "center";
};

export function Caption({ text, opacity, translateY, align = "left" }: CaptionProps) {
  const style: CSSProperties = {
    position: "absolute",
    right: TOKENS.safeArea,
    bottom: TOKENS.safeArea,
    left: TOKENS.safeArea,
    margin: 0,
    opacity,
    transform: `translateY(${translateY}px)`,
    color: TOKENS.foreground,
    fontFamily: PROMPT_BOARD_FONT_FAMILY,
    fontSize: TOKENS.captionFontSize,
    fontWeight: 900,
    lineHeight: 1.4,
    textAlign: align,
    textShadow: `0 4px 16px ${TOKENS.background}`,
  };

  return <p style={style}>{text}</p>;
}
