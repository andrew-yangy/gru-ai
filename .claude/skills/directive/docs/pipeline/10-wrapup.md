<!-- Pipeline doc: 10-wrapup.md | Source: SKILL.md restructure -->

## Step 6b: Process Follow-Up Actions

Collect all `follow_ups` from the audit findings (audit step) across all tasks. Process them by risk level:

### Low Risk — Auto-Execute

Spawn an engineer agent to execute all low-risk follow-ups in a single batch. The agent receives:
- The list of low-risk follow-up actions with affected files
- `.context/preferences.md` and `.context/lessons/*.md` topic files
- Instruction: "Execute these cleanup actions. They've been classified as low-risk (safe to do without CEO approval). Report what you changed."

**Low-risk examples:** Delete dead code files, remove unused imports, delete unused variables, create backlog tickets, update OKR status files, fix typos.

### Medium Risk — Auto-Execute + Report with Revert Commands

Medium-risk follow-ups auto-execute without CEO approval, matching the low-risk pattern. The safety net is revert commands in the digest — the CEO can undo any action by copy-pasting the revert command.

Spawn an engineer agent to execute all medium-risk follow-ups in a single batch. The agent receives:
- The list of medium-risk follow-up actions with affected files
- `.context/preferences.md` and `.context/lessons/*.md` topic files
- Instruction: "Execute these follow-up actions. They've been classified as medium-risk (auto-executed, CEO can revert). For EACH action: (1) note the current git state before the change, (2) execute the action, (3) capture a revert command. Report what you changed and provide revert commands."

**Revert command generation:** After each medium-risk action, the engineer captures the information needed to undo it:
- For file modifications: `git checkout {commit-hash} -- {file-path}` (using the commit hash or HEAD before the change)
- For new files: `rm {file-path}`
- For deleted files: `git checkout {commit-hash} -- {file-path}`
- For multi-file changes: a combined revert command or script

The revert commands are included in the digest (see "Revert Commands" section in digest template).

**Medium-risk examples:** Fix auth gaps, add input validation, add middleware, refactor modules, change API behavior, update dependencies.

### High Risk — Write to Backlog

For each high-risk follow-up, create a new directive in `.context/directives/{follow-up-id}/directive.json` as a pending directive:

```json
{
  "id": "{kebab-case-action-slug}",
  "title": "{action title}",
  "status": "pending",
  "priority": "P1",
  "source_directive": "$ARGUMENTS",
  "context": "{what the audit found + risk rationale}",
  "created": "{today YYYY-MM-DD}",
  "updated": "{today YYYY-MM-DD}",
  "promoted_to_feature": null,
  "promoted_at": null
}
```

Set `source_directive` to the current directive name so the backlog item is traceable back to this directive. This enables the cross-reference system to answer "which directive created this backlog item?"

**High-risk examples:** Schema changes, new API endpoints, infrastructure changes, auth flow changes, anything user-facing, anything that could affect revenue or SEO.

### Skip follow-ups if:
- The directive is research-only (no code changes expected)
- No follow-ups were identified in the audit
- All tasks were skipped or failed (follow-ups may be invalid)

## Step 6c: Detect Potentially Stale Docs

Run the stale documentation detection hook to find docs that reference files modified in this directive but were not themselves updated:

```bash
.claude/hooks/detect-stale-docs.sh --from-diff main
```

Or, if working in a worktree with a directive branch:

```bash
.claude/hooks/detect-stale-docs.sh --from-diff directive/$ARGUMENTS
```

The script scans `.context/` and `.claude/` docs for literal file path references to modified files, excluding docs that were also modified (zero false positives). Runs in <5 seconds.

Capture the output — it goes into the "Potentially Stale Docs" section of the digest. If the script outputs "No potentially stale docs detected," include that line in the digest section as-is.

## Step 6d: Generate Digest

**This step runs LAST** — after OKRs are updated, follow-ups are processed, and stale docs are detected, so all data is available.

Write a digest to `.context/reports/$ARGUMENTS-{date}.md`.

**After writing the digest**, update directive.json with the report link:
- Read `.context/directives/$ARGUMENTS/directive.json`
- Set `report` to the report filename without extension (e.g., `"improve-security-2026-03-01"`)
- Also update `produced_features` if any features were registered in the "After Each Task" step but the directive.json wasn't updated yet

> See [docs/reference/templates/digest.md](../reference/templates/digest.md) for the full digest report template.

## Step 6e: Update Lessons

If the directive produced new learnings, append them to the appropriate topic file:
- Agent behavior lessons → `.context/lessons/agent-behavior.md`
- Orchestration/planning lessons → `.context/lessons/orchestration.md`
- State/checkpoint/dashboard lessons → `.context/lessons/state-management.md`
- Review/quality lessons → `.context/lessons/review-quality.md`
- Pipeline/skill/repo lessons → `.context/lessons/skill-design.md`
- Project/codebase lessons → `.context/lessons/{topic}.md`

**Only add if:** something unexpected happened, a pattern emerged that prevents future mistakes, or a workaround was needed. Skip if the directive completed cleanly with no surprises.

**Format:** For failure-mode lessons, include what was tried and why it failed — not just the fix. Example: `**The COO produces prose before JSON despite "output ONLY JSON" instructions.** Fix: stronger preamble ("first character must be {") AND parse defensively.` For stable patterns/facts, a single sentence is fine.

Read existing topic files first to avoid duplicates.

**Consolidation trigger:** After every 10th directive (count reports in `.context/reports/`), re-read all reports and consolidate recurring patterns into the topic files. Remove one-off entries that haven't recurred. This keeps lessons actionable, not bloated.

**Personality evolution trigger:** On the same 10th-directive cycle, also update the `## Learned Patterns` section in each agent's personality file (`.claude/agents/*.md`). For each agent, extract lessons from `.context/lessons/` topic files that are relevant to their role:
- **COO** — operational patterns (sequencing, scoping, casting, compression)
- **CTO** — technical patterns (audit accuracy, review findings, schema issues, build failures)
- **CPO** — product patterns (UX verification, user perspective, feature management)
- **CMO** — growth patterns (content strategy, SEO, browser testing)

Replace the contents between `## Learned Patterns` and the next `##` heading. Keep each pattern as a single bullet with bold lead + explanation. Max 8 patterns per agent — keep only the most impactful.

## Step 6f: Re-index State

The dashboard reads source files directly via glob + chokidar. No indexer step needed. Changes to project.json, directive.json are picked up automatically.

**Update directive.json:** Set `wrapup.digest_path` to the report path. Set `current_step: "wrapup"`. Update `pipeline.wrapup.status` to `"completed"` with output summary.

## Step 6g: Mark Directive Awaiting Completion

Update the directive JSON to signal the CEO completion gate. The directive is NOT marked `completed` here -- that happens in the completion step after CEO approval.

### Pre-completion Checks

1. **Browser test check (IC2 fix):** If the directive has `browser_test: true` in any project.json, verify that UI review has been logged. If UI review is pending, do NOT proceed -- log: `[BLOCKED] UI review pending for {project}. Cannot mark awaiting_completion.`
2. **Failed tasks check (IC3 fix):** If any tasks have `failed` or `partial` status, include an explanation in the digest. The CEO must be aware of incomplete work before approving completion.

### Directive JSON
- Read `.context/directives/$ARGUMENTS/directive.json`
- Set `status` to `"awaiting_completion"`
- Set `report_summary` to the digest filename
- Write the updated JSON back

### Project JSON(s)
- For each project in the directive's `produced_projects` array, read its `project.json`
- Do NOT set project status to `"completed"` yet -- that happens in the completion step after CEO approval
- If some tasks are incomplete, note this in the digest with explanations

Directives stay in `directives/` -- status is tracked in JSON, not by directory location.

**Next step:** Proceed to Report to CEO (below), then [completion gate](11-completion-gate.md) for CEO sign-off.

## Step 7: Report to CEO

Show the CEO:
1. The digest summary (not the full file — just the key points)
2. Run `git diff --stat main..directive/$ARGUMENTS` to show ONLY this directive's changes — not pre-existing uncommitted work
3. Any review findings that need attention
4. Recommended next steps
5. The branch name: "Review with `git log directive/$ARGUMENTS` and merge when ready"

## Failure Handling

> See [docs/reference/rules/failure-handling.md](../reference/rules/failure-handling.md) for the full failure handling table.

| Situation | Action |
|-----------|--------|
| Challenger's output doesn't parse as JSON | Log the error, continue. Challenge is advisory, not blocking. |
| All challengers endorse | Note in approval presentation, proceed normally. |
| A challenger challenges the directive | Highlight prominently in approval presentation. CEO decides whether to proceed. |
| The COO's plan doesn't parse as JSON | Stop, show the raw output, ask CEO to intervene |
| Worktree creation fails | Warn CEO, work in the main repo instead. All changes are uncommitted, CEO can review with `git diff`. |
| Audit finds nothing for ALL tasks | Skip to stale doc detection, generate digest noting "no issues found", recommend CEO review the directive scope. |
| CEO rejects the plan | Stop. CEO can re-run with adjusted directive or manually edit the plan |
| Agent fails mid-task | Skip remaining phases in that task, continue to next. Log in digest. |
| Reviewer finds issues | Non-fatal. Include in digest. CEO decides whether to address. |
| Task is blocked | Skip, note in digest, continue to next task |
| All tasks fail | Generate digest showing failures, recommend CEO review |
| Audit finds nothing to fix | Remove task from plan, note in digest |
| Context exhaustion mid-directive | directive.json preserves state (it IS the checkpoint). Re-run `/directive {name}` to resume. |
| Brainstorm agents disagree on approach | Present all approaches with trade-offs in clarifying questions. Let CEO pick direction. Don't synthesize conflicting approaches into a compromise. |

## Rules

### NEVER
- Skip triage — must classify before choosing the process weight
- Run heavyweight process for lightweight work (wastes tokens and CEO attention)
- Run lightweight process for heavyweight work (skips critical safety gates)
- Execute heavyweight directives without CEO approval of the combined plan (COO + audit)
- Skip the planning phase (COO evaluation)
- Skip the technical audit (audit step) — always verify scope before CEO approval
- Skip the challenge step — the COO's inline challenge is always required; separate challengers only for heavyweight/controversial
- Have the COO scan the codebase (the COO plans strategy, not code)
- Run tasks in parallel without checking active_files overlap (see Parallelism Analysis in 09-execute-projects.md) -- tasks sharing files MUST be sequential; only non-overlapping tasks in the same priority tier can be parallelized
- Treat reviewer findings as blockers (they're advisory)
- Accept a review that only covers code quality without user-perspective evaluation
- Spawn agents without their personality files (for named agents)
- Commit, push, checkout, or reset git state (CEO manages git). Note: `git checkout -b` (setup step), `git worktree add` (setup step), and `git diff --stat` (wrapup report) are allowed — they're read-only or isolated operations.
- Add clarification phase to simple tasks with just ["build", "review"] phases -- tight scope makes it unnecessary token overhead
- Have the same agent review changes to its own behavior, prompts, or personality (conflict of interest)
- Run strategic process for directives with a clear prescribed approach (that's heavyweight, not strategic)
- Mark a directive as awaiting_completion when UI review is pending -- UI checks must pass first
- Set directive status to `completed` directly -- always go through `awaiting_completion` first (wrapup step), then CEO approves in completion step

### ALWAYS
- Triage the directive before choosing which process to run
- Upgrade to heavyweight if ANY guardrail in vision.md could be affected
- Include the COO's inline challenge analysis in every plan — separate challengers for heavyweight/controversial only
- Read preferences.md + vision.md guardrails before spawning any agent
- Run technical audit before CEO approval to verify scope
- Read .context/lessons/ topic files before spawning any agent
- Include personality text in named agent prompts
- Include preferences.md + guardrails in all agent prompts
- Include audit findings in engineer prompts (active files, recommended approach)
- Include "propose what's missing" instruction in engineer prompts
- Log UI verification checks in the digest when tasks touch UI code -- CEO verifies from dashboard or game
- Include user-perspective evaluation in every reviewer prompt (not just code quality)
- Require `user_walkthrough` in engineer build reports and `user_perspective` in reviewer output
- Process follow-ups by risk level after tasks complete
- Run stale doc detection before generating the digest
- Include stale doc detection results in the digest
- Include self-assessment metrics in the digest
- Include agent-proposed improvements in the digest
- Include UX verification results in the digest
- Update lessons if the directive produced new learnings
- Log task status after each completes
- ~~Generate a digest even if everything fails~~ _Hook-enforced: stop hook blocks if no digest artifact for medium+ weight_
- Dashboard reads source files directly — no re-indexing needed
- Show the CEO what happened at the end
- Update directive.json after every phase transition (plan, approve, setup, execute phases, wrapup) — it IS the checkpoint
- Write artifact files after every phase output in execute step
- Update directive.json status to "awaiting_completion" after digest is written (wrapup) -- CEO approves in completion step
- Pipeline data stays in directive.json permanently — it's the execution record
- Include clarification phase before build when task has design/research/product-spec phases (the COO's phase list should already include it)
- Include task's definition_of_done in every reviewer prompt
- Include Standing Corrections check in every reviewer prompt
- Match reviewers to the domain being changed (process→COO, product→CPO, architecture→CTO)
- Never assign an agent to review changes to its own behavior or prompts
- Use file-pattern matching (*.tsx, *.jsx, *.css, etc.) to detect UI-touching tasks -- don't rely on subjective judgment
- Cast multiple reviewers when task crosses domains (UI + backend, process + product)
- Classify as strategic when the directive states a problem without prescribing an approach AND the work has lasting architectural/process consequences
