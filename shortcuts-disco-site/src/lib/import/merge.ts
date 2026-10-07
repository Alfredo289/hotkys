import { normalizeShortcutKey } from "../shortcut-key-format";
import { serializeKeymap } from "../model/keymap-utils";
import type {
  InputApp,
  InputKeymap,
  InputSection,
  InputShortcut,
} from "../model/input/input-models";
import { defaultKeymapTitle, fold } from "./naming";
import type { Plan } from "./plan";
import type {
  ChangeSummary,
  Diagnostic,
  EntryStatus,
  ImportPreview,
  ImportRequest,
} from "./types";

const sameKey = (a?: string, b?: string) =>
  (a ? normalizeShortcutKey(a) : "") === (b ? normalizeShortcutKey(b) : "");
const sameComment = (a?: string, b?: string) => (a ?? "") === (b ?? "");
const describe = (shortcut: InputShortcut) =>
  [shortcut.key, shortcut.comment ? `"${shortcut.comment}"` : ""]
    .filter(Boolean)
    .join(" ");

type Target = { keymap: InputKeymap; exists: boolean } | { error: Diagnostic };

function resolveTarget(app: InputApp, request: ImportRequest): Target {
  const error = (code: string, message: string): Target => ({
    error: { severity: "error", code, message },
  });
  const platform = request.platform;
  const fresh = (title: string): Target => {
    const taken = app.keymaps.find(
      (keymap) =>
        fold(keymap.title) === fold(title) ||
        serializeKeymap({ title: keymap.title, sections: [] }) ===
          serializeKeymap({ title, sections: [] }),
    );
    if (taken)
      return error(
        "keymap-title-collision",
        `Cannot create keymap "${title}": keymap "${taken.title}" already exists (same title or URL) but does not cover ${platform}. Pass --keymap with another title, or --keymap "${taken.title}" if it should be the target.`,
      );
    return {
      keymap: { title, platforms: [platform], sections: [] },
      exists: false,
    };
  };

  if (request.keymap) {
    const named = app.keymaps.find(
      (keymap) => fold(keymap.title) === fold(request.keymap as string),
    );
    if (!named) return fresh(request.keymap);
    if (named.platforms && !named.platforms.includes(platform))
      return error(
        "keymap-platform-mismatch",
        `Keymap "${named.title}" is for ${named.platforms.join(", ")}, not ${platform}.`,
      );
    return { keymap: named, exists: true };
  }
  const withoutPlatforms = app.keymaps.filter(
    (keymap) => !keymap.platforms?.length,
  );
  if (withoutPlatforms.length)
    return error(
      "ambiguous-keymap",
      `Keymap ${withoutPlatforms.map((keymap) => `"${keymap.title}"`).join(", ")} declares no platforms, so the target is unclear. Name the target with --keymap.`,
    );
  const matching = app.keymaps.filter((keymap) =>
    keymap.platforms?.includes(platform),
  );
  if (matching.length > 1)
    return error(
      "ambiguous-keymap",
      `Several keymaps cover ${platform}: ${matching.map((keymap) => `"${keymap.title}"`).join(", ")}. Name the target with --keymap.`,
    );
  if (matching.length === 1) return { keymap: matching[0], exists: true };
  return fresh(defaultKeymapTitle(platform));
}

const claimId = (sectionTitle: string, key: string) =>
  `${fold(sectionTitle)}\u0000${normalizeShortcutKey(key)}`;

/**
 * Plans an import into an app that already exists. `imported` is the normalized import as a
 * new-app plan; its single keymap carries the rows in source order and its preview entries
 * line up one to one with the shortcuts.
 *
 * Merge mode is additive: existing entries that the import does not mention are kept as they are.
 * Absence from the import is never a removal, so a partial import (say, one row) merges cleanly.
 * A conflict is an imported row that would change an existing shortcut, which is the same
 * section + action + key with a different comment. Conflicts abort the import. `--overwrite`
 * instead replaces the target keymap with the import wholesale and cannot conflict.
 */
export function planMerge(
  existing: InputApp,
  request: ImportRequest,
  imported: Plan,
): Plan {
  const app = existing;
  const diagnostics: Diagnostic[] = [...imported.diagnostics];
  const target = resolveTarget(app, request);
  if ("error" in target)
    return {
      app,
      preview: imported.preview,
      changes: imported.changes,
      diagnostics: [...diagnostics, target.error],
      layoutDependentKeys: imported.layoutDependentKeys,
      changed: false,
    };

  const { keymap } = target;
  const previewSections = imported.preview.sections.map((section) => ({
    ...section,
    entries: section.entries.map((entry) => ({ ...entry })),
  }));
  const changes: ChangeSummary = {
    added: 0,
    alternatives: 0,
    unchanged: 0,
    conflicts: 0,
  };
  const importedSections = imported.app.keymaps[0].sections;
  const before = JSON.stringify(keymap);
  const mark = (
    status: EntryStatus,
    sectionIndex: number,
    shortcutIndex: number,
  ): void => {
    previewSections[sectionIndex].entries[shortcutIndex].status = status;
    if (status === "added") changes.added++;
    else if (status === "alternative") changes.alternatives++;
    else if (status === "unchanged") changes.unchanged++;
    else changes.conflicts++;
  };
  const finish = (): Plan => {
    if (!target.exists) app.keymaps.push(keymap);
    const preview: ImportPreview = {
      keymap: keymap.title,
      platforms: keymap.platforms ?? [],
      sections: previewSections,
    };
    return {
      app,
      preview,
      changes,
      diagnostics,
      layoutDependentKeys: imported.layoutDependentKeys,
      changed: !target.exists || JSON.stringify(keymap) !== before,
    };
  };

  if (request.overwrite) {
    const old = target.exists
      ? keymap.sections.flatMap((section) =>
          section.shortcuts.map((shortcut) => ({
            section: fold(section.title),
            shortcut,
          })),
        )
      : [];
    importedSections.forEach((section, i) =>
      section.shortcuts.forEach((shortcut, j) => {
        const known = old.some(
          (row) =>
            row.section === fold(section.title) &&
            fold(row.shortcut.title) === fold(shortcut.title) &&
            sameKey(row.shortcut.key, shortcut.key) &&
            sameComment(row.shortcut.comment, shortcut.comment),
        );
        mark(known ? "unchanged" : "added", i, j);
      }),
    );
    if (target.exists)
      diagnostics.push({
        severity: "notice",
        code: "keymap-replaced",
        message: `Replaced keymap "${keymap.title}" (${old.length} existing shortcuts) with the import; ${old.length - changes.unchanged} existing shortcuts were dropped.`,
      });
    keymap.sections = importedSections;
    return finish();
  }

  // Titles of the entries that were already in the keymap, by section + key. Rows of the import are
  // compared among themselves in the new-app plan; this covers the entries they land next to.
  const claimed = new Map<string, string[]>();
  keymap.sections.forEach((section) =>
    section.shortcuts.forEach((shortcut) => {
      if (shortcut.key)
        claimed.set(claimId(section.title, shortcut.key), [
          ...(claimed.get(claimId(section.title, shortcut.key)) ?? []),
          shortcut.title,
        ]);
    }),
  );
  const warnIfKeyTaken = (
    sectionTitle: string,
    shortcut: InputShortcut,
    line: number,
  ): void => {
    if (!shortcut.key) return;
    const other = claimed
      .get(claimId(sectionTitle, shortcut.key))
      ?.find((title) => fold(title) !== fold(shortcut.title));
    if (other !== undefined)
      diagnostics.push({
        severity: "warning",
        code: "same-key-different-action",
        line,
        message: `${shortcut.key} is bound to "${shortcut.title}" here and to "${other}" already in section "${sectionTitle}".`,
      });
  };

  importedSections.forEach((incoming, i) =>
    incoming.shortcuts.forEach((shortcut, j) => {
      let section: InputSection | undefined = keymap.sections.find(
        (candidate) => fold(candidate.title) === fold(incoming.title),
      );
      if (!section) {
        section = { title: incoming.title, shortcuts: [] };
        keymap.sections.push(section);
      }
      const sameAction = section.shortcuts.filter(
        (candidate) => fold(candidate.title) === fold(shortcut.title),
      );
      const sameShortcut = sameAction.filter((candidate) =>
        sameKey(candidate.key, shortcut.key),
      );
      if (
        sameShortcut.some((candidate) =>
          sameComment(candidate.comment, shortcut.comment),
        )
      )
        return mark("unchanged", i, j);
      if (sameShortcut.length) {
        const line = previewSections[i].entries[j].line;
        diagnostics.push({
          severity: "error",
          code: "merge-conflict",
          line,
          message: `"${shortcut.title}" in "${section.title}" already has ${describe(sameShortcut[0])}; the import has ${describe(shortcut)}. Fix the import, or use --overwrite to replace keymap "${keymap.title}".`,
        });
        return mark("conflict", i, j);
      }
      if (sameAction.length) {
        let last = 0;
        section.shortcuts.forEach((candidate, index) => {
          if (fold(candidate.title) === fold(shortcut.title)) last = index;
        });
        section.shortcuts.splice(last + 1, 0, {
          ...shortcut,
          title: sameAction[0].title,
        });
        warnIfKeyTaken(
          section.title,
          shortcut,
          previewSections[i].entries[j].line,
        );
        return mark("alternative", i, j);
      }
      section.shortcuts.push(shortcut);
      warnIfKeyTaken(
        section.title,
        shortcut,
        previewSections[i].entries[j].line,
      );
      mark("added", i, j);
    }),
  );
  return finish();
}
