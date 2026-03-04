<!-- Pipeline doc: 01-checkpoint.md | Source: SKILL.md restructure -->

## Step 0: Check for Checkpoint

Check if `.context/directives/checkpoints/$ARGUMENTS.json` exists.

**If not found:** Proceed to Step 1 normally.

**If found:** Parse the checkpoint JSON and present a resume summary:

```
Found checkpoint for {directive_name}:
- Started: {started_at}, last updated: {updated_at}
- Progress: {completed}/{total} initiatives complete
- Current step: {current_step}
- Initiatives: {list each with status}

Resume from checkpoint or restart fresh?
```

Ask the CEO using AskUserQuestion: **Resume** or **Restart**.

**If Restart:** Delete the checkpoint file and its artifacts directory (`rm -rf .context/directives/checkpoints/$ARGUMENTS.json .context/goals/{goal}/projects/{project}/$ARGUMENTS/`). Proceed to Step 1.

**If Resume:** Load checkpoint data and skip to the appropriate step:
- `current_step` is `step-3` → Load `planning.morgan_plan`, skip to Step 4 (CEO approval)
- `current_step` is `step-4` → Re-present plan for CEO approval (Step 4). Previous approval carries over — show it and ask CEO to confirm: "Plan was previously approved. Confirm to continue?"
- `current_step` is `step-4b` or `step-4c` → Load `planning.worktree_path`, re-initialize `~/.claude/directives/current.json` from checkpoint initiative states (Step 4c is idempotent), then skip to Step 5
- `current_step` is `step-5` → Load initiatives array. Skip initiatives with `status: "completed"` or `status: "skipped"`. Restart any `in_progress` initiative from its first phase (do not attempt partial phase resume). Continue with `pending` initiatives.
- `current_step` is `step-6` or later → Load wrapup state, skip completed wrapup sub-steps, continue from the first incomplete one

For resumed Step 5: when restarting an in-progress initiative, read its artifact files (if any) for context but re-execute all phases from scratch. Only truly completed initiatives are skipped.

> See [docs/reference/schemas/checkpoint.md](../reference/schemas/checkpoint.md) for the full checkpoint JSON schema.
