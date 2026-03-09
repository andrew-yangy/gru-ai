<!-- Pipeline doc: 07-plan-approval.md | Source: SKILL.md restructure -->

## Approve: Present Combined Plan to CEO

### Pre-approval: Complexity Floor Check

After the audit and before presenting the plan, validate that all tasks are genuinely `simple` using the audit's `active_files` as mechanical ground truth:

- If a task has **>5 active_files**: it's NOT simple. **Flag for re-decomposition** — the COO must break it into 2-3 smaller simple tasks.
- If a task has **>10 active_files** or spans **>2 directories**: it's genuinely complex. **Flag as needing its own project** with brainstorm.
- Log any flags: `[COMPLEXITY FLAG] {task title}: touches 7 active files -- needs decomposition`

**If any tasks are flagged:**
1. Re-spawn the COO with the flagged tasks + audit findings, instructing them to decompose the tasks into simple tasks (or escalate to a separate project if genuinely complex)
2. Re-validate the updated plan
3. Present the final plan to CEO

This prevents the COO (an LLM optimistic about complexity) from classifying everything as "simple". The audit's active_files count is mechanical ground truth that overrides the COO's judgment.

---

**If running in a dedicated CLI session (non-interactive):** Write the full plan to `.context/directives/$ARGUMENTS/plan-for-approval.md` using the format below, update directive.json, and stop. The CEO reviews and re-launches with approval.

**If running inline (CEO session):** Present as described below.

### CEO Quick Summary (present FIRST — before any detail)

Always lead with a 3-5 bullet TL;DR that the CEO can read in 20 seconds:

```
## TL;DR

- **What**: {1-sentence goal}
- **Scope**: {N} tasks{, M in K projects if multi-project}
- **Risk**: {the COO's recommendation -- proceed / scope down / defer}
- **Auto-ships**: {count} low-risk tasks execute without approval
- **Needs your call**: {count} items need CEO decision {brief description}

Approve all / Approve with changes / Reject
```

The CEO should be able to approve from the TL;DR alone for medium-risk directives. The full detail below is for heavyweight review or "Approve with changes" scenarios.

### Challenges (from the COO's inline analysis + challenge step if separate challengers were spawned)

First, present the COO's built-in challenge analysis:

```
## Risk & Scope Assessment (COO)

Risks: {the COO's top 3 risks from challenges.risks}
Over-engineering flags: {challenges.over_engineering_flags}
Recommendation: {challenges.recommendation}
```

If separate C-suite challengers were spawned (heavyweight/controversial directives only), present their responses:

```
**{Agent Name}** — {ENDORSE | CHALLENGE | FLAG}
{reasoning}
{If challenge: "Alternative: {alternative}"}
{If risk flags: "Risks: {list}"}
```

If any challenge (the COO's or separate) recommends scoping down, highlight it prominently. The CEO should consider the challenge before approving the plan.

### Plan (from plan + audit steps)

Merge the COO's strategic plan with the audit findings and present **grouped by priority**:

For each task, display:
- Title + priority + complexity
- Scope (from the COO)
- User scenario (from the COO — the one-sentence user experience)
- Audit findings: active files, dead code flagged, recommended approach
- Phases + agent cast
- Definition of Done items (from the COO's plan — for CEO to review before approving)

Flag tasks where the audit found nothing to fix or all dead code -- recommend removal.

Example format:
```
## P0 — Must Ship

  1. {Task Title} (phases: {phases list}) — {cast summary}
     Scope: {the COO's scope description}
     User scenario: {user_scenario}
     Audit: {baseline} | {N} active files | {M} dead code files flagged
     Approach: {auditor's recommended approach}
     DOD: {criterion 1} | {criterion 2} | {criterion 3}

  2. {Task Title} — RECOMMEND REMOVE
     Audit: No active issues found. {explanation}

## P1 — Should Ship
  ...

## P2 — Nice to Have
  ...
```

Ask the CEO to approve using AskUserQuestion:
- "Approve all" — execute everything as planned
- "Approve with changes" -- CEO adjusts priorities or removes tasks
- "Reject" — stop, explain what's wrong

**DOD review guidance:** Before approving, scan each task's DOD items. Flag any that are:
- Too vague to verify ("improve quality" vs "all routes have Zod schemas")
- Missing CEO-intent alignment (DOD doesn't reflect what you actually want)
- Incomplete (fewer than 3 items, or missing a testability dimension)

If DOD items are weak, use "Approve with changes" to request better criteria before execution starts.

If CEO wants changes, adjust the plan accordingly.

### Create project.json (after CEO approves)

Once the CEO approves (or approves with changes), create the project.json — this is the source of truth for execution. Builders read it to know what to do. The dashboard shows it for progress tracking.

1. Create directory: `mkdir -p .context/directives/{directive-id}/projects/{project-id}/` (for each project in the COO's plan)
2. Write `project.json` with fields derived from the COO's plan (incorporating any CEO modifications):
   - `id`: directive name
   - `title`: from the COO's plan goal title
   - `status`: `"in_progress"`
   - `priority`: highest priority from tasks (P0 > P1 > P2)
   - `agent`: array of builder agent IDs from the COO's cast (e.g. `["frontend-engineer-id"]`, `["backend-engineer-id", "data-engineer-id"]`)
   - `reviewers`: array of reviewer agent IDs from the COO's cast (e.g. `["cto-id"]`, `["cto-id", "cpo-id"]`)
   - `description`: from the directive brief
   - `source_directive`: directive name
   - `scope.in`: aggregated from all task scopes
   - `scope.out`: anything explicitly excluded
   - `dod`: from the COO's `definition_of_done` arrays — each criterion starts as `{ "criterion": "...", "met": false }`
   - `browser_test`: `true` if any task touches UI files
   - `tasks`: one entry per task from the COO's plan, each with `status: "pending"`, `agent: []`, `dod` from the task's DOD -- each criterion starts as `{ "criterion": "...", "met": false }`. **CRITICAL: The key MUST be `tasks`.** The validator will reject any other key name.
   - `created`: current ISO 8601 timestamp with actual time (e.g. `new Date().toISOString()` — NEVER use `T00:00:00Z` placeholder)
   - `updated`: same as `created` initially

3. If the project.json already exists (from a prior partial run or brainstorm), UPDATE it — merge new tasks, don't duplicate existing ones. Apply any CEO modifications from "Approve with changes."

This project.json will be updated by the project-brainstorm step with the full `tasks` array, then incrementally during execution as tasks complete and reviews finish. The finalization step at the end sets status to completed, updates DOD met status, etc.

**Next step:** Proceed to [07b-project-brainstorm.md](07b-project-brainstorm.md) (project-brainstorm) to decompose each project into tasks with DOD.

**Update directive.json:** Set `current_step: "approve"`, `planning.ceo_approval` to `{status: "approved", modifications: [...]}` (or rejected). Update `pipeline.approve.status` to `"completed"` with output. This is CRITICAL — CEO decisions cannot be reconstructed after context loss.
