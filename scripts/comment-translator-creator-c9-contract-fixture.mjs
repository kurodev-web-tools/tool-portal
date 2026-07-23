import { createHash } from "node:crypto";

export const ownerAuthorization = { status: "authorized", ownerUserId: "creator-owner-a" };
export const otherOwnerAuthorization = { status: "authorized", ownerUserId: "creator-owner-b" };
export const unauthenticated = { status: "unauthenticated", reason: "caller-not-authenticated" };
export const nowIso = "2026-07-23T06:00:00.000Z";

export function createDictionaryStore() {
  const entriesByOwner = new Map();

  function readOwnerEntries(ownerUserId) {
    return entriesByOwner.get(ownerUserId) ?? [];
  }

  return {
    entriesByOwner,
    async readCurrent({ ownerUserId }) {
      return readOwnerEntries(ownerUserId).map((entry) => ({ ...entry }));
    },
    async createEntry({ ownerUserId, entry }) {
      const entries = readOwnerEntries(ownerUserId);
      const collision = entries.find((candidate) =>
        candidate.sourceLanguage === entry.sourceLanguage &&
        candidate.targetLanguage === entry.targetLanguage &&
        candidate.normalizedTerm === entry.normalizedTerm
      );
      if (collision) {
        return collision.replacement === entry.replacement ? "duplicate-entry" : "conflicting-entry";
      }
      if (entries.length >= 30) return "term-limit-reached";
      entriesByOwner.set(ownerUserId, [...entries, { ...entry, ownerUserId }]);
      return "applied";
    },
    async updateEntry({ ownerUserId, entryId, expectedUpdatedAtIso, entry }) {
      const entries = readOwnerEntries(ownerUserId);
      const index = entries.findIndex((candidate) => candidate.entryId === entryId);
      if (index < 0) return "entry-missing";
      if (entries[index].updatedAtIso !== expectedUpdatedAtIso) return "stale-entry";
      const collision = entries.find((candidate) =>
        candidate.entryId !== entryId &&
        candidate.sourceLanguage === entry.sourceLanguage &&
        candidate.targetLanguage === entry.targetLanguage &&
        candidate.normalizedTerm === entry.normalizedTerm
      );
      if (collision) return "conflicting-entry";
      const current = entries[index];
      if (
        current.term === entry.term && current.normalizedTerm === entry.normalizedTerm &&
        current.replacement === entry.replacement && current.note === entry.note &&
        current.sourceLanguage === entry.sourceLanguage && current.targetLanguage === entry.targetLanguage
      ) return "unchanged";
      entriesByOwner.set(ownerUserId, entries.map((candidate) =>
        candidate.entryId === entryId ? { ...candidate, ...entry } : candidate
      ));
      return "applied";
    },
    async deleteEntry({ ownerUserId, entryId, expectedUpdatedAtIso }) {
      const entries = readOwnerEntries(ownerUserId);
      const current = entries.find((candidate) => candidate.entryId === entryId);
      if (!current) return "entry-missing";
      if (current.updatedAtIso !== expectedUpdatedAtIso) return "stale-entry";
      entriesByOwner.set(ownerUserId, entries.filter((candidate) => candidate.entryId !== entryId));
      return "applied";
    }
  };
}

export function expectedDictionaryVersion(entries) {
  if (entries.length === 0) return null;
  const canonical = entries
    .map(({ normalizedTerm, replacement, sourceLanguage, targetLanguage }) =>
      [sourceLanguage, targetLanguage, normalizedTerm, replacement].join("\u0000")
    )
    .sort()
    .join("\u0001");
  return `ctdict-${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}
