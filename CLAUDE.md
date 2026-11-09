# CLAUDE.md

AI assistants: before doing anything in this project, read these in order:

1. **`HANDOFF.md`**: the current state, the owner's decisions, and the
   unfinished page-builder work (section 6 is the spec and task list).
2. **`DEVELOPER.md`**: the rules, architecture, gotchas and version history.

Non-negotiable rules (details in DEVELOPER.md section 2):
- Zero npm dependencies; plain HTML/CSS/JS; Node built-ins only.
- `git pull` first: staff publish from the hosted editor, which creates commits.
- `npm test` must pass before every commit; tests use `tests/fixtures/content.json`, never live content.
- Record every change in `DEVELOPER.md` → Version history, in the same commit.
- Never put the skip-ci marker (square brackets) in a commit message: it stops the website deploying.
- Escape all content in templates (`html` tagged template); never `innerHTML` in the editor except for renderer output.
- Explain things to the owner in plain, non-technical language.
