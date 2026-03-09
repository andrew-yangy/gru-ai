<!-- Pipeline doc: 08-worktree-and-state.md | Source: SKILL.md restructure -->

## Setup: Branch / Worktree Isolation

After CEO approval, create a branch to isolate directive changes.

**Default: branch-only (no worktree).** Create a branch for the directive:

```bash
git checkout -b directive/$ARGUMENTS
```

**Use worktree ONLY when** `git status` shows uncommitted changes that should be preserved. In that case:

```bash
git worktree add ../sw-directive-$ARGUMENTS -b directive/$ARGUMENTS
```

If the worktree already exists, reuse it. All agent spawn prompts must include `"Working directory: {worktree_path}"` so agents operate in the isolated copy.

At the end (wrapup step), tell the CEO the branch name so they can review with `git diff main..directive/$ARGUMENTS`.

**Skip isolation entirely if:** the user explicitly says "no branch", or all task phases are research-only (no code changes).

**Update directive.json:** Set `current_step: "setup"`, `planning.worktree_path` to the worktree path (or null if branch-only or skipped). Update `pipeline.setup.status` to `"completed"` with output.

## Setup (cont.): Verify Directive State

Ensure `directive.json` has the correct state before execution:

1. `pipeline.setup.status` = `"completed"`
2. `pipeline.execute.status` = `"active"`
3. `current_step` = `"execute"`
4. `projects[]` array lists all projects from the COO's plan with `status: "pending"`
5. `updated_at` is current

The dashboard watches `directive.json` via chokidar for real-time pipeline progress. There is NO separate `current.json` — directive.json IS the single source of truth for both checkpoint/resume and dashboard display.

## State Write Protocol

directive.json is THE single source of truth. It stores both checkpoint/resume state and pipeline progress for the dashboard.

**File:** `.context/directives/{directive-name}/directive.json`
**Artifact files:** Write to the directive directory: `.context/directives/{directive-id}/projects/{project-id}/{phase}.md`

> See [docs/reference/schemas/directive-json.md](../reference/schemas/directive-json.md) for the full schema.

**Write mechanism:** Use the Write tool to overwrite directive.json. Always update `updated_at`. Update `pipeline.{step}` status/output after each step. Update `current_step` at each transition.

**Artifact writes:** After each phase completes in the execute step, write the phase output (design doc, build report, review JSON) to the project directory. These survive context exhaustion and allow resumed runs to provide context to downstream phases.
