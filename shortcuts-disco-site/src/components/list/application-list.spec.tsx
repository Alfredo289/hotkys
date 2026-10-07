import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { AppShortcuts } from "@/lib/model/internal/internal-models";
import { appDescriptions } from "@/lib/app-descriptions";
import fs from "node:fs";
import path from "node:path";

const mockUseAuth = jest.fn();
const mockUseFavorites = jest.fn();
jest.mock("@/components/auth/auth-provider", () => ({ useAuth: mockUseAuth }));
jest.mock("@/lib/hooks/use-favorites", () => ({
  useFavorites: mockUseFavorites,
}));
jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

jest.mock("@/lib/hooks/use-platform", () => ({
  __esModule: true,
  usePlatform: () => "macos",
}));

jest.mock("@/lib/hooks/use-platform-filter", () => ({
  __esModule: true,
  usePlatformFilter: () => ({
    platformFilter: null,
    setPlatformFilter: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/use-keyboard-navigation", () => ({
  __esModule: true,
  useKeyboardNavigation: () => ({
    selectedIndex: -1,
    itemRefs: { current: [] },
  }),
}));

const { ApplicationList } =
  require("./application-list") as typeof import("./application-list");

const baseApps: AppShortcuts[] = [
  {
    name: "Sample",
    slug: "sample",
    keymaps: [
      {
        title: "Default",
        platforms: ["macos"],
        sections: [],
      },
    ],
  },
];

describe("ApplicationList", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isFavorite: () => false,
      toggleFavorite: jest.fn(),
    });
  });

  it("lists catalog apps and links them to their keymap pages", () => {
    render(<ApplicationList applications={baseApps} />);

    expect(screen.getByText("Sample")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /sample,/i }).getAttribute("href"),
    ).toBe("/apps/sample/default");
    expect(screen.queryByText("Custom")).toBeNull();
    expect(
      screen.queryByRole("link", { name: /add your own app/i }),
    ).toBeNull();
  });

  it("describes every catalog app", () => {
    const appSlugs = fs
      .readdirSync(path.join(process.cwd(), "shortcuts-data"))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5));
    expect(appSlugs.length).toBeGreaterThan(0);
    expect(appSlugs.filter((slug) => !appDescriptions[slug]?.trim())).toEqual(
      [],
    );
    render(
      <ApplicationList
        applications={[{ ...baseApps[0], name: "Figma", slug: "figma" }]}
      />,
    );
    expect(
      screen.getByText("Design interfaces and collaborate with your team."),
    ).toBeTruthy();
  });

  it("searches apps and recovers from an empty result", () => {
    render(<ApplicationList applications={baseApps} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzzzzzzz" },
    });
    expect(screen.getByText("No apps found")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("link", { name: /sample,/i })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Sample" },
    });
    expect(screen.getByRole("link", { name: /sample,/i })).toBeTruthy();
  });

  it("uses saved app favorites and links to the full collection", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false });
    mockUseFavorites.mockReturnValue({
      favorites: [
        { itemType: "app", appSlug: "sample" },
        { itemType: "shortcut", appSlug: "other" },
        { itemType: "app", appSlug: "missing" },
      ],
      isLoading: false,
      isFavorite: () => false,
    });
    render(<ApplicationList applications={baseApps} />);
    const panel = within(
      screen.getByRole("region", { name: "Your favorites, within reach." }),
    );
    expect(
      panel.getByRole("link", { name: /sample/i }).getAttribute("href"),
    ).toBe("/apps/sample/default");
    expect(
      panel.getByRole("link", { name: /view favorites/i }).getAttribute("href"),
    ).toBe("/favorites");
  });

  it("shows a signed-out invitation and an authenticated empty state", () => {
    const { rerender } = render(<ApplicationList applications={baseApps} />);
    expect(
      screen
        .getByRole("link", { name: /sign in to save favorites/i })
        .getAttribute("href"),
    ).toBe("/auth/login");
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false });
    rerender(<ApplicationList applications={baseApps} />);
    expect(
      screen.getByText("Tap a star below to save your first app."),
    ).toBeTruthy();
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: true,
      isFavorite: () => false,
    });
    rerender(<ApplicationList applications={baseApps} />);
    expect(screen.getByText("Loading your favorites…")).toBeTruthy();
  });

  it("announces a failed favorite mutation without navigating away", async () => {
    const toggleFavorite = jest
      .fn<(identifier: unknown) => Promise<void>>()
      .mockRejectedValue(new Error("Offline"));
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false });
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isFavorite: () => false,
      toggleFavorite,
    });
    render(<ApplicationList applications={baseApps} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not update favorites. Please try again.",
    );
    expect(toggleFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ itemType: "app", appSlug: "sample" }),
    );
  });
});
