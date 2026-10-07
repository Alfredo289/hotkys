import { normalizeShortcutKey } from "../shortcut-key-format";
import type { InputApp, InputKeymap, InputSection } from "../model/input/input-models";
import type { TableRow } from "./markdown-table";
import type { ChangeSummary, Diagnostic, ImportPreview, ImportRequest } from "./types";

export const CATALOG_SCHEMA = "https://hotkys.com/schema/shortcut.schema.json";

export interface Plan {
  /** The complete candidate app file, ready to validate and write. */
  app: InputApp;
  preview: ImportPreview;
  changes: ChangeSummary;
  diagnostics: Diagnostic[];
}

/**
 * Turns normalized rows into the candidate app. Today this only creates new apps;
 * ticket 07 adds merge planning against an existing app here.
 */
export function planNewApp(request: ImportRequest, rows: TableRow[]): Plan {
  const diagnostics: Diagnostic[] = [];
  const sections: InputSection[] = [];
  const previewSections: ImportPreview["sections"] = [];
  let added = 0;
  for (const row of rows) {
    const key = row.shortcut ? normalizeShortcutKey(row.shortcut) : undefined;
    if (!key && !row.comment) {
      diagnostics.push({ severity: "error", code: "empty-row", line: row.line, message: `Row "${row.action || "(no action)"}" has neither a shortcut nor a comment.` });
      continue;
    }
    if (!row.action) {
      diagnostics.push({ severity: "error", code: "missing-action", line: row.line, message: "Row has no action title." });
      continue;
    }
    let section = sections.find(candidate => candidate.title === row.section);
    let previewSection = previewSections.find(candidate => candidate.title === row.section);
    if (!section || !previewSection) {
      section = { title: row.section, shortcuts: [] };
      previewSection = { title: row.section, entries: [] };
      sections.push(section);
      previewSections.push(previewSection);
    }
    section.shortcuts.push({ title: row.action, ...(key ? { key } : {}), ...(row.comment ? { comment: row.comment } : {}) });
    previewSection.entries.push({ title: row.action, ...(key ? { key } : {}), ...(row.comment ? { comment: row.comment } : {}), line: row.line });
    added++;
  }
  const keymap: InputKeymap = {
    title: request.keymap ?? (request.platform === "windows" ? "Default (Windows)" : "Default"),
    platforms: [request.platform],
    sections,
  };
  const app: InputApp = {
    $schema: CATALOG_SCHEMA,
    ...(request.bundleId ? { bundleId: request.bundleId } : {}),
    ...(request.hostname ? { hostname: request.hostname } : {}),
    name: request.app,
    slug: request.slug,
    ...(request.source ? { source: request.source } : {}),
    ...(request.icon ? { icon: request.icon } : {}),
    keymaps: [keymap],
  };
  return {
    app,
    preview: { keymap: keymap.title, platforms: [request.platform], sections: previewSections },
    changes: { added, alternatives: 0, unchanged: 0, conflicts: 0 },
    diagnostics,
  };
}
