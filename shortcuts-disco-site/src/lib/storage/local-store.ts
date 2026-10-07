"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny external store over one versioned localStorage key.
 *
 * Every component reads the same value, a write notifies all of them (and,
 * through the `storage` event, other tabs), and the server snapshot is the
 * default so statically exported pages hydrate without a mismatch.
 */
export interface LocalStore<T> {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
  update: (updater: (current: T) => T) => void;
}

export function createLocalStore<T>(options: {
  key: string;
  defaultValue: T;
  /** Turns the parsed JSON payload into a value; return undefined if invalid. */
  read: (payload: unknown) => T | undefined;
  /** Turns a value into the JSON payload that is written. */
  write: (value: T) => unknown;
}): LocalStore<T> {
  const { key, defaultValue } = options;
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } = {
    raw: null,
    value: defaultValue,
  };
  let storageListening = false;

  const readRaw = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const getSnapshot = (): T => {
    const raw = readRaw();
    if (raw === cache.raw) return cache.value;
    let value: T = defaultValue;
    if (raw !== null) {
      try {
        value = options.read(JSON.parse(raw)) ?? defaultValue;
      } catch {
        value = defaultValue;
      }
    }
    cache = { raw, value };
    return value;
  };

  const notify = () => listeners.forEach((listener) => listener());

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) notify();
  };

  return {
    getSnapshot,
    getServerSnapshot: () => defaultValue,
    subscribe(listener) {
      listeners.add(listener);
      if (!storageListening && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        storageListening = true;
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && storageListening) {
          window.removeEventListener("storage", onStorage);
          storageListening = false;
        }
      };
    },
    update(updater) {
      const next = updater(getSnapshot());
      try {
        localStorage.setItem(key, JSON.stringify(options.write(next)));
      } catch (error) {
        console.error(`Failed to save ${key} to local storage:`, error);
        return;
      }
      notify();
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

const subscribeNever = () => () => {};

/** False during server rendering and hydration, true once on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
