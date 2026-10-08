// Windows base-key vocabulary: the key names that may end a chord in a Windows keymap.
// ctrl, shift, alt and win are listed because modifier-only bindings exist ("hold shift"); the macOS-only cmd and opt
// are not valid on Windows at all and must not appear here.
export function getWindowsKeyNames(): Record<string, string> {
  const keys: Record<string, string> = {};

  // Letters a-z
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    keys[letter] = letter;
  }

  // Digits 0-9
  for (let i = 0; i <= 9; i++) {
    keys[i.toString()] = i.toString();
  }

  // Function keys f1-f24
  for (let i = 1; i <= 24; i++) {
    keys[`f${i}`] = `f${i}`;
  }

  const specialKeys = [
    "plus",
    "hyphen",
    "ctrl",
    "shift",
    "alt",
    "win",
    "enter",
    "tab",
    "escape",
    "esc",
    "backspace",
    "delete",
    "del",
    "home",
    "end",
    "pageup",
    "pagedown",
    "pgup",
    "pgdn",
    "left",
    "right",
    "up",
    "down",
    "space",
    "insert",
    "pause",
    "scrolllock",
    "numlock",
    "capslock",
    "printscreen",
    "break",
  ];

  const symbols = [
    "`",
    "-",
    "=",
    "[",
    "]",
    "\\",
    ";",
    "'",
    ",",
    ".",
    "/",
    "~",
    "!",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    "_",
    "+",
    "{",
    "}",
    "|",
    ":",
    '"',
    "<",
    ">",
    "?",
  ];

  for (const key of [...specialKeys, ...symbols]) {
    keys[key] = key;
  }

  return keys;
}
