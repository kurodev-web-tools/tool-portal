const OWNERSHIP_UNAVAILABLE = "exclusive mutable byte ownership unavailable";
const ownershipStates = new WeakMap();

export function createExclusiveMutableByteOwnership(first, second) {
  if (
    !Buffer.isBuffer(first) ||
    !Buffer.isBuffer(second) ||
    first.length === 0 ||
    second.length === 0 ||
    buffersOverlap(first, second)
  ) {
    zeroizeDistinctBuffers([first, second]);
    throw new TypeError(OWNERSHIP_UNAVAILABLE);
  }

  const ownership = Object.freeze({});
  ownershipStates.set(ownership, {
    first,
    second,
    registeredBuffers: [first, second],
    bound: false,
    transferred: false,
    registryOpen: true,
  });
  return ownership;
}

export function bindExclusiveMutableByteOwnership(ownership) {
  const state =
    ownership !== null && typeof ownership === "object"
      ? ownershipStates.get(ownership)
      : null;
  if (!state || state.bound) {
    return null;
  }
  state.bound = true;
  return state;
}

export function createMutableByteRegistrationScope(state) {
  return Object.freeze({
    registerMutableBytes(buffer) {
      if (
        !state.registryOpen ||
        !Buffer.isBuffer(buffer) ||
        buffer.length === 0 ||
        state.registeredBuffers.some((registered) =>
          buffersOverlap(registered, buffer),
        )
      ) {
        if (Buffer.isBuffer(buffer)) {
          buffer.fill(0);
        }
        throw new TypeError("mutable byte registration unavailable");
      }
      state.registeredBuffers.push(buffer);
    },
  });
}

export function closeMutableByteRegistrationScope(state) {
  state.registryOpen = false;
}

export function createClientOwnershipTransfer(state) {
  return Object.freeze({
    take() {
      if (state.transferred) {
        throw new TypeError(OWNERSHIP_UNAVAILABLE);
      }
      state.transferred = true;
      return Object.freeze({
        first: state.first,
        second: state.second,
      });
    },
  });
}

export function ownershipWasTransferred(state) {
  return state.transferred;
}

export function registeredMutableByteCount(state) {
  return state.registeredBuffers.length;
}

export function zeroFilledMutableByteCount(state) {
  return state.registeredBuffers.filter((buffer) =>
    buffer.every((byte) => byte === 0),
  ).length;
}

export function zeroizeAllRegisteredMutableBytes(state) {
  for (const buffer of state.registeredBuffers) {
    buffer.fill(0);
  }
  return state.registeredBuffers.length;
}

function zeroizeDistinctBuffers(buffers) {
  for (const buffer of new Set(buffers.filter(Buffer.isBuffer))) {
    buffer.fill(0);
  }
}

function buffersOverlap(first, second) {
  if (first.buffer !== second.buffer) {
    return false;
  }
  const firstEnd = first.byteOffset + first.byteLength;
  const secondEnd = second.byteOffset + second.byteLength;
  return first.byteOffset < secondEnd && second.byteOffset < firstEnd;
}
