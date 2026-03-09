<!-- Pipeline doc: 01-checkpoint.md | Source: SKILL.md restructure -->

## Step 0: Check for Existing Progress

Check if `.context/directives/$ARGUMENTS.json` exists AND has a `current_step` field (indicating previous execution progress).

**If not found or no `current_step`:** Proceed to the read step normally.

**If found with `current_step`:** Parse the directive JSON and present a resume summary:

```
Found progress for {id}:
- Started: {started_at}, last updated: {updated_at}
- Progress: {completed}/{total} tasks complete
- Current step: {current_step}
- Tasks: {list each with status}

Resume or restart fresh?
```

Ask the CEO using AskUserQuestion: **Resume** or **Restart**.

**If Restart:** Remove the pipeline/execution fields from directive.json (keep metadata). Delete project artifacts (`rm -rf .context/directives/{id}/projects/`). Proceed to the read step.

**If Resume:** Load directive.json data and skip to the appropriate step:
- `current_step` is `plan` or `audit` → Load `planning.coo_plan`, skip to approve (CEO approval)
- `current_step` is `approve` → Re-present plan for CEO approval. Previous approval carries over — show it and ask CEO to confirm: "Plan was previously approved. Confirm to continue?"
- `current_step` is `project-brainstorm` or `setup` → Load `planning.worktree_path`, verify `directive.json` pipeline state is consistent, then skip to execute
- `current_step` is `execute` or `review-gate` → Load tasks array. Skip tasks with `status: "completed"` or `status: "skipped"`. Restart any `in_progress` task from its first phase (do not attempt partial phase resume). Continue with `pending` tasks.
- `current_step` is `wrapup` or `completion` → Load wrapup state, skip completed wrapup sub-steps, continue from the first incomplete one

For resumed execute step: when restarting an in-progress task, read its artifact files (if any) for context but re-execute all phases from scratch. Only truly completed tasks are skipped.

> See [docs/reference/schemas/directive-json.md](../reference/schemas/directive-json.md) for the full directive.json schema.
