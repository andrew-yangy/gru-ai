# Lessons: Agent Behavior

> How agents behave, what they get wrong, and how to correct it.
> Relevant to: ALL agents (especially Morgan, Sarah)

## Core Patterns

- **Morgan produces prose before JSON despite "output ONLY JSON" instructions.** Fix: stronger preamble ("first character must be `{`") AND parse defensively (extract JSON between first `{` and last `}`).
- **Agents invent new env var names instead of checking existing ones.** Prompts must tell agents to check existing naming conventions (grep `.env` files) before proposing new names.
- **Reviewer agents catch real bugs that build agents miss.** Sarah caught env var mismatch, missing `return` on 403, and 11 unvalidated routes. Review is not ceremony — it finds real issues.
- **Auditor agents find issues the directive didn't ask about.** The improve-security audit found an auth gap (`/api/search/user/[userId]`) and 5 dead code files that weren't in the directive scope. Follow-ups need structured handling (risk-based).

## Task & User Perspective

- **Agents build mechanically without testing the user experience.** 9 bugs were found by the CEO in 10 seconds of use — after multiple build cycles. The root cause: no agent tested as the CEO. Fix: mandatory UX verification step in the directive pipeline where the orchestrator personally browser-tests every UI change.
- **"Does it compile" is not "does it work."** Type-check passing gives false confidence. A component can compile perfectly but have no click handler, show wrong data, or display nothing useful. Browser testing catches what type-checking can't.
- **Engineers don't propose improvements unless instructed.** Default agent behavior is to complete assigned tasks and stop. Added explicit "propose what's MISSING" instruction to engineer prompts — every build must include a `proposed_improvements` section with gaps, edge cases, and UX issues found during implementation.
- **Chrome MCP tools only work in the main session.** Spawned agents cannot use browser tools. UX verification must be done by the orchestrator (main session), not delegated to subagents. Plan accordingly: assign Chrome visual work to yourself, code review to agents.
- **The orchestrator delegates — it does not code, review, or verify DOD.** The directive session's job is to read directives, spawn Morgan for planning, spawn engineers for building, spawn Sarah/reviewers for verification, collect results, and produce summaries. When the orchestrator does the coding itself, it bypasses the pipeline's quality gates (auditor, reviewer, clarification phase). If a task is small enough for one person to code, spawn one engineer — don't become the engineer. If DOD needs verification, spawn the reviewer — don't self-certify.

## Verification Failures (Phase 3 Post-Mortem)

- **All 9 Phase 3 initiatives were marked "completed" without any visual testing.** The builder (riley) self-certified DOD with only type-check. The reviewer (sarah) never opened a browser. Result: z-sort was broken, agent binding was broken, CEO had to manually catch every issue.
- **Scanner limits create silent data gaps.** The session-scanner had a 2MB scan limit for parent JSONL cross-referencing. Long conversations (11MB+) had Agent tool calls past the limit, so subagent identities were never resolved. All agents showed "offline" — a complete feature failure that passed review.
- **Filtering out valid data breaks features silently.** GamePage had `!s.isSubagent` in the session status filter. This was added defensively (avoid double-counting) but actually prevented ALL spawned agent sessions from updating character status. Defensive filters need to be tested against real scenarios, not just added "to be safe."
- **Don't rubber-stamp DOD criteria you can't verify.** "All 25 seats visually verified" was marked `met: true` by an agent that cannot open a browser. If a criterion requires a capability the agent doesn't have, it MUST be escalated, not marked as done.
