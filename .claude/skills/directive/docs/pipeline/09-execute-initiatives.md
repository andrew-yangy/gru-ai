<!-- Pipeline doc: 09-execute-initiatives.md | Source: SKILL.md restructure -->

## Step 5: Execute Initiatives

### Pre-execution Gate: Validate project.json

**Before any initiative executes**, validate that project.json exists and has required fields:

```bash
echo '{"goal_folder":"'"$GOAL_FOLDER"'","directive_name":"'"$DIRECTIVE_NAME"'"}' | .claude/hooks/validate-project-json.sh
```

If `valid: false`, **STOP**. Do not proceed to execution. Fix the violations first — either create the project.json (Step 3 should have done this) or fill in missing fields. This is a hard gate, not a warning.

Execute each approved initiative **in priority order** (P0 first, then P1, then P2).

### Parallelism Analysis (before execution loop)

Before executing initiatives sequentially, analyze which initiatives CAN run in parallel:

1. **Group by priority tier** — P0 runs before P1, P1 before P2. Within the same tier, check for parallelism.

2. **Check active_files overlap** — Two initiatives can run in parallel ONLY if their audit's `active_files` arrays have ZERO overlap. Any shared file = sequential.

3. **Check dependency** — If initiative B's scope references output from initiative A, they're sequential regardless of file overlap.

4. **Spawn parallel initiatives** — For non-overlapping initiatives in the same priority tier:
   - Spawn each as a background agent: `run_in_background: true`
   - Collect results using TaskOutput for each agent ID
   - If any parallel initiative fails, the others continue — failures don't cascade

5. **Sequential fallback** — If all initiatives in a tier overlap, run them sequentially as before.

**Example:**
- Initiative A touches `server/api/products.ts`, Initiative B touches `src/components/ProductCard.tsx` — PARALLEL OK
- Initiative A touches `server/api/products.ts`, Initiative B touches `server/api/products.ts` — SEQUENTIAL

**Error recovery for parallel initiatives:**
- If a background agent crashes: mark initiative as `failed`, continue with others
- If a background agent times out (no response after 10 minutes): mark as `failed`, log timeout
- After all parallel initiatives complete, proceed to the next priority tier

**Progress tracking:** Before each initiative, show the CEO a status line:

```
[2/4] Initiative: Fix SQL Injection (P0, fix) — starting build phase...
```

After each initiative completes, show:

```
[2/4] Fix SQL Injection — completed (6/6 tasks)
```

For each initiative, execute its `phases` array in order. Each phase has specific agent assignments and artifact outputs.

### Phase Execution Reference

For each phase in the initiative's `phases` array, execute it according to these rules:

**Phase: `research`**
Spawn researcher agent (Priya or Sarah per cast) to investigate and produce findings. **Artifact:** the project directory as `research.md`.

**Phase: `product-spec`**
Spawn Marcus to write product requirements + acceptance criteria. **Artifact:** the project directory as `product-spec.md`.

**Phase: `design`**
Spawn designer agent (Sarah) to read the codebase and write a technical approach. Include any prior phase artifacts (research, product-spec) as context. **Artifact:** the project directory as `design.md`.

**Phase: `keyword-research`**
Spawn Priya to research target keywords, search intent, competitor content gaps, and recommended topics. **Artifact:** the project directory as `keyword-research.md`.

**Phase: `outline`**
Spawn Priya to create a content outline -- structure, headings, target keywords per section, internal linking strategy. Include keyword research artifact as context. **Artifact:** the project directory as `outline.md`.

**Phase: `clarification`**
Pre-build Q&A stolen from ChatDev's dual-agent dehallucination pattern (40% error reduction). Spawn the engineer with all context (scope, design output, audit findings). Engineer outputs 3-5 specific clarifying questions about scope boundaries, edge cases, integration points, and ambiguous requirements. Spawn the designer/auditor from the previous phase to respond. **Artifact:** the project directory as `clarification.md`.

**Phase: `build`**
Spawn engineer agent(s) with initiative scope + all prior phase artifacts + audit findings + verify command. For migration initiatives (phases include research + design + build), the build is INCREMENTAL: engineer executes one step at a time, running verify between each step. **Artifact:** the project directory as `build.md`.

**Phase: `draft`**
Spawn engineer agent to write the actual content (MDX files, page components) following the outline artifact. **Artifact:** the project directory as `draft.md`.

**Phase: `seo-review`**
Spawn Priya to review the draft for SEO quality -- meta tags, keyword density, structured data, internal links, readability. **Artifact:** the project directory as `seo-review.md`.

**Phase: `review`**
For each reviewer in the initiative's `cast.reviewers` array, spawn the reviewer agent to review the changes. Collect all review JSONs. If ANY reviewer returns "critical", trigger the retry logic. **Artifact:** the project directory as `review.md`.

**Phase: `tech-review`**
Spawn Sarah to review code quality + architecture. **Artifact:** the project directory as `tech-review.md`.

**Phase: `product-review`**
Spawn Marcus to verify it meets the product spec. **Artifact:** the project directory as `product-review.md`.

**After the last phase:** If any initiative phase produced UI changes, trigger UX verification (see "UX Verification Phase" below).

**For research-only initiatives** (phases = `["research"]`): After the research phase, write the report to `.context/reports/` as well.

### Agent Spawn Rules

> **Process cleanup:** When spawning CLI agents (`claude -p --agent ...`), track child PIDs so they get killed if the directive session exits unexpectedly. Without this, orphaned agent processes accumulate and saturate API rate limits.

**CLI spawn pattern with cleanup trap:**

```bash
# Set up cleanup trap ONCE at the start of Step 5
CHILD_PIDS=()
cleanup_children() {
  for pid in "${CHILD_PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
}
trap cleanup_children EXIT

# For each CLI spawn, track the PID:
CLAUDECODE= claude -p --agent riley --model sonnet --dangerously-skip-permissions --no-session-persistence "prompt" > /tmp/riley-output.txt 2>&1 &
CHILD_PIDS+=($!)
wait $!
```

If the session gets killed (context limit, timeout, user cancels), the trap fires and kills all child processes. No more zombies.

**All named agents** (C-suite and specialists): Use the agent's named `subagent_type` — e.g., `subagent_type: "sarah"`, `subagent_type: "riley"`, `subagent_type: "jordan"`, etc. The personality file is auto-loaded by the agent system. Do NOT manually paste personality file contents into the prompt — just use the named type.

Available named `subagent_type` values:
- **C-suite**: `"sarah"`, `"marcus"`, `"priya"`, `"morgan"`, `"alex"`
- **Specialists**: `"riley"` (frontend), `"jordan"` (backend), `"casey"` (data), `"taylor"` (content), `"sam"` (QA/investigation/review), `"devon"` (full-stack)

Specialists receive engineer-style instructions (scope, DOD, audit findings, verify command) in their task prompt — the personality is already loaded via the type.

**Fallback assignments** (when no specific specialist is assigned):
- `"builder": "devon"` in cast → `subagent_type: "devon"` (Full-Stack Engineer, handles broad/cross-domain scope)
- Unnamed auditor (no named auditor assigned) → `subagent_type: "sarah"` (CTO handles unassigned audits)
- Unnamed reviewer (no named reviewer assigned) → `subagent_type: "sam"` (QA handles unassigned reviews)

All agents are named agents with personality files. There are no generic role agents.

**Engineer/builder agents** (any specialist or `"devon"`): Spawn with:
- Initiative scope (from Morgan's plan)
- Initiative definition_of_done (from Morgan's plan) — the engineer must know acceptance criteria BEFORE building
- Audit findings (from Step 3b): active file list, recommended approach, baseline
- Design output (if available from earlier phases)
- Verify command
- Instruction: "Self-organize your work based on the audit findings and scope. Run the verify command when done."
- **Initiative instruction**: "After completing the build, report BOTH what you built AND what you think is still missing or broken. List specific follow-ups you'd propose — gaps in the UX, edge cases not covered, related features that should exist but don't. This is not optional — every build report must include a `proposed_improvements` section."
- **User-perspective instruction**: "Before reporting completion, mentally walk through the feature as if you are the CEO using it for the first time. Ask yourself: Can I click this? Where does it go? Does the number match reality? Is anything a dead end? Include a `user_walkthrough` section in your build report describing what the CEO would experience step-by-step."

**Engineer clarification prompt** (for complex processes only — prepend to the engineer's build prompt when a clarification phase precedes the build):

```
Before building, you reviewed the scope and design and asked clarifying questions. Here are the answers:

{clarification Q&A from the clarification phase artifact}

Use these clarifications to guide your implementation. If the answers revealed scope changes or additional requirements, incorporate them.
```

**All agents** get:
- `subagent_type`: the agent's named type (see above) — always use a named agent, never generic types
- `model: "opus"`
- `.context/preferences.md` — CEO standing orders
- `.context/vision.md` guardrails section — hard constraints
- `.context/lessons/` topic files (load only what's relevant to the agent's role):
  - **Engineers**: `.context/lessons/agent-behavior.md` + `.context/lessons/skill-design.md`
  - **Sarah (auditor/reviewer)**: `.context/lessons/agent-behavior.md` + `.context/lessons/review-quality.md`
  - **Marcus (product reviewer)**: `.context/lessons/review-quality.md`
  - **Morgan (process reviewer)**: `.context/lessons/orchestration.md` + `.context/lessons/review-quality.md`
  - **Priya (content/growth)**: `.context/lessons/agent-behavior.md`

### UX Verification Phase (mandatory for UI work)

**When:** After the build + review phases complete for any initiative where the audit's `active_files` list contains files matching UI patterns: `*.tsx`, `*.jsx`, `*.css`, `*.scss`, `*.html`, `tailwind.config.*`, `globals.css`, or files under `pages/`, `app/`, `components/`, `layouts/`, or `styles/` directories. This is NOT a subjective judgment call — if the file patterns match, UX verification is REQUIRED.

**How:** The orchestrator (you) must personally verify the changes work from the CEO's perspective using browser automation tools (mcp__claude-in-chrome__*). This is NOT delegated to a subagent — Chrome MCP tools only work in the main session.

**UX verification checklist:**
1. Navigate to every page/component that was modified
2. Click every clickable element — verify it does something useful (no dead-end UI)
3. Check that data displayed matches the backend (numbers, counts, lists)
4. Test the "9am CEO workflow": open dashboard → see what happened → click into detail → know what to do
5. Take screenshots as evidence

**If UX verification fails:** Fix the issues immediately (spawn another engineer if needed), then re-verify. Do NOT skip to the next initiative with broken UI.

**Visual feedback loop (MANDATORY for game goal):** When the initiative is under the `game` goal AND touches visual rendering (sprites, tiles, furniture, Canvas drawing), the standard UX verification is NOT sufficient. Instead:
1. After the build phase, take screenshots of the game at multiple zoom levels (1x, 2x, 4x)
2. Compare visually against the quality bar in `.context/goals/game/context.md`
3. If the visual quality doesn't match the reference repos (pixel-agents, claw-empire), spawn the builder again with the screenshot and specific feedback ("the desk needs wood grain texture", "the character needs more detail in the hair", etc.)
4. Iterate until the visual quality matches. There is no maximum iteration count — keep going until it looks right.
5. This applies to every visual change, not just the first build.

This is a CEO mandate. Slow is fine. Ugly is not.

**Skip UX verification if:** The initiative is backend-only, research-only, or doesn't touch any user-facing code.

**When running as a CLI session (no Chrome MCP):** Log the UI checks that need manual verification in the directive digest. The CEO can run them from the dashboard or game UI. The directive is NOT complete until UI review passes.

### User-Perspective Review (mandatory for all initiatives)

Separate from code review. After the reviewer checks code quality, the reviewer ALSO evaluates the work from the end-user's perspective. This catches the gap where code compiles but the user experience is broken.

**Add to every reviewer prompt:**

```
SEPARATE FROM CODE REVIEW — also evaluate this work from the CEO/end-user perspective:
1. Walk through the initiative's `user_scenario`: "{user_scenario from Morgan's plan}". Does the build actually deliver this experience?
2. If this were shipped today, would the CEO's workflow actually improve?
3. What did the engineer build that technically works but misses the user's real need?
4. What's MISSING that the directive didn't ask for but the user clearly needs?
5. Are there dead-end UI elements (clickable-looking things that do nothing)?
6. Does the data flow make sense end-to-end (not just "does the component render")?

Include a `user_perspective` section in your review JSON:
{
  "user_perspective": {
    "workflow_improvement": "yes | partial | no — does this actually help the user?",
    "missing_features": ["things the user needs but weren't built"],
    "dead_ends": ["UI elements that look interactive but aren't"],
    "data_integrity": ["data that displays but doesn't match reality"]
  }
}
```

**DOD verification** (mandatory if initiative has definition_of_done):

```
DEFINITION OF DONE VERIFICATION — check EVERY criterion:
For each item in this initiative's definition_of_done array, verify whether it has been met.

Include a `dod_verification` section in your review JSON:
{
  "dod_verification": {
    "criteria": [
      {"criterion": "the DOD text", "met": true, "evidence": "what you observed that confirms/denies this"}
    ],
    "all_met": true
  }
}

If ANY criterion is not met, set review_outcome to "fail". If a criterion violation would breach a guardrail (SEO, security, data integrity), set review_outcome to "critical".
```

**CEO corrections check** (mandatory for all reviews):

```
CEO CORRECTIONS CHECK — MANDATORY:
Read .context/preferences.md (specifically the ## Standing Corrections section). For each standing correction:
1. Does this initiative's work touch anything related to this correction?
2. If yes, does the implementation respect the correction?
3. If it violates a correction, this is automatically review_outcome: "critical".

Include a `corrections_check` section in your review JSON:
{
  "corrections_check": {
    "corrections_reviewed": 4,
    "violations": []
  }
}
```

**Review completeness** (mandatory for all reviews):

```
REVIEW COMPLETENESS — use this structured output:
{
  "review_outcome": "pass | fail | critical",
  "code_quality": {"issues": [], "severity": "none | minor | major"},
  "user_perspective": { ... },
  "dod_verification": { ... },
  "corrections_check": { ... },
  "surfaces_checked": ["list every file, endpoint, UI surface, or data flow you actually inspected"],
  "what_is_missing": ["things the directive asked for that aren't present in the build"],
  "regression_risks": ["existing functionality that could break from these changes"]
}

A review_outcome of "pass" requires: ALL DOD criteria met, ZERO corrections violations, user_perspective.workflow_improvement is "yes" or "partial", and no major code quality issues.
```

**This is NOT optional.** Every review must include user-perspective evaluation. A review that only checks code quality but ignores user experience is incomplete.

Check the audit findings for this initiative. If `active_files` is empty and findings indicate nothing to fix, **skip the initiative** — set status to `skipped` and continue to the next. Log: `[N/M] {title} — skipped (audit found nothing to fix)`.

**Checkpoint:** Update this initiative's `status` to `"in_progress"` and `current_phase` to the first phase in its `phases` array.

### After Each Phase

- If an agent fails or reports a blocker: **skip remaining tasks in this initiative**, log the error, continue to next initiative
- If a reviewer finds issues: **log them as non-fatal findings** (don't block). Include in digest.

**Artifact:** Write the phase output to `.context/goals/{goal}/projects/{project}/{directive-name}/{initiative-id}/{phase}.md`.

**Checkpoint:** Update the initiative's `phases_completed`, `current_phase`, and `artifact_paths` in the checkpoint. Set `current_step: "step-5"`.

**After the review phase specifically:** Also write the reviewer's `dod_verification` output to the checkpoint's initiative entry. This is MANDATORY for heavyweight/strategic directives — Step 5b (Review Verification) checks this field to enforce DOD compliance. If the reviewer's JSON output includes a `dod_verification` section, copy it into `initiatives[].dod_verification` in the checkpoint. If the reviewer did not include `dod_verification`, write `null` (Step 5b will flag this as a violation).

### Conditional Retry (review_outcome = critical)

If ANY reviewer returns `review_outcome: "critical"`, attempt ONE retry:
1. Re-spawn the engineer with the critical reviewer's issues as fix instructions
2. Re-run ONLY the reviewer(s) that returned "critical" — don't re-run reviewers that already passed
3. If still critical after retry, mark initiative as `partial` and continue

Maximum 1 retry per initiative. If all reviewers passed or got non-critical issues, no retry.

**What constitutes "critical":**
- Any DOD criterion not met that relates to a guardrail (SEO, security, data integrity)
- Any Standing Correction violation
- Security vulnerability introduced by the build
- Data loss or corruption risk
- Build that's fundamentally wrong approach (not just missing polish)

**What is NOT critical (just "fail"):**
- DOD criteria not met but no guardrail impact
- Missing edge case handling
- Code quality issues (naming, complexity, duplication)
- Incomplete coverage of scope (partial work)

### After Each Initiative

Log completion status: completed / partial / skipped / failed.

**Checkpoint:** Update the initiative's `status` to its final value (`completed`, `partial`, `skipped`, or `failed`). Set `current_phase: null`. If this is the last initiative, set `current_step: "step-6"`.

Collect `proposed_improvements` from the engineer's build report. These are ideas the builder had while working — features that should exist, edge cases not covered, UX gaps. Include them in the digest and present to the CEO in Step 7.

### Finalize project.json (after all initiatives complete)

The project.json was created in Step 3 (Morgan planning) with tasks in `pending` status. Now finalize it with execution results:

1. **Read the existing project.json** from `.context/goals/{goal_folder}/projects/{directive-name}/project.json`

2. **Update each task** with execution results:
   - `status`: `"completed"` | `"failed"` | `"skipped"` based on initiative outcome
   - `agent`: array of agent names who performed the work (from the cast — NEVER leave as `[]` for completed tasks)
   - `dod`: update each criterion's `met` from the reviewer's `dod_verification` output

3. **Update project-level DOD criteria** with verification results:
   - `met`: true/false based on reviewer's `dod_verification` output

4. **Update project status**: if all tasks completed, set `"status": "completed"` and `"completed": "{current ISO timestamp}"`. Do NOT leave as `"in_progress"` when all work is done.

5. **If project.json doesn't exist** (legacy directive or pipeline error): create it from scratch using Morgan's plan + execution results. Log a warning — this should not happen if Step 3 ran correctly.

6. **For each completed initiative, also update directive.json:**
   - Add `goal-id/project-id` to `produced_projects` array

This ensures bidirectional links: project -> directive (via `source_directive`) and directive -> project (via `produced_projects`).

### Step 5b: Review Verification (MANDATORY)

**Before proceeding to Step 6 (wrapup), verify that reviews actually happened.** This is the enforcement gate — do NOT skip this step.

For each initiative that has status `completed` or `partial`:

1. **Check review artifacts exist** — look for `review.md` (or `tech-review.md` / `product-review.md`) in the initiative's artifact directory
2. **Check DOD verification exists** — the reviewer's output must include a `dod_verification` section with each criterion marked `met: true` or `met: false`
3. **Check review outcome** — at least one reviewer must have returned a `review_outcome` of `pass`

**If any check fails:**
- Log which initiative is missing reviews: `[REVIEW MISSING] {initiative title} — no review artifact / no DOD verification`
- **Do NOT proceed to Step 6.** Go back and run the missing review phase for that initiative.
- If the review was skipped because the build failed, that's acceptable — log it and continue.

**If all checks pass:**
- Log: `[REVIEWS VERIFIED] All {N} initiatives have review artifacts and DOD verification`
- Proceed to Step 6.
