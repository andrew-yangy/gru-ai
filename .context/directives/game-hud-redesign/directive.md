# Game HUD Panel Redesign

## CEO Brief

The game HUD panels are useless for actual CEO work. The current 3 tabs (Team, Decisions, Reports) don't map to how a CEO operates. Team is a flat roster with no activity info. Reports dumps markdown in a scrollable div. There's no way to navigate the company's full knowledge — goals, projects, reports, lessons — from top to details.

The CEO needs: progressive disclosure (scan headlines, drill into details), access to ALL information (not just the latest 5), and panels that answer real questions (who's doing what, what needs me, what's the status, what happened, what do we know).

### New Tab Structure

Replace the current 3 HUD tabs with 5 purpose-built tabs:

| Tab | Icon | Purpose |
|-----|------|---------|
| **Team** | Users | Who's doing what RIGHT NOW — activity feed, not a roster |
| **Inbox** | Bell | What needs CEO attention — approvals, errors, blocks with context |
| **Projects** | FolderKanban | Goals > projects > tasks — drill-down tree with status |
| **Intel** | FileText | Reports and digests — chronological list, click to read full |
| **Wiki** | BookOpen | Lessons and knowledge — topic list, click to read full |

### Tab 1: Team (redesign existing)

Current: flat grid of name + role + dot. Useless.

New: activity-first layout.
- Working agents show prominently: name, colored accent, what they're building (feature/task name from session.feature), current phase, time elapsed.
- Needs-attention agents float to top with visual flag (error, waiting-approval).
- Idle agents collapse to a compact row at the bottom — just names, no big cards.
- Click any agent -> drill into existing AgentPanel detail.

Data: `sessions` + `sessionActivities` from dashboard store. Feature name from `session.feature`.

### Tab 2: Inbox (rename Decisions)

Current: shows approval/error items but lacks context.

New: actionable inbox.
- Each item: who's asking, what they need, feature context, how long waiting.
- Group by urgency: approvals > errors > waiting-input.
- Least change needed — existing DecisionsPanel is close, add context.

### Tab 3: Projects (new)

Current: doesn't exist. No way to see goals/projects from the game.

New: drill-down navigator.
- Level 0 (root): list of goals. Each shows title, project count, active count. If active directive exists, pin at top with pipeline stepper.
- Level 1 (goal): projects under that goal. Title, status, task progress (3/7).
- Level 2 (project): task list with DOD checkmarks, agent, status.
- Back button at each level.

Data: `workState.goals`, project.json data. `directiveState` for active directive.

### Tab 4: Intel (replace Reports)

Current: dumps latest report + 4 older. Can't access all.

New: full report browser.
- Root: chronological list of ALL reports. Title, date, type badge.
- Click any -> full content renders in-panel (remove line limits on renderBriefMarkdown).
- Back button to list.

Data: `workState.conductor.reports`, fetch via `/api/state/artifact-content`.

### Tab 5: Wiki (new)

Current: doesn't exist. Lessons invisible from game.

New: knowledge browser.
- Root: list of lesson files (orchestration, agent-behavior, review-quality, skill-design, state-management, scenarios).
- Click any -> full content renders.
- Back button.

Data: known lesson file paths, fetch via artifact-content endpoint.

### Header Changes

- 5 header buttons: Team, Inbox, Projects, Intel, Wiki
- Remove old `sessions`/`decisions`/`reports` types
- Add new HudPanel values: `team`, `inbox`, `projects`, `intel`, `wiki`
- Keep fullscreen button at far right

### Shared Drill-Down Pattern

All navigable panels share: root list -> click item -> detail view -> back button. The AgentPanel "back" pattern already exists in SidePanel — extend to all panels. Each panel manages its own internal navigation state.

## Files to Modify

- `src/components/game/GameHeader.tsx` — 5 buttons, new HudPanel type
- `src/components/game/GamePage.tsx` — route new panel types
- `src/components/game/SidePanel.tsx` — 5 tabs, route to panels
- `src/components/game/types.ts` — new TileTypes
- `src/components/game/panels/TeamPanel.tsx` — redesign to activity feed
- `src/components/game/panels/DecisionsPanel.tsx` — rename to InboxPanel, add context
- `src/components/game/panels/ProjectsPanel.tsx` — NEW
- `src/components/game/panels/IntelPanel.tsx` — NEW (replaces ReportsPanel)
- `src/components/game/panels/WikiPanel.tsx` — NEW
- `src/components/game/panels/index.ts` — update exports

## Quality Bar

- Parchment theme throughout (PIXEL_CARD, PARCHMENT constants, SectionHeader)
- Every panel answers a real CEO question
- Drill-down works smoothly with back buttons
- Shows real data from dashboard store
- All reports and lessons accessible, not just recent ones

## Verification

Open Chrome at localhost:5180/game:
1. Header shows 5 buttons: Team, Inbox, Projects, Intel, Wiki
2. Team: working agents show what they're building, idle agents compact
3. Projects: drill from goals -> projects -> tasks, back works
4. Intel: ALL reports listed, click into any, read full, back works
5. Wiki: lesson topics listed, click into any, read full, back works
