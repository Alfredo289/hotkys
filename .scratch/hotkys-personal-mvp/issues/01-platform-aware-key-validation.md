# 01: Platform-aware key validation and macOS `0` fix

**What to build:** Catalog validation checks every keymap against its own platform's vocabulary, and the macOS `0` key maps to the right key. A macOS keymap may use `ctrl`, `shift`, `opt`/`alt`, `cmd` and macOS base keys. A Windows keymap may use `ctrl`, `shift`, `alt`, `win` and Windows base keys, and never `cmd`/`opt`. Linux keymaps behave as before. The Windows key vocabulary moves into the shared shortcuts core, so the site validator, the importer and the Raycast extension all agree on it. The existing catalog keeps validating, and the extension keeps compiling.

See spec: `.scratch/hotkys-personal-mvp/spec.md` (Keys and layouts; Testing Decisions, seam 2).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The macOS key code for `0` is 29, with a regression test through catalog validation
- [ ] A macOS keymap using `win` or a Windows-only key fails validation with a clear message; a Windows keymap using `cmd`/`opt` or a macOS-only key fails
- [ ] The Windows key vocabulary lives in the shared core and is synced into consumers by the existing sync script; the sync check passes
- [ ] The site validator, the Raycast extension and the root catalog verification script all use the shared vocabulary
- [ ] All existing catalog files still validate (if any fail under the new rules, fix the data and list each change in the commit message)
- [ ] Site tests, type check, `validate-data`, and the Raycast extension's tests and type check pass
