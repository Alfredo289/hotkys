import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { AppShortcuts } from "@/lib/model/internal/internal-models";
import { appDescriptions } from "@/lib/app-descriptions";
import fs from "node:fs";
import path from "node:path";
import { FAVORITES_STORAGE_KEY } from "@/lib/storage/favorites-store";

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

function saveFavorites(...favorites: Record<string, unknown>[]) {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify({ version: 1, favorites }),
  );
}

describe("ApplicationList", () => {
  beforeEach(() => {
    localStorage.clear();
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
    saveFavorites(
      { id: "1", itemType: "app", appSlug: "sample" },
      { id: "2", itemType: "shortcut", appSlug: "other" },
      { id: "3", itemType: "app", appSlug: "missing" },
    );
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

  it("works signed out: no sign-in prompt, an empty state until a star is tapped", () => {
    render(<ApplicationList applications={baseApps} />);
    expect(screen.queryByText(/sign in/i)).toBeNull();
    expect(
      screen.getByText("Tap a star below to save your first app."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    const panel = within(
      screen.getByRole("region", { name: "Your favorites, within reach." }),
    );
    expect(
      panel.getByRole("link", { name: /sample/i }).getAttribute("href"),
    ).toBe("/apps/sample/default");
    expect(
      screen.getByRole("button", { name: "Remove from favorites" }),
    ).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!).favorites,
    ).toMatchObject([{ itemType: "app", appSlug: "sample" }]);
  });
});
