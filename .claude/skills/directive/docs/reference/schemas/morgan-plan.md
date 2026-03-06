<!-- Reference: morgan-plan.md | Source: SKILL.md restructure -->

# Morgan Plan JSON Schema

Morgan's output must follow this schema EXACTLY. Morgan plans at the **project level** — task breakdown and DOD are produced later in the project-brainstorm step by Sarah + the assigned builder.

## Schema

```json
{
  "goal": "CEO's goal title",
  "goal_folder": "which .context/goals/ folder this belongs to (existing or new)",
  "challenges": {
    "risks": ["Top 3 risks with this directive — be specific, not generic"],
    "over_engineering_flags": ["Anything in the directive that's scoped too broadly or could be simpler"],
    "recommendation": "Proceed as-is | Simplify (explain how — but still deliver everything)"
  },
  "projects": [
    {
      "id": "project-slug",
      "title": "Human-readable title",
      "priority": "P0 | P1 | P2",
      "complexity": "simple | moderate | complex",
      "agent": ["builder-name"],
      "reviewers": ["reviewer-name"],
      "auditor": "sarah | priya | riley | jordan | casey -- who investigates the codebase",
      "scope_summary": "2-4 sentences: what this project delivers, the outcome, and the approach",
      "depends_on": [],
      "touches_files_hint": ["path/to/likely-modified-file.ts"]
    }
  ]
}
```

## Field reference

### `depends_on` (array of project IDs, optional, default `[]`)

Explicit cross-project dependencies. If `depends_on: ["project-a"]`, this project cannot start until `project-a` completes. This is the **project-level** `depends_on` — Morgan outputs it to control cross-project execution order.

**Task-level `depends_on`** is a separate concept: produced during the project-brainstorm step when Sarah + the builder decompose a project into tasks. Task-level `depends_on` controls within-project wave analysis (which tasks in the same project can run in parallel). Both levels feed into the wave algorithm in the execute step.

- Empty array (or omitted) = no dependencies = eligible for parallel execution (subject to file-overlap checks).
- Supplements array ordering. Array order is still respected -- `depends_on` makes implicit dependencies explicit and enables cross-priority-tier dependencies.
- Morgan identifies these from scope analysis: "this project reads output produced by that project" = dependency.

### `touches_files_hint` (array of file paths, optional)

Morgan's prediction of which files this project will modify.

- Used as a hint for the auditor -- NOT the source of truth for wave analysis. The audit's `active_files` determines real file overlap.
- If Morgan is unsure, omit it. Better no hint than a wrong hint. The auditor will discover the real files.
- Why a hint: Morgan does not scan the codebase. She guesses from scope descriptions. The auditor actually reads the code.

## Example: parallel vs sequential projects

```json
{
  "projects": [
    {
      "id": "update-schemas",
      "title": "Update shared type definitions",
      "priority": "P0",
      "depends_on": [],
      "touches_files_hint": ["src/types.ts", "src/schemas.ts"]
    },
    {
      "id": "build-dashboard-widget",
      "title": "Build dashboard analytics widget",
      "priority": "P0",
      "depends_on": ["update-schemas"],
      "touches_files_hint": ["src/components/AnalyticsWidget.tsx"]
    },
    {
      "id": "build-settings-page",
      "title": "Build user settings page",
      "priority": "P0",
      "depends_on": ["update-schemas"],
      "touches_files_hint": ["src/components/SettingsPage.tsx"]
    },
    {
      "id": "integration-tests",
      "title": "End-to-end tests for new features",
      "priority": "P1",
      "depends_on": ["build-dashboard-widget", "build-settings-page"]
    }
  ]
}
```

Wave analysis computes from this:
- **Wave 1**: `update-schemas` (no dependencies)
- **Wave 2**: `build-dashboard-widget` + `build-settings-page` (both depend only on wave 1, no file overlap -- run in parallel)
- **Wave 3**: `integration-tests` (depends on both wave 2 projects)

Without `depends_on`, all four projects would run sequentially by array order.

## Key rules

- **Projects are ordered by priority + dependency.** Array order is respected. `depends_on` adds explicit dependency edges that the wave analyzer uses to compute parallel execution groups.
- **Dependent work belongs in ONE project.** If work items share code dependencies, they MUST be in the same project. Use `depends_on` only for genuinely separate projects where one must complete before another starts.
- **No tasks or DOD in Morgan output.** Morgan identifies WHAT projects are needed and WHO builds them. Task decomposition and definition of done are produced in the project-brainstorm step by Sarah + the assigned builder.
- **Every project gets a brainstorm.** Complex projects get a full brainstorm (Sarah + builder + specialist). Simple projects get a lightweight brainstorm (Sarah solo).
