"use client";

import { useCallback } from "react";
import type { Platform } from "@/lib/model/internal/internal-models";
import { usePreferences } from "@/lib/hooks/use-preferences";

/**
 * Platform filter state, persisted in local storage.
 * @returns Platform filter (null = all platforms; macOS until changed) and setter
 */
export function usePlatformFilter() {
  const { preferences, updatePreferences } = usePreferences();
  const setPlatformFilter = useCallback(
    (filter: Platform | null) => {
      void updatePreferences({ platformFilter: filter });
    },
    [updatePreferences],
  );
  return { platformFilter: preferences.platformFilter, setPlatformFilter };
}
