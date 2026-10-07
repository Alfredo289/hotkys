import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type {
  AppShortcuts,
  Keymap,
} from "@/lib/model/internal/internal-models";

import { Modifiers } from "@/lib/model/internal/modifiers";

const replaceMock = jest.fn();
let mockSearchParams = new URLSearchParams();
const mockUseAuth = jest.fn();
const mockUsePreferences = jest.fn();
const mockUseFavorites = jest.fn();
jest.mock("next/navigation", () => ({
  __esModule: true,
  usePathname: () => "/apps/sample/default",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/components/favorites/favorite-button", () => ({
  __esModule: true,
  FavoriteButton: ({ itemType }: { itemType: string }) => (
    <span data-testid={`favorite-${itemType}`} />
  ),
}));

jest.mock("@/components/ui/shortcut-display", () => ({
  __esModule: true,
  ShortcutDisplay: () => <span>Shortcut</span>,
}));

jest.mock("@/components/auth/auth-provider", () => ({
  __esModule: true,
  useAuth: mockUseAuth,
}));

jest.mock("@/lib/hooks/use-preferences", () => ({
  __esModule: true,
  usePreferences: mockUsePreferences,
}));

jest.mock("@/lib/hooks/use-favorites", () => ({
  __esModule: true,
  useFavorites: mockUseFavorites,
}));

const { AppDetails } =
  require("./app-details") as typeof import("./app-details");

const keymap: Keymap = {
  title: "Default",
  sections: [
    {
      title: "Editing",
      hotkeys: [
        {
          title: "Copy",
          sequence: [{ base: "C", modifiers: [] }],
        },
      ],
    },
  ],
};

const application: AppShortcuts = {
  name: "Sample",
  slug: "sample",
  keymaps: [keymap],
};

describe("AppDetails", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    localStorage.clear();
    replaceMock.mockClear();
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      observe: jest.fn(),
      unobserve: jest.fn(),
    })) as typeof IntersectionObserver;
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      observe: jest.fn(),
      unobserve: jest.fn(),
    })) as typeof ResizeObserver;
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
    });
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isFavorite: jest.fn(),
      toggleFavorite: jest.fn(),
      refetch: jest.fn(),
    });
    mockUsePreferences.mockReturnValue({
      preferences: {
        platformFilter: null,
        viewMode: "list",
        columnCount: 4,
      },
      isLoading: false,
      updatePreferences: jest.fn(),
      refetch: jest.fn(),
    });
  });

  it("uses saved authenticated display preferences when URL params are absent", () => {
    mockUsePreferences.mockReturnValue({
      preferences: {
        platformFilter: null,
        viewMode: "cheatsheet",
        columnCount: 2,
      },
      isLoading: false,
      updatePreferences: jest.fn(),
      refetch: jest.fn(),
    });

    render(<AppDetails application={application} keymap={keymap} />);

    expect(screen.getByLabelText("Column settings")).toBeTruthy();
    expect(document.querySelector('[data-columns="2"]')).not.toBeNull();
  });

  it.each(["list", "cheatsheet"])(
    "keeps execution instructions with their input and separate from controls in %s view",
    (view) => {
      mockUsePreferences.mockReturnValue({
        preferences: { viewMode: view, columnCount: 2 },
        isLoading: false,
        updatePreferences: jest.fn(),
      });
      const methodKeymap: Keymap = {
        title: "Default",
        sections: [
          {
            title: "Methods",
            hotkeys: [
              {
                title: "Bold",
                sequence: [{ base: "B", modifiers: [] }],
                comment: "Alternatively wrap text with **",
              },
              {
                title: "Reply",
                sequence: [],
                comment: "Swipe from right to left",
              },
              { title: "Surround", sequence: [], comment: "s <char> `text`" },
            ],
          },
        ],
      };
      render(
        <AppDetails
          application={{ ...application, keymaps: [methodKeymap] }}
          keymap={methodKeymap}
        />,
      );

      const bold = screen.getByRole("group", { name: "How to do it: Bold" });
      expect(within(bold).getByText("Shortcut")).toBeTruthy();
      expect(
        within(bold).getByText("Alternatively wrap text with **"),
      ).toBeTruthy();
      expect(within(bold).queryByTestId("favorite-shortcut")).toBeNull();
      expect(bold.contains(screen.getByText("Bold"))).toBe(false);

      const reply = screen.getByRole("group", { name: "How to do it: Reply" });
      expect(reply.textContent).toBe("Swipe from right to left");
      expect(within(reply).queryByText("Shortcut")).toBeNull();
      expect(
        screen.getByRole("group", { name: "How to do it: Surround" })
          .textContent,
      ).toBe("s <char> `text`");
    },
  );

  it("fits cheat-sheet columns to the actual container without changing the saved preference", () => {
    let notifyResize = () => {};
    const disconnect = jest.fn();
    const updatePreferences = jest.fn();
    global.ResizeObserver = jest
      .fn()
      .mockImplementation((callback: unknown) => {
        notifyResize = callback as () => void;
        return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
      }) as typeof ResizeObserver;
    mockUsePreferences.mockReturnValue({
      preferences: { viewMode: "cheatsheet", columnCount: 6 },
      isLoading: false,
      updatePreferences,
    });
    const { container, unmount } = render(
      <AppDetails application={application} keymap={keymap} />,
    );
    const sheet = container.querySelector("[data-columns]")!;
    Object.defineProperty(sheet, "clientWidth", {
      configurable: true,
      value: 1152,
    });
    act(() => notifyResize());
    expect(sheet.getAttribute("data-columns")).toBe("3");
    Object.defineProperty(sheet, "clientWidth", {
      configurable: true,
      value: 280,
    });
    act(() => notifyResize());
    expect(sheet.getAttribute("data-columns")).toBe("1");
    expect(updatePreferences).not.toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("offers a clearable empty search in both views", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<AppDetails application={application} keymap={keymap} />);
    const search = screen.getByRole("searchbox", { name: "Search shortcuts" });
    fireEvent.change(search, { target: { value: "zzzzzzzzzz" } });
    expect(screen.getByRole("status").textContent).toBe("0 matching shortcuts");
    expect(
      screen.getByRole("heading", { name: "No shortcuts found" }),
    ).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("button", { name: "Cheat sheet view" }));
    expect(
      screen.getByRole("heading", { name: "No shortcuts found" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Cheat sheet view" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect((search as HTMLInputElement).value).toBe("");
    expect(screen.getByText("Copy")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "1 shortcut / 1 section",
    );
  });

  it("renders favorite shortcuts as the first shortcut section", () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        {
          id: "favorite-1",
          userId: "user-1",
          itemType: "shortcut",
          appSlug: "sample",
          keymapTitle: "Default",
          sectionTitle: "Editing",
          shortcutTitle: "Copy",
        },
        {
          id: "favorite-2",
          userId: "user-1",
          itemType: "shortcut",
          appSlug: "sample",
          keymapTitle: "Other",
          sectionTitle: "Editing",
          shortcutTitle: "Copy",
        },
      ],
      isLoading: false,
      isFavorite: jest.fn(),
      toggleFavorite: jest.fn(),
      refetch: jest.fn(),
    });

    render(<AppDetails application={application} keymap={keymap} />);

    expect(
      screen.queryByRole("region", {
        name: "Favorite shortcuts",
      }),
    ).toBeNull();

    const favoriteLabels = screen.getAllByText("Favorite shortcuts");
    const editingLabels = screen.getAllByText("Editing");
    const favoriteSection = favoriteLabels[favoriteLabels.length - 1];
    const editingSection = editingLabels[editingLabels.length - 1];

    expect(
      favoriteSection.compareDocumentPosition(editingSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("Copy")).toHaveLength(2);
    expect(screen.getAllByText("Shortcut")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe(
      "1 shortcut / 1 section",
    );
  });

  it("pins a legacy plus-key favorite through its compatibility alias", () => {
    const plusKeymap: Keymap = {
      title: "Default",
      sections: [
        {
          title: "Editing",
          hotkeys: [
            {
              title: "Zoom",
              sequence: [{ base: "+", modifiers: [Modifiers.command] }],
            },
          ],
        },
      ],
    };
    mockUseFavorites.mockReturnValue({
      favorites: [
        {
          id: "favorite-1",
          itemType: "shortcut",
          appSlug: "sample",
          keymapTitle: "Default",
          sectionTitle: "Editing",
          shortcutTitle: "Zoom",
          baseShortcutId: JSON.stringify([
            [["", ["command down", null]]],
            "Zoom",
            "",
            0,
          ]),
        },
      ],
      isLoading: false,
    });
    render(
      <AppDetails
        application={{ ...application, keymaps: [plusKeymap] }}
        keymap={plusKeymap}
      />,
    );
    expect(screen.getAllByText("Zoom")).toHaveLength(2);
  });

  it("does not render a keymap favorite control near view switching", () => {
    render(<AppDetails application={application} keymap={keymap} />);

    expect(screen.queryByTestId("favorite-keymap")).toBeNull();
    expect(screen.getByTestId("favorite-shortcut")).toBeTruthy();
    expect(screen.getByLabelText("List view")).toBeTruthy();
    expect(screen.getByLabelText("Cheat sheet view")).toBeTruthy();
  });
});
