import fs from "node:fs";
import path from "node:path";
import { validateCatalog } from "../load/catalog-validation";
import { prettifyApp } from "../write/prettify";
import type { InputApp } from "../model/input/input-models";
import { errorMessage } from "./error-message";

/** Serializes exactly like `npm run prettify`, so `format-data:check` passes on written files. */
export function formatAppFile(app: InputApp): string {
  prettifyApp(app);
  return JSON.stringify(app, null, 2) + "\n";
}

/** Validates the whole catalog with the candidate in place. Returns an error message, or null when valid. */
export function validateCandidate(root: string, app: InputApp): string | null {
  try {
    validateCatalog(root, {
      [`${app.slug}.json`]: JSON.parse(formatAppFile(app)),
    });
    return null;
  } catch (error) {
    return errorMessage(error);
  }
}

/** Atomic publish: temp file in the same directory (never `*.json`), then rename. */
export function writeAppFile(root: string, app: InputApp): void {
  const directory = path.join(root, "shortcuts-data");
  const target = path.join(directory, `${app.slug}.json`);
  const temp = path.join(directory, `.${app.slug}.json.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temp, formatAppFile(app), { flag: "wx" });
    fs.renameSync(temp, target);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
}
