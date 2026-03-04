---
name: "report"
description: "CEO dashboard with progressive disclosure — 3 tiers: headline (5 lines, default), summary (per-goal detail), deep (full weekly analysis). Takes an optional argument: headline (default), summary, deep, or legacy aliases daily/weekly."
---

# CEO Report

Generate a CEO report. Tier: $ARGUMENTS (default: headline)

## Step 1: Determine Tier

Parse `$ARGUMENTS`:
- If empty or "headline" or "h" → **headline tier**
- If "summary" or "s" or "daily" or "d" → **summary tier**
- If "deep" or "weekly" or "w" → **deep tier**

## Step 2: Gather Data

What to read depends on the tier. Higher tiers include everything from lower tiers.

### Headline Tier Data (minimal — fast)
- `.context/goals/*/goal.json` — count active goals
- `.context/goals/*/projects/*/project.json` — count active/completed/blocked projects, identify recently completed
- `.context/goals/*/backlog.json` — count P0 items needing CEO
- `.context/directives/*.json` — count pending directives (filter by status: pending)
- `.context/reports/` — scan 3 most recent for unaddressed high-risk follow-ups
- `.context/healthchecks/latest/*.json` — quick health status (pass/fail)
- Run `npm run type-check` — build status (pass/fail only, don't show errors here)

### Summary Tier Data (adds detail on top of headline)
All headline data, PLUS:
- `.context/vision.md` — for context on what matters
- `.context/preferences.md` — CEO standing orders
- `.context/intel/latest/*.json` — latest scout outputs per agent
- `~/.conductor/scheduler.json` and `~/.conductor/scheduler.log` — autopilot status
- Recent directive reports — corrections caught data
- Run git commands for recent changes:
```bash
# Recent commits on main (last 24h)
git log --oneline --since="24 hours ago" main
# Active worktrees
git worktree list
# Recently modified context files
find .context/ -name "*.md" -mtime -1 -type f | head -20
```
- Active projects with no recent progress
- Failed/blocked initiatives from recent directives
- OKR progress from `.context/goals/*/goal.json`

### Deep Tier Data (adds weekly analysis)
All summary data, PLUS:
- `.context/reports/` — compute agent acceptance rates from all reports this week
- `.context/lessons/*.md` topic files — any new lessons this week?
- Commit activity distribution by area
- All directive reports from the past 7 days
- Previous weekly report for comparison (`.context/reports/weekly-*.md`)
- Expand git log to 7 days: `git log --oneline --since="7 days ago" main`

## Step 3: Generate Report

### Headline Tier Format (default)

The headline is a 5-line status snapshot. The CEO should know the state of the world in <10 seconds.

```
# Status — {date}

Shipped: {N} projects completed | Blocked: {N} projects stalled | Needs CEO: {N} decisions pending
Health: {build pass/fail} | {security ok/N issues} | {N active goals}
Top action: {single most important thing the CEO should do next — e.g., "Review 2 high-risk follow-ups from auth-hardening directive" or "Nothing — all clear"}
```

**Derivation rules for headline signals:**
- **Shipped**: Count projects where `status` changed to `"completed"` in the last 24h (compare project.json `completed` timestamps)
- **Blocked**: Count active projects where all tasks are incomplete AND last modification > 7 days ago
- **Needs CEO**: Count pending directives + P0 backlog items + unaddressed high-risk follow-ups from recent digests
- **Health**: type-check pass/fail + healthcheck summary + active goal count
- **Top action**: Priority order: (1) high-risk items needing decision, (2) blocked projects needing unblocking, (3) pending directives awaiting execution, (4) "Nothing — all clear"

If the CEO wants more detail: "Run `/report summary` for per-goal detail or `/report deep` for full analysis."

### Summary Tier Format

```
# Summary Report — {date}

## External Intelligence (from latest /scout)
- **Technology (Sarah)**: {summary + any act_now/this_week items}
- **Product (Marcus)**: {summary + competitor moves}
- **Growth (Priya)**: {summary + channel opportunities}
- **Ecosystem (Morgan)**: {summary + framework updates}
{If no scout data: "No scout data yet — run /scout to gather external intelligence."}

## Internal Health (from latest /healthcheck)
- **Build status**: {type-check pass/fail}
- **Security**: {npm audit summary}
- **Operations**: {stale goals, backlog health}
{If no healthcheck data: "No healthcheck data yet — run /healthcheck."}

## Autopilot
{Read ~/.conductor/scheduler.json and ~/.conductor/scheduler.log}
- **Status**: {enabled/disabled}
- **Budget**: ${spent_today} / ${daily_max} ({pct}%)
- **Recent launches**: {list directives launched today, or "none"}
- **Last check**: {time of most recent check entry}
{If scheduler.json doesn't exist: "Not configured — run scripts/foreman.sh to initialize."}

## Corrections Caught (from recent directives)
{Read recent directive reports for Corrections Caught data.}
- **Last directive**: {name} — {violations_found} violations found, {violations_fixed} fixed
- **Standing Corrections verified**: {count} across {N} initiatives
{If no recent directive data: "No directive executed recently."}
{If violations were found: list each with correction name and resolution}

## What Changed
{Recent commits, summarized by area. Not a raw git log — group and summarize.}
{Active worktrees/branches and their status.}

## Project Inventory

{Read all .context/goals/*/goal.json and .context/goals/*/projects/*/project.json for project inventory.}

### Active Goals ({count})
| Goal | Active Projects | Done | Backlog | Status |
|------|----------------|------|---------|--------|
| {goal title} | {count} ({list names}) | {done_count} | {backlog_count} | {status badge} |

### Partially-Done Alerts
{For each active feature: read project.json embedded tasks, compute completion %. Flag features where:
- completion > 0% but < 100%
- AND last file modification in the feature folder > 7 days ago}

Warning: **{feature name}** ({goal}) — {X}% complete, stale {N} days
   Last activity: {date} | Tasks: {completed}/{total}

{If no partially-done alerts: "All active projects are either fresh or complete."}

### Completed But Not Archived
{Projects with status "active" but 100% task completion — should have status updated to "completed"}
- {project name} ({goal}) — 100% complete, still status: active

## What Needs Your Input
{Pending directives in directives/ (filter by status: pending) — list with one-line description each}
{High risk items awaiting decision from recent directives}
{Backlog items flagged for CEO decision}
{If nothing: "Nothing pending — all clear."}

## What's At Risk
{Build errors from type-check, if any}
{Stale active projects with no recent changes}
{Failed/blocked initiatives from recent directives}
{If nothing: "No risks identified."}

## Decision Queue

{Aggregate items needing CEO decision from multiple sources:}

### From Recent Directives
{Scan .context/reports/ for the last 3 directive reports.
For each, check the "Follow-Up Actions" section for high-risk backlogged items.
Cross-reference with .context/goals/*/backlog.json to see if they've been addressed.}

- **{action}** — Backlogged from {directive name} ({date})
  Risk: {high} | Status: {addressed/pending}

### From Backlogs
{Scan all .context/goals/*/backlog.json for items explicitly marked as needing CEO decision
or items with Priority P0 that are not yet started}

### From Healthchecks
{Read .context/healthchecks/latest/*.json for high-risk findings}

{If nothing: "No pending decisions — all clear."}

## OKR Snapshot
{For each goal with OKRs:}
**{Goal Name}**
- KR-1: {description} — {status} ({metric}: {current} / {target})
- KR-2: ...
```

### Deep Tier Format

```
# Deep Report — Week of {date}

## Executive Summary
{3-5 bullet overview of the week: what shipped, what's in progress, what needs attention}

## External Intelligence (from latest /scout)
- **Technology (Sarah)**: {summary + action items}
- **Product (Marcus)**: {summary + competitor moves}
- **Growth (Priya)**: {summary + opportunities}
- **Ecosystem (Morgan)**: {summary + framework updates}
- **Intelligence gathered this week**: {count by urgency level}
{If no scout data: "No scout data yet — run /scout."}

## Internal Health (from latest /healthcheck)
- **Build status**: {type-check pass/fail}
- **Security**: {npm audit summary, CVE count}
- **Operations**: {goal freshness, backlog health}
- **Auto-fixed this period**: {count and summary}
{If no healthcheck data: "No healthcheck data yet — run /healthcheck."}

## Autopilot
{Read ~/.conductor/scheduler.json and ~/.conductor/scheduler.log}
- **Status**: {enabled/disabled}
- **Budget**: ${spent_today} / ${daily_max} ({pct}%)
- **This week**: {count} directives auto-launched, {total estimated cost}
- **Errors this week**: {count, or "none"}
{If scheduler.json doesn't exist: "Not configured — run scripts/foreman.sh to initialize."}

## What Changed This Week
{Commits grouped by area with counts}
{Directives executed and their outcomes}
{Features completed or progressed}

## Project Inventory

{Read all .context/goals/*/goal.json and .context/goals/*/projects/*/project.json for project inventory.}

### Active Goals ({count})
| Goal | Active Projects | Done | Backlog | Status |
|------|----------------|------|---------|--------|
| {goal title} | {count} ({list names}) | {done_count} | {backlog_count} | {status badge} |

### Partially-Done Alerts
{For each active feature: read project.json embedded tasks, compute completion %. Flag features where:
- completion > 0% but < 100%
- AND last file modification in the feature folder > 7 days ago}

Warning: **{feature name}** ({goal}) — {X}% complete, stale {N} days
   Last activity: {date} | Tasks: {completed}/{total}

{If no partially-done alerts: "All active projects are either fresh or complete."}

### Completed But Not Archived
{Projects with status "active" but 100% task completion — should have status updated to "completed"}
- {project name} ({goal}) — 100% complete, still status: active

## What Needs Your Input
{Same as summary, but covering the full week}

## What's At Risk
{Same as summary, but covering the full week}
{Trend: are risks increasing or decreasing?}

## Decision Queue

{Aggregate items needing CEO decision from multiple sources:}

### From Recent Directives
{Scan .context/reports/ for the last 3 directive reports.
For each, check the "Follow-Up Actions" section for high-risk backlogged items.
Cross-reference with .context/goals/*/backlog.json to see if they've been addressed.}

- **{action}** — Backlogged from {directive name} ({date})
  Risk: {high} | Status: {addressed/pending}

### From Backlogs
{Scan all .context/goals/*/backlog.json for items explicitly marked as needing CEO decision
or items with Priority P0 that are not yet started}

### From Healthchecks
{Read .context/healthchecks/latest/*.json for high-risk findings}

{If nothing: "No pending decisions — all clear."}

## What Shifted This Week

{Compare current project inventory against what was reported in the most recent saved weekly report
in .context/reports/weekly-*.md}

### New Work Started
- {feature name} ({goal}) — started this week

### Completed This Week
- {project name} ({goal}) — status changed to completed

### Went Stale (no activity >7 days)
- {feature name} ({goal}) — last activity {date}

### Priority Changes
{Any backlog items that were promoted from /scout this week}

{If no previous weekly report exists: "First weekly report — no comparison available."}

## OKR Progress
{Full OKR breakdown per goal — same as summary but with week-over-week changes if prior report exists}

## Team Performance
{From recent scout reports in .context/intel/latest/:}
- **Proposals this week**: {count} ({count} approved, {count} rejected, {count} deferred)
- **By agent**:
  - Sarah: {proposed} proposed, {accepted} accepted ({rate}%)
  - Marcus: {proposed} proposed, {accepted} accepted ({rate}%)
  - Priya: {proposed} proposed, {accepted} accepted ({rate}%)
  - Morgan: {proposed} proposed, {accepted} accepted ({rate}%)

{From directive reports:}
- **Directives completed**: {count}
- **Initiatives**: {completed}/{total} ({rate}%)
- **Build success rate**: {pass}/{total} type-checks passed

{From directive reports this week:}
- **Corrections enforced**: {total corrections checked across all directives}
- **Violations caught**: {count} (by agent: Sarah {N}, Marcus {N}, Morgan {N})
- **Violation types**: {which standing corrections were violated most}

## Corrections Caught This Week
{Aggregate corrections_check data from all directive reports this week:}

| Correction | Directive | Caught By | Resolution |
|------------|-----------|-----------|------------|
| {correction} | {directive} | {reviewer} | {fixed/noted} |

- **Trend**: {more/fewer/same violations as last week}
{If no violations: "Clean week — all standing corrections respected across all directives."}

## Lessons Learned
{New entries in .context/lessons/ topic files from this week}
{If none: "No new lessons captured this week."}

## Recommendations
{Morgan-style operational recommendations:}
- What should the CEO focus on next week?
- Any goals that need re-prioritization?
- Any process improvements to consider?
```

## Step 4: Display Report

Output the report directly to the CEO. Do NOT write it to a file unless the CEO asks.

For deep tier reports, also offer: "Would you like me to save this report to `.context/reports/weekly-{date}.md`?"

After any tier, remind: "Drill down with `/report summary` or `/report deep` for more detail." (Skip this line if already at deep tier.)

## Failure Handling

| Situation | Action |
|-----------|--------|
| No OKR files exist | Skip OKR section, note "No OKRs tracked yet" |
| No scout data (intel/latest/) | Skip external intelligence section, note "No scout data yet — run /scout" |
| No healthcheck data (healthchecks/latest/) | Skip internal health section, note "No healthcheck data yet — run /healthcheck" |
| No scout data exists | Skip team performance section, note "No scout/patrol data yet" |
| Type-check fails to run | Note the error, skip build health section |
| No recent commits | Note "No commits in {timeframe}" |
| No directive reports | Skip directive outcomes section |
| No active projects found | Note "No active projects tracked yet" in Project Inventory |
| No tasks in a project.json | Skip that feature in completion calculations |
| No previous weekly report for comparison | Note "First weekly report — no comparison available" in Shift Tracking |
| No conductor reports for Decision Queue | Note "No directive history to scan" |
| No healthcheck data for Decision Queue | Skip "From Healthchecks" subsection |
| No ~/.conductor/scheduler.json | Note "Autopilot not configured" in Autopilot section |
| No ~/.conductor/scheduler.log | Note "No scheduler activity yet" |

## Rules

### NEVER
- Create files without CEO requesting it (reports are displayed, not saved by default)
- Run slow commands (no `npm run build`, no `npm run lint`)
- Modify any files (this is a read-only operation)
- Include raw git logs (always summarize and group)

### ALWAYS
- Read preferences.md before generating (summary and deep tiers)
- Show concrete numbers (counts, percentages, dates)
- Flag items needing CEO action prominently
- Keep headline tier to exactly 3 lines of content (after the heading)
- Keep summary reports under 5 minutes reading time
- Keep deep reports under 15 minutes reading time
- Group information by importance, not by source
- Include drill-down hint after headline and summary tiers
