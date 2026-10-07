"use client";

import {
  AppShortcuts,
  Keymap,
  Section,
  SectionShortcut,
} from "@/lib/model/internal/internal-models";
import { serializeKeymap } from "@/lib/model/keymap-utils";
import { matchesFavorite } from "@/lib/shortcut-core/favorites";
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation";
import { ShortcutMethod } from "@/components/shortcuts/shortcut-method";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import Fuse from "fuse.js";
import { KeymapSelector } from "@/app/apps/[slug]/[keymap]/keymap-selector";
import TableOfContents from "@/app/apps/[slug]/[keymap]/table-of-contents";
import { ListItem } from "@/components/ui/list";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Menu, Settings2, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MasonryGrid } from "@/components/ui/masonry-grid";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { withShortcutIdentities } from "@/lib/with-shortcut-identities";

type ViewMode = "list" | "cheatsheet";
type DisplayShortcut = Keymap["sections"][number]["hotkeys"][number] & {
  favoriteSourceSectionTitle?: string;
};
type DisplaySection = Omit<Section, "hotkeys"> & {
  hotkeys: DisplayShortcut[];
};
const VIEW_MODE_STORAGE_KEY = "shortcuts-view-mode";
const COLUMN_COUNT_STORAGE_KEY = "shortcuts-column-count";
const FAVORITE_SHORTCUTS_SECTION_TITLE = "Favorite shortcuts";
const DEFAULT_COLUMNS = 4;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 6;
const MIN_COLUMN_WIDTH = 288;
function parseViewMode(value: string | null): ViewMode | null {
  if (value === "cheatsheet") return "cheatsheet";
  if (value === "list") return "list";
  return null;
}

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "cheatsheet" ? "cheatsheet" : "list";
}

function parseColumnCount(value: string | null): number | null {
  if (value === null) return null;
  const num = parseInt(value, 10);
  if (isNaN(num) || num < MIN_COLUMNS || num > MAX_COLUMNS) return null;
  return num;
}

function normalizeColumnCount(value: number): number {
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, value));
}

function getStoredColumnCount(): number {
  if (typeof window === "undefined") return DEFAULT_COLUMNS;
  const stored = localStorage.getItem(COLUMN_COUNT_STORAGE_KEY);
  const parsed = parseColumnCount(stored);
  return parsed ?? DEFAULT_COLUMNS;
}

export const AppDetails = ({
  application,
  keymap,
}: {
  application: AppShortcuts;
  keymap: Keymap;
}) => {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const {
    preferences,
    isLoading: preferencesLoading,
    updatePreferences,
  } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlViewMode = parseViewMode(searchParams.get("view"));
  const urlColumnCount = parseColumnCount(searchParams.get("cols"));
  const catalogApplication = useMemo(
    () => withShortcutIdentities(application),
    [application],
  );
  const displayKeymap = useMemo(
    () =>
      catalogApplication.keymaps.find(
        (catalogKeymap) => catalogKeymap.title === keymap.title,
      ) ?? keymap,
    [keymap, catalogApplication],
  );

  const [viewMode, setViewModeState] = useState<ViewMode>("list");
  const [userColumnCount, setUserColumnCountState] =
    useState<number>(DEFAULT_COLUMNS);
  const [maxColumns, setMaxColumns] = useState<number>(MAX_COLUMNS);
  const cheatsheetContainerRef = useRef<HTMLDivElement>(null);
  const effectiveColumnCount = Math.min(userColumnCount, maxColumns);

  useEffect(() => {
    const effectiveMode =
      urlViewMode ??
      (user && !preferencesLoading
        ? preferences.viewMode
        : getStoredViewMode());
    setViewModeState(effectiveMode);
  }, [urlViewMode, user, preferencesLoading, preferences.viewMode]);

  useEffect(() => {
    const effectiveCols =
      urlColumnCount ??
      (user && !preferencesLoading
        ? normalizeColumnCount(preferences.columnCount)
        : getStoredColumnCount());
    setUserColumnCountState(effectiveCols);
  }, [urlColumnCount, user, preferencesLoading, preferences.columnCount]);

  useEffect(() => {
    if (viewMode !== "cheatsheet") return;

    const updateMaxColumns = () => {
      const availableWidth = cheatsheetContainerRef.current?.clientWidth ?? 0;
      if (!availableWidth) return;
      const gap = 16;
      const max = Math.max(
        1,
        Math.floor((availableWidth + gap) / (MIN_COLUMN_WIDTH + gap)),
      );
      setMaxColumns(Math.min(MAX_COLUMNS, max));
    };

    updateMaxColumns();
    const observer = new ResizeObserver(updateMaxColumns);
    if (cheatsheetContainerRef.current)
      observer.observe(cheatsheetContainerRef.current);

    return () => observer.disconnect();
  }, [viewMode]);

  const setViewMode = (newMode: ViewMode) => {
    setViewModeState(newMode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode);
    if (user && !preferencesLoading) {
      void updatePreferences({ viewMode: newMode }).catch((error) => {
        console.error("Failed to save view preference:", error);
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    if (newMode === "list") {
      params.delete("view");
    } else {
      params.set("view", newMode);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const setColumnCount = (newCount: number) => {
    setUserColumnCountState(newCount);
    localStorage.setItem(COLUMN_COUNT_STORAGE_KEY, String(newCount));
    if (user && !preferencesLoading) {
      void updatePreferences({ columnCount: newCount }).catch((error) => {
        console.error("Failed to save column preference:", error);
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    if (newCount === DEFAULT_COLUMNS) {
      params.delete("cols");
    } else {
      params.set("cols", String(newCount));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [sectionSheetOpen, setSectionSheetOpen] = useState(false);

  useEffect(() => {
    setSearchTerm("");
  }, [displayKeymap]);

  const searchResults = useMemo<DisplaySection[]>(() => {
    if (!searchTerm.trim()) return displayKeymap.sections;
    const fuse = new Fuse(
      displayKeymap.sections.flatMap((section) => section.hotkeys),
      {
        keys: ["title"],
        includeScore: true,
      },
    );
    const titles = new Set(
      fuse.search(searchTerm.trim()).map((result) => result.item.title),
    );
    return displayKeymap.sections
      .map((section) => ({
        ...section,
        hotkeys: section.hotkeys.filter((hotkey) => titles.has(hotkey.title)),
      }))
      .filter((section) => section.hotkeys.length > 0);
  }, [displayKeymap, searchTerm]);
  const shortcutCount = displayKeymap.sections.reduce(
    (total, section) => total + section.hotkeys.length,
    0,
  );
  const resultCount = searchResults.reduce(
    (total, section) => total + section.hotkeys.length,
    0,
  );

  const favoriteShortcutItems = user
    ? searchResults.flatMap((section) =>
        section.hotkeys
          .filter((shortcut) =>
            favorites.some((favorite) =>
              matchesFavorite(favorite, {
                itemType: "shortcut",
                appSlug: catalogApplication.slug,
                keymapTitle: displayKeymap.title,
                sectionTitle: shortcut.baseSectionTitle ?? section.title,
                shortcutTitle: shortcut.baseShortcutTitle ?? shortcut.title,
                baseShortcutId: shortcut.baseShortcutId,
                baseShortcutAliases: shortcut.baseShortcutAliases,
              }),
            ),
          )
          .map((shortcut) => ({ sectionTitle: section.title, shortcut })),
      )
    : [];

  const favoriteShortcutsSection: DisplaySection | null =
    favoriteShortcutItems.length > 0
      ? {
          title: FAVORITE_SHORTCUTS_SECTION_TITLE,
          hotkeys: favoriteShortcutItems.map(({ sectionTitle, shortcut }) => ({
            ...shortcut,
            favoriteSourceSectionTitle: sectionTitle,
          })),
        }
      : null;

  const displaySections: DisplaySection[] = favoriteShortcutsSection
    ? [favoriteShortcutsSection, ...searchResults]
    : searchResults;

  const totalItems = displaySections.reduce(
    (sum, section) => sum + section.hotkeys.length,
    0,
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setSelectedIndex(-1);
  };

  const navigationItems = displaySections.flatMap((section) =>
    section.hotkeys.map((shortcut) => ({
      section: shortcut.baseSectionTitle ?? section.title,
      shortcut,
    })),
  );
  const { selectedIndex, setSelectedIndex, itemRefs } = useKeyboardNavigation(
    navigationItems,
    undefined,
    undefined,
    {
      enabled: viewMode === "list",
      resetKey: JSON.stringify(
        navigationItems.map((item) => [
          item.section,
          item.shortcut.baseShortcutId,
          item.shortcut.title,
        ]),
      ),
    },
  );

  const sectionRefs = useRef<
    Record<string, React.RefObject<HTMLDivElement | null>>
  >({});
  let globalIndex = 0;
  const appDetails = displaySections.map((section) => {
    sectionRefs.current[section.title] ??= React.createRef();
    return (
      <div
        id={section.title}
        key={section.title}
        ref={sectionRefs.current[section.title]}
        className="scroll-mt-8 rounded-2xl border bg-card p-2"
      >
        <div className="mb-2 flex items-center justify-between gap-4 px-4 py-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {section.title}
          </h2>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {section.hotkeys.length}
          </span>
        </div>
        {section.hotkeys.map((hotkey) => {
          const currentIndex = globalIndex++;
          const favoriteSectionTitle =
            hotkey.favoriteSourceSectionTitle ?? section.title;
          const baseSectionTitle =
            hotkey.baseSectionTitle ?? favoriteSectionTitle;
          const baseShortcutTitle = hotkey.baseShortcutTitle ?? hotkey.title;
          return (
            <ListItem
              key={hotkey.title + currentIndex}
              selected={selectedIndex === currentIndex}
              className={cn(
                "grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2 rounded-xl border-0 px-4 py-3 text-sm odd:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center",
              )}
              ref={(el) => {
                itemRefs.current[currentIndex] = el;
              }}
            >
              <span className="col-start-1 row-start-1 min-w-0">
                <span>{hotkey.title}</span>
              </span>
              <ShortcutMethod
                shortcut={hotkey}
                className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
              />
              <span className="col-start-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3">
                <FavoriteButton
                  itemType="shortcut"
                  appSlug={application.slug}
                  keymapTitle={displayKeymap.title}
                  sectionTitle={favoriteSectionTitle}
                  shortcutTitle={hotkey.baseShortcutTitle ?? hotkey.title}
                  baseShortcutId={hotkey.baseShortcutId}
                  baseShortcutAliases={hotkey.baseShortcutAliases}
                  className="shrink-0 text-muted-foreground"
                />
              </span>
            </ListItem>
          );
        })}
      </div>
    );
  });

  const cheatsheetView = (
    <MasonryGrid
      items={displaySections}
      columnCount={effectiveColumnCount}
      columnWidth="w-72 min-w-0 max-w-full"
      getItemHeight={(section) => section.hotkeys.length + 1}
      renderItem={(section) => {
        sectionRefs.current[section.title] ??= React.createRef();
        return (
          <div
            id={section.title}
            ref={sectionRefs.current[section.title]}
            className="scroll-mt-8 rounded-2xl border bg-card p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold tracking-tight">{section.title}</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {section.hotkeys.length}
              </span>
            </div>
            <div className="space-y-4">
              {section.hotkeys.map((hotkey, idx) => {
                const favoriteSectionTitle =
                  hotkey.favoriteSourceSectionTitle ?? section.title;
                const baseSectionTitle =
                  hotkey.baseSectionTitle ?? favoriteSectionTitle;
                const baseShortcutTitle =
                  hotkey.baseShortcutTitle ?? hotkey.title;
                return (
                  <div
                    key={hotkey.title + idx}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1">
                        <span>{hotkey.title}</span>
                      </span>
                    </div>
                    <ShortcutMethod
                      shortcut={hotkey}
                      compact
                      className="col-span-2 row-start-2"
                    />
                    <div className="col-start-2 row-start-1 flex items-center gap-1.5">
                      <FavoriteButton
                        itemType="shortcut"
                        appSlug={application.slug}
                        keymapTitle={displayKeymap.title}
                        sectionTitle={favoriteSectionTitle}
                        shortcutTitle={hotkey.baseShortcutTitle ?? hotkey.title}
                        baseShortcutId={hotkey.baseShortcutId}
                        baseShortcutAliases={hotkey.baseShortcutAliases}
                        className="shrink-0 text-muted-foreground"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    />
  );

  const emptySearchState = (
    <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
      <Search
        className="mx-auto mb-4 size-6 text-muted-foreground"
        aria-hidden="true"
      />
      <h2 className="text-lg font-semibold tracking-tight">
        {searchTerm.trim() ? "No shortcuts found" : "No shortcuts yet"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {searchTerm.trim()
          ? "Try another action name or clear your search."
          : "This keymap doesn't have any shortcuts yet."}
      </p>
      {searchTerm.trim() && (
        <Button
          variant="outline"
          className="mt-5 rounded-xl"
          onClick={() => {
            setSearchTerm("");
            setSelectedIndex(-1);
          }}
        >
          Clear search
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl pb-8">
      <div className="mb-8 rounded-2xl border bg-muted/40 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div
            role="search"
            aria-label="Search shortcuts"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <SearchBar
                value={searchTerm}
                onChange={handleSearch}
                placeholder={`Search ${application.name} shortcuts…`}
                className="h-12 rounded-xl bg-card text-base shadow-xs"
              />
            </div>
          </div>
          <KeymapSelector
            keymaps={catalogApplication.keymaps}
            activeKeymap={displayKeymap.title}
            urlPrefix={`/apps/${application.slug}`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            aria-live="polite"
            className="font-mono text-xs text-muted-foreground"
          >
            {searchTerm.trim()
              ? `${resultCount} matching ${resultCount === 1 ? "shortcut" : "shortcuts"}`
              : `${shortcutCount} ${shortcutCount === 1 ? "shortcut" : "shortcuts"} / ${displayKeymap.sections.length} ${displayKeymap.sections.length === 1 ? "section" : "sections"}`}
          </p>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            {viewMode === "list" && (
              <Button
                variant="outline"
                size="sm"
                className="size-9 shrink-0 rounded-xl px-0 sm:w-auto sm:px-3 md:hidden"
                onClick={() => setSectionSheetOpen(true)}
              >
                <Menu className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Sections</span>
              </Button>
            )}
            <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded-lg px-2.5 aria-pressed:text-brand"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >
                <List className="size-3.5" aria-hidden="true" /> List
              </Button>
              <Button
                variant={viewMode === "cheatsheet" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded-lg px-2.5 aria-pressed:text-brand"
                onClick={() => setViewMode("cheatsheet")}
                aria-label="Cheat sheet view"
                aria-pressed={viewMode === "cheatsheet"}
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" /> Cheat
                sheet
              </Button>
              {viewMode === "cheatsheet" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg"
                      aria-label="Column settings"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 rounded-xl" align="end">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <TypographySmall>Columns</TypographySmall>
                        <TypographyMuted>
                          {effectiveColumnCount}
                        </TypographyMuted>
                      </div>
                      <Slider
                        aria-label="Cheat sheet columns"
                        min={MIN_COLUMNS}
                        max={MAX_COLUMNS}
                        step={1}
                        value={[userColumnCount]}
                        onValueChange={([value]) => setColumnCount(value)}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>
      </div>
      {viewMode === "list" ? (
        <>
          <Sheet open={sectionSheetOpen} onOpenChange={setSectionSheetOpen}>
            <SheetContent
              side="left"
              className="w-64 overflow-y-auto p-6 pt-12"
            >
              <SheetTitle className="sr-only">Sections</SheetTitle>
              <TableOfContents
                sections={displaySections}
                sectionRefs={sectionRefs}
                onSectionClick={() => setSectionSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
          {resultCount === 0 ? (
            emptySearchState
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
              <div className="hidden min-w-0 md:block">
                <TableOfContents
                  sections={displaySections}
                  sectionRefs={sectionRefs}
                />
              </div>
              <div className="min-w-0 space-y-5">{appDetails}</div>
            </div>
          )}
        </>
      ) : (
        <div
          ref={cheatsheetContainerRef}
          data-columns={effectiveColumnCount}
          className="w-full min-w-0"
        >
          {resultCount === 0 ? emptySearchState : cheatsheetView}
        </div>
      )}
    </div>
  );
};
