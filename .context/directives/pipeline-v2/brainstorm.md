# Brainstorm: Kill Initiatives + Enforce Pipeline Steps

**Directive:** terminology-cleanup
**Weight:** strategic (deliberation rounds included)
**Participants:** Sarah (CTO), Marcus (CPO), Morgan (COO)
**Date:** 2026-03-06

---

## Round 1: Terminology — Kill "Initiatives"

### Phase 1: Proposals

**Sarah (CTO / Auditor):** Eliminate 'initiatives' entirely. Morgan outputs 'tasks' directly, directive.json replaces 'initiatives[]' with 'produced_projects[]' references pointing to project.json files, current.json replaces 'initiatives[]' with lightweight 'projects[]'. Watcher reads project.json for task-level detail. UI shows project cards linking to detail views. Key: don't do a pure rename — collapse the duplication.

**Marcus (CPO):** Hierarchy becomes Directive > Project(s) > Task(s). Morgan's plan items called 'projects' (what they become). directive.json has 'projects[]' references, not duplicated data. Dashboard shows project cards. Don't invent new terms — use existing Goal > Project > Task vocabulary.

**Morgan (COO):** Two-layer rename. Morgan outputs 'tasks' universally. directive.json uses 'produced_projects[]'. Mechanical find-and-replace across ~27 files. Don't migrate historical files. Don't restructure pipeline — just terminology.

### Phase 2: Deliberation

**Sarah rebuts Morgan:** Rename preserves the disease (state duplication). Calling Morgan's output 'tasks' creates naming collision with project.json tasks. Collapse the duplication, don't rename it.

**Marcus rebuts Morgan:** Morgan plans at project level (agents, DOD, scope). Calling those 'tasks' creates the exact collision that caused the initiatives mess. Plan items should be called 'projects'.

**Morgan rebuts Sarah:** Watcher reading project.json adds runtime dependency. Keep directive.json self-contained. Rename only, no watcher rewrite.

### Round 1 Resolution

**Resolved — Morgan's output naming:** Morgan outputs "projects" (not "tasks" or "initiatives"). Both Sarah and Marcus caught the naming collision. Projects contain tasks. One term per level.

**Resolved by CEO:**
1. Reference-based (Sarah/Marcus win) — directive.json stores references only, project.json is single source for task state
2. Directive > Project(s) > Task(s) with nested folders — projects live under the directive directory
3. Pipeline flexibility already exists — skip this scope
4. Directive directories — all artifacts (brainstorm, audit, projects) live under the directive

**New structure decided by CEO:**
```
.context/directives/{directive-id}/
  directive.json        # Pipeline state, weight, references
  directive.md          # CEO brief
  brainstorm.md         # Pre-planning (strategic/heavyweight)
  audit.md              # Technical audit
  projects/
    {project-id}/
      project.json      # Tasks[], DOD, agents — THE source of truth
```

---

## Round 2: Enforce Pipeline Steps via Directory Structure

### Proposals

**Sarah (CTO):** Single `validate-gate.sh` script that takes (step-name, directive-dir), checks prerequisite artifacts exist and are structurally valid (jq for JSON, required fields for markdown). Weight-based skip rules: lightweight gets `.skip` marker files. The gate script should WRITE to directive.json as a side-effect of passing — making JSON state a mechanical output, not a separate LLM action that can drift. Key insight: the NEXT step's gate validates the PREVIOUS step's artifact, creating a chain where skipping one gate means the next catches it.

**Morgan (COO):** Artifact-chain enforcement: each step writes a required file, next step validates it exists. Triage → directive.json, brainstorm → brainstorm.md, audit → audit.md, planning → morgan-plan.json, approval → projects/{id}/project.json, execution → build-{task-id}.md + review-{task-id}.md per task. Single validate-step-gate.sh with (directive-dir, target-step). Per-task review enforcement: can't advance to task N+1 until review file exists. File-existence check, not LLM judgment. Never rely on LLM prompting for enforcement (proven failure).

**Marcus (CPO):** File-existence as enforcement. Each step produces a mandatory file. CEO experience: dashboard reads directory → shows green (file exists) / red (missing) / gray (not reached) stepper. CEO glances, sees all green, trusts output — or sees red, knows which step was skipped. Per-task directories with lifecycle artifacts. Don't build audit-trail systems — file-existence is the simplest enforcement that works. Also: review.md passing the gate doesn't mean quality — need structured JSON review format inside files so a validator can spot rubber-stamp reviews.

### Round 2 Synthesis

**Full convergence:**
- All 3: Single bash gate script, not LLM judgment
- All 3: File-existence checks at step boundaries
- All 3: Per-task build + review artifacts that block progression
- All 3: Weight-based skip rules (lightweight skips brainstorm/audit)
- All 3: Never use LLM prompting as enforcement (proven failure from Phase 3)

**Key insights that survived challenge:**
1. **Gate script WRITES to directive.json** (Sarah) — passing the gate updates pipeline state as a side-effect, preventing drift between file state and JSON state
2. **Chain validation** (Sarah) — next step validates previous step's artifact, so skipping one gate is caught by the next
3. **Per-task review blocking** (Morgan) — can't advance to task N+1 without review-{task-id}.md
4. **Dashboard reads directory** (Marcus) — green/red/gray stepper derived from file existence, not LLM-reported state
5. **Quality validation inside files** (Marcus) — file existence catches skipped steps, structured JSON inside files catches rubber-stamp reviews

**Required artifacts per step (weight-conditional):**

| Step | Artifact | Required for | Validated by |
|------|----------|-------------|-------------|
| Triage | directive.json (with weight) | all | gate before read |
| Brainstorm | brainstorm.md | heavyweight, strategic | gate before plan |
| Plan | morgan-plan.json | medium+ | gate before audit |
| Audit | audit.md | medium+ | gate before approve |
| Approve | projects/{id}/project.json | medium+ (auto for medium) | gate before execute |
| Execute (per task) | build-{task-id}.md | all | gate before review |
| Review (per task) | review-{task-id}.md | all | gate before next task |
| Wrapup | digest.md | all | gate before report |

Lightweight directives: brainstorm.skip, audit.skip, approve.skip marker files satisfy gates.

---

## Round 3: Task Authorship + Reopenable Directives

### Proposals

**Sarah (CTO):** Split planning into two steps. Morgan owns project identification (what, priority, cast, scope). Task breakdown moves to a new "project brainstorm" step that fires for EVERY project — spawns the assigned builder + Sarah + one specialist. They produce: task decomposition, file-level scope, DOD, sequencing rationale. Output feeds into project.json. Upstream context (directive brainstorm, audit) is mandatory input. For reopening: add 'reopened' status + revision counter. Reopen restarts from Step 3 (Morgan planning) for new projects only. Dashboard stepper shows current revision's pipeline, with collapsed "Previous runs" section.

**Morgan (COO):** I keep project-level planning (scope, cast, sequencing, priority) but stop writing tasks and DOD. My output becomes morgan-plan.json with projects[] where each project has: id, title, scope_summary, agent, reviewers, phases, complexity_class, brief. After approval, each project gets a brainstorm: Sarah + assigned builder produce task breakdown + DOD. Complex = full brainstorm; simple = Sarah solo. Builders always read upstream (directive brainstorm, audit). For reopening: directive.json gains iterations[] array — each records opened_at, closed_at, projects added. CEO reopens → I plan new projects only → same approval flow → land in existing directive dir. Status: pending → triaged → executing → completed → reopened → executing → completed.

**Marcus (CPO):** CEO experience should NOT change. Morgan still produces a single plan artifact the CEO reviews — internal collaboration (Morgan → Sarah → specialists) happens automatically. CEO sees same approval step, just higher-quality tasks. Dashboard shows planning status per-project. For reopening: single CLI command `/directive reopen {id}` with optional reason. Dashboard shows version indicator (v2, v3). Completed projects stay done, new ones appear. Reopening is faster than new directive because context exists. Heuristic: same user problem = same directive. CEO approves ONCE (projects + priorities), task detail is delegated. Don't make CEO approve twice.

### Round 3 Synthesis

**Full convergence on task authorship:**
- All 3: Morgan stops writing tasks/DOD, keeps project-level planning only
- All 3: Sarah + assigned builder produce task breakdown post-approval
- All 3: Upstream context (directive brainstorm, audit) is mandatory input to project brainstorm
- All 3: CEO approval stays at project level (one gate, not two)

**Full convergence on reopenable directives:**
- All 3: Directive is a living container, not one-shot
- All 3: Reopen restarts from planning (Step 3) for NEW projects only
- All 3: Completed projects untouched on reopen
- All 3: Same directive, not a new entity

**Key decisions:**

| Question | Answer | Rationale |
|----------|--------|-----------|
| Who writes tasks? | Sarah + assigned builder (project brainstorm) | Morgan plans WHAT, tech team plans HOW. Phase 3 proved non-technical task plans get ignored. |
| Does every project get a brainstorm? | Yes — complex = full brainstorm, simple = Sarah solo lightweight | Even simple projects benefit from builder input on file-level scope |
| CEO approval count | ONE — project-level scope from Morgan | Task detail is delegated. Don't double the CEO's time. (Marcus) |
| How does CEO reopen? | `/directive reopen {id}` or status transition | Same entity, new projects added. Context preserved. |
| Pipeline on reopen | Restart from Step 3 (Morgan) for new projects | Skip triage/read/context — directive already understood. (Marcus) |
| Tracking mechanism | `revision` counter + `iterations[]` in directive.json | Each iteration records what projects were added and when (Morgan) |

**Revised planning flow:**
```
Step 3: Morgan → outputs projects[] (NO tasks)
Step 3b: Audit (Sarah investigates codebase for each project)
Step 3c: Project brainstorm (Sarah + builder produce tasks/DOD per project)
Step 4: CEO approves (projects + tasks visible in single artifact)
Step 5: Execute (per project, per task, with gate enforcement)
```

---

## CEO Addition: Completion Gate

**Requirement:** Directives cannot auto-mark as done. The CEO must approve completion.

**Flow:**
```
Execute → Wrapup (digest/report) → CEO Completion Gate → done / reopen
```

- After wrapup produces the digest, pipeline status becomes "awaiting_completion" (needsAction = true)
- Dashboard shows "Awaiting CEO sign-off" with the digest summary
- CEO reviews and either:
  - **Approves** → status = "completed", directive done
  - **Reopens** → status = "reopened", CEO states what's missing, Morgan plans new projects (Step 3)

This means the CEO controls both ends of the directive lifecycle:
- **Start**: CEO issues directive (or approves scout proposal)
- **End**: CEO confirms the work is actually satisfactory

The gate reuses the same `needsAction` UI pattern as the approval step — no new UI needed, just a new step in the pipeline.

**Revised pipeline steps:**

| Step | Agent | Artifact | Gate? |
|------|-------|----------|-------|
| Triage | CEO | directive.json | — |
| Brainstorm | C-suite | brainstorm.md | weight-conditional |
| Plan | Morgan | morgan-plan.json | — |
| Audit | Sarah | audit.md | weight-conditional |
| Project brainstorm | Sarah + builder | project.json (with tasks) | per-project |
| Approve | CEO | approved flag in directive.json | CEO action |
| Execute | Engineers | build + review artifacts per task | gate per task |
| Wrapup | CEO | digest.md | — |
| Completion | CEO | completed flag in directive.json | CEO action |

**Revised directive.json on reopen:**
```json
{
  "status": "reopened",
  "revision": 2,
  "iterations": [
    { "revision": 1, "opened_at": "...", "closed_at": "...", "projects": ["schema-cleanup", "pipeline-docs"] },
    { "revision": 2, "opened_at": "...", "closed_at": null, "projects": ["ui-polish"] }
  ]
}
```
