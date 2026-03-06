# Devon Lee -- Agent Memory

## Directive Directory Format (2026-03-06)
- Directives now use directory format: `.context/directives/{id}/directive.json` + `directive.md`
- Old flat format (`{id}.json` + `{id}.md`) was fully migrated and removed
- `checkpoints/` subdirectory was removed
- directive-watcher.ts uses depth:1 chokidar to watch inside directive directories
- state-watcher.ts reads directives via `listDirs()` then `{dirId}/directive.json`

## Terminology: initiatives -> projects (2026-03-06)
- `DirectiveInitiative` renamed to `DirectiveProject` (server/types.ts, src/stores/types.ts)
- `totalInitiatives` -> `totalProjects`, `currentInitiative` -> `currentProject`
- `DirectiveState.initiatives[]` -> `DirectiveState.projects[]`
- `DirectiveRecord.initiatives` -> `DirectiveRecord.projects` (work-item-types.ts Zod + frontend types)
- `DirectiveProject` gained `totalTasks` and `completedTasks` optional fields
- `DirectiveState.status` gained `awaiting_completion` value
- All frontend components updated: DirectiveProgress, OrientationBanner, IntelPanel, ProjectsPanel, FurniturePanels, GamePage, panelUtils

## Pipeline Steps (2026-03-06)
- New steps added: brainstorm, project-brainstorm, completion (report step removed)
- Full order: triage, read, context, brainstorm, plan, audit, project-brainstorm, approve, setup, execute, wrapup, completion
- Lightweight skips: brainstorm, project-brainstorm, audit, approve
- Completion step gets `needsAction=true` when directive status is `awaiting_completion`

## Type-check commands
- `npx tsc --noEmit` -- checks all project references (server + frontend)
- `npx vite build` -- frontend build (can succeed when tsc fails, always run both)
- NEVER use `npm run lint` -- ESLint OOMs on this project
