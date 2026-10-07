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

const isDelimiterRow = (line: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);
const isTableLine = (line: string) => line.includes("|");

function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "\\" && trimmed[i + 1] === "|") { current += "|"; i++; }
    else if (trimmed[i] === "|") { cells.push(current.trim()); current = ""; }
    else current += trimmed[i];
  }
  cells.push(current.trim());
  return cells;
}

function mapColumns(header: string[]): Partial<Record<Column, number>> {
  const columns: Partial<Record<Column, number>> = {};
  header.forEach((cell, index) => {
    const name = cell.toLowerCase();
    for (const column of Object.keys(HEADER_SYNONYMS) as Column[]) {
      if (columns[column] === undefined && (HEADER_SYNONYMS[column] as readonly string[]).includes(name)) { columns[column] = index; return; }
    }
  });
  return columns;
}

/** Finds GFM tables in the Markdown. Everything that is not a table or a heading is reported, not imported. */
export function extractTables(markdown: string): ExtractedTables {
  const lines = markdown.split(/\r?\n/);
  const result: ExtractedTables = { rows: [], nonTableLines: [], diagnostics: [] };
  let heading = DEFAULT_SECTION;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const lineNumber = i + 1;
    if (!text.trim()) continue;
    const headingMatch = /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(text);
    if (headingMatch) { heading = headingMatch[1].trim() || DEFAULT_SECTION; continue; }
    if (isTableLine(text) && i + 1 < lines.length && isDelimiterRow(lines[i + 1])) {
      const columns = mapColumns(splitCells(text));
      const recognized = columns.action !== undefined && columns.shortcut !== undefined;
      if (!recognized) {
        result.diagnostics.push({ severity: "error", code: "unrecognized-table", line: lineNumber, message: "Table needs an Action column (Action, Command or Description) and a Shortcut column (Shortcut, Keys or Key)." });
      }
      i += 2;
      for (; i < lines.length && lines[i].trim() && isTableLine(lines[i]); i++) {
        if (!recognized) continue;
        const cells = splitCells(lines[i]);
        const cell = (column: Column) => (columns[column] === undefined ? "" : (cells[columns[column] as number] ?? ""));
        result.rows.push({ line: i + 1, section: cell("section") || heading, action: cell("action"), shortcut: cell("shortcut"), comment: cell("comment") });
      }
      i--;
      continue;
    }
    result.nonTableLines.push({ line: lineNumber, text: text.trim() });
  }
  if (!result.rows.length && !result.diagnostics.length) {
    result.diagnostics.push({ severity: "error", code: "no-table", message: "No Markdown table with Action and Shortcut columns found." });
  }
  return result;
}
