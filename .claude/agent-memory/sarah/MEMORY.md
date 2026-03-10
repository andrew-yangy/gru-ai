# Sarah CTO — Persistent Memory

## External Intelligence (2026-03-10)
See `intel-context-harness-engineering.md` for full research on Anthropic/OpenAI published guidance.

### Key Takeaways for agent-conductor
1. **Context is the bottleneck, not intelligence.** Both companies confirm context rot at 8K-16K tokens. Our 43% context reduction was on target.
2. **Harness > Agent.** OpenAI coined "harness engineering" — the environment/scaffolding matters more than model capability. Our pipeline IS the harness.
3. **Progressive disclosure is canonical.** Anthropic's Skills spec uses 3-level loading (metadata -> SKILL.md -> bundled files). Our pipeline docs already do something similar.
4. **Sub-agent output condensation.** Anthropic recommends 1K-2K token summaries from subagents. Worth enforcing in execute-loop.
5. **Structured note-taking across context windows.** Both companies advocate persistent progress files (claude-progress.txt pattern). We do this via project.json + directive.json state.
6. **Test quality > instruction quality for autonomous agents.** From C compiler project: "Claude will solve whatever problem I give it, so the task verifier must be nearly perfect."
7. **Tool design: fewer, composable tools beat many specialized ones.** Claude Code's small primitive set outperforms 100 specialized tools.
8. **Machine-readable artifacts over prose.** OpenAI's Codex harness uses structured docs validated by linters/CI. Our JSON schemas align with this.
