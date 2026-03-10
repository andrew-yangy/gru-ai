# Research Output: README Rewrite

## Competitor Analysis

### CrewAI
- **URL**: https://crewai.com/
- **GitHub**: https://github.com/crewAIInc/crewAI
- **Pricing**: Open-source framework is free (MIT). Hosted platform: Free tier
  (50 executions/month), Professional ($25/month, 100 executions), Enterprise
  (custom). Execution-based billing -- each agent task completion counts as one
  execution.
- **License**: MIT
- **Architecture**: Role-based multi-agent orchestration. Each agent gets a role
  (e.g., Researcher, Developer), a goal, backstory, and a set of tools. Agents
  collaborate in "crews" that execute tasks sequentially or in parallel. Python
  framework with low-code Studio option.
- **Key features**:
  - Role-playing agent personas with goals and backstories
  - CrewAI Studio (no-code builder for non-developers)
  - Real-time execution tracing
  - 100+ tool integrations (Gmail, Slack, Notion, Salesforce, etc.)
  - Human-in-the-loop and automated agent training
  - Claims 40% faster time-to-production than LangGraph for standard workflows
- **vs gruai**:
  - CrewAI focuses on general-purpose business workflows (customer support,
    content generation, data analysis). gruai focuses on autonomous software
    engineering with a complete pipeline.
  - CrewAI has role-based personas but no persistent personality/memory system --
    agents reset each run. gruai has 11 named agents with institutional memory
    that persists across directives.
  - CrewAI has no weight-adaptive pipeline, no three-layer verification, no
    visual dashboard, no research-grounded design principles.
  - CrewAI has a broader tool ecosystem for business integrations. gruai is
    purpose-built for software development autonomy.
  - CrewAI runs on any LLM. gruai is currently optimized for Claude Code.

### Microsoft AutoGen / Agent Framework
- **URL**: https://microsoft.github.io/autogen/stable/
- **GitHub**: https://github.com/microsoft/autogen
- **Pricing**: Free and open-source. No hosted platform fees (enterprise
  deployment uses Azure infrastructure at standard Azure pricing).
- **License**: MIT (Microsoft Agent Framework). AG2 fork uses Apache 2.0.
- **Architecture**: Event-driven, distributed, asynchronous message-passing
  architecture. Agents communicate through async messages supporting both
  event-driven and request/response patterns. In October 2025, Microsoft merged
  AutoGen with Semantic Kernel into the unified "Microsoft Agent Framework"
  targeting GA by end of Q1 2026.
- **Key features**:
  - Asynchronous, event-driven multi-agent conversations
  - Graph-based workflow orchestration
  - Native OpenTelemetry observability
  - Azure ecosystem integration (Monitor, Entra ID, DevOps)
  - Cross-language support (Python, .NET)
  - Session-based state management with type safety
  - Enterprise middleware and telemetry
- **vs gruai**:
  - AutoGen/Agent Framework is a general-purpose agent runtime -- build any
    agent system. gruai is an opinionated, complete autonomous engineering
    framework with a specific pipeline.
  - AutoGen has no built-in pipeline, no verification layers, no institutional
    memory. You build those yourself.
  - AutoGen has strong enterprise/Azure integration. gruai runs locally with no
    cloud dependency.
  - AutoGen has no visual dashboard, no agent personality system, no
    weight-adaptive execution.
  - AutoGen is backed by Microsoft with enterprise support commitments. gruai is
    a solo open-source project.

### Devin (Cognition Labs)
- **URL**: https://devin.ai/
- **Pricing**: Starts at $20/month minimum ($2.25 per Agent Compute Unit).
  Team plan: $500/month (250 ACUs, additional at $2 each). Enterprise: custom
  pricing with SaaS or VPC deployment options. Usage-based billing -- complex
  tasks consume more ACUs unpredictably.
- **License**: Closed-source, proprietary SaaS.
- **Architecture**: Cloud-based autonomous agent running in isolated virtual
  machine sandboxes. Each Devin instance gets a full environment: VS Code-style
  editor, terminal, Chrome browser, and a memory layer with vectorized codebase
  snapshots. "The Brain" is a stateless cloud service for reasoning; workspace
  sandboxes handle execution. Supports parallel instances.
- **Key features**:
  - Full autonomous software engineering (plans, codes, tests, deploys)
  - Cloud IDE with integrated browser, terminal, editor
  - Dynamic re-planning when hitting roadblocks (v3.0)
  - Devin Wiki (auto-generated codebase documentation)
  - Devin Search (interactive code Q&A)
  - Parallel task execution across multiple sandbox instances
  - 83% more task completions per ACU vs. Devin 1.0 (internal benchmarks)
- **vs gruai**:
  - Devin is a hosted service -- your code goes to Cognition's cloud. gruai
    runs 100% locally, your code never leaves your machine.
  - Devin is closed-source and costs $20-500+/month. gruai is MIT-licensed and
    free.
  - Devin has no institutional memory across projects -- each session is
    isolated. gruai's .context/ tree persists lessons, design docs, and agent
    memory across all directives.
  - Devin has no multi-agent pipeline with verification layers. It is a single
    agent (with internal planning) that codes autonomously.
  - Devin has a polished cloud IDE experience. gruai uses the terminal (Claude
    Code) with a local dashboard for monitoring.
  - Devin handles one task at a time per instance. gruai's pipeline handles
    multi-project directives with parallel execution and wave-based scheduling.

### Manus (Monica / Meta)
- **URL**: https://manus.im/
- **Pricing**: Credit-based system. Free tier with limited credits. Plus:
  $39/month. Pro: $199/month. Credits consumed per action -- complex tasks burn
  credits unpredictably with no upfront cost estimate. Acquired by Meta in
  January 2026 for ~$2 billion.
- **License**: Closed-source, proprietary SaaS.
- **Architecture**: Cloud-based multi-agent system orchestrating specialized
  agents for browsing, data analysis, and code execution. Runs in a cloud
  virtual computing environment with web browser, shell, and code execution
  access. Uses Claude (Sonnet) as the core reasoning engine supplemented by
  fine-tuned Qwen models. Selects the best model per step.
- **Key features**:
  - General-purpose autonomous agent (not just coding)
  - Web browsing, data analysis, content generation, code execution
  - Multi-modal outputs (websites, presentations, images)
  - Multi-model routing (picks best model per task step)
  - End-to-end workflow completion without constant guidance
- **vs gruai**:
  - Manus is a general-purpose productivity agent. gruai is purpose-built for
    autonomous software engineering.
  - Manus is closed-source and credit-based with unpredictable costs. gruai is
    MIT-licensed and free.
  - Manus has no software engineering pipeline, no code review, no DOD
    verification, no institutional memory for codebases.
  - Manus runs in the cloud (your data goes to their servers). gruai runs
    locally.
  - Manus has broader capabilities (browsing, presentations, data analysis) but
    shallow software engineering support. gruai has deep, structured software
    engineering with 15-step pipeline.
  - Now owned by Meta -- future direction uncertain for independent users.

### LangGraph (LangChain)
- **URL**: https://www.langchain.com/langgraph
- **GitHub**: https://github.com/langchain-ai/langgraph
- **Pricing**: Framework is free and open-source. LangGraph Platform (managed
  deployment): Developer tier free (100k node executions), Plus requires
  LangSmith Plus at $39/user/month. Enterprise: custom pricing. LangSmith
  observability: Free (5k traces/month), Plus ($39/seat/month, 100k traces),
  Enterprise (custom).
- **License**: MIT
- **Architecture**: Graph-based stateful agent orchestration. Workflows are
  directed graphs where nodes are agent actions and edges are conditional
  transitions. Built-in checkpointing for durable execution. Supports
  sequential, parallel, hierarchical, and looping control flows.
- **Key features**:
  - Persistent state management (short-term + long-term memory)
  - Durable execution with automatic crash recovery
  - Built-in checkpointers for state snapshots
  - Human-in-the-loop at any execution point
  - "Time-travel" debugging (replay from prior checkpoints)
  - LangGraph Studio (visual graph editor and debugger)
  - Token-by-token streaming of agent reasoning
  - Multi-modal support (text, image, audio)
  - Model-agnostic (works with any LLM)
- **vs gruai**:
  - LangGraph is a low-level orchestration framework -- you build your own
    pipeline. gruai ships a complete 15-step pipeline out of the box.
  - LangGraph has excellent state management and checkpointing primitives. gruai
    has these too (directive.json state machine) but with more opinionated
    structure.
  - LangGraph has no built-in code review, DOD verification, agent personalities,
    or institutional memory. You build those yourself.
  - LangGraph has better debugging tools (Studio, time-travel). gruai has a
    visual dashboard with pixel-art office simulation.
  - LangGraph is model-agnostic and language-agnostic. gruai is currently
    Claude-optimized.
  - LangGraph has a large ecosystem and community. gruai is newer and smaller.

### Google ADK (Agent Development Kit)
- **URL**: https://google.github.io/adk-docs/
- **GitHub**: https://github.com/google/adk-python
- **Pricing**: Free and open-source. API costs for model usage (Gemini, Vertex
  AI) are separate. No platform fees.
- **License**: Apache 2.0
- **Architecture**: Event-driven runtime with hierarchical multi-agent
  composition. Supports LLM Agents (dynamic reasoning) and Workflow Agents
  (Sequential, Parallel, Loop for deterministic pipelines). Sessions service
  for persistent memory. Available in Python, TypeScript, Go, and Java.
- **Key features**:
  - Code-first agent development (not low-code/no-code)
  - Multi-agent hierarchy with agent-as-tool composition
  - Model-agnostic via LiteLLM (Gemini, Claude, GPT, Mistral, etc.)
  - MCP (Model Context Protocol) tool support
  - Pre-built tools (Search, Code Execution)
  - Integration with LangChain and LlamaIndex tools
  - Event-driven architecture for multi-step task management
  - 4-language support (Python, TypeScript, Go, Java)
- **vs gruai**:
  - Google ADK is a toolkit for building agents -- no built-in pipeline,
    verification, or institutional memory. You assemble those yourself.
  - ADK has the broadest language support (4 languages). gruai is TypeScript +
    shell scripts.
  - ADK is optimized for Gemini/Google ecosystem but supports other models.
    gruai is optimized for Claude.
  - ADK has no visual dashboard, no agent personality system, no weight-adaptive
    pipeline, no research-grounded design principles.
  - ADK has Google's backing and enterprise cloud integration. gruai is
    independent and local-first.

### OpenAI Agents SDK
- **URL**: https://openai.github.io/openai-agents-python/
- **GitHub**: https://github.com/openai/openai-agents-python
- **Pricing**: Free and open-source. API costs for OpenAI model usage are
  separate.
- **License**: MIT
- **Architecture**: Lightweight multi-agent framework with handoffs, guardrails,
  and built-in tracing. Production-ready evolution of OpenAI's experimental
  Swarm framework. Agents are LLMs with instructions, tools, and handoff
  capabilities. Provider-agnostic (documented paths for non-OpenAI models).
- **Key features**:
  - Agent handoffs (delegate tasks between agents)
  - Input/output guardrails for validation
  - Built-in tracing for debugging and evaluation
  - Minimal abstractions -- lightweight by design
  - Available for Python and TypeScript
  - Provider-agnostic (can use non-OpenAI models)
- **vs gruai**:
  - OpenAI Agents SDK is a minimal building-block framework -- handoffs,
    guardrails, tracing. No pipeline, no verification layers, no institutional
    memory.
  - Agents SDK is intentionally lightweight. gruai is opinionated and
    comprehensive.
  - Agents SDK has no visual dashboard, no agent personality system, no
    weight-adaptive pipeline.
  - Agents SDK is backed by OpenAI with broad community adoption. gruai is
    independent.

---

## Verified Citations

### Anthropic: "Building Effective Agents"
- **URL**: https://www.anthropic.com/research/building-effective-agents
  (verified -- page loads successfully)
- **Author/Org**: Anthropic
- **Date**: December 19, 2024
- **Key claim for inline citation**: Anthropic identifies six composable agent
  architecture patterns and recommends starting with the simplest pattern that
  works, adding complexity only when simpler solutions fall short.
- **Specific finding**: Six core patterns -- Augmented LLM, Prompt Chaining,
  Routing, Parallelization, Orchestrator-Workers, and Evaluator-Optimizer --
  with the guidance to "start with simple prompts, optimize them with
  comprehensive evaluation, and add multi-step agentic systems only when simpler
  solutions fall short." Tool design (ACI) deserves equal attention to prompt
  engineering.

### Anthropic: "Effective Context Engineering for AI Agents"
- **URL**: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  (verified -- page loads successfully)
- **Author/Org**: Anthropic
- **Date**: September 29, 2025
- **Key claim for inline citation**: Context rot -- as context window token count
  increases, model recall accuracy decreases -- requires deliberate context
  curation through compaction, structured note-taking, and sub-agent
  architectures.
- **Specific finding**: Progressive disclosure lets agents incrementally discover
  relevant context through exploration rather than receiving everything upfront.
  Three techniques for long-horizon tasks: compaction (summarizing conversation
  history), structured note-taking (persistent memory with minimal overhead),
  and sub-agent architectures (isolating context per agent). Context engineering
  is the "natural progression" of prompt engineering.

### Anthropic: "How We Built Our Multi-Agent Research System"
- **URL**: https://www.anthropic.com/engineering/multi-agent-research-system
  (verified -- page loads successfully)
- **Author/Org**: Anthropic
- **Date**: June 13, 2025
- **Key claim for inline citation**: A multi-agent system with Claude Opus 4 lead
  and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by
  90.2% on internal research evaluations.
- **Specific finding**: Token usage alone explains 80% of performance variance.
  Multi-agent systems consume ~15x more tokens than standard chat but enable
  parallel research that reduces time by up to 90%. The orchestrator-worker
  pattern with specialized subagents excels at decomposable tasks. Three factors
  explain 95% of performance variance: token usage (80%), tool calls, and model
  choice.

### Anthropic: "Building a C Compiler with a Team of Parallel Claudes"
- **URL**: https://www.anthropic.com/engineering/building-c-compiler
  (verified -- page loads successfully)
- **Author/Org**: Anthropic
- **Date**: February 5, 2026
- **Key claim for inline citation**: Test harness quality matters more than
  instructions -- "the task verifier must be nearly perfect, otherwise Claude
  will solve the wrong problem."
- **Specific finding**: ~2,000 Claude Code sessions over two weeks; 2 billion
  input tokens, 140M output tokens (~$20,000) to produce a 100,000-line Rust
  compiler that passes 99% of GCC torture tests. Most engineering effort went
  into environment design -- tests, feedback systems, documentation, CI pipeline
  -- rather than instruction refinement. Agent coordination via git-backed task
  locks.

### OpenAI: "Harness Engineering: Leveraging Codex in an Agent-First World"
- **URL**: https://openai.com/index/harness-engineering/
  (not directly fetchable due to 403, but confirmed live via search results and
  InfoQ mirror)
- **Author/Org**: OpenAI (Ryan Lopopolo)
- **Date**: February 11, 2026
- **Key claim for inline citation**: Environment design outweighs prompt
  engineering -- "our most difficult challenges now center on designing
  environments, feedback loops, and control systems."
- **Specific finding**: Three engineers using Codex agents built ~1 million lines
  of production code in five months with zero manually-written code. ~1,500 PRs
  merged. Structured docs/ directory as the system of record. AGENTS.md serves
  as a context map with pointers to deeper sources. Architectural constraints
  enforced via mechanical rules and structural tests (Types -> Config -> Repo ->
  Service -> Runtime -> UI dependency flow). Early progress was slow because the
  environment was underspecified, not because the agent was incapable.

### OpenAI: "Practices for Governing Agentic AI Systems"
- **URL**: https://openai.com/index/practices-for-governing-agentic-ai-systems/
  (verified live via search engine results; PDF at
  https://cdn.openai.com/papers/practices-for-governing-agentic-ai-systems.pdf)
- **Author/Org**: OpenAI (Yonadav Shavit, Sandhini Agarwal, et al.)
- **Date**: December 14, 2023
- **Key claim for inline citation**: Agentic systems should operate within clearly
  defined capability boundaries, with significant decisions reviewed by a human
  and a ledger of actions for accountability.
- **Specific finding**: Seven governance practices for safe agentic AI: evaluate
  task suitability, constrain action space, require approval for significant
  decisions, maintain legibility of agent activity, deploy automatic monitoring,
  ensure interruptibility, and maintain human control. At least one human entity
  must be accountable for every uncompensated direct harm.

### ArXiv: "Codified Context: Infrastructure for AI Agents in a Complex Codebase"
- **URL**: https://arxiv.org/abs/2602.20478
  (verified -- page loads successfully)
- **Author/Org**: Aristidis Vasilopoulos
- **Date**: February 24, 2026
- **Key claim for inline citation**: A three-component codified context
  infrastructure -- hot-memory constitution, 19 specialized agents, and 34
  on-demand spec documents -- maintained coherence across 283 development
  sessions in a 108,000-line codebase.
- **Specific finding**: LLM-based coding assistants lose coherence across sessions
  and repeat known mistakes. Solution: hot-memory constitution encoding
  conventions, retrieval hooks, and orchestration protocols; specialized
  domain-expert agents; and cold-memory knowledge base of on-demand
  specification documents. The approach directly parallels gruai's .context/
  tree architecture (vision, lessons, design docs, agent templates).

### Bonus: Anthropic: "Building Agents with the Claude Agent SDK"
- **URL**: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
  (found in search results -- Anthropic engineering blog)
- **Author/Org**: Anthropic
- **Date**: 2025 (exact date not confirmed)
- **Key claim for inline citation**: Practical guide for building agents using
  Claude's native agent SDK capabilities.
- **Specific finding**: Companion to the "Building Effective Agents" guide with
  implementation-specific guidance for Claude-based agent systems.

---

## Recommended Comparison Table Structure

### Table Format

A single comparison table in the README with these columns:

| Feature | gruai | CrewAI | LangGraph | Google ADK | AutoGen | OpenAI SDK | Devin | Manus |
|---------|-------|--------|-----------|------------|---------|------------|-------|-------|

### Recommended Rows

1. **License** -- MIT, MIT, MIT, Apache 2.0, MIT, MIT, Proprietary, Proprietary
2. **Cost** -- Free, Free/$25+, Free/$39+, Free, Free, Free, $20-500+/mo, $39-199/mo
3. **Open Source** -- Yes, Yes, Yes, Yes, Yes, Yes, No, No
4. **Architecture** -- Pipeline (15-step), Role-based crews, Graph-based, Event-driven, Event-driven, Handoff-based, Cloud sandbox, Cloud agents
5. **Built-in Pipeline** -- Yes (weight-adaptive), No, No, No, No, No, Implicit, No
6. **Code Review / Verification** -- 3-layer, No, No, No, No, No, Implicit, No
7. **Institutional Memory** -- Yes (.context/ tree), No, Checkpoints, Session memory, No, No, Per-session, No
8. **Agent Personalities** -- 11 named agents, Role-based (no persistence), No, No, No, No, Single agent, No
9. **Visual Dashboard** -- Yes (pixel-art office), No, Studio (graph viz), No, No, Tracing UI, Cloud IDE, Web UI
10. **Runs Locally** -- Yes, Yes, Yes, Yes, Yes, Yes, No (cloud), No (cloud)
11. **Model Support** -- Claude (optimized), Any LLM, Any LLM, Any (Gemini optimized), Any LLM, Any (OpenAI optimized), Proprietary, Multi-model
12. **Primary Use Case** -- Autonomous SW eng, Business workflows, Stateful workflows, General agents, Enterprise agents, Lightweight agents, Cloud coding, General productivity

### Recommended Competitors for Table

Include all 8 (gruai + 7 competitors). Devin and Manus are the most recognizable
names the CEO asked about and serve as the "proprietary SaaS" contrast to gruai's
"open-source local" positioning. CrewAI and LangGraph are the closest open-source
comparisons. Google ADK, AutoGen, and OpenAI SDK round out the "big tech" category.

### Narrative Positioning

gruai occupies a unique niche: it is the only framework that ships a complete,
research-grounded, weight-adaptive pipeline for autonomous software engineering
with institutional memory and three-layer verification. The competitors fall into
three buckets:

1. **Toolkits** (LangGraph, Google ADK, AutoGen, OpenAI SDK) -- building blocks,
   no opinion on how to use them. gruai is opinionated and complete.
2. **Platforms** (CrewAI) -- role-based multi-agent for business workflows, not
   purpose-built for software engineering. gruai's pipeline is specific to the
   software development lifecycle.
3. **Proprietary Services** (Devin, Manus) -- closed-source, cloud-hosted,
   expensive, no institutional memory. gruai is open-source, local, free, with
   persistent knowledge.
