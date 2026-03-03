# UI — Domain Knowledge

## What This Goal Covers
- Conductor dashboard web application (Next.js)
- File watchers (GoalWatcher, DirectiveWatcher, StateWatcher)
- Real-time visualizations (directive progress, project inventory)
- CEO experience: notifications, report display, drill-down
- Session and sub-agent status UI
- Org page (team structure visualization)

## Key Design Decisions
- Dashboard reads source files directly via glob + chokidar (no indexer)
- CEO should spend <45min/week reviewing reports and approving proposals
- Rich notifications with directive context (not just session IDs)
- Single focused test instruction per UX verification (not a 5-item checklist)

## Origin
Consolidates UI/UX work from the original "conductor-ux" goal and dashboard-related features from "agent-conductor".
