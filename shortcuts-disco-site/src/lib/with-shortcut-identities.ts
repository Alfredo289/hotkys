import type { AppShortcuts } from "@/lib/model/internal/internal-models";
import { getSectionIdentities } from "@/lib/shortcut-core/identity";

/**
 * Annotates every catalog shortcut with its stable identity (and any legacy
 * aliases) so favorites can be matched without a customization merge.
 */
export function withShortcutIdentities(app: AppShortcuts): AppShortcuts {
  return {
    ...app,
    keymaps: app.keymaps.map((keymap) => ({
      ...keymap,
      sections: keymap.sections.map((section) => {
        const { ids, aliases } = getSectionIdentities(section.hotkeys);
        return {
          ...section,
          hotkeys: section.hotkeys.map((hotkey, index) => ({
            ...hotkey,
            baseShortcutId: ids[index],
            ...(aliases.get(ids[index])?.length
              ? { baseShortcutAliases: aliases.get(ids[index]) }
              : {}),
            baseSectionTitle: section.title,
            baseShortcutTitle: hotkey.title,
          })),
        };
      }),
    })),
  };
}
