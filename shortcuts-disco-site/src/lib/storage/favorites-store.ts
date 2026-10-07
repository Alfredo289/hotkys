import { createLocalStore } from "@/lib/storage/local-store";

export const FAVORITES_STORAGE_KEY = "hotkys:favorites:v1";

/**
 * A favorite of a catalog item. Shortcut favorites carry the frozen base
 * shortcut identity so they survive catalog changes that keep the shortcut.
 */
export interface LocalFavorite {
  id: string;
  itemType: "app" | "keymap" | "shortcut";
  appSlug?: string;
  keymapTitle?: string;
  sectionTitle?: string;
  shortcutTitle?: string;
  baseShortcutId?: string;
}

const FIELDS = [
  "appSlug",
  "keymapTitle",
  "sectionTitle",
  "shortcutTitle",
  "baseShortcutId",
] as const;

const ITEM_TYPES = ["app", "keymap", "shortcut"];

function readFavorite(value: unknown): LocalFavorite | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id) return undefined;
  if (typeof row.itemType !== "string" || !ITEM_TYPES.includes(row.itemType))
    return undefined;
  const favorite: LocalFavorite = {
    id: row.id,
    itemType: row.itemType as LocalFavorite["itemType"],
  };
  for (const field of FIELDS)
    if (typeof row[field] === "string") favorite[field] = row[field];
  return favorite;
}

const empty: LocalFavorite[] = [];

export const favoritesStore = createLocalStore<LocalFavorite[]>({
  key: FAVORITES_STORAGE_KEY,
  defaultValue: empty,
  read(payload) {
    if (typeof payload !== "object" || payload === null) return undefined;
    const { version, favorites } = payload as {
      version?: unknown;
      favorites?: unknown;
    };
    if (version !== 1 || !Array.isArray(favorites)) return undefined;
    return favorites.flatMap((row) => readFavorite(row) ?? []);
  },
  write: (favorites) => ({ version: 1, favorites }),
});
