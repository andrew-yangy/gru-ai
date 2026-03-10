# Pipeline Architecture

Why the pipeline has these steps in this order, and what governs weight adaptation.

## Core Principle: The Harness Determines Output Quality

The bottleneck for agent reliability is not model intelligence — it's the environment around the model (Anthropic + OpenAI, converged 2025-2026). The pipeline steps, validation scripts, and review gates ARE the product. Agent output quality is a function of harness quality, not model capability.

## Step Order Rationale

The 15-step pipeline follows a deliberate information flow:

1. **Triage** — classify before committing resources. Prevents heavyweight process for lightweight work (token waste) and lightweight process for heavyweight work (skipped safety gates).
2. **Checkpoint** — recover from prior session death. Sessions die at context limits; this prevents restart-from-scratch.
3. **Read** — load context before any agent spawns. Agents without context hallucinate solutions that violate existing patterns.
4. **Context** — broader context scan. Read is the directive; context is the environment.
5. **Audit** — ground truth from the codebase. Without audit, agents propose changes to imagined code. Two-phase audit (investigator + architect) separates data gathering from recommendations to prevent confirmation bias.
6. **Brainstorm** — explore approaches before committing to one. Heavyweight/strategic only. Multiple C-suite perspectives surface trade-offs the COO alone would miss.
7. **Clarification** — synthesize verified intent. Runs for ALL weights. Feeds the COO a clean intent statement rather than raw directive text + audit + brainstorm.
8. **Plan** — COO decomposes into projects/tasks. Happens AFTER audit so the plan is grounded in codebase reality.
9. **Approve** — CEO gate for heavyweight/strategic. Catches misalignment before execution burns tokens.
10. **Project-brainstorm** — CTO + builder decompose tasks with DOD. Happens AFTER approval so effort isn't wasted on rejected plans.
11. **Setup** — worktree isolation. Keeps directive work separate from CEO's working tree.
12. **Execute** — build + review per task. Reviews happen DURING execution, not after.
13. **Review-gate** — hard gate verifying all reviews happened. The #1 failure mode is "builds ran, reviews didn't."
14. **Wrapup** — follow-ups, stale docs, digest, lessons, design docs. Captures institutional knowledge.
15. **Completion** — CEO approves. No directive auto-completes.

## Weight Adaptation

| Weight | Skips | Auto-approves | Full process |
|--------|-------|---------------|-------------|
| Lightweight | brainstorm | clarification, approve | Everything else runs |
| Medium | brainstorm | clarification, approve | Everything else runs |
| Heavyweight | nothing | nothing | Full pipeline with CEO gates |
| Strategic | nothing | nothing | Full pipeline + deliberation round in brainstorm |

**Why not skip more for lightweight?** Every step that was "skipped for efficiency" eventually caused a failure. Audit catches scope creep. Clarification prevents intent drift. Review-gate prevents shipped-without-review. The cost of running lightweight steps is small; the cost of skipping them is a CEO reopen.

## Invariants

These must always be true for the pipeline to work:

- **Builders never see each other's output.** Parallel builders in the same wave get independent context. Cross-contamination causes cascading errors.
- **Reviews use fresh context.** Reviewers never see builder reasoning. They judge code on its own merits. Builder reasoning creates confirmation bias.
- **DOD is verified by reviewers, not builders.** Self-certification is unreliable. Every DOD criterion must be marked by someone who didn't write the code.
- **directive.json IS the checkpoint.** Pipeline state persists in directive.json, not in session memory. Any session can resume from directive.json state.
- **CEO brief flows verbatim to builders.** No intermediary rewrites the CEO's words. Intent degrades through abstraction layers.

## Design Decisions

### Why Sub-Agents Instead of One Long-Running Agent
A single agent accumulates context until it degrades. Sub-agents start fresh, produce focused output, and return condensed results. Anthropic's multi-agent research (Jun 2025): multi-agent outperformed single-agent by 90.2%, with token usage explaining 80% of performance variance.

### Why Reviews Are Inline, Not Batched
Building all tasks then reviewing all tasks means review findings arrive too late to fix without rework. Inline reviews (build → review → fix → next task) catch issues while context is fresh and the fix is cheap.

### Why the COO Plans, Not the CEO Session
The CEO session must stay clean for strategic oversight. If the CEO session plans and builds, it accumulates context that degrades its judgment on subsequent decisions. The COO operates in a sub-agent with scoped context.

### Why Wave-Based Parallelism, Not Free Parallelism
Uncontrolled parallelism causes file conflicts. The wave algorithm mechanically detects file overlap and enforces sequential execution for conflicting tasks. Deterministic, no LLM judgment involved.
