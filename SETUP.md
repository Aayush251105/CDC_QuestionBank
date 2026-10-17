# Setting up Claude Code for the CDC student portal

Put these files in the root of your project folder (the folder you open in VS Code, next to `CDC-Student-Portal-Designs/`):

```
your-project/
  CLAUDE.md                     <- instructions Claude Code reads at the start of every session
  .claude/settings.json         <- turns off Claude's commit/PR attribution, asks before git commit/push
  .githooks/commit-msg          <- blocks any commit message that credits Claude
  CDC-Student-Portal-Designs/   <- the unzipped designs (already there)
```

Then, once, in the VS Code terminal from the project folder:

```
git init                              # skip if the folder is already a git repo
git config core.hooksPath .githooks   # turns the commit-msg hook on
chmod +x .githooks/commit-msg         # macOS / Linux only
```

Check your own name and email are set, so commits are authored by you:

```
git config user.name
git config user.email                 # use the email linked to your GitHub account
```

Restart Claude Code (or start a new chat in the VS Code panel) so it picks up `CLAUDE.md` and `.claude/settings.json`. Run `/memory` to see that CLAUDE.md is loaded and `/permissions` to see the git rules.

First prompt to give it:

> Read CLAUDE.md and the design files, then start step 1 of the build order. Stop at the commit checkpoint.

Notes:

- `.claude/settings.json` sets `attribution.commit` and `attribution.pr` to empty, which removes the "Co-Authored-By: Claude" trailer and the "Generated with Claude Code" line. `includeCoAuthoredBy: false` does the same for older Claude Code versions.
- `git add`, `git commit` and `git push` always show you a permission prompt. Pick "Yes" for that one command, not "Yes, and don't ask again", or the rule stops protecting you.
- Force-push, `git reset --hard`, `git clean`, `git config` and `--no-verify` are blocked for Claude entirely; run them yourself if you ever need them.
- Commit `CLAUDE.md`, `.claude/settings.json` and `.githooks/` to the repo. Keep personal overrides in `.claude/settings.local.json` (git-ignored).
