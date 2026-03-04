<!-- Pipeline doc: 10-wrapup.md | Source: SKILL.md restructure -->

## Step 6: Update Goal OKRs (if applicable)

If `.context/goals/{goal_folder}/goal.json` has `okrs`, assess any existing KR statuses based on initiative outcomes. Do NOT create new KRs from directive work — goal-level OKRs are managed separately at the quarterly level.

If goal.json has no `okrs` or it is empty, skip this step.

## Step 6b: Process Follow-Up Actions

Collect all `follow_ups` from the audit findings (Step 3b) across all initiatives. Process them by risk level:

### Low Risk — Auto-Execute

Spawn an engineer agent to execute all low-risk follow-ups in a single batch. The agent receives:
- The list of low-risk follow-up actions with affected files
- `.context/preferences.md` and `.context/lessons/*.md` topic files
- Verify command: `npm run type-check`
- Instruction: "Execute these cleanup actions. They've been classified as low-risk (safe to do without CEO approval). Run the verify command when done. Report what you changed."

**Low-risk examples:** Delete dead code files, remove unused imports, delete unused variables, create backlog tickets, update OKR status files, fix typos.

### Medium Risk — Auto-Execute + Report with Revert Commands

Medium-risk follow-ups auto-execute without CEO approval, matching the low-risk pattern. The safety net is revert commands in the digest — the CEO can undo any action by copy-pasting the revert command.

Spawn an engineer agent to execute all medium-risk follow-ups in a single batch. The agent receives:
- The list of medium-risk follow-up actions with affected files
- `.context/preferences.md` and `.context/lessons/*.md` topic files
- Verify command: `npm run type-check`
- Instruction: "Execute these follow-up actions. They've been classified as medium-risk (auto-executed, CEO can revert). For EACH action: (1) note the current git state before the change, (2) execute the action, (3) run the verify command, (4) capture a revert command. Report what you changed and provide revert commands."

**Revert command generation:** After each medium-risk action, the engineer captures the information needed to undo it:
- For file modifications: `git checkout {commit-hash} -- {file-path}` (using the commit hash or HEAD before the change)
- For new files: `rm {file-path}`
- For deleted files: `git checkout {commit-hash} -- {file-path}`
- For multi-file changes: a combined revert command or script

The revert commands are included in the digest (see "Revert Commands" section in digest template).

**Medium-risk examples:** Fix auth gaps, add input validation, add middleware, refactor modules, change API behavior, update dependencies.

### High Risk — Write to Backlog

For each high-risk follow-up, write it to `.context/goals/{goal_folder}/backlog.json` as a new item with structured fields:

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
- All initiatives were skipped or failed (follow-ups may be invalid)

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
- Read `.context/directives/$ARGUMENTS.json` (or `.context/directives/$ARGUMENTS.json` if already archived)
- Set `report` to the report filename without extension (e.g., `"improve-security-2026-03-01"`)
- Also update `produced_features` if any features were registered in the "After Each Initiative" step but the directive.json wasn't updated yet

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

**Format:** For failure-mode lessons, include what was tried and why it failed — not just the fix. Example: `**Morgan produces prose before JSON despite "output ONLY JSON" instructions.** Fix: stronger preamble ("first character must be {") AND parse defensively.` For stable patterns/facts, a single sentence is fine.

Read existing topic files first to avoid duplicates.

**Consolidation trigger:** After every 10th directive (count reports in `.context/reports/`), re-read all reports and consolidate recurring patterns into the topic files. Remove one-off entries that haven't recurred. This keeps lessons actionable, not bloated.

**Personality evolution trigger:** On the same 10th-directive cycle, also update the `## Learned Patterns` section in each agent's personality file (`.claude/agents/*.md`). For each agent, extract lessons from `.context/lessons/` topic files that are relevant to their role:
- **Morgan** — operational patterns (sequencing, scoping, casting, compression)
- **Sarah** — technical patterns (audit accuracy, review findings, schema issues, build failures)
- **Marcus** — product patterns (UX verification, user perspective, feature management)
- **Priya** — growth patterns (content strategy, SEO, browser testing)

Replace the contents between `## Learned Patterns` and the next `##` heading. Keep each pattern as a single bullet with bold lead + explanation. Max 8 patterns per agent — keep only the most impactful.

## Step 6f: Re-index State

The dashboard reads source files directly via glob + chokidar. No indexer step needed. Changes to goal.json, project.json, directive.json, and backlog.json are picked up automatically.

**Checkpoint:** Update `wrapup.digest_path` to the report path. Set `current_step: "step-7"`.

**Cleanup:** Delete the checkpoint file (`rm .context/directives/checkpoints/{directive-name}.json`). The directive is complete — the digest and artifacts serve as the permanent record.

## Step 6g: Complete Directive

Update the directive JSON to mark completion:

- Read `.context/directives/$ARGUMENTS.json`
- Set `status` to `"completed"`
- Set `completed` to today's date (`YYYY-MM-DD`)
- Set `report_summary` to the digest filename
- Write the updated JSON back

Directives stay in `directives/` — status is tracked in JSON, not by directory location.

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
| All challengers endorse | Note in Step 4, proceed normally. |
| A challenger challenges the directive | Highlight prominently in Step 4. CEO decides whether to proceed. |
| Morgan's plan doesn't parse as JSON | Stop, show the raw output, ask CEO to intervene |
| Worktree creation fails | Warn CEO, work in the main repo instead. All changes are uncommitted, CEO can review with `git diff`. |
| Audit finds nothing for ALL initiatives | Skip to Step 6c, generate digest noting "no issues found", recommend CEO review the directive scope. |
| CEO rejects the plan | Stop. CEO can re-run with adjusted directive or manually edit the plan |
| Agent fails mid-initiative | Skip remaining tasks in that initiative, continue to next. Log in digest. |
| Reviewer finds issues | Non-fatal. Include in digest. CEO decides whether to address. |
| Initiative is blocked | Skip, note in digest, continue to next initiative |
| All initiatives fail | Generate digest showing failures, recommend CEO review |
| Audit finds nothing to fix | Remove initiative from plan, note in digest |
| Context exhaustion mid-directive | Checkpoint file preserves state. Re-run `/directive {name}` to resume. |
| Brainstorm agents disagree on approach | Present all approaches with trade-offs in clarifying questions. Let CEO pick direction. Don't synthesize conflicting approaches into a compromise. |

## Rules

### NEVER
- Skip triage (Step 0b) — must classify before choosing the process weight
- Run heavyweight process for lightweight work (wastes tokens and CEO attention)
- Run lightweight process for heavyweight work (skips critical safety gates)
- Execute heavyweight directives without CEO approval of the combined plan (Morgan + audit)
- Skip the planning phase (Morgan evaluation)
- Skip the technical audit (Step 3b) — always verify scope before CEO approval
- Skip the challenge step (Step 2b) — Morgan's inline challenge is always required; separate challengers only for heavyweight/controversial
- Have Morgan scan the codebase (she plans strategy, not code)
- Run initiatives in parallel without checking active_files overlap (see Parallelism Analysis in 09-execute-initiatives.md) — initiatives sharing files MUST be sequential; only non-overlapping initiatives in the same priority tier can be parallelized
- Treat reviewer findings as blockers (they're advisory)
- Accept a review that only covers code quality without user-perspective evaluation
- Spawn agents without their personality files (for named agents)
- Commit, push, checkout, or reset git state (CEO manages git). Note: `git checkout -b` (Step 4b), `git worktree add` (Step 4b), and `git diff --stat` (Step 7) are allowed — they're read-only or isolated operations.
- Add clarification phase to simple initiatives with just ["build", "review"] phases — tight scope makes it unnecessary token overhead
- Have the same agent review changes to its own behavior, prompts, or personality (conflict of interest)
- Run strategic process for directives with a clear prescribed approach (that's heavyweight, not strategic)
- Mark a directive as complete when UI review is pending — UI checks must pass first

### ALWAYS
- Triage the directive (Step 0b) before choosing which process to run
- Upgrade to heavyweight if ANY guardrail in vision.md could be affected
- Include Morgan's inline challenge analysis in every plan — separate challengers for heavyweight/controversial only
- Read preferences.md + vision.md guardrails before spawning any agent
- Run technical audit before CEO approval to verify scope
- Read .context/lessons/ topic files before spawning any agent
- Include personality text in named agent prompts
- Include preferences.md + guardrails in all agent prompts
- Include audit findings in engineer prompts (active files, recommended approach)
- Include verify command in engineer prompts
- Include "propose what's missing" instruction in engineer prompts
- Log UI verification checks in the digest when initiatives touch UI code — CEO verifies from dashboard or game
- Include user-perspective evaluation in every reviewer prompt (not just code quality)
- Require `user_walkthrough` in engineer build reports and `user_perspective` in reviewer output
- Process follow-ups by risk level after initiatives complete (Step 6b)
- Run stale doc detection before generating the digest (Step 6c)
- Include stale doc detection results in the digest (Step 6d)
- Include self-assessment metrics in the digest (Step 6d)
- Include agent-proposed improvements in the digest (Step 6d)
- Include UX verification results in the digest (Step 6d)
- Update lessons if the directive produced new learnings (Step 6e)
- Log initiative status after each completes
- ~~Generate a digest even if everything fails~~ _Hook-enforced: stop hook blocks if no digest artifact for medium+ weight_
- Dashboard reads source files directly — no re-indexing needed
- Show the CEO what happened at the end
- Write checkpoint after every phase transition (Step 3, 4, 4b, 4c, 5 phases, 6)
- Write artifact files after every phase output in Step 5
- Delete checkpoint file after digest is written (Step 6f cleanup)
- Update directive.json status to "completed" after digest is written (Step 6g)
- Include clarification phase before build when initiative has design/research/product-spec phases (Morgan's phase list should already include it)
- Include initiative's definition_of_done in every reviewer prompt
- Include Standing Corrections check in every reviewer prompt
- Match reviewers to the domain being changed (process→Morgan, product→Marcus, architecture→Sarah)
- Never assign an agent to review changes to its own behavior or prompts
- Use file-pattern matching (*.tsx, *.jsx, *.css, etc.) to detect UI-touching initiatives — don't rely on subjective judgment
- Cast multiple reviewers when initiative crosses domains (UI + backend, process + product)
- Classify as strategic when the directive states a problem without prescribing an approach AND the work has lasting architectural/process consequences
