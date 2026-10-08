/** @jest-environment node */
import { it, expect } from "@jest/globals";
import { spawnSync } from "node:child_process";

const run = (env: Record<string, string>) => {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^NEXT_PUBLIC_(CLERK|SUPABASE)_/.test(name)));
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/check-config.ts"], { cwd: process.cwd(), encoding: "utf8", env: { ...clean, ...env } as NodeJS.ProcessEnv });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

it("passes with no environment variables", () => {
  const result = run({});
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
});

it("only warns about leftover account variables and still exits 0", () => {
  const result = run({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" });
  expect(result.status).toBe(0);
  expect(result.stderr).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  expect(result.stderr).toContain("NEXT_PUBLIC_SUPABASE_URL");
});
