<!-- Reference: digest.md | Source: SKILL.md restructure -->

# Digest Report Template

Report file format:

```markdown
# Directive Report: {goal title}

**Date**: {today}
**Directive**: {directive filename}
**Planned by**: Morgan Park (COO)

## Summary

{1-2 sentence overview of what was accomplished}

## Definition of Done Assessment

### {Task Title}
- [x] {criterion 1} — MET
- [x] {criterion 2} — MET
- [ ] {criterion 3} — NOT MET ({reason})

(repeat for each task)

## Tasks

### {Task Title} — {status: completed/partial/skipped/failed}
- **Phases**: {phases list}
- **Team**: {who was involved}
- **Scope**: {what was accomplished}
- **Files changed**: {list}
- **Audit baseline**: {what the audit found before work started}
- **Review findings**: {summary of reviewer feedback, if any}
- **Notes**: {any blockers, partial work, or follow-ups}

(repeat for each task)

## Follow-Up Actions

### Auto-Executed (low risk — done, just FYI)
- {action} — {result}

### Auto-Executed (medium risk — done, revert commands below)
- {action} — {result}

### Backlogged (high risk — written to goal backlog)
- {action} — Added to {goal}/backlog.json

## Revert Commands

{Copy-pasteable commands to undo each auto-executed medium-risk follow-up action. The CEO can run any of these to revert a specific action without affecting other changes.}

| # | Action | Revert Command |
|---|--------|----------------|
| 1 | {medium-risk action description} | `git checkout {hash} -- {file}` |
| 2 | {medium-risk action description} | `rm {file}` |

{If no medium-risk follow-ups were auto-executed: "No medium-risk actions — no revert commands needed."}

{IMPORTANT: Every revert command must be tested before inclusion. The engineer generating these commands must verify they actually work — untested revert commands are worse than no revert commands.}

## Agent-Proposed Improvements

{Collect all `proposed_improvements` from engineer build reports. These are gaps, missing features, and edge cases identified by agents during the build — not assigned work, but task from the builders.}

- {improvement description} — proposed by {agent/task}
- {improvement description} — proposed by {agent/task}

{If no improvements were proposed, note: "No improvements proposed — agents completed assigned work only." This is a signal that the task instruction isn't working.}

## Corrections Caught

{Aggregate corrections_check data from all task reviews. For each violation found and fixed during the build cycle:}

| Correction | Task | Reviewer | Resolution |
|------------|-----------|----------|------------|
| {Standing Correction #N: description} | {task title} | {who caught it} | {Fixed in retry / Noted for follow-up} |

- **Corrections reviewed**: {total across all tasks} (out of {N} standing corrections × {M} tasks)
- **Violations found**: {count}
- **Violations fixed**: {count fixed during retry vs noted}

{If no violations: "All standing corrections verified across all tasks. No violations found — the guardrails held."}

## UX Verification Results

{Results from browser testing after UI tasks:}
- {page/flow tested}: {pass/fail} — {what was found}
- Screenshots: {list of screenshots taken}

{If no UI work: "No UI tasks — UX verification skipped."}

## Potentially Stale Docs

{Output from `.claude/hooks/detect-stale-docs.sh` — lists docs that reference files modified in this directive but were not themselves updated. These docs may contain outdated information.}

- {doc path} -> references modified: {list of modified files it references}
- {doc path} -> references modified: {list of modified files it references}

{If no stale docs detected: "No potentially stale docs detected."}

## Self-Assessment

### Audit Accuracy
- Findings confirmed by build: {count}/{total}
- Findings that were wrong or irrelevant: {list}
- Issues found during build that audit missed: {list}

### Build Success
- Type-check passed: {yes/no}
- Tasks completed: {count}/{total}
- Build failures: {list if any}

### UX Verification
- UI tasks verified in browser: {count}/{total UI tasks}
- Dead-end UI found: {count} (elements that look clickable but do nothing)
- Data mismatches found: {count} (numbers/counts that don't match backend)
- Issues fixed during verification: {list or "none"}

### Agent Task
- Improvements proposed by agents: {count}
- Improvements worth pursuing: {list or "none yet — need more data"}
- Agents that proposed nothing: {list — these agents need better prompting}

### Risk Classification
- Low-risk auto-executes that caused problems: {list or "none"}
- Items that should have been classified differently: {list or "none"}

### Challenge Accuracy
- C-suite challenges: {count endorsed, count challenged, count flagged}
- Challenges that proved correct in hindsight: {list or "N/A — first run"}
```
