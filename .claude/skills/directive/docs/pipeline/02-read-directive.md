<!-- Pipeline doc: 02-read-directive.md | Source: SKILL.md restructure -->

## Step 1: Read the Directive

**If a directive file exists:** Read `.context/directives/$ARGUMENTS/directive.md` (or `.context/directives/$ARGUMENTS.md` for legacy flat files).

**If no directive file exists (ad-hoc request):** The CEO gave an ad-hoc description instead of a directive name. Generate a kebab-case ID from the description (e.g., "run these 3 projects" → `run-3-projects`, "comprehensive system review" → `system-review-2026-03-04`). Create a directive directory `mkdir -p .context/directives/{id}/` with both `directive.md` and `directive.json`. The `.md` should contain the CEO's original request as the directive brief.

**If $ARGUMENTS looks like a project path** (contains `/`): Read the project.json at `.context/directives/{directive}/projects/{project}/project.json`. Generate a directive ID from the project name. Create the directive files.

**Naming convention:** Directive filenames must be kebab-case (e.g., `improve-security.md`). The name is used in git branch names (`directive/$ARGUMENTS`) and file paths.

### Create directive.json (ALWAYS — for all directive types including ad-hoc)

Create `.context/directives/$ARGUMENTS/directive.json` if it doesn't already exist (create the directory first: `mkdir -p .context/directives/$ARGUMENTS/`). This companion JSON provides structured metadata for the pipeline and dashboard.

> See [docs/reference/schemas/directive-json.md](../reference/schemas/directive-json.md) for the full directive.json schema.

```json
{
  "id": "$ARGUMENTS",
  "title": "{extracted from first heading of the .md}",
  "status": "in_progress",
  "created": "{today's date YYYY-MM-DD}",
  "completed": null,
  "weight": "{classification from triage: lightweight | medium | heavyweight | strategic}",
  "produced_features": [],
  "report": null,
  "backlog_sources": []
}
```

