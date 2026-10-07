/** @jest-environment node */
import { it, expect, beforeEach, afterEach, describe } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import {
  importShortcuts,
  type ImportReport,
  type ImportRequest,
} from "./import-shortcuts";
import type { InputApp } from "../model/input/input-models";
import { createTempCatalog } from "./test-catalog";

let catalog: ReturnType<typeof createTempCatalog>;
beforeEach(() => {
  catalog = createTempCatalog();
});
afterEach(() => catalog.cleanup());

const table = (
  rows: string[][],
  header = "| Action | Shortcut | Comment |\n| --- | --- | --- |",
) => [header, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");

const run = (
  markdown: string,
  overrides: Partial<ImportRequest> = {},
): ImportReport =>
  importShortcuts(catalog.root, {
    markdown,
    fileName: "notation.md",
    app: "Notation",
    slug: "notation",
    platform: "macos",
    ...overrides,
  });

/** Imports one cell as the only row (line 3) and returns the report. */
const cell = (shortcut: string, platform: "macos" | "windows" = "macos") =>
  run(table([["Do it", shortcut, ""]]), { platform });
const entries = (report: ImportReport) =>
  report.preview?.sections.flatMap((section) => section.entries) ?? [];
const keys = (report: ImportReport) =>
  entries(report).map((entry) => entry.key);
const diagnostics = (
  report: ImportReport,
  severity: "error" | "warning" | "notice",
) => report.diagnostics.filter((d) => d.severity === severity);
const readApp = (slug = "notation") =>
  JSON.parse(
    fs.readFileSync(path.join(catalog.dataDir, `${slug}.json`), "utf8"),
  ) as InputApp;

describe("modifiers", () => {
  it.each([
    ["⇧ ⌘ /", "shift+cmd+/"],
    ["⌘⇧Z", "shift+cmd+z"],
    ["⌃⌥⌘K", "ctrl+opt+cmd+k"],
    ["Cmd+Shift+Z", "shift+cmd+z"],
    ["Command + Option + Esc", "opt+cmd+esc"],
    ["Control+Opt+Shift+K", "ctrl+shift+opt+k"],
    ["Ctl+K", "ctrl+k"],
    ["cmd+opt+ctrl+shift+m", "ctrl+shift+opt+cmd+m"],
    ["⌘ W", "cmd+w"],
    ["⇧ ⌘ P", "shift+cmd+p"],
  ])("%s -> %s on macOS", (input, expected) => {
    const report = cell(input);
    expect(report.ok).toBe(true);
    expect(keys(report)).toEqual([expected]);
  });

  it.each([
    ["Win+E", "win+e"],
    ["Windows+R", "win+r"],
    ["Super+D", "win+d"],
    ["Alt+F4", "alt+f4"],
    ["Option+F4", "alt+f4"],
    ["⌥F4", "alt+f4"],
    ["Shift+Alt+Ctrl+Win+X", "ctrl+shift+alt+win+x"],
    ["Ctrl+Alt+Del", "ctrl+alt+delete"],
  ])("%s -> %s on Windows", (input, expected) => {
    const report = cell(input, "windows");
    expect(report.ok).toBe(true);
    expect(keys(report)).toEqual([expected]);
  });
});

describe("key names", () => {
  it.each([
    ["Esc", "esc"],
    ["Escape", "esc"],
    ["⎋", "esc"],
    ["Return", "enter"],
    ["Enter", "enter"],
    ["↵", "enter"],
    ["⏎", "enter"],
    ["Del", "delete"],
    ["Delete", "delete"],
    ["⌦", "delete"],
    ["Backspace", "backspace"],
    ["⌫", "backspace"],
    ["PgUp", "pageup"],
    ["PgDn", "pagedown"],
    ["Page Up", "pageup"],
    ["Page Down", "pagedown"],
    ["Up", "up"],
    ["Down Arrow", "down"],
    ["Arrow Left", "left"],
    ["Right Arrow", "right"],
    ["←", "left"],
    ["↑", "up"],
    ["→", "right"],
    ["↓", "down"],
    ["Space", "space"],
    ["Tab", "tab"],
    ["⇥", "tab"],
    ["F5", "f5"],
    ["f12", "f12"],
    ["Home", "home"],
    ["End", "end"],
  ])("%s -> %s", (input, expected) => {
    const report = cell(`Cmd+${input}`);
    expect(report.ok).toBe(true);
    expect(keys(report)).toEqual([`cmd+${expected}`]);
  });

  it("normalizes F-keys beyond F12 on Windows", () => {
    expect(keys(cell("Ctrl+F24", "windows"))).toEqual(["ctrl+f24"]);
  });

  it("lowercases letters and never implies Shift from uppercase", () => {
    expect(keys(cell("Cmd+Z"))).toEqual(["cmd+z"]);
    expect(keys(cell("Z"))).toEqual(["z"]);
    expect(keys(cell("Cmd+Shift+Z"))).toEqual(["shift+cmd+z"]);
  });

  it("stores shifted characters as the character itself", () => {
    expect(keys(cell("Cmd+?"))).toEqual(["cmd+?"]);
    expect(keys(cell("Ctrl+!"))).toEqual(["ctrl+!"]);
    expect(keys(cell("Ctrl+Shift+@", "windows"))).toEqual(["ctrl+shift+@"]);
  });

  it("removes Markdown escapes from keys", () => {
    expect(keys(cell("Cmd+\\="))).toEqual(["cmd+="]);
    expect(keys(cell("Cmd+\\*"))).toEqual(["cmd+*"]);
    expect(keys(cell("Cmd+\\_"))).toEqual(["cmd+_"]);
    expect(keys(cell("Cmd+\\\\"))).toEqual(["cmd+\\"]);
    expect(keys(cell("Cmd+\\["))).toEqual(["cmd+["]);
  });

  it("accepts keys written as inline code or kbd tags", () => {
    expect(keys(cell("`Cmd+K`"))).toEqual(["cmd+k"]);
    expect(keys(cell("<kbd>Ctrl</kbd>+<kbd>S</kbd>"))).toEqual(["ctrl+s"]);
    expect(keys(cell("Cmd+`"))).toEqual(["cmd+`"]);
  });
});

describe("combo separators", () => {
  it.each([
    ["Ctrl-S", "ctrl+s"],
    ["Ctrl-Shift-Tab", "ctrl+shift+tab"],
    ["Ctrl - S", "ctrl+s"],
    ["Ctrl-Alt-Del", "ctrl+alt+delete"],
    ["Cmd+/", "cmd+/"],
    ["⌘/", "cmd+/"],
    ["Cmd+,", "cmd+,"],
    ["⌘,", "cmd+,"],
    ["Cmd+;", "cmd+;"],
    ["Cmd++", "cmd++"],
    ["Cmd + +", "cmd++"],
    ["⌘ +", "cmd++"],
    ["Cmd+Shift++", "shift+cmd++"],
    ["Cmd+-", "cmd+-"],
    ["Cmd--", "cmd+-"],
    ["Ctrl+Shift+-", "ctrl+shift+-"],
    ["⌘ -", "cmd+-"],
    ["+", "+"],
    ["-", "-"],
    [",", ","],
    ["/", "/"],
  ])("%s -> %s", (input, expected) => {
    const platform = input.startsWith("Ctrl-Alt") ? "windows" : "macos";
    const report = cell(input, platform);
    expect(diagnostics(report, "error")).toEqual([]);
    expect(keys(report)).toEqual([expected]);
  });
});

describe("sequences", () => {
  it.each([
    ["cmd+k cmd+s", "cmd+k cmd+s"],
    ["Cmd+K Cmd+S", "cmd+k cmd+s"],
    ["Cmd+K then Cmd+S", "cmd+k cmd+s"],
    ["Cmd+K, Cmd+S", "cmd+k cmd+s"],
    ["Cmd+K,Cmd+S", "cmd+k cmd+s"],
    ["Cmd+K, then Cmd+S", "cmd+k cmd+s"],
    ["⌘K ⌘S", "cmd+k cmd+s"],
    ["g g", "g g"],
    ["Ctrl+K Ctrl+/", "ctrl+k ctrl+/"],
  ])("%s -> %s", (input, expected) => {
    const report = cell(input);
    expect(diagnostics(report, "error")).toEqual([]);
    expect(keys(report)).toEqual([expected]);
  });

  it("does not mistake space-separated modifiers for a sequence", () => {
    expect(keys(cell("⇧ ⌘ /"))).toEqual(["shift+cmd+/"]);
    expect(keys(cell("Ctrl Shift S"))).toEqual(["ctrl+shift+s"]);
  });
});

describe("alternatives", () => {
  it("splits Cmd+Shift+Z or Cmd+Y into adjacent entries with the same title and line", () => {
    const report = run(
      table([
        ["Redo", "Cmd+Shift+Z or Cmd+Y", "after undo"],
        ["Copy", "Cmd+C", ""],
      ]),
    );
    expect(report.ok).toBe(true);
    expect(entries(report)).toEqual([
      { title: "Redo", key: "shift+cmd+z", comment: "after undo", line: 3 },
      { title: "Redo", key: "cmd+y", comment: "after undo", line: 3 },
      { title: "Copy", key: "cmd+c", line: 4 },
    ]);
    expect(report.changes.added).toBe(3);
  });

  it.each([
    ["Cmd+K or Cmd+J", ["cmd+k", "cmd+j"]],
    ["Cmd+K OR Cmd+J", ["cmd+k", "cmd+j"]],
    ["Cmd+K / Cmd+J", ["cmd+k", "cmd+j"]],
    ["Cmd+K/Cmd+J", ["cmd+k", "cmd+j"]],
    ["⌘W / Ctrl W", ["cmd+w", "ctrl+w"]],
    ["Cmd+K; Cmd+J", ["cmd+k", "cmd+j"]],
    ["Cmd+K;Cmd+J", ["cmd+k", "cmd+j"]],
    ["Cmd+K Cmd+S or Cmd+J", ["cmd+k cmd+s", "cmd+j"]],
    ["Cmd+K / Cmd+/ / Cmd+J", ["cmd+k", "cmd+/", "cmd+j"]],
    ["Cmd+K or Cmd+K Cmd+S; Cmd+J", ["cmd+k", "cmd+k cmd+s", "cmd+j"]],
  ])("%s", (input, expected) => {
    const report = cell(input);
    expect(diagnostics(report, "error")).toEqual([]);
    expect(keys(report)).toEqual(expected);
    expect(new Set(entries(report).map((entry) => entry.title))).toEqual(
      new Set(["Do it"]),
    );
  });

  it("writes alternatives as adjacent shortcuts in source order", () => {
    run(
      table([
        ["Redo", "Cmd+Shift+Z or Cmd+Y", ""],
        ["Copy", "Cmd+C", ""],
      ]),
      { write: true },
    );
    expect(readApp().keymaps[0].sections[0].shortcuts).toEqual([
      { title: "Redo", key: "shift+cmd+z" },
      { title: "Redo", key: "cmd+y" },
      { title: "Copy", key: "cmd+c" },
    ]);
  });

  it("re-running an import with alternatives reports zero changes", () => {
    const markdown = table([["Redo", "Cmd+Shift+Z or Cmd+Y", ""]]);
    run(markdown, { write: true });
    const again = run(markdown, { write: true });
    expect(again.changes).toEqual({
      added: 0,
      alternatives: 0,
      unchanged: 2,
      conflicts: 0,
    });
    expect(again.wrote).toBe(false);
  });

  it("rejects a slash alternative without modifiers instead of inferring a shared prefix", () => {
    const report = cell("Cmd+[ / ]");
    expect(report.ok).toBe(false);
    expect(keys(report)).toEqual([]);
    expect(diagnostics(report, "error")).toMatchObject([
      { code: "alternative-without-modifiers", line: 3 },
    ]);
    expect(diagnostics(report, "warning")).toEqual([]);
  });
});

describe("errors abort with nothing written and cite the source line", () => {
  const rows = (shortcut: string) =>
    table([
      ["Fine", "Cmd+C", ""],
      ["Bad", shortcut, ""],
      ["Also fine", "Cmd+V", ""],
    ]);

  it.each([
    ["Ctrl/Cmd+S", "ambiguous-notation"],
    ["Ctrl/Cmd+S or Cmd+Y", "ambiguous-notation"],
    ["Mod+K", "ambiguous-notation"],
    ["Meta+K", "ambiguous-notation"],
    ["Cmd+", "ambiguous-notation"],
    ["⌘+", "ambiguous-notation"],
    ["Cmd+K+", "ambiguous-notation"],
    ["Cmd-", "ambiguous-notation"],
    ["Cmd+K-S", "ambiguous-notation"],
    ["Ctrl+K+S", "ambiguous-notation"],
    ["+K", "ambiguous-notation"],
    ["Cmd", "bare-modifier"],
    ["⇧ ⌘", "bare-modifier"],
    ["Cmd+Shift", "bare-modifier"],
    ["Cmd+K or Shift", "bare-modifier"],
    ["Alt+F", "alt-on-macos"],
    ["Alt", "alt-on-macos"],
    ["Click", "pointer-gesture"],
    ["Cmd+Click", "pointer-gesture"],
    ["Drag to reorder", "pointer-gesture"],
    ["Double-click", "pointer-gesture"],
    ["Scroll", "pointer-gesture"],
    ["Cmd+Foo", "unsupported-key"],
    ["Cmd+F13", "unsupported-key"],
    ["Cmd+Insert", "unsupported-key"],
    ["Win+E", "unsupported-key"],
    ["Cmd+K Cmd+Bar", "unsupported-key"],
    ["Cmd+K or", "empty-alternative"],
    ["or Cmd+K", "empty-alternative"],
    ["Cmd+K;;Cmd+J", "empty-alternative"],
    ["Cmd+Cmd+K", "repeated-modifier"],
    ["⌘ Cmd K", "repeated-modifier"],
  ])("%s -> %s", (input, code) => {
    const before = catalog.snapshot();
    const report = run(rows(input), { write: true });
    expect(report.ok).toBe(false);
    expect(report.wrote).toBe(false);
    expect(diagnostics(report, "error")).toEqual([
      expect.objectContaining({ code, line: 4 }),
    ]);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("rejects Windows-only and macOS-only modifiers on the wrong platform", () => {
    for (const input of ["Cmd+K", "Command+K", "⌘K"]) {
      const report = cell(input, "windows");
      expect(diagnostics(report, "error")).toEqual([
        expect.objectContaining({ code: "unsupported-key", line: 3 }),
      ]);
    }
  });

  it("reports an error for every bad row, each with its own line", () => {
    const report = run(
      table([
        ["A", "Mod+K", ""],
        ["B", "Cmd+C", ""],
        ["C", "Click", ""],
        ["D", "Cmd+Foo", ""],
      ]),
    );
    expect(diagnostics(report, "error").map((d) => [d.code, d.line])).toEqual([
      ["ambiguous-notation", 3],
      ["pointer-gesture", 5],
      ["unsupported-key", 6],
    ]);
  });

  it("does not use a bad cell's comment as a fallback entry", () => {
    const report = run(table([["Bad", "Mod+K", "keeps comment"]]), {
      write: true,
    });
    expect(report.ok).toBe(false);
    expect(entries(report)).toEqual([]);
    expect(fs.existsSync(path.join(catalog.dataDir, "notation.json"))).toBe(
      false,
    );
  });

  it("reports over-long titles, comments, sections and keys without truncating", () => {
    const before = catalog.snapshot();
    const long = (length: number) => "x".repeat(length);
    const markdown = [
      `## ${long(101)}`,
      "",
      "| Action | Shortcut | Comment |",
      "| --- | --- | --- |",
      `| ${long(51)} | Cmd+A | |`,
      `| Fine | Cmd+B | ${long(51)} |`,
      `| Boundary ${long(41)} | Cmd+C | ${long(50)} |`,
    ].join("\n");
    const report = run(markdown, { write: true });
    expect(report.wrote).toBe(false);
    expect(diagnostics(report, "error").map((d) => [d.code, d.line])).toEqual([
      ["too-long", 5],
      ["too-long", 5],
      ["too-long", 6],
    ]);
    expect(
      diagnostics(report, "error")
        .map((d) => d.message)
        .join("\n"),
    ).toMatch(/title.*50/i);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("reports an over-long key", () => {
    const key = Array.from({ length: 70 }, () => "Cmd+K").join(" ");
    const report = cell(key);
    expect(diagnostics(report, "error")).toEqual([
      expect.objectContaining({ code: "too-long", line: 3 }),
    ]);
  });

  it("accepts titles and comments of exactly the maximum length", () => {
    const report = run(table([["a".repeat(50), "Cmd+A", "c".repeat(50)]]));
    expect(report.ok).toBe(true);
  });
});

describe("warnings", () => {
  it("warns when one key is bound to different actions in a section, and still writes", () => {
    const report = run(
      table([
        ["Duplicate line", "Cmd+D", ""],
        ["Select next", "cmd+d", "multi-cursor"],
        ["Other", "Cmd+E", ""],
      ]),
      { write: true },
    );
    expect(report.ok).toBe(true);
    expect(report.wrote).toBe(true);
    expect(diagnostics(report, "warning")).toEqual([
      expect.objectContaining({ code: "same-key-different-action", line: 4 }),
    ]);
    expect(diagnostics(report, "warning")[0].message).toMatch(/line 3/);
    expect(readApp().keymaps[0].sections[0].shortcuts).toHaveLength(3);
  });

  it("does not warn across sections or for alternatives of the same action", () => {
    const markdown = [
      "## One",
      "",
      "| Action | Shortcut |",
      "| --- | --- |",
      "| Copy | Cmd+C |",
      "| copy | Cmd+Y or Cmd+C |",
      "",
      "## Two",
      "",
      "| Action | Shortcut |",
      "| --- | --- |",
      "| Other | Cmd+C |",
    ].join("\n");
    const report = run(markdown);
    expect(diagnostics(report, "warning")).toEqual([]);
  });

  it("is not raised for sequences that merely share a first chord", () => {
    expect(
      diagnostics(
        run(
          table([
            ["A", "cmd+k cmd+s", ""],
            ["B", "cmd+k", ""],
          ]),
        ),
        "warning",
      ),
    ).toEqual([]);
  });
});

describe("notices", () => {
  it("collapses exact duplicate rows with a notice citing both lines", () => {
    const report = run(
      table([
        ["Copy", "Cmd+C", ""],
        ["Paste", "Cmd+V", ""],
        ["copy", "⌘C", ""],
      ]),
      { write: true },
    );
    expect(report.ok).toBe(true);
    expect(entries(report).map((entry) => entry.key)).toEqual([
      "cmd+c",
      "cmd+v",
    ]);
    const notice = diagnostics(report, "notice").find(
      (d) => d.code === "duplicate-row",
    );
    expect(notice).toMatchObject({ line: 5 });
    expect(notice?.message).toMatch(/line 3/);
    expect(readApp().keymaps[0].sections[0].shortcuts).toEqual([
      { title: "Copy", key: "cmd+c" },
      { title: "Paste", key: "cmd+v" },
    ]);
    expect(report.changes.added).toBe(2);
  });

  it("collapses duplicates inside one cell", () => {
    const report = cell("Cmd+K or Cmd+K");
    expect(keys(report)).toEqual(["cmd+k"]);
    expect(
      diagnostics(report, "notice").filter((d) => d.code === "duplicate-row"),
    ).toHaveLength(1);
  });

  it("keeps rows with the same key and action but a different comment", () => {
    const report = run(
      table([
        ["Copy", "Cmd+C", "a"],
        ["Copy", "Cmd+C", "b"],
      ]),
    );
    expect(entries(report)).toHaveLength(2);
    expect(
      diagnostics(report, "notice").filter((d) => d.code === "duplicate-row"),
    ).toEqual([]);
  });

  it("collapses a duplicate before merging so an existing app sees it once", () => {
    run(table([["Copy", "Cmd+C", ""]]), { write: true });
    const report = run(
      table([
        ["Copy", "Cmd+C", ""],
        ["Copy", "Cmd+C", ""],
        ["Paste", "Cmd+V", ""],
      ]),
      { write: true },
    );
    expect(report.changes).toEqual({
      added: 1,
      alternatives: 0,
      unchanged: 1,
      conflicts: 0,
    });
  });

  it("imports cmd+^ with a layout-dependent notice", () => {
    const report = run(table([["Toggle terminal", "cmd+^", ""]]), {
      write: true,
    });
    expect(report.ok).toBe(true);
    expect(report.wrote).toBe(true);
    expect(readApp().keymaps[0].sections[0].shortcuts).toEqual([
      { title: "Toggle terminal", key: "cmd+^" },
    ]);
    expect(report.layoutDependentKeys).toEqual([{ key: "cmd+^", line: 3 }]);
    expect(diagnostics(report, "notice")).toEqual([
      expect.objectContaining({ code: "layout-dependent-key", line: 3 }),
    ]);
    expect(diagnostics(report, "notice")[0].message).toMatch(
      /no execution mapping/i,
    );
  });

  it.each(["´", "`", "<", ">", "#", "ß", "ä", "ö", "ü", "§", "°"])(
    "flags %s as layout-dependent",
    (symbol) => {
      const report = cell(`Cmd+${symbol}`);
      expect(report.ok).toBe(true);
      expect(report.layoutDependentKeys).toEqual([
        { key: `cmd+${symbol}`, line: 3 },
      ]);
    },
  );

  it("lowercases layout-dependent letters", () => {
    expect(keys(cell("Cmd+Ä"))).toEqual(["cmd+ä"]);
  });

  it("does not flag ordinary keys", () => {
    expect(cell("Cmd+K").layoutDependentKeys).toEqual([]);
  });

  it("lists each layout-dependent entry with its line when merging into an existing app", () => {
    run(table([["Toggle terminal", "cmd+^", ""]]), { write: true });
    const report = run(
      table([
        ["Toggle terminal", "cmd+^", ""],
        ["Other", "cmd+#", ""],
      ]),
      { write: true },
    );
    expect(report.layoutDependentKeys).toEqual([
      { key: "cmd+^", line: 3 },
      { key: "cmd+#", line: 4 },
    ]);
    expect(report.changes).toMatchObject({ added: 1, unchanged: 1 });
  });
});

describe("written output", () => {
  it("is a fixed point of the repo formatter", () => {
    const report = run(
      table([
        ["Toggle", "⇧ ⌘ /", ""],
        ["Palette", "Cmd+Shift+P or Ctrl-Shift-P", ""],
        ["Chord", "cmd+k cmd+s", ""],
        ["Plus", "Cmd++", ""],
        ["Esc", "Escape", ""],
      ]),
      { write: true },
    );
    expect(report.ok).toBe(true);
    expect(
      readApp().keymaps[0].sections[0].shortcuts.map(
        (shortcut) => shortcut.key,
      ),
    ).toEqual([
      "shift+cmd+/",
      "shift+cmd+p",
      "ctrl+shift+p",
      "cmd+k cmd+s",
      "cmd++",
      "esc",
    ]);
  });
});
