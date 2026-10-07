import { describe, expect, it } from "@jest/globals";
import grammar from "@/lib/shortcut-core/fixtures/grammar.json";
import identities from "@/lib/shortcut-core/fixtures/identities.json";
import overlays from "@/lib/shortcut-core/fixtures/overlays.json";
import favorites from "@/lib/shortcut-core/fixtures/favorites.json";
import { parseKey } from "@/lib/shortcut-core/parser";
import { getBaseShortcutId, getCompatibleIds, getSectionIdentities } from "@/lib/shortcut-core/identity";
import { resolveOverlayField } from "@/lib/shortcut-core/overlay";
import { matchesFavorite, type FavoriteIdentifier } from "@/lib/shortcut-core/favorites";
import { modifierMapping } from "@/lib/model/internal/modifiers";
const codes = new Set(["+", "c", "k", "shift"]);
const shortcut = (title: string, key: string) => ({ title, sequence: parseKey(key).map(chord => ({ base: chord.base, modifiers: chord.modifiers.map(token => modifierMapping.get(token)!) })) });
describe("shared shortcut contract", () => {
  it.each(grammar)("parses $key consistently", fixture => {
    const parse = () => parseKey(fixture.key, base => codes.has(base));
    if (fixture.invalid) expect(parse).toThrow(); else expect(parse()).toEqual(fixture.sequence);
  });
  it.each(identities)("preserves $title occurrence $occurrence identity", fixture => {
    const row = shortcut(fixture.title, fixture.key);
    expect(getBaseShortcutId(row, fixture.occurrence)).toBe(fixture.id);
    if (fixture.legacy) expect(getCompatibleIds([row]).get(fixture.id)).toContain(fixture.legacy);
    if (fixture.legacyWindows) expect(getCompatibleIds([row]).get(fixture.id)).toContain(fixture.legacyWindows);
  });
  it.each(overlays)("resolves inherit/replace/clear", fixture => expect(resolveOverlayField("Original", fixture.replacement, fixture.cleared)).toBe(fixture.expected));
  it.each(favorites)("matches stable private references", fixture => expect(matchesFavorite(fixture.favorite as FavoriteIdentifier, fixture.identifier as FavoriteIdentifier)).toBe(fixture.matches));
});

it("gives an ambiguous Windows command row a versioned ID instead of the control row's ID", () => {
  const command = shortcut("Copy", "cmd+c");
  const control = shortcut("Copy", "ctrl+c");
  const oldId = getBaseShortcutId(control, 0);
  const { ids, aliases } = getSectionIdentities([command, control]);
  expect(ids[1]).toBe(`v2:${oldId}`);
  expect(aliases.get(ids[1]) ?? []).not.toContain(oldId);
});

it("keeps a versioned identity readable when a conflicting neighbor is removed", () => {
  const control = shortcut("Copy", "ctrl+c");
  const command = shortcut("Copy", "cmd+c");
  const versionedId = getSectionIdentities([command, control]).ids[1];
  const remaining = getSectionIdentities([control]);
  expect(
    matchesFavorite(
      { itemType: "shortcut", baseShortcutId: versionedId },
      { itemType: "shortcut", baseShortcutId: remaining.ids[0], baseShortcutAliases: remaining.aliases.get(remaining.ids[0]) }
    )
  ).toBe(true);
});
