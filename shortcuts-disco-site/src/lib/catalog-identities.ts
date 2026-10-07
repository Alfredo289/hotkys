import type {
  AppShortcuts,
  Section,
} from "@/lib/model/internal/internal-models";
import { getSectionIdentities } from "@/lib/shortcut-core/identity";

function identify(section: Section): Section {
  // Sections that went through the merger already carry their identities.
  if (section.hotkeys.some((hotkey) => hotkey.baseShortcutId !== undefined))
    return section;
  const { ids, aliases } = getSectionIdentities(section.hotkeys);
  return {
    ...section,
    hotkeys: section.hotkeys.map((hotkey, index) => {
      const id = ids[index];
      const alternatives = aliases.get(id) ?? [];
      return {
        ...hotkey,
        baseShortcutId: id,
        ...(alternatives.length > 0 && { baseShortcutAliases: alternatives }),
        baseSectionTitle: section.title,
        baseShortcutTitle: hotkey.title,
      };
    }),
  };
}

/**
 * Attaches each catalog row's frozen base shortcut identity, the same one the
 * merger computes, so favorites can be saved and found without merging.
 */
export function withBaseShortcutIdentities(
  apps: AppShortcuts[],
): AppShortcuts[] {
  return apps.map((app) => ({
    ...app,
    keymaps: app.keymaps.map((keymap) => ({
      ...keymap,
      sections: keymap.sections.map(identify),
    })),
  }));
}
