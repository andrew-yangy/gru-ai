# Build Report: gate-script

**Builder:** Jordan Reeves
**Date:** 2026-03-06

## Changes Made

### Files Created
- `.claude/hooks/validate-gate.sh` — Main gate enforcement script (340 lines)
- `.claude/hooks/tests/gate/run-tests.sh` — Test runner script
- `.claude/hooks/tests/gate/01-valid-lightweight-skip/` — Fixture: lightweight with .skip markers
- `.claude/hooks/tests/gate/02-valid-heavyweight/` — Fixture: heavyweight with full artifact chain
- `.claude/hooks/tests/gate/03-fail-missing-brainstorm/` — Fixture: heavyweight missing brainstorm.md
- `.claude/hooks/tests/gate/04-fail-missing-review/` — Fixture: medium missing review-task-b.md
- `.claude/hooks/tests/gate/05-valid-completion/` — Fixture: strategic completion gate
- `.claude/hooks/tests/gate/06-fail-missing-build/` — Fixture: medium missing build artifact for review
- `.claude/hooks/tests/gate/07-valid-medium-full/` — Fixture: medium with full chain through execute
- `.claude/hooks/tests/gate/08-fail-invalid-json/` — Fixture: invalid JSON in morgan-plan.json

### Files Modified
- `.claude/hooks/validate-cast.sh` — Replaced all initiative terminology with project/task

## Test Results

All 17 tests pass:

```
01: Lightweight directive with .skip markers
  PASS plan gate passes with brainstorm.skip (lightweight)
  PASS execute gate passes with approve.skip (lightweight)

02: Heavyweight directive with all artifacts
  PASS plan gate passes (brainstorm.md exists)
  PASS audit gate passes (morgan-plan.json exists with .projects)
  PASS execute gate passes (approval in directive.json)
  PASS review gate passes for task-1 (build-task-1.md exists)
  PASS wrapup gate passes (all reviews exist)
  PASS completion gate passes (digest.md exists)

03: Missing brainstorm for heavyweight
  PASS plan gate fails (no brainstorm.md, heavyweight)

04: Missing review artifact blocks wrapup
  PASS wrapup gate fails (review-task-b.md missing)

05: Valid completion gate
  PASS completion gate passes (digest.md exists, strategic)

06: Missing build artifact blocks review
  PASS review gate fails for task 'widget' (no build-widget.md)

07: Medium directive with full chain
  PASS plan gate passes (brainstorm.md exists, medium)
  PASS audit gate passes (morgan-plan.json valid)
  PASS approve gate passes (project.json with tasks)
  PASS execute gate passes (approval completed)

08: Invalid JSON in artifact
  PASS audit gate fails (morgan-plan.json is invalid JSON)

Results: 17 passed, 0 failed, 17 total
```

## Architecture Decisions

### Single script, not a library
The gate config (step-to-artifact mapping, weight-skip rules) is embedded directly in the bash script rather than in a separate JSON config file. This keeps the script standalone with zero dependencies beyond `jq` and `git`. The brainstorm considered a separate config file but the simplicity of a single executable won out -- the config is just bash variables and a case statement.

### Gate functions never exit on failure
Under `set -euo pipefail`, check functions must never return non-zero. They record violations in a global `VIOLATIONS` array and always `return 0`. The final output section inspects `VIOLATIONS` to determine pass/fail. This was a bug caught during testing -- `return 1` from a check function caused silent script termination.

### Atomic directive.json writes
On gate pass, the script uses `jq ... > tmpfile && mv tmpfile directive.json` to atomically update the `gates` section. If jq fails (malformed existing JSON), the write is silently skipped but the gate result is still reported as valid. This prevents a write failure from blocking pipeline progress.

### Audit artifact flexibility
The audit step can produce `audit.md`, `investigation.md`, or `conflicts-audit.md` (as seen in the pipeline-v2 directive itself). The gate checks for any of these three filenames.

### Per-task review gating
The review gate supports both modes: (1) a specific `task-id` argument to check one task's build artifact before reviewing it, and (2) no task-id to check all tasks have build artifacts. The wrapup gate checks all tasks have review artifacts, skipping tasks with status "skipped" or "blocked".

### validate-cast.sh rewrite scope
Removed the old dual-path approach (`.initiatives[]` + `.projects[].initiatives[]`). The new schema is flat: `.projects[]` at the top level, each with `.tasks[]`. Rule 5 (flat must be simple) was removed since the new schema always uses projects. Rule 3 now counts tasks instead of phases to determine complexity.

## Proposed Improvements

1. **Dashboard integration**: The `gates` object written to directive.json could be read by the directive watcher to show green/red/gray stepper indicators (as Marcus proposed in the brainstorm).

2. **Gate execution timing**: Currently gates are invoked manually. The pipeline docs (09-execute-initiatives.md) should be updated to call `validate-gate.sh` before each step.

3. **Structured review content validation**: Marcus proposed checking inside review files for rubber-stamp reviews (e.g., requiring `review_outcome` JSON field). This is not implemented -- the current gate only checks file existence, not content quality.

4. **Read/context gates**: The read and context gates only check directive.json pipeline status fields, not any external artifacts. These could be strengthened by checking for specific output fields in the pipeline status.

5. **Retry tracking**: When a gate fails and the missing artifact is created, the gate can be re-run. But there is no tracking of how many times a gate was attempted before passing. This could be useful for debugging pipeline issues.
