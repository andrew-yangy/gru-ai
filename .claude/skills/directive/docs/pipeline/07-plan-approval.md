<!-- Pipeline doc: 07-plan-approval.md | Source: SKILL.md restructure -->

## Step 4: Present Combined Plan to CEO

**If running in a dedicated CLI session (non-interactive):** Write the full plan to `.context/goals/{goal}/projects/{project}/$ARGUMENTS/plan-for-approval.md` using the format below, write checkpoint, and stop. The CEO reviews and re-launches with approval.

**If running inline (CEO session):** Present as described below.

### CEO Quick Summary (present FIRST — before any detail)

Always lead with a 3-5 bullet TL;DR that the CEO can read in 20 seconds:

```
## TL;DR

- **What**: {1-sentence goal}
- **Scope**: {N} initiatives, {complexity breakdown e.g. "2 simple, 1 moderate"}
- **Risk**: {Morgan's recommendation — proceed / scope down / defer}
- **Auto-ships**: {count} low-risk initiatives execute without approval
- **Needs your call**: {count} items need CEO decision {brief description}

Approve all / Approve with changes / Reject
```

The CEO should be able to approve from the TL;DR alone for medium-risk directives. The full detail below is for heavyweight review or "Approve with changes" scenarios.

### Challenges (from Morgan's inline analysis + Step 2b if separate challengers were spawned)

First, present Morgan's built-in challenge analysis:

```
## Risk & Scope Assessment (Morgan)

Risks: {Morgan's top 3 risks from challenges.risks}
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

If any challenge (Morgan's or separate) recommends scoping down, highlight it prominently. The CEO should consider the challenge before approving the plan.

### Plan (from Steps 3 + 3b)

Merge Morgan's strategic plan with the audit findings and present **grouped by priority**:

For each initiative, display:
- Title + priority + complexity
- Scope (from Morgan)
- User scenario (from Morgan — the one-sentence user experience)
- Audit findings: active files, dead code flagged, recommended approach
- Phases + agent cast
- Definition of Done items (from Morgan's plan — for CEO to review before approving)
- Verify command

Flag initiatives where the audit found nothing to fix or all dead code — recommend removal.

Example format:
```
## P0 — Must Ship

  1. {Initiative Title} (phases: {phases list}) — {cast summary}
     Scope: {Morgan's scope description}
     User scenario: {user_scenario}
     Audit: {baseline} | {N} active files | {M} dead code files flagged
     Approach: {auditor's recommended approach}
     DOD: {criterion 1} | {criterion 2} | {criterion 3}

  2. {Initiative Title} — RECOMMEND REMOVE
     Audit: No active issues found. {explanation}

## P1 — Should Ship
  ...

## P2 — Nice to Have
  ...
```

Ask the CEO to approve using AskUserQuestion:
- "Approve all" — execute everything as planned
- "Approve with changes" — CEO adjusts priorities or removes initiatives
- "Reject" — stop, explain what's wrong

**DOD review guidance:** Before approving, scan each initiative's DOD items. Flag any that are:
- Too vague to verify ("improve quality" vs "all routes have Zod schemas")
- Missing CEO-intent alignment (DOD doesn't reflect what you actually want)
- Incomplete (fewer than 3 items, or missing a testability dimension)

If DOD items are weak, use "Approve with changes" to request better criteria before execution starts.

If CEO wants changes, adjust the plan accordingly.

### Create project.json (after CEO approves)

Once the CEO approves (or approves with changes), create the project.json — this is the source of truth for execution. Builders read it to know what to do. The dashboard shows it for progress tracking.

1. Create directory (if not already created): `mkdir -p .context/goals/{goal_folder}/projects/{directive-name}/`
2. Write `project.json` with fields derived from Morgan's plan (incorporating any CEO modifications):
   - `id`: directive name
   - `title`: from Morgan's plan goal title
   - `goal_id`: from Morgan's `goal_folder`
   - `status`: `"in_progress"`
   - `priority`: highest priority from initiatives (P0 > P1 > P2)
   - `agent`: array of builder agent names from Morgan's cast (e.g. `["riley"]`, `["jordan", "casey"]`)
   - `reviewers`: array of reviewer agent names from Morgan's cast (e.g. `["sarah"]`, `["sarah", "marcus"]`)
   - `description`: from the directive brief
   - `source_directive`: directive name
   - `scope.in`: aggregated from all initiative scopes
   - `scope.out`: anything explicitly excluded
   - `dod`: from Morgan's `definition_of_done` arrays — each criterion starts as `{ "criterion": "...", "met": false }`
   - `browser_test`: `true` if any initiative touches UI files
   - `tasks`: one task per initiative phase, each with `status: "pending"`, `agent: []`, `dod` from initiative DOD — each criterion starts as `{ "criterion": "...", "met": false }`
   - `created`: current ISO 8601 timestamp with actual time (e.g. `new Date().toISOString()` — NEVER use `T00:00:00Z` placeholder)
   - `updated`: same as `created` initially

3. If the project.json already exists (from a prior partial run or brainstorm), UPDATE it — merge new tasks, don't duplicate existing ones. Apply any CEO modifications from "Approve with changes."

This project.json will be updated incrementally during execution (Step 5) as tasks complete and reviews finish. The "Register Projects" step at the end finalizes it (sets status to completed, updates DOD met status, etc.).

**Checkpoint:** Write checkpoint with `current_step: "step-4"`, `planning.ceo_approval` set to `{status: "approved", modifications: [...]}` (or rejected). This is CRITICAL — CEO decisions cannot be reconstructed after context loss.
