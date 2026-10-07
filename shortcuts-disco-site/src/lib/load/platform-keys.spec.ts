/** @jest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateCatalog } from "./catalog-validation";
import { loadKeyCodes } from "./key-codes";
import type { InputApp } from "../model/input/input-models";
import type { Platform } from "../model/internal/internal-models";

let root: string;

function writeApp(key: string, platforms: Platform[] | undefined) {
  const app: InputApp = {
    $schema: "https://hotkys.com/schema/shortcut.schema.json",
    name: "Example",
    slug: "example",
    keymaps: [{ title: "Default", platforms, sections: [{ title: "General", shortcuts: [{ title: "Action", key }] }] }],
  } as InputApp;
  fs.writeFileSync(path.join(root, "shortcuts-data/example.json"), JSON.stringify(app));
}

const validates = (key: string, platforms: Platform[] | undefined) => {
  writeApp(key, platforms);
  return () => validateCatalog(root);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "hotkys-keys-"));
  fs.mkdirSync(path.join(root, "shortcuts-data/schema"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/data"), { recursive: true });
  for (const file of ["shortcuts-data/schema/shortcut.schema.json", "public/data/key-codes.json"]) {
    fs.copyFileSync(path.join(process.cwd(), file), path.join(root, file));
  }
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("macOS 0 key", () => {
  it("maps 0 to key code 29 and keeps key codes unique", () => {
    const codes = loadKeyCodes(path.join(root, "public/data/key-codes.json"));
    expect(codes.get("0")).toBe("29");
    const keyed = [...codes].filter(([key]) => /^[a-z0-9]$/.test(key));
    expect(new Set(keyed.map(([, code]) => code)).size).toBe(keyed.length);
    expect(validates("cmd+0", ["macos"])).not.toThrow();
  });
});

describe("macOS keymaps", () => {
  it.each(["ctrl+a", "shift+a", "opt+a", "alt+a", "cmd+a", "ctrl+shift+opt+cmd+a", "cmd+f12", "cmd+left"])(
    "accept %s",
    (key) => expect(validates(key, ["macos"])).not.toThrow()
  );

  it("rejects the win modifier with a platform-specific message", () => {
    expect(validates("win+e", ["macos"])).toThrow(/macos.*win|win.*macos/i);
  });

  it.each(["cmd+insert", "cmd+f13", "cmd+printscreen"])("rejects Windows-only key in %s", (key) => {
    expect(validates(key, ["macos"])).toThrow(/Unknown base key/);
  });

  it("accepts modifier-only bindings such as holding shift", () => {
    expect(validates("shift", ["macos"])).not.toThrow();
    expect(validates("cmd+shift", ["macos"])).not.toThrow();
    expect(validates("shift shift", ["macos"])).not.toThrow();
  });

  it("rejects win as the base key", () => {
    expect(validates("ctrl+win", ["macos"])).toThrow(/Modifier 'win' is not valid in a macos keymap/);
  });

  it("reports the macOS modifier order", () => {
    expect(validates("cmd+shift+a", ["macos"])).toThrow(/Correct order: ctrl, shift, opt, cmd/);
  });
});

describe("Windows keymaps", () => {
  it.each(["ctrl+a", "shift+a", "alt+a", "win+e", "ctrl+shift+alt+win+a", "ctrl+insert", "alt+f24", "win+left", "ctrl++"])(
    "accept %s",
    (key) => expect(validates(key, ["windows"])).not.toThrow()
  );

  it.each(["cmd+a", "ctrl+cmd+a", "opt+a", "ctrl+opt+a"])("reject macOS modifier in %s", (key) => {
    expect(validates(key, ["windows"])).toThrow(/windows.*(cmd|opt)|(cmd|opt).*windows/i);
  });

  it.each(["shift", "alt", "ctrl+shift", "ctrl+alt", "ctrl+win", "ctrl ctrl"])(
    "accept modifier-only binding %s",
    (key) => expect(validates(key, ["windows"])).not.toThrow()
  );

  it.each(["cmd", "opt", "ctrl+cmd", "ctrl+opt"])("reject macOS modifier %s as the base key", (key) => {
    expect(validates(key, ["windows"])).toThrow(/Modifier '(cmd|opt)' is not valid in a windows keymap/);
  });

  it("reports the Windows modifier order", () => {
    expect(validates("win+ctrl+a", ["windows"])).toThrow(/Correct order: ctrl, shift, alt, win/);
  });

  it("rejects unknown keys", () => {
    expect(validates("ctrl+💩", ["windows"])).toThrow(/Unknown base key/);
  });
});

describe("Linux keymaps and keymaps without platforms", () => {
  it.each(["ctrl+a", "alt+a", "cmd+a", "win+a", "opt+a"])("keep accepting %s", (key) => {
    expect(validates(key, ["linux"])).not.toThrow();
    expect(validates(key, undefined)).not.toThrow();
  });
});

describe("multi-platform keymaps", () => {
  it("must satisfy every declared platform", () => {
    expect(validates("ctrl+shift+a", ["macos", "linux", "windows"])).not.toThrow();
    expect(validates("alt+a", ["linux", "macos"])).not.toThrow();
    expect(validates("alt+a", ["windows", "linux"])).not.toThrow();
    expect(validates("opt+a", ["windows", "linux"])).toThrow(/windows/i);
    expect(validates("win+a", ["macos", "windows"])).toThrow(/macos/i);
    expect(validates("cmd+a", ["macos", "windows"])).toThrow(/windows/i);
  });
});
