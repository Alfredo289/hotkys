import type { Platform } from "@/lib/model/internal/internal-models";
import { createLocalStore } from "@/lib/storage/local-store";

export const PREFERENCES_STORAGE_KEY = "hotkys:preferences:v1";

export type ViewMode = "list" | "cheatsheet";

export interface Preferences {
  /** null shows every platform. */
  platformFilter: Platform | null;
  viewMode: ViewMode;
  columnCount: number;
}

export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 6;

export const defaultPreferences: Preferences = {
  platformFilter: "macos",
  viewMode: "list",
  columnCount: 4,
};

const PLATFORMS: Platform[] = ["macos", "windows", "linux"];

export const preferencesStore = createLocalStore<Preferences>({
  key: PREFERENCES_STORAGE_KEY,
  defaultValue: defaultPreferences,
  read(payload) {
    if (typeof payload !== "object" || payload === null) return undefined;
    const stored = payload as Record<string, unknown>;
    if (stored.version !== 1) return undefined;
    const filter = stored.platformFilter;
    const columns = stored.columnCount;
    return {
      platformFilter:
        filter === "all"
          ? null
          : PLATFORMS.includes(filter as Platform)
            ? (filter as Platform)
            : defaultPreferences.platformFilter,
      viewMode:
        stored.viewMode === "cheatsheet" || stored.viewMode === "list"
          ? stored.viewMode
          : defaultPreferences.viewMode,
      columnCount:
        typeof columns === "number" &&
        Number.isInteger(columns) &&
        columns >= MIN_COLUMNS &&
        columns <= MAX_COLUMNS
          ? columns
          : defaultPreferences.columnCount,
    };
  },
  write: (preferences) => ({
    version: 1,
    ...preferences,
    platformFilter: preferences.platformFilter ?? "all",
  }),
});
