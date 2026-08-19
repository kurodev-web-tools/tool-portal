import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig();
const previewBuildEnabled =
  process.env.COMMENT_TRANSLATOR_PREVIEW_BUILD === "true";

const openNextConfig = previewBuildEnabled
  ? {
      ...cloudflareConfig,
      buildCommand:
        "node scripts/comment-translator-open-next-middleware-manifest-runtime-repair.mjs"
    }
  : cloudflareConfig;

export default openNextConfig;
