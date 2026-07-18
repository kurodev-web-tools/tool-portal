"use client";

import { useSyncExternalStore } from "react";

export const workspaceSidebarStates = ["expanded", "rail"] as const;
export type PortalWorkspaceSidebarState = (typeof workspaceSidebarStates)[number];

export const portalWorkspaceSidebarStorageKey = "v-streamer-tools-portal-workspace-sidebar";
export const portalWorkspaceSidebarStorageVersion = 2;
export const defaultPortalWorkspaceSidebarState: PortalWorkspaceSidebarState = "expanded";

const listeners = new Set<() => void>();
let volatileState: PortalWorkspaceSidebarState = defaultPortalWorkspaceSidebarState;

function isPortalWorkspaceSidebarState(value: unknown): value is PortalWorkspaceSidebarState {
  return workspaceSidebarStates.some((state) => state === value);
}

export function parsePortalWorkspaceSidebarState(raw: string | null): PortalWorkspaceSidebarState {
  if (raw === null) {
    return defaultPortalWorkspaceSidebarState;
  }

  try {
    const payload: unknown = JSON.parse(raw);
    if (typeof payload !== "object" || payload === null || !("version" in payload) || !("state" in payload)) {
      return defaultPortalWorkspaceSidebarState;
    }

    if (payload.version === 1) {
      if (payload.state === "hidden") {
        return "rail";
      }

      return isPortalWorkspaceSidebarState(payload.state) ? payload.state : defaultPortalWorkspaceSidebarState;
    }

    if (payload.version !== portalWorkspaceSidebarStorageVersion || !isPortalWorkspaceSidebarState(payload.state)) {
      return defaultPortalWorkspaceSidebarState;
    }

    return payload.state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return defaultPortalWorkspaceSidebarState;
    }
    throw error;
  }
}

function readPortalWorkspaceSidebarState(): PortalWorkspaceSidebarState {
  try {
    const raw = window.localStorage.getItem(portalWorkspaceSidebarStorageKey);
    volatileState = parsePortalWorkspaceSidebarState(raw);
    return volatileState;
  } catch (error) {
    if (error instanceof DOMException) {
      return volatileState;
    }
    throw error;
  }
}

function subscribeToPortalWorkspaceSidebarState(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === portalWorkspaceSidebarStorageKey) {
      onStoreChange();
    }
  };

  listeners.add(onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function subscribeToDisabledState(): () => void {
  return () => undefined;
}

function getDefaultState(): PortalWorkspaceSidebarState {
  return defaultPortalWorkspaceSidebarState;
}

export function setPortalWorkspaceSidebarState(nextState: PortalWorkspaceSidebarState): void {
  volatileState = nextState;

  try {
    window.localStorage.setItem(
      portalWorkspaceSidebarStorageKey,
      JSON.stringify({ version: portalWorkspaceSidebarStorageVersion, state: nextState })
    );
  } catch (error) {
    if (!(error instanceof DOMException)) {
      throw error;
    }
  }

  listeners.forEach((listener) => listener());
}

export function usePortalWorkspaceSidebarState(enabled: boolean): PortalWorkspaceSidebarState {
  return useSyncExternalStore(
    enabled ? subscribeToPortalWorkspaceSidebarState : subscribeToDisabledState,
    enabled ? readPortalWorkspaceSidebarState : getDefaultState,
    getDefaultState
  );
}
