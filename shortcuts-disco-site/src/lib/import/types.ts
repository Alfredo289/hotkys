import type { Platform } from "../model/internal/internal-models";

/** Platforms an import can target. Linux keymaps are not importable. */
export type ImportPlatform = Extract<Platform, "macos" | "windows">;

/**
 * Everything the import operation needs. Tickets 06 (Markdown extraction), 07 (merge / overwrite)
 * and 10 (normalization) extend this shape; add new optional fields rather than changing existing ones.
 */
export interface ImportRequest {
  /** Markdown source text. */
  markdown: string;
  /** Name of the Markdown file, for display only. Line numbers always refer to this file. */
  fileName: string;
  app: string;
  slug: string;
  platform: ImportPlatform;
  /** Title of the keymap to target. */
  keymap?: string;
  /** New-app metadata, ignored when the app already exists. */
  source?: string;
  bundleId?: string;
  hostname?: string;
  icon?: string;
  /** Write the result. Default: dry run. */
  write?: boolean;
  /** Replace the target keymap wholesale instead of merging into it. */
  overwrite?: boolean;
}

export type DiagnosticSeverity = "error" | "warning" | "notice";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** Stable machine-readable identifier, e.g. `empty-row`, `catalog-validation`. */
  code: string;
  message: string;
  /** 1-based line in the Markdown source. Absent for catalog-level problems. */
  line?: number;
}

export interface PreviewEntry {
  title: string;
  key?: string;
  comment?: string;
  /** 1-based source line the entry came from. */
  line: number;
  /** What merging does with this entry. Only set when importing into an existing app. */
  status?: EntryStatus;
}

export type EntryStatus = "added" | "alternative" | "unchanged" | "conflict";

export interface PreviewSection {
  title: string;
  entries: PreviewEntry[];
}

export interface ImportPreview {
  keymap: string;
  /** Platforms of the target keymap; may include linux (or be empty) when merging into an existing keymap. */
  platforms: Platform[];
  sections: PreviewSection[];
}

export interface ChangeSummary {
  added: number;
  /** New shortcuts appended as adjacent alternatives of an existing action (ticket 07). */
  alternatives: number;
  unchanged: number;
  conflicts: number;
}

export interface LayoutDependentKey {
  key: string;
  line: number;
}

export interface NonTableLine {
  line: number;
  text: string;
}

export interface ImportReport {
  /** True when there are no error diagnostics. */
  ok: boolean;
  /** True only if the catalog file was actually written. */
  wrote: boolean;
  app: { name: string; slug: string; /** False when the slug already exists in the catalog. */ created: boolean };
  /** Null when no preview could be built (e.g. the Markdown had no importable table). */
  preview: ImportPreview | null;
  diagnostics: Diagnostic[];
  changes: ChangeSummary;
  /** Keys with no execution mapping (ticket 05 / 10). */
  layoutDependentKeys: LayoutDependentKey[];
  nonTableLines: NonTableLine[];
}
