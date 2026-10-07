# 02: Import tracer bullet — new app from a simple Markdown table

**What to build:** The import operation and its CLI (`npm run import`), working end to end for the simplest case: create a new app from one Markdown table with Action and Shortcut columns whose keys are already written in catalog notation. By default the run is a dry run that prints a preview and writes nothing. `--write` writes `<slug>.json`, but only after validating the whole catalog with the new file in place, and only atomically (temp file, then rename), in prettify formatting. `--json` emits the report. The exit codes are 0 (success), 1 (errors, nothing written) and 2 (usage error). This ticket fixes the request/report shape that tickets 06, 07 and 10 extend.

See spec: Import operation; Import CLI; Testing Decisions, seam 1.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The import operation takes a catalog root and a request (Markdown text and file name, app, slug, platform, optional keymap, optional source / bundle ID / hostname / icon, write / overwrite flags) and returns a report (preview, diagnostics with line numbers, change summary, layout-dependent keys, non-table lines, whether it wrote)
- [ ] A dry run leaves the catalog byte-identical; `--write` creates the app file with a "Default" (macOS) or "Default (Windows)" keymap that has explicit platforms
- [ ] A new app without `--icon` gets no icon field and renders with the existing letter fallback
- [ ] If whole-catalog validation fails (e.g. an invalid key, a duplicate name or a reserved slug), nothing is written, and the report carries the error
- [ ] Written output is identical to what the repo formatter produces
- [ ] Tests run against a temporary catalog root, following the existing catalog-pipeline spec as a model; CLI smoke tests cover flag parsing, the exit codes and the JSON output
- [ ] Importing into an existing slug is rejected with a clear error until ticket 07 lands
