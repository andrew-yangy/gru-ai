# Verification

How the pipeline ensures output quality through reviews, DOD, and trust boundaries.

## Core Principle: Test Quality Is the Steering Mechanism

"Claude will work autonomously to solve whatever problem I give it. So it's important that the task verifier is nearly perfect, otherwise Claude will solve the wrong problem." — Anthropic, Building a C Compiler (Feb 2026)

The quality of verification determines the quality of output. If reviews are weak, agents ship weak work. If DOD is vague, agents declare "done" prematurely.

## Three Verification Layers

### Layer 1: Code Review (Mechanical)
Fresh-context review of code changes. Reviewer sees file contents + diff + architect's recommended approach. NO builder reasoning — judges code on its own merits.

**Why fresh context:** Builder reasoning creates confirmation bias. A reviewer who reads "I chose approach X because Y" will evaluate X more favorably. Fresh-context reviewers catch bugs that contextual reviewers miss.

**Blocking:** `fail` or `critical` triggers fix cycle (max 3). Same bug in 2 consecutive cycles = escalate (convergence detection prevents infinite loops).

### Layer 2: Standard Review (Holistic)
User-perspective walkthrough + DOD verification + standing corrections check. Evaluates whether the build delivers the intended experience, not just whether the code compiles.

**Why user perspective first:** "A build passing code review but failing user_scenario = fail." Code quality without user value is wasted effort. Reviewer walks through the CEO's workflow before checking code quality.

**Blocking:** Unmet DOD = fail. Guardrail violation = critical (no fix cycle, escalate immediately).

### Layer 3: UX Verification (Visual)
For UI work: orchestrator personally verifies via Chrome MCP. Clicks every element, checks data matches, tests default states.

**Why orchestrator, not agent:** Agents can't see rendered UI. Visual verification requires actual browser rendering. This is the one step that can't be delegated to a sub-agent.

## DOD Design

DOD criteria are `{ criterion: string, met: boolean }`. Prose-based, verified by reviewers with evidence.

**Current gap:** DOD criteria are not machine-verifiable. "Component renders correctly" requires human judgment. Adding verifiable assertions ("type-check passes", "test suite exits 0", "file X exports function Y") would improve autonomous reliability. Both Anthropic and OpenAI advocate structured, testable acceptance criteria.

**Rule:** DOD is set during project-brainstorm (before execution), not during build. Builders can't weaken their own acceptance criteria.

## Self-Certification Prevention

| What | How Prevented |
|------|---------------|
| Builder marks own DOD as met | project.json DOD updated from REVIEWER output only |
| Builder reviews own code | validate-reviews.sh checks builder != reviewer |
| Agent reviews own personality changes | Casting rules forbid self-review of prompts |
| Review skipped entirely | review-gate hard gate blocks completion without review artifacts |
| Rubber-stamp review (all pass, no detail) | Zero-issue review flagged as suspicious in code-review prompt |

## Fix Cycle Bounds

Code review: max 3 cycles with convergence detection.
Standard review: max 2 cycles.
Total worst case: 5 fix cycles per task.

**Why bounded:** Unbounded fix cycles can stall the pipeline indefinitely. After max cycles, remaining findings are logged as non-fatal warnings and surfaced in the digest. The CEO sees them and decides whether to address.

## Review-Gate as Hard Gate

The review-gate step runs validate-reviews.sh, which mechanically checks:
1. Every completed task has a review artifact
2. No self-reviews (builder != reviewer)
3. DOD verification exists (not self-certified)

If validation fails, execution STOPS. Missing reviews must be run before proceeding. This is the most important gate in the pipeline — it's the backstop against "builds shipped without review."
