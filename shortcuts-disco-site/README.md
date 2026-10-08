# Hotkys website

Next.js static export with a generated shortcut catalog.

```bash
npm ci
npm run dev
npm run validate-data
npm run test:types
npm test -- --runInBand
npm run lint
npm run build
```

`dev` watches `shortcuts-data/` and regenerates the catalog on change. `build` generates the catalog and exports the website to `out/`; serve `out/` with a static web server (`next start` does not serve static exports). Development and generation never format source files; use `npm run prettify -- --write <slug>.json` explicitly.

This site is local-only: it needs no accounts, database or environment file. `npm run check:config` (run before `dev` and `build`) fails only if leftover `NEXT_PUBLIC_CLERK_*` or `NEXT_PUBLIC_SUPABASE_*` variables are set.
