export const defaultFileNamePartMaxLength = 32;

export const sanitizeFileNamePart = (value: string, maxLength = defaultFileNamePartMaxLength) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, maxLength);

export const createHandoffFileNameBase = (date: string, title: string, fallback = "thumbnail") =>
  [date.replaceAll("-", ""), sanitizeFileNamePart(title)].filter(Boolean).join("_") || fallback;

export const createNumberedFilePattern = (parts: readonly string[], fallback = "thumbnail_{n}") => {
  const pattern = [...parts.map((part) => sanitizeFileNamePart(part)), "{n}"].filter(Boolean).join("_");
  return pattern || fallback;
};
