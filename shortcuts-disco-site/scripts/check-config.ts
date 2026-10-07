import { findStaleAccountEnv } from "./stale-account-env";

// This site is local-only and needs no environment file. Fail if leftover account
// variables from the upstream hosted product are set, since nothing reads them anymore.
const stale = findStaleAccountEnv(process.env);
if (stale.length > 0) {
  console.error(`Remove unused account variables (this site is local-only): ${stale.join(", ")}`);
  process.exit(1);
}
console.log("Configuration check passed: no environment variables are required.");
