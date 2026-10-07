# Hotkys (personal fork)

A personal keyboard-shortcut catalog, run locally at `http://localhost:3000`. Forked from [solomkinmv/hotkys](https://github.com/solomkinmv/hotkys); this fork is local-only and is being stripped of accounts, cloud storage, analytics and deployment.

```bash
npm --prefix shortcuts-disco-site ci
npm --prefix shortcuts-disco-site run dev
```

Requires Node 22+. No environment variables are needed.

- Catalog data: one JSON file per app in `shortcuts-disco-site/shortcuts-data/`. The dev server regenerates the catalog when these change.
- Website: [`shortcuts-disco-site/`](shortcuts-disco-site/README.md)
- Raycast extension: [`shortcuts-raycast-extension/`](shortcuts-raycast-extension/README.md) (not yet adapted to this fork)
- Current work: `.scratch/hotkys-personal-mvp/spec.md`
