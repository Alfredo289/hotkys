import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getBaseShortcutId } from "@/lib/shortcut-identity";
import type { AppShortcuts } from "@/lib/model/internal/internal-models";

const mockUseAuth = jest.fn();
const mockUseFavorites = jest.fn();
const removeMock = jest.fn<(...args: unknown[]) => Promise<void>>();
const refetchMock = jest.fn<() => Promise<void>>();
jest.mock("@/components/auth/auth-provider", () => ({ useAuth: mockUseAuth }));
jest.mock("@/lib/hooks/use-favorites", () => ({
  useFavorites: mockUseFavorites,
}));
jest.mock("@/lib/services/favorites-service", () => ({
  favoritesService: { removeFavorite: removeMock },
}));
const { FavoritesContent } =
  require("./favorites-content") as typeof import("./favorites-content");
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
const favorite = {
  id: "saved-shortcut",
  itemType: "shortcut",
  appSlug: "sample",
  keymapTitle: "Default",
  sectionTitle: "Editing",
  shortcutTitle: "Reply",
  baseShortcutId: getBaseShortcutId(shortcut, 0),
};

describe("FavoritesContent", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false });
    removeMock.mockReset();
    removeMock.mockResolvedValue(undefined);
    refetchMock.mockReset();
    refetchMock.mockResolvedValue(undefined);
    mockUseFavorites.mockReturnValue({
      favorites: [
        { id: "saved-app", itemType: "app", appSlug: "sample" },
        {
          id: "saved-keymap",
          itemType: "keymap",
          appSlug: "sample",
          keymapTitle: "Default",
        },
        favorite,
      ],
      isLoading: false,
      refetch: refetchMock,
    });
  });
  it("resolves app names and preserves instruction-only shortcuts and exact destinations", () => {
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
  });
  it("removes the persisted favorite by ID without adding a legacy duplicate", async () => {
    render(<FavoritesContent applications={[app]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Reply from favorites" }),
    );
    await waitFor(() =>
      expect(removeMock).toHaveBeenCalledWith("saved-shortcut", {
        id: "user-1",
      }),
    );
    await waitFor(() => expect(refetchMock).toHaveBeenCalled());
  });
  it("keeps a failed removal visible and lets the user retry", async () => {
    removeMock.mockRejectedValueOnce(new Error("Connection interrupted"));
    render(<FavoritesContent applications={[app]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Reply from favorites" }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Connection interrupted",
    );
    expect(screen.getByRole("link", { name: /Reply/ })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Reply from favorites" }),
    );
    await waitFor(() => expect(removeMock).toHaveBeenCalledTimes(2));
  });
  it("retains unresolved entries and clears an empty search", () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        { ...favorite, appSlug: "missing", baseShortcutId: "missing-id" },
      ],
      isLoading: false,
      refetch: refetchMock,
    });
    render(<FavoritesContent applications={[app]} />);
    expect(screen.getByText(/Shortcut unavailable/)).toBeTruthy();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search favorites" }),
      { target: { value: "zzz" } },
    );
    expect(
      screen.getByRole("heading", { name: "No matching favorites" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      screen.getByRole("button", { name: "Remove Reply from favorites" }),
    ).toBeTruthy();
  });
  it("returns signed-out visitors to favorites after sign-in", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<FavoritesContent applications={[app]} />);
    expect(
      screen
        .getByRole("link", { name: /Sign in to save favorites/ })
        .getAttribute("href"),
    ).toBe("/auth/login?next=%2Ffavorites");
  });
  it("shows a retryable load error rather than an empty collection", () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      error: "Connection interrupted",
      refetch: refetchMock,
    });
    render(<FavoritesContent applications={[app]} />);
    expect(
      screen.getByRole("heading", { name: "Couldn’t load your collection" }),
    ).toBeTruthy();
    expect(screen.queryByText("Make this space yours.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(refetchMock).toHaveBeenCalled();
  });
  it("resolves a saved identity to the current method and destination", () => {
    mockUseFavorites.mockReturnValue({
      favorites: [favorite],
      isLoading: false,
      refetch: refetchMock,
    });
    render(
      <FavoritesContent
        applications={[
          {
            ...app,
            keymaps: [
              {
                title: "Default",
                sections: [
                  {
                    title: "Editing",
                    hotkeys: [
                      {
                        ...shortcut,
                        baseShortcutId: "v2:stable-reply",
                        baseShortcutAliases: [favorite.baseShortcutId],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("group", { name: "How to do it: Reply" }).textContent,
    ).toBe("Swipe from right to left");
    expect(
      screen.getByRole("link", { name: /Reply/ }).getAttribute("href"),
    ).toBe("/apps/sample/default#Editing");
  });

  it("does not relocate a removed public shortcut to an identical method in another app", () => {
    mockUseFavorites.mockReturnValue({
      favorites: [favorite],
      isLoading: false,
      refetch: refetchMock,
    });
    render(
      <FavoritesContent
        applications={[{ ...app, slug: "second", name: "Second App" }]}
      />,
    );
    expect(screen.getByText(/Shortcut unavailable/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Reply/ }).getAttribute("href"),
    ).toBe("/#applications");
    expect(screen.queryByRole("heading", { name: "Second App" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove Reply from favorites" }),
    ).toBeTruthy();
  });
});
