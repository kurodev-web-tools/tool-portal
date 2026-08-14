export function createCommentTranslatorSessionResponseGeneration() {
  let currentGeneration = 0;
  let nextSessionCommandRequestId = 0;
  let activeSessionCommand: {
    readonly requestId: number;
    readonly kind: "initial-status" | "user-command";
  } | null = null;

  return {
    capture() {
      return currentGeneration;
    },
    advance() {
      currentGeneration += 1;
      return currentGeneration;
    },
    tryBeginSessionCommand(kind: "initial-status" | "user-command") {
      if (activeSessionCommand && !(activeSessionCommand.kind === "initial-status" && kind === "initial-status")) {
        return null;
      }
      nextSessionCommandRequestId += 1;
      activeSessionCommand = { requestId: nextSessionCommandRequestId, kind };
      currentGeneration += 1;
      return {
        requestId: activeSessionCommand.requestId,
        responseGeneration: currentGeneration
      };
    },
    finishSessionCommand(requestId: number) {
      if (activeSessionCommand?.requestId !== requestId) return false;
      activeSessionCommand = null;
      return true;
    },
    isSessionCommandInFlight() {
      return activeSessionCommand !== null;
    },
    isCurrent(generation: number) {
      return generation === currentGeneration;
    }
  };
}
