import fs from "node:fs";
import path from "node:path";
import { extractTables } from "./markdown-table";
import { planMerge } from "./merge";
import { planNewApp } from "./plan";
import { validateCandidate, writeAppFile } from "./publish";
import type { InputApp } from "../model/input/input-models";
import type { Diagnostic, ImportReport, ImportRequest } from "./types";

export type * from "./types";

const SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;

function checkRequest(request: ImportRequest): Diagnostic[] {
  const problems: string[] = [];
  if (!request.app?.trim()) problems.push("App name is required.");
  if (!request.slug || request.slug.length > 80 || !SLUG_PATTERN.test(request.slug)) problems.push(`Slug "${request.slug}" must be letters, digits and single hyphens (max 80 characters).`);
  if (request.platform !== "macos" && request.platform !== "windows") problems.push(`Platform "${request.platform}" must be macos or windows.`);
  return problems.map(message => ({ severity: "error", code: "invalid-request", message }));
}

/**
 * The single public operation of the import module. Parses the Markdown, plans the candidate app,
 * validates the whole catalog with the candidate in place and, only when `request.write` is set and
 * there are no errors, atomically writes `<catalogRoot>/shortcuts-data/<slug>.json`.
 * Never throws for bad input: problems come back as error diagnostics and nothing is written.
 */
export function importShortcuts(catalogRoot: string, request: ImportRequest): ImportReport {
  const report: ImportReport = {
    ok: false,
    wrote: false,
    app: { name: request.app, slug: request.slug, created: true },
    preview: null,
    diagnostics: checkRequest(request),
    changes: { added: 0, alternatives: 0, unchanged: 0, conflicts: 0 },
    layoutDependentKeys: [],
    nonTableLines: [],
  };
  const finish = () => {
    report.ok = !report.diagnostics.some(diagnostic => diagnostic.severity === "error");
    return report;
  };
  if (report.diagnostics.length) return finish();

  const tables = extractTables(request.markdown);
  report.nonTableLines = tables.nonTableLines;
  report.diagnostics.push(...tables.diagnostics);
  report.nonTableLines.forEach(({ line }) => report.diagnostics.push({ severity: "notice", code: "non-table-line", line, message: "Line is not part of a table and was not imported." }));

  const appFile = path.join(catalogRoot, "shortcuts-data", `${request.slug}.json`);
  let existing: InputApp | null = null;
  if (fs.existsSync(appFile)) {
    report.app.created = false;
    try {
      existing = JSON.parse(fs.readFileSync(appFile, "utf8")) as InputApp;
    } catch (error) {
      report.diagnostics.push({ severity: "error", code: "app-unreadable", message: `Cannot read existing app "${request.slug}": ${error instanceof Error ? error.message : String(error)}` });
      return finish();
    }
    report.app.name = existing.name;
    const ignored = ([["source", "--source"], ["bundleId", "--bundle-id"], ["hostname", "--hostname"], ["icon", "--icon"]] as const).filter(([field]) => request[field]).map(([, flag]) => flag);
    if (ignored.length) report.diagnostics.push({ severity: "notice", code: "metadata-ignored", message: `${ignored.join(", ")} only apply to new apps and were ignored for the existing app "${request.slug}".` });
  }
  if (!tables.rows.length) return finish();

  const imported = planNewApp(request, tables.rows);
  const plan = existing && !imported.diagnostics.some(diagnostic => diagnostic.severity === "error") ? planMerge(existing, request, imported) : imported;
  report.diagnostics.push(...plan.diagnostics);
  report.preview = plan.preview;
  report.changes = plan.changes;
  if (report.diagnostics.some(diagnostic => diagnostic.severity === "error")) return finish();
  if (existing && "changed" in plan && !plan.changed) {
    report.diagnostics.push({ severity: "notice", code: "no-changes", message: "The app already contains everything in the import; nothing to write." });
    return finish();
  }

  const invalid = validateCandidate(catalogRoot, plan.app);
  if (invalid) {
    report.diagnostics.push({ severity: "error", code: "catalog-validation", message: invalid });
    return finish();
  }
  if (request.write) {
    writeAppFile(catalogRoot, plan.app);
    report.wrote = true;
  }
  return finish();
}
