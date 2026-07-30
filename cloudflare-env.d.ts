import type { CommentTranslatorC1ContainerNamespace } from "./lib/comment-translator-c1-container-boundary";

declare global {
  interface CloudflareEnv {
    readonly COMMENT_TRANSLATOR_C1_CONTAINER: CommentTranslatorC1ContainerNamespace;
  }
}

export {};
