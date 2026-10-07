# 08: Import skill, importing guide and Add-shortcuts page

**What to build:** The human- and agent-facing side of importing.
- **The skill:** a repo project skill, referenced from the agent instructions, that converts any source (URL, PDF, pasted text, screenshot, keybinding file) into the canonical Markdown table, one per platform. It saves each table as a committed source record in a top-level `shortcut-sources/` directory, as `<slug>.<platform>.md`. It runs the CLI preview, resolves or reports errors, and only runs `--write` after the preview has been shown.
- **What the skill resolves, and reports what it resolved:** platform-paired notation, `mod` → the platform's primary modifier, range expansion, context notes → comments, single-platform entries left out of the other table, command IDs → readable titles, and `when` conditions → comments.
- **The guide:** a repo document on importing (the skill, the CLI flags, the table format, `--write` / `--overwrite`, hand-editing JSON).
- **The page:** a static `/add-shortcuts` page, linked from the header, that presents the same content.

See spec: Import skill; Add-shortcuts page; user stories 22–33.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The skill follows the repo's skill conventions and uses the CLI as specified in the spec (flags and behavior from tickets 06, 07 and 10 may not have landed yet; document the spec'd interface)
- [ ] The importing guide and the `/add-shortcuts` page agree with each other; the page is linked from the header and builds in the static export
- [ ] The agent instructions reference the skill
- [ ] Site tests, type check, lint and build pass
