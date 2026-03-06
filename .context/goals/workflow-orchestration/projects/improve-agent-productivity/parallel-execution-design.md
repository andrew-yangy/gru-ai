# Technical Design: Parallel Execution with Specialist Casting

**Author**: Sarah Chen (CTO)
**Date**: 2026-03-06
**Status**: Draft — awaiting CEO review

---

## Problem Statement

The current pipeline runs projects sequentially by priority tier and has only basic within-project parallelism (file-overlap check). A directive with 8 tasks across 4 specialists wastes ~75% of available throughput because tasks that COULD run in parallel are queued behind each other. Morgan's manual wave analysis for the current directive proved this works — but it was ad hoc. We need it baked in.

## What We're NOT Doing

Before the design, let me be clear about scope:

- **NOT building a DAG executor.** We don't need a general-purpose workflow engine. We have a specific problem: groups of tasks, some independent, some dependent, executed by LLM agents through Claude Code's agent model.
- **NOT doing dynamic re-scheduling.** If a wave takes longer than expected, we don't re-plan. We execute the wave, handle failures, move to the next wave.
- **NOT cross-project parallelism yet.** Cross-project parallelism is a different problem (separate git branches, separate review cycles). This design covers within-project task parallelism with specialist-aware casting. Cross-project parallelism is a follow-up.

---

## Architecture Overview

Three decision points change, one new analysis step is added:

| Pipeline Step | Current | Proposed |
|---|---|---|
| Step 3 (Morgan) | Plans initiatives, assigns one builder per project | Plans initiatives, assigns specialist per TASK, adds `touches_files` hints |
| Step 3b (Audit) | Produces `active_files` per initiative | Same, but output feeds wave analysis |
| **NEW: Step 4b** | N/A | **Wave Analysis**: deterministic algorithm computes execution waves from audit data |
| Step 5 (Execute) | Sequential by priority tier, basic file-overlap parallelism | Wave-based execution: spawn parallel agents per wave, collect results, advance |

The critical insight: **wave analysis happens AFTER the audit, not during Morgan's planning.** Morgan makes file-touch PREDICTIONS. The audit produces ground truth. The wave computation uses audit data. This means Morgan can be wrong about file overlap and it doesn't matter — the algorithm corrects it.

---

## 1. Morgan Output Changes

### Current Morgan Schema (per initiative)

```json
{
  "id": "slug",
  "title": "...",
  "priority": "P0",
  "complexity": "simple",
  "cast": { "auditor": "sarah", "builder": "riley", "reviewers": ["marcus"] },
  "scope": "...",
  "definition_of_done": ["..."]
}
```

### Proposed Additions

```json
{
  "id": "slug",
  "title": "...",
  "priority": "P0",
  "complexity": "simple",
  "cast": { "auditor": "sarah", "builder": "riley", "reviewers": ["marcus"] },
  "scope": "...",
  "definition_of_done": ["..."],
  "touches_files_hint": ["src/components/GameHeader.tsx", "src/types.ts"],
  "depends_on": []
}
```

Two new fields:

**`touches_files_hint`** (array of strings, optional)
- Morgan's PREDICTION of which files this initiative will modify.
- Used as a hint for the auditor — NOT used for wave analysis directly. The audit's `active_files` is the source of truth.
- If Morgan doesn't know, omit it. The audit will discover the real files.
- Why a hint and not the source of truth: Morgan doesn't scan the codebase. She's guessing from scope descriptions. The auditor actually reads the code.

**`depends_on`** (array of initiative IDs, optional, default `[]`)
- Explicit task-level dependencies. If `depends_on: ["task-a"]`, this task cannot start until `task-a` completes.
- Empty array = no dependencies = eligible for parallel execution (subject to file overlap check).
- This supplements the current "array order = dependency" convention. Array order is still respected — `depends_on` adds cross-priority-tier dependencies and makes implicit dependencies explicit.
- Morgan identifies these from scope analysis: "this task reads the output of that task" = dependency.

### Why `depends_on` Instead of Just Array Order

Array order is a blunt instrument. Consider:

```
Task 1: Update types.ts (P0)
Task 2: Build component A using types.ts (P0)
Task 3: Build component B using types.ts (P0)
Task 4: Integration test A + B (P1)
```

With array order only: tasks 1-2-3-4 run sequentially. But tasks 2 and 3 are independent of each other — they both depend on task 1. With `depends_on`:

```
Task 1: depends_on: []
Task 2: depends_on: ["task-1"]
Task 3: depends_on: ["task-1"]
Task 4: depends_on: ["task-2", "task-3"]
```

Now the wave analyzer computes: Wave 1 = [Task 1], Wave 2 = [Task 2, Task 3] (parallel), Wave 3 = [Task 4].

### What Morgan Prompt Changes

Add to the Morgan prompt template:

```
PARALLEL EXECUTION SUPPORT:
For each initiative, specify:
- `touches_files_hint`: Your best guess at which files this initiative will modify.
  This helps the auditor but is NOT binding — the audit determines real files.
  If you're unsure, omit it. Better no hint than a wrong hint.
- `depends_on`: Array of initiative IDs that MUST complete before this one starts.
  Use this when task B reads/modifies output produced by task A.
  Empty array = independent = can run in parallel with other independent tasks.
  Don't add dependencies "just in case" — false dependencies kill parallelism.
  Array order is still respected within the same wave.

SPECIALIST CASTING PER TASK:
Each initiative gets its own builder, matched to the dominant file domain:
- *.tsx, *.jsx, components/ → riley (Frontend)
- server/, API routes → jordan (Backend)
- scripts/, parsers/, data pipelines → casey (Data)
- *.md, .context/ → taylor (Content)
- Tests, verification → sam (QA)
- Cross-domain or unclear → devon (Full-Stack)

Different initiatives in the same directive CAN have different builders.
Don't default to one builder for the whole project.
```

---

## 2. Wave Analysis Algorithm (Step 4b)

This is a NEW step that runs after audit (Step 3b) and before execution (Step 5). It is deterministic — no LLM involved. The orchestrator computes it.

### Input

- `tasks[]` from project.json (with `depends_on` per task)
- `active_files[]` from audit output (per task)

### Algorithm

```
function computeWaves(tasks, auditResults):
    remaining = set(all task IDs)
    completed = set()
    waves = []

    while remaining is not empty:
        eligible = []
        for task in remaining:
            // Check explicit dependencies
            if all of task.depends_on are in completed:
                eligible.append(task)

        if eligible is empty:
            // Circular dependency or all remaining tasks depend on
            // something that hasn't completed. This is a planning bug.
            ERROR: "Circular dependency or unresolvable depends_on"
            break

        // Within eligible tasks, group by priority tier
        // P0 eligible tasks go before P1 eligible tasks
        eligible.sort(by priority)
        currentPriority = eligible[0].priority

        // Take only the highest-priority eligible tasks
        tierEligible = eligible.filter(t => t.priority == currentPriority)

        // Within the tier, check file overlap to form parallel groups
        wave = []
        occupiedFiles = set()

        for task in tierEligible:
            taskFiles = auditResults[task.id].active_files
            if taskFiles INTERSECT occupiedFiles is EMPTY:
                wave.append(task)
                occupiedFiles.addAll(taskFiles)
            else:
                // This task overlaps — defer to next wave
                // Don't remove from remaining yet
                continue

        waves.append(wave)
        for task in wave:
            remaining.remove(task.id)
            completed.add(task.id)

    return waves
```

### Key Properties

1. **Priority ordering is preserved.** P0 tasks always schedule before P1, even if P1 tasks have no dependencies.
2. **File overlap prevents parallel execution.** Even if two tasks have no `depends_on` relationship, overlapping `active_files` forces them into separate waves.
3. **Greedy packing.** Each wave grabs as many non-overlapping tasks as possible. This maximizes parallelism.
4. **Deterministic.** Same input always produces the same waves. No LLM judgment.

### Output: Wave Manifest

Written to project directory as `wave-manifest.json`:

```json
{
  "computed_at": "2026-03-06T10:00:00Z",
  "total_tasks": 8,
  "total_waves": 3,
  "waves": [
    {
      "wave": 1,
      "tasks": [
        { "id": "update-types", "builder": "jordan", "priority": "P0", "active_files": ["src/types.ts"] }
      ],
      "parallel": false
    },
    {
      "wave": 2,
      "tasks": [
        { "id": "build-component-a", "builder": "riley", "priority": "P0", "active_files": ["src/components/A.tsx"] },
        { "id": "build-component-b", "builder": "riley", "priority": "P0", "active_files": ["src/components/B.tsx"] }
      ],
      "parallel": true
    },
    {
      "wave": 3,
      "tasks": [
        { "id": "integration-test", "builder": "sam", "priority": "P1", "active_files": ["tests/integration.test.ts"] }
      ],
      "parallel": false
    }
  ]
}
```

### Edge Case: Same Builder in Parallel Tasks

If wave 2 has two tasks both cast to Riley, they still run in parallel — as separate agent instances. Each Riley instance gets its own scope, files, and context. The `subagent_type: "riley"` loads the personality but doesn't create a singleton. Claude Code spawns independent agent processes.

This is fine. The personality file makes them behave consistently, not identically.

---

## 3. Conflict Detection and Recovery

### Prevention (Planning Time)

The wave algorithm prevents known conflicts by construction: tasks with overlapping `active_files` never run in the same wave. This is the primary defense.

### Detection (Execution Time)

What if the audit was wrong? An initiative touches a file that wasn't in its `active_files` list. This is the real-world failure mode.

**Option A: Pre-commit diff check (chosen)**
After each wave completes, before advancing to the next wave:
1. Run `git diff --name-only` to see what files were actually modified
2. Compare against the wave manifest's predicted `active_files`
3. If a task modified a file that was supposed to be touched by a task in a LATER wave, log a warning
4. The warning doesn't block — the later task's audit will catch the conflict when it reads the file

This is lightweight and sufficient. The later task's builder will see the file in its current state (including earlier modifications) because we're not using branches — all tasks work on the same working tree.

**Option B: Per-task branches (rejected)**
Each parallel task works on its own branch, then merge. This is clean in theory but disastrous in practice:
- Claude Code agents don't handle branch switching well in parallel
- Merge conflicts between LLM-generated code are hard to resolve automatically
- The orchestrator would need to be a git merge expert
- Over-engineering for a problem that rarely occurs if the audit is decent

**Option C: File locking (rejected)**
Lock files before each task starts. Other tasks that need locked files wait. This adds complexity (lock management, deadlock detection) for marginal benefit. The wave algorithm already prevents known overlaps.

### Recovery

If parallel tasks DO produce a conflict (both modified the same file):
1. The second task's changes win (last-write-wins on the working tree)
2. The review phase will catch inconsistencies — the reviewer sees the full file, including modifications from the other task
3. If the reviewer flags an issue, the fix cycle re-spawns the builder with the current file state
4. Worst case: one task's changes need to be re-applied. This is a single re-build, not a cascade.

This is acceptable because conflicts should be rare (the wave algorithm prevents most of them) and recoverable (reviews catch the rest).

---

## 4. Execution Model (Step 5 Changes)

### Current Execution Loop

```
for each task in priority order:
    audit → build → code-review → review → next task
```

### Proposed Execution Loop

```
compute waves from project.json + audit data (Step 4b)

for each wave in wave manifest:
    if wave has 1 task:
        execute task sequentially (same as current)
    if wave has multiple tasks:
        spawn all tasks in parallel (each as background agent)
        collect results via TaskOutput
        check for unexpected file overlap (git diff)

    // Review phase: STILL SEQUENTIAL per task
    for each completed task in this wave:
        run code-review phase
        run review phase
        if review fails → fix cycle → re-review

    advance to next wave
```

### Why Reviews Are Sequential, Not Parallel

Reviews for tasks within a wave could theoretically run in parallel. But:

1. **Reviews read the full file.** If task A and task B both changed `types.ts` (even different sections), the reviewer needs to see the COMBINED state. Running reviews in parallel means each reviewer sees the state at a different point.
2. **Fix cycles modify files.** If task A's review triggers a fix, the fix might affect task B's files. Sequential reviews ensure the fixer sees the current state.
3. **The bottleneck is build, not review.** Building takes 3-10 minutes. Reviews take 1-2 minutes. Parallelizing reviews saves <5% of total time. Not worth the complexity.

Exception: if two tasks in a wave have ZERO file overlap AND zero dependency, their reviews CAN run in parallel. But this optimization is not worth implementing in the MVP.

### Agent Spawn Pattern for Parallel Tasks

```bash
# Wave 2: two parallel tasks
CHILD_PIDS=()
cleanup_children() {
  for pid in "${CHILD_PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
}
trap cleanup_children EXIT

# Spawn task A (Riley instance 1)
CLAUDECODE= claude -p --agent riley --model sonnet --dangerously-skip-permissions \
  --no-session-persistence "BUILD TASK: build-component-a ..." \
  > /tmp/wave2-task-a.txt 2>&1 &
CHILD_PIDS+=($!)
PID_A=$!

# Spawn task B (Riley instance 2)
CLAUDECODE= claude -p --agent riley --model sonnet --dangerously-skip-permissions \
  --no-session-persistence "BUILD TASK: build-component-b ..." \
  > /tmp/wave2-task-b.txt 2>&1 &
CHILD_PIDS+=($!)
PID_B=$!

# Wait for both
wait $PID_A
STATUS_A=$?
wait $PID_B
STATUS_B=$?
```

Note: we use CLI-spawned sessions (`claude -p`), not the Agent tool with `run_in_background`, for parallel builds. Background agents can't use Bash (permission auto-rejected). CLI sessions can.

### Progress Display

```
Wave 1/3: [1 task, sequential]
  [1/8] Update types (P0, jordan) — building...
  [1/8] Update types — completed

Wave 2/3: [2 tasks, PARALLEL]
  [2/8] Build component A (P0, riley) — building...
  [3/8] Build component B (P0, riley) — building...
  [3/8] Build component B — completed (2m 14s)
  [2/8] Build component A — completed (3m 01s)
  [2/8] Build component A — reviewing...
  [3/8] Build component B — reviewing...

Wave 3/3: [1 task, sequential]
  [4/8] Integration test (P1, sam) — building...
```

---

## 5. Failure Handling

### Within a Wave (Parallel Tasks)

**Rule: parallel task failures do NOT cascade within the same wave.**

If task A fails and task B succeeds (both in wave 2):
- Task A is marked `failed`
- Task B proceeds to review normally
- The wave is considered partially complete

### Across Waves

**Rule: failed tasks block their dependents, not the entire pipeline.**

After a wave completes:
1. Check which tasks in LATER waves have `depends_on` references to failed tasks
2. Mark those dependent tasks as `blocked` (same as current behavior)
3. Non-dependent tasks in later waves proceed normally

Example:
```
Wave 1: [task-1 (SUCCESS), task-2 (FAILED)]
Wave 2: [task-3 depends_on task-1, task-4 depends_on task-2]
→ task-3 runs normally, task-4 is blocked
```

### Partial Failures (`partial` status)

A task that completes review but with known issues (partial status) is treated as a STOP signal for its dependents, same as current behavior. The reasoning: partial means critical issues survived the retry. Dependent tasks would inherit those bugs.

### Timeout

Each parallel task gets a 10-minute timeout (same as current). If a task times out:
- Kill the process
- Mark as `failed`
- Log: `[TIMEOUT] {task title} — exceeded 10m, marked failed`
- Other parallel tasks in the wave are not affected

---

## 6. Review Coordination

### Per-Task, Post-Wave

Reviews happen after each wave's builds complete, sequentially:

```
Wave 2 builds complete (parallel) →
  Review task A (sequential) →
  Review task B (sequential) →
Wave 3 builds start
```

### Reviewer Agent Reuse

If Sarah reviews both task A and task B, she is spawned twice as separate agent instances. Each gets the full context for that specific task. There is no "session memory" between reviews — each is independent.

This is correct behavior. The reviewer should evaluate each task on its own merits, not carry over context from the previous review.

### Code-Review Then Review (Same as Current)

The phase sequence within each task doesn't change:
1. Build (parallel, in wave)
2. Code-review (sequential, post-wave)
3. Review (sequential, post-wave)
4. Fix cycle if needed
5. Next task's review

---

## 7. MVP Scope

### What Ships First (MVP)

1. **`depends_on` field in Morgan's output schema** — explicit task dependencies
2. **Wave analysis algorithm** — deterministic, runs after audit
3. **Parallel build execution** — CLI-spawned agents, per wave
4. **Sequential reviews post-wave** — no change to review process
5. **Basic failure handling** — failed tasks block dependents
6. **Wave manifest artifact** — written to project directory for debugging

### What Ships Later (v2)

- **Specialist casting per task** — this is actually already possible with the current schema (`cast.builder` per initiative). Morgan just needs to be prompted to use different builders. Add to Morgan's prompt, not to the execution engine.
- **`touches_files_hint`** — nice for auditor efficiency, not required for wave analysis
- **Cross-project parallelism** — separate git branches, separate review cycles, much more complex
- **Parallel reviews** — marginal benefit, high complexity
- **Dynamic re-scheduling** — if a wave runs long, re-plan remaining waves. Premature optimization.

### MVP Implementation Checklist

Files to modify:
1. `morgan-prompt.md` — add `depends_on` field docs and specialist casting guidance
2. `morgan-plan.md` — update schema with `depends_on`
3. `09-execute-projects.md` — replace basic parallelism analysis with wave-based execution
4. `validate-cast.sh` — validate `depends_on` references (no dangling IDs, no circular deps)

Files to create:
1. `wave-analysis.md` — reference doc for the wave algorithm (in `docs/reference/`)

Estimated complexity: **medium**. The algorithm is simple. The execution model change is straightforward (we already have parallel agent spawning). The main work is updating the pipeline doc and testing edge cases.

---

## 8. Risks and Open Questions

### Risk 1: Audit `active_files` Misses Files (Likelihood: Medium, Impact: Medium)

The wave algorithm trusts the audit's `active_files`. If the audit misses a file that a task actually modifies, two parallel tasks could conflict.

**Mitigation:** Post-wave diff check (Section 3). The review phase catches inconsistencies. Worst case is one re-build. This is acceptable — it's the same failure mode as the current pipeline when a builder touches an unexpected file.

### Risk 2: Morgan Over-Specifies Dependencies (Likelihood: High, Impact: Low)

Morgan is an LLM. LLMs are conservative. Morgan will likely add `depends_on` edges that aren't real, reducing parallelism.

**Mitigation:** The wave algorithm only uses `depends_on` for ordering, not for anything else. Over-specified dependencies are safe (just slower). Under-specified dependencies are caught by file overlap. We can tune Morgan's prompt over time with examples of real vs. false dependencies.

### Risk 3: Parallel CLI Agents Saturate API Rate Limits (Likelihood: High, Impact: Medium)

Each CLI agent makes API calls. Running 3-4 in parallel could hit rate limits, causing retries and timeouts.

**Mitigation:** Start with max 3 parallel tasks per wave. If rate limiting is observed, drop to 2. The wave algorithm's `MAX_PARALLEL` parameter controls this — easy to tune without changing the algorithm.

Add to the wave manifest:

```json
{
  "max_parallel": 3,
  "waves": [...]
}
```

If a wave has 5 eligible tasks but `max_parallel` is 3, split into sub-waves of 3 + 2.

### Risk 4: Working Tree Contention (Likelihood: Low, Impact: High)

All parallel tasks write to the same working tree. If two tasks run `npm install` simultaneously or modify `package.json`, corruption is possible.

**Mitigation:** The file overlap check should catch `package.json` and `package-lock.json`. Add these to a global "always-sequential" file list that the wave algorithm treats as shared infrastructure. Any task touching these files cannot run in parallel with any other task.

**Global sequential files:**
- `package.json`, `package-lock.json` (npm)
- `tsconfig.json` (TypeScript config)
- `prisma/schema.prisma` (database schema)
- `.env*` (environment config)

### Open Question 1: Should `depends_on` Be Required or Optional?

My recommendation: **optional, default empty array.** If Morgan doesn't specify it, all tasks within the same priority tier are eligible for parallel execution (subject to file overlap). This is backward-compatible — existing plans without `depends_on` work exactly as before (the wave algorithm treats all P0 tasks as one wave, checks file overlap, splits where needed).

### Open Question 2: How Do We Handle Brainstorm + Build Sequencing?

Some tasks have multi-phase execution: `["clarification", "build", "code-review", "review"]`. Currently each phase runs sequentially within a task. Should we parallelize phases across tasks?

My recommendation: **No.** Phase ordering within a task is inherently sequential (clarification must happen before build). Cross-task parallelism at the wave level is sufficient. Trying to interleave phases across tasks adds complexity for marginal gain.

### Open Question 3: Does This Work With the Agent Tool or Only CLI?

The Agent tool (`run_in_background: true`) has Bash permission auto-rejected. CLI sessions (`claude -p`) do not. Parallel builds MUST use CLI sessions because builders need Bash for file operations.

This constrains our execution model: the orchestrator spawns CLI processes and waits for them. It cannot use the Agent tool for parallel builds. This is consistent with current practice (09-execute-projects.md already uses CLI spawns).

---

## Decision Summary

| Decision | Choice | Rationale |
|---|---|---|
| Where does dependency analysis happen? | Morgan predicts, audit confirms, Step 4b computes | Separation of concerns: LLM predicts, code verifies |
| How does Morgan's output change? | Add `depends_on[]`, `touches_files_hint[]` | Minimal schema change, backward compatible |
| How are waves computed? | Greedy algorithm: priority tier → dependency check → file overlap | Deterministic, no LLM in the loop |
| How are conflicts handled? | Prevention (wave algorithm) + detection (post-wave diff) + recovery (review catches it) | Defense in depth, no over-engineering |
| How do reviews work? | Sequential per task, after each wave | Reviews need full file state; build parallelism is the bottleneck, not reviews |
| What happens on failure? | Failed tasks block dependents only, not the whole pipeline | Maximize completed work |
| MVP scope? | `depends_on` + wave algorithm + parallel CLI builds | Smallest useful increment |
