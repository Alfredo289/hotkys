"use client";

import { useState } from "react";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  itemType: "app" | "keymap" | "shortcut";
  appSlug: string;
  keymapTitle?: string;
  sectionTitle?: string;
  shortcutTitle?: string;
  baseShortcutId?: string;
  baseShortcutAliases?: string[];
  label?: string;
  className?: string;
  size?: "default" | "sm" | "icon";
}

export function FavoriteButton({
  itemType,
  appSlug,
  keymapTitle,
  sectionTitle,
  shortcutTitle,
  baseShortcutId,
  baseShortcutAliases,
  label,
  className,
  size = "icon",
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favorited = isFavorite({
    itemType,
    appSlug,
    keymapTitle,
    sectionTitle,
    shortcutTitle,
    baseShortcutId,
    baseShortcutAliases,
  });

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    setError(null);
    try {
      await toggleFavorite({
        itemType,
        appSlug,
        keymapTitle,
        sectionTitle,
        shortcutTitle,
        baseShortcutId,
        baseShortcutAliases,
      });
    } catch {
      setError("Could not update favorites. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={handleToggle}
        disabled={isLoading}
        className={cn("h-8 w-8", className)}
        aria-label={
          label
            ? `${favorited ? "Remove" : "Add"} ${label} ${favorited ? "from" : "to"} favorites`
            : favorited
              ? "Remove from favorites"
              : "Add to favorites"
        }
        aria-pressed={favorited}
        title={error ?? undefined}
      >
        <Star
          className={cn("h-4 w-4", favorited && "fill-brand text-brand")}
          aria-hidden="true"
        />
      </Button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
