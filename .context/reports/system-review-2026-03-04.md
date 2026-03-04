# System Review & Smoke Test Report

**Date:** 2026-03-04
**Scope:** Comprehensive review of all changes from 2026-03-03/04 (pipeline docs, hooks, agent definitions, casting rules, project completions, context tree cleanup, CLAUDE.md updates)
**Classification:** Medium
**Status:** Review complete, 2 build-breaking bugs found, fixes needed

## TL;DR

The restructure is sound. 27 modular pipeline docs, 4 enforcement hooks, 14 agent definitions, 6 project completions, and the API_BASE migration are all structurally correct and well-organized. Two build-breaking bugs in the frontend need fixing before this can ship.

## Build Status

- **TypeScript type-check (`npx tsc --noEmit`):** PASS (no errors)
- **Vite build (`npx vite build`):** FAIL -- 2 syntax errors in frontend files

### Bug 1: Broken import in ArtifactsPage.tsx (CRITICAL)

`src/components/artifacts/ArtifactsPage.tsx` lines 12-13: the `import { API_BASE } from '@/lib/api'` line was inserted inside an existing `import { ... } from 'lucide-react'` block, creating invalid syntax:

```tsx
import {
import { API_BASE } from '@/lib/api';
  FileText,
```

**Fix:** Move `import { API_BASE } from '@/lib/api';` to its own line BEFORE the lucide-react import block, and ensure the lucide-react import starts clean.

### Bug 2: Redundant const in SettingsPage.tsx (CRITICAL)

`src/components/settings/SettingsPage.tsx` line 7: After importing `API_BASE`, there's a redundant re-declaration:

```tsx
import { API_BASE } from '@/lib/api';

const API_BASE = `${API_BASE}`;
```

This causes a build error (redeclaring an imported binding).

**Fix:** Delete line 7 (`const API_BASE = \`${API_BASE}\`;`).

## Hook Smoke Tests

All 4 enforcement hooks tested and passing:

| Hook | Test | Result |
|------|------|--------|
| enforce-orchestrator-scope.sh | Allow .context/ write | PASS |
| enforce-orchestrator-scope.sh | Allow .claude/ write | PASS |
| enforce-orchestrator-scope.sh | Deny src/ write | PASS (correctly blocked) |
| validate-cast.sh | Valid cast | PASS |
| validate-cast.sh | No auditor + builder==reviewer | PASS (caught both violations) |
| validate-cast.sh | Complex initiative without C-suite reviewer | PASS (caught violation) |
| detect-stale-docs.sh | Known file reference | PASS (found 9 stale docs) |
| detect-stale-docs.sh | Empty input | PASS (exit 0, no output) |
| enforce-completion.sh | (not live-tested -- requires active checkpoint) | N/A |

## checkpoint.sh Tests

| Command | Result |
|---------|--------|
| init | PASS -- creates checkpoint with correct schema |
| track-agent | PASS -- deduplicates, updates enforcement.agents_spawned |
| track-artifact | PASS -- deduplicates, updates enforcement.review_artifacts_written |
| read | PASS -- outputs valid JSON |
| delete | PASS -- cleans up file |

## Agent Definition Review

All 14 agent files have valid YAML frontmatter with:
- `name` field matching expected agent name
- `model` field (opus for investigator/auditor, inherit for others)
- `tools` field with role-appropriate restrictions
- `memory: project` on all named agents

**Minor DOD discrepancy:** improve-agent-productivity project task 1.1 DOD says "haiku for auditor" but auditor.md has `model: opus`. This was likely an intentional upgrade (auditors need reasoning power). No functional impact.

**Specialist agents verified:** jordan-backend, riley-frontend, casey-data, taylor-content, sam-qa all have domain-specific context, patterns, pitfalls, and engineering skills sections. Well-structured.

**Generic role agents verified:** builder.md, reviewer.md, investigator.md, auditor.md all have focused prompts with output format specifications.

## Pipeline Doc Verification

- SKILL.md: 146 lines (meets <150 DOD)
- All 11 pipeline docs exist and are referenced in routing table
- All 19 reference docs exist (8 schemas, 7 templates, 4 rules)
- Cross-references between docs verified
- NEVER/ALWAYS rules in 10-wrapup.md are consistent with those in SKILL.md (they're duplicated, which is intentional for when agents load individual docs vs the routing map)

## Context Tree Verification

- All directive JSONs: valid JSON, correct statuses
- All goal.json files: valid JSON, correct statuses
- All project.json files: valid JSON, correct goal_id references
- Deleted files (agent-productivity goal, skill-md-restructure project): no stale references found
- `specialist-agents-and-org-teams` directive: properly cancelled with superseded note
- `correction-to-code-pipeline` project: properly deferred, state-watcher.ts now handles `deferred` status

## API_BASE Migration

- `src/lib/api.ts` created with `API_BASE` and `WS_URL` exports
- 18 frontend files updated to use centralized constants
- Zero remaining hardcoded `http://localhost:4444` or `ws://localhost:4444` references
- `useWebSocket.ts` and `dashboard-store.ts` properly updated
- 2 files have broken imports (see bugs above)

## Potentially Stale Docs

26 docs reference modified files but weren't updated themselves. Most are historical reports referencing `SKILL.md` (expected -- reports are snapshots of their time, not living docs). The `vision.md` agent references are to role names, not content, so no update needed.

## Minor Findings (non-blocking)

1. **improve-agent-productivity.json** has `produced_projects: []` and `report: null` -- should reference the improve-agent-productivity project and skill-md-restructure report
2. **NEVER/ALWAYS rules duplication** -- same rules appear in both SKILL.md and 10-wrapup.md. Intentional (agents may load only individual docs) but creates maintenance burden if rules change
3. **Alex frontmatter hooks** reference `Edit|Write` PreToolUse matcher, but Alex's tools list excludes Write/Edit entirely. The hook is redundant defense-in-depth -- harmless but unnecessary
