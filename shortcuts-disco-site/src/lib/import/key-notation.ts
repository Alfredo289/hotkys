import { PLATFORM_MODIFIER_ORDER } from "@/lib/shortcut-core/platforms";
import type { ImportPlatform } from "./types";

/** A problem found in one Shortcut cell. The caller attaches the source line. */
export interface NotationProblem {
  code: string;
  message: string;
}

export interface ParsedCell {
  /** One normalized key per alternative, in source order. Empty when `problems` is not. */
  alternatives: string[];
  problems: NotationProblem[];
  warnings: NotationProblem[];
}

class NotationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}
const own = (table: Record<string, string>, key: string): string | undefined => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined);
const fail = (code: string, message: string): never => {
  throw new NotationError(code, message);
};

// --- vocabulary -------------------------------------------------------------------------------------------
// Spellings only. Which keys and modifiers a platform accepts is decided by the catalog validator
// (see key-check.ts); the modifier order comes from the shared platform tables.

const MODIFIER_SYMBOLS: Record<string, string> = { "⌘": "cmd", "⌥": "option", "⌃": "ctrl", "⇧": "shift", "⊞": "win" };
const MODIFIER_WORDS: Record<string, string> = {
  command: "cmd", cmd: "cmd",
  option: "option", opt: "option",
  control: "ctrl", ctrl: "ctrl", ctl: "ctrl",
  shift: "shift",
  win: "win", windows: "win", super: "win",
};
const KEY_SYMBOLS: Record<string, string> = {
  "←": "left", "↑": "up", "→": "right", "↓": "down",
  "↵": "enter", "↩": "enter", "⏎": "enter", "⌅": "enter",
  "⌫": "backspace", "⌦": "delete", "⎋": "esc", "⇥": "tab", "⇪": "capslock", "␣": "space",
  "⇞": "pageup", "⇟": "pagedown", "↖": "home", "↘": "end",
};
const KEY_WORDS: Record<string, string> = {
  esc: "esc", escape: "esc",
  return: "enter", enter: "enter",
  del: "delete", delete: "delete",
  backspace: "backspace", bksp: "backspace",
  pgup: "pageup", pageup: "pageup",
  pgdn: "pagedown", pgdown: "pagedown", pagedown: "pagedown",
  space: "space", spacebar: "space",
  ins: "insert", insert: "insert",
  uparrow: "up", downarrow: "down", leftarrow: "left", rightarrow: "right",
};
/** Words whose meaning depends on the app or platform, so the importer will not guess. */
const AMBIGUOUS_MODIFIERS = new Set(["mod", "meta"]);
const POINTER_WORDS = /\b(?:click(?:s|ing|ed)?|drag(?:s|ging|ged)?|scroll(?:s|ing|ed)?|swipe[sd]?|swiping|tap(?:s|ping|ped)?|hover(?:s|ing)?|pinch(?:ing)?|mouse|trackpad|wheel)\b/i;

/** Multi-word key names, joined into the single words the lexer knows. */
const MULTI_WORD_NAMES: [RegExp, string][] = [
  [/\bpage\s+(up|down)\b/gi, "page$1"],
  [/\bcaps\s+lock\b/gi, "capslock"],
  [/\bnum\s+lock\b/gi, "numlock"],
  [/\bprint\s+screen\b/gi, "printscreen"],
  [/\b(?:windows|win)\s+key\b/gi, "win"],
  [/\b(up|down|left|right)\s+arrow(?:\s+key)?\b/gi, "$1"],
  [/\barrow\s+(up|down|left|right)\b/gi, "$1"],
];

/** Removes the Markdown/HTML wrapping real docs put around keys. */
function clean(raw: string): string {
  return raw
    .replace(/<\/?kbd>/gi, "")
    // `code` spans, but only when the backticks sit at token boundaries so a backtick key (Cmd+`) survives.
    .replace(/(?<![^\s(,;/|])`([^`]+?)`(?![^\s),;/|])/g, "$1")
    // Backslash escapes of ASCII punctuation (\= \* \_ \\ ...).
    .replace(/\\([!-/:-@[-`{-~])/g, "$1")
    .trim();
}

// --- lexer ------------------------------------------------------------------------------------------------

type Punct = "+" | "-" | "," | ";" | "/";
type Item =
  | { t: "atom"; kind: "mod" | "key"; value: string }
  | { t: "punct"; ch: Punct }
  | { t: "sep"; word: "or" | "then" }
  | { t: "sp" };

function lex(text: string, platform: ImportPlatform): Item[] {
  const items: Item[] = [];
  const modifier = (token: string): Item => ({ t: "atom", kind: "mod", value: token === "option" ? (platform === "windows" ? "alt" : "opt") : token });
  for (const [token] of text.matchAll(/\s+|[A-Za-z0-9]+|[\s\S]/gu)) {
    if (/^\s/.test(token)) items.push({ t: "sp" });
    else if ("+-,;/".includes(token) && token.length === 1) items.push({ t: "punct", ch: token as Punct });
    else if (own(MODIFIER_SYMBOLS, token)) items.push(modifier(MODIFIER_SYMBOLS[token]));
    else if (own(KEY_SYMBOLS, token)) items.push({ t: "atom", kind: "key", value: KEY_SYMBOLS[token] });
    else {
      const word = token.toLowerCase();
      if (word === "or" || word === "then") items.push({ t: "sep", word });
      else if (AMBIGUOUS_MODIFIERS.has(word)) fail("ambiguous-notation", `"${token}" depends on the app or platform; write the actual modifier (cmd, ctrl, ...) or fix it in the source.`);
      else if (word === "alt") {
        if (platform === "macos") fail("alt-on-macos", `"${token}" is ambiguous in a macOS import; write Option (opt) or Control (ctrl) explicitly.`);
        items.push(modifier("alt"));
      } else if (own(MODIFIER_WORDS, word)) items.push(modifier(MODIFIER_WORDS[word]));
      else items.push({ t: "atom", kind: "key", value: own(KEY_WORDS, word) ?? word });
    }
  }
  return items;
}

// --- parser -----------------------------------------------------------------------------------------------

interface Chord {
  text: string;
  modifiers: number;
}

function parse(raw: string, text: string, platform: ImportPlatform): ParsedCell {
  const items = lex(text, platform);
  const order = PLATFORM_MODIFIER_ORDER[platform];
  const alternatives: Chord[][] = [[]];
  const slashStarted: number[] = [];
  let modifiers: string[] = [];
  let base: string | null = null;
  let joined = false; // the last thing consumed was a "+" or "-" that expects another token
  let space = false; // whitespace came right before the current item
  let previous: Item | undefined;

  const current = () => alternatives[alternatives.length - 1];
  const nextSignificant = (index: number) => items.slice(index + 1).find(item => item.t !== "sp");
  const closeChord = () => {
    if (joined) fail("ambiguous-notation", `"${raw}" ends in "+" or "-", which could be a separator or the key itself; write the key (plus, hyphen) or remove it.`);
    if (base === null) {
      if (modifiers.length) fail("bare-modifier", `"${raw}" has modifiers but no key.`);
      return;
    }
    if (new Set(modifiers).size !== modifiers.length) fail("repeated-modifier", `"${raw}" repeats a modifier.`);
    const sorted = [...modifiers].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    current().push({ text: [...sorted, base].join("+"), modifiers: sorted.length });
    modifiers = [];
    base = null;
  };
  const startAlternative = () => {
    closeChord();
    if (!current().length) fail("empty-alternative", `"${raw}" has an empty alternative.`);
    alternatives.push([]);
  };

  items.forEach((item, index) => {
    if (item.t === "sp") { space = true; return; }
    const next = nextSignificant(index);
    switch (item.t) {
      case "atom":
        if (base !== null) {
          closeChord(); // a key directly after a complete combo starts the next chord of a sequence
        }
        if (item.kind === "mod") modifiers.push(item.value);
        else base = item.value;
        joined = false;
        break;
      case "sep":
        if (item.word === "or") {
          if (base === null && !modifiers.length && !joined && current().length) alternatives.push([]);
          else startAlternative();
        } else if (base !== null || modifiers.length || joined || !current().length) {
          closeChord();
          if (!current().length) fail("empty-alternative", `"${raw}" starts with "then".`);
        }
        break;
      case "punct": {
        const ch = item.ch;
        if (ch === "+" || ch === "-") {
          if (base !== null) fail("ambiguous-notation", `"${ch}" after the key in "${raw}" could be a separator or part of a key name.`);
          if (!modifiers.length) {
            const following = items[index + 1];
            if (following && following.t !== "sp") fail("ambiguous-notation", `"${ch}" at the start of "${raw}" could be a separator or the key itself.`);
            base = ch;
          } else if (joined) {
            base = ch;
            joined = false;
          } else if (next === undefined || next.t === "sep") {
            if (!space) fail("ambiguous-notation", `"${raw}" ends in "${ch}" directly after a modifier, which could be a separator or the key itself.`);
            base = ch; // "⌘ +": a modifier-only token joins the next token, here the key
          } else {
            joined = true;
          }
          break;
        }
        // "," ";" "/" are separators between complete combos and keys everywhere else.
        if (base !== null) {
          if (ch === ",") closeChord();
          else {
            startAlternative();
            if (ch === "/") slashStarted.push(alternatives.length - 1);
          }
        } else if (modifiers.length) {
          if (ch === "/" && !joined && next?.t === "atom" && next.kind === "mod") {
            fail("ambiguous-notation", `"${raw}" lists modifiers as alternatives (like Ctrl/Cmd); write one combination per platform or alternative.`);
          }
          base = ch;
          joined = false;
        } else {
          if (previous?.t === "punct" && previous.ch !== "+" && previous.ch !== "-") fail("empty-alternative", `"${raw}" has "${ch}" with nothing before it.`);
          base = ch;
        }
        break;
      }
    }
    previous = item;
    space = false;
  });
  closeChord();
  if (alternatives.some(chords => !chords.length)) fail("empty-alternative", `"${raw}" has an empty alternative.`);

  const warnings: NotationProblem[] = [];
  for (const start of slashStarted) {
    const before = alternatives[start - 1];
    const after = alternatives[start];
    if (before[before.length - 1].modifiers > 0 && after.length === 1 && after[0].modifiers === 0) {
      warnings.push({
        code: "alternative-without-modifiers",
        message: `"${after[0].text}" in "${raw}" has no modifiers; if "/" meant a shared prefix (like Cmd+[ / ]), write each alternative in full.`,
      });
    }
  }
  return { alternatives: alternatives.map(chords => chords.map(chord => chord.text).join(" ")), problems: [], warnings };
}

/**
 * Turns the text of a Shortcut cell into catalog keys, one per alternative. Pure spelling and structure:
 * whether the platform supports each key is checked separately against the catalog vocabularies.
 * Never throws; the first problem found comes back in `problems`.
 */
export function parseShortcutCell(raw: string, platform: ImportPlatform): ParsedCell {
  try {
    const cleaned = clean(raw);
    if (POINTER_WORDS.test(cleaned)) fail("pointer-gesture", `"${raw}" describes a mouse or trackpad gesture, which has no key; put it in the Comment column and leave Shortcut empty.`);
    return parse(raw, MULTI_WORD_NAMES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), cleaned), platform);
  } catch (error) {
    if (!(error instanceof NotationError)) throw error;
    return { alternatives: [], problems: [{ code: error.code, message: error.message }], warnings: [] };
  }
}
