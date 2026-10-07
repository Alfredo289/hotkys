import { isWindowsProcessName } from "@/lib/shortcut-core/windows";
import {
  isHttpUrl,
  isSafeImageLocation,
} from "@/lib/validation/resource-location";

export const USER_CONTENT_LIMITS = {
  appName: 100,
  slug: 80,
  bundleId: 255,
  windowsAppId: 255,
  windowsProcessName: 100,
  hostname: 253,
  urlOrPath: 2048,
  keymapTitle: 100,
  sectionTitle: 100,
  shortcutTitle: 50,
  shortcutKey: 255,
  shortcutComment: 50,
  customApps: 25,
  customKeymaps: 100,
  customSections: 500,
  customShortcuts: 2000,
} as const;

export const CUSTOM_APP_SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;

interface CustomAppMetadata {
  name?: string;
  slug?: string;
  bundleId?: string | null;
  windowsAppId?: string | null;
  windowsProcessName?: string | null;
  hostname?: string | null;
  source?: string | null;
  icon?: string | null;
}

export function validateCustomAppMetadata(app: CustomAppMetadata): void {
  if (app.name !== undefined) {
    validateRequiredText(app.name, "App name", USER_CONTENT_LIMITS.appName);
  }
  if (app.slug !== undefined) {
    validateRequiredText(app.slug, "Slug", USER_CONTENT_LIMITS.slug);
    if (!CUSTOM_APP_SLUG_PATTERN.test(app.slug)) {
      throw new Error(
        "Slug must contain only letters, numbers, and single hyphens",
      );
    }
  }
  validateOptionalText(app.bundleId, "Bundle ID", USER_CONTENT_LIMITS.bundleId);
  validateOptionalText(
    app.windowsAppId,
    "Windows app ID",
    USER_CONTENT_LIMITS.windowsAppId,
  );
  validateOptionalText(
    app.windowsProcessName,
    "Windows process name",
    USER_CONTENT_LIMITS.windowsProcessName,
  );
  if (
    app.windowsAppId &&
    (!app.windowsAppId.trim() || /[\x00-\x1f\x7f]/.test(app.windowsAppId))
  ) {
    throw new Error(
      "Windows app ID must be non-empty and contain no control characters",
    );
  }
  if (app.windowsProcessName && !isWindowsProcessName(app.windowsProcessName)) {
    throw new Error(
      "Windows process name must be an executable name without .exe or a path",
    );
  }
  validateOptionalText(app.hostname, "Hostname", USER_CONTENT_LIMITS.hostname);
  validateOptionalText(app.source, "Source URL", USER_CONTENT_LIMITS.urlOrPath);
  validateOptionalText(app.icon, "Image path", USER_CONTENT_LIMITS.urlOrPath);
  if (app.source && !isHttpUrl(app.source)) {
    throw new Error("Source URL must use http or https");
  }
  if (app.icon && !isSafeImageLocation(app.icon)) {
    throw new Error(
      "Image path must be a relative path or an http/https URL",
    );
  }
}

export function validateRequiredText(
  value: string,
  label: string,
  maxLength: number,
): void {
  if (value.trim().length === 0) throw new Error(`${label} is required`);
  validateTextLength(value, label, maxLength);
}

export function validateOptionalText(
  value: string | null | undefined,
  label: string,
  maxLength: number,
): void {
  if (value === null || value === undefined || value.length === 0) return;
  validateTextLength(value, label, maxLength);
}

function validateTextLength(value: string, label: string, maxLength: number): void {
  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer`);
  }
}
