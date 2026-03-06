# Game HUD Data Fix + Quality Polish

## CEO Brief

The game HUD panels are at 39/200 quality. Two critical issues:

### Issue 1: Agent status data is wrong (P0)

The Team panel shows "WORKING (6)" but every agent card displays "Idle" — contradictory and nonsensical.

**Root cause traced**: `agentStatuses` in `GamePage.tsx:142-157` iterates ALL sessions including subagents. When Sarah spawns Devon as a subagent, Devon's subagent session has status='working', so `agentStatuses['Devon'] = 'working'`. But `TeamPanel.tsx:49-51` finds the primary session with `!s.isSubagent && s.status !== 'done'` — that's Devon's own parent session which is 'idle'. StatusChip shows the parent session status → "Idle" while the section header says "WORKING".

**Fix**: In `GamePage.tsx`, the `agentStatuses` computation must filter `!s.isSubagent` so only parent sessions determine an agent's status. Also review `agentSessionInfos` and `agentBusyMap` for the same subagent-inflation bug.

### Issue 2: Panel visual quality needs more work (P1)

The panels improved from 8 → 39 but need to reach production quality. Specific gaps:
- Team panel cards need to show what agents are actually working on (feature/task name), not just agent name + role
- When agents are truly idle, they should be in "Off Duty" not "Working"
- The markdown rendering in Reports panel uses `text-foreground` and `text-muted-foreground` CSS classes that may not resolve correctly on the parchment background
- The `renderBriefMarkdown` headings still reference `text-foreground` class — should use inline parchment colors

## Scope

Files to modify:
- `src/components/game/GamePage.tsx` — fix `agentStatuses`, `agentSessionInfos`, `agentBusyMap` to exclude subagent sessions
- `src/components/game/panels/TeamPanel.tsx` — verify data displays correctly after the fix
- `src/components/game/panels/panelUtils.ts` — fix any remaining CSS class references that don't work on parchment

## Quality Bar

After fixing: Team panel should show correct working/idle split. Agents truly working show "Working" with green chip + what they're doing. Agents idle show in "Off Duty". No contradictions.

## Verification

Open Chrome at localhost:5180/game → click Team → working agents should show green "Working" chip + activity, idle agents should be in Off Duty grid. The count in the section header should match the actual agent statuses shown.
