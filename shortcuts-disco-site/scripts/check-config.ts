import { findStaleAccountEnv } from "./stale-account-env";

// This site is local-only and needs no environment file. Leftover account variables from the
// upstream hosted product are harmless (nothing reads them), so they only produce a warning.
const stale = findStaleAccountEnv(process.env);
if (stale.length > 0) {
  console.warn(`Warning: unused account variables are set and ignored (this site is local-only): ${stale.join(", ")}`);
}
console.log("Configuration check passed: no environment variables are required.");
