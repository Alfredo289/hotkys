import type { Diagnostic, NonTableLine } from "./types";

/** One data row of a recognized table, before key normalization. */
export interface TableRow {
  line: number;
  section: string;
  action: string;
  shortcut: string;
  comment: string;
}

export interface ExtractedTables {
  rows: TableRow[];
  nonTableLines: NonTableLine[];
  diagnostics: Diagnostic[];
}

export const DEFAULT_SECTION = "General";

const HEADER_SYNONYMS = {
  action: ["action", "command", "description"],
  shortcut: ["shortcut", "keys", "key"],
  section: ["section"],
  comment: ["comment"],
} as const;
type Column = keyof typeof HEADER_SYNONYMS;

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ATX_HEADING = /^ {0,3}#{1,6}(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const SETEXT_UNDERLINE = /^ {0,3}(?:=+|-+)\s*$/;

const isDelimiterRow = (line: string) =>
  /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);
const isTableLine = (line: string) => line.includes("|");

function splitCells(line: string): string[] {
  const trimmed = line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "\\" && trimmed[i + 1] === "|") {
      current += "|";
      i++;
    } else if (trimmed[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else current += trimmed[i];
  }
  cells.push(current.trim());
  return cells;
}

/** Header cells are matched ignoring case, surrounding whitespace and emphasis/code markers. */
const headerName = (cell: string) =>
  cell.replace(/[*_`]/g, "").trim().toLowerCase();

function mapColumns(header: string[]): {
  columns: Partial<Record<Column, number>>;
  ignored: string[];
} {
  const columns: Partial<Record<Column, number>> = {};
  const ignored: string[] = [];
  header.forEach((cell, index) => {
    const name = headerName(cell);
    const match = (Object.keys(HEADER_SYNONYMS) as Column[]).find(
      (column) =>
        columns[column] === undefined &&
        (HEADER_SYNONYMS[column] as readonly string[]).includes(name),
    );
    if (match) columns[match] = index;
    else ignored.push(cell);
  });
  return { columns, ignored };
}

/**
 * Finds GFM tables in the Markdown. Headings only set the section; fenced code, prose, lists and anything
 * else that is not part of a table is reported as not imported.
 */
export function extractTables(markdown: string): ExtractedTables {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const result: ExtractedTables = {
    rows: [],
    nonTableLines: [],
    diagnostics: [],
  };
  let heading = DEFAULT_SECTION;
  let fence: string | null = null;
  const skipped = (i: number) =>
    result.nonTableLines.push({ line: i + 1, text: lines[i].trim() });
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const lineNumber = i + 1;
    if (fence) {
      skipped(i);
      const closing = FENCE.exec(text);
      if (
        closing &&
        closing[1][0] === fence[0] &&
        closing[1].length >= fence.length &&
        !text.trim().slice(closing[1].length).trim()
      )
        fence = null;
      continue;
    }
    if (!text.trim()) continue;
    const opening = FENCE.exec(text);
    if (opening) {
      fence = opening[1];
      skipped(i);
      continue;
    }
    const atx = ATX_HEADING.exec(text);
    if (atx) {
      heading = atx[1]?.trim() || DEFAULT_SECTION;
      continue;
    }
    if (
      isTableLine(text) &&
      i + 1 < lines.length &&
      isDelimiterRow(lines[i + 1]) &&
      splitCells(text).length === splitCells(lines[i + 1]).length
    ) {
      const headerCells = splitCells(text);
      const { columns, ignored } = mapColumns(headerCells);
      const recognized =
        columns.action !== undefined && columns.shortcut !== undefined;
      if (!recognized) {
        result.diagnostics.push({
          severity: "error",
          code: "unrecognized-table",
          line: lineNumber,
          message:
            "Table needs an Action column (Action, Command or Description) and a Shortcut column (Shortcut, Keys or Key).",
        });
      } else {
        for (const name of ignored) {
          result.diagnostics.push({
            severity: "notice",
            code: "ignored-column",
            line: lineNumber,
            message: `Column "${name}" is not recognized and was not imported.`,
          });
        }
      }
      i += 2;
      for (
        ;
        i < lines.length &&
        lines[i].trim() &&
        isTableLine(lines[i]) &&
        !ATX_HEADING.test(lines[i]) &&
        !FENCE.test(lines[i]);
        i++
      ) {
        if (!recognized) continue;
        const cells = splitCells(lines[i]);
        if (cells.length > headerCells.length) {
          result.diagnostics.push({
            severity: "error",
            code: "extra-cells",
            line: i + 1,
            message: `Row has ${cells.length} cells but the table has ${headerCells.length} columns; escape a literal | as \\|.`,
          });
          continue;
        }
        const cell = (column: Column) =>
          columns[column] === undefined
            ? ""
            : (cells[columns[column] as number] ?? "");
        result.rows.push({
          line: i + 1,
          section: cell("section") || heading,
          action: cell("action"),
          shortcut: cell("shortcut"),
          comment: cell("comment"),
        });
      }
      i--;
      continue;
    }
    const nextIsUnderline =
      i + 1 < lines.length && SETEXT_UNDERLINE.test(lines[i + 1]);
    if (
      nextIsUnderline &&
      !isTableLine(text) &&
      (i === 0 || !lines[i - 1].trim())
    ) {
      heading = text.trim();
      i++;
      continue;
    }
    skipped(i);
  }
  if (!result.rows.length && !result.diagnostics.length) {
    result.diagnostics.push({
      severity: "error",
      code: "no-table",
      message: "No Markdown table with Action and Shortcut columns found.",
    });
  }
  return result;
}
