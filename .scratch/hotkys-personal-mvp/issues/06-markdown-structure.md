# 06: Markdown structure — sections, columns, line numbers

**What to build:** The importer understands real Markdown documents:
- **Tables:** only GFM tables are imported, and header matching is case-insensitive with synonyms (Action/Command/Description; Shortcut/Keys/Key; Section; Comment).
- **Sections:** a table's section is the nearest preceding heading of any level; a Section column overrides it per row; "General" is the fallback.
- **Comments:** the optional Comment column maps to the shortcut comment. A row with a comment but no shortcut becomes a comment-only entry, and a row with neither is an error.
- **Nothing dropped silently:** non-table content is reported as "not imported" with line numbers. Row order is preserved exactly, and every diagnostic cites the source-file line number.

See spec: Import operation → Markdown extraction; user stories 39–43, 50.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Multiple tables under different headings import into the matching sections, in source order
- [ ] A Section column overrides the heading; with no heading and no column, the section is "General"
- [ ] Header synonyms and case variations are recognized
- [ ] Comment-only rows import; an empty row (no shortcut, no comment) is an error with its line number
- [ ] Non-table lines are listed in the report with line numbers
- [ ] Tests go through the import operation using Markdown fixtures
