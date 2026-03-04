# Alex Memory

## Project Structure
- Frontend: Vite + React + shadcn/ui, builds to `dist/`, served by Hono server
- Server: `server/index.ts` (Hono), state in `server/state/aggregator.ts`
- Session parsing: `server/parsers/session-state.ts` (state machine), `server/parsers/session-scanner.ts` (prompt extraction)
- Type defs: `server/types.ts` (server), `src/stores/types.ts` (frontend), `server/state/work-item-types.ts` (Zod schemas) -- keep all three in sync
- Build: `npx vite build` for frontend, `npx tsc --noEmit` for type-check (never use `npm run lint`, it OOMs)
- Data pipeline (post glob-reads migration): source files (.context/) -> StateWatcher (direct reads) -> aggregator -> WebSocket -> dashboard
- ContextWatcher is dead code (still on disk but not imported) -- StateWatcher replaced it

## Context Tree Paths (Current)
- Goals: `.context/goals/*/goal.json`
- Projects: `.context/goals/*/projects/*/project.json` (tasks embedded)
- Backlogs: `.context/goals/*/backlog.json` (JSON array, not markdown)
- Directives: `.context/directives/*.json` (flat, status in JSON) + optional `.md` brief
- Reports: `.context/reports/*.md`
- Intel: `.context/intel/` (was conductor/intelligence/)
- Lessons: `.context/lessons/*.md` (was lessons.md single file)

## Key Patterns
- Session data flows: JSONL files -> session-state.ts (bootstrap/incremental) -> aggregator.ts -> WebSocket -> dashboard store -> components
- Subagent files: `~/.claude/projects/{dir}/{uuid}/subagents/agent-{agentId}.jsonl`
- Agent identity: detected from initial prompt patterns ("You are {Name}"), stored in `agentName`/`agentRole` on Session
- Known agents: Alex, Sarah, Morgan, Marcus, Priya -- each has a color in the frontend
- "Feature" type kept in code (FeatureRecord) but maps to project.json -- renamed deferred to avoid cascading 86+ occurrences

## Enforcement Hooks (March 2026)
- 4 hooks in `.claude/hooks/`: enforce-orchestrator-scope.sh (PreToolUse), enforce-completion.sh (Stop), validate-cast.sh (manual), detect-stale-docs.sh (manual)
- All hooks exit 0 always -- output JSON for decisions, no non-zero exits
- checkpoint.sh in scripts/ handles tracking for enforcement: track-agent, track-artifact
- Alex frontmatter has hooks defined -- Write/Edit blocked for non-.context/.claude paths, Stop blocked without reviews/digest

## Agent Definitions (March 2026)
- 12 agent files: 5 C-suite (alex, sarah, morgan, marcus, priya), 6 specialists (jordan, riley, casey, taylor, sam, devon)
- All agents are named — no generic role agents. Fallbacks: Sam (investigation + default reviewer), Sarah (default auditor), Devon (broad/cross-domain builder)
- Specialists get Write/Edit tools; C-suite gets read-only
- Sam operates in 3 modes: investigation (audit Phase 1), QA/build, and review (default reviewer)
- Devon (full-stack) handles scope crossing frontend/backend or too broad for a single specialist

## API_BASE Migration (March 2026)
- `src/lib/api.ts` centralizes API_BASE and WS_URL -- no more hardcoded localhost:4444
- 18 frontend files import from @/lib/api

## Execution Notes
- Medium directives: Skip Morgan planning if scope is clear, audit codebase directly, build, verify
- Always run both `npx tsc --noEmit` AND `npx vite build` to verify changes
- Dashboard changes are low-risk (no production impact) -- safe playground
- Agent tool is NOT available to subagents (platform limitation). Spawn agents via CLI.
- CLI pattern: `CLAUDECODE= claude --agent {name} -p --model {model} --dangerously-skip-permissions --no-session-persistence "prompt" > /tmp/{name}-output.txt 2>&1 &` then `wait $!` or sleep + kill
- CRITICAL: --agent flag uses the frontmatter `name:` field, NOT the filename!
  - sarah-cto.md → `--agent sarah` (NOT `--agent sarah-cto`)
  - marcus-cpo.md → `--agent marcus`, morgan-coo.md → `--agent morgan`
  - priya-cmo.md → `--agent priya`, riley-frontend.md → `--agent riley`
  - jordan-backend.md → `--agent jordan`, casey-data.md → `--agent casey`
  - taylor-content.md → `--agent taylor`, sam-qa.md → `--agent sam`
  - devon-fullstack.md → `--agent devon`
  - Wrong name fails SILENTLY (runs as vanilla Claude with no error!)
- Must unset CLAUDECODE env var (use `CLAUDECODE=` prefix) to avoid nested session check
- CLI has ~15-20s cold start — use timeout of at least 120s for real work, 30s for simple prompts
- ALWAYS redirect to file and read after (`> /tmp/out.txt 2>&1 &` then `cat /tmp/out.txt`) — inline capture is unreliable
- If CLI returns empty: check the output FILE (not inline), retry once with longer timeout. If still empty, report to CEO.
- NEVER do Morgan's planning, audits, reviews, or brainstorms yourself. Always delegate via CLI spawn.
- tsc --noEmit may pass while vite build fails (esbuild catches different errors than tsc) -- always run BOTH

## Game Module (March 2026)
- Game components live in `src/components/game/` -- separate from dashboard (`src/components/dashboard/`)
- Route: `/game` in router.tsx, sidebar nav link "HQ" with Building2 icon
- Components: GamePage (main), OfficeGrid (CSS grid), SidePanel (detail panels), GameHeader (dark bar), types.ts, office-layout.ts
- Office layout: 20x14 ASCII grid in office-layout.ts, parsed to TileType[][]
- Game reads from same Zustand store as dashboard -- useDashboardStore for sessions, directives, workState
- Game goal: `.context/goals/game/` (NOT under goals/ui/)
- Phase 1 (prototype) complete, Phases 2-5 remain (art, canvas, actions, polish)
