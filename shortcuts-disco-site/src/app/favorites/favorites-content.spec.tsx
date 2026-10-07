import { beforeEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { getBaseShortcutId } from "@/lib/shortcut-identity";
import type { AppShortcuts } from "@/lib/model/internal/internal-models";
import { FAVORITES_STORAGE_KEY } from "@/lib/storage/favorites-store";
import { FavoritesContent } from "./favorites-content";

const shortcut = {
  title: "Reply",
  sequence: [],
  comment: "Swipe from right to left",
};
const app: AppShortcuts = {
  name: "Sample App",
  slug: "sample",
  keymaps: [
    { title: "Default", sections: [{ title: "Editing", hotkeys: [shortcut] }] },
  ],
};
const savedShortcut = {
  id: "saved-shortcut",
  itemType: "shortcut",
  appSlug: "sample",
  keymapTitle: "Default",
  sectionTitle: "Editing",
  shortcutTitle: "Reply",
  baseShortcutId: getBaseShortcutId(shortcut, 0),
};

function save(...favorites: Record<string, unknown>[]) {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify({ version: 1, favorites }),
  );
}

function storedIds(): string[] {
  const payload = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!);
  return payload.favorites.map((favorite: { id: string }) => favorite.id);
}

describe("FavoritesContent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lists saved apps, keymaps and shortcuts without any account", () => {
    save(
      { id: "saved-app", itemType: "app", appSlug: "sample" },
      {
        id: "saved-keymap",
        itemType: "keymap",
        appSlug: "sample",
        keymapTitle: "Default",
      },
      savedShortcut,
    );
    render(<FavoritesContent applications={[app]} />);
    expect(screen.getByRole("region", { name: "Saved apps" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Saved keymaps" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Saved shortcuts" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "How to do it: Reply" }).textContent,
    ).toBe("Swipe from right to left");
    expect(
      screen.getByRole("link", { name: /Reply/ }).getAttribute("href"),
    ).toBe("/apps/sample/default#Editing");
    expect(screen.queryByText(/sign in/i)).toBeNull();
  });

  it("shows an empty state that invites a first favorite", () => {
    render(<FavoritesContent applications={[app]} />);
    expect(screen.getByText("Make this space yours.")).toBeTruthy();
  });

  it("removes a favorite from the page and from local storage", () => {
    save({ id: "saved-app", itemType: "app", appSlug: "sample" }, savedShortcut);
    render(<FavoritesContent applications={[app]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Reply from favorites" }),
    );
    expect(screen.queryByRole("link", { name: /Reply/ })).toBeNull();
    expect(storedIds()).toEqual(["saved-app"]);
  });

  it("still finds a shortcut after the catalog changed around it", () => {
    save(savedShortcut);
    const changed: AppShortcuts = {
      ...app,
      name: "Sample App Renamed",
      keymaps: [
        {
          title: "Default",
          sections: [
            {
              title: "Editing",
              hotkeys: [
                { title: "Forward", sequence: [], comment: "new row" },
                shortcut,
              ],
            },
          ],
        },
      ],
    };
    render(<FavoritesContent applications={[changed]} />);
    expect(screen.queryByText(/no longer in the catalog/i)).toBeNull();
    expect(screen.getByText("Sample App Renamed")).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "How to do it: Reply" }),
    ).toBeTruthy();
  });

  it("shows a favorite whose shortcut was removed as missing and keeps it removable", () => {
    save({
      ...savedShortcut,
      shortcutTitle: "Gone",
      baseShortcutId: getBaseShortcutId({ title: "Gone", sequence: [] }, 0),
    });
    render(<FavoritesContent applications={[app]} />);
    const row = screen.getByText("Gone").closest("div")!.parentElement!;
    expect(within(row).getByText(/no longer in the catalog/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Gone/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Gone from favorites" }),
    );
    expect(storedIds()).toEqual([]);
  });

  it("shows removed apps and keymaps as missing instead of dropping them", () => {
    save(
      { id: "gone-app", itemType: "app", appSlug: "vanished" },
      {
        id: "gone-keymap",
        itemType: "keymap",
        appSlug: "sample",
        keymapTitle: "Old map",
      },
    );
    render(<FavoritesContent applications={[app]} />);
    expect(screen.getAllByText(/no longer in the catalog/i)).toHaveLength(2);
    expect(screen.getByText("vanished")).toBeTruthy();
    expect(screen.getByText("Old map")).toBeTruthy();
    expect(storedIds()).toEqual(["gone-app", "gone-keymap"]);
  });

  it("does not relocate a removed shortcut to an identical one in another app", () => {
    save(savedShortcut);
    const other: AppShortcuts = { ...app, slug: "other", name: "Other App" };
    render(<FavoritesContent applications={[other]} />);
    expect(screen.getByText(/no longer in the catalog/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Reply/ })).toBeNull();
  });

  it("searches saved items and recovers from an empty result", () => {
    save({ id: "saved-app", itemType: "app", appSlug: "sample" }, savedShortcut);
    render(<FavoritesContent applications={[app]} />);
    fireEvent.change(screen.getByLabelText("Search favorites"), {
      target: { value: "zzzz" },
    });
    expect(screen.getByText("No matching favorites")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("region", { name: "Saved apps" })).toBeTruthy();
  });
});
