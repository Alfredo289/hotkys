"use client";
import { useCallback } from "react";
import {
  matchesFavorite,
  type FavoriteIdentifier,
} from "@/lib/shortcut-core/favorites";
import { useHydrated, useLocalStore } from "@/lib/storage/local-store";
import {
  favoritesStore,
  type LocalFavorite,
} from "@/lib/storage/favorites-store";

function toFavorite(identifier: FavoriteIdentifier): LocalFavorite {
  return {
    id: crypto.randomUUID(),
    itemType: identifier.itemType,
    ...(identifier.appSlug !== undefined && { appSlug: identifier.appSlug }),
    ...(identifier.itemType !== "app" &&
      identifier.keymapTitle !== undefined && {
        keymapTitle: identifier.keymapTitle,
      }),
    ...(identifier.itemType === "shortcut" && {
      ...(identifier.sectionTitle !== undefined && {
        sectionTitle: identifier.sectionTitle,
      }),
      ...(identifier.shortcutTitle !== undefined && {
        shortcutTitle: identifier.shortcutTitle,
      }),
      ...(identifier.baseShortcutId !== undefined && {
        baseShortcutId: identifier.baseShortcutId,
      }),
    }),
  };
}

export function useFavorites() {
  const favorites = useLocalStore(favoritesStore);
  const hydrated = useHydrated();

  const isFavorite = useCallback(
    (identifier: FavoriteIdentifier) =>
      favorites.some((row) => matchesFavorite(row, identifier)),
    [favorites],
  );

  const toggleFavorite = useCallback(async (identifier: FavoriteIdentifier) => {
    favoritesStore.update((current) =>
      current.some((row) => matchesFavorite(row, identifier))
        ? current.filter((row) => !matchesFavorite(row, identifier))
        : [...current, toFavorite(identifier)],
    );
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    favoritesStore.update((current) => current.filter((row) => row.id !== id));
  }, []);

  return {
    favorites,
    isLoading: !hydrated,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
}
