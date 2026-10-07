import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createCanonical, createOpenGraph } from "@/lib/seo-utils";

// Mirrors docs/importing-shortcuts.md. page.spec.tsx fails when the two drift apart.

const title = "Add shortcuts - Hotkys";
const description =
  "Add shortcuts to the Hotkys catalog with the import skill, the import CLI, or by editing the catalog JSON.";

export const metadata: Metadata = {
  title,
  description,
  alternates: createCanonical("/add-shortcuts"),
  openGraph: createOpenGraph("/add-shortcuts", title, description),
};

const tableExample = `## Navigation

| Action | Shortcut | Comment |
| --- | --- | --- |
| Toggle sidebar | ⌘B | |
| Go to line | Ctrl-G or ⌘L | |
| Open settings | ⌘, | |
| Drag to reorder | | Drag a tab with the mouse |`;

const cliExample = `npm run import -- --app "Raycast" --slug raycast --platform macos \\
  --file ../shortcut-sources/raycast.macos.md`;

const jsonCommands = `npm run prettify -- --write <slug>.json
npm run validate-data
npm run format-data:check`;

const columns = [
  ["Action", "Action, Command, Description", "yes"],
  ["Shortcut", "Shortcut, Keys, Key", "yes"],
  ["Section", "Section", "no"],
  ["Comment", "Comment", "no"],
];

const flags: [string, string][] = [
  ["--app <name>", "App name (required)."],
  ["--slug <slug>", "App slug, equal to the catalog file name (required)."],
  ["--platform macos|windows", "Platform of the table (required)."],
  [
    "--file <path>",
    "Markdown table file, relative to the current directory (required).",
  ],
  [
    "--keymap <title>",
    "Target keymap. Required when several keymaps match the platform or a keymap declares no platforms.",
  ],
  ["--source <url>", "Source URL (new apps)."],
  ["--bundle-id <id>", "Bundle ID (new apps)."],
  ["--hostname <host>", "Website hostname (new apps)."],
  ["--icon <path>", "Icon (new apps). Without one, a default icon is used."],
  ["--write", "Write the result to the catalog."],
  ["--overwrite", "Replace the target keymap entirely."],
  ["--json", "Print the report as JSON."],
];

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-6 text-2xl font-semibold tracking-[-0.035em]"
    >
      {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-8 scroll-mt-6 text-lg font-semibold">
      {children}
    </h3>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

function Block({ children }: { children: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-4 py-2 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>;
}

export default function AddShortcuts() {
  return (
    <div className="mx-auto max-w-3xl pb-16 text-base leading-relaxed text-muted-foreground">
      <p className="mb-5 text-sm font-medium">Add shortcuts</p>
      <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.06] font-semibold tracking-[-0.065em] text-foreground">
        Importing shortcuts
      </h1>
      <p className="mt-6">
        The catalog (
        <Code>shortcuts-disco-site/shortcuts-data/&lt;slug&gt;.json</Code>) is
        the source of truth. Add shortcuts to it in one of three ways: let the
        import skill convert a source for you, run the import CLI on a Markdown
        table, or edit the JSON by hand. This page (<Code>/add-shortcuts</Code>)
        mirrors <Code>docs/importing-shortcuts.md</Code> in the repository.
      </p>

      <H2 id="the-import-skill">The import skill</H2>
      <p className="mt-4">
        The <Code>import-shortcuts</Code> skill turns any source (URL, PDF,
        pasted text, screenshot, keybinding file) into the canonical Markdown
        table, one table per platform. Ask your agent, for example:
        &ldquo;Import the Raycast macOS shortcuts from this URL.&rdquo;
      </p>
      <p className="mt-4">The skill:</p>
      <ol className="my-4 list-decimal space-y-2 pl-6">
        <li>
          Extracts the shortcuts from the source and writes one table per
          platform to{" "}
          <Code>shortcut-sources/&lt;slug&gt;.&lt;platform&gt;.md</Code> (
          <Code>macos</Code> or <Code>windows</Code>). These source records are
          committed, so diffs are reviewable and imports can be re-run.
        </li>
        <li>Runs the CLI as a dry run and shows you the preview.</li>
        <li>Fixes errors it can resolve, and reports the rest.</li>
        <li>
          Runs <Code>--write</Code> only after you have seen the preview.
        </li>
      </ol>
      <p>
        The Markdown record is an input only; the catalog JSON stays the source
        of truth.
      </p>

      <H3 id="what-the-skill-resolves">What the skill resolves</H3>
      <p className="mt-4">
        The CLI never guesses. The skill resolves these before the CLI runs, and
        reports each resolution:
      </p>
      <List>
        <li>
          Platform-paired notation (<Code>mac / win</Code>) splits into one
          table per platform.
        </li>
        <li>
          <Code>mod</Code> becomes the platform&apos;s primary modifier (
          <Code>cmd</Code> on macOS, <Code>ctrl</Code> on Windows).
        </li>
        <li>
          Ranges (<Code>⌘1 to ⌘9</Code>) expand into one entry per key.
        </li>
        <li>
          Context notes (<Code>empty composer</Code>,{" "}
          <Code>when terminal is focused</Code>) and <Code>when</Code>{" "}
          conditions become the Comment.
        </li>
        <li>
          Entries that exist on one platform only are left out of the other
          platform&apos;s table, and reported.
        </li>
        <li>
          Command IDs become readable titles (<Code>terminal.toggle</Code>{" "}
          becomes &ldquo;Toggle terminal&rdquo;).
        </li>
      </List>

      <H2 id="the-markdown-table">The Markdown table</H2>
      <p className="mt-4">
        Only GFM tables are imported. Columns, matched case-insensitively:
      </p>
      <Table
        head={["Column", "Header synonyms", "Required"]}
        rows={columns.map((row) => row)}
      />
      <p>Example:</p>
      <Block>{tableExample}</Block>
      <List>
        <li>
          <strong className="text-foreground">Sections.</strong> The nearest
          preceding heading (any level) names the section. A Section column
          overrides it per row. The fallback is &ldquo;General&rdquo;.
        </li>
        <li>
          <strong className="text-foreground">Order.</strong> Rows keep their
          source order.
        </li>
        <li>
          <strong className="text-foreground">Outside tables.</strong> Other
          content is reported with line numbers and not imported.
        </li>
        <li>
          <strong className="text-foreground">Comment-only rows.</strong> A row
          with a Comment and no Shortcut is kept, for mouse gestures and notes.
        </li>
      </List>

      <H3 id="key-notation">Key notation</H3>
      <List>
        <li>
          Modifiers: <Code>⌘ ⌥ ⌃ ⇧</Code> and the names Command/Cmd,
          Option/Opt/Alt, Control/Ctrl/Ctl, Shift, Win/Windows/Super normalize
          to <Code>cmd</Code>, <Code>opt</Code>, <Code>ctrl</Code>,{" "}
          <Code>shift</Code>, <Code>win</Code> (<Code>alt</Code> on Windows), in
          the catalog&apos;s canonical order.
        </li>
        <li>
          Key names: Esc/Escape, Return/Enter/↵, Del/Delete, Backspace,
          PgUp/PgDn, arrow words and ←↑→↓, Space, Tab and F-keys normalize to
          the catalog vocabulary. Letters are lowercased.
        </li>
        <li>
          <Code>+</Code> joins a combo. <Code>-</Code> also works when
          unambiguous (<Code>Ctrl-S</Code>). A modifier-only token joins the
          next token (<Code>⇧ ⌘ /</Code> becomes <Code>shift+cmd+/</Code>).
        </li>
        <li>
          A sequence is complete combos separated by whitespace,
          &ldquo;then&rdquo; or commas (<Code>cmd+k cmd+s</Code>).
        </li>
        <li>
          Alternatives for one action share a cell, separated by <Code>or</Code>
          , <Code>/</Code> between complete combos, or <Code>;</Code>. Each
          becomes its own adjacent entry with the same title.
        </li>
        <li>
          Uppercase letters never imply Shift. A shifted character is stored as
          the character itself.
        </li>
        <li>
          Layout-dependent symbols (^ ´ ` &lt; &gt; # ß ä ö ü § °) are valid.
          They have no execution mapping, and the preview lists them.
        </li>
        <li>
          macOS keymaps allow <Code>ctrl</Code>, <Code>shift</Code>,{" "}
          <Code>opt</Code>/<Code>alt</Code>, <Code>cmd</Code>; Windows keymaps
          allow <Code>ctrl</Code>, <Code>shift</Code>, <Code>alt</Code>,{" "}
          <Code>win</Code>. Never <Code>cmd</Code>/<Code>opt</Code> on Windows.
        </li>
      </List>

      <H2 id="the-import-cli">The import CLI</H2>
      <p className="mt-4">
        Run it from <Code>shortcuts-disco-site/</Code>:
      </p>
      <Block>{cliExample}</Block>
      <Table
        head={["Flag", "Meaning"]}
        rows={flags.map(([flag, meaning]) => [
          <Code key={flag}>{flag}</Code>,
          meaning,
        ])}
      />
      <p>
        The default is a dry run: it prints the normalized preview, the change
        summary and all diagnostics, and writes nothing.
      </p>
      <p className="mt-4">
        Exit codes: <Code>0</Code> success (possibly with warnings and notices),{" "}
        <Code>1</Code> errors (nothing written), <Code>2</Code> usage error.
      </p>

      <H3 id="diagnostics">Diagnostics</H3>
      <p className="mt-4">
        Every diagnostic cites its line number in the Markdown file.
      </p>
      <List>
        <li>
          <strong className="text-foreground">Errors</strong> abort the import
          with nothing written: ambiguous notation (<Code>Ctrl/Cmd</Code>,{" "}
          <Code>Mod</Code>, ambiguous <Code>+</Code>/<Code>-</Code>, a bare
          modifier, <Code>Alt</Code> in a macOS import, click and drag words),
          keys unsupported on the platform, length violations (titles, sections,
          comments, keys), unparseable rows, rows with neither shortcut nor
          comment, merge conflicts, and any failure when the whole catalog is
          validated with the new file in place.
        </li>
        <li>
          <strong className="text-foreground">Warnings</strong> allow the write:
          the same key bound to different actions in one section.
        </li>
        <li>
          <strong className="text-foreground">Notices</strong> are
          informational: collapsed duplicate rows, layout-dependent keys,
          non-table lines not imported.
        </li>
      </List>
      <p>There is no partial write and no mode that skips bad rows.</p>

      <H3 id="write-and-overwrite">
        <Code>--write</Code> and <Code>--overwrite</Code>
      </H3>
      <p className="mt-4">
        <Code>--write</Code> validates the entire catalog with the new file in
        place, then writes atomically (temp file, then rename), formatted like{" "}
        <Code>npm run prettify</Code>.
      </p>
      <p className="mt-4">
        Without <Code>--overwrite</Code>, an import into an existing app merges
        into the target keymap, the one whose platforms include the import
        platform. When none exists, the import creates &ldquo;Default&rdquo;
        (macOS) or &ldquo;Default (Windows)&rdquo;.
      </p>
      <List>
        <li>
          Rows match by section, action and platform, ignoring case and extra
          whitespace. Existing titles keep their casing.
        </li>
        <li>
          An identical shortcut is unchanged, so re-running an import reports
          zero changes.
        </li>
        <li>
          A new shortcut for an existing action is appended as an adjacent
          alternative.
        </li>
        <li>
          A new action is appended to the end of its section, in source order.
          New sections go at the end of the keymap.
        </li>
        <li>
          An existing shortcut that would change or disappear is a conflict,
          which aborts the import.
        </li>
      </List>
      <p>
        <Code>--overwrite</Code> replaces the target keymap with the table. Use
        it to rebuild an app&apos;s shortcuts on purpose.
      </p>
      <p className="mt-4">
        After a write, the dev server (<Code>npm run dev</Code>) picks up the
        change automatically.
      </p>

      <H2 id="editing-the-json-by-hand">Editing the JSON by hand</H2>
      <p className="mt-4">
        Edit <Code>shortcuts-disco-site/shortcuts-data/&lt;slug&gt;.json</Code>{" "}
        directly, keeping the file name equal to the <Code>slug</Code>. Each
        shortcut has a <Code>title</Code>, a <Code>key</Code> (sequences
        separated by whitespace) and an optional <Code>comment</Code>. Then,
        from <Code>shortcuts-disco-site/</Code>:
      </p>
      <Block>{jsonCommands}</Block>
      <p>
        Validation applies the same platform- and layout-aware key rules as the
        importer.
      </p>
    </div>
  );
}
