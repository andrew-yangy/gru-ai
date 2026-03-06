# Pipeline Persistence — Show Stepper for Completed Directives

## CEO Brief

The new pipeline stepper is invisible for completed directives because it depends on checkpoint files that only exist during execution. After a directive completes, the checkpoint is gone and the stepper falls back to a plain progress bar. I want to always see the pipeline visualization — for active AND completed directives.

## What I Want

When a directive completes, its pipeline steps should still be visible in the stepper. The user should never see the fallback progress bar when pipeline data could be derived.

## Specific Requirements

### 1. Derive pipeline steps from directive state when no checkpoint exists
- If `current.json` has `status: "completed"` but no checkpoint file, generate all-completed pipeline steps based on the directive's weight class
- Lightweight directives skip Plan/Audit/Approve — mark those as "skipped"
- All other steps show as "completed"

### 2. Keep checkpoint-based pipeline as primary source
- When a checkpoint file exists (active directive), use it as before — it has richer data (artifacts, current step, etc.)
- The derived steps are the fallback for when checkpoint data is unavailable

### 3. No new files or data persistence needed
- Don't save checkpoint files permanently
- Derive the steps on-the-fly in the directive-watcher from existing `current.json` fields
- The weight field may need to be added to `current.json` if not already present

## Scope
- `server/watchers/directive-watcher.ts` — modify `readCurrentState()` to derive pipeline steps when no checkpoint exists
- Possibly `current.json` schema — ensure weight is available

## Goal
ui
