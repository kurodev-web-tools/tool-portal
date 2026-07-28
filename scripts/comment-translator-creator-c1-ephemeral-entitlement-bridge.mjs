const BRIDGE_UNAVAILABLE_MESSAGE = "paid entitlement bridge unavailable";

export function createPaidEntitlementReadBridge({
  createStore,
  readReference,
}) {
  if (typeof createStore !== "function" || typeof readReference !== "string") {
    throw new TypeError(BRIDGE_UNAVAILABLE_MESSAGE);
  }

  return async function readPaidEntitlement(first, second, signal) {
    if (
      !Buffer.isBuffer(first) ||
      !Buffer.isBuffer(second) ||
      first.length === 0 ||
      second.length === 0 ||
      typeof signal?.aborted !== "boolean" ||
      signal.aborted
    ) {
      throw new TypeError(BRIDGE_UNAVAILABLE_MESSAGE);
    }

    try {
      const factoryResult = await createStore(first, second);
      if (
        signal.aborted ||
        factoryResult?.status !== "ready" ||
        typeof factoryResult.store?.readByBillingUserReference !== "function"
      ) {
        throw new TypeError(BRIDGE_UNAVAILABLE_MESSAGE);
      }

      const record =
        await factoryResult.store.readByBillingUserReference(readReference);
      if (signal.aborted) {
        throw new TypeError(BRIDGE_UNAVAILABLE_MESSAGE);
      }
      return record === null ? "missing" : "available";
    } catch {
      throw new Error(BRIDGE_UNAVAILABLE_MESSAGE);
    }
  };
}
