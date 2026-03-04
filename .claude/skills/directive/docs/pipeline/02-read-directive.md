<!-- Pipeline doc: 02-read-directive.md | Source: SKILL.md restructure -->

## Step 1: Read the Directive

**If a directive file exists:** Read `.context/directives/$ARGUMENTS.md`.

**If no directive file exists (ad-hoc request):** The CEO gave an ad-hoc description instead of a directive name. Generate a kebab-case ID from the description (e.g., "run these 3 projects" → `run-3-projects`, "comprehensive system review" → `system-review-2026-03-04`). Create both the `.md` and `.json` files in `.context/directives/`. The `.md` should contain the CEO's original request as the directive brief.

**If $ARGUMENTS looks like a project path** (contains `/`): Read the project.json at `.context/goals/{goal}/projects/{project}/project.json`. Generate a directive ID from the project name. Create the directive files.

**Naming convention:** Directive filenames must be kebab-case (e.g., `improve-security.md`). The name is used in git branch names (`directive/$ARGUMENTS`) and file paths.

### Create directive.json (ALWAYS — for all directive types including ad-hoc)

Create `.context/directives/$ARGUMENTS.json` if it doesn't already exist. This companion JSON provides structured metadata for the pipeline and dashboard.

> See [docs/reference/schemas/directive-json.md](../reference/schemas/directive-json.md) for the full directive.json schema.

```json
{
  "id": "$ARGUMENTS",
  "title": "{extracted from first heading of the .md}",
  "status": "in_progress",
  "created": "{today's date YYYY-MM-DD}",
  "completed": null,
  "weight": "{classification from Step 0b: lightweight | medium | heavyweight | strategic}",
  "goal_ids": ["{goal IDs from directive content — parse 'Goal alignment:' or infer from directive name}"],
  "produced_features": [],
  "report": null,
  "backlog_sources": []
}
```

Extract `goal_ids` from the directive .md content:
- Look for `**Goal alignment**: {goal-id}` in the directive text
- If not found, infer from the directive name (e.g., `sellwisely-*` -> `sellwisely-revenue`, `conductor-*` -> `agent-conductor`)
- If uncertain, leave as empty array — it will be populated during Step 6
