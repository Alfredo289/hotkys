# 05: Per-layout key tables and layout-dependent symbols

**What to build:** Replace the single US-ANSI macOS key table with per-layout tables. German QWERTZ is the primary layout and US ANSI is kept. Catalog keys still store the printed character. For each character, a layout table records the physical key code and any extra modifiers needed to type it on that layout (e.g. on QWERTZ `/` = Shift+7, `[` = Option+5, and `z`/`y` swapped). The layout-dependent symbols `^ ´ \` < > # ß ä ö ü § °` are valid keys whose execution mapping is explicitly null and marked layout-dependent; no key code is guessed. They display as their character. Raycast execution keeps working off its current table; nothing it consumes may break.

See spec: Keys and layouts; user stories 8, 76–79.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] QWERTZ and US-ANSI tables exist, with QWERTZ as primary; the `0` fix from 01 is in both
- [ ] A hand-edited catalog shortcut `cmd+^` validates, and so does every other listed layout-dependent symbol; unknown symbols still fail
- [ ] Each layout-dependent symbol is explicitly marked, with a null execution mapping
- [ ] Layout-dependent keys render correctly on app pages
- [ ] The key-code data the Raycast extension fetches or uses is still valid for it (its tests pass)
- [ ] Validation tests cover both layouts and the layout-dependent symbols; site tests, type check and `validate-data` pass
