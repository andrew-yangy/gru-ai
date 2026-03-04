---
name: "directive"
description: "Execute work through the directive pipeline — evaluate, plan, cast agents, build, review, and report. Takes a directive name (matching .context/directives/), a project path, or an ad-hoc CEO request.\n\nTRIGGER: Use this skill whenever the user requests non-trivial work that goes beyond a one-liner fix. This includes: building features, running projects with project.json, executing multiple tasks, multi-file changes, or any work with defined DOD/reviewers. Route through this pipeline so reviews and verification steps fire. Do NOT spawn builder agents directly.\n\nFor heavyweight/strategic work, create a directive file in .context/directives/ first. For medium work with an existing project.json, pass the project path. For quick multi-step tasks, pass an ad-hoc description — no directive file needed."
---

# Execute Directive

Execute the CEO directive: $ARGUMENTS

## Step 0a: Routing Decision

Decide how to run this directive based on weight (determined in Step 0b triage):

### Lightweight — Run Inline

If the directive is lightweight (simple research, small fix, single-agent task), run the pipeline directly in the current session. The context window impact is acceptable for small tasks. Proceed to Step 0b.

### Medium / Heavyweight — New Terminal Session

For medium and heavyweight directives, the pipeline is too noisy for the CEO's interactive session. Tell the CEO to launch a dedicated session:

```bash
claude -p "/directive {directive_name}" --dangerously-skip-permissions
```

Or if the Foreman scheduler is enabled, queue it for auto-launch.

The CEO can monitor progress from the dashboard, game UI, or another terminal.

**Note:** You won't know the weight until Step 0b (triage). Start reading Step 0b inline. If triage says lightweight, continue inline. If triage says medium/heavy AND you're in the CEO's interactive session, output the launch command and stop.

---

## How to Use This Routing Map

This file is a routing table. Each row points to a modular doc containing full instructions for that step. **Read only the docs you need for the current step** — don't load everything at once.

### Pipeline Steps

| Step | Doc | Purpose | Depends On |
|------|-----|---------|------------|
| 0b | [00-delegation-and-triage.md](docs/pipeline/00-delegation-and-triage.md) | Triage directive weight + select process | — |
| 0 | [01-checkpoint.md](docs/pipeline/01-checkpoint.md) | Check for existing checkpoint, resume if found | — |
| 1 | [02-read-directive.md](docs/pipeline/02-read-directive.md) | Read directive file + create directive.json | 0b |
| 2 | [03-read-context.md](docs/pipeline/03-read-context.md) | Read all context files before planning | 1 |
| 2b | [04-challenge.md](docs/pipeline/04-challenge.md) | C-suite challenge (heavyweight only) | 2 |
| 3 | [05-morgan-planning.md](docs/pipeline/05-morgan-planning.md) | Morgan strategic planning | 2 |
| 3b | [06-technical-audit.md](docs/pipeline/06-technical-audit.md) | Technical codebase audit | 3 |
| 4 | [07-plan-approval.md](docs/pipeline/07-plan-approval.md) | Present plan to CEO for approval | 3b |
| 4b–4c | [08-worktree-and-state.md](docs/pipeline/08-worktree-and-state.md) | Worktree isolation + directive state init | 4 |
| 5 | [09-execute-initiatives.md](docs/pipeline/09-execute-initiatives.md) | Execute all initiatives (phases, agents, UX) | 4c |
| 5b | [09-execute-initiatives.md](docs/pipeline/09-execute-initiatives.md) | Review verification gate (end of doc) | 5 |
| 6–7 | [10-wrapup.md](docs/pipeline/10-wrapup.md) | OKRs, follow-ups, stale doc detection, digest, lessons, report | 5b |

### Reference Docs — Schemas

| Doc | Content |
|-----|---------|
| [morgan-plan.md](docs/reference/schemas/morgan-plan.md) | Morgan plan output JSON schema |
| [audit-output.md](docs/reference/schemas/audit-output.md) | Architect output JSON schema (design recommendations — second phase of two-agent audit) |
| [investigation-output.md](docs/reference/schemas/investigation-output.md) | Sam's investigation output JSON schema (pure data — first phase of two-agent audit) |
| [checkpoint.md](docs/reference/schemas/checkpoint.md) | Checkpoint JSON schema (includes dod_verification field) |
| [current-json.md](docs/reference/schemas/current-json.md) | Dashboard directive state schema |
| [directive-json.md](docs/reference/schemas/directive-json.md) | Directive companion JSON schema |
| [challenger-output.md](docs/reference/schemas/challenger-output.md) | Challenger output JSON schema |
| [brainstorm-output.md](docs/reference/schemas/brainstorm-output.md) | Brainstorm output JSON schema (proposals + rebuttals) |

### Reference Docs — Templates

| Doc | Content |
|-----|---------|
| [morgan-prompt.md](docs/reference/templates/morgan-prompt.md) | Full Morgan planning prompt |
| [investigator-prompt.md](docs/reference/templates/investigator-prompt.md) | Investigation prompt template for Sam (pure data gathering — first phase of audit) |
| [architect-prompt.md](docs/reference/templates/architect-prompt.md) | Architect prompt template (design recommendations — second phase of audit) |
| [auditor-prompt.md](docs/reference/templates/auditor-prompt.md) | Combined audit prompt for Sarah (single-agent path for simple initiatives) |
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
| [validate-project-json.sh](../../hooks/validate-project-json.sh) | Pre-execution gate — blocks Step 5 if project.json missing or incomplete (no tasks, no DOD, no scope) |
| [detect-stale-docs.sh](../../hooks/detect-stale-docs.sh) | Post-directive — scans docs for references to modified files, flags potentially stale docs |
