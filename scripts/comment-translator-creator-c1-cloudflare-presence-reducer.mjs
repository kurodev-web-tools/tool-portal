import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const expectedRevision = "918ba6b3646baa40965a6b22f475159b7dd7e90f";
const workerName = "v-streamer-tools";
const bindingName = "COMMENT_TRANSLATOR_C1_CONTAINER";
const className = "CommentTranslatorC1Container";

export function inspectCommentTranslatorC1CloudflarePresence({
  checkWrangler = isWranglerAvailable,
  run = runWrangler,
} = {}) {
  const config = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
  const localConfigurationReady =
    config.name === workerName
    && config.containers?.some(
      (container) =>
        container.class_name === className
        && container.image
          === "./containers/comment-translator-c1/Dockerfile",
    )
    && config.durable_objects?.bindings?.some(
      (binding) =>
        binding.name === bindingName && binding.class_name === className,
    )
    && config.migrations?.some(
      (migration) =>
        migration.tag === "c1-container-v1"
        && migration.new_sqlite_classes?.includes(className),
    );
  if (!localConfigurationReady) {
    return blocked("local-cloudflare-configuration-mismatch", 0);
  }
  if (!checkWrangler()) {
    return blocked("local-wrangler-command-unavailable", 0);
  }

  let remoteMetadataReadCount = 1;
  const deployment = run([
    "deployments",
    "status",
    "--name",
    workerName,
    "--json",
  ]);
  if (!deployment.ok) {
    return blocked(
      "cloudflare-deployment-status-control-plane-unavailable",
      remoteMetadataReadCount,
    );
  }
  const versions = deployment.value?.versions;
  if (
    !Array.isArray(versions)
    || versions.length !== 1
    || versions[0]?.percentage !== 100
    || typeof versions[0]?.version_id !== "string"
  ) {
    return blocked("cloudflare-active-deployment-ambiguous", 1);
  }

  remoteMetadataReadCount += 1;
  const version = run([
    "versions",
    "view",
    versions[0].version_id,
    "--name",
    workerName,
    "--json",
  ]);
  if (!version.ok) return blockedInspection(remoteMetadataReadCount);

  remoteMetadataReadCount += 1;
  const containers = run(["containers", "list", "--json"]);
  if (!containers.ok) return blockedInspection(remoteMetadataReadCount);

  const tag = version.value?.annotations?.["workers/tag"];
  const message = version.value?.annotations?.["workers/message"];
  const exactRevisionStatus =
    tag === `git-${expectedRevision}`
    && message === `revision:${expectedRevision}`
      ? "present"
      : "absent";
  const bindingPresence = version.value?.resources?.bindings?.some(
    (binding) =>
      binding.name === bindingName
      && binding.type === "durable_object_namespace",
  )
    ? "present"
    : "absent";
  const handlerPresence = version.value?.resources?.script?.handlers?.includes(
    className,
  );
  const containerPresence =
    Array.isArray(containers.value)
    && containers.value.some(
      (container) =>
        typeof container.name === "string"
        && container.name.includes(workerName),
    );

  return {
    inspectionStatus: "pass",
    targetLabel: "production-worker",
    deploymentPresence: "present",
    exactRevisionStatus,
    bindingPresence,
    containerConfigurationPresence:
      bindingPresence === "present" && handlerPresence && containerPresence
        ? "present"
        : "absent",
    rolloutStatus: "single-100-percent",
    activeVersionCount: 1,
    rollbackOwner: "repository-deployment-owner",
    outputReviewer: "task-executing-reviewer",
    safeOneReadReducerStatus: "reviewed",
    remoteMetadataReadCount,
    privateMetadataOutputCount: 0,
  };
}

function blockedInspection(remoteMetadataReadCount) {
  return blocked(
    "cloudflare-presence-inspection-unavailable",
    remoteMetadataReadCount,
  );
}

function blocked(blocker, remoteMetadataReadCount) {
  return {
    inspectionStatus: "blocked",
    blocker,
    remoteMetadataReadCount,
    privateMetadataOutputCount: 0,
  };
}

function runWrangler(args) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args],
    {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (result.status !== 0) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(result.stdout) };
  } catch {
    return { ok: false };
  }
}

function isWranglerAvailable() {
  const cliPath = "node_modules/wrangler/bin/wrangler.js";
  if (!fs.existsSync(cliPath)) return false;
  return spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
    windowsHide: true,
  }).status === 0;
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.stdout.write(
    `${JSON.stringify(inspectCommentTranslatorC1CloudflarePresence())}\n`,
  );
}
