<!-- Reference: directive-json.md | Source: SKILL.md restructure -->

# directive.json — THE Single Source of Truth

directive.json is the ONLY state file for a directive. It stores metadata, pipeline progress, per-step outputs, and project references. There is NO separate checkpoint file — directive.json IS the checkpoint.

**File:** `.context/directives/{directive-name}/directive.json`

```json
{
  "id": "$ARGUMENTS",
  "title": "{extracted from first heading of the .md}",
  "status": "in_progress",
  "created": "{today's date YYYY-MM-DD}",
  "completed": null,
  "weight": "{classification from triage step}",
  "goal_ids": ["{goal IDs}"],
  "produced_features": [],
  "report": null,
  "backlog_sources": [],

  "started_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "current_step": "triage | read | context | challenge | brainstorm | plan | audit | approve | project-brainstorm | setup | execute | review-gate | wrapup | completion",

  "pipeline": {
    "triage": {
      "status": "completed",
      "agent": "CEO",
      "output": { "weight": "medium", "rationale": "..." }
    },
    "read": {
      "status": "completed",
      "agent": "CEO",
      "output": { "summary": "..." }
    },
    "context": {
      "status": "completed",
      "agent": "CEO",
      "output": { "summary": "Read vision.md, goals, lessons..." }
    },
    "challenge": {
      "status": "skipped",
      "agent": "C-suite",
      "output": { "summary": "Skipped for medium weight" }
    },
    "brainstorm": {
      "status": "completed",
      "agent": "C-suite",
      "output": { "summary": "..." },
      "artifacts": [".context/directives/{id}/brainstorm.md"]
    },
    "plan": {
      "status": "completed",
      "agent": "Morgan",
      "output": { "goal": "...", "projects": "..." },
      "artifacts": [".context/directives/{id}/morgan-plan.json"]
    },
    "audit": {
      "status": "completed",
      "agent": "Sarah",
      "output": { "summary": "...", "findings": 3 },
      "artifacts": [".context/directives/{id}/audit.md"]
    },
    "approve": {
      "status": "completed",
      "agent": "CEO",
      "output": { "decision": "approved", "modifications": [] }
    },
    "project-brainstorm": {
      "status": "completed",
      "agent": "Sarah + builder",
      "output": { "summary": "Task breakdown and DOD produced per project" },
      "artifacts": [".context/directives/{id}/projects/{project-id}/project.json"]
    },
    "setup": {
      "status": "completed",
      "agent": "CEO",
      "output": { "mode": "branch", "branch": "directive/{id}" }
    },
    "execute": {
      "status": "active",
      "agent": "Riley",
      "reviewers": ["Sarah"],
      "output": { "progress": "1/3 complete", "current": "project-name" }
    },
    "review-gate": { "status": "pending" },
    "wrapup": { "status": "pending", "agent": "CEO" },
    "completion": { "status": "pending", "agent": "CEO" }
  },

  "projects": [
    {
      "id": "project-slug",
      "status": "pending | in_progress | completed | failed"
    }
  ],

  "planning": {
    "morgan_plan": {},
    "ceo_approval": { "status": "approved|rejected|auto-approved", "modifications": [] },
    "worktree_path": "string | null"
  },

  "wrapup": {
    "okrs_persisted": false,
    "follow_ups_processed": false,
    "digest_path": null,
    "lessons_updated": false
  }
}
```

### Status enum
Valid values for `status`: `pending`, `triaged`, `in_progress`, `awaiting_completion`, `completed`, `failed`, `reopened`.

- `awaiting_completion` — all work done, wrapup produced, waiting for CEO to approve completion
- `reopened` — CEO reopened after completion; new projects being planned

### Pipeline step statuses
Each step in `pipeline` has: `status` (pending|active|completed|skipped|failed), `agent` (who runs it), `output` (key-value summary of what happened), and optional `artifacts` (file paths to detailed outputs).

### Projects
The `projects[]` array contains lightweight references. Each entry has `id` (matching the project directory name under this directive) and `status`. The full project detail (tasks, DOD, agents) lives in `projects/{id}/project.json` — directive.json does NOT duplicate task-level data.

### Write protocol
Use the Write tool to overwrite the entire directive.json. Always update `updated_at` to the current ISO timestamp. Update `pipeline.{step}.status` and `pipeline.{step}.output` after each step completes.

### Extracting `goal_ids`
- Look for `**Goal alignment**: {goal-id}` in the directive text
- If not found, infer from the directive name
- If uncertain, leave as empty array — populated during wrapup

### On completion (wrapup + completion gate)
- Set `status` to `"awaiting_completion"` (CEO must approve)
- CEO reviews digest and either:
  - **Approves** -> status = `"completed"`, set `completed` to today's date
  - **Reopens** -> status = `"reopened"`, CEO states what's missing, Morgan plans new projects
- Set `report` to the digest filename
- `pipeline` data stays — it's the permanent execution record

Directives live in `directives/{id}/` — a directory per directive containing directive.json, directive.md, and all artifacts.
