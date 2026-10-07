# 03: Local favorites and preferences

**What to build:** Favorites and preferences work without an account and live in browser local storage.
- **Favorites:** stored under the versioned key `hotkys:favorites:v1` and identified by the existing frozen base shortcut identity, so they survive catalog changes that keep the shortcut. The favorites page lists them. A favorite whose shortcut no longer exists is shown as missing, not dropped.
- **Preferences:** the platform filter, view mode and column count persist where they are changed. With no saved preference, the platform defaults to macOS.
- **Accounts:** no favorite or preference code path depends on the auth or account-data providers any more. Favorites cover catalog shortcuts only; custom-app favorites go away with ticket 04.

See spec: Local storage; Testing Decisions, seam 3.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Favoriting works signed-out and persists across reloads and remounts
- [ ] A favorite survives a catalog change that keeps its shortcut, and shows as missing when the shortcut is removed
- [ ] Platform filter, view mode and column count persist; the default platform is macOS
- [ ] The favorites and preferences hooks and the favorites page no longer import auth or account-data modules
- [ ] The existing favorites and platform-filter hook specs are rewritten against local storage, with no auth provider; the full site test suite and type check pass
