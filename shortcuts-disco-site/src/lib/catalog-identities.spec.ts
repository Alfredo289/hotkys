import { describe, expect, it } from "@jest/globals";
import type { AppShortcuts } from "@/lib/model/internal/internal-models";
import { Modifiers } from "@/lib/model/internal/modifiers";
import { getBaseShortcutId } from "@/lib/shortcut-identity";
import { withBaseShortcutIdentities } from "./catalog-identities";

const copy = { title: "Copy", sequence: [{ base: "c", modifiers: [Modifiers.command] }] };
const paste = { title: "Paste", sequence: [{ base: "v", modifiers: [Modifiers.command] }] };

const app: AppShortcuts = {
  name: "Sample",
  slug: "sample",
  keymaps: [
    { title: "Default", sections: [{ title: "Editing", hotkeys: [copy, paste, copy] }] },
  ],
};

describe("withBaseShortcutIdentities", () => {
  it("gives catalog rows the frozen identity, numbering identical rows", () => {
    const [result] = withBaseShortcutIdentities([app]);
    const rows = result.keymaps[0].sections[0].hotkeys;
    expect(rows.map((row) => row.baseShortcutId)).toEqual([
      getBaseShortcutId(copy, 0),
      getBaseShortcutId(paste, 0),
      getBaseShortcutId(copy, 1),
    ]);
    expect(rows[0].baseSectionTitle).toBe("Editing");
    expect(rows[0].baseShortcutTitle).toBe("Copy");
  });

  it("keeps the identity when unrelated rows are added elsewhere in the section", () => {
    const before = withBaseShortcutIdentities([app])[0].keymaps[0].sections[0].hotkeys[1];
    const grown: AppShortcuts = {
      ...app,
      keymaps: [
        {
          title: "Default",
          sections: [
            { title: "Editing", hotkeys: [{ title: "Cut", sequence: [] }, ...app.keymaps[0].sections[0].hotkeys] },
          ],
        },
      ],
    };
    const after = withBaseShortcutIdentities([grown])[0].keymaps[0].sections[0].hotkeys[2];
    expect(after.title).toBe("Paste");
    expect(after.baseShortcutId).toBe(before.baseShortcutId);
  });

  it("does not mutate its input and leaves already-identified sections alone", () => {
    const [once] = withBaseShortcutIdentities([app]);
    expect(app.keymaps[0].sections[0].hotkeys[0].baseShortcutId).toBeUndefined();
    const [twice] = withBaseShortcutIdentities([once]);
    expect(twice.keymaps[0].sections[0]).toBe(once.keymaps[0].sections[0]);
  });
});
