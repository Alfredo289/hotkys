/** @jest-environment node */
import { it, expect, beforeEach, afterEach, describe } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { importShortcuts, type ImportRequest } from "./import-shortcuts";
import type { InputApp, InputKeymap } from "../model/input/input-models";
import { createTempCatalog } from "./test-catalog";

let catalog: ReturnType<typeof createTempCatalog>;
beforeEach(() => { catalog = createTempCatalog(); });
afterEach(() => catalog.cleanup());

const SCHEMA = "https://hotkys.com/schema/shortcut.schema.json";
const table = (...rows: string[]) => ["| Section | Action | Shortcut | Comment |", "|---|---|---|---|", ...rows].join("\n");
const request = (overrides: Partial<ImportRequest> = {}): ImportRequest => ({
  markdown: table("| General | Toggle sidebar | cmd+b | |"), fileName: "codex-macos.md", app: "Codex", slug: "codex", platform: "macos", ...overrides,
});
const keymap = (title: string, platforms: InputKeymap["platforms"], ...sections: InputKeymap["sections"]): InputKeymap => ({ title, ...(platforms ? { platforms } : {}), sections });
const general = (...shortcuts: { title: string; key?: string; comment?: string }[]) => ({ title: "General", shortcuts });
const seedApp = (...keymaps: InputKeymap[]): InputApp => {
  const app: InputApp = { $schema: SCHEMA, name: "Codex", slug: "codex", keymaps };
  catalog.seed(app);
  return app;
};
const file = () => fs.readFileSync(path.join(catalog.dataDir, "codex.json"), "utf8");
const readApp = () => JSON.parse(file()) as InputApp;
const errors = (report: ReturnType<typeof importShortcuts>) => report.diagnostics.filter(d => d.severity === "error");

// Modeled on the real Codex app: a macOS keymap and a Windows/Linux keymap.
const codexLike = () => seedApp(
  keymap("macOS", ["macos"], general({ title: "Toggle sidebar", key: "cmd+b" }, { title: "Open command menu", key: "shift+cmd+p" }, { title: "Open command menu", key: "cmd+k" }, { title: "Zoom", key: "cmd+=" }), { title: "Editing", shortcuts: [{ title: "Copy", key: "cmd+c" }] }),
  keymap("Windows and Linux", ["windows", "linux"], general({ title: "Toggle sidebar", key: "ctrl+b" })),
);

describe("target keymap", () => {
  it("creates Default when the app has only a Windows keymap", () => {
    seedApp(keymap("Windows", ["windows"], general({ title: "Toggle sidebar", key: "ctrl+b" })));
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(errors(report)).toEqual([]);
    expect(report.app).toMatchObject({ created: false });
    expect(report.changes).toEqual({ added: 1, alternatives: 0, unchanged: 0, conflicts: 0 });
    expect(readApp().keymaps).toEqual([
      keymap("Windows", ["windows"], general({ title: "Toggle sidebar", key: "ctrl+b" })),
      keymap("Default", ["macos"], general({ title: "Toggle sidebar", key: "cmd+b" })),
    ]);
  });

  it("creates 'Default (Windows)' for a Windows import into a macOS-only app", () => {
    seedApp(keymap("Default", ["macos"], general({ title: "Toggle sidebar", key: "cmd+b" })));
    importShortcuts(catalog.root, request({ platform: "windows", markdown: table("| General | Toggle sidebar | ctrl+b | |"), write: true }));
    expect(readApp().keymaps.map(k => [k.title, k.platforms])).toEqual([["Default", ["macos"]], ["Default (Windows)", ["windows"]]]);
  });

  it("merges a Windows import into a [windows, linux] keymap", () => {
    codexLike();
    const report = importShortcuts(catalog.root, request({ platform: "windows", markdown: table("| General | Toggle sidebar | ctrl+b | |", "| General | Find | ctrl+f | |"), write: true }));
    expect(errors(report)).toEqual([]);
    expect(report.preview).toMatchObject({ keymap: "Windows and Linux", platforms: ["windows", "linux"] });
    expect(report.changes).toEqual({ added: 1, alternatives: 0, unchanged: 1, conflicts: 0 });
    const app = readApp();
    expect(app.keymaps[1].sections[0].shortcuts).toEqual([{ title: "Toggle sidebar", key: "ctrl+b" }, { title: "Find", key: "ctrl+f" }]);
    expect(app.keymaps[0]).toEqual(codexLike().keymaps[0]);
  });

  it("requires --keymap when several keymaps match the platform", () => {
    seedApp(keymap("Default", ["macos"], general({ title: "Copy", key: "cmd+c" })), keymap("Copy mode", ["macos", "linux"], general({ title: "Exit", key: "esc" })));
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(errors(report)).toEqual([expect.objectContaining({ code: "ambiguous-keymap", message: expect.stringContaining("--keymap") })]);
    expect(errors(report)[0].message).toContain("Copy mode");
    expect(catalog.snapshot()).toEqual(before);
  });

  it("requires --keymap when a keymap declares no platforms", () => {
    seedApp(keymap("Default", undefined, general({ title: "Copy", key: "cmd+c" })));
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(errors(report)).toEqual([expect.objectContaining({ code: "ambiguous-keymap" })]);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("merges into the keymap named by --keymap, including one without platforms", () => {
    seedApp(keymap("Default", undefined, general({ title: "Copy", key: "cmd+c" })));
    const report = importShortcuts(catalog.root, request({ keymap: "default", write: true }));
    expect(errors(report)).toEqual([]);
    const app = readApp();
    expect(app.keymaps).toHaveLength(1);
    expect(app.keymaps[0].platforms).toBeUndefined();
    expect(app.keymaps[0].sections[0].shortcuts).toEqual([{ title: "Copy", key: "cmd+c" }, { title: "Toggle sidebar", key: "cmd+b" }]);
  });

  it("disambiguates with --keymap and rejects a keymap for another platform", () => {
    seedApp(keymap("Default", ["macos"], general({ title: "Copy", key: "cmd+c" })), keymap("Copy mode", ["macos"], general({ title: "Exit", key: "esc" })), keymap("Windows", ["windows"], general({ title: "Copy", key: "ctrl+c" })));
    const ok = importShortcuts(catalog.root, request({ keymap: "Copy mode", write: true }));
    expect(errors(ok)).toEqual([]);
    expect(readApp().keymaps[1].sections[0].shortcuts).toEqual([{ title: "Exit", key: "esc" }, { title: "Toggle sidebar", key: "cmd+b" }]);
    const bad = importShortcuts(catalog.root, request({ keymap: "Windows", write: true }));
    expect(errors(bad)).toEqual([expect.objectContaining({ code: "keymap-platform-mismatch" })]);
  });

  it("creates a new keymap with the --keymap title when none exists", () => {
    seedApp(keymap("Default", ["windows"], general({ title: "Copy", key: "ctrl+c" })));
    importShortcuts(catalog.root, request({ keymap: "Mac", write: true }));
    expect(readApp().keymaps.map(k => [k.title, k.platforms])).toEqual([["Default", ["windows"]], ["Mac", ["macos"]]]);
  });

  it("reports a targeted error when the default keymap title is already taken", () => {
    seedApp(keymap("Default", ["windows"], general({ title: "Copy", key: "ctrl+c" })));
    // "Default" is taken by a Windows keymap: the importer must not create a duplicate.
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(errors(report)).toEqual([expect.objectContaining({ code: "keymap-title-collision", message: expect.stringContaining("--keymap") })]);
    expect(catalog.snapshot()).toEqual(before);
  });
});

describe("merge rules", () => {
  it("appends a new shortcut for an existing action next to it, keeping the existing title casing", () => {
    codexLike();
    const report = importShortcuts(catalog.root, request({ markdown: table("| general | Toggle  Sidebar | cmd+. | |", "| General | Toggle sidebar | cmd+b | |"), write: true }));
    expect(errors(report)).toEqual([]);
    expect(report.changes).toEqual({ added: 0, alternatives: 1, unchanged: 1, conflicts: 0 });
    expect(readApp().keymaps[0].sections[0].shortcuts).toEqual([
      { title: "Toggle sidebar", key: "cmd+b" }, { title: "Toggle sidebar", key: "cmd+." },
      { title: "Open command menu", key: "shift+cmd+p" }, { title: "Open command menu", key: "cmd+k" }, { title: "Zoom", key: "cmd+=" },
    ]);
  });

  it("lands 'Toggle Sidebar' cmd+^ next to Codex-style 'Toggle sidebar' cmd+b", () => {
    codexLike();
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Toggle Sidebar | cmd+^ | |"), write: true }));
    expect(errors(report)).toEqual([]);
    expect(report.changes).toEqual({ added: 0, alternatives: 1, unchanged: 0, conflicts: 0 });
    expect(readApp().keymaps[0].sections[0].shortcuts.slice(0, 2)).toEqual([{ title: "Toggle sidebar", key: "cmd+b" }, { title: "Toggle sidebar", key: "cmd+^" }]);
  });

  it("appends alternatives after the last row of an action with several rows, in source order", () => {
    codexLike();
    importShortcuts(catalog.root, request({ markdown: table("| General | Open command menu | cmd+1 | |", "| General | Open command menu | cmd+2 | |"), write: true }));
    expect(readApp().keymaps[0].sections[0].shortcuts.map(s => s.key)).toEqual(["cmd+b", "shift+cmd+p", "cmd+k", "cmd+1", "cmd+2", "cmd+="]);
  });

  it("appends a new action to the end of its section and a new section to the end of the keymap, in source order", () => {
    codexLike();
    const report = importShortcuts(catalog.root, request({ markdown: table("| Panels | Terminal | cmd+j | |", "| General | Find | cmd+f | |", "| Panels | Diff | cmd+d | |", "| Editing | Cut | cmd+x | |", "| Editing | Cut | cmd+shift+x | |"), write: true }));
    expect(errors(report)).toEqual([]);
    expect(report.changes).toEqual({ added: 4, alternatives: 1, unchanged: 0, conflicts: 0 });
    const sections = readApp().keymaps[0].sections;
    expect(sections.map(s => s.title)).toEqual(["General", "Editing", "Panels"]);
    expect(sections[0].shortcuts.at(-1)).toEqual({ title: "Find", key: "cmd+f" });
    expect(sections[1].shortcuts).toEqual([{ title: "Copy", key: "cmd+c" }, { title: "Cut", key: "cmd+x" }, { title: "Cut", key: "shift+cmd+x" }]);
    expect(sections[2].shortcuts).toEqual([{ title: "Terminal", key: "cmd+j" }, { title: "Diff", key: "cmd+d" }]);
  });

  it("treats rows absent from the import as kept, not removed", () => {
    codexLike();
    const before = codexLike().keymaps[0];
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Zoom | cmd+= | |"), write: true }));
    expect(report.changes).toEqual({ added: 0, alternatives: 0, unchanged: 1, conflicts: 0 });
    expect(readApp().keymaps[0]).toEqual(before);
  });

  it("merges comment-only rows and unchanged comments", () => {
    seedApp(keymap("Default", ["macos"], general({ title: "Pan", comment: "Hold space" }, { title: "Copy", key: "cmd+c", comment: "Plain" })));
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Pan | | Hold space |", "| General | Copy | cmd+c | Plain |", "| General | Copy | | Via menu |"), write: true }));
    expect(errors(report)).toEqual([]);
    expect(report.changes).toEqual({ added: 0, alternatives: 1, unchanged: 2, conflicts: 0 });
    expect(readApp().keymaps[0].sections[0].shortcuts).toEqual([{ title: "Pan", comment: "Hold space" }, { title: "Copy", key: "cmd+c", comment: "Plain" }, { title: "Copy", comment: "Via menu" }]);
  });

  it("preserves unknown fields and field order of the existing app", () => {
    const app = { $schema: SCHEMA, bundleId: "com.example", name: "Codex", slug: "codex", windowsProcessName: "codex.exe", source: "https://example.com", keymaps: [keymap("Default", ["macos"], general({ title: "Copy", key: "cmd+c" }))] } as InputApp;
    catalog.seed(app);
    importShortcuts(catalog.root, request({ markdown: table("| General | Paste | cmd+v | |"), write: true, source: "https://other.example", bundleId: "x.y" }));
    const written = readApp();
    expect(Object.keys(written)).toEqual(Object.keys(app));
    expect(written).toMatchObject({ bundleId: "com.example", windowsProcessName: "codex.exe", source: "https://example.com" });
  });

  it("ignores new-app metadata for an existing app with a notice", () => {
    codexLike();
    const report = importShortcuts(catalog.root, request({ source: "https://x.example", hostname: "x.example" }));
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ severity: "notice", code: "metadata-ignored", message: expect.stringContaining("--source") }));
    expect(report.ok).toBe(true);
  });
});

describe("idempotence and dry run", () => {
  it("re-running an identical import reports zero changes and writes nothing", () => {
    codexLike();
    const markdown = table("| General | Toggle sidebar | cmd+. | |", "| Panels | Terminal | cmd+j | |");
    const first = importShortcuts(catalog.root, request({ markdown, write: true }));
    expect(first.wrote).toBe(true);
    const before = catalog.snapshot();
    const mtime = fs.statSync(path.join(catalog.dataDir, "codex.json")).mtimeMs;
    const second = importShortcuts(catalog.root, request({ markdown, write: true }));
    expect(second.ok).toBe(true);
    expect(second.wrote).toBe(false);
    expect(second.changes).toEqual({ added: 0, alternatives: 0, unchanged: 2, conflicts: 0 });
    expect(second.diagnostics).toContainEqual(expect.objectContaining({ severity: "notice", code: "no-changes" }));
    expect(catalog.snapshot()).toEqual(before);
    expect(fs.statSync(path.join(catalog.dataDir, "codex.json")).mtimeMs).toBe(mtime);
  });

  it("a dry run leaves the file byte-identical and marks each preview entry", () => {
    codexLike();
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Toggle sidebar | cmd+b | |", "| General | Toggle sidebar | cmd+. | |", "| General | Find | cmd+f | |") }));
    expect(report.wrote).toBe(false);
    expect(report.preview?.sections[0].entries.map(e => e.status)).toEqual(["unchanged", "alternative", "added"]);
    expect(catalog.snapshot()).toEqual(before);
  });
});

describe("conflicts", () => {
  it("aborts with a byte-identical file when an existing shortcut would change", () => {
    codexLike();
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Zoom | cmd+= | Zoom in |", "| General | Find | cmd+f | |"), write: true }));
    expect(report.ok).toBe(false);
    expect(report.wrote).toBe(false);
    expect(errors(report)).toEqual([expect.objectContaining({ code: "merge-conflict", line: 3, message: expect.stringContaining("--overwrite") })]);
    expect(report.changes).toEqual({ added: 1, alternatives: 0, unchanged: 0, conflicts: 1 });
    expect(catalog.snapshot()).toEqual(before);
  });

  it("a comment missing from the import conflicts with an existing comment", () => {
    seedApp(keymap("Default", ["macos"], general({ title: "Copy", key: "cmd+c", comment: "Plain" })));
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Copy | cmd+c | |") }));
    expect(report.changes.conflicts).toBe(1);
  });

  it("does not mutate other keymaps when it conflicts", () => {
    codexLike();
    const report = importShortcuts(catalog.root, request({ platform: "windows", markdown: table("| General | Toggle sidebar | ctrl+b | different |"), write: true }));
    expect(report.changes.conflicts).toBe(1);
    expect(readApp()).toEqual(codexLike());
  });
});

describe("--overwrite", () => {
  it("replaces only the target keymap wholesale", () => {
    codexLike();
    const before = readApp();
    const report = importShortcuts(catalog.root, request({ overwrite: true, write: true, markdown: table("| General | Toggle sidebar | cmd+. | |", "| General | Zoom | cmd+= | |") }));
    expect(errors(report)).toEqual([]);
    expect(report.wrote).toBe(true);
    expect(report.changes).toEqual({ added: 1, alternatives: 0, unchanged: 1, conflicts: 0 });
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ severity: "notice", code: "keymap-replaced" }));
    const app = readApp();
    expect(app.keymaps[0]).toEqual(keymap("macOS", ["macos"], general({ title: "Toggle sidebar", key: "cmd+." }, { title: "Zoom", key: "cmd+=" })));
    expect(app.keymaps[1]).toEqual(before.keymaps[1]);
  });

  it("resolves what would otherwise be a conflict", () => {
    codexLike();
    const markdown = table("| General | Zoom | cmd+= | Zoom in |");
    expect(importShortcuts(catalog.root, request({ markdown })).ok).toBe(false);
    const report = importShortcuts(catalog.root, request({ markdown, overwrite: true, write: true }));
    expect(report.ok).toBe(true);
    expect(readApp().keymaps[0].sections).toEqual([general({ title: "Zoom", key: "cmd+=", comment: "Zoom in" })]);
  });

  it("still needs --keymap when the target is ambiguous", () => {
    seedApp(keymap("A", ["macos"], general({ title: "Copy", key: "cmd+c" })), keymap("B", ["macos"], general({ title: "Copy", key: "cmd+c" })));
    expect(errors(importShortcuts(catalog.root, request({ overwrite: true, write: true })))).toEqual([expect.objectContaining({ code: "ambiguous-keymap" })]);
  });

  it("is idempotent", () => {
    codexLike();
    const r = request({ overwrite: true, write: true, markdown: table("| General | Zoom | cmd+= | |") });
    importShortcuts(catalog.root, r);
    const before = catalog.snapshot();
    const second = importShortcuts(catalog.root, r);
    expect(second.wrote).toBe(false);
    expect(second.changes).toEqual({ added: 0, alternatives: 0, unchanged: 1, conflicts: 0 });
    expect(catalog.snapshot()).toEqual(before);
  });
});

describe("validation", () => {
  it("rejects a merge that makes the catalog invalid and writes nothing", () => {
    codexLike();
    const before = catalog.snapshot();
    const report = importShortcuts(catalog.root, request({ markdown: table("| General | Bad | cmd+nonsense | |"), write: true }));
    expect(errors(report)).toEqual([expect.objectContaining({ code: "catalog-validation" })]);
    expect(catalog.snapshot()).toEqual(before);
  });

  it("reports an unreadable existing app file", () => {
    fs.writeFileSync(path.join(catalog.dataDir, "codex.json"), "{ nope");
    const report = importShortcuts(catalog.root, request({ write: true }));
    expect(errors(report)).toEqual([expect.objectContaining({ code: "app-unreadable" })]);
  });
});
