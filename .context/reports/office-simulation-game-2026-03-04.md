# Report: Office Simulation Game Research

> Date: 2026-03-04
> Directive: office-simulation-game
> Status: Awaiting CEO decision on 3 questions

## Research Findings

### Market Landscape

Researched comparable products across four categories:

1. **Game-as-Interface** — Habitica (RPG for real habits, 4M users), Screeps (MMO where you program units in JS, code runs 24/7). Both prove that game mechanics applied to real work increase engagement.

2. **Virtual Office** — Gather.town, Teamflow. Prove that spatial metaphors for team coordination work. People understand "who's where" faster in a map than in a list.

3. **AI Agent Visualization** — CrewAI Studio, AutoGen Studio, ChatDev. ChatDev already simulates a software company with AI agents. We'd be adding the game layer to this existing concept.

4. **Management Sims (UX Inspiration)** — Game Dev Tycoon, Software Inc., Two Point Hospital. These have the EXACT UX patterns we'd copy: isometric view, drag-to-assign, status bubbles over characters, room-based organization.

### Google Genie Assessment

Genie is about AI-generated game worlds (impressive, orthogonal to our needs). Not a building block, but the concept of "game actions map to real effects" is the shared insight.

### Feasibility: HIGH

The game is a visualization layer on the existing WebSocket data. No new backend needed. The existing Zustand store already has all the data (sessions, agents, directives, goals). Canvas rendering inside React is well-trodden. Art assets are the only non-trivial new work.

## Team Brainstorm Summary

- **Sarah (CTO):** React Canvas inside existing app. No game engine. Phase incrementally. Unified stack.
- **Marcus (CPO):** Prototype interaction design FIRST. Build as alternative view, not replacement. Validate before investing.
- **Priya (CMO):** This is a viral positioning opportunity. Build for public demo from day one. Pixel art aesthetic. Make it primary, not secondary.

All three agree: this is a visualization layer on existing data, pixel art is the right aesthetic, art assets are the real bottleneck.

## Estimated Effort

12-18 days across multiple directives if approved. First directive would be an interaction design prototype (1-2 days).

## CEO Decisions Needed

See `/Users/yangyang/Repos/agent-conductor/.context/goals/ui/projects/office-simulation-game/plan-for-approval.md` for the 3 questions.
