"use client";

import { useCallback } from "react";
import { useHydrated, useLocalStore } from "@/lib/storage/local-store";
import {
  preferencesStore,
  type Preferences,
} from "@/lib/storage/preferences-store";

/** Display preferences, kept in local storage and shared by every component. */
export function usePreferences() {
  const preferences = useLocalStore(preferencesStore);
  const hydrated = useHydrated();
  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) =>
      preferencesStore.update((current) => ({ ...current, ...patch })),
    [],
  );
  return { preferences, isLoading: !hydrated, updatePreferences };
}
