import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { InputApp } from "../model/input/input-models";

/** Creates a temporary catalog root with the real schema and key table. Test helper only. */
export function createTempCatalog(): {
  root: string;
  dataDir: string;
  seed(app: InputApp): void;
  snapshot(): Record<string, string>;
  cleanup(): void;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hotkys-import-"));
  const dataDir = path.join(root, "shortcuts-data");
  fs.mkdirSync(path.join(dataDir, "schema"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/data"), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), "shortcuts-data/schema/shortcut.schema.json"),
    path.join(dataDir, "schema/shortcut.schema.json"),
  );
  fs.copyFileSync(
    path.join(process.cwd(), "public/data/key-codes.json"),
    path.join(root, "public/data/key-codes.json"),
  );
  const snapshot = () => {
    const files: Record<string, string> = {};
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files[path.relative(root, full)] = fs.readFileSync(full, "utf8");
      }
    };
    walk(root);
    return files;
  };
  const seed = (app: InputApp) =>
    fs.writeFileSync(
      path.join(dataDir, `${app.slug}.json`),
      JSON.stringify(app, null, 2) + "\n",
    );
  return {
    root,
    dataDir,
    seed,
    snapshot,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}
