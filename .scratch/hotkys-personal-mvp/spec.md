Status: ready-for-agent

# Spec: Hotkys personal MVP

## Problem Statement

I want a personal keyboard-shortcut catalog for the apps I actually use, running at `http://localhost:3000`. The fork I have is built for a hosted, multi-user product: it requires Clerk and Supabase for favorites, preferences and custom apps; it ships Google Analytics and a GitHub Pages deployment; and its only way to add shortcuts is a cloud editor that needs an account and a database. There is no way to turn the shortcut lists I find in docs, manuals or app config files into catalog entries without hand-writing JSON.

The key data is also wrong or US-centric in ways that matter to me. The macOS key code for `0` actually points at the `-` key, so every `…+0` shortcut executes the wrong key. Windows keymaps are validated against the macOS key list. The key table assumes a US ANSI layout, while I type on a German QWERTZ keyboard where symbols such as `^`, `ß` or `/` live on different keys, and the catalog currently rejects layout-dependent symbols outright, so I cannot record a binding like `cmd+^`.

## Solution

Hotkys becomes a local-only, account-free site. The catalog JSON files are the single source of truth; favorites and preferences live in the browser's local storage. Nothing requires an account, a cloud database or environment variables to start, browse or import.

Shortcuts get into the catalog through a two-stage import:

1. An agent skill converts any source (web page, PDF, pasted text, screenshot, app keybinding file) into a canonical Markdown table and keeps that Markdown as a committed source record.
2. A deterministic import CLI parses that Markdown, normalizes key notation, validates against the full catalog, shows a preview, and only writes when asked. It merges into existing apps instead of duplicating them, refuses to silently change or drop anything, and leaves files untouched on any error.

Key handling becomes platform-aware and layout-aware: macOS and Windows keymaps are validated against their own key vocabularies, the key table is modeled per keyboard layout with German QWERTZ as the primary layout, the `0` key code is fixed, and layout-dependent symbols such as `^` are accepted explicitly without guessing an execution mapping.

The first real imports are T3 Code (macOS, from my local keybindings), Raycast (macOS and Windows, from the Raycast manual) and one personal addition to the existing Codex app (`cmd+^` for Toggle sidebar).

## User Stories

### Running and browsing

1. As the catalog owner, I want to start the site with only `npm ci` and `npm run dev`, so that I never have to configure accounts, databases or environment variables.
2. As the catalog owner, I want the site to start without any Clerk or Supabase environment variables and without configuration checks failing, so that a fresh clone just works.
3. As the catalog owner, I want to search apps by name on the home page, so that I can find an app quickly.
4. As the catalog owner, I want to filter the catalog by macOS or Windows, so that I only see shortcuts for the machine I'm on.
5. As the catalog owner, I want the platform filter to default to macOS when I have no saved preference, so that my primary platform is shown first.
6. As the catalog owner, I want macOS and Windows keymaps of the same app to stay distinct, so that I never confuse `cmd` and `ctrl` bindings.
7. As the catalog owner, I want Linux keymaps that already exist in the catalog to keep displaying, so that nothing from upstream disappears.
8. As the catalog owner, I want shortcuts with layout-dependent symbols such as `^` to display correctly, so that my personal bindings are visible like any other.
9. As the catalog owner, I want no analytics scripts loaded, so that my browsing stays private.

### Local favorites and preferences

10. As the catalog owner, I want to favorite shortcuts without signing in, so that I can collect the ones I'm learning.
11. As the catalog owner, I want favorites to persist across browser reloads and dev-server restarts, so that I don't lose them.
12. As the catalog owner, I want a favorites page listing everything I've favorited, so that I can review my learning list.
13. As the catalog owner, I want a favorite to survive a re-import that keeps its shortcut, so that merging new shortcuts never wipes my favorites.
14. As the catalog owner, I want favorites whose shortcut no longer exists to be shown as missing rather than vanish, so that I notice catalog changes instead of silently losing data.
15. As the catalog owner, I want my platform filter, view mode (list or cheatsheet) and column count remembered where I change them, so that the site opens the way I left it.
16. As the catalog owner, I want stored data versioned, so that a future storage change can migrate it instead of breaking it.

### Account removal

17. As the catalog owner, I want login, profile, settings and "My Shortcuts" pages gone, so that the site has no dead account flows.
18. As the catalog owner, I want the cloud editor and export dialog gone, so that there's only one way to add shortcuts: the catalog files.
19. As the catalog owner, I want Clerk, Supabase and analytics dependencies removed from the site, so that installs are smaller and nothing calls external services.
20. As the catalog owner, I want CI to stop running database and deployment jobs, so that CI only checks what this fork actually uses.
21. As the catalog owner, I want the decision to go local-only recorded in an ADR, so that future work doesn't reintroduce accounts by following the old remediation spec.

### Adding shortcuts: instructions

22. As the catalog owner, I want an "Add shortcuts" page linked from the header, so that I can remember how to import or edit catalog files.
23. As the catalog owner, I want that page to explain the skill, the CLI, the Markdown table format, `--write`, `--overwrite`, and hand-editing JSON, so that I can add shortcuts without reading code.
24. As the catalog owner, I want the same instructions available as a repo document, so that the agent skill and I read the same rules.

### Converting sources (skill)

25. As the catalog owner, I want an agent skill that turns any shortcut source (URL, PDF, pasted text, screenshot, keybinding file) into the canonical Markdown table, so that I don't hand-write JSON.
26. As the catalog owner, I want the skill to save its Markdown output as a committed source record per app and platform, so that I can review diffs and re-run imports.
27. As the catalog owner, I want the skill to always run a preview before writing and only write after I've seen it, so that nothing lands in the catalog unreviewed.
28. As the catalog owner, I want the skill to split sources that list macOS and Windows side by side into one table per platform, so that platform keymaps stay distinct.
29. As the catalog owner, I want the skill to resolve app-specific notation (e.g. `mod` meaning `cmd` on macOS) explicitly and report what it resolved, so that the CLI never has to guess.
30. As the catalog owner, I want the skill to expand ranges like "⌘1 to ⌘9" into explicit entries, so that every shortcut is individually searchable and favoritable.
31. As the catalog owner, I want context notes such as "(empty composer)" or "when terminal is focused" kept as comments, so that conditional shortcuts aren't misleading.
32. As the catalog owner, I want entries that exist on only one platform reported by the skill rather than dropped silently, so that I know what was left out of each table.
33. As the catalog owner, I want readable action titles derived from command IDs (e.g. `terminal.toggle` → "Toggle terminal"), so that keybinding files import as human-friendly entries.

### Importing (CLI)

34. As the catalog owner, I want to import by giving an app name, slug, platform and Markdown file, so that one command adds an app.
35. As the catalog owner, I want the import to be a dry run by default that prints a normalized preview and all diagnostics, so that I can review before anything changes.
36. As the catalog owner, I want `--write` to commit the previewed result, so that writing is always explicit.
37. As the catalog owner, I want machine-readable output, so that the skill can read diagnostics and react.
38. As the catalog owner, I want exit codes that distinguish success, errors and usage mistakes, so that scripts and the skill can branch on them.
39. As the catalog owner, I want tables with Action and Shortcut columns (plus optional Section and Comment columns) to be recognized with common header synonyms, so that most sources work with minimal reshaping.
40. As the catalog owner, I want headings above a table to supply the section name, with a Section column overriding it and "General" as fallback, so that groups carry over.
41. As the catalog owner, I want content outside tables reported with line numbers but not imported, so that nothing is discarded silently.
42. As the catalog owner, I want every diagnostic to cite the line number in my Markdown file, so that I can fix the source directly.
43. As the catalog owner, I want row order preserved exactly, so that the catalog reads like the source.
44. As the catalog owner, I want common key and modifier spellings normalized (symbols ⌘⌥⌃⇧, Command/Option/Control/Alt/Win names, Esc, Return/Enter, arrows, F-keys, etc.), so that sources in different styles produce identical keys.
45. As the catalog owner, I want modifiers put into canonical order, so that the same shortcut is always spelled the same way.
46. As the catalog owner, I want sequential chords recognized (whitespace, "then", commas between complete combos), so that bindings like `cmd+k cmd+s` import correctly.
47. As the catalog owner, I want modifier-only tokens joined to the next token (`⇧ ⌘ /` → `shift+cmd+/`), so that space-separated doc notation isn't misread as a sequence.
48. As the catalog owner, I want uppercase letters never to imply Shift and shifted characters stored as the character itself, so that the import never invents modifiers.
49. As the catalog owner, I want alternative shortcuts for the same action kept as adjacent entries with the same title, in source order, so that no alternative is lost.
50. As the catalog owner, I want comment-only rows (no shortcut, but a comment) supported, so that mouse gestures and notes can be recorded.
51. As the catalog owner, I want ambiguous notation (`Ctrl/Cmd`, `Mod`, ambiguous `+`/`-`, a bare modifier, `Alt` in a macOS import, click/drag words) reported as errors, so that I decide rather than the tool guessing.
52. As the catalog owner, I want unsupported keys and length violations reported as errors with line numbers, so that nothing is truncated.
53. As the catalog owner, I want any error to abort the whole import with no partial write, so that the catalog is never half-updated.
54. As the catalog owner, I want the same key bound to different actions within one section reported as a warning, so that I notice likely mistakes without blocking legitimate context-dependent bindings.
55. As the catalog owner, I want exact duplicate rows collapsed with a notice citing both line numbers, so that duplicates never reach the catalog.
56. As the catalog owner, I want layout-dependent symbols listed in the preview as having no execution mapping, so that I know which shortcuts can't be executed automatically.

### Merging and overwriting

57. As the catalog owner, I want importing into an existing app to merge by default, so that re-imports and additions never duplicate entries.
58. As the catalog owner, I want rows matched by section, action and platform (ignoring case and extra whitespace), so that "Toggle Sidebar" and "Toggle sidebar" are the same entry.
59. As the catalog owner, I want a new shortcut for an existing action appended as an adjacent alternative, so that I can add personal bindings to upstream apps.
60. As the catalog owner, I want new rows appended to the end of their section in source order, so that merges are predictable.
61. As the catalog owner, I want re-running an identical import to report zero changes, so that imports are idempotent.
62. As the catalog owner, I want any change or removal of an existing shortcut reported as a conflict that aborts the import, so that merges never silently alter data.
63. As the catalog owner, I want `--overwrite` to replace the target platform keymap entirely, so that I can intentionally rebuild an app's shortcuts.
64. As the catalog owner, I want the import to target the keymap whose platforms include the import platform, creating "Default" / "Default (Windows)" when none exists, so that macOS and Windows imports land in the right place.
65. As the catalog owner, I want to be required to name the keymap with `--keymap` when several keymaps match or a keymap declares no platforms, so that ambiguity is resolved by me.
66. As the catalog owner, I want new apps created with only an app name and slug, plus optional source URL, bundle ID, hostname and icon, so that adding an app is quick.
67. As the catalog owner, I want new apps without an icon to use a default icon, so that they still render properly.
68. As the catalog owner, I want personal apps to live in the same catalog directory as upstream apps and merge into existing upstream apps by slug, so that there's one catalog.

### Safety and regeneration

69. As the catalog owner, I want the import to validate the entire catalog with the new file in place before writing, so that a valid-looking file can't break the catalog.
70. As the catalog owner, I want writes to be atomic (temp file then rename), so that an interrupted import never leaves a corrupt file.
71. As the catalog owner, I want written files formatted the same way as the repo's formatter, so that diffs are small and reviewable.
72. As the catalog owner, I want the running dev server to pick up catalog changes automatically, so that imported shortcuts appear without restarting.

### Keys and layouts

73. As the catalog owner, I want the macOS `0` key code corrected, so that `…+0` shortcuts execute `0`, not `-`.
74. As the catalog owner, I want macOS keymaps to allow only macOS modifiers and keys, and Windows keymaps only Windows modifiers and keys, so that platform mistakes are caught.
75. As the catalog owner, I want the Windows key vocabulary shared between the site, the importer and the Raycast extension, so that all three agree on what's valid.
76. As the catalog owner, I want the key table modeled per keyboard layout with German QWERTZ as primary and US ANSI kept, so that key data reflects my keyboard.
77. As the catalog owner, I want the QWERTZ table to record which physical key and which extra modifiers produce each character (e.g. `/` = Shift+7, `[` = Option+5, Z/Y swapped), so that future execution can be layout-correct.
78. As the catalog owner, I want layout-dependent symbols (`^ ´ \` < > # ß ä ö ü § °`) accepted with an explicit "no execution mapping" marker, so that I can record bindings like `cmd+^` without the tool guessing key codes.
79. As the catalog owner, I want hand-edited catalog JSON validated by the same platform- and layout-aware rules, so that the importer isn't the only safety net.

### First real imports

80. As the catalog owner, I want T3 Code imported for macOS from my local keybindings file, so that my daily tool is in the catalog.
81. As the catalog owner, I want Raycast imported for macOS and Windows from the Raycast manual, including its optional Emacs/Vim navigation bindings as their own section, so that both platforms are covered.
82. As the catalog owner, I want `cmd+^` added as an alternative "Toggle sidebar" binding in Codex's macOS keymap, so that my personal binding sits next to the upstream one.

## Implementation Decisions

### Architecture and decision records

- A new ADR records that this fork is local-only: no accounts, no cloud data, no GitHub Pages deployment, no analytics. It replaces the upstream remediation spec's auth and data requirements (that spec and the other upstream plans were removed in the repo cleanup). The ADR restates the non-auth rules this fork keeps: one shared parser, deterministic staged catalog generation, reserved slugs, filename equals slug, unique slugs/names.
- Catalog JSON files remain the source of truth. No schema change is made to the catalog shortcut shape (a single `key` per shortcut; sequences separated by whitespace; optional `comment`).

### Import operation (new deep module)

- A single import operation takes a catalog root and an import request and returns a report. It is the only code path that writes catalog files from imports; the CLI and the skill both go through it.
- Request: Markdown text plus its file name, app name, slug, platform (`macos` or `windows`), optional keymap title, optional new-app metadata (source URL, bundle ID, hostname, icon), and `write` / `overwrite` flags.
- Report: the normalized preview (target keymap, sections, entries with normalized keys and comments), diagnostics (severity error / warning / notice, source line number, code, message), a change summary (added entries, appended alternatives, unchanged, conflicts), the list of layout-dependent keys used, non-table lines not imported, and whether a write happened.
- Internally it is a pipeline: Markdown table extraction → row normalization → merge planning against the existing app → whole-catalog validation of the candidate → atomic write. These stages are internal; only the operation is the public interface.
- Markdown extraction: only GFM tables are imported. Header matching is case-insensitive with synonyms (Action/Command/Description; Shortcut/Keys/Key; Section; Comment). The section is the nearest preceding heading of any level, overridden per row by a Section column, falling back to "General". Non-table content is reported, not imported. Line numbers always refer to the source file.
- Normalization:
  - Modifier symbols (⌘⌥⌃⇧) and names (Command/Cmd, Option/Opt/Alt, Control/Ctrl/Ctl, Shift, Win/Windows/Super) map to catalog modifiers (`cmd`, `opt`, `ctrl`, `shift`, `win`; `alt` on Windows). Modifiers are emitted in the catalog's canonical order.
  - Key names normalize to the catalog vocabulary: Esc/Escape, Return/Enter/↵, Del/Delete, Backspace, PgUp/PgDn, arrow words and ←↑→↓, Space, Tab, F-keys; letters are lowercased.
  - `+` is the combo separator; `-` is accepted as a separator only when unambiguous (e.g. `Ctrl-S`). Modifier-only tokens join the following token. Whitespace, "then" or commas between complete combos form a sequence.
  - Alternatives within one cell (`or`, `/` between complete combos, `;`) become adjacent entries with the same title, in source order.
  - Uppercase letters never imply Shift; shifted characters are stored as the character; nothing is inferred.
  - Escaped Markdown characters (e.g. `\=`) are unescaped.
- Diagnostics policy:
  - Errors (abort, write nothing): ambiguous notation (`Ctrl/Cmd`, `Mod`, ambiguous `+`/`-`, bare modifier, `Alt` in a macOS import, click/drag words), unsupported key for the platform, schema length violations (titles, sections, comments, keys), unparseable rows, rows with neither shortcut nor comment, merge conflicts, and any whole-catalog validation failure.
  - Warnings (write allowed): the same key bound to different actions within one section.
  - Notices: collapsed exact duplicates (citing both lines), layout-dependent keys, non-table lines not imported.
  - There is no partial-write or "skip bad rows" mode.
- Merge rules:
  - Target keymap: the keymap whose `platforms` include the import platform. None → create "Default" (macOS) or "Default (Windows)" with explicit platforms. Several, or a keymap with no platforms in the way → error requiring `--keymap`.
  - Entry identity: section title, action title (both case-insensitive, whitespace-collapsed) and platform. No fuzzy matching. Existing titles keep their original casing.
  - Identical existing shortcut → unchanged. New shortcut for an existing action → appended adjacent alternative. New action → appended to the end of its section (new sections appended to the end of the keymap) in source order.
  - Any existing shortcut that would change or disappear → conflict error. `--overwrite` replaces the target keymap wholesale.
  - Re-running an identical import yields zero changes.
- New apps require only app name and slug; source, bundle ID, hostname and icon are optional; no icon falls back to a default icon. Windows app identifiers are not set by import.
- Safe write: the candidate app file is validated together with the rest of the catalog using the same validation the catalog generator uses; only then is it written to a temp file and renamed over the target. Output is formatted identically to the repo's formatter.

### Import CLI

- A thin wrapper run as an npm script in the site package: parses flags (`--app`, `--slug`, `--platform`, `--file`, `--keymap`, `--source`, `--bundle-id`, `--hostname`, `--icon`, `--write`, `--overwrite`, `--json`), calls the import operation, prints a human-readable preview or JSON.
- Exit codes: 0 = success (possibly with warnings/notices), 1 = errors (nothing written), 2 = usage error.

### Import skill

- Lives in the repository as a project skill and is referenced from the agent instructions.
- Converts any source into the canonical Markdown table (Section?, Action, Shortcut, Comment?) per platform, saves it as a committed source record per app and platform in a top-level shortcut-sources directory, runs the CLI preview, resolves or reports errors, and runs the write only after the preview has been shown.
- Source-specific resolutions are the skill's job and are reported: platform-paired notation (`mac / win`), `mod` → platform primary modifier, range expansion, context notes → comments, single-platform entries omitted from the other platform's table, command-ID → readable title, `when` conditions → comments.
- The Markdown record is an input record only; the catalog JSON stays the source of truth.

### Keys and layouts

- The macOS `0` key code is corrected to 29.
- Key validation becomes platform-aware: macOS keymaps allow `ctrl`, `shift`, `opt`/`alt`, `cmd` and macOS base keys; Windows keymaps allow `ctrl`, `shift`, `alt`, `win` and Windows base keys, never `cmd`/`opt`. Linux keymaps keep current behavior.
- The Windows key vocabulary moves into the shared shortcuts core (synced into consumers by the existing sync script) and is used by the site validator, the importer and the Raycast extension.
- The key table becomes per-layout. German QWERTZ (macOS) is primary; US ANSI is retained. Catalog keys store the printed character; the per-layout table records, per character, the physical key code and any extra modifiers needed to type it on that layout.
- Layout-dependent symbols (`^ ´ \` < > # ß ä ö ü § °`) are valid keys whose execution mapping is explicitly null and marked layout-dependent. No key code is guessed.
- Display continues to use the existing modifier symbol rendering; layout-dependent keys display as their character.
- Raycast's macOS execution keeps using its current table; layout-correct execution is deferred.

### Local storage

- Favorites are stored in browser local storage under a versioned key (`hotkys:favorites:v1`), identified by the existing frozen base shortcut identity, so they survive merges that keep the shortcut. Favorites that no longer resolve are shown as missing.
- Preferences (platform filter, view mode, column count) are stored locally and saved where they are changed; there is no separate settings page. Default platform is macOS.
- No migration of cloud data.

### Removals

- Site: Clerk and Supabase dependencies, auth and account-data providers, services and hooks that exist only for accounts, account routes (auth, profile, settings, My Shortcuts), the cloud editor and export dialog, Google Analytics, the database schema/migrations/RLS tests, the database mode of the config check and Clerk/Supabase environment variables, CI database jobs.
- The catalog compatibility fingerprint check, its decisions file, the GitHub Pages deploy workflow and the upstream contribution docs/templates were already removed in the repo cleanup.
- The root catalog verification script that depends on the removed export service is rewritten without it or deleted.
- The Raycast extension source is not changed beyond consuming the shared Windows key vocabulary; it must still compile.

### Add-shortcuts page

- A static page linked from the header explains the skill, the CLI, the Markdown table format, `--write` / `--overwrite`, and hand-editing catalog JSON. Its content mirrors a repo document on importing that the skill also references.

## Testing Decisions

- Good tests exercise external behavior through the highest available seam: given inputs (Markdown text, catalog files, stored data), assert on outputs (reports, written files, rendered UI, stored data). They do not assert on internal stages, helper functions or data structures, so the pipeline can be restructured freely.
- Development is test-first (red-green-refactor) for the import operation and the key/layout validation.
- Seam 1 — the import operation (new, primary seam). Tests create a temporary catalog root (copying the real schema and key tables), seed app files as needed, call the import operation with Markdown fixtures, and assert on the report and on the files on disk. Coverage includes every rule in the normalization, diagnostics and merge sections: header synonyms, heading/Section-column grouping, line-numbered diagnostics, each ambiguous-notation error, unsupported keys per platform, length violations without truncation, alternatives, sequences, modifier-only token joining, case/shift rules, comment-only rows, duplicate collapsing, same-section key warnings, merge into an existing app (append, alternative, idempotent re-run), conflicts aborting with files byte-identical, `--overwrite`, keymap targeting including multi-platform keymaps and the `--keymap` requirement, new-app creation and default icon, dry run writing nothing, whole-catalog validation failures leaving files untouched, and formatter-identical output.
- The CLI gets one or two smoke tests (flag parsing, exit codes, JSON output) on top of seam 1.
- Seam 2 — catalog validation (existing seam). Tests seed temp catalogs and assert validation passes or fails: macOS `0` maps to 29 (regression), platform-specific modifier and key rules, the shared Windows vocabulary, QWERTZ and US layout tables, layout-dependent symbols accepted with null execution mapping.
- Seam 3 — favorites and preferences (existing hook/provider seam). Tests run against local storage with no auth provider: add/remove favorites, persistence across remounts, survival across a catalog change that keeps the shortcut, missing-favorite display, preference persistence and macOS default.
- Prior art: the catalog pipeline spec (temp-root catalogs, deterministic output, "previous generation preserved after invalid input"), the validator and schema-validation specs, the input-parser spec, and the existing favorites and platform-filter hook specs. Shared core fixtures already exist for parser and identity behavior.
- Account-only tests are deleted together with the code they cover; removals are verified by the full test suite, type checking, lint, catalog validation and the site build all passing.
- Manual verification: run the three real imports (T3 Code macOS, Raycast macOS + Windows, Codex `cmd+^`), restart the dev server and confirm the entries and favorites persist, and browse macOS and Windows keymaps in the browser.

## Out of Scope

- Browser-based import or editing of shortcuts.
- Self-hosted or any other deployment; the site runs locally.
- Raycast extension changes beyond consuming the shared Windows key vocabulary: configurable catalog origin, removing its Clerk/Supabase dependencies, and layout-correct (QWERTZ) key execution all belong to the later Raycast iteration. Until then, Raycast macOS execution on a German layout can press the wrong key for layout-sensitive characters.
- Migration of any existing cloud favorites, preferences or custom apps.
- Fuzzy matching of actions across imports.
- A schema change for multiple keys per shortcut.
- Windows app identifiers on imported apps.
- New Linux functionality.
- Markdown bullet-list parsing in the CLI (the skill converts lists to tables).

## Further Notes

- Source facts for the first imports:
  - T3 Code: the local keybindings file has 72 entries in a VS Code-like format (`key`, `command`, optional `when`) using `mod`; it includes `mod+0`, which exercises the key-code fix.
  - Raycast: the manual is bullet lists with macOS and Windows paired per line (`⌘ W / Ctrl W`), space-separated combos, ranges, parenthetical context notes, single-platform entries and escaped characters; it ends with Emacs/Vim alternative navigation bindings, imported as their own section with a comment.
  - Codex: existing app with a "macOS" keymap and a "Windows and Linux" keymap; macOS General already has "Toggle sidebar" bound to `cmd+b`. `cmd+^` is appended as an alternative and flagged as layout-dependent.
- Pulling from upstream later may produce merge conflicts in catalog files that were merged into personally; these are resolved by hand.
- Pushes go to `origin` only; `upstream` is read-only.
