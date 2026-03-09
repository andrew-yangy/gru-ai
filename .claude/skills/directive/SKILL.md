---
name: "directive"
description: "Execute work through the directive pipeline — evaluate, plan, cast agents, build, review, and report. Takes a directive name (matching .context/directives/), a project path, or an ad-hoc CEO request.\n\nTRIGGER: Use this skill whenever the user requests non-trivial work that goes beyond a one-liner fix. This includes: building features, running projects with project.json, executing multiple tasks, multi-file changes, or any work with defined DOD/reviewers. Route through this pipeline so reviews and verification steps fire. Do NOT spawn builder agents directly.\n\nFor heavyweight/strategic work, create a directive file in .context/directives/ first. For medium work with an existing project.json, pass the project path. For quick multi-step tasks, pass an ad-hoc description — no directive file needed."
---

# Execute Directive

Execute the CEO directive: $ARGUMENTS

## Role Resolution — Read First

Before executing, read `.claude/agent-registry.json` to map roles to agent names. The pipeline uses role-based language throughout. Resolve roles to concrete agent names using the registry:

- **COO** = the agent with `"title": "COO"` (plans projects, orchestrates execution)
- **CTO** = the agent with `"title": "CTO"` (architecture, audits, reviews, technical decomposition)
- **CPO** = the agent with `"title": "CPO"` (product strategy, UX review, user perspective)
- **CMO** = the agent with `"title": "CMO"` (growth, SEO, content strategy)
- **Frontend Developer** = the agent with `"title": "FE"` (React, Tailwind, components)
- **Backend Developer** = the agent with `"title": "BE"` (server, API, infrastructure)
- **Full-Stack Engineer** = the agent with `"title": "FS"` (cross-domain work)
- **Data Engineer** = the agent with `"title": "DE"` (pipelines, parsers, indexing)
- **Content Builder** = the agent with `"title": "CB"` (MDX, documentation, copywriting)
- **QA Engineer** = the agent with `"title": "QA"` (testing, investigation, validation)
- **UI/UX Designer** = the agent with `"title": "UX"` (design review, wireframes, visual quality)

Use each agent's `id` field as the `subagent_type` value when spawning. Use the `agentFile` field to locate personality files. The registry is the single source of truth for who fills each role.

---

## MANDATORY: Start with Triage — DO NOT SKIP

**YOU MUST read and execute [00-delegation-and-triage.md](docs/pipeline/00-delegation-and-triage.md) BEFORE doing anything else.**

DO NOT read source code. DO NOT edit files. DO NOT start solving the problem. The pipeline exists to ensure quality — every shortcut you take skips a review, a gate, or a verification step.

Your FIRST action must be: Read the triage doc, classify the directive weight, output the triage block, and create directive.json. Only then proceed to the next pipeline step.

If you catch yourself wanting to "just fix it quickly" — STOP. That impulse is exactly what the pipeline prevents. Even lightweight directives have a defined process (triage → context → plan → audit → build → review → digest → completion). The COO plans for ALL weights.

---

## How to Use This Routing Map

This file is a routing table. Each row points to a modular doc containing full instructions for that step. **Read only the docs you need for the current step** — don't load everything at once.

### Pipeline Progress Protocol

**After completing each pipeline step**, update `.context/directives/{id}/directive.json`:
1. Set `pipeline.{stepId}.status` to `"completed"` with:
   - `agent`: who performed this step (e.g. "CEO", "COO", "CTO, full-stack engineer")
   - `output`: REQUIRED object with at least a `summary` string (1-2 sentences of what happened/decided). Add other keys as relevant (e.g. `decision`, `weight`, `projects`).
   - `artifacts`: array of file paths produced (if any)
2. Set `current_step` to the next step's ID
3. Set `updated_at` to the current ISO timestamp
4. Use the Write tool to overwrite the full directive.json

**When starting a step**, set `pipeline.{stepId}.status` to `"active"`.

> **Why output is mandatory:** The dashboard renders pipeline step details directly from directive.json. Without `output.summary`, the UI shows empty steps — the CEO can't see what happened. Every step must leave a trace.

The server's directive-watcher reads `directive.json` directly (NOT `current.json`) and pushes pipeline state to the dashboard via WebSocket. Keeping `pipeline` updated is what makes the stepper UI show real-time progress.

### Step Execution Loop

After completing a step and updating directive.json, **immediately** read the next step's doc from the routing table below and execute it. Do NOT stop, do NOT pause, do NOT ask for confirmation between steps. The pipeline is designed to run end-to-end in a single pass.

**STOP gates — the only two points where you must stop and wait for the CEO:**

1. **`approve`** — heavyweight/strategic directives only. Lightweight and medium directives auto-approve and skip this gate entirely.
2. **`completion`** — all weights. The CEO must approve the final result or reopen the directive.

At every other step, transition directly to the next step without delay. If a step is skipped for the current weight class, advance past it and continue to the next applicable step.

### Pipeline Steps

| # | Step ID | Doc | Purpose | Depends On |
|---|---------|-----|---------|------------|
| 1 | triage | [00-delegation-and-triage.md](docs/pipeline/00-delegation-and-triage.md) | Triage directive weight + select process | — |
| 2 | checkpoint | [01-checkpoint.md](docs/pipeline/01-checkpoint.md) | Check for existing checkpoint, resume if found | — |
| 3 | read | [02-read-directive.md](docs/pipeline/02-read-directive.md) | Read directive file + create directive.json | triage |
| 4 | context | [03-read-context.md](docs/pipeline/03-read-context.md) | Read all context files before planning | read |
| 5 | challenge | [04-challenge.md](docs/pipeline/04-challenge.md) | C-suite challenge (heavyweight only) | context |
| 6 | plan | [05-planning.md](docs/pipeline/05-planning.md) | COO strategic planning | context |
| 7 | audit | [06-technical-audit.md](docs/pipeline/06-technical-audit.md) | Technical codebase audit | plan |
| 8 | approve | [07-plan-approval.md](docs/pipeline/07-plan-approval.md) | Present plan to CEO for approval | audit |
| 9 | project-brainstorm | [07b-project-brainstorm.md](docs/pipeline/07b-project-brainstorm.md) | CTO + builder decompose projects into tasks with DOD | approve |
| 10 | setup | [08-worktree-and-state.md](docs/pipeline/08-worktree-and-state.md) | Worktree isolation + directive state init | project-brainstorm |
| 11 | execute | [09-execute-projects.md](docs/pipeline/09-execute-projects.md) | Execute all tasks (phases, agents, UX) | setup |
| 12 | review-gate | [09-execute-projects.md](docs/pipeline/09-execute-projects.md) | Review verification gate (end of doc) | execute |
| 13 | wrapup | [10-wrapup.md](docs/pipeline/10-wrapup.md) | OKRs, follow-ups, stale doc detection, digest, lessons, report | review-gate |
| 14 | completion | [11-completion-gate.md](docs/pipeline/11-completion-gate.md) | CEO completion gate -- approve or reopen | wrapup |

### Reference Docs — Schemas

| Doc | Content |
|-----|---------|
| [plan-schema.md](docs/reference/schemas/plan-schema.md) | COO plan output JSON schema |
| [audit-output.md](docs/reference/schemas/audit-output.md) | Architect output JSON schema (design recommendations — second phase of two-agent audit) |
| [investigation-output.md](docs/reference/schemas/investigation-output.md) | QA Engineer's investigation output JSON schema (pure data — first phase of two-agent audit) |
| [checkpoint.md](docs/reference/schemas/checkpoint.md) | Checkpoint JSON schema (includes dod_verification field) |
| [directive-json.md](docs/reference/schemas/directive-json.md) | Directive JSON schema (THE source of truth — includes pipeline progress for dashboard) |
| [challenger-output.md](docs/reference/schemas/challenger-output.md) | Challenger output JSON schema |
| [brainstorm-output.md](docs/reference/schemas/brainstorm-output.md) | Brainstorm output JSON schema (proposals + rebuttals) |

### Reference Docs — Templates

| Doc | Content |
|-----|---------|
| [planner-prompt.md](docs/reference/templates/planner-prompt.md) | Full COO planning prompt |
| [investigator-prompt.md](docs/reference/templates/investigator-prompt.md) | Investigation prompt template for the QA Engineer (pure data gathering — first phase of audit) |
| [architect-prompt.md](docs/reference/templates/architect-prompt.md) | Architect prompt template (design recommendations — second phase of audit) |
| [auditor-prompt.md](docs/reference/templates/auditor-prompt.md) | Combined audit prompt for the CTO (single-agent path for simple tasks) |
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
