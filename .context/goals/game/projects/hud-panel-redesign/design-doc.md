# CEO Command Center -- Side Panel Redesign

**Author:** Marcus Rivera, CPO
**Date:** 2026-03-06
**Status:** Design proposal (not a spec -- needs CEO review before engineering)

---

## Diagnosis: What's Wrong Today

I reviewed every panel implementation. The current tabs are **data browsers, not workflow tools.** They answer "what data exists?" instead of "what should I do next?"

Specific problems:

1. **Team panel** is solid -- it already shows status, current tool, subagents, and has quick actions for waiting sessions. This is the best panel. But it treats all agents equally when the CEO only cares about blocked/waiting ones.

2. **Inbox panel** only shows sessions waiting for approval/input/error. It misses the ACTUAL inbox: directive completion gates, backlog proposals from scouts, strategic decisions that need CEO input. It's a session status filter, not an inbox.

3. **Projects panel** is a drill-down hierarchy browser (Goals > Projects > Tasks). Three levels of navigation in a 320px panel. The CEO doesn't browse hierarchies -- they want to know "is my directive on track?" and "what's next after this?"

4. **Intel panel** mixes active directive pipeline status with a report archive browser. Two unrelated things in one tab. The directive pipeline is critical real-time info; reports are reference material.

5. **Wiki panel** is a static list of 6 lesson files. It serves no real-time workflow. This tab will never get opened during actual management.

6. **Furniture panels** (CEO Desk, Whiteboard, Conference, etc.) duplicate data from the tabs. The CEO Desk shows the same approval count as Inbox. The Whiteboard shows the same directives as Intel. Redundancy without added value.

**The core problem:** These tabs were designed around data types (team, inbox, projects, intel, wiki) instead of around CEO decisions (approve, prioritize, monitor, plan).

---

## Design Principles

Before the tab-by-tab redesign, the rules:

**P1: Action-first.** Every card should end with what the CEO can DO, not just what they can SEE. Show the decision, not just the data.

**P2: Notification badges drive engagement.** A tab with a badge number means "you have something to do here." No badge means "nothing needs you." This is how 45-min/week management works -- the CEO opens the game, checks for badges, handles them, leaves.

**P3: Progressive disclosure, always.** The glance view (what you see without scrolling) should answer the primary question. Expanding or drilling down gives context. Three levels max.

**P4: Real-time is the feature.** The game's differentiator over a static dashboard is watching agents work live. Lean into it. Pulsing indicators, tool activity streams, elapsed timers.

**P5: Game metaphors where they help, data where it matters.** The parchment aesthetic is great for atmosphere. But never sacrifice readability for theme. No decorative elements that push actionable content below the fold.

---

## Tab Restructure: 5 Tabs, New Roles

I'm recommending we **keep 5 tabs** but **rename and repurpose** three of them. Five tabs is the right number for a 320px panel -- more than 5 means the tab labels get illegible.

### Old --> New Mapping

| Old | New | Why |
|-----|-----|-----|
| Team | **Team** (keep) | Already the best panel. Needs minor polish. |
| Inbox | **Action** | Rename. Expand scope from "sessions waiting" to "everything that needs CEO input." |
| Projects | **Ops** | Rename. Shift from hierarchy browser to operational dashboard. |
| Intel | **Directive** | Rename. Dedicated to the active directive pipeline -- the heartbeat of the system. |
| Wiki | **Log** | Rename. Replace static lesson browser with a live event feed / activity log. |

---

## Tab 1: TEAM (keep name)

### Primary Question
"Who's working, who's stuck, and do I need to unblock anyone?"

### What's Good Already
The TeamPanel is honestly the strongest panel. Agent cards with color accents, status chips, tool activity lines, subagent display, quick actions for waiting sessions. I wouldn't tear this down.

### What to Change

**Glance view (no scroll needed):**
- At the very top: a single-line summary. "4 working, 1 waiting, 6 idle" -- plain text, not cards. This is the RimWorld colonist bar equivalent. You should know the team state in under 1 second.
- Below that: only agents that need attention (waiting-approval, waiting-input, error) show as full cards.
- Working agents show as compact cards (name + tool activity on one line).

**Deep dive (scroll or tap):**
- Tapping any agent card opens the existing AgentPanel detail view (this already works via onSelectAgent, good).
- Idle agents stay in the compact 2-column grid at the bottom (current design is fine).

**New concept -- Attention Badge:**
- The Team tab icon shows a badge count = number of agents in waiting or error state.
- This is the signal that makes the CEO open this tab.

**New concept -- Agent Mood/Efficiency (future):**
- RimWorld shows colonist mood bars. We could show agent "efficiency" based on: how many turns since last stuck, how many subagent errors, session duration vs. typical. This is a v2 idea -- flag it but don't build it now.

### Actions Available
- Focus terminal (existing)
- Approve/reject (existing QuickActions)
- Send input (existing)
- (New) Reassign agent -- tell an agent to stop what they're doing and work on something else. This is a future action that requires a `/redirect` command.

### Badge Rule
Count of agents in waiting-approval + waiting-input + error state. Zero = no badge.

---

## Tab 2: ACTION (renamed from Inbox)

### Primary Question
"What decisions are waiting for me RIGHT NOW?"

### Why Rename
"Inbox" implies messages. But the CEO's real inbox is: directive approvals, completion gates, scout proposals, and agent escalations. The current Inbox only shows session statuses.

### Information Hierarchy

**Tier 1 -- Urgent (red/amber accent, always visible):**
- Directive awaiting completion gate (status = `awaiting_completion`). This is the most important action -- a directive finished and needs CEO sign-off.
- Agent errors that need intervention (can't self-recover).

**Tier 2 -- Needs Decision (yellow accent):**
- Sessions waiting for approval (tool permissions, etc.).
- Pipeline steps that need CEO action (`needsAction: true` on PipelineStep).

**Tier 3 -- Informational (blue accent):**
- Sessions waiting for input (agent has a question).
- Scout proposals ready for review (from `/scout` runs).

**Tier 4 -- Resolved (collapsed):**
- Recently resolved items (last 30 min). Collapsed by default, expandable. This gives the CEO confidence that things are being handled.

### New Concept: Decision Cards

Each action item should be a "decision card" -- not just "Session X is waiting" but structured as:

```
[APPROVE] Morgan needs permission to run `git push`
  Directive: game-hud-redesign | 3 min ago
  [Approve] [Reject] [Focus Terminal]
```

The card tells you WHO needs WHAT for WHICH directive, with inline actions. The current InboxPanel already does a version of this with QuickActions, but the framing needs to shift from "here are sessions" to "here are decisions."

### New Data Needed

The Action tab needs data the current panels don't surface:

1. **Directive completion gates** -- currently only visible if you check directiveState.status === 'awaiting_completion'. Needs to be a first-class action item.
2. **Scout proposals** -- from `.context/intel/latest/`. Currently only accessible via the Bell furniture panel (which says "Coming in Phase 4"). We should surface pending scout proposals here.
3. **Backlog nominations** -- when an agent proposes a backlog item (e.g., from a scout finding), the CEO should see it as an action: "Marcus proposed: Add MAP monitoring to pricing API. [Accept to Backlog] [Dismiss]"

### Actions Available
- Approve / Reject (session permissions)
- Complete / Reopen (directive completion gate)
- Accept / Dismiss (scout proposals, backlog nominations)
- Focus Terminal (jump to agent session)
- Snooze (push a low-priority item down for 1 hour)

### Badge Rule
Count of Tier 1 + Tier 2 items. Tier 3 and 4 don't count. This means the badge ONLY fires for things that actually need CEO action, not just "an agent has a question."

### Empty State
"All clear. Your team is handling it." -- with an optional "Last action: Approved game-hud-redesign completion, 2h ago" to confirm recency.

---

## Tab 3: OPS (renamed from Projects)

### Primary Question
"Is the company on track? What's the big picture?"

### Why Rename
"Projects" suggests a project management tool. The CEO doesn't manage projects -- Morgan does. The CEO needs an operational overview: are goals progressing, is the backlog being worked, what's the strategic health of each domain?

### Information Hierarchy

**Glance view -- KPI Strip (top, always visible, no scroll):**

Four compact KPI cards in a 2x2 grid:

| KPI | Value | Source |
|-----|-------|--------|
| Active Directive | "game-hud-redesign" or "None" | directiveState |
| Active Projects | "3 of 8 in progress" | features where status = in_progress |
| Backlog Depth | "12 items (4 P0)" | backlogs.items count + P0 filter |
| Completion Rate | "6 projects done this week" | features completed in last 7 days |

These four numbers tell the CEO if the company is productive, stuck, or idle. The management sim equivalent of the "colony overview" bar.

**Below the fold -- Goal Health Cards:**

One card per goal (there are 4 goals: data-model, workflow-orchestration, ui, game). Each shows:
- Goal name + status badge
- Mini progress bar (completed projects / total projects)
- "2 active, 1 blocked, 5 done" one-liner
- Tap to expand: list of active projects under this goal with their task progress

This replaces the old 3-level drill-down (Goals > Projects > Tasks) with a 2-level view (Goals > Projects). Tasks are never shown in Ops -- they're implementation detail for engineers, not CEO-relevant.

**Below goals -- Backlog Preview:**

Show the top 3 P0 backlog items with their title and origin (which goal, which scout found them). Tapping "View full backlog" could expand or switch to a backlog subview.

### Key Design Decision: Kill Task-Level Visibility

The current ProjectsPanel drills all the way down to tasks with a "Completed: 3, Remaining: 2" breakdown. The CEO should NEVER see individual tasks. That's Morgan and the engineers' concern. The CEO sees: project done/not done, and if not done, roughly how far along (progress bar).

If a project is blocked, the CEO sees it in the Action tab (escalation), not by drilling into task lists.

### Actions Available
- Tap a goal to see its projects (one level of drill-down, not two)
- Tap a P0 backlog item to promote it to a directive ("Make this the next directive")
- (Future) Drag to reorder backlog priority

### Badge Rule
No persistent badge. Optional: badge shows "1" if there's a blocked project or a P0 backlog item older than 3 days without a directive.

---

## Tab 4: DIRECTIVE (renamed from Intel)

### Primary Question
"What's the current directive doing, and how far along is it?"

### Why Rename
"Intel" suggests intelligence/research. But this tab is really about the active directive pipeline -- the most important real-time information in the system. Scout intelligence should live under Action (as proposals) or as a furniture panel (the Bell), not mixed with pipeline status.

### Information Hierarchy

**State A -- Active Directive (the common case):**

**Top: Pipeline Stepper (existing, keep it)**
The PipelineStepper component already shows pipeline steps with status. Keep this prominent. It's the most informative visualization we have.

**Below stepper: Directive Health Card**
- Directive name + weight badge (lightweight/medium/heavyweight)
- Elapsed time since startedAt (live counter)
- Current step name + how long it's been on this step
- Assigned agents for current phase

**Below health: Project Cards (directive's projects)**
One card per project in the directive, showing:
- Project name + status badge
- If in_progress: current phase (build/review/audit), assigned agent, task progress bar
- If completed: green checkmark, completion time
- If failed: red X, failure reason (if available from report)

**Below projects: Artifact Trail**
Scrollable list of artifacts produced by this directive: brainstorm.md, audit.md, project reports. Tappable to read content (using the existing report-content fetch mechanism).

**State B -- No Active Directive:**

Show a different view entirely:

**Directive History (last 5)**
Cards showing recent completed/failed directives with:
- Name, completion date, duration
- Outcome: "Completed (3 projects)" or "Failed at step 5b (review)"
- Tap to see the completion report

**Prompt to act:**
"No active directive. [Start from backlog] or type `/directive` in terminal."

This is the "idle company" state. The CEO should feel a gentle pull to start something.

### New Concept: Elapsed Time Display

Show a small live timer on the active directive: "Running for 12m 34s". This creates a sense of momentum and helps the CEO understand if something is stuck (45 min on a lightweight directive = something's wrong).

Similarly, show per-step elapsed time on the pipeline stepper: "Step 3: Planning (4m 12s)". This is trivially computable from `PipelineStep.startedAt`.

### Actions Available
- View any artifact (brainstorm, audit, report) inline
- (Future) Cancel/abort directive
- (Future) Skip a step (e.g., skip brainstorm on a lightweight directive)
- From "No active directive" state: Start a new directive from backlog

### Badge Rule
Badge shows when:
- Current step has `needsAction: true` (CEO approval needed in pipeline)
- Directive status = `awaiting_completion`
- A project within the directive has failed

---

## Tab 5: LOG (renamed from Wiki)

### Primary Question
"What happened while I was away?"

### Why Replace Wiki
The Wiki tab (6 static lesson files) serves no real-time workflow. A CEO checking in once a day doesn't need to read "Orchestration Patterns" every time. They need to see: what happened since last time?

The Log tab is a **reverse-chronological activity feed** -- the management sim equivalent of the message log in RimWorld or the notification history in Prison Architect.

### Information Hierarchy

**Feed items, newest first. Each item has:**
- Timestamp (relative: "3m ago", "1h ago", "yesterday")
- Agent avatar/color dot
- Event description (one line)
- Optional: expandable detail

**Event types to surface (from existing data):**

| Event | Source | Priority |
|-------|--------|----------|
| Directive started/completed/failed | directiveState changes | High |
| Project completed | feature status change | Medium |
| Agent error | session status = error | High |
| Agent started/finished session | session lifecycle | Low |
| Pipeline step transition | PipelineStep status change | Medium |
| Scout finding submitted | intel artifacts | Medium |
| Approval granted/denied | QuickAction results | Medium |
| Review passed/failed | project review cycle | Medium |

**Filtering:**
Two toggle buttons at the top: "All" and "Important". "Important" filters to High + Medium priority events only. Default to "Important" so the feed isn't noise.

**Date separators:**
"Today", "Yesterday", "March 5" -- helps the CEO scan for the boundary of "since I last checked."

### What This Replaces

The Wiki content (lessons, knowledge base) moves to the **furniture panels**. When you click the Bookshelf furniture item in the office, you get the Wiki content. This is thematically correct -- you walk to the bookshelf to read reference material, not to check your command center.

### New Data Needed

We need an event/activity log. The existing `HookEvent` type partially covers this, and `events` are in the DashboardState. But we need to supplement with:
- Directive lifecycle events (start, step transitions, completion)
- Project lifecycle events (started, completed, failed)
- These could be computed by diffing state snapshots on each WebSocket update.

### Actions Available
- Tap any event to see details (e.g., tap "Project X completed" to see the completion report)
- Filter by agent (tap an agent color dot to see only their events)
- Filter by directive (see all events related to a specific directive)
- (Future) Star/pin important events for later reference

### Badge Rule
No persistent badge on Log. The CEO checks it when they want context, not because they're prompted. All actionable items live in the Action tab.

---

## Cross-Tab Concepts

### Notification Badges (Summary)

| Tab | Badge When | Badge Number Means |
|-----|-----------|-------------------|
| Team | Agents stuck | N agents in waiting/error |
| Action | CEO decisions needed | N items needing CEO action |
| Ops | (rare) Blocked project | N blocked projects |
| Directive | Pipeline needs CEO | N steps needing action |
| Log | Never | -- |

**Total badge** (on the HUD bar itself): Sum of Team + Action + Directive badges. This is the "you have mail" number that pulls the CEO into the panel.

### Contextual Panel Opening

When the CEO clicks a furniture item, the side panel should open to the MOST RELEVANT TAB with context:
- Click an agent's desk --> Team tab, scrolled to that agent (existing behavior, good)
- Click CEO desk --> Action tab (your inbox)
- Click whiteboard --> Directive tab (the active directive)
- Click mailbox --> Log tab (recent activity)
- Click conference room --> Ops tab (company overview)
- Click server room --> Team tab with a "Sessions" subview (technical detail)
- Click bell --> Action tab filtered to scout proposals
- Click bookshelf --> Wiki content as a furniture panel (NOT a tab)

### Tab-to-Tab Deep Links

Some items should cross-link between tabs:
- An Action item "Directive awaiting completion" should have a "View in Directive tab" link
- An Ops goal card showing "1 blocked project" should link to the Action tab filtered to that project's escalation
- A Directive project card showing an agent working should link to that agent in Team tab

This prevents the CEO from having to manually switch tabs and re-find context.

---

## What's Missing (New Concepts Not in Current Data)

These are features that would make the dashboard genuinely powerful but require new backend work:

### 1. Decision Queue (for Action tab)
A first-class "pending CEO decision" data structure. Currently decisions are implicit (scattered across session statuses, directive states, scout outputs). We need a unified queue that any agent can push to.

### 2. Activity Log (for Log tab)
A time-series event log. Currently we have HookEvents but they're hook-specific. We need a general-purpose event stream that captures directive lifecycle, project completion, agent state changes.

### 3. Backlog Promotion Action (for Ops tab)
The ability to tap a backlog item and say "make this the next directive." This closes the loop between planning and execution without the CEO needing to type `/directive backlog-item-name` in a terminal.

### 4. Agent Redirect (for Team tab)
The ability to tell an agent "stop what you're doing, work on X instead." Currently requires terminal interaction. Could be implemented as a SendInput with a structured command.

### 5. Directive History (for Directive tab)
A record of past directives with outcomes. Currently directives are ephemeral -- once completed, their state disappears from directiveState. We need a history array.

---

## Implementation Priority

If we were to build this, the order would be:

**Phase 1 -- Low effort, high impact (rename + rearrange existing data):**
- Rename tabs: Inbox->Action, Projects->Ops, Intel->Directive, Wiki->Log
- Add notification badges to tab strip
- Add summary line to Team tab top
- Move pipeline stepper to be the hero element of Directive tab
- Add KPI strip to Ops tab (computed from existing store data)
- Convert Wiki to furniture panel; replace tab with Log placeholder

**Phase 2 -- Medium effort, medium impact (new data wiring):**
- Build activity log from state diffs (directive events, project events)
- Surface directive completion gate as first-class Action item
- Add elapsed time displays to Directive tab
- Add directive history to Directive tab empty state
- Implement cross-tab deep links

**Phase 3 -- Higher effort, high impact (new backend features):**
- Decision queue data structure
- Scout proposal surfacing in Action tab
- Backlog promotion action
- Agent redirect capability

---

## What I'm NOT Recommending

- **More than 5 tabs.** Resist this. If something doesn't fit, it's a furniture panel, not a tab.
- **Settings/config tab.** The game doesn't need a settings panel in the side panel. That belongs in a modal or a separate page.
- **Chat/terminal in the panel.** The terminal is the terminal. The panel is for overview and quick actions, not for typing commands.
- **Drag-and-drop prioritization.** Tempting for backlog management, but the interaction model in a 320px panel is terrible. Save it for a full-screen backlog view if ever needed.

---

## Success Metrics

How we'd know this redesign worked:

1. **Badge-to-action time < 30 seconds.** CEO sees a badge, opens the tab, takes the action, done.
2. **Tab usage distribution is balanced.** If 90% of tab views are Team, the other tabs are failing. Target: no tab below 10% of views.
3. **CEO can complete a full check-in under 5 minutes.** Open game, check badges, handle actions, glance at Ops, review Directive progress, done.
4. **Zero "where do I find X?" moments.** Every piece of CEO-relevant information has exactly one obvious place to live.
5. **The Log tab replaces "what happened?" terminal scrollback.** The CEO never needs to open tmux and scroll through session output to understand what happened.
