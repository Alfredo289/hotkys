/** @jest-environment node */
import { it, expect, beforeEach, afterEach, describe } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { importShortcuts, type ImportRequest } from "./import-shortcuts";
import { formatCatalogFiles } from "../write/prettify";
import type { InputApp } from "../model/input/input-models";
import { createTempCatalog } from "./test-catalog";

let catalog: ReturnType<typeof createTempCatalog>;
beforeEach(() => {
  catalog = createTempCatalog();
});
afterEach(() => catalog.cleanup());

const TABLE = [
  "| Action | Shortcut |",
  "| --- | --- |",
  "| Copy | cmd+c |",
  "| Paste | cmd+v |",
].join("\n");

const request = (overrides: Partial<ImportRequest> = {}): ImportRequest => ({
  markdown: TABLE,
  fileName: "example-macos.md",
  app: "Example",
  slug: "example",
  platform: "macos",
  ...overrides,
});
const readApp = (slug = "example") =>
  JSON.parse(
    fs.readFileSync(path.join(catalog.dataDir, `${slug}.json`), "utf8"),
  ) as InputApp;
const errors = (report: ReturnType<typeof importShortcuts>) =>
  report.diagnostics.filter((d) => d.severity === "error");

describe("dry run", () => {
  it("previews the normalized result and leaves the catalog byte-identical", () => {
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request());
    expect(report.wrote).toBe(false);
    expect(report.ok).toBe(true);
    expect(report.app).toMatchObject({
      name: "Example",
      slug: "example",
      created: true,
    });
    expect(report.preview).toEqual({
      keymap: "Default",
      platforms: ["macos"],
      sections: [
        {
          title: "General",
          entries: [
            { title: "Copy", key: "cmd+c", line: 3 },
            { title: "Paste", key: "cmd+v", line: 4 },
          ],
        },
      ],
    });
    expect(report.changes).toEqual({
      added: 2,
      alternatives: 0,
      unchanged: 0,
      conflicts: 0,
    });
    expect(report.layoutDependentKeys).toEqual([]);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("does not write a dry run even when the whole catalog is valid", () => {
    importShortcuts(catalog.root, request({ write: false }));
    expect(fs.existsSync(path.join(catalog.dataDir, "example.json"))).toBe(
      false,
    );
  });
});

describe("write", () => {
  it("creates a macOS app with a Default keymap with explicit platforms and no icon", () => {
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(report.wrote).toBe(true);
    const app = readApp();
    expect(app).toEqual({
      $schema: "https://hotkys.com/schema/shortcut.schema.json",
      name: "Example",
      slug: "example",
      keymaps: [
        {
          title: "Default",
          platforms: ["macos"],
          sections: [
            {
              title: "General",
              shortcuts: [
                { title: "Copy", key: "cmd+c" },
                { title: "Paste", key: "cmd+v" },
              ],
            },
          ],
        },
      ],
    });
    expect("icon" in app).toBe(false);
  });

  it("creates a Windows app with a 'Default (Windows)' keymap", () => {
    importShortcuts(
      catalog.root,
      request({
        platform: "windows",
        markdown: TABLE.replace(/cmd/g, "ctrl"),
        write: true,
      }),
    );
    expect(readApp().keymaps).toMatchObject([
      { title: "Default (Windows)", platforms: ["windows"] },
    ]);
  });

  it("writes optional app metadata in the catalog's field order", () => {
    importShortcuts(
      catalog.root,
      request({
        write: true,
        source: "https://example.com/keys",
        bundleId: "com.example.app",
        hostname: "example.com",
      }),
    );
    expect(Object.keys(readApp())).toEqual([
      "$schema",
      "bundleId",
      "hostname",
      "name",
      "slug",
      "source",
      "keymaps",
    ]);
  });

  it("writes output identical to the repo formatter and leaves no temp files", () => {
    importShortcuts(
      catalog.root,
      request({
        write: true,
        markdown: "| Action | Shortcut |\n|---|---|\n| Go | Shift+Ctrl+P |",
      }),
    );
    expect(
      formatCatalogFiles(["example.json"], false, catalog.dataDir),
    ).toEqual([]);
    expect(readApp().keymaps[0].sections[0].shortcuts[0].key).toBe(
      "ctrl+shift+p",
    );
    expect(fs.readdirSync(catalog.dataDir).sort()).toEqual([
      "example.json",
      "schema",
    ]);
  });

  it("lands next to existing apps without touching them", () => {
    catalog.seed({
      $schema: "https://hotkys.com/schema/shortcut.schema.json",
      name: "Other",
      slug: "other",
      keymaps: [
        {
          title: "Default",
          platforms: ["macos"],
          sections: [
            { title: "General", shortcuts: [{ title: "Copy", key: "cmd+c" }] },
          ],
        },
      ],
    });
    const before = catalog.snapshot();
    importShortcuts(catalog.root, request({ write: true }));
    const after = catalog.snapshot();
    expect(after["shortcuts-data/other.json"]).toBe(
      before["shortcuts-data/other.json"],
    );
    expect(after["shortcuts-data/example.json"]).toBeDefined();
  });
});

describe("markdown extraction", () => {
  it("reports line numbers, groups by heading and Section column, and preserves row order", () => {
    const markdown = [
      "# Example shortcuts", // 1
      "", // 2
      "Intro text", // 3
      "", // 4
      "## Editing", // 5
      "| Command | Keys | Comment |", // 6
      "|---|---|---|", // 7
      "| Copy | cmd+c | |", // 8
      "| Paste | cmd+v | plain text |", // 9
      "", // 10
      "## View", // 11
      "| Section | Description | Key |", // 12
      "|---|---|---|", // 13
      "| Zoom | Zoom in | cmd+= |", // 14
      "| | Zoom out | cmd+- |", // 15
      "| Editing | Undo | cmd+z |", // 16
    ].join("\n");
    const report = importShortcuts(catalog.root, request({ markdown }));
    expect(errors(report)).toEqual([]);
    expect(report.preview?.sections).toEqual([
      {
        title: "Editing",
        entries: [
          { title: "Copy", key: "cmd+c", line: 8 },
          { title: "Paste", key: "cmd+v", comment: "plain text", line: 9 },
          { title: "Undo", key: "cmd+z", line: 16 },
        ],
      },
      {
        title: "Zoom",
        entries: [{ title: "Zoom in", key: "cmd+=", line: 14 }],
      },
      {
        title: "View",
        entries: [{ title: "Zoom out", key: "cmd+-", line: 15 }],
      },
    ]);
    expect(report.nonTableLines).toEqual([{ line: 3, text: "Intro text" }]);
  });

  it("accepts comment-only rows", () => {
    const report = importShortcuts(
      catalog.root,
      request({
        markdown:
          "| Action | Shortcut | Comment |\n|---|---|---|\n| Pan | | Hold space and drag |",
      }),
    );
    expect(errors(report)).toEqual([]);
    expect(report.preview?.sections[0].entries).toEqual([
      { title: "Pan", comment: "Hold space and drag", line: 3 },
    ]);
  });

  it("errors with the line number for a row with neither shortcut nor comment", () => {
    const report = importShortcuts(
      catalog.root,
      request({
        markdown:
          "| Action | Shortcut |\n|---|---|\n| Copy | cmd+c |\n| Broken | |",
        write: true,
      }),
    );
    expect(report.ok).toBe(false);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "empty-row", line: 4 }),
    ]);
    expect(report.wrote).toBe(false);
    expect(fs.existsSync(path.join(catalog.dataDir, "example.json"))).toBe(
      false,
    );
  });

  it("errors when no importable table is found", () => {
    const report = importShortcuts(
      catalog.root,
      request({ markdown: "Just some prose.\n- a bullet" }),
    );
    expect(report.ok).toBe(false);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "no-table" }),
    ]);
    expect(report.nonTableLines).toEqual([
      { line: 1, text: "Just some prose." },
      { line: 2, text: "- a bullet" },
    ]);
  });

  it("errors on a table without Action and Shortcut columns", () => {
    const report = importShortcuts(
      catalog.root,
      request({ markdown: "| Foo | Bar |\n|---|---|\n| a | b |" }),
    );
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "unrecognized-table", line: 1 }),
    ]);
  });
});

describe("whole-catalog validation", () => {
  it("writes nothing and reports the error when another app in the catalog is invalid", () => {
    catalog.seed({
      $schema: "https://hotkys.com/schema/shortcut.schema.json",
      name: "Broken",
      slug: "broken",
      keymaps: [
        {
          title: "Default",
          platforms: ["macos"],
          sections: [
            {
              title: "General",
              shortcuts: [{ title: "Copy", key: "cmd+nonsense" }],
            },
          ],
        },
      ],
    });
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(report.ok).toBe(false);
    expect(report.wrote).toBe(false);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "catalog-validation" }),
    ]);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("reports an unsupported key on its source line before validating the catalog", () => {
    const before = catalog.snapshot();
    const report = importShortcuts(
      catalog.root,
      request({
        markdown: "| Action | Shortcut |\n|---|---|\n| Copy | cmd+nonsense |",
        write: true,
      }),
    );
    expect(report.wrote).toBe(false);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "unsupported-key", line: 3 }),
    ]);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("rejects a reserved slug", () => {
    const before = catalog.snapshot();
    const report = importShortcuts(
      catalog.root,
      request({ slug: "apps", write: true }),
    );
    expect(report.ok).toBe(false);
    expect(errors(report)[0].message).toContain("reserved slug");
    expect(catalog.snapshot()).toEqual(before);
  });

  it("rejects a duplicate app name", () => {
    catalog.seed({
      $schema: "https://hotkys.com/schema/shortcut.schema.json",
      name: "Example",
      slug: "other",
      keymaps: [
        {
          title: "Default",
          platforms: ["macos"],
          sections: [
            { title: "General", shortcuts: [{ title: "Copy", key: "cmd+c" }] },
          ],
        },
      ],
    });
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(report.ok).toBe(false);
    expect(report.wrote).toBe(false);
    expect(errors(report)[0]).toMatchObject({ code: "catalog-validation" });
    expect(catalog.snapshot()).toEqual(before);
  });

  it("rejects an icon that does not exist in public/", () => {
    const report = importShortcuts(
      catalog.root,
      request({ icon: "icons/missing.png", write: true }),
    );
    expect(errors(report)[0].message).toContain("icon");
    expect(fs.existsSync(path.join(catalog.dataDir, "example.json"))).toBe(
      false,
    );
  });

  it("rejects a slug that is not a safe filename without touching the filesystem", () => {
    const before = catalog.snapshot();
    const report = importShortcuts(
      catalog.root,
      request({ slug: "../escape", write: true }),
    );
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "invalid-request" }),
    ]);
    expect(catalog.snapshot()).toEqual(before);
  });
});
