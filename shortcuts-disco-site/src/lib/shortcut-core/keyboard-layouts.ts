// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
// Per-layout macOS key tables. Catalog shortcuts store the printed character; a layout table records, per character,
// the physical key (macOS virtual key code) and the extra modifiers needed to type that character on the layout.
//
// Layout-dependent symbols are valid catalog keys, but their execution mapping is explicitly null in every layout:
// which physical key produces them differs per keyboard (and Apple's ISO/ANSI hardware), and no key code is guessed.
// The Raycast extension keeps executing from its own flat table (public/data/key-codes.json), not from these tables.

export type KeyboardLayoutId = "qwertz-de" | "us-ansi";
export type ExtraModifier = "shift" | "opt";

export type KeyMapping =
  | { layoutDependent: false; keyCode: number; modifiers: ExtraModifier[] }
  | { layoutDependent: true; keyCode: null; modifiers: [] };

export interface KeyboardLayout {
  name: string;
  keys: Record<string, KeyMapping>;
}

export const PRIMARY_LAYOUT: KeyboardLayoutId = "qwertz-de";

export const LAYOUT_DEPENDENT_SYMBOLS: readonly string[] = ["^", "´", "`", "<", ">", "#", "ß", "ä", "ö", "ü", "§", "°"];

// [keyCode, ...extra modifiers needed to type the character]
type Stroke = readonly [number, ...ExtraModifier[]];

function buildLayout(name: string, strokes: Record<string, Stroke>): KeyboardLayout {
  const keys: Record<string, KeyMapping> = {};
  for (const [char, [keyCode, ...modifiers]] of Object.entries(strokes)) {
    keys[char] = { layoutDependent: false, keyCode, modifiers };
  }
  for (const symbol of LAYOUT_DEPENDENT_SYMBOLS) {
    keys[symbol] = { layoutDependent: true, keyCode: null, modifiers: [] };
  }
  return { name, keys };
}

// Letters a-x and digits share one physical key on both layouts; only y and z swap.
const shared: Record<string, Stroke> = {
  a: [0],
  b: [11],
  c: [8],
  d: [2],
  e: [14],
  f: [3],
  g: [5],
  h: [4],
  i: [34],
  j: [38],
  k: [40],
  l: [37],
  m: [46],
  n: [45],
  o: [31],
  p: [35],
  q: [12],
  r: [15],
  s: [1],
  t: [17],
  u: [32],
  v: [9],
  w: [13],
  x: [7],
  "0": [29],
  "1": [18],
  "2": [19],
  "3": [20],
  "4": [21],
  "5": [23],
  "6": [22],
  "7": [26],
  "8": [28],
  "9": [25],
  ",": [43],
  ".": [47],
};

export const KEYBOARD_LAYOUTS: Record<KeyboardLayoutId, KeyboardLayout> = {
  "qwertz-de": buildLayout("German QWERTZ", {
    ...shared,
    y: [6],
    z: [16],
    "-": [44],
    "+": [30],
    "!": [18, "shift"],
    '"': [19, "shift"],
    $: [21, "shift"],
    "%": [23, "shift"],
    "&": [22, "shift"],
    "/": [26, "shift"],
    "(": [28, "shift"],
    ")": [25, "shift"],
    "=": [29, "shift"],
    "?": [27, "shift"],
    "*": [30, "shift"],
    ";": [43, "shift"],
    ":": [47, "shift"],
    _: [44, "shift"],
    "'": [42, "shift"],
    "[": [23, "opt"],
    "]": [22, "opt"],
    "|": [26, "opt"],
    "{": [28, "opt"],
    "}": [25, "opt"],
    "@": [37, "opt"],
    "\\": [26, "shift", "opt"],
  }),
  "us-ansi": buildLayout("US ANSI", {
    ...shared,
    y: [16],
    z: [6],
    ";": [41],
    "'": [39],
    "/": [44],
    "-": [27],
    "=": [24],
    "[": [33],
    "]": [30],
    "\\": [42],
    "!": [18, "shift"],
    "@": [19, "shift"],
    $: [21, "shift"],
    "%": [23, "shift"],
    "&": [26, "shift"],
    "*": [28, "shift"],
    "(": [25, "shift"],
    ")": [29, "shift"],
    _: [27, "shift"],
    "+": [24, "shift"],
    "{": [33, "shift"],
    "}": [30, "shift"],
    "|": [42, "shift"],
    ":": [41, "shift"],
    '"': [39, "shift"],
    "?": [44, "shift"],
    "~": [50, "shift"],
  }),
};

/** Execution mapping of a printed character on a layout; undefined if the layout cannot type it. */
export function getKeyMapping(key: string, layout: KeyboardLayoutId = PRIMARY_LAYOUT): KeyMapping | undefined {
  const keys = KEYBOARD_LAYOUTS[layout].keys;
  return Object.prototype.hasOwnProperty.call(keys, key) ? keys[key] : undefined;
}

/** True for the symbols whose physical key differs per keyboard; they have no execution mapping. */
export function isLayoutDependentKey(key: string): boolean {
  return LAYOUT_DEPENDENT_SYMBOLS.includes(key);
}

/** True if any layout table knows this printed character (including layout-dependent symbols). */
export function isLayoutKey(key: string): boolean {
  return (Object.keys(KEYBOARD_LAYOUTS) as KeyboardLayoutId[]).some(
    (layout) => getKeyMapping(key, layout) !== undefined
  );
}
