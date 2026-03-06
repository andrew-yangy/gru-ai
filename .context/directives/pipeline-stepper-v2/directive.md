# Pipeline Stepper v2 — Nodes + Connectors Rewrite

## CEO Brief

The current pipeline stepper uses a segmented progress bar. After 3 iterations and 2 expert reviews, the consensus is clear: **we built a progress bar when I asked for a pipeline visualization**. A progress bar answers "how much is done." I want to see "where are we, what happened, what's next" with stages laid out spatially.

## What I Want

Replace the segmented bar with a **horizontal node + connector stepper** — the standard pattern used by GitHub Actions, Amazon order tracking, CI/CD pipelines, and checkout wizards. Every user already knows how to read this pattern.

## Specific Requirements

### 1. Horizontal stepper with nodes + connectors (core change)
- Circles (12-16px) connected by lines, with full labels below
- Completed: filled circle with check icon, solid connector line
- Active: larger highlighted circle with pulse ring
- Failed: red circle with X icon
- Pending: hollow/dimmed circle, dashed or dimmed connector
- The eye should immediately land on "where we are"

### 2. Compact mode for game panel (~280px)
- NOT a shrunken version of full mode — that fails at 10 steps in 280px
- Show only the active step prominently with 1-2 neighbors for context
- Example: `[check] Plan → [*ACTIVE*] Execute → [ ] Wrapup`
- 3 nodes max. Current step name clearly readable

### 3. Full readable labels
- "Execute" not "Exe". 10-11px not 7px
- Active step label bold/highlighted
- No 3-character abbreviations

### 4. Active step artifacts auto-visible
- Active step's artifact panel shows by default without clicking
- Completed steps: rich tooltip on hover showing actual artifact content (not just "completed")
- Click any node to expand/collapse its artifact detail panel

### 5. Keep existing functionality
- Ticking elapsed time (useElapsed hook)
- Failed state (red styling, server maps failed directive to failed step)
- Step transition flash animation
- needsAction flag for approve step (yellow styling, "Action needed")

## What NOT to change
- Server-side `directive-watcher.ts` — the data model is fine
- Type definitions — `PipelineStepStatus` already has 'failed'
- The 3 integration points (DirectiveProgress, ReportsPanel, DirectivePipeline) — just update their PipelineStepper props if needed

## Scope
- `src/components/shared/PipelineStepper.tsx` — full rewrite
- Minor prop updates in the 3 consumer files if needed
- No new files needed

## Goal
ui
