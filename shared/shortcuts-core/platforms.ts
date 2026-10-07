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
