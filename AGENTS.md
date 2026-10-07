# Repository remotes

`origin` (`https://github.com/Alfredo289/hotkys.git`) is the only permitted destination for pushes, branches, tags, and releases from this repository.

Treat `upstream` (`https://github.com/solomkinmv/hotkys.git`) as strictly read-only. Fetching from upstream is allowed. Never push commits, branches, tags, or any other changes to upstream. Before every push, verify that the destination remote is `origin`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.
