/** @jest-environment node */
import { it, expect, beforeEach, afterEach, describe } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { importShortcuts, type ImportRequest } from "./import-shortcuts";
import { createTempCatalog } from "./test-catalog";

let catalog: ReturnType<typeof createTempCatalog>;
beforeEach(() => {
  catalog = createTempCatalog();
});
afterEach(() => catalog.cleanup());

const run = (lines: string[], overrides: Partial<ImportRequest> = {}) =>
  importShortcuts(catalog.root, {
    markdown: lines.join("\n"),
    fileName: "doc.md",
    app: "Example",
    slug: "example",
    platform: "macos",
    ...overrides,
  });
const errors = (report: ReturnType<typeof run>) =>
  report.diagnostics.filter((d) => d.severity === "error");
const sectionTitles = (report: ReturnType<typeof run>) =>
  report.preview?.sections.map((s) => s.title);

describe("sections", () => {
  it("imports multiple tables under different headings into matching sections in source order", () => {
    const report = run([
      "# Example", // 1
      "## Editing", // 2
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |", // 3-5
      "### Navigation", // 6
      "| Action | Shortcut |",
      "|---|---|",
      "| Back | cmd+[ |",
      "| Forward | cmd+] |", // 7-10
      "#### Windows", // 11
      "| Action | Shortcut |",
      "|---|---|",
      "| Close | cmd+w |", // 12-14
    ]);
    expect(errors(report)).toEqual([]);
    expect(report.preview?.sections).toEqual([
      { title: "Editing", entries: [{ title: "Copy", key: "cmd+c", line: 5 }] },
      {
        title: "Navigation",
        entries: [
          { title: "Back", key: "cmd+[", line: 9 },
          { title: "Forward", key: "cmd+]", line: 10 },
        ],
      },
      {
        title: "Windows",
        entries: [{ title: "Close", key: "cmd+w", line: 14 }],
      },
    ]);
  });

  it("merges tables that share a heading into one section, in first-seen order", () => {
    const report = run([
      "## A",
      "| Action | Shortcut |",
      "|---|---|",
      "| One | cmd+1 |",
      "## B",
      "| Action | Shortcut |",
      "|---|---|",
      "| Two | cmd+2 |",
      "## A",
      "| Action | Shortcut |",
      "|---|---|",
      "| Three | cmd+3 |",
    ]);
    expect(errors(report)).toEqual([]);
    expect(
      report.preview?.sections.map((s) => [
        s.title,
        s.entries.map((e) => e.title),
      ]),
    ).toEqual([
      ["A", ["One", "Three"]],
      ["B", ["Two"]],
    ]);
  });

  it("uses the nearest preceding heading of any level, including closing hashes and indentation", () => {
    const report = run([
      "# Top",
      "###### Deep ######",
      "| Action | Shortcut |",
      "|---|---|",
      "| X | cmd+x |",
      "   ## Indented",
      "| Action | Shortcut |",
      "|---|---|",
      "| Y | cmd+y |",
    ]);
    expect(sectionTitles(report)).toEqual(["Deep", "Indented"]);
  });

  it("supports Setext headings", () => {
    const report = run([
      "Editing",
      "=======",
      "| Action | Shortcut |",
      "|---|---|",
      "| X | cmd+x |",
      "",
      "View",
      "----",
      "| Action | Shortcut |",
      "|---|---|",
      "| Y | cmd+y |",
    ]);
    expect(sectionTitles(report)).toEqual(["Editing", "View"]);
    expect(report.nonTableLines).toEqual([]);
  });

  it("falls back to General when there is no heading and no Section column", () => {
    const report = run([
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
    ]);
    expect(sectionTitles(report)).toEqual(["General"]);
  });

  it("falls back to General for a table before the first heading, then switches to the heading", () => {
    const report = run([
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
      "## Later",
      "| Action | Shortcut |",
      "|---|---|",
      "| Paste | cmd+v |",
    ]);
    expect(sectionTitles(report)).toEqual(["General", "Later"]);
  });

  it("lets a Section column override the heading per row and fall back to the heading when blank", () => {
    const report = run([
      "## Heading",
      "| Section | Action | Shortcut |",
      "|---|---|---|",
      "| Custom | A | cmd+a |",
      "| | B | cmd+b |",
      "| Custom | C | cmd+c |",
    ]);
    expect(
      report.preview?.sections.map((s) => [
        s.title,
        s.entries.map((e) => e.title),
      ]),
    ).toEqual([
      ["Custom", ["A", "C"]],
      ["Heading", ["B"]],
    ]);
  });

  it("uses General for a Section column with no heading and blank cells", () => {
    const report = run([
      "| Section | Action | Shortcut |",
      "|---|---|---|",
      "| | A | cmd+a |",
    ]);
    expect(sectionTitles(report)).toEqual(["General"]);
  });

  it("ignores headings and tables inside fenced code blocks", () => {
    const report = run([
      "## Real",
      "```",
      "# not a heading",
      "| Action | Shortcut |",
      "|---|---|",
      "| Fake | cmd+f |",
      "```",
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
    ]);
    expect(errors(report)).toEqual([]);
    expect(report.preview?.sections).toEqual([
      { title: "Real", entries: [{ title: "Copy", key: "cmd+c", line: 10 }] },
    ]);
    expect(report.nonTableLines.map((l) => l.line)).toEqual([2, 3, 4, 5, 6, 7]);
  });
});

describe("columns", () => {
  it.each([
    ["Action", "Shortcut"],
    ["Command", "Keys"],
    ["Description", "Key"],
    ["action", "shortcut"],
    ["COMMAND", "KEYS"],
    ["DeScRiPtIoN", "kEy"],
    ["**Action**", "`Shortcut`"],
    ["  Action  ", " Keys "],
  ])(
    "recognizes header synonyms and case variations (%s / %s)",
    (action, shortcut) => {
      const report = run([
        `| ${action} | ${shortcut} |`,
        "|---|---|",
        "| Copy | cmd+c |",
      ]);
      expect(errors(report)).toEqual([]);
      expect(report.preview?.sections[0].entries).toEqual([
        { title: "Copy", key: "cmd+c", line: 3 },
      ]);
    },
  );

  it("recognizes Section and Comment in any case and any column order", () => {
    const report = run([
      "| COMMENT | key | SECTION | description |",
      "|---|---|---|---|",
      "| a note | cmd+c | Edit | Copy |",
    ]);
    expect(report.preview?.sections).toEqual([
      {
        title: "Edit",
        entries: [{ title: "Copy", key: "cmd+c", comment: "a note", line: 3 }],
      },
    ]);
  });

  it("supports tables without outer pipes and with alignment markers", () => {
    const report = run(["Action | Shortcut", ":--|--:", "Copy | cmd+c"]);
    expect(errors(report)).toEqual([]);
    expect(report.preview?.sections[0].entries).toEqual([
      { title: "Copy", key: "cmd+c", line: 3 },
    ]);
  });

  it("does not split cells on escaped pipes", () => {
    const report = run([
      "| Action | Shortcut | Comment |",
      "|---|---|---|",
      "| Pipe | cmd+\\| | a \\| b |",
    ]);
    expect(report.preview?.sections[0].entries[0]).toMatchObject({
      title: "Pipe",
      key: "cmd+|",
      comment: "a | b",
    });
  });

  it("reports ignored extra columns as notices on the header line", () => {
    const report = run([
      "",
      "| Action | Shortcut | Notes | Description |",
      "|---|---|---|---|",
      "| Copy | cmd+c | x | y |",
    ]);
    expect(errors(report)).toEqual([]);
    const ignored = report.diagnostics.filter(
      (d) => d.code === "ignored-column",
    );
    expect(ignored.map((d) => [d.severity, d.line])).toEqual([
      ["notice", 2],
      ["notice", 2],
    ]);
    expect(ignored[0].message).toContain("Notes");
    expect(ignored[1].message).toContain("Description");
  });

  it("errors on a row with more cells than the header, citing its line", () => {
    const report = run([
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
      "| Pipe | cmd+| |",
    ]);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "extra-cells", line: 4 }),
    ]);
    expect(report.ok).toBe(false);
  });

  it("treats missing trailing cells as empty", () => {
    const report = run([
      "| Action | Shortcut | Comment |",
      "|---|---|---|",
      "| Copy | cmd+c |",
    ]);
    expect(report.preview?.sections[0].entries).toEqual([
      { title: "Copy", key: "cmd+c", line: 3 },
    ]);
  });
});

describe("comments and empty rows", () => {
  it("imports comment-only rows and keeps comments on shortcut rows", () => {
    const report = run([
      "| Action | Shortcut | Comment |",
      "|---|---|---|",
      "| Pan | | Hold space and drag |",
      "| Copy | cmd+c | Standard |",
    ]);
    expect(errors(report)).toEqual([]);
    expect(report.preview?.sections[0].entries).toEqual([
      { title: "Pan", comment: "Hold space and drag", line: 3 },
      { title: "Copy", key: "cmd+c", comment: "Standard", line: 4 },
    ]);
  });

  it("writes comment-only rows without a key", () => {
    run(
      [
        "| Action | Shortcut | Comment |",
        "|---|---|---|",
        "| Pan | | Hold space and drag |",
      ],
      { write: true },
    );
    const app = JSON.parse(
      fs.readFileSync(path.join(catalog.dataDir, "example.json"), "utf8"),
    );
    expect(app.keymaps[0].sections[0].shortcuts).toEqual([
      { title: "Pan", comment: "Hold space and drag" },
    ]);
  });

  it("errors on every row with neither shortcut nor comment, citing each line", () => {
    const report = run(
      [
        "## S",
        "| Action | Shortcut | Comment |",
        "|---|---|---|",
        "| Ok | cmd+o | |",
        "| Empty1 | | |",
        "| Empty2 | | |",
      ],
      { write: true },
    );
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "empty-row", line: 5 }),
      expect.objectContaining({ code: "empty-row", line: 6 }),
    ]);
    expect(report.wrote).toBe(false);
  });

  it("errors on an empty row even when the table has no Comment column", () => {
    const report = run(["| Action | Shortcut |", "|---|---|", "| Empty | |"]);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "empty-row", line: 3 }),
    ]);
  });
});

describe("nothing dropped silently", () => {
  const doc = [
    "﻿# Title", // 1 (with BOM)
    "", // 2
    "Some intro prose.", // 3
    "", // 4
    "## Editing", // 5
    "| Action | Shortcut |", // 6
    "|---|---|", // 7
    "| Copy | cmd+c |", // 8
    "", // 9
    "- a bullet", // 10
    "> a quote | with a pipe", // 11
    "", // 12
    "---", // 13
    "Trailing text", // 14
  ];

  it("lists non-table lines with 1-based line numbers and trimmed text", () => {
    const report = run(doc);
    expect(errors(report)).toEqual([]);
    expect(report.nonTableLines).toEqual([
      { line: 3, text: "Some intro prose." },
      { line: 10, text: "- a bullet" },
      { line: 11, text: "> a quote | with a pipe" },
      { line: 13, text: "---" },
      { line: 14, text: "Trailing text" },
    ]);
  });

  it("raises one notice per non-table line, citing the line", () => {
    const report = run(doc);
    const notices = report.diagnostics.filter(
      (d) => d.code === "non-table-line",
    );
    expect(notices.map((d) => [d.severity, d.line])).toEqual(
      [3, 10, 11, 13, 14].map((line) => ["notice", line]),
    );
  });

  it("does not count headings, blank lines or table rows as not imported", () => {
    const report = run([
      "# H",
      "",
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
    ]);
    expect(report.nonTableLines).toEqual([]);
  });

  it("cites source lines correctly with CRLF line endings", () => {
    const report = run(
      [
        "# H",
        "",
        "text",
        "| Action | Shortcut |",
        "|---|---|",
        "| Copy | cmd+c |",
      ]
        .map((l) => l + "\r")
        .concat([""])
        .map((l) => l),
    );
    expect(report.nonTableLines).toEqual([{ line: 3, text: "text" }]);
    expect(report.preview?.sections[0].entries[0].line).toBe(6);
  });

  it("ends a table at a heading even if the heading contains a pipe", () => {
    const report = run([
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
      "## A | B",
      "| Action | Shortcut |",
      "|---|---|",
      "| Paste | cmd+v |",
    ]);
    expect(errors(report)).toEqual([]);
    expect(sectionTitles(report)).toEqual(["General", "A | B"]);
  });

  it("preserves row order exactly across tables and sections", () => {
    const rows = ["z", "a", "m", "b"];
    const report = run([
      "## S2",
      "| Action | Shortcut |",
      "|---|---|",
      `| ${rows[0]} | cmd+1 |`,
      `| ${rows[1]} | cmd+2 |`,
      "## S1",
      "| Action | Shortcut |",
      "|---|---|",
      `| ${rows[2]} | cmd+3 |`,
      `| ${rows[3]} | cmd+4 |`,
    ]);
    expect(
      report.preview?.sections.map((s) => s.entries.map((e) => e.title)),
    ).toEqual([
      ["z", "a"],
      ["m", "b"],
    ]);
  });

  it("cites the table line for an unrecognized table amid valid ones", () => {
    const report = run([
      "| Action | Shortcut |",
      "|---|---|",
      "| Copy | cmd+c |",
      "",
      "| Foo | Bar |",
      "|---|---|",
      "| a | b |",
    ]);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "unrecognized-table", line: 5 }),
    ]);
  });

  it("does not treat a header row with a mismatched delimiter row as a table", () => {
    const report = run(["| Action | Shortcut |", "|---|", "| Copy | cmd+c |"]);
    expect(errors(report)).toEqual([
      expect.objectContaining({ code: "no-table" }),
    ]);
    expect(report.nonTableLines.map((l) => l.line)).toEqual([1, 2, 3]);
  });
});
