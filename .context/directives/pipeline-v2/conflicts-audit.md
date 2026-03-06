# Conflicts Audit: CEO Completion Gate vs. Existing Pipeline Rules

**Auditor:** Sarah Chen (CTO)
**Date:** 2026-03-06
**Scope:** All pipeline docs, vision.md, lessons — rules about autonomy, approval, auto-completion, and CEO involvement

---

## Executive Summary

The proposed "CEO completion gate" (directives cannot auto-mark done; CEO must approve completion) conflicts with **7 specific rules** across 5 files. The conflicts are real but resolvable with a weight-based approach: lightweight stays autonomous, medium gets a soft gate, heavyweight already has hard gates.

The terminology issue ("initiatives" vs "tasks") is pervasive: **219 occurrences across 23 files** in the skills docs alone, plus 318 occurrences across 113 files in `.context/`.

---

## Conflict Table

| # | File | Line(s) | Rule Text (quoted) | Conflicts With | Severity | Resolution |
|---|------|---------|---------------------|----------------|----------|------------|
| C1 | `.context/vision.md` | 14 | "**Autonomy as default.** Low-risk work ships without CEO approval. The team does + reports." | CEO completion gate requiring approval for ALL directives | HIGH | **Keep as-is.** The completion gate should be weight-gated, not universal. Lightweight directives ship and report. This is the founding principle. |
| C2 | `.context/vision.md` | 18 | "**Risk-based decision authority.** Low = do + report. Medium = propose + approve. High = CEO decides." | A universal completion gate collapses all three tiers into "CEO decides" | HIGH | **Keep as-is.** This is the risk taxonomy. The completion gate should MAP to it, not override it. See proposed resolution below. |
| C3 | `.context/vision.md` | 103-104 | "Low-risk work ships without CEO approval and doesn't break things" / "CEO spends <45min/week reviewing reports and approving proposals" | CEO reviewing every directive completion breaks the 45min/week budget | HIGH | **Keep as-is.** A universal completion gate would blow the CEO time budget. Weight-gate it. |
| C4 | `00-delegation-and-triage.md` | 28 | Lightweight: "No Morgan. No C-suite challenges. **No CEO approval.** No worktree... Just get it done." | CEO completion gate adding approval to lightweight | MEDIUM | **Keep as-is for lightweight.** Lightweight = do + report. If the CEO wants to gate lightweight, that contradicts the entire weight system. |
| C5 | `00-delegation-and-triage.md` | 88 | Medium: "**No CEO approval gate** -- auto-approve the plan based on directive scope and guardrails" | CEO completion gate adding post-execution approval to medium | MEDIUM | **Modify.** This says no plan-approval gate, but is silent on completion. Add a soft completion gate for medium: directive reports completion + CEO can flag issues within 24h, but work is not blocked. |
| C6 | `00-delegation-and-triage.md` | 95 | Medium: "No pause for CEO sign-off. The CEO reviews the digest after the fact." | CEO completion gate requiring sign-off before marking done | MEDIUM | **Reconcile.** The "reviews after the fact" model is the right one for medium. The completion gate for medium should be: mark `completed`, CEO reviews digest, CEO can reopen if needed. Not a blocking gate. |
| C7 | `10-wrapup.md` | 132-149 | Step 6g auto-sets `status` to `"completed"` and marks all project.json statuses. No CEO gate mentioned. | CEO completion gate requiring approval before status change | HIGH | **Modify for heavyweight/strategic only.** Add a `"pending_ceo_approval"` status for heavyweight/strategic directives between wrapup and completion. Lightweight and medium go straight to `"completed"`. |

---

## Internal Contradictions (pre-existing, not caused by the new gate)

| # | Rule A | Rule B | Tension |
|---|--------|--------|---------|
| IC1 | `vision.md` L18: "Medium = propose + approve" | `00-delegation-and-triage.md` L88: Medium has "No CEO approval gate -- auto-approve" | Vision says medium needs approval; pipeline says medium auto-approves. The pipeline is more specific and intentional (it explicitly overrides the vision principle for plan-approval, not completion). But this is confusing. |
| IC2 | `10-wrapup.md` L200 (NEVER rules): "Mark a directive as complete when UI review is pending" | `09-execute-initiatives.md` L296: "When running as a CLI session (no Chrome MCP): Log the UI checks... The directive is NOT complete until UI review passes" | Both say "don't complete without UI review" but Step 6g (L132-149) auto-marks completed with no UI review check. The auto-completion in Step 6g can violate the NEVER rule. |
| IC3 | `10-wrapup.md` L146: "If some tasks are incomplete but the directive is done... set project status to completed with a note" | `09-execute-initiatives.md` L457-460: Tasks with `failed` or `partial` status block subsequent tasks | These don't directly conflict, but the wrapup allows marking a directive "completed" even when tasks failed, while execution treats failures as blocking. The completion status can misrepresent the outcome. |

---

## Proposed Resolution: Weight-Based Completion Model

### Lightweight Directives
- **Plan approval:** None (current behavior, keep)
- **Completion gate:** None (current behavior, keep)
- **Status flow:** `executing` -> `completed` (auto, Step 6g)
- **CEO involvement:** Reviews digest after the fact. Zero blocking gates.

### Medium Directives
- **Plan approval:** None (current behavior, keep -- auto-approve)
- **Completion gate:** Soft. Directive marks `completed` automatically. Digest is generated. CEO reviews digest. CEO can reopen with `/directive {name} --reopen` if issues found.
- **Status flow:** `executing` -> `completed` (auto, Step 6g). CEO can change to `reopened` if needed.
- **CEO involvement:** Reviews digest, can reopen. Not a blocking gate.

### Heavyweight Directives
- **Plan approval:** Hard gate (current behavior, keep)
- **Completion gate:** Hard gate (NEW). After Step 6g writes the digest, set status to `pending_ceo_completion` instead of `completed`. CEO reviews digest + git diff + review findings. CEO approves -> `completed`. CEO rejects -> `reopened` with feedback.
- **Status flow:** `executing` -> `pending_ceo_completion` -> `completed` (after CEO approval)
- **CEO involvement:** Two blocking gates: plan approval + completion approval.

### Strategic Directives
- **Plan approval:** Hard gate with clarification questions (current behavior, keep)
- **Completion gate:** Hard gate (NEW), same as heavyweight.
- **Status flow:** Same as heavyweight.

### Implementation Notes

1. **New status value needed:** `pending_ceo_completion` in directive.json. Add to the status enum in `directive-json.md` schema.
2. **Step 6g modification:** Check the directive's weight class. If heavyweight/strategic, set status to `pending_ceo_completion` instead of `completed`. If lightweight/medium, set to `completed` as today.
3. **Step 7 modification:** For heavyweight/strategic, Step 7 becomes a blocking gate: "Review the above. Approve completion or reopen with feedback." For lightweight/medium, Step 7 remains informational.
4. **UI review check:** Step 6g should verify that UI review is not pending before marking completed (fixes IC2). If `browser_test: true` and UI review hasn't been logged, set status to `pending_ui_review` regardless of weight class.

---

## "Initiatives" Terminology: Scope of Cleanup

**219 occurrences across 23 files** in `.claude/skills/directive/docs/`:

| File | Count | Priority |
|------|-------|----------|
| `09-execute-initiatives.md` | 58 | P0 -- this is the main execution doc, highest traffic |
| `morgan-prompt.md` (template) | 32 | P0 -- Morgan generates "initiatives", rename to "tasks" in output |
| `10-wrapup.md` | 17 | P1 |
| `07-plan-approval.md` | 16 | P1 |
| `digest.md` (template) | 13 | P1 |
| `architect-prompt.md` (template) | 7 | P2 |
| `phase-definitions.md` | 7 | P2 |
| `auditor-prompt.md` (template) | 6 | P2 |
| `00-delegation-and-triage.md` | 6 | P2 |
| `06-technical-audit.md` | 6 | P2 |
| `morgan-plan.md` (schema) | 6 | P2 |
| `investigator-prompt.md` | 5 | P3 |
| `casting-rules.md` | 5 | P3 |
| `01-checkpoint.md` | 4 | P3 |
| `failure-handling.md` | 5 | P3 |
| `directive-json.md` (schema) | 4 | P3 |
| `scope-and-dod.md` | 4 | P3 |
| `08-worktree-and-state.md` | 3 | P3 |
| `05-morgan-planning.md` | 4 | P3 |
| `checkpoint.md` (schema) | 2 | P3 |
| `audit-output.md` (schema) | 2 | P3 |
| `current-json.md` (schema) | 2 | P3 |
| `investigation-output.md` | 5 | P3 |

**Plus 318 occurrences across 113 files** in `.context/` (reports, plans, project files, lessons). Most of these are historical artifacts (completed reports, old plans) and do not need updating. Only active reference docs and schemas need the rename.

### Recommended Approach for Terminology

1. **Pipeline docs (P0-P1):** Rename "initiative" to "task" in the 5 highest-traffic files. This is the behavioral layer -- what agents read when executing.
2. **Morgan's output schema:** Keep `initiatives` as Morgan's INTERNAL planning term (she thinks in initiatives). The conversion happens in Step 4 (07-plan-approval.md) where `initiatives` become `tasks` in project.json. Document this explicitly: "Morgan outputs initiatives; project.json stores tasks."
3. **Historical artifacts:** Do NOT rename. Old reports and plans used "initiatives" -- that was correct at the time. Renaming history is churn with no value.
4. **Lessons and context.md:** Update only where the term appears in prescriptive guidance (not historical narrative).

---

## Summary of Recommendations

1. **Do NOT add a universal CEO completion gate.** It contradicts the founding autonomy principles and breaks the 45min/week CEO time budget.
2. **Add a completion gate ONLY for heavyweight and strategic directives.** These already have a plan-approval gate; a completion gate is the natural complement.
3. **Fix the IC2 pre-existing bug:** Step 6g should check `browser_test` before marking completed. UI review pending = not completed.
4. **Clarify the medium-approval contradiction (IC1):** Update vision.md to say "Medium = do + report (CEO can reopen)" instead of "Medium = propose + approve." The pipeline is right; the vision oversimplifies.
5. **New status value:** `pending_ceo_completion` for heavyweight/strategic directives.
6. **Terminology cleanup:** Prioritize the 5 highest-traffic pipeline docs. Keep Morgan's internal "initiatives" term but document the conversion boundary.
