import type { CSSProperties, ReactNode } from "react";
import type { PromptBoardVideoContent, PromptBoardVisualState } from "../content";
import { PROMPT_BOARD_FONT_FAMILY } from "../fonts";
import { TOKENS } from "../tokens";

export type PromptBoardMockProps = {
  readonly content: PromptBoardVideoContent;
  readonly state: PromptBoardVisualState;
  readonly opacity: number;
  readonly scale: number;
  readonly translateY: number;
};

const unreachable = (value: never): never => value;
const ACTIVE_TAB = {
  "plan-editor": "plans",
  "plan-created": "plans",
  cards: "cards",
  "make-current": "plans",
  live: "live",
  "next-prompt": "live",
} as const satisfies Record<PromptBoardVisualState["kind"], keyof PromptBoardVideoContent["ui"]["tabs"]>;

function PromptCard({
  content,
  prompt,
  selected,
}: {
  readonly content: PromptBoardVideoContent;
  readonly prompt: PromptBoardVideoContent["prompts"][number];
  readonly selected: boolean;
}) {
  const categoryLabels = {
    "talking-point": content.ui.promptStatusLabels.talkingPoint,
    question: content.ui.promptStatusLabels.question,
  } as const;
  const segmentLabels = {
    main: content.ui.segmentLabels.main,
    closing: content.ui.segmentLabels.closing,
  } as const;

  return (
    <article
      style={{
        minHeight: 184,
        padding: 32,
        border: `2px solid ${selected ? TOKENS.primaryStrong : TOKENS.border}`,
        borderRadius: TOKENS.radius,
        background: selected ? TOKENS.primarySoft : TOKENS.surfaceMuted,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <span
          style={{ color: TOKENS.primaryStrong, fontSize: TOKENS.semanticLabelFontSize, fontWeight: 900 }}
        >
          #{prompt.order + 1}
        </span>
        <span style={{ color: TOKENS.muted, fontSize: TOKENS.semanticLabelFontSize, fontWeight: 700 }}>
          {categoryLabels[prompt.category]}
        </span>
      </div>
      <h3 style={{ margin: "24px 0 0", fontSize: 36, lineHeight: 1.4 }}>{prompt.body}</h3>
      <p style={{ margin: "20px 0 0", color: TOKENS.muted, fontSize: TOKENS.semanticLabelFontSize }}>
        {segmentLabels[prompt.segment]} · {content.ui.toneLabels[prompt.tone]}
      </p>
    </article>
  );
}

function PlanPanel({
  content,
  state,
}: {
  readonly content: PromptBoardVideoContent;
  readonly state: Extract<
    PromptBoardVisualState,
    { readonly kind: "plan-editor" | "plan-created" | "make-current" }
  >;
}) {
  const presentation = (() => {
    switch (state.kind) {
      case "plan-editor":
        return {
          title: content.plan.title.slice(0, state.typedCharacters),
          editing: true,
          settled: false,
          pressed: false,
        };
      case "plan-created":
        return { title: content.plan.title, editing: false, settled: false, pressed: false };
      case "make-current":
        return { title: content.plan.title, editing: false, settled: state.settled, pressed: !state.settled };
      default:
        return unreachable(state);
    }
  })();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: presentation.editing ? "1fr" : "0.82fr 1.18fr",
        gap: 32,
      }}
    >
      <div style={{ padding: 32, border: `2px solid ${TOKENS.border}`, borderRadius: TOKENS.radius }}>
        <div style={{ fontSize: TOKENS.semanticLabelFontSize, fontWeight: 900 }}>{content.ui.newPlan}</div>
        <div
          style={{
            minHeight: 72,
            marginTop: 24,
            padding: "16px 24px",
            border: `2px solid ${TOKENS.primary}`,
            borderRadius: TOKENS.radius,
            background: TOKENS.surfaceMuted,
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          {presentation.title}
        </div>
      </div>
      {presentation.editing ? null : (
        <article style={{ padding: 32, border: `2px solid ${TOKENS.border}`, borderRadius: TOKENS.radius }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <h2 style={{ margin: 0, fontSize: 40 }}>{content.plan.title}</h2>
            <span
              style={{ color: TOKENS.primaryStrong, fontSize: TOKENS.semanticLabelFontSize, fontWeight: 900 }}
            >
              {presentation.settled ? content.ui.planStatusLabels.live : content.ui.planStatusLabels.idea}
            </span>
          </div>
          <div
            style={{
              marginTop: 56,
              padding: "20px 32px",
              borderRadius: TOKENS.radius,
              background:
                presentation.settled || presentation.pressed ? TOKENS.primaryStrong : TOKENS.primary,
              color: TOKENS.background,
              fontSize: TOKENS.semanticLabelFontSize,
              fontWeight: 900,
              textAlign: "center",
              transform: `scale(${presentation.pressed ? 0.97 : 1})`,
            }}
          >
            {content.ui.makeCurrent}
          </div>
        </article>
      )}
    </div>
  );
}

function LivePanel({
  content,
  state,
}: {
  readonly content: PromptBoardVideoContent;
  readonly state: Extract<PromptBoardVisualState, { readonly kind: "live" | "next-prompt" }>;
}) {
  const selectedPrompt =
    state.kind === "next-prompt"
      ? content.prompts[0]
      : (content.prompts.find(({ id }) => id === state.selectedPromptId) ?? null);
  const showNext = state.kind === "next-prompt" || state.selectedPromptId === content.prompts[0].id;
  const nextPressed = state.kind === "next-prompt" && state.pressed;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 32 }}>
      <aside style={{ display: "grid", gap: 16 }}>
        {content.prompts.slice(0, 2).map((prompt) => (
          <PromptCard
            content={content}
            key={prompt.id}
            prompt={prompt}
            selected={prompt.id === selectedPrompt?.id}
          />
        ))}
      </aside>
      <div
        style={{
          minHeight: 448,
          padding: 48,
          border: `2px solid ${TOKENS.primary}`,
          borderRadius: TOKENS.radius,
          background: TOKENS.surfaceMuted,
        }}
      >
        <div style={{ color: TOKENS.primaryStrong, fontSize: TOKENS.semanticLabelFontSize, fontWeight: 900 }}>
          {content.ui.planStatusLabels.live}
        </div>
        <h2 style={{ margin: "48px 0 0", fontSize: 56, lineHeight: 1.35 }}>{selectedPrompt?.body}</h2>
        {showNext ? (
          <div
            style={{
              marginTop: 72,
              padding: "20px 32px",
              borderRadius: TOKENS.radius,
              background: nextPressed ? TOKENS.primaryStrong : TOKENS.primary,
              color: TOKENS.background,
              fontSize: TOKENS.semanticLabelFontSize,
              fontWeight: 900,
              textAlign: "center",
              transform: `scale(${nextPressed ? 0.97 : 1})`,
            }}
          >
            {content.ui.nextPrompt}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function panelFor(content: PromptBoardVideoContent, state: PromptBoardVisualState): ReactNode {
  switch (state.kind) {
    case "plan-editor":
    case "plan-created":
    case "make-current":
      return <PlanPanel content={content} state={state} />;
    case "cards":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
          {content.prompts.slice(0, state.visibleCards).map((prompt) => (
            <PromptCard content={content} key={prompt.id} prompt={prompt} selected={false} />
          ))}
        </div>
      );
    case "live":
    case "next-prompt":
      return <LivePanel content={content} state={state} />;
    default:
      return unreachable(state);
  }
}

export function PromptBoardMock({ content, state, opacity, scale, translateY }: PromptBoardMockProps) {
  const activeTab = ACTIVE_TAB[state.kind];
  const rootStyle: CSSProperties = {
    position: "absolute",
    inset: TOKENS.uiInset,
    overflow: "hidden",
    opacity,
    transform: `translateY(${translateY}px) scale(${scale})`,
    border: `2px solid ${TOKENS.border}`,
    borderRadius: TOKENS.radius,
    background: TOKENS.surface,
    color: TOKENS.foreground,
    fontFamily: PROMPT_BOARD_FONT_FAMILY,
  };

  return (
    <main style={rootStyle}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 40px",
          borderBottom: `2px solid ${TOKENS.border}`,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 40 }}>{content.ui.productTitle}</h1>
        <nav style={{ display: "flex", gap: 16 }}>
          {Object.entries(content.ui.tabs).map(([key, label]) => (
            <span
              key={key}
              style={{
                padding: "12px 20px",
                borderBottom: `4px solid ${key === activeTab ? TOKENS.primaryStrong : "transparent"}`,
                color: key === activeTab ? TOKENS.foreground : TOKENS.muted,
                fontSize: TOKENS.semanticLabelFontSize,
                fontWeight: 900,
              }}
            >
              {label}
            </span>
          ))}
        </nav>
      </header>
      <section style={{ padding: 40 }}>{panelFor(content, state)}</section>
    </main>
  );
}
