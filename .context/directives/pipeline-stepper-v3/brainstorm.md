# Brainstorm Synthesis — Pipeline Stepper v3

## Convergence (all 3 agents agree)

1. **Step-specific icons**: All propose a `Record<string, LucideIcon>` mapping the 14 step IDs to semantic icons (Filter, BookOpen, Lightbulb, ThumbsUp, Play, Flag, etc.). Simple constant, no abstraction needed.

2. **Skipped-step fix is a one-liner**: `buildPipelineFromDirective()` in directive-watcher.ts line 43 currently `.filter()`s out skipped steps. Fix: keep all steps, set `status='skipped'` for steps in the SKIPPED_STEPS set — exactly like `derivePipelineSteps()` already does on line 93. Frontend already has `PipelineStepStatus = 'skipped'` but StepNode renders it identically to pending. Add dashed border + dimmed opacity + SkipForward icon overlay.

3. **History data already exists**: `workState.conductor.directives` (DirectiveRecord[]) contains ALL directives via the work-state aggregator. DirectivePipeline.tsx already renders them. No new server API or database needed for basic history. For pipeline step replay on completed directives, DirectiveWatcher can be extended to read all directive.json files (already iterates them).

4. **Inline CEO action buttons**: Generalize CompletionGateBanner pattern. Any step with `needsAction=true` gets approve/reject buttons rendered inline in the step row. Extract existing API logic into reusable hook.

5. **Artifacts should be clickable links**: When artifact values are file paths (.md/.json under .context/), render as clickable links opening a viewer/modal.

6. **Vertical timeline is correct**: Don't switch to horizontal — 14 steps don't fit. Vertical scales to any width.

7. **3 projects by blast radius**: Server data layer → Stepper visual overhaul → Cross-page integration.

## Key Disagreements

1. **History depth**: Marcus wants DirectiveWatcher to build full DirectiveState[] for completed directives (pipeline steps preserved). Riley says use existing DirectiveRecord[] (metadata only, no step replay). Sarah agrees with Marcus.
   - **Resolution**: Marcus/Sarah win. Pipeline step history IS the value — showing just "completed" with no steps is barely useful. The data is already in directive.json files on disk. DirectiveWatcher just needs to not filter them out.

2. **Step-level action endpoint**: Riley flags that approve step needs a NEW server endpoint (`/api/actions/directive-step-action`) since only `/api/actions/directive-complete` exists. Sarah suggests extracting to a hook but doesn't address the server gap.
   - **Resolution**: For v1, approve button can write to directive.json directly (set pipeline.approve.status = 'completed', pipeline.approve.output.decision = 'approved'). The pipeline session polls directive.json. No new server endpoint needed — the watcher picks up the change.

3. **Status bar in AppLayout**: Sarah proposes a persistent directive status bar across all non-game routes. Others don't mention it.
   - **Resolution**: Defer to v2. Focus on fixing the 3 surfaces that already exist (Dashboard, Projects, Game) rather than adding a 4th.

## Feasibility Flags (from Sarah's audit)

- `server/types.ts` and `src/stores/types.ts` are duplicate type definitions — both must be updated in sync
- `buildPipelineFromDirective()` line 43 filter is the root cause of problem 1
- Title already works in DirectiveProgress (line 284: `displayName = title || directiveName`)
- CompletionGateBanner approve/reject logic (lines 167-192) is the pattern to generalize
- Game panel uses inline styles (PARCHMENT constants), not Tailwind — CompactStepper needs a wrapper

## Recommended Icon Mapping

| Step ID | Icon | Rationale |
|---------|------|-----------|
| triage | Filter | Sorting/classifying |
| read | BookOpen | Reading directive |
| context | FolderSearch | Gathering context |
| challenge | Swords | C-suite challenge |
| brainstorm | Lightbulb | Ideas |
| plan | Map | Strategic planning |
| audit | SearchCheck | Technical audit |
| approve | ThumbsUp | CEO approval |
| project-brainstorm | Sparkles | Task decomposition |
| setup | Settings | Environment setup |
| execute | Play | Running builds |
| review-gate | ShieldCheck | Review verification |
| wrapup | PackageCheck | Packaging results |
| completion | Flag | Finish line |
