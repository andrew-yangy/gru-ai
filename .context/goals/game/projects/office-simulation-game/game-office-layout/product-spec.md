# Product Spec: Office Layout Grid + Interactive Furniture

> Initiative: game-office-layout
> Author: Marcus (CPO)
> Date: 2026-03-04

## Overview

Build a clickable React prototype of the office simulation game at route /game. This is an interaction design prototype -- no Canvas rendering, no pixel art, no game engine. Basic HTML/CSS/Tailwind divs representing an office layout where the CEO can click on furniture and agent desks to see relevant data.

## User Experience

The CEO navigates to /game (via sidebar link or direct URL). They see a top-down office floor plan rendered as a grid. Each cell contains either floor, wall, or furniture. Agent desks show the agent's name and a colored status dot. The CEO clicks any interactive element to see details in a right-side panel.

## Requirements

### R1: Route and Navigation
- New route at /game within existing AppLayout
- Sidebar gets a "Game" link (with a game controller or building icon)
- Lazy-loaded following existing SuspenseWrapper pattern
- Page title: "Office" or "HQ"

### R2: Office Grid Layout
- Fixed-size grid: 20 columns x 14 rows (adjustable via constants)
- Each tile is approximately 40x40px
- Tile types: floor, wall, desk, conference-table, whiteboard, mailbox, bell, door, ceo-desk
- Layout defined as a 2D array constant (easy to modify later)
- Walls form the office perimeter
- Interior has open floor plan with furniture placed at specific positions

### R3: Office Furniture and Zones
The office must include these interactive zones:
1. **CEO Corner Office** (top-right) -- desk with document icon, 2x2 tiles
2. **Agent Desks** (5 desks across the main floor) -- one for each C-suite member:
   - Alex (Chief of Staff) -- near CEO office
   - Sarah (CTO) -- with laptop icon
   - Morgan (COO) -- with checklist icon
   - Marcus (CPO) -- with whiteboard marker
   - Priya (CMO) -- with megaphone icon
3. **Conference Room** (center-left) -- 3x2 table area
4. **Whiteboard** (on a wall) -- shows directive status
5. **Mailbox** (near entrance/door) -- shows reports
6. **Bell** (reception area) -- triggers /scout action (visual only in prototype)
7. **Server Room Door** (back wall) -- glows when agents are processing

### R4: Visual Design
- Each tile has a distinct background color:
  - Floor: light gray (bg-gray-100)
  - Wall: dark gray (bg-gray-700)
  - Desk: warm wood tone (bg-amber-200)
  - Agent at desk: colored border matching agent's theme color
- Interactive elements have hover effect (ring-2, cursor-pointer)
- Selected element has active ring (ring-blue-500)
- Agent desks show: agent emoji/initial + name label below
- Status indicators: colored dot (green/yellow/gray) on agent desks

### R5: Side Panel
- Right-side panel (fixed width ~320px) that shows details of selected item
- When nothing selected: shows office overview (agent count, status summary)
- When agent desk selected: shows agent name, role, status, current work summary
- When whiteboard selected: shows active directives list
- When mailbox selected: shows recent reports list
- When CEO desk selected: shows pending approvals / CEO brief summary
- When conference room selected: shows current initiative status
- Panel has a close button and title bar

### R6: Game Header Bar
- Top bar within the game area (not the app header)
- Shows: "HQ" title, current date/time, agent status counts (X active / Y idle / Z attention)
- Pixel-art style font optional but not required for prototype
- Dark background to feel "game-like" vs the dashboard's light theme

### R7: Data Integration (basic)
- Read from useDashboardStore for session data
- Map Session.agentName to desk positions
- If store has no data yet, show placeholder text ("No active sessions")
- workState for directives/reports can use placeholder if not loaded

## Acceptance Criteria

1. /game route renders inside AppLayout with sidebar link
2. Grid displays all required zones (5 agent desks, CEO desk, conference, whiteboard, mailbox, bell)
3. Clicking any interactive element updates the side panel with relevant content
4. Agent desks show agent name labels
5. Visual distinction between floor, wall, furniture, and interactive elements
6. Type-check and build pass

## Out of Scope
- Canvas rendering (Phase 2)
- Pixel art assets (Phase 2)
- Drag-and-drop agent assignment (Phase 4)
- Sound effects (Phase 5)
- Animation (Phase 2+)
- CEO character walking (Phase 2+)
