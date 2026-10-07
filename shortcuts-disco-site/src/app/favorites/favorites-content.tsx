"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search, Star } from "lucide-react";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { withBaseShortcutIdentities } from "@/lib/catalog-identities";
import { matchesFavorite } from "@/lib/shortcut-core/favorites";
import type { LocalFavorite } from "@/lib/storage/favorites-store";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import { SearchBar } from "@/components/ui/search-bar";
import { ShortcutMethod } from "@/components/shortcuts/shortcut-method";
import { serializeKeymap } from "@/lib/model/keymap-utils";
import { appDescriptions } from "@/lib/app-descriptions";
import type {
  AppShortcuts,
  SectionShortcut,
} from "@/lib/model/internal/internal-models";

const filters = [
  ["all", "All"],
  ["app", "Apps"],
  ["keymap", "Keymaps"],
  ["shortcut", "Shortcuts"],
] as const;

const MISSING_TEXT = "No longer in the catalog";

export function FavoritesContent({
  applications = [],
}: {
  applications?: AppShortcuts[];
}) {
  const { favorites, isLoading, removeFavorite } = useFavorites();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | LocalFavorite["itemType"]>(
    "all",
  );
  const identifiedApps = useMemo(
    () => withBaseShortcutIdentities(applications),
    [applications],
  );
  const entries = favorites.map((favorite) =>
    resolveFavorite(favorite, identifiedApps),
  );
  const visible = entries.filter(
    (entry) =>
      (filter === "all" || entry.favorite.itemType === filter) &&
      [entry.appName, entry.title, entry.keymapTitle, entry.sectionTitle]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const removeButton = (entry: FavoriteEntry) => (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 rounded-lg text-brand"
      aria-label={`Remove ${entry.title} from favorites`}
      onClick={() => removeFavorite(entry.favorite.id)}
    >
      <Star className="size-4 fill-current" aria-hidden="true" />
    </Button>
  );

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm text-brand">
            <Star className="size-4" aria-hidden="true" />
            Your collection
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.055em] md:text-5xl">
            Favorites
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            The apps you reach for. The shortcuts you want to remember.
          </p>
        </div>
        <Button asChild variant="outline" className="self-start rounded-xl">
          <Link href="/#applications">
            Explore apps <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading favorites"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border bg-muted/50"
            />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <Star className="mx-auto mb-5 size-8 text-brand" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Make this space yours.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tap the star on an app or shortcut to keep it here. Start with an
            app you use every day.
          </p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/#applications">
              Find your first favorite{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 rounded-2xl border bg-muted/40 p-4">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              aria-label="Search favorites"
              placeholder="Search your apps and shortcuts…"
              className="h-12 rounded-xl bg-card text-base"
            />
            <div
              className="mt-3 flex flex-wrap gap-1"
              role="group"
              aria-label="Favorite type"
            >
              {filters.map(([value, label]) => (
                <Button
                  key={value}
                  variant={filter === value ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className="rounded-lg aria-pressed:text-brand"
                >
                  {label}
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    {value === "all"
                      ? favorites.length
                      : favorites.filter((f) => f.itemType === value).length}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <p role="status" className="sr-only">
            {visible.length} saved items
          </p>
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <Search
                className="mx-auto mb-4 size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="font-semibold">No matching favorites</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another search or view your whole collection.
              </p>
              <Button
                variant="outline"
                className="mt-5 rounded-xl"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {(["app", "keymap"] as const).map((type) => {
                const items = visible.filter(
                  (e) => e.favorite.itemType === type,
                );
                return (
                  items.length > 0 && (
                    <section
                      key={type}
                      aria-label={
                        type === "app" ? "Saved apps" : "Saved keymaps"
                      }
                    >
                      <h2 className="mb-4 text-xl font-semibold tracking-tight">
                        {type === "app" ? "Apps" : "Keymaps"}{" "}
                        <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                          {items.length}
                        </span>
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((entry) => (
                          <div
                            key={entry.favorite.id}
                            className="relative rounded-2xl border bg-card transition-colors hover:border-brand/35"
                          >
                            {(() => {
                              const body = (
                                <>
                                  <AppIcon
                                    icon={entry.app?.icon}
                                    appName={entry.appName}
                                    size="md"
                                    className="mb-5 size-11 rounded-xl [&_img]:object-contain"
                                  />
                                  <h3 className="font-semibold tracking-tight">
                                    {entry.title}
                                  </h3>
                                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {entry.missing
                                      ? type === "keymap"
                                        ? entry.appName
                                        : "This app was removed from the catalog."
                                      : type === "keymap"
                                        ? entry.appName
                                        : (appDescriptions[
                                            entry.app?.slug ?? ""
                                          ] ??
                                          "Your saved shortcut collection.")}
                                  </p>
                                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                    {entry.missing
                                      ? MISSING_TEXT
                                      : type === "app"
                                        ? "Open app"
                                        : "Open keymap"}
                                    {!entry.missing && (
                                      <ArrowUpRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </p>
                                </>
                              );
                              return entry.missing ? (
                                <div className="block rounded-2xl p-5 pr-14 opacity-75">
                                  {body}
                                </div>
                              ) : (
                                <Link
                                  href={entry.href}
                                  className="block rounded-2xl p-5 pr-14"
                                >
                                  {body}
                                </Link>
                              );
                            })()}
                            <div className="absolute top-4 right-3">
                              {removeButton(entry)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                );
              })}
              {visible.some((e) => e.favorite.itemType === "shortcut") && (
                <section aria-label="Saved shortcuts">
                  <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Shortcuts
                  </h2>
                  <div className="space-y-5">
                    {Array.from(
                      new Set(
                        visible
                          .filter((e) => e.favorite.itemType === "shortcut")
                          .map((e) => e.groupKey),
                      ),
                    ).map((group) => {
                      const items = visible.filter(
                        (e) =>
                          e.favorite.itemType === "shortcut" &&
                          e.groupKey === group,
                      );
                      const first = items[0];
                      return (
                        <div
                          key={group}
                          className="rounded-2xl border bg-card p-3 sm:p-4"
                        >
                          <div className="mb-4 flex items-center gap-3 px-2 pt-2">
                            <AppIcon
                              icon={first.app?.icon}
                              appName={first.appName}
                              size="md"
                              className="rounded-lg [&_img]:object-contain"
                            />
                            <div>
                              <h3 className="font-semibold tracking-tight">
                                {first.appName}
                              </h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {first.keymapTitle}
                              </p>
                            </div>
                          </div>
                          {items.map((entry) => (
                            <div
                              key={entry.favorite.id}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 rounded-xl px-3 py-3 odd:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                            >
                              {entry.missing ? (
                                <div className="col-start-1 row-start-1 min-w-0 text-sm font-medium">
                                  <span>{entry.title}</span>
                                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                    {entry.sectionTitle}
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  href={entry.href}
                                  className="col-start-1 row-start-1 min-w-0 text-sm font-medium hover:text-brand"
                                >
                                  <span>{entry.title}</span>
                                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                    {entry.sectionTitle}
                                  </span>
                                </Link>
                              )}
                              <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                                {entry.shortcut ? (
                                  <ShortcutMethod shortcut={entry.shortcut} />
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {MISSING_TEXT}. You can still remove this
                                    favorite.
                                  </p>
                                )}
                              </div>
                              <div className="col-start-2 row-start-1 sm:col-start-3">
                                {removeButton(entry)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface FavoriteEntry {
  favorite: LocalFavorite;
  app?: AppShortcuts;
  appName: string;
  title: string;
  href: string;
  keymapTitle?: string;
  sectionTitle?: string;
  groupKey: string;
  shortcut?: SectionShortcut;
  /** The saved item is no longer in the catalog. */
  missing: boolean;
}

function resolveFavorite(
  favorite: LocalFavorite,
  apps: AppShortcuts[],
): FavoriteEntry {
  const app = apps.find((candidate) => candidate.slug === favorite.appSlug);
  const keymap =
    favorite.itemType === "app"
      ? app?.keymaps[0]
      : app?.keymaps.find(
          (candidate) => candidate.title === favorite.keymapTitle,
        );
  const section = keymap?.sections.find(
    (candidate) => candidate.title === favorite.sectionTitle,
  );
  const shortcut =
    favorite.itemType === "shortcut" && app && keymap && section
      ? section.hotkeys.find((row) =>
          matchesFavorite(favorite, {
            itemType: "shortcut",
            appSlug: app.slug,
            keymapTitle: keymap.title,
            sectionTitle: section.title,
            shortcutTitle: row.baseShortcutTitle ?? row.title,
            baseShortcutId: row.baseShortcutId,
            baseShortcutAliases: row.baseShortcutAliases,
          }),
        )
      : undefined;
  const missing =
    !app ||
    (favorite.itemType !== "app" && !keymap) ||
    (favorite.itemType === "shortcut" && !shortcut);
  const appName = app?.name ?? favorite.appSlug ?? "Unavailable app";
  const href = missing
    ? "/#applications"
    : `/apps/${app.slug}${keymap ? `/${serializeKeymap(keymap)}` : ""}${
        favorite.itemType === "shortcut" && section
          ? `#${encodeURIComponent(section.title)}`
          : ""
      }`;
  return {
    favorite,
    app,
    appName,
    shortcut,
    href,
    missing,
    keymapTitle: keymap?.title ?? favorite.keymapTitle,
    sectionTitle: section?.title ?? favorite.sectionTitle,
    groupKey: `${favorite.appSlug}/${favorite.keymapTitle}`,
    title:
      favorite.itemType === "app"
        ? appName
        : favorite.itemType === "keymap"
          ? (favorite.keymapTitle ?? "Saved keymap")
          : (shortcut?.title ?? favorite.shortcutTitle ?? "Saved shortcut"),
  };
}
