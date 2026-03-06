---
name: "directive"
description: "Execute work through the directive pipeline — evaluate, plan, cast agents, build, review, and report. Takes a directive name (matching .context/directives/), a project path, or an ad-hoc CEO request.\n\nTRIGGER: Use this skill whenever the user requests non-trivial work that goes beyond a one-liner fix. This includes: building features, running projects with project.json, executing multiple tasks, multi-file changes, or any work with defined DOD/reviewers. Route through this pipeline so reviews and verification steps fire. Do NOT spawn builder agents directly.\n\nFor heavyweight/strategic work, create a directive file in .context/directives/ first. For medium work with an existing project.json, pass the project path. For quick multi-step tasks, pass an ad-hoc description — no directive file needed."
---

# Execute Directive

Execute the CEO directive: $ARGUMENTS

## Step 0a: Routing Decision

Decide how to run this directive based on weight (determined in triage):

All directives run inline in the current session. Proceed to triage (which determines how much process overhead to apply), then execute.

---

## How to Use This Routing Map

This file is a routing table. Each row points to a modular doc containing full instructions for that step. **Read only the docs you need for the current step** — don't load everything at once.

### Pipeline Progress Protocol

**After completing each pipeline step**, update `.context/directives/{id}/directive.json`:
1. Set `pipeline.{stepId}.status` to `"completed"` (with optional `output` and `artifacts`)
2. Set `current_step` to the next step's ID
3. Set `updated_at` to the current ISO timestamp
4. Use the Write tool to overwrite the full directive.json

**When starting a step**, set `pipeline.{stepId}.status` to `"active"`.

The server's directive-watcher reads `directive.json` directly (NOT `current.json`) and pushes pipeline state to the dashboard via WebSocket. Keeping `pipeline` updated is what makes the stepper UI show real-time progress.

### Pipeline Steps

| # | Step ID | Doc | Purpose | Depends On |
|---|---------|-----|---------|------------|
| 1 | triage | [00-delegation-and-triage.md](docs/pipeline/00-delegation-and-triage.md) | Triage directive weight + select process | — |
| 2 | checkpoint | [01-checkpoint.md](docs/pipeline/01-checkpoint.md) | Check for existing checkpoint, resume if found | — |
| 3 | read | [02-read-directive.md](docs/pipeline/02-read-directive.md) | Read directive file + create directive.json | triage |
| 4 | context | [03-read-context.md](docs/pipeline/03-read-context.md) | Read all context files before planning | read |
| 5 | challenge | [04-challenge.md](docs/pipeline/04-challenge.md) | C-suite challenge (heavyweight only) | context |
| 6 | plan | [05-morgan-planning.md](docs/pipeline/05-morgan-planning.md) | Morgan strategic planning | context |
| 7 | audit | [06-technical-audit.md](docs/pipeline/06-technical-audit.md) | Technical codebase audit | plan |
| 8 | approve | [07-plan-approval.md](docs/pipeline/07-plan-approval.md) | Present plan to CEO for approval | audit |
| 9 | project-brainstorm | [07b-project-brainstorm.md](docs/pipeline/07b-project-brainstorm.md) | Sarah + builder decompose projects into tasks with DOD | approve |
| 10 | setup | [08-worktree-and-state.md](docs/pipeline/08-worktree-and-state.md) | Worktree isolation + directive state init | project-brainstorm |
| 11 | execute | [09-execute-projects.md](docs/pipeline/09-execute-projects.md) | Execute all tasks (phases, agents, UX) | setup |
| 12 | review-gate | [09-execute-projects.md](docs/pipeline/09-execute-projects.md) | Review verification gate (end of doc) | execute |
| 13 | wrapup | [10-wrapup.md](docs/pipeline/10-wrapup.md) | OKRs, follow-ups, stale doc detection, digest, lessons, report | review-gate |
| 14 | completion | [11-completion-gate.md](docs/pipeline/11-completion-gate.md) | CEO completion gate -- approve or reopen | wrapup |

### Reference Docs — Schemas

| Doc | Content |
|-----|---------|
| [morgan-plan.md](docs/reference/schemas/morgan-plan.md) | Morgan plan output JSON schema |
| [audit-output.md](docs/reference/schemas/audit-output.md) | Architect output JSON schema (design recommendations — second phase of two-agent audit) |
| [investigation-output.md](docs/reference/schemas/investigation-output.md) | Sam's investigation output JSON schema (pure data — first phase of two-agent audit) |
| [checkpoint.md](docs/reference/schemas/checkpoint.md) | Checkpoint JSON schema (includes dod_verification field) |
| [directive-json.md](docs/reference/schemas/directive-json.md) | Directive JSON schema (THE source of truth — includes pipeline progress for dashboard) |
| [challenger-output.md](docs/reference/schemas/challenger-output.md) | Challenger output JSON schema |
| [brainstorm-output.md](docs/reference/schemas/brainstorm-output.md) | Brainstorm output JSON schema (proposals + rebuttals) |

### Reference Docs — Templates

| Doc | Content |
|-----|---------|
| [morgan-prompt.md](docs/reference/templates/morgan-prompt.md) | Full Morgan planning prompt |
| [investigator-prompt.md](docs/reference/templates/investigator-prompt.md) | Investigation prompt template for Sam (pure data gathering — first phase of audit) |
| [architect-prompt.md](docs/reference/templates/architect-prompt.md) | Architect prompt template (design recommendations — second phase of audit) |
| [auditor-prompt.md](docs/reference/templates/auditor-prompt.md) | Combined audit prompt for Sarah (single-agent path for simple tasks) |
| [challenger-prompt.md](docs/reference/templates/challenger-prompt.md) | Challenger prompt template |
| [brainstorm-prompt.md](docs/reference/templates/brainstorm-prompt.md) | Brainstorm agent prompt template (Phase 1 proposals + Phase 2 deliberation) |
| [digest.md](docs/reference/templates/digest.md) | Digest report template |

### Reference Docs — Rules

| Doc | Content |
|-----|---------|
| [casting-rules.md](docs/reference/rules/casting-rules.md) | Agent casting: delegation, auditing, reviewing, specialists |
| [phase-definitions.md](docs/reference/rules/phase-definitions.md) | Phase building blocks + common patterns |
| [scope-and-dod.md](docs/reference/rules/scope-and-dod.md) | Scope format + Definition of Done rules |
| [failure-handling.md](docs/reference/rules/failure-handling.md) | Failure handling table |

### Validation Scripts

| Script | Content |
|--------|---------|
| [validate-cast.sh](../../hooks/validate-cast.sh) | Mechanical casting validation — checks auditor present, builder != reviewer, complex has C-suite reviewer |
| [validate-project-json.sh](../../hooks/validate-project-json.sh) | Pre-execution gate — blocks execute step if project.json missing or incomplete (no tasks, no DOD, no scope) |
| [detect-stale-docs.sh](../../hooks/detect-stale-docs.sh) | Post-directive — scans docs for references to modified files, flags potentially stale docs |
