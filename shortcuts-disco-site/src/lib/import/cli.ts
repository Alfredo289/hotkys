import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { rootFolder } from "../utils";
import { importShortcuts } from "./import-shortcuts";
import type { ImportReport, ImportRequest } from "./types";

const USAGE = `Usage: npm run import -- --app <name> --slug <slug> --platform <macos|windows> --file <table.md> [options]

Dry run by default: prints a preview and diagnostics, writes nothing.

Options:
  --keymap <title>     Target keymap title
  --source <url>       Source URL (new apps)
  --bundle-id <id>     macOS bundle ID (new apps)
  --hostname <host>    Website hostname (new apps)
  --icon <path|url>    Icon under public/ or an http(s) URL (new apps)
  --write              Write the result to the catalog
  --overwrite          Replace the target keymap (not supported yet)
  --json               Print the report as JSON

Exit codes: 0 success, 1 errors (nothing written), 2 usage error.`;

class UsageError extends Error {}

function parseRequest(argv: string[]): { request: ImportRequest; json: boolean; root: string } {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        app: { type: "string" }, slug: { type: "string" }, platform: { type: "string" }, file: { type: "string" },
        keymap: { type: "string" }, source: { type: "string" }, "bundle-id": { type: "string" }, hostname: { type: "string" }, icon: { type: "string" },
        write: { type: "boolean" }, overwrite: { type: "boolean" }, json: { type: "boolean" },
        root: { type: "string" }, // hidden: catalog root override for tests
      },
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
  const { values } = parsed;
  for (const flag of ["app", "slug", "platform", "file"] as const) if (!values[flag]) throw new UsageError(`Missing required --${flag}.`);
  if (values.platform !== "macos" && values.platform !== "windows") throw new UsageError(`--platform must be macos or windows, got "${values.platform}".`);
  const file = values.file as string;
  let markdown: string;
  try { markdown = fs.readFileSync(file, "utf8"); } catch { throw new UsageError(`Cannot read --file ${file}.`); }
  return {
    json: Boolean(values.json),
    root: values.root ? path.resolve(values.root) : rootFolder,
    request: {
      markdown, fileName: path.basename(file), app: values.app as string, slug: values.slug as string, platform: values.platform,
      keymap: values.keymap, source: values.source, bundleId: values["bundle-id"], hostname: values.hostname, icon: values.icon,
      write: Boolean(values.write), overwrite: Boolean(values.overwrite),
    },
  };
}

function formatReport(report: ImportReport, request: ImportRequest): string {
  const lines: string[] = [];
  if (report.preview) {
    lines.push(`${report.app.created ? "New app" : "App"} ${report.app.name} (${report.app.slug}) - keymap "${report.preview.keymap}" [${report.preview.platforms.join(", ")}]`);
    for (const section of report.preview.sections) {
      lines.push("", `${section.title}`);
      for (const entry of section.entries) lines.push(`  ${entry.key ?? "-"}  ${entry.title}${entry.comment ? ` (${entry.comment})` : ""}  [line ${entry.line}]`);
    }
    lines.push("");
  }
  for (const diagnostic of report.diagnostics) {
    const where = diagnostic.line ? `${request.fileName}:${diagnostic.line}` : request.fileName;
    lines.push(`${diagnostic.severity.toUpperCase()} ${diagnostic.code} (${where}): ${diagnostic.message}`);
  }
  const { added, alternatives, unchanged, conflicts } = report.changes;
  lines.push(`Changes: ${added} added, ${alternatives} alternatives, ${unchanged} unchanged, ${conflicts} conflicts.`);
  if (report.wrote) lines.push(`Wrote shortcuts-data/${report.app.slug}.json.`);
  else if (report.ok) lines.push("Dry run: nothing written. Re-run with --write to apply.");
  else lines.push("Errors found: nothing written.");
  return lines.join("\n");
}

/** Returns the process exit code: 0 success, 1 errors (nothing written), 2 usage error. */
export function main(argv: string[]): number {
  let parsed;
  try { parsed = parseRequest(argv); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  const report = importShortcuts(parsed.root, parsed.request);
  console.log(parsed.json ? JSON.stringify(report, null, 2) : formatReport(report, parsed.request));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
