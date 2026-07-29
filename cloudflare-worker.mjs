import openNextHandler from "./.open-next/worker.js";

export { CommentTranslatorC1Container } from "./cloudflare/comment-translator-c1-container.mjs";

const worker = {
  fetch: openNextHandler.fetch,
};

export default worker;
