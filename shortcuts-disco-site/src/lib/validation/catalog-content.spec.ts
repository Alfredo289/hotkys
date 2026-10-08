import { describe, expect, it } from "@jest/globals";
import {
  CATALOG_LIMITS,
  validateAppMetadata,
} from "./catalog-content";

describe("user content validation", () => {
  it.each([
    ["name", "App name", CATALOG_LIMITS.appName],
    ["slug", "Slug", CATALOG_LIMITS.slug],
    ["bundleId", "Bundle ID", CATALOG_LIMITS.bundleId],
    ["windowsAppId", "Windows app ID", CATALOG_LIMITS.windowsAppId],
    [
      "windowsProcessName",
      "Windows process name",
      CATALOG_LIMITS.windowsProcessName,
    ],
    ["hostname", "Hostname", CATALOG_LIMITS.hostname],
    ["source", "Source URL", CATALOG_LIMITS.urlOrPath],
    ["icon", "Image path", CATALOG_LIMITS.urlOrPath],
  ] as const)("limits app %s", (field, label, limit) => {
    expect(() =>
      validateAppMetadata({ [field]: "x".repeat(limit + 1) }),
    ).toThrow(`${label} must be ${limit} characters or fewer`);
  });

  it.each([
    "Code.exe",
    "CODE.EXE",
    "C:\\Code",
    "../Code",
    "Code..App",
    "Code\n",
    "Code\r",
    "$(Code)",
  ])("rejects invalid Windows process names %p", (windowsProcessName) => {
    expect(() => validateAppMetadata({ windowsProcessName })).toThrow(
      "Windows process name must be an executable name without .exe or a path",
    );
  });

  it.each(["   ", "Vendor\nApp", "Vendor\u007fApp"])(
    "rejects invalid Windows app IDs %p",
    (windowsAppId) => {
      expect(() => validateAppMetadata({ windowsAppId })).toThrow(
        "Windows app ID must be non-empty and contain no control characters",
      );
    },
  );

  it("accepts optional Windows metadata and bounded executable names", () => {
    for (const windowsProcessName of [
      undefined,
      null,
      "Code",
      "Adobe XD",
      "x".repeat(100),
    ]) {
      expect(() =>
        validateAppMetadata({
          windowsAppId: "Vendor.Package!App",
          windowsProcessName,
        }),
      ).not.toThrow();
    }
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "ftp://example.com/app",
    "http://",
    "http://javascript:alert(1)",
    "https://example.com:99999/path",
    "https://[:]/",
    "https://%25/path",
    "https://[v1.fe]/path",
    "\nhttps://example.com",
    "https://example.com\n",
    "https://example.com/\npath",
  ])(
    "rejects unsafe source URL scheme %p",
    (source) => {
      expect(() => validateAppMetadata({ source })).toThrow(
        "Source URL must use http or https",
      );
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,<svg></svg>",
    "file:///tmp/icon.png",
    "https://",
    "http://javascript:alert(1)",
    "icons/\napp.png",
    "icons/app.png\n",
    "//example.com/icon.png",
    "\\\\example.com\\icon.png",
  ])("rejects unsafe image location %p", (icon) => {
    expect(() => validateAppMetadata({ icon })).toThrow(
      "Image path must be a relative path or an http/https URL",
    );
  });

  it.each([
    "/custom-icons/app.png",
    "custom-icons/app.png",
    "../custom-icons/app.png",
    "http://example.com/app.png",
    "https://example.com/app.png",
    "http://localhost:3000/app.png",
  ])("accepts safe image location %p", (icon) => {
    expect(() => validateAppMetadata({ icon })).not.toThrow();
  });
});
