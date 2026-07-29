import "server-only";

type SanitizedContainerResult = Readonly<{
  executionStatus: "pass" | "fail-closed";
  resultStatus: "available" | "missing" | "unavailable";
  terminationStatus: string;
  parentExitCodeObserved: boolean;
  childExitCodeObserved: boolean;
  parentBufferZeroFillCount: number;
  childBufferZeroFillCount: number;
  childConstructionAttemptCount: number;
  childReadAttemptCount: number;
}>;

type CommentTranslatorC1ContainerStub = {
  readonly runAttempt: (
    attemptKey: string,
    input: ReadableStream<Uint8Array>
  ) => Promise<SanitizedContainerResult>;
};

export const commentTranslatorC1ContainerBoundaryContract = {
  status: "production-boundary-disconnected-inert",
  inputOwnership: "worker-byte-stream-transferred-to-container-do-parent-stdin",
  privateInputCount: 3,
  persistentState: "opaque-attempt-key-and-inflight-settled-aborted-only",
  productionRead: "not-connected",
  safeFallback: "free-or-paid-inactive",
} as const;

export async function runCommentTranslatorC1ContainerBoundary({
  container,
  attemptKey,
  endpoint,
  credential,
  billingReference,
}: {
  readonly container: CommentTranslatorC1ContainerStub;
  readonly attemptKey: string;
  readonly endpoint: Uint8Array;
  readonly credential: Uint8Array;
  readonly billingReference: Uint8Array;
}): Promise<SanitizedContainerResult> {
  const inputs = [endpoint, credential, billingReference];
  if (
    !/^[a-f0-9]{64}$/.test(attemptKey)
    || inputs.some((input) => !(input instanceof Uint8Array) || input.byteLength === 0)
    || new Set(inputs.map((input) => input.buffer)).size !== 3
  ) {
    zeroFill(inputs);
    return unavailable("invalid-worker-boundary");
  }

  const frame = encodeFrame(inputs);
  const input = new ReadableStream<Uint8Array>({
    type: "bytes",
    start(controller) {
      controller.enqueue(frame);
      controller.close();
    },
  });

  try {
    return await container.runAttempt(attemptKey, input);
  } catch {
    return unavailable("container-boundary-unavailable");
  } finally {
    zeroFill(inputs);
    if (frame.byteLength > 0) frame.fill(0);
  }
}

function encodeFrame(inputs: readonly Uint8Array[]) {
  const length = inputs.reduce((total, input) => total + 4 + input.byteLength, 0);
  const frame = new Uint8Array(length);
  const view = new DataView(frame.buffer);
  let offset = 0;
  for (const input of inputs) {
    view.setUint32(offset, input.byteLength);
    offset += 4;
    frame.set(input, offset);
    offset += input.byteLength;
  }
  return frame;
}

function zeroFill(inputs: readonly Uint8Array[]) {
  for (const input of inputs) input.fill(0);
}

function unavailable(terminationStatus: string): SanitizedContainerResult {
  return Object.freeze({
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    terminationStatus,
    parentExitCodeObserved: false,
    childExitCodeObserved: false,
    parentBufferZeroFillCount: 0,
    childBufferZeroFillCount: 0,
    childConstructionAttemptCount: 0,
    childReadAttemptCount: 0,
  });
}
