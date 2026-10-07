import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { usePlatformFilter } from "./use-platform-filter";
import { usePreferences } from "./use-preferences";

const STORAGE_KEY = "hotkys:preferences:v1";

describe("local preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to macOS with no auth provider and nothing saved", () => {
    const { result } = renderHook(() => usePlatformFilter());
    expect(result.current.platformFilter).toBe("macos");
  });

  it("defaults to list view and four columns", () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.preferences).toEqual({
      platformFilter: "macos",
      viewMode: "list",
      columnCount: 4,
    });
  });

  it("persists the platform filter across remounts, including all platforms", () => {
    const first = renderHook(() => usePlatformFilter());
    act(() => first.result.current.setPlatformFilter("windows"));
    expect(first.result.current.platformFilter).toBe("windows");
    first.unmount();

    const second = renderHook(() => usePlatformFilter());
    expect(second.result.current.platformFilter).toBe("windows");
    act(() => second.result.current.setPlatformFilter(null));
    second.unmount();

    const third = renderHook(() => usePlatformFilter());
    expect(third.result.current.platformFilter).toBeNull();
  });

  it("persists view mode and column count without touching the platform", () => {
    const first = renderHook(() => usePreferences());
    act(() => {
      void first.result.current.updatePreferences({ viewMode: "cheatsheet" });
    });
    act(() => {
      void first.result.current.updatePreferences({ columnCount: 2 });
    });
    first.unmount();

    const second = renderHook(() => usePreferences());
    expect(second.result.current.preferences).toEqual({
      platformFilter: "macos",
      viewMode: "cheatsheet",
      columnCount: 2,
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(1);
  });

  it("shares changes between components using preferences", () => {
    const filter = renderHook(() => usePlatformFilter());
    const prefs = renderHook(() => usePreferences());
    act(() => filter.result.current.setPlatformFilter("linux"));
    expect(prefs.result.current.preferences.platformFilter).toBe("linux");
  });

  it("falls back to defaults for corrupt or out-of-range values", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        platformFilter: "amiga",
        viewMode: "grid",
        columnCount: 99,
      }),
    );
    const { result } = renderHook(() => usePreferences());
    expect(result.current.preferences).toEqual({
      platformFilter: "macos",
      viewMode: "list",
      columnCount: 4,
    });
    localStorage.setItem(STORAGE_KEY, "{nope");
    const again = renderHook(() => usePreferences());
    expect(again.result.current.preferences.platformFilter).toBe("macos");
  });
});
