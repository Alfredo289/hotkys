/** @jest-environment node */
import { it, expect, beforeEach, afterEach } from "@jest/globals";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createTempCatalog } from "./test-catalog";

let catalog: ReturnType<typeof createTempCatalog>;
let table: string;
beforeEach(() => {
  catalog = createTempCatalog();
  table = path.join(catalog.root, "example-macos.md");
  fs.writeFileSync(
    table,
    "| Action | Shortcut |\n|---|---|\n| Copy | cmd+c |\n",
  );
});
afterEach(() => catalog.cleanup());

const run = (...args: string[]) => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/lib/import/cli.ts",
      "--root",
      catalog.root,
      ...args,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};
const base = () => [
  "--app",
  "Example",
  "--slug",
  "example",
  "--platform",
  "macos",
  "--file",
  table,
];

it("previews by default with exit 0 and writes nothing", () => {
  const before = catalog.snapshot();
  const result = run(...base());
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("cmd+c");
  expect(result.stdout).toContain("Dry run");
  expect(catalog.snapshot()).toEqual(before);
});

it("writes with --write and emits the report with --json", () => {
  const result = run(
    ...base(),
    "--write",
    "--json",
    "--source",
    "https://example.com",
    "--bundle-id",
    "com.example",
  );
  expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({
    ok: true,
    wrote: true,
    app: { slug: "example", created: true },
  });
  const written = JSON.parse(
    fs.readFileSync(path.join(catalog.dataDir, "example.json"), "utf8"),
  );
  expect(written).toMatchObject({
    source: "https://example.com",
    bundleId: "com.example",
  });
});

it("exits 1 with the error in the JSON report when validation fails, writing nothing", () => {
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
  const result = run(...base(), "--write", "--json");
  expect(result.status).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.ok).toBe(false);
  expect(report.wrote).toBe(false);
  expect(report.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        severity: "error",
        code: "catalog-validation",
      }),
    ]),
  );
  expect(catalog.snapshot()).toEqual(before);
});

it.each([
  [
    "a missing required flag",
    ["--app", "Example", "--slug", "example", "--file", "x.md"],
  ],
  [
    "an invalid platform",
    [
      "--app",
      "Example",
      "--slug",
      "example",
      "--platform",
      "linux",
      "--file",
      "x.md",
    ],
  ],
  [
    "an invalid slug",
    [
      "--app",
      "Example",
      "--slug",
      "Not_A_Slug",
      "--platform",
      "macos",
      "--file",
      "x.md",
    ],
  ],
  [
    "a slug that is too long",
    [
      "--app",
      "Example",
      "--slug",
      "a".repeat(81),
      "--platform",
      "macos",
      "--file",
      "x.md",
    ],
  ],
  [
    "an unknown flag",
    [
      ...[
        "--app",
        "Example",
        "--slug",
        "example",
        "--platform",
        "macos",
        "--file",
        "x.md",
      ],
      "--bogus",
    ],
  ],
  [
    "an unreadable file",
    [
      "--app",
      "Example",
      "--slug",
      "example",
      "--platform",
      "macos",
      "--file",
      "/nonexistent/x.md",
    ],
  ],
])("exits 2 for %s", (_name, args) => {
  const before = catalog.snapshot();
  const result = run(...args.map((arg) => (arg === "x.md" ? table : arg)));
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("Usage:");
  expect(catalog.snapshot()).toEqual(before);
});
