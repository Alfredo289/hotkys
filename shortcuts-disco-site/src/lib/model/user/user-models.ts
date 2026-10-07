import type { Platform } from "../internal/internal-models";

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  createdAt: string;
}

export interface UserPreferences {
  platformFilter: Platform | null;
  viewMode: "list" | "cheatsheet";
  columnCount: number;
}

export interface Favorite {
  id: string;
  userId: string;
  itemType: "app" | "keymap" | "shortcut";
  appSlug?: string;
  keymapTitle?: string;
  shortcutTitle?: string;
  sectionTitle?: string;
  baseShortcutId?: string;
  customAppId?: string;
  customKeymapId?: string;
  customShortcutId?: string;
}
