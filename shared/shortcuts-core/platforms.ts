import type { Platform } from "./types";
export function supportsPlatform(platforms: readonly string[] | undefined, platform: Platform): boolean {
  return platforms === undefined || platforms.includes(platform);
}
// Modifier tokens a keymap may use on each platform, and the order they must appear in.
// Linux keeps the permissive behaviour it always had.
export const PLATFORM_MODIFIERS: Record<Platform, readonly string[]> = {
  macos: ["ctrl", "shift", "opt", "alt", "cmd"],
  windows: ["ctrl", "shift", "alt", "win"],
  linux: ["ctrl", "shift", "opt", "alt", "cmd", "win"],
};
export const PLATFORM_MODIFIER_ORDER: Record<Platform, readonly string[]> = {
  macos: ["ctrl", "shift", "opt", "cmd"],
  windows: ["ctrl", "shift", "alt", "win"],
  linux: ["ctrl", "shift", "opt", "cmd"],
};
// The single source of modifier order. "opt" and "alt" are the same key and share one position.
const ALT_ALIAS: Record<string, string> = { opt: "alt", alt: "opt" };
// Returns -1 for a token the platform does not allow; allowed tokens missing from the order list (linux "win") rank last.
export function modifierRank(platform: Platform, token: string): number {
  const order = PLATFORM_MODIFIER_ORDER[platform];
  const index = order.indexOf(token);
  if (index >= 0) return index;
  const aliased = order.indexOf(ALT_ALIAS[token] ?? token);
  if (aliased >= 0) return aliased;
  return PLATFORM_MODIFIERS[platform].includes(token) ? order.length : -1;
}
