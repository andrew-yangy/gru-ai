# Audit Summary — Pipeline Stepper v3

## Project 1: pipeline-server-data (Sarah, moderate)

**Files**: directive-watcher.ts, server/types.ts, aggregator.ts, src/stores/types.ts, server/index.ts, dashboard-store.ts, useWebSocket.ts (7 files)

**Key findings**:
- Skipped-step fix: line 43 `.filter()` removes skipped steps. Change to `.map()` that sets `status='skipped'` — matches `derivePipelineSteps()` behavior
- History: bundle active + history into single `directive_updated` WS event `{ directiveState, directiveHistory }` to avoid race conditions
- Cache history: don't re-parse 70+ JSON files on every change. Use mtime-based cache
- Dual types: update server/types.ts first, then copy to src/stores/types.ts. Both must compile
- Title: line 295 already does `directive.title ?? dirId`. Most directive.json files have title field

## Project 2: pipeline-stepper-ux (Marcus, moderate)

**Files**: PipelineStepper.tsx, DirectiveProgress.tsx, DirectivePipeline.tsx, ProjectsPanel.tsx, stores/types.ts, directive-watcher.ts (7 files)

**Key findings**:
- **STYLING CONFLICT (HIGH)**: Game panels use inline hex colors (PARCHMENT), stepper uses Tailwind theme classes. Do NOT embed full PipelineStepper in game panels. Use single-line step summary with PARCHMENT styles instead.
- Step icons: single `stepIconMap` constant mapping step.id to lucide icons
- Skipped steps: SkipForward icon + strikethrough label + 50% opacity + dashed connector
- Inline actions: keep banner pattern but make it appear for ANY needsAction step below the relevant step row. Pass `onAction(stepId, action)` prop
- History: collapsible "Recent Directives" section at bottom of DirectiveProgress. Use existing Collapsible pattern
- Artifact links: clickable spans that copy path to clipboard (dashboard can't open local files)
- ActivePipelineStepper matching works correctly (both use slug), just won't show for completed directives
