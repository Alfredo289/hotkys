import type { ImportPlatform } from "./types";

/** Case-insensitive, whitespace-collapsed comparison form of a section, keymap or action title. */
export const fold = (text: string) =>
  text.trim().replace(/\s+/g, " ").toLowerCase();

/** Title of the keymap an import creates when none is named or matches. */
export const defaultKeymapTitle = (platform: ImportPlatform) =>
  platform === "windows" ? "Default (Windows)" : "Default";
