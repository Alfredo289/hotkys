# 07: Merge into existing apps

**What to build:** Importing into an app that already exists merges instead of duplicating.
- **Target keymap:** the keymap whose platforms include the import platform. If none matches, the importer creates the default keymap. If several match, or a keymap declares no platforms, it is an error until `--keymap` names the target.
- **Identity:** an entry is identified by section + action title (case-insensitive, whitespace-collapsed) + platform, with no fuzzy matching; existing titles keep their casing.
- **Changes:** an identical shortcut is unchanged. A new shortcut for an existing action is appended as an adjacent alternative. A new action goes to the end of its section, and a new section to the end of the keymap, in source order. Re-running the same import reports zero changes.
- **Conflicts:** any existing shortcut that would change or disappear is a conflict; the import aborts and the file stays byte-identical. `--overwrite` replaces the target keymap wholesale.

See spec: Import operation → Merge rules; user stories 57–68.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Merging a macOS import into an app that has only a Windows keymap creates "Default"; merging into a `["windows","linux"]` keymap works for a Windows import
- [ ] Ambiguous targets, and keymaps without platforms, require `--keymap`
- [ ] Alternatives are appended next to the existing entry; e.g. "Toggle Sidebar" `cmd+^` lands next to Codex-style "Toggle sidebar" `cmd+b` (use a fixture app, not the real catalog)
- [ ] Re-running an identical import reports zero changes and writes nothing new
- [ ] Conflicts abort with a byte-identical file; `--overwrite` replaces only the target keymap
- [ ] The change summary reports added entries, appended alternatives, unchanged entries and conflicts
- [ ] Tests go through the import operation against a temporary catalog
