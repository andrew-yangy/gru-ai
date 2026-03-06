# Game Phase 3 — Living Office

## CEO Vision

Transform the pixel-art office from a static display into a living, interactive game that reflects real system state. Match claw-empire's game feel while being data-driven.

## Requirements

### 1. Data Binding — Connect Game to Backend
- Agents reflect actual system state (working, idle, in-session, error)
- Show context in-game: discussions, reports, logs, session activity
- Real-time updates from Zustand store / API polling

### 2. Character Identity
- Add CEO character (the player — currently missing)
- Match agent genders to their personas (Sarah=female, Morgan=male, etc.)
- Show agent names next to sprites
- Status indicators above heads: working spinner, idle zzz, arguing/discussing speech bubbles, error icon

### 3. Z-Sort / Rendering Fixes
- Characters covering up-facing chairs — fix z-order
- Audit all rendering for other z-order issues
- Proper painter's algorithm for overlapping sprites

### 4. In-Game HUD (claw-empire style)
- Top menu bar with game feel — dark theme matching the office aesthetic
- In-game date/time display
- Quick-access buttons: reports, sessions, team status
- Notification badges for new events

### 5. Spatial Behavior — Meaningful Agent Movement
- CEO office: when CEO is talking to an agent or reviewing
- Own desk: when working on a task
- Meeting room: brainstorm, planning, team discussions
- Break room: when idle
- Rooms should make logical sense for the activity

### 6. Smooth Movement & Busy States
- No teleporting — smooth walking transitions between locations
- If a task finishes quickly (meeting ends), agent lingers briefly before moving
- If agent has multiple concurrent tasks, show busy indicator and stay at first task's location
- Movement speed should feel natural, not frantic

### 7. Interactive Game Elements
- Clickable agents → open agent detail (current task, session, logs)
- Clickable desks → open reports, artifacts
- Clickable rooms → show room activity summary
- This is a GAME — make it feel like one, not a dashboard with pixel art

### 8. Research & Future Features
- Study claw-empire and pixel-agents for game UX patterns
- Plan features that enhance the "living office" feel
- Consider: day/night cycle, weather, agent conversations, achievements, notifications as in-game events
