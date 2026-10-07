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

Leave all Clerk/Supabase configuration unset. Account features are being removed from this fork.
