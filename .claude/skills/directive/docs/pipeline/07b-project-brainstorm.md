<!-- Pipeline doc: 07b-project-brainstorm.md | Source: pipeline-v2 directive -->

## Project-Brainstorm: Task Decomposition

After the CEO approves the COO's plan (approve step), each project needs task decomposition before execution. The COO defined WHAT projects to create and WHO works on them. This step defines HOW -- breaking each project into concrete tasks with DOD.

### Participants

- **The CTO** -- owns technical decomposition, DOD quality, sequencing
- **The assigned builder** from the project's `agent` field -- provides implementation perspective, file-level scope awareness

### Inputs

The brainstorm participants receive:
- **The COO's plan** (the approved project entry from plan.json) -- scope_summary, priority, cast
- **Audit findings** (from audit step) -- active_files, baseline, recommended_approach per task scope area
- **Directive brainstorm** (if it exists, from `.context/directives/{directive-id}/brainstorm.md`) -- approach decisions made during strategic/heavyweight brainstorm
- **Vision guardrails** (`.context/vision.md`) and **CEO preferences** (`.context/preferences.md`)
- **Relevant lessons** (`.context/lessons/` topic files matched to the project domain)

### Process

**For simple projects** (complexity = `simple`): The CTO produces the task breakdown solo. Spawn the CTO with the inputs above and the project brainstorm prompt below.

**For moderate/complex projects**: Spawn the CTO + the assigned builder in sequence. The CTO produces the initial task breakdown, then the builder reviews and suggests adjustments based on implementation knowledge.

### Project Brainstorm Prompt

```
You are decomposing a project into executable tasks. The project scope and cast are already decided. Your job is to define the TASKS -- what gets built, in what order, with what acceptance criteria.

PROJECT:
{project entry from the COO's plan -- id, title, scope_summary, agent, reviewers, auditor}

AUDIT FINDINGS:
{audit output for this project's scope area -- active_files, baseline, recommended_approach}

DIRECTIVE BRAINSTORM (if available):
{brainstorm.md content -- approach decisions, key constraints}

For this project, produce a tasks array. Each task is a buildable unit that one engineer completes in one session.

TASK DECOMPOSITION RULES:
- Each task must be completable by the assigned builder in a single focused session
- Tasks execute sequentially by array order -- this IS the dependency mechanism
- Earlier tasks should establish foundations that later tasks build on
- Each task needs 3-5 concrete, testable DOD criteria
- DOD criteria must be verifiable by the reviewer (not vague like "improve quality")
- For UI/visual tasks (files matching *.tsx, *.jsx, *.css, components/, pages/): DOD must
  describe what the USER SEES at default state, not the implementation technique.
  BAD: "Component renders without errors" or "Labels use ctx.fillText"
  GOOD: "Name labels visible above every character at default zoom (1x)" or
  "Settings panel shows all 5 categories without horizontal scroll at 100% zoom"
  Backend/data/infra tasks keep technical DOD -- this rule applies only to UI work.
- Include the right phases for each task: simple fix = ["build", "review"], integration work = ["build", "code-review", "review"]

OUTPUT (JSON):
{
  "project_id": "the project id",
  "tasks": [
    {
      "id": "task-slug",
      "title": "Human-readable task title",
      "priority": "P0 | P1 | P2",
      "complexity": "simple",
      "phases": ["build", "review"],
      "user_scenario": "One sentence: how the user will experience this change when it ships",
      "scope": "2-4 sentences: what needs to happen in this task",
      "definition_of_done": ["Concrete, testable criterion 1", "Criterion 2", "..."]
    }
  ],
  "sequencing_rationale": "1-2 sentences explaining why the tasks are in this order"
}

CRITICAL: First character `{`, last `}`. JSON only.
```

### After Project Brainstorm

1. **Parse the output** as JSON. If it fails to parse, re-prompt.
2. **Write tasks into project.json** -- update the project.json created in the approve step with the full `tasks` array. Each task gets `status: "pending"`, `agent` from the project cast, and `dod` from the brainstorm output (each criterion as `{ "criterion": "...", "met": false }`).
3. **Validate project.json** -- run `validate-project-json.sh` to confirm tasks, DOD, and agent fields are present.

### When to Skip

- **Lightweight directives** skip this step entirely -- they have no COO plan and no project.json.
- If the project already has a `tasks` array populated (e.g., from a prior partial run or manual creation), skip the brainstorm and proceed to execution.

### Update directive.json

Set `current_step: "project-brainstorm"`. Update `pipeline["project-brainstorm"].status` to `"completed"` with output summary.
