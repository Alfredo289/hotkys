import { describe, expect, it } from "@jest/globals";
import { findStaleAccountEnv } from "./stale-account-env";

describe("findStaleAccountEnv", () => {
  it("passes with an empty environment", () => {
    expect(findStaleAccountEnv({})).toEqual([]);
  });

  it("reports leftover Clerk and Supabase variables", () => {
    expect(
      findStaleAccountEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x",
        NEXT_PUBLIC_UNRELATED: "1",
      }),
    ).toEqual(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]);
  });

  it("ignores empty values", () => {
    expect(findStaleAccountEnv({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "" })).toEqual([]);
  });
});
