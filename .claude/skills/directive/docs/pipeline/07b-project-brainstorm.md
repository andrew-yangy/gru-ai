<!-- Pipeline doc: 07b-project-brainstorm.md | Source: pipeline-v2 directive -->

## Project-Brainstorm: Task Decomposition

After the CEO approves the COO's plan (approve step), each project needs task decomposition before execution. The COO defined WHAT projects to create and WHO works on them. This step defines HOW -- breaking each project into concrete tasks with DOD.

> **Timing:** This step (project-brainstorm) runs AFTER the COO plan and approval. Note that the *directive-level* brainstorm (heavyweight/strategic only) runs BEFORE the COO plans -- it produces approach options. This step is a separate, later activity that decomposes approved projects into tasks.

### Step Entry — Update directive.json immediately

Before spawning participants, write `pipeline["project-brainstorm"]` to directive.json with `"status": "active"` and `"agent"` set to the CTO + assigned builder first names (lowercase, from the project's cast). This triggers the dashboard game to route those characters to the meeting room.

### Participants

- **The CTO** -- owns technical decomposition, DOD quality, sequencing
- **The assigned builder** from the project's `agent` field -- provides implementation perspective, file-level scope awareness

### Inputs

The brainstorm participants receive:
- **CEO brief** (`.context/directives/{directive-id}/directive.md`) -- the CEO's original words, goals, frustrations, and quality expectations in their own language
- **Verified intent** (`directive.json` at `pipeline.clarification.output.verified_intent`) -- goal, constraints, quality_bar, acceptance_scenarios, out_of_scope as verified by the CEO in the clarification step
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
You are decomposing a project into executable tasks. The project scope and cast are already decided. Your job is to define the TASKS -- what gets built, in what order, with what acceptance criteria that trace back to the CEO's intent.

CEO BRIEF:
{directive.md content -- the CEO's original words verbatim}

VERIFIED INTENT:
{directive.json > pipeline.clarification.output.verified_intent -- goal, constraints, quality_bar, acceptance_scenarios, out_of_scope}

DIRECTIVE DOD:
{directive.json > dod.success_looks_like -- the directive-level success criteria}

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

DOD DERIVATION FROM DIRECTIVE:
- Read DIRECTIVE DOD (success_looks_like) above. Each item is a directive-level success criterion.
- Write each task's definition_of_done as acceptance scenarios: concrete given/when/then conditions that a reviewer can verify by inspection or test.
- The task DOD items across ALL tasks in this project must collectively cover every success_looks_like item from the directive DOD. If a directive success criterion has no corresponding task DOD, add a task or expand an existing task's DOD.
- After producing the tasks array, verify coverage: for each success_looks_like entry, at least one task DOD criterion must trace to it. If coverage is incomplete, revise before outputting.

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
      "definition_of_done": [
        "Given a medium-weight directive with 3 success_looks_like items, when the CTO decomposes into tasks, then each success criterion maps to at least one task DOD item",
        "Given a builder reading task DOD, when they check definition_of_done, then every item describes an observable outcome (not an implementation technique)",
        "Given a reviewer verifying task completion, when they read each DOD item, then they can confirm pass/fail by inspection without reading the code"
      ]
    }
  ],
  "sequencing_rationale": "1-2 sentences explaining why the tasks are in this order",
  "directive_dod_coverage": {
    "success_looks_like_item_1": ["task-slug.dod[0]", "task-slug.dod[1]"],
    "success_looks_like_item_2": ["task-slug.dod[2]"]
  }
}

CRITICAL: First character `{`, last `}`. JSON only.
```

### After Project Brainstorm

1. **Parse the output** as JSON. If it fails to parse, re-prompt.
2. **Write tasks into project.json** -- update the project.json created in the approve step with the full `tasks` array. Each task gets `status: "pending"`, `agent` from the project cast, and `dod` from the brainstorm output (each criterion as `{ "criterion": "...", "met": false }`).
   - **Field name mapping:** The brainstorm output uses `definition_of_done` (array of strings). Project.json uses `dod` (array of objects). Map each `definition_of_done` string entry to `{ "criterion": "<entry>", "met": false }` in the task's `dod` array.
3. **Validate project.json** -- run `validate-project-json.sh` to confirm tasks, DOD, and agent fields are present.

### When to Skip

- **Lightweight directives** auto-derive tasks from the COO plan without spawning a separate CTO + builder decomposition. The orchestrator reads the COO's plan and creates a simple project.json with tasks directly -- no brainstorm round needed.
- If the project already has a `tasks` array populated (e.g., from a prior partial run or manual creation), skip the brainstorm and proceed to execution.

### Update directive.json

Set `current_step: "setup"` (the next step). Update `pipeline["project-brainstorm"].status` to `"completed"` with `agent` (the participant first names array, same as the step entry) and output summary.

**Next step:** Proceed to [08-worktree-and-state.md](08-worktree-and-state.md) (setup) for branch/worktree isolation.
