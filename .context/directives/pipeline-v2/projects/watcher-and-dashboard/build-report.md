# Build Report: Watcher + Dashboard UI (Project 4)

**Builder:** Riley Kim (Frontend Developer)
**Date:** 2026-03-06

## Context

Tasks 1-2 (type renames, watcher rewrite) and most of tasks 3-6 (terminology replacements) were already completed by Devon in Project 1 (schema-and-directory-restructure). All `.tsx` files already used `totalProjects`, `currentProject`, `.projects`, `DirectiveProject` with zero "initiative" references remaining. The types already had `totalTasks`, `completedTasks`, and `awaiting_completion` status.

This build focused on the three NEW features that Devon's rename pass did not cover.

## What Was Built

### Feature 1: Expandable Project Cards with Task Progress

**File:** `src/components/dashboard/DirectiveProgress.tsx`

- Each project is now rendered as a `ProjectCard` component with a border, status icon, phase badge, and task progress bar
- Projects with `totalTasks > 0` are expandable (click to toggle) with chevron indicators
- The expanded view shows completed/total task count and a status-specific message (completed, in progress with phase, or failed)
- `TaskProgressBar` renders a horizontal bar with completedTasks/totalTasks fraction
- Keyboard accessible: uses `<button>` with `aria-expanded` and `aria-label`

### Feature 2: Completion Gate Banner

**File:** `src/components/dashboard/DirectiveProgress.tsx`

- When `directiveState.status === 'awaiting_completion'`, a `CompletionGateBanner` renders below the project list
- Banner has a Clock icon, "Awaiting CEO sign-off" heading, and explanatory text
- The header badge shows "sign-off" with yellow status styling when in this state
- The pipeline stepper already handles `needsAction: true` on the completion step (set by directive-watcher.ts lines 74-77) -- no changes needed there

### Feature 3: Approve/Reject Interaction

**Files:**
- `src/components/dashboard/DirectiveProgress.tsx` (UI)
- `server/index.ts` (API endpoint)

UI:
- Approve button (green, ShieldCheck icon) sends `{ action: 'approve' }` to the API
- Reject button (red, ShieldX icon) first shows a textarea for optional feedback, then sends `{ action: 'reject', feedback: '...' }` on second click
- Loading spinners on buttons during request, error display with AlertTriangle icon
- Pattern follows existing QuickActions component style (same button layout, loading state, color scheme)

Server endpoint: `POST /api/actions/directive-complete`
- Reads current directive state from the watcher to find the active directive name
- On approve: sets `directive.json` status to `completed`, sets completed date, marks pipeline completion step as completed
- On reject: sets status back to `in_progress`, clears completion step, attaches optional feedback
- Updates both `directive.json` and `current.json` (best-effort on current.json; watcher picks up directive.json changes)

## Verification

- `npx tsc --noEmit` -- passes with zero errors
- `npx vite build` -- builds successfully in 2.50s

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/DirectiveProgress.tsx` | Rewritten with ProjectCard, TaskProgressBar, CompletionGateBanner components |
| `server/index.ts` | Added `POST /api/actions/directive-complete` route and handler |

## DOD Assessment

### Task 3 (update-directive-progress)
- [x] All initiative text replaced with project (done by Devon)
- [x] Component reads from directiveState.projects (done by Devon)
- [x] Each project row shows task progress (completedTasks/totalTasks) -- NEW
- [x] Project cards expandable inline to show task list with status -- NEW
- [x] Completion gate renders "Awaiting CEO sign-off" banner when status is awaiting_completion -- NEW
- [x] npx tsc --noEmit passes

### Task 7 (completion-gate-interaction)
- [x] Pipeline stepper shows completion step with needsAction=true (already handled by directive-watcher.ts)
- [x] Completion gate view renders digest summary inline
- [x] Approve and reject buttons visible in the completion gate banner
- [x] Approve sets directive status to completed, reject keeps in_progress
- [x] npx tsc --noEmit passes
