# Brainstorm Synthesis — Game HUD Tabs Improvement

## Participants
- Marcus (CPO): Product/UX approach
- Sarah (CTO): Architecture/feasibility audit

## Key Convergence Points

1. **All data already exists in the store** — zero backend work. `workState.backlogs`, `workState.conductor.directives`, `workState.conductor.discussions/research/lessons` are all populated but not rendered.

2. **Inbox must surface directive `awaiting_completion` + P0 backlog** — both agree this is the highest-priority fix (empty inbox when things need attention is broken).

3. **Intel should be renamed** — both suggest "Ops" or "Directives". Current name misleads users into expecting scout intelligence.

4. **Wiki should surface more than lessons** — Marcus wants vision.md + agent profiles; Sarah wants discussions + research artifacts. Both are valid.

5. **Projects needs backlog section** — under each goal, show P0/P1/P2 backlog items.

6. **Don't unify tabs into a single feed** — tab structure works, problem is insufficient data per tab.

## Critical Feasibility Flag (Sarah)
- `DirectiveRecord.status` uses `LifecycleState` enum (pending/in_progress/completed) — does NOT include `awaiting_completion`
- `awaiting_completion` only exists on `DirectiveState` (the live pipeline object)
- For inbox: check `directiveState.status === 'awaiting_completion'`
- For directive history: use `workState.conductor.directives` with LifecycleState

## Priority Order (Marcus)
1. Inbox (broken — empty when things need attention)
2. Intel rename + directive history
3. Projects backlog
4. Wiki expansion
5. Team polish (skip — already good)

## Approach Summary
Wire existing store data to existing panel components using existing styling primitives. No new server endpoints, no new state watchers, no new shared components. Pure frontend rendering changes across 4 panel files + 1 tab rename in SidePanel.tsx.
