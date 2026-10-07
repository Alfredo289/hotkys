import { beforeEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { FAVORITES_STORAGE_KEY } from "@/lib/storage/favorites-store";
import { FavoriteButton } from "./favorite-button";

function stored() {
  return JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "null");
}

describe("FavoriteButton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("favorites and unfavorites signed out, and persists across remounts", () => {
    const first = render(<FavoriteButton itemType="app" appSlug="finder" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(stored().favorites).toMatchObject([
      { itemType: "app", appSlug: "finder" },
    ]);
    first.unmount();

    render(<FavoriteButton itemType="app" appSlug="finder" />);
    const button = screen.getByRole("button", { name: "Remove from favorites" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(stored().favorites).toEqual([]);
  });

  it("stars every button for the same item at once", () => {
    render(
      <>
        <FavoriteButton itemType="app" appSlug="finder" label="Finder" />
        <FavoriteButton itemType="app" appSlug="finder" label="Finder again" />
      </>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Finder to favorites" }),
    );
    expect(
      screen.getByRole("button", { name: "Remove Finder again from favorites" }),
    ).toBeTruthy();
  });

  it("is not offered for custom items", () => {
    render(
      <FavoriteButton itemType="shortcut" appSlug="x" customShortcutId="1" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
