# 09: Remove accounts, analytics and database infrastructure; ADR-0001

**What to build:** The site has no account system and no external services.
- **Accounts:** remove the Clerk and Supabase dependencies, the auth and account-data providers, the login, profile and settings routes, and the auth and Supabase modules.
- **Analytics:** remove the Google Analytics tag.
- **Database:** remove the database schema, migrations and RLS tests and their npm script, the database mode of the configuration check, and the Clerk/Supabase variables in the env example. Remove the RLS step from CI.
- **ADR-0001:** record that this fork is local-only and restate the non-auth rules it keeps (one shared parser, deterministic staged catalog generation, reserved slugs, filename equals slug, unique slugs/names).

A fresh clone starts with `npm ci && npm run dev` and no environment file.

See spec: Architecture and decision records; Removals; user stories 1–2, 9, 17, 19–21.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] No Clerk, Supabase or analytics packages are left in the site's dependencies; there are no references in source
- [ ] The header and pages have no sign-in, profile or settings entry points
- [ ] The dev server and build both start with no environment file, and the config check passes
- [ ] CI runs only sync check, catalog validation, tests, type check, lint and build
- [ ] ADR-0001 exists in the ADR directory
- [ ] Site tests, type check, lint, `validate-data` and build pass; the Raycast extension is untouched and still compiles
