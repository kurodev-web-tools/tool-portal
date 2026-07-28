import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  CONTROL_PIPE_NAME,
  createEphemeralState,
  decodeControlRequest,
  readHiddenInput,
} from "./comment-translator-creator-c1-ephemeral-runner.mjs";

class FakeInput extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this.rawModeChanges = [];
  }

  setRawMode(enabled) {
    this.rawModeChanges.push(enabled);
  }

  resume() {}

  pause() {}
}

function createFakeOutput() {
  const chunks = [];

  return {
    chunks,
    write(chunk) {
      chunks.push(String(chunk));
    },
  };
}

async function verifyHiddenInput() {
  const input = new FakeInput();
  const output = createFakeOutput();
  const generatedInput = Buffer.alloc(3, 0x61);
  const resultPromise = readHiddenInput({
    input,
    output,
    prompt: "入力 1: ",
  });

  input.emit("data", generatedInput);
  input.emit("data", Buffer.from([0x0d]));

  const result = await resultPromise;

  assert.deepEqual(result, generatedInput);
  assert.deepEqual(input.rawModeChanges, [true, false]);
  assert.equal(output.chunks.join(""), "入力 1: \n");
  result.fill(0);
  generatedInput.fill(0);
}

function verifyHeldStateAndTermination() {
  const first = Buffer.alloc(4, 0x61);
  const second = Buffer.alloc(5, 0x62);
  const state = createEphemeralState();

  assert.equal(state.control("presence"), "input_presence=incomplete");
  assert.equal(state.control("status"), "runner_status=awaiting-input");

  state.hold(first, second);

  assert.equal(state.control("presence"), "input_presence=complete");
  assert.equal(state.control("status"), "runner_status=held-idle");
  assert.equal(state.control("unknown"), "control_status=rejected");
  assert.equal(state.control("stop"), "termination_status=stopping");
  assert.equal(first.every((byte) => byte === 0), true);
  assert.equal(second.every((byte) => byte === 0), true);
  assert.equal(state.control("presence"), "input_presence=incomplete");
  assert.equal(state.control("status"), "runner_status=terminated");
}

function verifyWindowsControlLine() {
  const request = Buffer.from([0x70, 0x72, 0x65, 0x73, 0x65, 0x6e, 0x63, 0x65, 0x0d]);

  assert.equal(decodeControlRequest(request), "presence");
  request.fill(0);
}

async function verifyFixedWrapper() {
  const wrapperUrl = new URL(
    "./comment-translator-creator-c1-ephemeral-runner.ps1",
    import.meta.url,
  );
  const wrapperSource = await readFile(wrapperUrl, "utf8");

  assert.match(wrapperSource, /ValidateSet\("start", "presence", "status", "stop"\)/);
  assert.match(wrapperSource, /NamedPipeClientStream/);
  assert.match(wrapperSource, /Start-Process/);
  assert.doesNotMatch(wrapperSource, /Write-Host/);
  assert.doesNotMatch(wrapperSource, /Write-Verbose/);
  assert.doesNotMatch(wrapperSource, /Write-Debug/);
  assert.doesNotMatch(wrapperSource, /\.(Read|Write)Timeout\s*=/);

  const absentStatus = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      fileURLToPath(wrapperUrl),
      "status",
    ],
    { encoding: "utf8" },
  );

  assert.equal(absentStatus.status, 1);
  assert.equal(absentStatus.stdout.trim(), "runner_status=not-running");
  assert.equal(absentStatus.stderr, "");
}

assert.equal(
  CONTROL_PIPE_NAME,
  "comment-translator-creator-c1-ephemeral-runner-v1",
);
await verifyHiddenInput();
verifyHeldStateAndTermination();
verifyWindowsControlLine();
await verifyFixedWrapper();

process.stdout.write(
  "comment-translator-creator-c1-ephemeral-runner-contract: pass\n",
);
