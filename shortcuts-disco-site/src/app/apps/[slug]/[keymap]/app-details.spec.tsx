import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type {
  AppShortcuts,
  Keymap,
} from "@/lib/model/internal/internal-models";

import { Modifiers } from "@/lib/model/internal/modifiers";
import { getBaseShortcutId } from "@/lib/shortcut-identity";
import { FAVORITES_STORAGE_KEY } from "@/lib/storage/favorites-store";
import { PREFERENCES_STORAGE_KEY } from "@/lib/storage/preferences-store";

function savePreferences(preferences: Record<string, unknown>) {
  localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      platformFilter: "macos",
      viewMode: "list",
      columnCount: 4,
      ...preferences,
    }),
  );
}

function saveFavorites(...favorites: Record<string, unknown>[]) {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify({ version: 1, favorites }),
  );
}

function storedPreferences() {
  return JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "null");
}

const replaceMock = jest.fn();
let mockSearchParams = new URLSearchParams();
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
  });

  it("uses saved display preferences when URL params are absent, signed out", () => {
    savePreferences({ viewMode: "cheatsheet", columnCount: 2 });

    render(<AppDetails application={application} keymap={keymap} />);

    expect(screen.getByLabelText("Column settings")).toBeTruthy();
    expect(document.querySelector('[data-columns="2"]')).not.toBeNull();
  });

  it("saves the view mode where it is changed and restores it after a remount", () => {
    const first = render(
      <AppDetails application={application} keymap={keymap} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cheat sheet view" }));
    expect(storedPreferences().viewMode).toBe("cheatsheet");
    first.unmount();

    render(<AppDetails application={application} keymap={keymap} />);
    expect(
      screen
        .getByRole("button", { name: "Cheat sheet view" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("lets URL parameters override saved preferences without replacing them", () => {
    savePreferences({ viewMode: "cheatsheet", columnCount: 2 });
    mockSearchParams = new URLSearchParams("view=list&cols=5");
    render(<AppDetails application={application} keymap={keymap} />);
    expect(
      screen
        .getByRole("button", { name: "List view" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(storedPreferences()).toMatchObject({
      viewMode: "cheatsheet",
      columnCount: 2,
    });
  });

  it.each(["list", "cheatsheet"])(
    "keeps execution instructions with their input and separate from controls in %s view",
    (view) => {
      savePreferences({ viewMode: view, columnCount: 2 });
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
    global.ResizeObserver = jest
      .fn()
      .mockImplementation((callback: unknown) => {
        notifyResize = callback as () => void;
        return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
      }) as typeof ResizeObserver;
    savePreferences({ viewMode: "cheatsheet", columnCount: 6 });
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
    expect(storedPreferences().columnCount).toBe(6);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("offers a clearable empty search in both views", () => {
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
    saveFavorites(
      {
        id: "favorite-1",
        itemType: "shortcut",
        appSlug: "sample",
        keymapTitle: "Default",
        sectionTitle: "Editing",
        shortcutTitle: "Copy",
      },
      {
        id: "favorite-2",
        itemType: "shortcut",
        appSlug: "sample",
        keymapTitle: "Other",
        sectionTitle: "Editing",
        shortcutTitle: "Copy",
      },
    );

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
    saveFavorites({
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
    });
    render(
      <AppDetails
        application={{ ...application, keymaps: [plusKeymap] }}
        keymap={plusKeymap}
      />,
    );
    expect(screen.getAllByText("Zoom")).toHaveLength(2);
  });

  it("pins an identity-saved favorite signed out, even after rows were added around it", () => {
    const copy = keymap.sections[0].hotkeys[0];
    saveFavorites({
      id: "favorite-1",
      itemType: "shortcut",
      appSlug: "sample",
      keymapTitle: "Default",
      sectionTitle: "Editing",
      shortcutTitle: "Copy",
      baseShortcutId: getBaseShortcutId(copy, 0),
    });
    const grown: Keymap = {
      title: "Default",
      sections: [
        {
          title: "Editing",
          hotkeys: [{ title: "Cut", sequence: [] }, copy],
        },
      ],
    };
    render(
      <AppDetails
        application={{ ...application, keymaps: [grown] }}
        keymap={grown}
      />,
    );
    expect(screen.getAllByText("Copy")).toHaveLength(2);
    expect(screen.getAllByText("Cut")).toHaveLength(1);
  });

  it("does not render a keymap favorite control near view switching", () => {
    render(<AppDetails application={application} keymap={keymap} />);

    expect(screen.queryByTestId("favorite-keymap")).toBeNull();
    expect(screen.getByTestId("favorite-shortcut")).toBeTruthy();
    expect(screen.getByLabelText("List view")).toBeTruthy();
    expect(screen.getByLabelText("Cheat sheet view")).toBeTruthy();
  });
});
