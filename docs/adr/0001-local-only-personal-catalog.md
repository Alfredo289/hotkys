# 0001: Local-only personal catalog

Status: accepted

## Context

This repository is a personal fork of the hosted upstream Hotkys product. Upstream relies on Clerk for sign-in, Supabase for favorites, preferences and custom apps, Google Analytics, and a GitHub Pages deployment. Its remediation spec (`docs/plans/2026-09-07-project-remediation-spec.md`, removed from this fork in b3cd93b; recover it with `git show b3cd93b^:docs/plans/2026-09-07-project-remediation-spec.md`) defines the account, session, authorization and cloud-data requirements for that product.

This fork serves one owner on one machine at `http://localhost:3000`. Accounts and cloud services add configuration, failure modes and a privacy surface that bring that owner no benefit.

## Decision

The fork is local-only:

- No accounts: no sign-in, profile, settings or "My shortcuts" pages, and no Clerk or Supabase code, dependencies, schema, migrations or environment variables.
- No cloud data: favorites and preferences live in the browser's local storage (versioned). The catalog JSON files under `shortcuts-disco-site/shortcuts-data/` are the single source of truth.
- No analytics scripts.
- No GitHub Pages or other hosted deployment. The site runs locally; `npm ci && npm run dev` needs no environment file.

This ADR replaces the authentication, authorization and cloud-data requirements of the upstream remediation spec. Those requirements no longer apply to this fork.

## Rules that stay in force

The non-auth rules from that spec remain, and the code and tests keep enforcing them:

- One shared parser. Shortcut key parsing lives in `shared/shortcuts-core/` and is copied by `scripts/sync-shortcuts-core.mjs` into the site and the Raycast extension; the generated copies are never edited by hand and CI runs the sync check.
- Deterministic staged catalog generation. The catalog is validated, staged and then published atomically (`src/lib/write/catalog-pipeline.ts`), so invalid input never replaces the previous generation.
- Reserved slugs. `apps`, `combined-apps`, `key-codes`, `schema` and any slug starting with `custom-` are rejected (`src/lib/load/catalog-rules.ts`).
- Filename equals slug. `<slug>.json` must contain `"slug": "<slug>"`.
- Unique slugs and names. Slugs are unique case-insensitively across the catalog, and app names and bundle IDs must not repeat (`src/lib/load/validator.ts`).

## Consequences

- Favorites and preferences do not sync between browsers or machines, and clearing site data clears them.
- Pulling from upstream may conflict in catalog files that were edited here; resolve by hand.
- The Raycast extension still contains its own Clerk/Supabase code. Removing it is a later, separate change; this ADR covers the site.
