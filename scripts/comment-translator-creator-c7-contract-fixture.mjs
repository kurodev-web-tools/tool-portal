import { createHash } from "node:crypto";

export const nowMs = Date.parse("2026-07-23T00:00:00.000Z");
export const expiresAtMs = nowMs + 15 * 60 * 1000;
export const ownerAuthorization = { status: "authorized", ownerUserId: "creator-owner-a" };
export const otherOwnerAuthorization = { status: "authorized", ownerUserId: "creator-owner-b" };
export const unauthenticated = { status: "unauthenticated", reason: "caller-not-authenticated" };

export function createSessionAuthority() {
  const sessions = new Map([
    [ownerAuthorization.ownerUserId, {
      status: "active",
      sessionReferenceId: "server-session-a",
      expiresAtMs
    }],
    [otherOwnerAuthorization.ownerUserId, {
      status: "active",
      sessionReferenceId: "server-session-b",
      expiresAtMs
    }]
  ]);
  return {
    sessions,
    async readCurrentForOwner(ownerUserId) {
      return sessions.get(ownerUserId) ?? { status: "unavailable", reason: "active-session-missing" };
    }
  };
}

export function createTokenStore() {
  const recordsByOwner = new Map();
  return {
    recordsByOwner,
    async readCurrent({ ownerUserId, scope }) {
      const record = recordsByOwner.get(ownerUserId) ?? null;
      return record?.scope === scope ? record : null;
    },
    async readByDigest({ tokenDigest, scope }) {
      return [...recordsByOwner.values()].find((record) =>
        record.scope === scope && record.tokenDigest === tokenDigest
      ) ?? null;
    },
    async writeCurrent({ record }) {
      const current = recordsByOwner.get(record.ownerUserId);
      if (current && !current.revokedAtIso && Date.parse(current.expiresAtIso) > Date.parse(record.issuedAtIso)) {
        return "current-token-exists";
      }
      recordsByOwner.set(record.ownerUserId, { ...record, version: (current?.version ?? 0) + 1 });
      return "applied";
    },
    async revokeCurrent({ ownerUserId, scope, revokedAtIso }) {
      const current = recordsByOwner.get(ownerUserId);
      if (!current || current.scope !== scope || current.revokedAtIso) return "missing-token";
      recordsByOwner.set(ownerUserId, { ...current, revokedAtIso });
      return "revoked";
    }
  };
}

export function digestToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
