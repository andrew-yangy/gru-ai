# Directive: Redesign Pipeline Steps

## Goal
Redesign the directive pipeline's key steps to be clearer, more deliberative, and mechanically enforceable. Three specific problems to fix:

## Problems

### 1. Brainstorming Phase Needs Expansion
A brainstorm step already exists for strategic-weight directives (in `00-delegation-and-triage.md`). But it's too narrow:
- **Only fires for strategic weight** — heavyweight directives with multiple valid approaches also need deliberation
- **No arguing/debate** — agents propose approaches independently but never challenge each other's proposals. Should have a deliberation round where agents see each other's proposals and argue.
- **Auditor should participate** — the brainstorm currently only spawns C-suite (Sarah/Marcus/Priya). The auditor's codebase knowledge should inform approach feasibility DURING brainstorming, not just after Morgan plans.
- **Review the trigger criteria** — when should brainstorm fire? Currently tied to "strategic" classification. Should it fire more broadly?

### 2. Audit Step Conflates Investigation with Design
Step 3b "Technical Audit" does two things under one name:
- **Investigation**: scan files, measure baselines, flag dead code — this IS audit
- **Recommend technical approach**: this is DESIGN, not audit

The auditor agent is also on haiku (cheapest model) despite being the most critical step. Bad audit = everything downstream builds on wrong assumptions. Should be opus, and possibly multi-agent.

### 3. Casting and DOD Are Pure LLM Judgment
Morgan assigns agent cast per initiative with no enforcement. Nothing validates the cast is sensible. DOD criteria exist in project.json but nothing in the pipeline checks them before marking a directive complete. The Stop hook checks high-level requirements (reviewers spawned, digest written) but not initiative-specific DOD.

## Desired Outcomes
- Expand brainstorm step: broader trigger criteria, multi-round deliberation (propose -> argue -> converge), auditor participates for feasibility
- Clean separation between codebase investigation (audit) and technical approach (design)
- Auditor upgraded to opus model with optional multi-agent challenge pass
- Casting validation — mechanical check that Morgan's cast follows the rules
- DOD enforcement — extend Stop hook or add new hook to validate DOD criteria
- All changes reflected in SKILL.md, agent definitions, and hook scripts
- Pipeline docs updated to match

## Scope
This is agent-conductor framework code only. Changes to:
- `.claude/skills/directive/SKILL.md` (step definitions)
- `.claude/agents/auditor.md` (model upgrade, role clarification)
- `.claude/hooks/enforce-completion.sh` (DOD enforcement)
- Pipeline docs in `.claude/skills/directive/docs/pipeline/`
- Possibly new agent definitions or hook scripts

No changes to consumer projects (sw/, BuyWisely, etc.).
