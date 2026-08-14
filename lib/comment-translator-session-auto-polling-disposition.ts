export type CommentTranslatorAutoPollingDispositionInput = {
  readonly status: "active" | "not-started" | "stopped" | "fail-closed";
};

export function resolveCommentTranslatorAutoPollingDisposition(
  state: CommentTranslatorAutoPollingDispositionInput
): "continue" | "halted" {
  return state.status === "active" ? "continue" : "halted";
}
