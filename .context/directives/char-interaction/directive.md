# Character Interaction System

## CEO Brief

Make agents visually communicate with each other. When agents interact (subagent spawns, reviews, brainstorms), the office should show it through character behavior — facing each other, chat bubbles, walking to meeting rooms.

## What's Already Built (needs review)

These were implemented in-session and need proper pipeline review:

1. **Nameplate polish**: Removed role tags, made nameplates smaller, name text renders in brand color instead of white on dark plate
2. **Task context text formatting**: `formatActivity()` turns raw tool+path into readable verbs (e.g., "reading SKILL.md"). Renders as subtle 35% opacity text below nameplate
3. **Chat bubble + facing direction**: When two agents have a parent↔subagent relationship, both get a chat bubble overhead and face each other. Uses `agentInteractions` prop from GamePage → CanvasOffice → renderer

## New Features Needed

4. **Brainstorm → meeting room**: When an agent has multiple simultaneous subagents (3+), move the group to meeting room seats. This represents a brainstorm/planning session.
5. **Reviewer walks to builder's desk**: During review phase (detectable from directive state or session metadata), the reviewer agent should walk to the builder's desk location and stand nearby.

## Constraints

- Canvas 2D rendering only (no DOM overlays)
- Must work with existing character FSM (walk/idle/type states)
- Zoom-responsive (chat bubbles scale with zoom)
- No new CharacterState enum values — use behavioral overrides like the facing direction system
