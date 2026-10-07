import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import { ShortcutDisplay } from "./shortcut-display";
import type { SectionShortcut } from "@/lib/model/internal/internal-models";

function keysFor(base: string): string[] {
  const shortcut: SectionShortcut = { title: "Action", sequence: [{ modifiers: [], base }] };
  const { container } = render(<ShortcutDisplay shortcut={shortcut} />);
  return Array.from(container.querySelectorAll('[data-slot="kbd"]')).map((kbd) => kbd.textContent ?? "");
}

describe("ShortcutDisplay with layout-dependent keys", () => {
  it.each(["^", "´", "`", "<", ">", "#", "ß", "ä", "ö", "ü", "§", "°"])("renders %s as its own character", (symbol) => {
    expect(keysFor(symbol)).toEqual([symbol]);
  });

  it("still upper-cases ordinary letters", () => {
    expect(keysFor("k")).toEqual(["K"]);
  });
});
