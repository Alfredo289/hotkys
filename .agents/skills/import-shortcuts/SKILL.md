---
name: import-shortcuts
description: Import an app's keyboard shortcuts into the hotkys catalog from any source (URL, PDF, pasted text, screenshot, keybinding file). Use when adding or updating an app's shortcuts, or converting shortcut data to the catalog.
---

# Import shortcuts

Read `docs/importing-shortcuts.md` first. It holds the table format, key notation, CLI flags, diagnostics and merge rules, and "What the skill resolves". This skill is the procedure.

## Steps

1. **Extract.** Read the source (`defuddle` for URLs, `read` for PDFs, view images directly). Done when every shortcut in the source is in hand, or reported as skipped.
2. **Resolve.** Apply each resolution under "What the skill resolves" in the guide, so the CLI never has to guess. Keep every Action and Comment to 50 characters and every Section to 100. Done when no cell holds ambiguous notation: `Mod`, `Ctrl/Cmd`, click or drag words, `Alt` on macOS.
3. **Write one table per platform** to `shortcut-sources/<slug>.<platform>.md`, in the guide's table format. A source without a platform split yields one table; a source covering both yields two. Done when each file exists, and the single-platform entries left out of the other table are listed.
4. **Preview.** From `shortcuts-disco-site/`, run the CLI without `--write`:
   `npm run import -- --app <name> --slug <slug> --platform <macos|windows> --file ../shortcut-sources/<slug>.<platform>.md --json`
   Add `--source`, `--bundle-id`, `--hostname` and `--icon` for a new app, and `--keymap` when the diagnostics require it. Done when exit code is `0`. On exit `1`, fix the Markdown at the cited line and re-run; an error that needs the user's call (an ambiguous key, a merge conflict) goes to the user. Exit `2` is a usage mistake in your flags.
5. **Show.** Present to the user: the preview, the change summary, warnings, notices, the layout-dependent keys, and a list of everything resolved or left out in steps 2 and 3. Done when the user has seen it and approved the write.
6. **Write.** Re-run the step 4 command with `--write` (and `--overwrite` only when the user asked to rebuild the keymap). Done when the CLI reports the write. Then run `npm run validate-data` and `npm run format-data:check`.

Commit the `shortcut-sources/` files together with the catalog JSON.
