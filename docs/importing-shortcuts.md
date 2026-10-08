# Importing shortcuts

The catalog (`shortcuts-disco-site/shortcuts-data/<slug>.json`) is the source of truth. Add shortcuts to it in one of three ways: let the import skill convert a source for you, run the import CLI on a Markdown table, or edit the JSON by hand. The `/add-shortcuts` page of the site mirrors this document.

## The import skill

The `import-shortcuts` skill turns any source (URL, PDF, pasted text, screenshot, keybinding file) into the canonical Markdown table, one table per platform. Ask your agent, for example: "Import the Raycast macOS shortcuts from this URL."

The skill:

1. Extracts the shortcuts from the source and writes one table per platform to `shortcut-sources/<slug>.<platform>.md` (`macos` or `windows`). These source records are committed, so diffs are reviewable and imports can be re-run.
2. Runs the CLI as a dry run and shows you the preview.
3. Fixes errors it can resolve, and reports the rest.
4. Runs `--write` only after you have seen the preview.

The Markdown record is an input only; the catalog JSON stays the source of truth.

### What the skill resolves

The CLI never guesses. The skill resolves these before the CLI runs, and reports each resolution:

- Platform-paired notation (`mac / win`) splits into one table per platform.
- `mod` becomes the platform's primary modifier (`cmd` on macOS, `ctrl` on Windows).
- Ranges (`⌘1 to ⌘9`) expand into one entry per key.
- Context notes (`empty composer`, `when terminal is focused`) and `when` conditions become the Comment.
- Entries that exist on one platform only are left out of the other platform's table, and reported.
- Command IDs become readable titles (`terminal.toggle` becomes "Toggle terminal").

## The Markdown table

Only GFM tables are imported. Columns, matched case-insensitively:

| Column | Header synonyms | Required |
| --- | --- | --- |
| Action | Action, Command, Description | yes |
| Shortcut | Shortcut, Keys, Key | yes |
| Section | Section | no |
| Comment | Comment | no |

Example:

```markdown
## Navigation

| Action | Shortcut | Comment |
| --- | --- | --- |
| Toggle sidebar | ⌘B | |
| Go to line | Ctrl-G or ⌘L | |
| Open settings | ⌘, | |
| Drag to reorder | | Drag a tab with the mouse |
```

- **Sections.** The nearest preceding heading (any level) names the section. A Section column overrides it per row. The fallback is "General".
- **Order.** Rows keep their source order.
- **Outside tables.** Other content is reported with line numbers and not imported.
- **Comment-only rows.** A row with a Comment and no Shortcut is kept, for mouse gestures and notes.

### Key notation

- Modifiers: `⌘ ⌥ ⌃ ⇧` and the names Command/Cmd, Option/Opt/Alt, Control/Ctrl/Ctl, Shift, Win/Windows/Super normalize to `cmd`, `opt`, `ctrl`, `shift`, `win` (`alt` on Windows), in the catalog's canonical order.
- Key names: Esc/Escape, Return/Enter/↵, Del/Delete, Backspace, PgUp/PgDn, arrow words and ←↑→↓, Space, Tab and F-keys normalize to the catalog vocabulary. Letters are lowercased.
- `+` joins a combo. `-` also works when unambiguous (`Ctrl-S`). A modifier-only token joins the next token (`⇧ ⌘ /` becomes `shift+cmd+/`).
- A sequence is complete combos separated by whitespace, "then" or commas (`cmd+k cmd+s`).
- Alternatives for one action share a cell, separated by `or`, `/` between complete combos, or `;`. Each becomes its own adjacent entry with the same title.
- Uppercase letters never imply Shift. A shifted character is stored as the character itself.
- Markdown escapes such as `\=` are removed. Keys can be written as `<kbd>` tags or inline code.
- The key itself can be `+` or `-` when that is unambiguous: `Cmd++`, `Cmd--` and `⌘ +` work, a trailing `Cmd+` does not. A `/` right after a modifier is the `/` key (`⌘/`), but `Ctrl/Cmd` is an error.
- `Alt` is only accepted in Windows imports (in a macOS import write `Option` or `Control`), and `Cmd` is rejected in Windows imports.
- Layout-dependent symbols (^ ´ &#96; < > # ß ä ö ü § °) are valid in macOS imports. They have no execution mapping, and the preview lists them.
- macOS keymaps allow `ctrl`, `shift`, `opt`/`alt`, `cmd`; Windows keymaps allow `ctrl`, `shift`, `alt`, `win`. Never `cmd`/`opt` on Windows.

## The import CLI

Run it from `shortcuts-disco-site/`:

```bash
npm run import -- --app "Raycast" --slug raycast --platform macos \
  --file ../shortcut-sources/raycast.macos.md
```

| Flag | Meaning |
| --- | --- |
| `--app <name>` | App name (required). |
| `--slug <slug>` | App slug, equal to the catalog file name (required). |
| `--platform macos\|windows` | Platform of the table (required). |
| `--file <path>` | Markdown table file, relative to the current directory (required). |
| `--keymap <title>` | Target keymap. Required when several keymaps match the platform or a keymap declares no platforms. |
| `--source <url>` | Source URL (new apps). |
| `--bundle-id <id>` | Bundle ID (new apps). |
| `--hostname <host>` | Website hostname (new apps). |
| `--icon <path>` | Icon (new apps). Without one, a default icon is used. |
| `--write` | Write the result to the catalog. |
| `--overwrite` | Replace the target keymap entirely. |
| `--json` | Print the report as JSON. |

The default is a dry run: it prints the normalized preview, the change summary and all diagnostics, and writes nothing.

Exit codes: `0` success (possibly with warnings and notices), `1` errors (nothing written), `2` usage error.

### Diagnostics

Every diagnostic cites its line number in the Markdown file.

- **Errors** abort the import with nothing written: ambiguous notation (`Ctrl/Cmd`, `Mod`, ambiguous `+`/`-`, a bare modifier, `Alt` in a macOS import, a `/` alternative without modifiers after one with them like `Cmd+[ / ]`, click and drag words), keys unsupported on the platform, length violations (titles, sections, comments, keys), unparseable rows, rows with neither shortcut nor comment, merge conflicts, and any failure when the whole catalog is validated with the new file in place.
- **Warnings** allow the write: the same key bound to different actions in one section, including actions already in the target section of an existing app.
- **Notices** are informational: collapsed duplicate rows, layout-dependent keys, non-table lines not imported.

There is no partial write and no mode that skips bad rows.

### `--write` and `--overwrite`

`--write` validates the entire catalog with the new file in place, then writes atomically (temp file, then rename), formatted like `npm run prettify`.

Without `--overwrite`, an import into an existing app merges into the target keymap, the one whose platforms include the import platform. When none exists, the import creates "Default" (macOS) or "Default (Windows)".

- Rows match by section, action and platform, ignoring case and extra whitespace. Existing titles keep their casing.
- An identical shortcut is unchanged, so re-running an import reports zero changes.
- A new shortcut for an existing action is appended as an adjacent alternative.
- A new action is appended to the end of its section, in source order. New sections go at the end of the keymap.
- Merging is additive: existing shortcuts the table does not mention are kept, so a partial table merges cleanly.
- An imported row that would alter an existing shortcut (same section, action and shortcut, different comment) is a conflict, which aborts the import.

`--overwrite` replaces the whole target keymap with the table, dropping existing shortcuts the table does not list. Use it to rebuild an app's shortcuts on purpose.

After a write, the dev server (`npm run dev`) picks up the change automatically.

## Editing the JSON by hand

Edit `shortcuts-disco-site/shortcuts-data/<slug>.json` directly, keeping the file name equal to the `slug`. Each shortcut has a `title`, a `key` (sequences separated by whitespace) and an optional `comment`. Then, from `shortcuts-disco-site/`:

```bash
npm run prettify -- --write <slug>.json
npm run validate-data
npm run format-data:check
```

Validation applies the same platform- and layout-aware key rules as the importer.
