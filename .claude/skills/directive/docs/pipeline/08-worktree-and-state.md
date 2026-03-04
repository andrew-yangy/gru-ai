<!-- Pipeline doc: 08-worktree-and-state.md | Source: SKILL.md restructure -->

## Step 4b: Branch / Worktree Isolation

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

At the end (Step 7), tell the CEO the branch name so they can review with `git diff main..directive/$ARGUMENTS`.

**Skip isolation entirely if:** the user explicitly says "no branch", or all initiative phases are research-only (no code changes).

**Checkpoint:** Write checkpoint with `current_step: "step-4b"`, `planning.worktree_path` set to the worktree path (or null if branch-only or skipped).

## Step 4c: Initialize Directive State

Create the directive state file for dashboard tracking:

```bash
mkdir -p ~/.claude/directives
```

Write initial state to `~/.claude/directives/current.json`:

> See [docs/reference/schemas/current-json.md](../reference/schemas/current-json.md) for the full current.json schema.

```json
{
  "directiveName": "$ARGUMENTS",
  "status": "in_progress",
  "totalInitiatives": N,
  "currentInitiative": 0,
  "currentPhase": "starting",
  "initiatives": [
    {"id": "slug", "title": "Human-readable", "status": "pending", "phase": null}
  ],
  "startedAt": "ISO timestamp",
  "lastUpdated": "ISO timestamp"
}
```

**Update this file before each initiative and phase change** throughout Step 5. The conductor dashboard watches this file via chokidar for real-time progress display.

At Step 7 (completion), update status to `"completed"` or `"failed"`.

**Also ensure directive.json exists** at this point. If Step 1 didn't create it (e.g., lightweight process that skipped Step 1), create `.context/directives/$ARGUMENTS.json` now with the schema from Step 1. Update its `status` to `"in_progress"` and set `weight` from the triage classification.

**Checkpoint:** Write checkpoint with `current_step: "step-4c"`.

## Checkpoint Protocol

Checkpoints allow a directive to pause mid-execution and resume after context exhaustion. A single JSON file is overwritten atomically at each transition point.

**Checkpoint file:** `.context/directives/checkpoints/{directive-name}.json`
**Artifact files:** Write to the project directory: `.context/goals/{goal}/projects/{project}/{phase}.md`

> See [docs/reference/schemas/checkpoint.md](../reference/schemas/checkpoint.md) for the full checkpoint JSON schema.

**Write mechanism:** Use the Write tool to overwrite the entire checkpoint file. Always update `updated_at` to the current ISO timestamp. Create parent directories with `mkdir -p` on first write.

**Artifact writes:** After each phase completes in Step 5, write the phase output (design doc, build report, review JSON) to the project directory (`.context/goals/{goal}/projects/{project}/{phase}.md`). These survive context exhaustion and allow resumed runs to provide context to downstream phases.
