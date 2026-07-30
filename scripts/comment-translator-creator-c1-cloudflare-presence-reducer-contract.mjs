import assert from "node:assert/strict";
import {
  inspectCommentTranslatorC1CloudflarePresence,
} from "./comment-translator-creator-c1-cloudflare-presence-reducer.mjs";

const expectedRevision = "918ba6b3646baa40965a6b22f475159b7dd7e90f";
const versionId = "11111111-1111-4111-8111-111111111111";
const calls = [];
const exact = inspectCommentTranslatorC1CloudflarePresence({
  run(args) {
    calls.push(args);
    if (args[0] === "deployments") {
      return {
        ok: true,
        value: {
          versions: [{ version_id: versionId, percentage: 100 }],
        },
      };
    }
    if (args[0] === "versions") {
      return {
        ok: true,
        value: {
          annotations: {
            "workers/tag": `git-${expectedRevision}`,
            "workers/message": `revision:${expectedRevision}`,
          },
          resources: {
            script: { handlers: ["CommentTranslatorC1Container"] },
            bindings: [{
              name: "COMMENT_TRANSLATOR_C1_CONTAINER",
              type: "durable_object_namespace",
            }],
          },
        },
      };
    }
    return {
      ok: true,
      value: [{
        name: "v-streamer-tools-CommentTranslatorC1Container",
        state: "ready",
      }],
    };
  },
});

assert.deepEqual(exact, {
  inspectionStatus: "pass",
  targetLabel: "production-worker",
  deploymentPresence: "present",
  exactRevisionStatus: "present",
  bindingPresence: "present",
  containerConfigurationPresence: "present",
  rolloutStatus: "single-100-percent",
  activeVersionCount: 1,
  rollbackOwner: "repository-deployment-owner",
  outputReviewer: "task-executing-reviewer",
  safeOneReadReducerStatus: "reviewed",
  remoteMetadataReadCount: 3,
  privateMetadataOutputCount: 0,
});
assert.deepEqual(calls, [
  ["deployments", "status", "--name", "v-streamer-tools", "--json"],
  ["versions", "view", versionId, "--name", "v-streamer-tools", "--json"],
  ["containers", "list", "--json"],
]);

const absent = inspectCommentTranslatorC1CloudflarePresence({
  run(args) {
    if (args[0] === "deployments") {
      return {
        ok: true,
        value: {
          versions: [{ version_id: versionId, percentage: 100 }],
        },
      };
    }
    if (args[0] === "versions") {
      return {
        ok: true,
        value: { annotations: {}, resources: { script: {}, bindings: [] } },
      };
    }
    return { ok: true, value: [] };
  },
});
assert.equal(absent.inspectionStatus, "pass");
assert.equal(absent.exactRevisionStatus, "absent");
assert.equal(absent.bindingPresence, "absent");
assert.equal(absent.containerConfigurationPresence, "absent");

const blocked = inspectCommentTranslatorC1CloudflarePresence({
  run() {
    return { ok: false };
  },
});
assert.deepEqual(blocked, {
  inspectionStatus: "blocked",
  blocker: "cloudflare-deployment-status-control-plane-unavailable",
  remoteMetadataReadCount: 1,
  privateMetadataOutputCount: 0,
});

const localUnavailable = inspectCommentTranslatorC1CloudflarePresence({
  checkWrangler() {
    return false;
  },
  run() {
    throw new Error("remote inspection must not run");
  },
});
assert.deepEqual(localUnavailable, {
  inspectionStatus: "blocked",
  blocker: "local-wrangler-command-unavailable",
  remoteMetadataReadCount: 0,
  privateMetadataOutputCount: 0,
});

process.stdout.write(
  "comment_translator_creator_c1_cloudflare_presence_reducer_contract=pass\n",
);
