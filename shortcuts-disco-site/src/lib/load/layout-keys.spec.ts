/** @jest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateCatalog } from "./catalog-validation";
import { loadKeyCodes } from "./key-codes";
import {
  KEYBOARD_LAYOUTS,
  LAYOUT_DEPENDENT_SYMBOLS,
  PRIMARY_LAYOUT,
  getKeyMapping,
  isLayoutDependentKey,
} from "@/lib/shortcut-core/keyboard-layouts";
import type { InputApp } from "../model/input/input-models";
import type { Platform } from "../model/internal/internal-models";

const SYMBOLS = ["^", "´", "`", "<", ">", "#", "ß", "ä", "ö", "ü", "§", "°"];

let root: string;

function validates(key: string, platforms: Platform[] | undefined) {
  const app = {
    $schema: "https://hotkys.com/schema/shortcut.schema.json",
    name: "Example",
    slug: "example",
    keymaps: [{ title: "Default", platforms, sections: [{ title: "General", shortcuts: [{ title: "Action", key }] }] }],
  } as InputApp;
  fs.writeFileSync(path.join(root, "shortcuts-data/example.json"), JSON.stringify(app));
  return () => validateCatalog(root);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "hotkys-layouts-"));
  fs.mkdirSync(path.join(root, "shortcuts-data/schema"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/data"), { recursive: true });
  for (const file of ["shortcuts-data/schema/shortcut.schema.json", "public/data/key-codes.json"]) {
    fs.copyFileSync(path.join(process.cwd(), file), path.join(root, file));
  }
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("layout-dependent symbols in catalog validation", () => {
  it.each(SYMBOLS)("accepts cmd+%s in a macOS keymap and in a keymap without platforms", (symbol) => {
    expect(validates(`cmd+${symbol}`, ["macos"])).not.toThrow();
    expect(validates(`cmd+${symbol}`, undefined)).not.toThrow();
    expect(validates(`${symbol}`, ["macos"])).not.toThrow();
    expect(validates(`cmd+k ${symbol}`, ["macos"])).not.toThrow();
  });

  it.each(["€", "ñ", "µ", "Ä", "cmd+ä+x", "💩"])("still rejects unknown symbol %s", (symbol) => {
    expect(validates(`cmd+${symbol}`, ["macos"])).toThrow(/Unknown base key|Shortcut expression|Modifier/);
  });

  it("accepts characters typed with extra modifiers on QWERTZ", () => {
    for (const key of ["cmd+/", "cmd+[", "cmd+@", "cmd+?", "cmd+{", "cmd+|", 'cmd+"']) {
      expect(validates(key, ["macos"])).not.toThrow();
    }
  });

  it("keeps the Windows vocabulary unchanged: German-only symbols are not Windows keys", () => {
    expect(validates("ctrl+ß", ["windows"])).toThrow(/Unknown base key/);
    expect(validates("ctrl+^", ["windows"])).not.toThrow();
  });
});

describe("keyboard layout tables", () => {
  it("has German QWERTZ as the primary layout and keeps US ANSI", () => {
    expect(PRIMARY_LAYOUT).toBe("qwertz-de");
    expect(Object.keys(KEYBOARD_LAYOUTS).sort()).toEqual(["qwertz-de", "us-ansi"]);
  });

  it("maps 0 to key code 29 in both layouts", () => {
    expect(getKeyMapping("0", "qwertz-de")).toEqual({ layoutDependent: false, keyCode: 29, modifiers: [] });
    expect(getKeyMapping("0", "us-ansi")).toEqual({ layoutDependent: false, keyCode: 29, modifiers: [] });
  });

  it("swaps z and y on QWERTZ", () => {
    expect(getKeyMapping("z", "qwertz-de")?.keyCode).toBe(16);
    expect(getKeyMapping("y", "qwertz-de")?.keyCode).toBe(6);
    expect(getKeyMapping("z", "us-ansi")?.keyCode).toBe(6);
    expect(getKeyMapping("y", "us-ansi")?.keyCode).toBe(16);
  });

  it("records the physical key and extra modifiers for characters on QWERTZ", () => {
    expect(getKeyMapping("/", "qwertz-de")).toEqual({ layoutDependent: false, keyCode: 26, modifiers: ["shift"] });
    expect(getKeyMapping("[", "qwertz-de")).toEqual({ layoutDependent: false, keyCode: 23, modifiers: ["opt"] });
    expect(getKeyMapping("]", "qwertz-de")).toEqual({ layoutDependent: false, keyCode: 22, modifiers: ["opt"] });
    expect(getKeyMapping("\\", "qwertz-de")).toEqual({ layoutDependent: false, keyCode: 26, modifiers: ["shift", "opt"] });
    expect(getKeyMapping("/", "us-ansi")).toEqual({ layoutDependent: false, keyCode: 44, modifiers: [] });
  });

  it("defaults lookups to the primary layout", () => {
    expect(getKeyMapping("z")).toEqual(getKeyMapping("z", PRIMARY_LAYOUT));
  });

  it("marks every layout-dependent symbol with a null execution mapping in every layout", () => {
    expect([...LAYOUT_DEPENDENT_SYMBOLS].sort()).toEqual([...SYMBOLS].sort());
    for (const layout of Object.keys(KEYBOARD_LAYOUTS) as (keyof typeof KEYBOARD_LAYOUTS)[]) {
      for (const symbol of SYMBOLS) {
        expect(getKeyMapping(symbol, layout)).toEqual({ layoutDependent: true, keyCode: null, modifiers: [] });
      }
    }
  });

  it("answers whether a key is layout-dependent", () => {
    for (const symbol of SYMBOLS) expect(isLayoutDependentKey(symbol)).toBe(true);
    for (const key of ["a", "/", "0", "esc", "€"]) expect(isLayoutDependentKey(key)).toBe(false);
  });

  it("returns undefined for characters a layout cannot type", () => {
    expect(getKeyMapping("€", "qwertz-de")).toBeUndefined();
    expect(getKeyMapping("esc", "qwertz-de")).toBeUndefined();
  });

  it("never assigns the same keystroke to two characters within a layout", () => {
    for (const layout of Object.values(KEYBOARD_LAYOUTS)) {
      const seen = new Map<string, string>();
      for (const [char, mapping] of Object.entries(layout.keys)) {
        if (mapping.keyCode === null) continue;
        const stroke = `${mapping.keyCode}:${[...mapping.modifiers].sort().join("+")}`;
        expect({ char, clashesWith: seen.get(stroke) }).toEqual({ char, clashesWith: undefined });
        seen.set(stroke, char);
      }
    }
  });

  it("agrees with the Raycast-facing key-codes.json for unmodified US characters", () => {
    const codes = loadKeyCodes(path.join(root, "public/data/key-codes.json"));
    for (const [char, mapping] of Object.entries(KEYBOARD_LAYOUTS["us-ansi"].keys)) {
      if (mapping.keyCode === null || mapping.modifiers.length > 0) continue;
      expect({ char, code: codes.get(char) }).toEqual({ char, code: String(mapping.keyCode) });
    }
  });
});
