import path from "node:path";
import Validator from "../load/validator";
import { loadKeyCodes } from "../load/key-codes";
import type { InputApp } from "../model/input/input-models";
import type { ImportPlatform } from "./types";

/**
 * Checks a normalized key against the catalog's own platform- and layout-aware key rules, so the importer
 * and the catalog validator can never disagree. Returns the reason a key is unsupported, or null.
 */
export function createKeyChecker(catalogRoot: string, platform: ImportPlatform): (key: string) => string | null {
  let validator: Validator;
  try {
    validator = new Validator(loadKeyCodes(path.join(catalogRoot, "public/data/key-codes.json")));
  } catch {
    return () => null; // an unreadable key table surfaces in the whole-catalog validation instead
  }
  return key => {
    const probe: InputApp = {
      name: "probe",
      slug: "probe",
      keymaps: [{ title: "probe", platforms: [platform], sections: [{ title: "probe", shortcuts: [{ title: "probe", key }] }] }],
    };
    try {
      validator.validate([probe]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
}
