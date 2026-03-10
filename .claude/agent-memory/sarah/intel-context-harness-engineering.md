# External Intelligence: Context Engineering, Harness Engineering, Agent Architecture
# Researched: 2026-03-10
# Sources: Anthropic Engineering Blog, OpenAI Blog, OpenAI Cookbook, Karpathy

## Summary
Both Anthropic and OpenAI have converged on the same core insight: building reliable AI agent systems
is primarily an environment/scaffolding problem, not a model intelligence problem. The harness —
constraints, feedback loops, documentation, lifecycle management — determines success or failure.

## Terminology Map
- "Context engineering" (Anthropic, Sep 2025) = managing the optimal token set during inference
- "Harness engineering" (OpenAI, Feb 2026) = building the infrastructure around agents
- "Agentic engineering" (Karpathy, Jan 2026) = human-supervised orchestration of coding agents
- "Agent Skills" (Anthropic, Dec 2025) = reusable instruction packages loaded dynamically

## Key Anthropic Articles (chronological)
1. Building Effective Agents (Dec 2024) — foundational patterns
2. The Think Tool (Mar 2025) — structured reasoning mid-response
3. Claude Code Best Practices (Apr 2025) — agentic coding patterns
4. Multi-Agent Research System (Jun 2025) — orchestrator-worker at scale
5. Context Engineering for Agents (Sep 2025) — context as finite resource
6. Writing Tools for Agents (Sep 2025) — tool design principles
7. Code Execution with MCP (Nov 2025) — filesystem-based tool discovery
8. Advanced Tool Use (Nov 2025) — tool search, programmatic calling, examples
9. Effective Harnesses for Long-Running Agents (Nov 2025) — cross-context patterns
10. Agent Skills (Dec 2025) — open standard for reusable agent capabilities
11. Demystifying Evals for AI Agents (Jan 2026) — evaluation patterns
12. Building a C Compiler with Parallel Claudes (Feb 2026) — multi-agent coordination

## Key OpenAI Articles
1. A Practical Guide to Building Agents (PDF, 2025)
2. Agents SDK docs + Cookbook (context personalization, session memory)
3. Harness Engineering: Leveraging Codex (Feb 2026)
4. Unlocking the Codex Harness: App Server (Feb 2026)
5. Unrolling the Codex Agent Loop (Feb 2026)
6. Introducing AgentKit (Oct 2025)

---

## ARCHITECTURAL PATTERNS

### 1. Context as Finite Resource (Anthropic)
- Accuracy degrades as token count increases ("context rot")
- Transformer attention is n^2 pairwise; stretches thin at scale
- Treat context like working memory: high-signal only
- "Find the smallest set of high-signal tokens that maximize likelihood of desired outcome"

### 2. Goldilocks Altitude (Anthropic)
- System prompts neither over-specific (brittle) nor over-vague (ambiguous)
- "Specific enough to guide behavior, flexible enough to allow model judgment"
- Start minimal, test on best model, iterate based on failure modes

### 3. Progressive Disclosure / Just-In-Time Context (Both)
- Maintain lightweight identifiers (file paths, queries) not full data
- Load context dynamically at runtime via tools
- Agents incrementally discover relevant context through exploration
- Anthropic Skills: 3-level loading (metadata -> SKILL.md -> bundled reference files)
- Claude Code: CLAUDE.md upfront + glob/grep for just-in-time loading

### 4. Sub-Agent Architecture (Both)
- Specialized agents handle focused tasks with clean context windows
- Main agent coordinates high-level plans
- Each subagent returns condensed summary (1K-2K tokens)
- Clear separation of concerns
- Multi-agent with Opus lead + Sonnet workers outperformed single Opus by 90.2%
- Token usage explains 80% of performance variance

### 5. Compaction (Both)
- Summarize conversation near context limit, reinitiate with summary
- Preserve: architectural decisions, unresolved bugs, implementation details
- Discard: redundant tool outputs
- Tool result clearing = safest lightest-touch form
- OpenAI Sessions SDK: trim (last-N turns) vs compress (structured summary)

### 6. Structured Note-Taking / Agentic Memory (Both)
- Agent writes persistent notes outside context window
- Notes pulled back when relevant
- Allows tracking progress across complex tasks
- Anthropic: claude-progress.txt + git history
- OpenAI: Session object + RunContextWrapper for state persistence

### 7. Workflow Patterns (Anthropic)
- Prompt Chaining: sequential decomposition
- Routing: classify then dispatch to specialized handler
- Parallelization: sectioning (concurrent subtasks) or voting (diverse outputs)
- Orchestrator-Workers: dynamic delegation to worker LLMs
- Evaluator-Optimizer: generate + iterative feedback loop
- Key: start with simplest pattern, add complexity only with evidence

### 8. Harness Design (OpenAI Codex)
- Layered dependency architecture: Types -> Config -> Repo -> Service -> Runtime -> UI
- Mechanical boundary enforcement via structural tests
- Machine-readable artifacts (JSON specs, not prose docs)
- Cross-linked documentation validated by CI
- When agent gets stuck = environment design problem, not capability problem
- Human role shifts from implementation to: environment design, intent specification, feedback

### 9. Long-Running Agent Harness (Anthropic)
- Initializer agent sets up environment (init.sh, progress file, feature list, baseline commit)
- Coding agent works incrementally on one feature at a time
- State initialization sequence: pwd -> git log -> progress files -> select task -> init.sh -> baseline tests
- JSON feature lists with pass/fail flags prevent premature completion claims
- Clean state requirement: code appropriate for main branch merge

### 10. Multi-Agent Coordination (Anthropic C Compiler)
- Git-based task locking (agents claim by writing to current_tasks/)
- Docker containerized isolation per agent
- Role specialization (development, dedup, perf, code-gen, critique, docs)
- Test quality is THE steering mechanism for autonomous agents
- Oracle-based debugging: use known-good reference to decompose intractable tasks
- Minimal test output (grep-friendly errors, pre-computed stats)

---

## TOOL DESIGN PRINCIPLES

### From Anthropic
1. Build tools well understood by LLMs with minimal overlap
2. Keep input parameters descriptive, unambiguous
3. Token-efficient returns; encourage efficient behaviors
4. If a human can't tell which tool to use, neither can an AI
5. Use Tool Search for large toolsets (85% token reduction)
6. Programmatic Tool Calling for data pipelines (37% token reduction)
7. Tool Use Examples for complex parameter patterns (72% -> 90% accuracy)
8. Namespace related tools under prefixes
9. Return semantic names not UUIDs
10. Implement pagination, filtering, truncation with sensible defaults

### From OpenAI
1. Standardize tool definitions; document thoroughly
2. Assign risk ratings (low/medium/high) based on read-only vs write + financial impact
3. Use prompt templates with policy variables instead of many individual prompts
4. Tool risk rating determines whether guardrail checks fire before execution

---

## EVALUATION PATTERNS (Anthropic)

1. Start with 20-50 tasks from actual failures
2. Use capability evals (low pass rate, finding limits) + regression evals (~100% pass rate, preventing backsliding)
3. Grade what agent produced, not the path it took
4. Include partial credit (continuum, not binary)
5. LLM-as-judge with rubrics for free-form outputs (0.0-1.0 scores + pass/fail)
6. Read transcripts manually — automated evals + human review = Swiss Cheese Model
7. Metrics: pass@k (at least one success in k), pass^k (all k succeed)

---

## RELEVANCE TO AGENT-CONDUCTOR

### What we're already doing right
- Pipeline as harness (constraints, gates, lifecycle management)
- JSON state files as machine-readable artifacts
- Structured step progression with skip sets by weight
- Git-based state tracking
- Sub-agent architecture with builder/reviewer separation
- Progressive disclosure (SKILL.md -> step docs -> context)

### Gaps to consider
1. **Compaction/summarization**: No explicit compaction strategy when agents hit context limits mid-step
2. **Structured progress notes**: We use project.json state but no claude-progress.txt equivalent for mid-task context recovery
3. **Sub-agent output size limits**: Not enforcing 1K-2K token condensed summaries from builder agents
4. **Tool search/deferred loading**: Loading full step docs upfront vs progressive disclosure within steps
5. **Evaluation harness**: No automated eval suite for pipeline quality (we rely on validation scripts)
6. **Oracle-based debugging**: When agents get stuck, no reference implementation to decompose the problem
7. **Test quality as steering**: Our DOD criteria are prose-based, not machine-verifiable test suites
