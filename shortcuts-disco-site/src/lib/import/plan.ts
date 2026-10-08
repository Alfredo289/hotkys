import { normalizeShortcutKey } from "../shortcut-key-format";
import { isLayoutDependentKey } from "@/lib/shortcut-core/keyboard-layouts";
import { splitChord } from "@/lib/shortcut-core/parser";
import { CATALOG_LIMITS } from "../validation/catalog-content";
import type {
  InputApp,
  InputKeymap,
  InputSection,
} from "../model/input/input-models";
import { parseShortcutCell } from "./key-notation";
import { defaultKeymapTitle, fold } from "./naming";
import type { TableRow } from "./markdown-table";
import type {
  ChangeSummary,
  Diagnostic,
  ImportPreview,
  ImportRequest,
  LayoutDependentKey,
} from "./types";

export const CATALOG_SCHEMA = "https://hotkys.com/schema/shortcut.schema.json";

export interface Plan {
  /** The complete candidate app file, ready to validate and write. */
  app: InputApp;
  preview: ImportPreview;
  changes: ChangeSummary;
  diagnostics: Diagnostic[];
  /** Keys in the import that have no execution mapping (macOS layout-dependent symbols). */
  layoutDependentKeys: LayoutDependentKey[];
  /** False when applying the plan would leave the app file as it is; nothing should be written then. */
  changed: boolean;
}

/** The layout-dependent symbol a normalized key uses, if any. */
function layoutDependentSymbol(key: string): string | undefined {
  return key
    .split(" ")
    .map((chord) => splitChord(chord).pop() as string)
    .find(isLayoutDependentKey);
}

/**
 * Turns Markdown rows into the candidate app: normalizes every Shortcut cell, reports what it cannot
 * decide (errors), what looks wrong (warnings) and what it changed or noticed (notices), then groups
 * the entries into sections in source order. `checkKey` is the platform's key vocabulary check.
 */
export function planNewApp(
  request: ImportRequest,
  rows: TableRow[],
  checkKey: (key: string) => string | null = () => null,
): Plan {
  const diagnostics: Diagnostic[] = [];
  const sections: InputSection[] = [];
  const previewSections: ImportPreview["sections"] = [];
  const layoutDependentKeys: LayoutDependentKey[] = [];
  const seen = new Map<string, number>(); // exact duplicate detection: row identity -> first line
  const keyOwners = new Map<
    string,
    { action: string; title: string; line: number }
  >(); // section + key -> first binding
  const longSections = new Set<string>();
  let added = 0;

  const report = (
    severity: Diagnostic["severity"],
    code: string,
    line: number,
    message: string,
  ) => diagnostics.push({ severity, code, line, message });
  const tooLong = (line: number, what: string, text: string, limit: number) => {
    report(
      "error",
      "too-long",
      line,
      `${what} is ${text.length} characters; the limit is ${limit}. Nothing is truncated, so shorten it in the source.`,
    );
  };

  for (const row of rows) {
    const cellText = row.shortcut.trim();
    if (!cellText && !row.comment) {
      report(
        "error",
        "empty-row",
        row.line,
        `Row "${row.action || "(no action)"}" has neither a shortcut nor a comment.`,
      );
      continue;
    }
    if (!row.action) {
      report("error", "missing-action", row.line, "Row has no action title.");
      continue;
    }

    let valid = true;
    if (row.action.length > CATALOG_LIMITS.shortcutTitle) {
      tooLong(
        row.line,
        `Action title "${row.action}"`,
        row.action,
        CATALOG_LIMITS.shortcutTitle,
      );
      valid = false;
    }
    if (row.comment.length > CATALOG_LIMITS.shortcutComment) {
      tooLong(
        row.line,
        `Comment "${row.comment}"`,
        row.comment,
        CATALOG_LIMITS.shortcutComment,
      );
      valid = false;
    }
    if (row.section.length > CATALOG_LIMITS.sectionTitle) {
      if (!longSections.has(row.section))
        tooLong(
          row.line,
          `Section title "${row.section}"`,
          row.section,
          CATALOG_LIMITS.sectionTitle,
        );
      longSections.add(row.section);
      valid = false;
    }

    let rowKeys: (string | undefined)[] = [undefined];
    if (cellText) {
      const parsed = parseShortcutCell(cellText, request.platform);
      if (parsed.problems.length) {
        parsed.problems.forEach((problem) =>
          report("error", problem.code, row.line, problem.message),
        );
        valid = false;
      } else {
        rowKeys = [];
        for (const alternative of parsed.alternatives) {
          const key = normalizeShortcutKey(alternative);
          if (key.length > CATALOG_LIMITS.shortcutKey) {
            tooLong(
              row.line,
              `Shortcut "${key}"`,
              key,
              CATALOG_LIMITS.shortcutKey,
            );
            valid = false;
            continue;
          }
          const unsupported = checkKey(key);
          if (unsupported) {
            report(
              "error",
              "unsupported-key",
              row.line,
              `"${key}" (from "${cellText}") is not supported on ${request.platform}: ${unsupported}`,
            );
            valid = false;
            continue;
          }
          rowKeys.push(key);
        }
      }
    }
    if (!valid) continue;

    let section = sections.find((candidate) => candidate.title === row.section);
    let previewSection = previewSections.find(
      (candidate) => candidate.title === row.section,
    );
    if (!section || !previewSection) {
      section = { title: row.section, shortcuts: [] };
      previewSection = { title: row.section, entries: [] };
      sections.push(section);
      previewSections.push(previewSection);
    }
    for (const key of rowKeys) {
      const identity = [
        fold(row.section),
        fold(row.action),
        key ?? "",
        row.comment,
      ].join("\u0000");
      const first = seen.get(identity);
      if (first !== undefined) {
        report(
          "notice",
          "duplicate-row",
          row.line,
          first === row.line
            ? `"${row.action}" ${key ?? "(comment)"} is listed twice on line ${row.line}; collapsed into one entry.`
            : `"${row.action}" ${key ?? "(comment)"} duplicates line ${first}; collapsed into one entry (kept line ${first}).`,
        );
        continue;
      }
      seen.set(identity, row.line);

      if (key) {
        const ownerId = `${fold(row.section)}\u0000${key}`;
        const owner = keyOwners.get(ownerId);
        if (!owner)
          keyOwners.set(ownerId, {
            action: fold(row.action),
            title: row.action,
            line: row.line,
          });
        else if (owner.action !== fold(row.action)) {
          report(
            "warning",
            "same-key-different-action",
            row.line,
            `${key} is bound to "${row.action}" here and to "${owner.title}" on line ${owner.line} in section "${row.section}".`,
          );
        }
        const symbol =
          request.platform === "macos" ? layoutDependentSymbol(key) : undefined;
        if (symbol) {
          layoutDependentKeys.push({ key, line: row.line });
          report(
            "notice",
            "layout-dependent-key",
            row.line,
            `${key} uses the layout-dependent key ${symbol}: it is kept, but has no execution mapping.`,
          );
        }
      }
      const shortcut = {
        title: row.action,
        ...(key ? { key } : {}),
        ...(row.comment ? { comment: row.comment } : {}),
      };
      section.shortcuts.push(shortcut);
      previewSection.entries.push({ ...shortcut, line: row.line });
      added++;
    }
  }
  const keymap: InputKeymap = {
    title: request.keymap ?? defaultKeymapTitle(request.platform),
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
    preview: {
      keymap: keymap.title,
      platforms: [request.platform],
      sections: previewSections,
    },
    changes: { added, alternatives: 0, unchanged: 0, conflicts: 0 },
    changed: true,
    diagnostics,
    layoutDependentKeys,
  };
}
