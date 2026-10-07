# 11: Real imports and final verification

**What to build:** Use the finished pipeline on real data and prove the MVP works end to end:
- **Imports:**
  - T3 Code (macOS), from the local T3 Code keybindings file
  - Raycast (macOS and Windows), from the Raycast manual's keyboard-shortcuts page, with the Emacs/Vim navigation bindings as their own section
  - `cmd+^` added as an alternative "Toggle sidebar" binding in Codex's macOS keymap
- **How:** every import goes through the import skill, and its source Markdown is committed. Fix any defects found along the way in the relevant module, with a test.

See spec: First real imports; Testing Decisions → Manual verification; Further Notes.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10

**Status:** ready-for-agent

- [ ] The T3 Code, Raycast and Codex imports are written; source Markdown records are committed for each app and platform
- [ ] The T3 Code `mod+0` binding imports as `cmd+0` and validates with key code 29
- [ ] Codex's macOS General section shows "Toggle sidebar" with `cmd+b` and `cmd+^`, the latter flagged as layout-dependent
- [ ] After a dev-server restart, the imported apps and a favorited shortcut are still present
- [ ] Browsing in the browser shows the macOS and Windows keymaps of Raycast correctly, under the platform filter
- [ ] The full suite passes: shared-core sync check, `validate-data`, `format-data:check`, tests, type check, lint and build; the Raycast extension's tests and type check pass
