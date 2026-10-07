import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import AddShortcuts from "./page";

const guide = fs.readFileSync(
  path.resolve(__dirname, "../../../../docs/importing-shortcuts.md"),
  "utf8",
);
const prose = guide.replace(/```[\s\S]*?```/g, "");
const unescape = (text: string) => text.replace(/\\\|/g, "|");

describe("/add-shortcuts page", () => {
  it("has the same headings as the importing guide", () => {
    render(<AddShortcuts />);
    const guideHeadings = [...prose.matchAll(/^#{2,3} (.+)$/gm)].map((match) =>
      match[1].replace(/`/g, ""),
    );
    const pageHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .concat(screen.getAllByRole("heading", { level: 3 }))
      .map((heading) => heading.textContent);

    expect(guideHeadings.length).toBeGreaterThan(5);
    expect([...pageHeadings].sort()).toEqual([...guideHeadings].sort());
  });

  it("mentions every inline code term of the guide", () => {
    const { container } = render(<AddShortcuts />);
    const pageText = container.textContent ?? "";
    const terms = [...prose.matchAll(/`([^`]+)`/g)].map((match) =>
      unescape(match[1]),
    );

    expect(terms.length).toBeGreaterThan(50);
    expect(terms.filter((term) => !pageText.includes(term))).toEqual([]);
  });

  it("shows the code blocks of the guide", () => {
    const { container } = render(<AddShortcuts />);
    const pageText = container.textContent ?? "";
    const blocks = [...guide.matchAll(/```\w*\n([\s\S]*?)```/g)].map((match) =>
      match[1].trim(),
    );

    expect(blocks).toHaveLength(3);
    expect(blocks.filter((block) => !pageText.includes(block))).toEqual([]);
  });
});
