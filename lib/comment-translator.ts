import commentTranslatorEnCopy from "./comment-translator-copy-en.json";
import commentTranslatorJaCopy from "./comment-translator-copy-ja.json";

export * from "./comment-translator-fixture-comments";
export * from "./comment-translator-runtime";
export * from "./comment-translator-snapshot-data";
export * from "./comment-translator-types";

export const commentTranslatorUiCopy = {
  ja: commentTranslatorJaCopy,
  en: commentTranslatorEnCopy
} as const;
