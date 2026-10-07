# 10: Key notation normalization and diagnostics

**What to build:** The importer accepts the notation real docs use, normalizes it to catalog keys, and reports everything it cannot decide.
- **Modifiers:** symbols ⌘⌥⌃⇧ and names (Command/Cmd, Option/Opt/Alt, Control/Ctrl/Ctl, Shift, Win/Windows/Super) map to catalog modifiers (`alt` on Windows), emitted in canonical order.
- **Key names:** Esc/Escape, Return/Enter/↵, Del/Delete, Backspace, PgUp/PgDn, arrow words and ←↑→↓, Space, Tab and F-keys normalize. Letters are lowercased, and an uppercase letter never implies Shift. Shifted characters are stored as the character. Markdown escapes are removed.
- **Combos and sequences:** `+` is the combo separator, and `-` only where it is unambiguous. A token made only of modifiers joins the next token. Whitespace, `then` or commas between complete combos make a sequence.
- **Alternatives:** `or`, `/` between complete combos, and `;` produce adjacent entries with the same title, in source order.
- **Errors:** ambiguous notation (`Ctrl/Cmd`, `Mod`, ambiguous `+`/`-`, a bare modifier, `Alt` in a macOS import, click/drag words), keys the platform doesn't support, and length violations (no truncation).
- **Warnings:** the same key bound to different actions in one section.
- **Notices:** exact duplicates collapsed (citing both lines), and layout-dependent keys ("no execution mapping").

See spec: Import operation → Normalization, Diagnostics policy; user stories 44–49, 51–56.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] Each normalization rule has a fixture-driven test through the import operation, including `⇧ ⌘ /` → `shift+cmd+/`, `cmd+k cmd+s`, `Ctrl-S`, and `Cmd+Shift+Z or Cmd+Y`
- [ ] Each error class aborts with nothing written and cites the source line
- [ ] Warnings and notices appear in the report without blocking the write
- [ ] `cmd+^` imports with a layout-dependent notice
- [ ] Platform vocabularies from 01 and the layout tables from 05 are used, not duplicated
