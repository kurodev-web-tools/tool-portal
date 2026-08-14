import generatedWorker from "../.open-next/worker.js";

const openNextWorker = generatedWorker;
const maintenancePath = "/api/comment-translator/paid-maintenance";

export default {
  fetch(request, env, ctx) {
    return generatedWorker.fetch(request, env, ctx);
  },

  scheduled(_controller, env, ctx) {
    if (env.COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY !== "cloudflare-cron-fallback") {
      return;
    }
    const cronToken = env.COMMENT_TRANSLATOR_PAID_CRON_TOKEN?.trim();
    if (!cronToken) {
      return;
    }
    ctx.waitUntil(openNextWorker.fetch(new Request(`https://worker.internal${maintenancePath}`, {
      method: "GET",
      headers: {
        "x-comment-translator-paid-cron-token": cronToken,
        "x-comment-translator-paid-scheduler-authority": "cloudflare-cron-fallback"
      }
    }), env, ctx));
  }
};
