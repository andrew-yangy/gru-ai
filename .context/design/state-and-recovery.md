# State and Recovery

How the pipeline persists state and recovers from failures.

## Core Principle: directive.json IS the Checkpoint

Pipeline state lives in directive.json, not in session memory. Any session can read directive.json and know exactly where the pipeline stopped, what was completed, and what remains. This is modeled after Anthropic's "Effective Harnesses for Long-Running Agents" (Nov 2025): state initialization from persistent artifacts, not session memory.

## Why This Matters

Agent sessions die. Context limits, API timeouts, user cancellation, rate limits — sessions are inherently fragile. The pipeline must survive session death at any step boundary.

**Before this design:** Sessions died mid-pipeline and all progress was lost. Every directive that completed `execute` but died before `review-gate` required a full restart.

**After:** Re-running `/directive {name}` reads directive.json, finds `current_step`, and resumes from there.

## State Hierarchy

```
directive.json (pipeline progress, step statuses, artifacts)
  └── project.json (task statuses, DOD verification, agent assignments)
       └── Artifact files (build reports, review outputs, wave manifests)
```

Each level is independently readable. A session can reconstruct full state from these files without any prior context.

## What Gets Persisted

| After Step | Persisted To | What |
|------------|-------------|------|
| Triage | directive.json | weight, classification, process |
| Audit | directive.json + audit artifacts | findings, active files, recommended approach |
| Brainstorm | brainstorm.md + directive.json | proposals, synthesis, rebuttals (strategic) |
| Clarification | directive.json | verified_intent |
| Plan | plan.json + directive.json | COO's plan with projects, tasks, cast |
| Approve | project.json (created) + directive.json | Approved plan materialized as project files |
| Each task | project.json + artifact files | Task status, DOD met, build/review reports |
| Wrapup | report file + directive.json | Digest, lessons updates, design doc updates |
| Completion | directive.json | Final status (completed/amended/redirected) |

## Recovery Pattern

When a session resumes (checkpoint step):
1. Read directive.json → find `current_step`
2. Check each step's `pipeline.{stepId}.status` → find what's completed vs active vs pending
3. Read project.json → find task-level progress
4. Resume from the first incomplete step

**No re-execution of completed steps.** If audit is `completed`, the resume session uses the audit artifacts, it doesn't re-audit.

## Failure Modes and Fixes

| Failure | Recovery |
|---------|----------|
| Session dies mid-step | directive.json shows step as `active`. Resume re-executes that step. |
| Session dies between steps | directive.json shows last step as `completed`. Resume starts next step. |
| Builder agent dies mid-task | Task status = `in_progress`. Resume re-spawns builder for that task. |
| All agents fail | Directive stays `active`. CEO sees failures in directive.json, decides to retry or cancel. |
| Context exhaustion | Same as session death — directive.json preserves state, re-run `/directive {name}`. |

## project.json as Task-Level Truth

project.json is updated after every task completion (not just at the end). This means:
- Dashboard shows real-time progress per task
- Session death mid-project preserves completed task results
- Resume sessions know exactly which tasks remain

**Rule:** If you only update directive.json, the dashboard shows stale data. project.json is the authoritative source for task status and DOD verification.

## Design Decision: No Separate Checkpoint Files

Earlier designs used separate `checkpoint.json` files. This was removed — directive.json already contains all pipeline state. Separate checkpoint files caused drift (checkpoint said one thing, directive.json said another). Single source of truth eliminated the drift class of bugs entirely.
