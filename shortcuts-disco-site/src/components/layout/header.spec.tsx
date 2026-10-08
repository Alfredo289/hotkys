import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("next/navigation", () => ({ usePathname: () => "/add-shortcuts" }));
const { Header } = require("./header") as typeof import("./header");

describe("Header", () => {
  it("links to the Add shortcuts page", () => {
    render(<Header />);

    const link = screen.getByRole("link", { name: "Add shortcuts" });
    expect(link.getAttribute("href")).toBe("/add-shortcuts");
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});
