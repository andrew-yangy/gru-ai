# Priya CMO - Agent Memory

## Intel Research Patterns

### Context Engineering Landscape (2026-03-10)
- Term coined mid-2025 by Tobi Lutke (Shopify CEO) and Andrej Karpathy
- Core principle: smallest set of high-signal tokens that maximize desired outcome
- Context rot: 15-30% degradation at 8K-16K tokens (Anthropic research)
- gruai's .context/ tree is textbook context engineering -- use this for positioning
- Key sources: Anthropic (4 articles), OpenAI (practical guide + SDK), ArXiv codified context paper (2602.20478)

### gruai Positioning Opportunities
- "Context-engineered autonomous company framework" differentiates from LangChain/CrewAI/AutoGen
- Codified Context paper (ArXiv 2602.20478) validates our architecture academically
- We are organization layer on top of harness engineering (already in vision.md)
- Competitors are execution frameworks; we are organizational frameworks

### Industry Gaps to Track
- MCP (Anthropic) for agent-tool communication becoming standard
- A2A (Google) for agent-to-agent coordination -- 50+ company backing
- Context compaction (Google ADK) reduces tokens 60-80% -- we lack this
- Graph-based orchestration becoming standard (LangGraph pioneered, others adopting)

## Intel File Locations
- Latest research: `.context/intel/latest/priya-agent-engineering-research.md`
- Previous intel: `.context/intel/latest/priya.json` (2026-03-02 scout run)
