# Pipeline Stepper v3 — Full Dashboard UX Overhaul

## CEO Brief

The pipeline UI is ugly and broken. It needs a complete UX overhaul — not just layout fixes but real design thinking. This is the CEO's primary interface for monitoring work.

## Problems to Fix

### 1. Skipped steps are invisible
- Project Brainstorm step shows unchecked (pending) — but it was skipped
- Skipped steps MUST be visually distinct from pending (e.g., dashed circle, strike-through label, "skipped" badge)
- The user should immediately understand WHY a step was skipped (lightweight directive = skip brainstorm/audit/approve)

### 2. Only the latest pipeline shows — no history
- Can't see previous/completed directives AT ALL
- Need a list/accordion of all directives (active on top, completed collapsed below)
- Each directive entry should show: title, status, weight, timestamp, progress summary
- Clicking expands to show the full pipeline timeline
- This is critical — the CEO needs to see what happened, not just what's happening now

### 3. No links or navigation
- No link from pipeline steps to their reports/artifacts
- No link to the project.json or directive files
- No link to the directive's report.md when complete
- Steps that produce artifacts (audit, brainstorm, plan) should link to those files

### 4. No icons for steps
- Every step is just a colored circle — no semantic icons
- Each step type should have a distinct icon (e.g., magnifying glass for read/investigate, brain for brainstorm, shield for audit, gavel for approve, hammer for execute, clipboard for review, flag for complete)
- Use lucide-react icons consistently

### 5. No CEO action buttons
- Approve step requires CEO action but there's no approve/reject button in the UI
- Completion gate requires CEO sign-off but there's no button
- Any `needsAction` step should render actionable buttons, not just a yellow warning
- Buttons should call the appropriate server endpoints or update directive state

### 6. UI design quality is poor
- Needs a designer's eye during planning — not just engineering
- Riley (frontend) should create a visual prototype/mockup as part of planning
- The stepper should look polished: proper spacing, typography hierarchy, subtle animations
- Reference: GitHub Actions timeline, Linear issue tracker, Vercel deployment logs
- The current implementation is functional but visually forgettable

### 7. Show directive title, not slug ID
- `directiveName` stores the slug (e.g., "char-interaction")
- Show human-readable title from directive.json throughout

### 8. Show on all pages
- Projects page (`DirectivePipeline.tsx`): fix integration so stepper renders
- Game UI: compact stepper in side panel
- Dashboard: full stepper with history

## Design Requirements
- Riley should produce a visual design/prototype during planning (part of Sarah's investigation or Morgan's planning phase)
- The design should be reviewed by CEO before implementation begins
- Reference designs: GitHub Actions, Linear, Vercel deployment timeline

## Scope
- `src/components/shared/PipelineStepper.tsx` — major rewrite
- `src/components/projects/DirectivePipeline.tsx` — history list + fix integration
- `src/components/dashboard/DirectiveProgress.tsx` — title + history
- `src/components/game/panels/ReportsPanel.tsx` — compact mode
- Server endpoints for CEO actions (approve, complete) if needed
- `server/watchers/directive-watcher.ts` — expose completed directives for history
- `server/types.ts` + `src/stores/types.ts` — title field, history data

## Goal
ui
