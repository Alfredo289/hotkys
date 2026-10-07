import {
  APP_SLUG_PATTERN,
  CATALOG_LIMITS,
} from "../validation/catalog-content";
import type { ImportPlatform } from "./types";

export const IMPORT_PLATFORMS: readonly ImportPlatform[] = ["macos", "windows"];

export const isImportPlatform = (value: unknown): value is ImportPlatform =>
  IMPORT_PLATFORMS.includes(value as ImportPlatform);

/** Problems with the identifying parts of an import request, as messages. Empty when the request is well formed. */
export function requestProblems(request: {
  app?: string;
  slug?: string;
  platform?: string;
}): string[] {
  const problems: string[] = [];
  if (!request.app?.trim()) problems.push("App name is required.");
  if (
    !request.slug ||
    request.slug.length > CATALOG_LIMITS.slug ||
    !APP_SLUG_PATTERN.test(request.slug)
  ) {
    problems.push(
      `Slug "${request.slug}" must be letters, digits and single hyphens (max ${CATALOG_LIMITS.slug} characters).`,
    );
  }
  if (!isImportPlatform(request.platform))
    problems.push(
      `Platform "${request.platform}" must be ${IMPORT_PLATFORMS.join(" or ")}.`,
    );
  return problems;
}
