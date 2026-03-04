# Brainstorm Synthesis: Redesign Pipeline Steps

> Directive: redesign-pipeline-steps
> Weight: strategic
> Date: 2026-03-03

## Problem Summary

Three pipeline weaknesses to address:
1. Brainstorm phase too narrow (strategic-only, no deliberation, no auditor)
2. Audit step conflates investigation with design
3. Casting and DOD are pure LLM judgment with no mechanical enforcement

## Approach Proposals

### Sarah (CTO) — Architecture Perspective

**Approach:** Clean separation of concerns is the core fix. Split the audit step into two distinct agents: **Investigator** (scans codebase, measures baselines, finds dead code — pure data gathering) and **Architect** (takes investigation output + Morgan's plan, recommends technical approach — pure decision-making). The investigator stays on opus because thoroughness matters. The architect gets the investigation data as input, reducing their token load.

For brainstorm: trigger on heavyweight AND strategic (not just strategic). Add a deliberation round where agents see each other's proposals and write rebuttals. But keep it ONE additional round, not iterative debate — diminishing returns after the first rebuttal.

For enforcement: bash scripts that validate JSON structure. Cast validation = check Morgan's output against casting-rules.md patterns mechanically. DOD enforcement = extend the Stop hook to read initiative DOD from checkpoint and require reviewer verification of each criterion. Don't build agent-based validation — that's just adding more LLM judgment to validate LLM judgment.

**Trade-offs:** More pipeline steps = more agent spawns = more token cost. But the investigation/design split actually saves tokens by giving the architect focused input instead of asking one agent to do everything.

**Avoid:** Don't add a separate "design agent" as a new named character. The architect role should be filled by Sarah (CTO) or the initiative's auditor based on casting rules. No new agent definitions.

**Confidence:** High

### Morgan (COO) — Operations Perspective

**Approach:** Mechanical triggers for brainstorm, not LLM classification. Fire brainstorm when: (a) directive weight is heavyweight or strategic, AND (b) the directive does NOT prescribe a specific technical approach. Detect (b) by checking if the directive .md contains an explicit "Approach:" or "How:" section. If the directive tells you HOW, skip brainstorm — just plan. If it only tells you WHAT, brainstorm.

For audit/design split: make it a sequential two-phase audit. Same agent (auditor), two outputs: first pass is investigation JSON (baselines, files, dead code), second pass is design JSON (recommended approach, sequence, risks). The agent reads investigation output before writing design. This avoids spawning two separate agents while still separating the outputs structurally.

For casting validation: add a `validate-cast.sh` script that Morgan's plan JSON is piped through. It checks: every initiative has an auditor, builder is not the same as reviewer, reviewer matches the domain pattern, complex initiatives have 2+ reviewers. Fail = block, pass = continue. Simple bash + jq.

For DOD: extend the Stop hook. Read each initiative's DOD from checkpoint. For each criterion, check that the reviewer's `dod_verification` section marks it as met. If any unmet, block the stop.

**Trade-offs:** Two-phase audit in one agent is cheaper but risks the single agent getting confused or producing a bloated response. Separate agents are cleaner but cost more tokens.

**Avoid:** Don't add rounds of agent debate. Each round costs ~10K tokens and the signal-to-noise ratio drops fast. One brainstorm round + synthesis by Alex is sufficient.

**Confidence:** Medium — the brainstorm trigger heuristic (checking for "Approach:" section) is fragile. Might need refinement.

### Marcus (CPO) — Product/UX Perspective

**Approach:** Think about the CEO experience. The CEO's workflow: issue directive, get a plan to approve, see it executed, read the report. Each redesigned step should improve CEO confidence in the plan.

Brainstorm: the value is not the brainstorm itself — it's the CEO seeing that multiple perspectives were considered. Include brainstorm synthesis in the plan-for-approval artifact so the CEO sees "Sarah wanted X, Morgan wanted Y, we went with Z because..." This makes plan approval meaningful instead of rubber-stamping.

Audit/design split: the CEO never sees audit internals, but the audit quality determines whether the plan is based on reality or assumptions. Upgrade the auditor to opus (from haiku — this was a cost-saving that backfired). Whether it's one agent or two is an implementation detail the CEO doesn't care about.

DOD enforcement: this is the most CEO-visible improvement. Currently the CEO has to trust that reviewers checked DOD. Add a DOD summary table to the digest report: each initiative, each DOD criterion, met/unmet, verified by whom. The CEO glances at the table and knows immediately if quality gates held. The mechanical enforcement (Stop hook) is insurance — the visible table is the real product.

**Trade-offs:** More process overhead per directive. But the current failure mode (bad audit = wrong plan = wasted build cycles) costs more than the overhead.

**Avoid:** Don't make the brainstorm visible to the CEO as a separate approval gate. Strategic directives already have a CEO stop for clarifying questions — don't add another. Bundle brainstorm into the plan-for-approval.

**Confidence:** High

## Synthesis: Convergence Points

All three agree on:
1. **Brainstorm should fire on heavyweight + strategic** (not just strategic)
2. **Audit and design should be structurally separated** (disagree on mechanism: two agents vs two-phase)
3. **Casting validation should be a bash script** (mechanical, not agent-based)
4. **DOD enforcement should extend the Stop hook** (not a new hook)
5. **Auditor should be on opus** (not haiku)
6. **Brainstorm deliberation: one round of rebuttals** (Sarah) vs none (Morgan). Marcus doesn't care about internal mechanism.

Key disagreement:
- **Audit split mechanism:** Sarah wants two separate agents (investigator + architect). Morgan wants one agent with two-phase output. Sarah's argument: separation prevents the design from being biased by investigation anchoring. Morgan's argument: one agent is cheaper and simpler. This is the main design question for the CEO.

## CEO Clarification Questions

1. **Audit split: two agents or two-phase single agent?** Sarah argues for clean separation (prevents investigation anchoring design). Morgan argues for one agent with structured two-pass output (cheaper, simpler). Which direction?

2. **Brainstorm deliberation depth: should agents see each other's proposals and rebut?** Sarah says one rebuttal round catches blind spots. Morgan says it's not worth the tokens. The difference is ~20K tokens per directive. Worth it?

3. **Brainstorm trigger: should it fire on ALL heavyweight directives, or only heavyweight + no prescribed approach?** Morgan proposes a heuristic (check for "Approach:" section in directive). Sarah says just fire on all heavyweight — the cost is low and the benefit of deliberation on prescribed approaches is catching bad assumptions in the prescription.
