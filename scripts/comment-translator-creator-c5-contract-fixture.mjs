export const ownerAuthorization = { status: "authorized", ownerUserId: "server-only-owner-a" };
export const otherOwnerAuthorization = { status: "authorized", ownerUserId: "server-only-owner-b" };
export const unauthenticated = { status: "unavailable", reason: "caller-not-authenticated", reconnectRequired: true };
export const nowMs = Date.parse("2026-07-22T00:00:00.000Z");
export const expiresAtMs = nowMs + 3_600_000;

export function createSessionAuthority() {
  const sessions = new Map([
    [ownerAuthorization.ownerUserId, { status: "active", sessionReferenceId: "server-session-a", expiresAtMs }],
    [otherOwnerAuthorization.ownerUserId, { status: "active", sessionReferenceId: "server-session-b", expiresAtMs }]
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
      return [...recordsByOwner.values()].find((record) => record.scope === scope && record.tokenDigest === tokenDigest) ?? null;
    },
    async writeCurrent({ mode, record }) {
      const current = recordsByOwner.get(record.ownerUserId) ?? null;
      const isCurrent = current && !current.revokedAtIso && Date.parse(current.expiresAtIso) > Date.parse(record.issuedAtIso);
      if (mode === "issue" && isCurrent) return "current-token-exists";
      if (mode === "rotate" && !isCurrent) return "missing-current-token";
      recordsByOwner.set(record.ownerUserId, { ...record, version: (current?.version ?? 0) + 1 });
      return "applied";
    },
    async revokeCurrent({ ownerUserId, scope, revokedAtIso }) {
      const current = recordsByOwner.get(ownerUserId) ?? null;
      if (!current || current.scope !== scope || current.revokedAtIso) return "missing-token";
      recordsByOwner.set(ownerUserId, { ...current, revokedAtIso });
      return "revoked";
    }
  };
}
