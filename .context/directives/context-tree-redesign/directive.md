# Context Tree Redesign — Clean Slate

## Problem

The .context/ folder structure is over-complicated, over-engineered, and messy. It doesn't reflect the actual read workflow at all. We kept trying to maintain backwards compatibility with old formats, which made it worse. The structure has accumulated folders that nobody reads (artifacts, discussions, telemetry), two parallel execution systems (tasks.json vs Morgan's initiatives) where initiatives aren't even persisted, and DOD lives in three different places depending on which pipeline ran.

## What We Want

Redesign the entire .context/ tree from scratch. Make it clean, working, and reasonable.

- Study how popular systems handle project context (Taskmaster AI, Linear, Notion project structures, GitHub Projects, etc.)
- Design a new structure that reflects the ACTUAL workflow: CEO reads goals → picks work → work gets done → results tracked
- Every entity should be a first-class citizen with its own schema (no more "Morgan's initiatives" as ephemeral agent output)
- Kill the dual-system problem: one task/work-item system, not tasks.json AND initiatives AND backlog items
- Keep ALL existing context data — migrate it, don't lose it — but the folder structure and file formats can change completely
- This is for the agent-conductor repo only. Don't worry about sw/.context/ compatibility.

## Constraints

- The indexer (scripts/index-state.ts) must be updated to read the new structure
- The dashboard must still work after migration
- Directive pipeline (SKILL.md) must be updated to write to new locations
- No backwards compatibility with old formats — clean break, migrate everything

## Success Criteria

- A developer (or AI agent) can understand the entire context tree in under 2 minutes
- Every entity type has exactly ONE canonical location and ONE schema
- The read path matches the write path (what gets written is what gets read, where it gets written is where you look for it)
- Zero dead/orphaned folders
- All existing data preserved (migrated to new structure)
