<!-- Reference: failure-handling.md | Source: SKILL.md restructure -->

# Failure Handling

| Situation | Action |
|-----------|--------|
| Challenger's output doesn't parse as JSON | Log the error, continue. Challenge is advisory, not blocking. |
| All challengers endorse | Note in approval presentation, proceed normally. |
| A challenger challenges the directive | Highlight prominently in approval presentation. CEO decides whether to proceed. |
| Morgan's plan doesn't parse as JSON | Stop, show the raw output, ask CEO to intervene |
| Worktree creation fails | Warn CEO, work in the main repo instead. All changes are uncommitted, CEO can review with `git diff`. |
| Audit finds nothing for ALL tasks | Skip to stale doc detection, generate digest noting "no issues found", recommend CEO review the directive scope. |
| CEO rejects the plan | Stop. CEO can re-run with adjusted directive or manually edit the plan |
| Agent fails mid-task | Skip remaining tasks in that task, continue to next. Log in digest. |
| Reviewer finds issues | Non-fatal. Include in digest. CEO decides whether to address. |
| Task is blocked | Skip, note in digest, continue to next task |
| All tasks fail | Generate digest showing failures, recommend CEO review |
| Audit finds nothing to fix | Remove task from plan, note in digest |
| Context exhaustion mid-directive | directive.json preserves state. Re-run `/directive {name}` to resume. |
| Brainstorm agents disagree on approach | Present all approaches with trade-offs in clarifying questions. Let CEO pick direction. Don't synthesize conflicting approaches into a compromise. |
