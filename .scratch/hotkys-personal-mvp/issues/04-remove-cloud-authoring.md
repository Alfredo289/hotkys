# 04: Remove cloud authoring

**What to build:** Remove every way of authoring shortcuts in the browser: the "My Shortcuts" area, private custom apps, overlays on catalog shortcuts, the cloud editor and the export dialog, together with the services, hooks, validation, routes and tests that exist only for them. App pages, the app list and the favorites page show catalog data only, with no merging of user customizations. The root catalog verification script no longer depends on the removed export service or custom-app types: rewrite it so `test:catalog` still verifies the catalog → website/Raycast path and the watcher, or delete it along with its npm script if nothing meaningful is left.

See spec: Removals; User stories 17–18.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The My Shortcuts routes, editor, export dialog, and the customization, private-app and export services and hooks are gone, along with their tests
- [ ] App details, the application list and the favorites page render catalog shortcuts without customization merging
- [ ] No remaining links point at the upstream contribution guide
- [ ] `test:catalog` passes, or has been removed deliberately (with the reason given in the commit message)
- [ ] Site tests, type check, lint and build pass
- [ ] Note: tickets 03 and 09 touch the same pages and providers; keep this ticket's changes limited to authoring
