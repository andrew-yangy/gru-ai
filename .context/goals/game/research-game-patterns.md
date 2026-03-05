# Game UX Patterns Research Note

## Stealable Patterns from References

### claw-empire
- **Tight feedback loops**: Every player action has immediate visual response. Status changes happen fast, not after a loading delay.
- **Peripheral HUD**: HTML UI wraps the canvas — top bar for status, side panels for detail. Canvas owns the game world only.
- **Notification as events**: New items/earnings appear as in-game floating text (+$50, New Item!) rather than toast notifications.
- **Ambient life**: NPCs have idle animations, wander patterns, and contextual behavior even when the player isn't interacting.

### pixel-agents
- **Character personality through movement**: Different walk speeds, idle behaviors, and animation timings give each agent a distinct personality.
- **Workspace context**: Agents sit at desks with visible work artifacts (code on screens, documents on desks).
- **Status visualization**: Character state is immediately readable from sprite animation alone — no need for UI overlay to understand what's happening.

## Future Feature Feasibility

### Day/Night Cycle
- **Feasibility**: Medium. Apply a semi-transparent overlay with time-based HSL shift. Dawn=warm orange, midday=none, evening=purple, night=dark blue.
- **Approach**: `setInterval` updates a global time value, renderer applies a fullscreen overlay after scene draw. Window tiles could show sky color. ~50 lines of code.
- **Value**: High ambient life feeling. Agents could have "end of day" behaviors (walking to door, lights turning off).

### Weather Effects
- **Feasibility**: Low-medium. Particle systems in Canvas 2D are simple but need careful performance tuning.
- **Approach**: Rain = vertical line particles drawn after scene. Snow = small circle particles with lateral drift. Only visible through "window" tiles (masked to window areas). ~100 lines.
- **Value**: Medium. Nice ambient feel but doesn't add functional value.

### Agent Conversations
- **Feasibility**: High. Extend existing bubble system.
- **Approach**: When two agents are in the same room zone and both active, show alternating speech bubbles with "..." or short text snippets from their current task. Already have bubble rendering infrastructure.
- **Value**: High. Makes the office feel alive — agents visibly collaborating.

### Achievement System
- **Feasibility**: Medium. Needs a persistence layer (localStorage or backend).
- **Approach**: Define achievement triggers (first directive completed, 10 sessions run, all agents busy simultaneously). Show as pixel-art toast popup in the game world. Track in localStorage initially.
- **Value**: Medium. Fun gamification but not core to the "living office" vision.

### Notifications as In-Game Events
- **Feasibility**: High. Extend the existing floating text/bubble system.
- **Approach**: When a session completes or directive finishes, show a floating "+1 Report" or "Directive Complete!" above the relevant agent. Fade out after 2-3 seconds. ~30 lines.
- **Value**: Very high. Transforms dashboard-style notifications into game events. Priority recommendation for next phase.
