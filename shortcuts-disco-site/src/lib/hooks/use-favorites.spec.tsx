import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { useFavorites } from "./use-favorites";

const STORAGE_KEY = "hotkys:favorites:v1";

const shortcut = {
  itemType: "shortcut" as const,
  appSlug: "finder",
  keymapTitle: "macOS",
  sectionTitle: "General",
  shortcutTitle: "Search",
  baseShortcutId: '[[["f",["command down"]]],"Search","",0]',
};

function stored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
}

describe("local favorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("works signed out, without any provider or auth context", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite(shortcut)).toBe(false);
  });

  it("adds and removes a favorite by toggling", async () => {
    const { result } = renderHook(() => useFavorites());
    await act(() => result.current.toggleFavorite(shortcut));
    expect(result.current.isFavorite(shortcut)).toBe(true);
    expect(result.current.favorites).toHaveLength(1);

    await act(() => result.current.toggleFavorite(shortcut));
    expect(result.current.isFavorite(shortcut)).toBe(false);
    expect(result.current.favorites).toEqual([]);
  });

  it("stores favorites under the versioned key by their frozen identity", async () => {
    const { result } = renderHook(() => useFavorites());
    await act(() =>
      result.current.toggleFavorite({
        ...shortcut,
        baseShortcutAliases: ["v2:alias"],
      }),
    );
    const payload = stored();
    expect(payload.version).toBe(1);
    expect(payload.favorites).toHaveLength(1);
    expect(payload.favorites[0]).toMatchObject({
      itemType: "shortcut",
      appSlug: "finder",
      keymapTitle: "macOS",
      sectionTitle: "General",
      shortcutTitle: "Search",
      baseShortcutId: shortcut.baseShortcutId,
    });
    expect(typeof payload.favorites[0].id).toBe("string");
    expect(payload.favorites[0].userId).toBeUndefined();
    expect(payload.favorites[0].baseShortcutAliases).toBeUndefined();
  });

  it("persists across remounts", async () => {
    const first = renderHook(() => useFavorites());
    await act(() => first.result.current.toggleFavorite(shortcut));
    await act(() =>
      first.result.current.toggleFavorite({
        itemType: "app",
        appSlug: "finder",
      }),
    );
    first.unmount();

    const second = renderHook(() => useFavorites());
    expect(second.result.current.favorites).toHaveLength(2);
    expect(second.result.current.isFavorite(shortcut)).toBe(true);
    expect(
      second.result.current.isFavorite({ itemType: "app", appSlug: "finder" }),
    ).toBe(true);
  });

  it("recognizes a favorite after a catalog change that keeps the shortcut", async () => {
    const { result } = renderHook(() => useFavorites());
    await act(() => result.current.toggleFavorite(shortcut));
    // The catalog grew elsewhere: same identity, extra aliases, other rows.
    expect(
      result.current.isFavorite({
        ...shortcut,
        baseShortcutAliases: ["something-else"],
      }),
    ).toBe(true);
    // A different row in the same section is not a match.
    expect(
      result.current.isFavorite({
        ...shortcut,
        shortcutTitle: "Search again",
        baseShortcutId: '[[["g",["command down"]]],"Search again","",0]',
      }),
    ).toBe(false);
  });

  it("keeps instances in sync so a star updates every list", async () => {
    const button = renderHook(() => useFavorites());
    const list = renderHook(() => useFavorites());
    await act(() => button.result.current.toggleFavorite(shortcut));
    expect(list.result.current.favorites).toHaveLength(1);
  });

  it("removes a favorite by its id", async () => {
    const { result } = renderHook(() => useFavorites());
    await act(() => result.current.toggleFavorite(shortcut));
    const [{ id }] = result.current.favorites;
    await act(() => result.current.removeFavorite(id));
    expect(result.current.favorites).toEqual([]);
    expect(stored().favorites).toEqual([]);
  });

  it("does not store favorites for custom (account) items", async () => {
    const { result } = renderHook(() => useFavorites());
    await act(() =>
      result.current.toggleFavorite({
        itemType: "shortcut",
        appSlug: "custom-tool",
        customShortcutId: "private-1",
      }),
    );
    expect(result.current.favorites).toEqual([]);
  });

  it.each([
    ["unparseable JSON", "{nope"],
    ["an unknown version", JSON.stringify({ version: 2, favorites: [{}] })],
    ["a non-list payload", JSON.stringify({ version: 1, favorites: "x" })],
  ])("starts empty instead of failing on %s", async (_label, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
    await act(() => result.current.toggleFavorite(shortcut));
    expect(result.current.favorites).toHaveLength(1);
  });

  it("drops malformed entries but keeps valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        favorites: [
          { id: "ok", itemType: "app", appSlug: "finder" },
          { id: "bad", itemType: "other" },
          null,
        ],
      }),
    );
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites.map((f) => f.id)).toEqual(["ok"]);
  });
});
