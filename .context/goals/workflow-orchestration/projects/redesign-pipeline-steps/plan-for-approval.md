# Plan for Approval: Redesign Pipeline Steps

> Directive: redesign-pipeline-steps
> Weight: strategic
> Date: 2026-03-03
> Status: AWAITING CEO APPROVAL

## TL;DR

- **What**: Redesign the directive pipeline's brainstorm, audit, casting, and DOD steps to be more deliberative and mechanically enforceable
- **Scope**: 5 initiatives (3 moderate, 1 complex, 1 simple), all in agent-conductor repo
- **Risk**: Proceed as-is -- brainstorm synthesis + CEO answers resolved all design questions cleanly
- **Auto-ships**: 0 -- all initiatives modify pipeline behavior, CEO should review
- **Needs your call**: Approve the full plan, or adjust priorities/scope

Approve all / Approve with changes / Reject

---

## Brainstorm Summary (incorporated)

Three C-suite perspectives explored. CEO resolved all disagreements:
- **Audit split**: Two separate agents (Investigator + Architect). Clean separation.
- **Deliberation depth**: Rebuttals for strategic directives only. No rebuttals for heavyweight.
- **Brainstorm trigger**: All heavyweight+ directives get brainstorm. Simple rule.

Full synthesis: `brainstorm.md`

---

## Risk & Scope Assessment (Morgan)

**Risks:**
1. Changing brainstorm and audit steps mid-flight could break active directives with existing checkpoint schemas -- need backward compatibility
2. Two-agent audit split doubles audit token cost per directive (~$0.60 extra per directive)
3. DOD enforcement depends on checkpoint data fidelity -- if reviewers don't write dod_verification to checkpoint, the hook silently passes

**Over-engineering flags:**
- Rebuttal round adds ~20K tokens per strategic directive. Strategic is rare (1-2/month), so total cost is negligible, but mechanism must stay simple: one round, fixed format, no iteration.

**Recommendation:** Proceed as-is

---

## P0 -- Must Ship

### 1. Expand Brainstorm: Trigger, Deliberation, and Auditor Participation
**Complexity:** moderate | **Phases:** design, build, review | **Cast:** auditor=morgan, builder=taylor, reviewer=morgan

**Scope:** Three changes: (1) fire brainstorm on all heavyweight + strategic, (2) add deliberation round for strategic only (agents see each other's proposals, write one rebuttal), (3) add auditor to brainstorm participants.

**User scenario:** When the CEO issues a heavyweight directive, the team automatically brainstorms approaches before Morgan plans -- and for strategic directives, agents debate before Alex synthesizes.

**Audit findings:**
- Heavyweight section already says brainstorm is "mandatory" but has only a paragraph summary (vs strategic's detailed spawn pattern)
- Brainstorm prompt has no deliberation mechanism
- Brainstorm schema has no rebuttal fields
- Auditor not listed as participant anywhere

**Approach:** Unify heavyweight brainstorm to use same detailed spawn pattern as strategic. Add deliberation round with strategic-only gating. Add rebuttal fields to schema. Add auditor to participant list.

**DOD:**
1. 00-delegation-and-triage.md heavyweight process includes full brainstorm spawn pattern
2. brainstorm-prompt.md includes deliberation round with "strategic only" gating
3. brainstorm-output.md schema includes rebuttal fields (rebuttals array)
4. Auditor listed as brainstorm participant in both heavyweight and strategic sections
5. Heavyweight brainstorm does NOT include deliberation round

---

### 2. Split Audit into Investigator + Architect (Two Agents)
**Complexity:** complex | **Phases:** design, clarification, build, review | **Cast:** auditor=sarah, builder=taylor, reviewers=[morgan, sarah]

**Scope:** Split 06-technical-audit.md into two-agent sequential flow. Create new agent definition (investigator.md, model: opus), new prompt templates (investigator-prompt.md, architect-prompt.md), new schema (investigation-output.md). Update audit-output.md to focus on design. Upgrade auditor.md model from haiku to opus.

**User scenario:** When the pipeline reaches audit, Alex spawns an Investigator (pure data: scan, measure, flag) then an Architect (reads investigation + Morgan's plan, recommends approach) -- preventing investigation from anchoring the design.

**Audit findings:**
- auditor.md uses model: haiku (directive calls this a "false economy")
- Auditor prompt combines investigation + design in one pass
- Audit output schema mixes data fields with design fields
- No investigator.md, architect-prompt.md, or investigation-output.md exist

**Approach:** Create investigator.md agent definition (opus, scanner tools only). Create investigator-prompt.md (pure data gathering). Create investigation-output.md schema (no recommended_approach). Create architect-prompt.md (takes investigation output + Morgan plan). Update audit-output.md for architect-only output. Update 06-technical-audit.md for two-agent flow. Change auditor.md model to opus.

**DOD:**
1. 06-technical-audit.md describes two-agent sequential flow: Investigator first, then Architect
2. investigator-prompt.md exists with pure data-gathering instructions (no recommendations)
3. architect-prompt.md exists with instructions to read investigation output + Morgan's plan
4. investigation-output.md schema exists (baseline, active_files, dead_code, findings -- no recommended_approach)
5. audit-output.md updated to reference investigation data as input, focus on design
6. auditor.md model changed from haiku to opus
7. New investigator.md agent definition with model: opus

**Follow-up (medium risk):** Consider whether simple initiatives still use single-agent audit or always go through investigator+architect. Recommend: split for moderate+ complexity, single auditor for simple. CEO to decide at review time.

---

### 3. Create validate-cast.sh for Mechanical Casting Validation
**Complexity:** moderate | **Phases:** design, build, review | **Cast:** auditor=morgan, builder=casey, reviewer=morgan

**Scope:** New bash script in .claude/hooks/ that validates Morgan's plan JSON: every initiative has an auditor, builder != reviewer, complex work has C-suite reviewer. Update 05-morgan-planning.md to include validation step.

**User scenario:** After Morgan outputs her plan, Alex pipes it through validate-cast.sh which mechanically checks casting rules -- blocking the pipeline if rules are violated.

**Audit findings:**
- No validate-cast.sh exists
- Casting rules documented in casting-rules.md (77 lines) and Morgan prompt (164 lines)
- No validation after Morgan's JSON parse in 05-morgan-planning.md
- enforce-completion.sh provides good bash+jq template pattern

**Approach:** Create validate-cast.sh following enforce-completion.sh pattern. Output JSON {valid, violations}. Update 05-morgan-planning.md pipeline doc.

**DOD:**
1. validate-cast.sh exists in .claude/hooks/ and is executable
2. Validates: auditor present, builder != reviewer, complex work has C-suite reviewer
3. Outputs JSON with pass/fail and violation list
4. 05-morgan-planning.md updated with validation step after JSON parse
5. Uses jq (consistent with existing hook pattern)

---

### 4. Extend Stop Hook for Initiative-Level DOD Enforcement
**Complexity:** moderate | **Phases:** design, build, review | **Cast:** auditor=morgan, builder=casey, reviewer=morgan

**Scope:** Extend enforce-completion.sh to check dod_verification for each completed initiative. Update checkpoint.md schema. Verify review phase writes dod_verification to checkpoint.

**User scenario:** When the directive pipeline wraps up, the Stop hook reads each initiative's DOD from checkpoint and blocks if any criteria are unverified -- preventing incomplete work from being marked done.

**Audit findings:**
- enforce-completion.sh has zero DOD checking (152 lines, no mention of dod/DOD)
- dod_verification structure already defined in reviewer.md and 09-execute-initiatives.md
- checkpoint.md schema lacks dod_verification field documentation
- Gap: unclear if review phase actually writes dod_verification to checkpoint

**Approach:** Add dod_verification to checkpoint schema. Extend enforce-completion.sh to iterate initiatives and check dod_verification.all_met. Block with specific messages. Keep existing enforcement intact.

**DOD:**
1. enforce-completion.sh checks dod_verification for each completed initiative
2. Blocks if any completed initiative has unmet or missing DOD verification
3. Violation messages specify which initiative and which DOD criteria are unverified
4. checkpoint.md schema documents dod_verification field
5. Existing enforcement checks unchanged

**Follow-up (medium risk):** Verify 09-execute-initiatives.md actually writes dod_verification to checkpoint after review phase. If not, add that step.

---

## P1 -- Should Ship

### 5. Update SKILL.md Routing Table and Cross-References
**Complexity:** simple | **Phases:** build, review | **Cast:** auditor=morgan, builder=taylor, reviewer=morgan

**Scope:** Add new docs to SKILL.md routing table. Verify cross-references. Ensure step numbering consistency.

**User scenario:** When an agent reads SKILL.md to navigate the pipeline, the routing table lists all new docs and cross-references are valid.

**Audit findings:**
- SKILL.md routing table has 7 schemas, 5 templates, 3 rules entries
- Step numbering is clean, audit split doesn't change it (two sub-steps within 3b)

**DOD:**
1. SKILL.md routing table includes investigator-prompt.md, architect-prompt.md, investigation-output.md
2. validate-cast.sh listed in routing table
3. All cross-references in modified pipeline docs resolve correctly
4. Step numbering consistent with two-agent audit flow

---

## Execution Notes

**All changes are in the agent-conductor repo** (`/Users/yangyang/Repos/agent-conductor/`). No consumer repo changes.

**File manifest (new):**
- `.claude/agents/investigator.md`
- `.claude/hooks/validate-cast.sh`
- `.claude/skills/directive/docs/reference/templates/investigator-prompt.md`
- `.claude/skills/directive/docs/reference/templates/architect-prompt.md`
- `.claude/skills/directive/docs/reference/schemas/investigation-output.md`

**File manifest (modified):**
- `.claude/agents/auditor.md` (model: haiku -> opus)
- `.claude/hooks/enforce-completion.sh` (add DOD checking)
- `.claude/skills/directive/SKILL.md` (routing table updates)
- `.claude/skills/directive/docs/pipeline/00-delegation-and-triage.md` (brainstorm expansion)
- `.claude/skills/directive/docs/pipeline/05-morgan-planning.md` (cast validation step)
- `.claude/skills/directive/docs/pipeline/06-technical-audit.md` (two-agent flow)
- `.claude/skills/directive/docs/reference/templates/brainstorm-prompt.md` (deliberation round)
- `.claude/skills/directive/docs/reference/schemas/brainstorm-output.md` (rebuttal fields)
- `.claude/skills/directive/docs/reference/schemas/audit-output.md` (architect-only output)
- `.claude/skills/directive/docs/reference/schemas/checkpoint.md` (dod_verification field)

**Sequencing:** Initiatives 1-4 can build in parallel (no file overlap). Initiative 5 runs last (updates routing table after all other files exist).
