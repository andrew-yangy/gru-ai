# Context Flow

How and why context reaches agents. Every design choice here is grounded in the principle: **the smallest set of high-signal tokens maximizes desired output quality** (Anthropic, "Effective Context Engineering", Sep 2025).

## Principles

### Progressive Disclosure Over Upfront Loading
Load context just-in-time, not all at once. The pipeline loads one step doc at a time — the orchestrator never reads all 15 step docs simultaneously. Builders receive only their task scope, not the full plan.

**Why:** Transformer attention is n-squared pairwise. Context rot — measurable accuracy degradation — begins at 8K-16K tokens (Anthropic research). Every unnecessary token competes for attention with the tokens that matter.

**Enforced by:** Step docs are separate files read sequentially. Builder prompts are constructed per-task, not per-directive.

### CEO Brief Flows Verbatim
The CEO's original words reach builders and reviewers unparaphrased. No intermediary rewrites the brief.

**Why:** Intent degrades through abstraction layers. CEO words → COO scope summary → CTO task decomposition → builder prompt = fourth-generation abstraction. Verbatim flow eliminates this.

**Enforced by:** 09-execute-projects.md mandates including directive.md text verbatim in builder prompts. Verified intent from clarification step also flows verbatim.

### Sub-Agent Context Isolation
Each builder agent gets a fresh context window scoped to its task. Builders don't see each other's output, prior tasks' build reports, or the orchestrator's planning context.

**Why:** Clean context windows produce better output than accumulated context (Anthropic multi-agent research, Jun 2025). A sub-agent with 2K tokens of focused context outperforms one with 20K tokens of accumulated noise.

**Enforced by:** Each agent spawn creates a new context window. No shared state between parallel builders except the filesystem.

### Structured Over Prose
Use JSON schemas (directive.json, project.json, plan.json) for machine-consumed state. Use markdown only for human-consumed briefs and reports.

**Why:** Structured formats are mechanically validatable. Prose formats require LLM judgment to parse, introducing unreliability. OpenAI's harness engineering article (Feb 2026): "machine-readable artifacts over prose."

**Enforced by:** Validation scripts (validate-project-json.sh, validate-reviews.sh) parse JSON mechanically. Pipeline gates block on structural violations, not prose interpretation.

## What Each Agent Receives

| Agent | Context |
|-------|---------|
| Builder | Task scope + DOD, CEO brief (verbatim), verified intent, audit findings (active files, recommended approach), design/brainstorm output (if any), preferences.md, vision.md, role-specific lessons, design docs |
| Reviewer | Full file contents + diff, architect's recommended approach, DOD criteria, preferences.md standing corrections. NO builder reasoning (fresh-context review). |
| Code Reviewer | Same as reviewer but with code-review-excellence SKILL.md. Explicitly NO design docs or builder reasoning. |
| COO (planner) | Vision.md, preferences.md, all active directives, lessons, audit findings, brainstorm synthesis (if any), design docs |
| Auditor | Directive scope, codebase access, vision.md, preferences.md, design docs |

## Known Gaps

- **No context compaction mid-task.** When a builder hits context limits, the session dies. Anthropic recommends explicit compaction (summarize + reinitiate). Our checkpoint step handles session-level recovery but not mid-task compaction.
- **No sub-agent output limits.** Builders return full output. Anthropic recommends 1-2K token condensed summaries from sub-agents.
