const STALE_PREFIXES = ["NEXT_PUBLIC_CLERK_", "NEXT_PUBLIC_SUPABASE_"];

/** Names of leftover Clerk/Supabase variables that this local-only site no longer reads. */
export function findStaleAccountEnv(env: Record<string, string | undefined>): string[] {
  return Object.keys(env)
    .filter((name) => STALE_PREFIXES.some((prefix) => name.startsWith(prefix)) && env[name])
    .sort();
}
