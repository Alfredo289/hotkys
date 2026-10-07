"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { ArrowRight, ArrowUpRight, Search, Star } from "lucide-react";
import { AppShortcuts, Platform } from "@/lib/model/internal/internal-models";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import { PlatformFilter } from "@/components/ui/platform-filter";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation";
import { usePlatformFilter } from "@/lib/hooks/use-platform-filter";
import { usePlatform } from "@/lib/hooks/use-platform";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { useAuth } from "@/components/auth/auth-provider";
import { getLoginHref } from "@/lib/auth/redirect";
import { serializeKeymap } from "@/lib/model/keymap-utils";
import {
  getAppPlatforms,
  appMatchesPlatformFilter,
} from "@/lib/utils/platform-helpers";
import { cn, getPlatformDisplay } from "@/lib/utils";
import { appDescriptions } from "@/lib/app-descriptions";

function getAppKeymapUrl(app: AppShortcuts, userPlatform: Platform): string {
  const bestKeymap =
    app.keymaps.find((k) => k.platforms?.includes(userPlatform)) ??
    app.keymaps[0];
  return bestKeymap
    ? `/apps/${app.slug}/${serializeKeymap(bestKeymap)}`
    : `/apps/${app.slug}`;
}

export function ApplicationList({
  applications,
}: {
  applications: AppShortcuts[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const userPlatform = usePlatform();
  const { platformFilter, setPlatformFilter } = usePlatformFilter();
  const { user, isLoading: authLoading } = useAuth();
  const { favorites, isLoading: favoritesLoading } = useFavorites();

  const filteredByPlatform = useMemo(
    () =>
      applications.filter((app) =>
        appMatchesPlatformFilter(app, platformFilter),
      ),
    [applications, platformFilter],
  );
  const fuse = useMemo(
    () => new Fuse(filteredByPlatform, { keys: ["name"], includeScore: true }),
    [filteredByPlatform],
  );
  const appShortcuts = useMemo(
    () =>
      searchTerm.trim()
        ? fuse.search(searchTerm.trim()).map((result) => result.item)
        : filteredByPlatform,
    [searchTerm, filteredByPlatform, fuse],
  );
  const favoriteApps = applications.filter((app) =>
    favorites.some(
      (favorite) =>
        favorite.itemType === "app" && favorite.appSlug === app.slug,
    ),
  );
  const { selectedIndex, itemRefs, scopeRef } = useKeyboardNavigation(
    appShortcuts,
    undefined,
    (app) => getAppKeymapUrl(app, platformFilter ?? userPlatform),
    {
      scope: "search",
      resetKey: appShortcuts.map((app) => app.slug).join("|"),
    },
  );

  return (
    <>
      <section
        aria-labelledby="favorites-title"
        className="mb-12 flex flex-col gap-5 rounded-2xl border bg-muted/50 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-start gap-4 lg:max-w-sm">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand/8 text-brand">
            <Star className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="favorites-title" className="font-semibold tracking-tight">
              Your favorites, within reach.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {user
                ? "Your saved apps and shortcuts, all in one place."
                : "Save the apps you use most. Build your own shortcut collection."}
            </p>
          </div>
        </div>
        {authLoading || (user && favoritesLoading) ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your favorites…
          </p>
        ) : user ? (
          <div className="flex flex-wrap items-center gap-2">
            {favoriteApps.slice(0, 3).map((app) => (
              <Link
                key={app.slug}
                href={getAppKeymapUrl(app, userPlatform)}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium hover:border-brand/40"
              >
                <AppIcon icon={app.icon} appName={app.name} />
                {app.name}
              </Link>
            ))}
            {favorites.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Tap a star below to save your first app.
              </p>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/favorites">
                View favorites{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <Button
            asChild
            variant="outline"
            className="shrink-0 self-start rounded-xl lg:self-auto"
          >
            <Link href={getLoginHref("/")}>
              Sign in to save favorites{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </section>

      <section
        id="applications"
        ref={scopeRef}
        aria-labelledby="applications-title"
        className="scroll-mt-8"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2
              id="applications-title"
              className="text-2xl font-semibold tracking-[-0.035em] md:text-3xl"
            >
              Find your app.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your next favorite shortcut is in here.
            </p>
          </div>
          <span className="shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
            {applications.length} apps
          </span>
        </div>
        <div className="mb-6 flex items-center gap-3">
          <SearchBar
            aria-label="Search applications"
            placeholder="Search apps, like Figma or VS Code…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            className="h-12 rounded-xl bg-card pl-10 pr-16 text-base shadow-xs"
          />
          <PlatformFilter
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
          />
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mb-4 text-xs text-muted-foreground"
        >
          {searchTerm.trim() || platformFilter
            ? `${appShortcuts.length} matching ${appShortcuts.length === 1 ? "app" : "apps"}`
            : "All applications"}
        </p>
        {appShortcuts.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-14 text-center">
            <Search
              className="mx-auto mb-4 size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="font-medium">No apps found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another name or choose a different platform.
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => {
                setSearchTerm("");
                setPlatformFilter(null);
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {appShortcuts.map((app, index) => {
              const platforms = getAppPlatforms(app);
              const keymap =
                app.keymaps.find((k) =>
                  k.platforms?.includes(platformFilter ?? userPlatform),
                ) ?? app.keymaps[0];
              const count =
                keymap?.sections.reduce(
                  (total, section) => total + section.hotkeys.length,
                  0,
                ) ?? 0;
              return (
                <div
                  key={app.slug}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  className={cn(
                    "app-card relative rounded-2xl border bg-card hover:border-brand/35",
                    selectedIndex === index &&
                      "outline-2 outline-offset-2 outline-ring",
                  )}
                >
                  <Link
                    href={getAppKeymapUrl(app, platformFilter ?? userPlatform)}
                    className="block rounded-2xl p-5"
                    aria-label={`${app.name}, ${count} shortcuts`}
                    aria-describedby={`app-description-${app.slug}`}
                  >
                    <AppIcon
                      icon={app.icon}
                      appName={app.name}
                      size="md"
                      className="mb-5 size-11 rounded-xl bg-transparent [&_img]:object-contain"
                    />
                    <div className="flex items-center gap-2 pr-4">
                      <h3 className="text-base font-semibold tracking-tight">
                        {app.name}
                      </h3>
                    </div>
                    <p
                      id={`app-description-${app.slug}`}
                      className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground"
                    >
                      {appDescriptions[app.slug] ??
                        "Keyboard shortcuts for your everyday workflow."}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {count} shortcuts{" "}
                      <span className="px-1" aria-hidden="true">
                        /
                      </span>{" "}
                      {app.keymaps.length}{" "}
                      {app.keymaps.length === 1 ? "keymap" : "keymaps"}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-2 border-t pt-3">
                      <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {platforms.length
                          ? platforms.map((platform) => (
                              <span key={platform}>
                                {getPlatformDisplay(platform)}
                              </span>
                            ))
                          : "All platforms"}
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                  <FavoriteButton
                    itemType="app"
                    appSlug={app.slug}
                    showSignIn
                    className="absolute top-5 right-4 rounded-lg text-muted-foreground"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
