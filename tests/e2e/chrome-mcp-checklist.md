# Chrome MCP Dashboard Verification Checklist

Manual verification checklist for the gruai dashboard UI.
Each item is designed to be verified visually via Chrome MCP browser automation
(navigate, screenshot, inspect DOM) or by direct observation.

**Checklist format:** Each item has a description of what to look at, the expected
behavior, and a pass/fail checkbox. Mark `[x]` when verified.

---

## 0. Prerequisites and Server Startup

Before running any UI checks, the server and frontend must be running.

### Server

- [ ] **Start server:** Run `npm run dev` from the repo root. Console output should
      show `Conductor server running at http://localhost:4444` and
      `WebSocket available at ws://localhost:4444`.
- [ ] **Health check:** `curl http://localhost:4444/api/health` returns JSON with
      `"status":"ok"` and all three watchers (`session`, `directive`, `state`) report
      `true` for the `ready` field.
- [ ] **State snapshot:** `curl http://localhost:4444/api/state` returns a JSON object
      with at minimum `sessions` (array), `events` (array), `activeDirectives` (array),
      `directiveHistory` (array), and `sessionActivities` (object).

### Frontend

- [ ] **Dev server:** The Vite dev server starts on `http://localhost:5173`
      (or the port shown in terminal output).
- [ ] **Page loads:** Navigate to the dev server URL. The page loads without a blank
      screen or console errors. A pixel-art office is visible on a canvas element.

### API Endpoints (smoke)

- [ ] **GET /api/state** returns 200 with JSON.
- [ ] **GET /api/health** returns 200 with `"status":"ok"`.
- [ ] **GET /api/events** returns 200 with a JSON array.
- [ ] **GET /api/directive** returns 200 with JSON (may be `null` if no active directive).
- [ ] **GET /api/state/conductor** returns 200 with JSON.
- [ ] **GET /api/agent-registry** returns 200 with JSON containing an `agents` array.

---

## 1. GamePage Layout

The main page (`GamePage.tsx`) is a flex column filling the viewport height.
It contains GameHeader at top, a main area with CanvasOffice + optional SidePanel,
and a small attribution footer.

### Structure

- [ ] **Header visible:** A dark wood-themed header bar (`background: #5C3D2E`) is
      present at the top of the page. It contains the "Office" branding text on the
      left, date/time in the center, and HUD buttons on the right.
- [ ] **Canvas area:** Below the header, a canvas element with `aria-label="Office simulation"`
      occupies the main content area. It renders a pixel-art isometric office.
- [ ] **Controls hint:** A small overlay in the bottom-right corner of the canvas area
      displays the text `WASD / Arrows: Move  |  Click: Interact` in monospace font.
- [ ] **Attribution footer:** At the very bottom, centered text credits "Tileset by LimeZu"
      and "Characters by JIK-A-4 (CC0)" with external links.
- [ ] **No SidePanel on load:** On initial page load with nothing selected, no side
      panel is visible on the right.

### AgentTicker

- [ ] **Ticker appears when agents work:** If at least one agent has status `working`,
      a small floating ticker appears in the top-right area of the canvas
      (`position: absolute; top: 16px; right: 8px`). It shows the agent name and
      current task/tool activity.
- [ ] **Ticker hidden when idle:** If zero agents are working, the ticker does not render.
- [ ] **Ticker cycles:** If multiple agents are working, the ticker cycles through them
      every 3 seconds with a fade animation. A counter like "1/3" appears on the right.

---

## 2. GameHeader

The header (`GameHeader.tsx`) is a persistent top bar with branding, clock, and HUD buttons.

### Branding and Clock

- [ ] **"Office" text:** The left side shows "Office" in gold monospace font (`color: #C4A265`)
      with bold weight and tight tracking.
- [ ] **Connection indicator:** A small green dot (emerald-400, `box-shadow: 0 0 4px #34d399`)
      appears next to the "Office" text, with `aria-label="Connected"`.
- [ ] **Date and time (desktop):** On screens >= 640px (`sm` breakpoint), the center shows
      the current date (e.g., "Sat, Mar 8") and time (e.g., "2:30:15 PM") in monospace
      font, separated by a bullet character.
- [ ] **Time only (mobile):** On screens < 640px, only the time is shown (no date).
- [ ] **Clock updates live:** The time display updates every second without a page refresh.

### HUD Buttons

There are 5 buttons on the right side of the header. Each is a `<button>` element
with `font-mono text-[12px]` styling and a dark brown background (`#4A2F20`).

- [ ] **Team button:** Icon is `Users` (lucide). Label reads `Team N/M` where N is the
      count of working agents and M is the total staff count (non-player agents).
      `aria-label="Team overview"`. Badge count appears in red when agents have active
      working sessions.
- [ ] **Team button glow:** When `workingCount > 0`, the Team button has a subtle gold
      glow (`box-shadow` includes `0 0 8px #C4A26540`).
- [ ] **Tasks button:** Icon is `Zap`. Label is "Tasks". `aria-label="Tasks and directives"`.
      Badge count appears in red when there are errors, waiting-approval sessions,
      or awaiting_completion directives.
- [ ] **Status button:** Icon is `Activity`. Label is "Status".
      `aria-label="System status"`. Badge appears when directives have failed steps.
- [ ] **Log button:** Icon is `ScrollText`. Label is "Log".
      `aria-label="Activity log"`. No badge (log never shows a badge count).
- [ ] **Fullscreen button:** Icon is `Maximize2` (or `Minimize2` when already fullscreen).
      No label text. `aria-label="Enter fullscreen"` or `"Exit fullscreen"`.
      Clicking toggles browser fullscreen on the game container.

### Button Interaction

- [ ] **Toggle behavior:** Clicking a HUD button opens the corresponding panel in the
      SidePanel. Clicking the same button again closes the panel.
- [ ] **Active state:** When a panel is open, the corresponding button shows a depressed
      visual state (darker background `#3D2B1F`, gold text color `#C4A265`, inverted
      box-shadow for "pressed" look, subtle text-shadow glow).
- [ ] **Badge rendering:** Badge counts render as a small red pill
      (`background: #B83A2A`, white text, `text-[10px]`) to the right of the label.

---

## 3. CanvasOffice

The canvas (`CanvasOffice.tsx`) renders a full pixel-art office on an HTML5 canvas element.

### Rendering

- [ ] **Canvas element:** A `<canvas>` element with `role="img"` and
      `aria-label="Office simulation"` is present. It has `tabIndex={0}` for focus.
- [ ] **Tile map renders:** The office tile map is visible -- floor tiles, walls, desks,
      and furniture are drawn. No blank/black canvas.
- [ ] **Characters visible:** Agent characters (pixel sprites) are visible at their
      assigned desk positions. Each has a distinct color palette.
- [ ] **CEO character:** One character (the player-controlled CEO) starts in an idle
      state. The camera initially scrolls to center on this character.

### Mouse Interaction

- [ ] **Agent click:** Clicking on an agent character opens the SidePanel showing that
      agent's detail view (AgentPanel). The agent gets a selection highlight.
- [ ] **Agent hover:** Hovering over an agent character changes the cursor to `pointer`.
- [ ] **Desk click:** Clicking on an occupied desk (with an assigned agent) opens the
      SidePanel showing that agent's detail view.
- [ ] **Furniture click - server room:** Clicking server room furniture opens the Team
      HUD tab (via `FURNITURE_TAB_MAP` mapping `server-room` -> `team`).
- [ ] **Furniture click - whiteboard:** Clicking the whiteboard opens the Tasks HUD tab.
- [ ] **Furniture click - conference:** Clicking conference room furniture opens the
      Status HUD tab.
- [ ] **Furniture click - CEO desk:** Clicking the CEO desk area opens the Tasks HUD tab.
- [ ] **Furniture click - bookshelf:** Clicking the bookshelf opens the BookshelfPanel
      in the SidePanel.
- [ ] **Click-to-move (CEO):** Clicking on an empty walkable tile causes the CEO
      character to pathfind and walk to (or near) the clicked location.
- [ ] **Deselect on Escape:** Pressing Escape while an agent or panel is selected
      deselects it and closes the SidePanel.
- [ ] **Pointer cursor:** The cursor shows `pointer` when hovering over agents or
      interactive furniture, and `default` elsewhere.

### Room Tooltips

- [ ] **Room hover tooltip:** Hovering over a non-interactive area that falls within a
      defined room zone shows a floating tooltip with the room name (e.g., "CEO Office",
      "Meeting Room") and a list of agents currently in that zone.
- [ ] **Tooltip disappears:** Moving the cursor off the room area or onto an interactive
      element hides the tooltip.
- [ ] **Empty room tooltip:** If a room zone has no agents, the tooltip shows the room
      name with "Empty" in italic.

### Keyboard Navigation

- [ ] **WASD movement:** Pressing W, A, S, D moves the CEO character in the
      corresponding direction (up, left, down, right). Movement is continuous while
      the key is held.
- [ ] **Arrow key movement:** Arrow keys (Up, Down, Left, Right) also move the CEO.
- [ ] **Input field bypass:** When focus is on an `<input>`, `<textarea>`, `<select>`,
      or contentEditable element, WASD/arrow keys are NOT intercepted by the game.
- [ ] **Camera follow:** When the CEO character walks, the scroll container auto-scrolls
      to keep the character within a deadzone region of the viewport.

### Zoom

- [ ] **Fit-to-width:** On initial load, the canvas zoom is set so the map width fits
      the container width.
- [ ] **Ctrl+Scroll zoom:** Holding Ctrl (or Cmd on Mac) and scrolling the mouse wheel
      zooms in/out. Zoom is bounded between ~0.5x and ~3x of fit zoom.
- [ ] **Regular scroll:** Scrolling WITHOUT Ctrl/Cmd scrolls the canvas normally
      (native browser scrolling).

### Touch (Mobile)

- [ ] **Tap-to-click:** A single tap on the canvas triggers the same click logic as
      mouse click (agent selection, furniture interaction, click-to-move).
- [ ] **Drag-to-scroll:** Dragging on the canvas scrolls (native touch scroll) rather
      than selecting. A drag of >= 10px cancels the tap.

---

## 4. SidePanel

The SidePanel (`SidePanel.tsx`) renders as either a fixed right column (desktop, `w-80 xl:w-96`)
or a bottom sheet overlay (mobile).

### Desktop Variant

- [ ] **Panel appears on selection:** When an agent or HUD button is clicked, the SidePanel
      appears as a right column with a dark wood header bar and parchment-colored content area.
- [ ] **Panel width:** The panel is `w-80` (320px) on default screens and `w-96` (384px)
      on `xl` screens.
- [ ] **Panel header:** Shows the panel title (e.g., agent name, "Team", "Tasks", etc.)
      in gold monospace text (`color: #C4A265`) with a close button (X icon).
- [ ] **Close button:** The X button (`aria-label="Close panel"`) closes the panel and
      deselects the current item.
- [ ] **Scrollable content:** The panel content area is wrapped in a `ScrollArea` component
      for vertical scrolling on overflow.
- [ ] **Inner frame:** The content has a subtle inner frame with parchment-colored background
      (`#F0E4C8`) and inset box-shadow.

### Tab Strip (HUD Mode)

When a HUD button is clicked (Team, Tasks, Status, Log), the SidePanel shows a tab strip
below the header. Note: the tab strip is visually present in the code's `TabStrip` component
but SidePanel routes tab rendering through `PanelContent`.

- [ ] **Tab strip visible:** Four tabs are shown in a horizontal strip: Team, Tasks, Status, Log.
      Each tab has an icon and label. The tab strip has `role="tablist"` and `aria-label="Panel tabs"`.
- [ ] **Active tab styling:** The active tab has a darker background matching the parchment,
      bold text, and a bottom border connecting it to the content area.
- [ ] **Tab switching:** Clicking a different tab switches the content without closing the panel.
- [ ] **Tab badges:** Tabs with badge counts show a red pill badge (same style as header badges).
- [ ] **Keyboard-accessible:** Each tab button has `role="tab"` and `aria-selected` attributes.

### Mobile Variant (Bottom Sheet)

- [ ] **Bottom sheet on mobile:** On screens < 768px, the SidePanel renders as a fixed
      bottom sheet (`position: fixed; bottom: 0`) with a dark backdrop overlay.
- [ ] **Max height:** The sheet has `max-height: 55vh`.
- [ ] **Drag handle:** A centered gold bar appears at the top for visual grab affordance.
- [ ] **Backdrop dismiss:** Clicking the dark backdrop (`bg-black/40`) closes the sheet.
- [ ] **Escape dismiss:** Pressing Escape closes the bottom sheet.
- [ ] **Sheet animation:** The sheet animates in from the bottom
      (`animate-[slideUp_200ms_ease-out]`).
- [ ] **Dialog role:** The sheet has `role="dialog"` and `aria-modal="true"`.

### Agent Override (Back Button)

- [ ] **Agent drill-down:** When viewing the Team tab and clicking an agent name, the panel
      switches to show that agent's detail view (AgentPanel) with a "Back" button.
- [ ] **Back button:** The back button (left triangle + "Back") returns to the previous
      tab view. It has `aria-label="Back to tab"`.

---

## 5. TeamPanel

The Team panel (`TeamPanel.tsx`) shows agent roster information organized by work status.

### KPI Strip

- [ ] **Working count:** A card shows a green dot, a bold number (count of currently
      working agents), and the label "Working" in uppercase.
- [ ] **Loafing count:** A card shows a gray dot, a bold number (count of idle agents),
      and the label "Loafing" in uppercase.
- [ ] **Counts are accurate:** The sum of working + loafing equals the total number of
      non-player agents defined in `OFFICE_AGENTS`.

### Working Section

- [ ] **Section header:** If agents are working, a "Working" section header appears with
      a Swords icon and the count.
- [ ] **Active agent cards:** Each working agent shows a raised card with:
  - A colored left accent bar (agent's assigned color)
  - Agent name in bold monospace
  - Session count badge (e.g., "3 sess")
  - Time since last activity (e.g., "2m ago")
  - A "working" status chip (pulsing green)
- [ ] **Task description:** If the agent has an assigned task, it appears as text below
      the name row.
- [ ] **Tool activity:** If the agent is actively using a tool (e.g., "Edit", "Bash"),
      a green dot + tool name appears. "Thinking..." is shown when the agent is in
      thinking state.
- [ ] **Git branch:** If the agent's session has a git branch, it's displayed with a
      branch icon character.
- [ ] **Subagent chips:** If the agent has active subagents, small green-tinted chips
      display subagent names (max 4, with "+N" overflow).
- [ ] **Quick actions:** For sessions in `waiting-approval` or `waiting-input` status,
      QuickActions buttons appear (Approve/Reject/etc.).
- [ ] **Clickable cards:** Clicking a working agent card navigates to that agent's
      detail view (AgentPanel) via `onSelectAgent`.

### Idle Empty State

- [ ] **Fish icon:** When zero agents are working, a centered empty state shows a Fish
      icon, "Everyone's loafing" heading, and "No agents are currently working" subtext.

### Loafing Section

- [ ] **Section header:** A "Loafing" section with a Fish icon and idle count appears
      below the working section (separated by an ornamental parchment divider).
- [ ] **Team groups:** Idle agents are organized by team (Engineering, Product, Growth,
      Operations) with colored team labels.
- [ ] **Team leader card:** Each team's leader appears as a full-width card.
- [ ] **Report cards:** Team members reporting to the leader are indented with a
      colored left connector line.
- [ ] **Agent info:** Each loafing card shows agent name, role, session count (if any),
      and time since last activity.
- [ ] **Clickable:** Clicking a loafing agent card opens their detail view.

---

## 6. ActionPanel (Tasks Tab)

The ActionPanel (`ActionPanel.tsx`) is the Tasks tab content. It combines directive
pipeline tracking with session-level action items.

### Directive Pipeline Section

- [ ] **Active directive cards:** If there are active directives, each shows as an
      expandable card with:
  - Directive title in bold monospace
  - Weight badge (color-coded: blue for lightweight, amber for medium, red for heavyweight)
  - Current pipeline step name
  - Elapsed time since directive started
  - Progress bars for projects and pipeline steps
- [ ] **Expand directive:** Clicking a directive card expands it to show:
  - Full pipeline step list with status icons (checkmark, spinner, X, skip arrow, empty circle)
  - Project list with task progress
  - "Awaiting CEO completion approval" warning banner (if applicable)
- [ ] **Collapse directive:** Clicking the expanded directive header collapses it.

### Session Action Items

- [ ] **Waiting sessions:** Sessions in `waiting-approval` or `waiting-input` status
      appear as urgent action cards with yellow/amber styling.
- [ ] **Error sessions:** Sessions with `error` status appear as red-highlighted cards.
- [ ] **Quick actions for waiting:** Each waiting session card shows QuickActions
      (Approve, Reject, Abort buttons) and a SendInput field.
- [ ] **Focus terminal button:** Each session card with a `paneId` has a "Focus terminal"
      button that calls `/api/actions/focus-session`.

### Completion Approval

- [ ] **Approval card:** When a directive has status `awaiting_completion`, a prominent
      card appears with "Approve" and "Reject" buttons.
- [ ] **Approve action:** Clicking "Approve" calls `POST /api/actions/directive-complete`
      with `{ action: "approve", directiveName: "..." }`.
- [ ] **Reject with feedback:** Clicking "Reject" shows a textarea for feedback, then
      calls the same endpoint with `{ action: "reject", feedback: "..." }`.

### Empty States

- [ ] **No directives:** When no active directives exist, shows "No active directives"
      with directive history if available.
- [ ] **No action items:** When no sessions need attention, shows "All clear" messaging.

---

## 7. StatusPanel

The StatusPanel (`StatusPanel.tsx`) shows system vitals, directive status, velocity,
and session health.

### System Vitals (KPI Grid)

- [ ] **2x2 grid:** Four vital cards in a grid layout:
  - **Connection:** Green dot + "Online" when WebSocket is connected, red dot + "Offline"
    when disconnected. Icon is `Wifi` or `WifiOff`.
  - **Active Sessions:** Numeric count of sessions with status `working` or `waiting-*`.
    Icon is `Users`.
  - **Directives:** Count of active directives. Icon is `Zap`.
  - **Projects:** Count of in-flight projects across all active directives, with
    "in-flight" subtext. Icon is `FolderOpen`.

### Active Directives Section

- [ ] **Section header:** "Active Directives" with Zap icon and count.
- [ ] **Directive cards:** Each active directive shows as an expandable card with:
  - Title + weight badge (Light/Med/Heavy, color-coded)
  - Current step label and elapsed time
  - Project progress bar (green, `X/Y` format)
  - Pipeline progress bar (blue, `X/Y` format)
- [ ] **Expanded view:** Expanding shows the full pipeline steps list with status icons
      and per-project task breakdown with DOD items.
- [ ] **Awaiting completion banner:** Yellow warning appears for directives in
      `awaiting_completion` status.
- [ ] **Empty state:** Shows "No active directives" card when none exist.

### Velocity Section

- [ ] **Section header:** "Velocity (7d)" with TrendingUp icon and 7-day count.
- [ ] **Completed directive rows:** Up to 5 recently completed directives shown as
      expandable rows. Each shows title + time ago. Expanding shows weight badge
      and project list with checkmarks.
- [ ] **Empty state:** "No completed directives yet" when none exist.

### Session Health Section

- [ ] **Section header:** "Session Health" with Activity icon and total non-subagent
      session count.
- [ ] **Stacked bar chart:** A horizontal bar segmented by status:
  - Green for Working
  - Yellow for Waiting
  - Gray for Idle
  - Red for Error
- [ ] **Legend:** Below the bar, a legend shows each status with its color swatch and count.
- [ ] **Expanded view:** Clicking the session health card expands to show individual
      sessions grouped by status (working, waiting, error, idle). Each session shows
      agent name, feature, and time ago.
- [ ] **Empty state:** "No active sessions" when session count is zero.

---

## 8. LogPanel

The LogPanel (`LogPanel.tsx`) is a reverse-chronological activity feed.

### Filter Controls

- [ ] **Filter toggle:** Three radio-style buttons at the top: "Key", "Agents", "All".
      Default selection is "Key" (important events only).
- [ ] **Key filter:** Shows only high and medium priority events (errors, completions,
      waiting sessions, directive starts, directive completions, awaiting completion,
      pipeline steps).
- [ ] **Agents filter:** Shows session, activity, subagent, and task events.
- [ ] **All filter:** Shows every event with no filtering.
- [ ] **Filter count update:** The event count in the section header updates when
      switching filters.

### Event Feed

- [ ] **Date grouping:** Events are grouped by date with headers ("Today", "Yesterday",
      or "March 7" format). Groups are separated by ornamental parchment dividers.
- [ ] **Event cards:** Each event shows:
  - Status icon (color-coded: red for errors, green for completions, yellow for waiting,
    blue for working, purple for directive events)
  - Description text (e.g., "Morgan is working", "Directive completed: pipeline-v2")
  - Timestamp in 12-hour format (e.g., "2:30 PM")
- [ ] **Expandable events:** Events with metadata show a chevron. Clicking expands to
      reveal structured key-value metadata (Session, Model, Role, Branch, Feature, etc.).
- [ ] **Event sources:** Events come from:
  - Hook events (POST /api/events)
  - Session status changes
  - Directive lifecycle (started, completed, failed, awaiting)
  - Pipeline step transitions
  - Activity tool changes (throttled to 1 per session per 3 seconds)
  - Connection state changes (connected/disconnected)
  - Subagent spawns and completions
  - Task status changes

### Empty State

- [ ] **No events:** Shows ScrollText icon + "No events yet" + "Activity will appear
      here as agents work" when the event list is completely empty.
- [ ] **Filtered empty:** When the current filter produces zero results but events exist,
      shows "No important events" (or "No agent activity") with a prompt to switch to
      "All" with the total event count.

---

## 9. AgentPanel

The AgentPanel (`AgentPanel.tsx`) shows detailed information for a single agent.

### Identity Card

- [ ] **Color bar:** A full-width bar in the agent's assigned color appears at the top.
- [ ] **Agent name:** Bold monospace text showing the agent's first name.
- [ ] **Status chip:** A colored status indicator (working/idle).
- [ ] **Role text:** The agent's role description in dimmed text below the name.

### Active Sessions

- [ ] **Session cards:** Each active session for the agent shows:
  - Status chip (animated pulsing dot for working)
  - Session title (feature name, git branch, or extracted prompt)
  - Model badge (e.g., "Opus 4", "Sonnet 4") in a muted chip
  - Activity line showing current tool + detail when working
  - Git branch with branch icon
  - Prompt text (2-line clamp)
  - Subagent chips if present
- [ ] **Quick actions:** For sessions in waiting state with a paneId, QuickActions
      buttons appear (Approve, Reject, Abort).
- [ ] **Send input:** A text input field for sending messages to the session via
      `/api/actions/send-input`.
- [ ] **Focus terminal:** A "Focus terminal" button that calls
      `/api/actions/focus-session` with the session's paneId.
- [ ] **No active sessions:** Shows "No active sessions" centered text when the agent
      has no active sessions.

### History

- [ ] **History section:** Below active sessions, separated by an ornamental divider,
      a "History" section shows up to 8 recent idle/done sessions.
- [ ] **History cards:** Each shows title, status dot (green for done, red for error,
      gray for idle), time ago, git branch, model name, and status label.

---

## 10. Furniture Panels

These panels appear when clicking specific furniture items in the office.

### CeoDeskPanel

- [ ] **CEO Desk heading:** Crown icon + "CEO Desk" title.
- [ ] **Pending approvals:** Shows count of sessions with status `waiting-approval`
      in a badge (destructive variant when > 0).
- [ ] **Errors:** Shows error count when sessions have `error` status.
- [ ] **Active directive card:** If a directive is active, shows its name, current phase,
      and a progress bar of projects.
- [ ] **No directive:** Shows "No active directive" when none exists.

### WhiteboardPanel

- [ ] **Directives heading:** FileText icon + "Directives" title.
- [ ] **Directive list:** Each directive from `workState.conductor.directives` shows as a
      row with title and status badge.
- [ ] **Empty state:** "No active directives" when the list is empty.

### MailboxPanel

- [ ] **Reports heading:** Inbox icon + "Reports" title.
- [ ] **Report list:** Each report shows title and time ago.
- [ ] **Empty state:** "No reports available" when no reports exist.

### ConferencePanel

- [ ] **Conference Room heading:** Users icon + "Conference Room" title.
- [ ] **Active directive:** If present, shows directive name, phase, status badge, and
      project progress bar.
- [ ] **Empty state:** "No directive in progress" when none exists.

### BellPanel

- [ ] **Scout Bell heading:** Bell icon + "Scout Bell" title.
- [ ] **Placeholder state:** Shows bell emoji, "Ring the bell to start /scout", and
      "Coming in Phase 4 -- action layer" subtext. This is a placeholder.

### ServerRoomPanel

- [ ] **Server Room heading:** Server icon (emerald-500) + "Server Room" title.
- [ ] **Active sessions:** Shows count of sessions with status `working`.
- [ ] **Total sessions:** Shows count of non-subagent sessions.
- [ ] **Progress bar:** When active sessions > 0, shows a green progress bar of
      active/total.

---

## 11. BookshelfPanel

The BookshelfPanel (`BookshelfPanel.tsx`) provides a knowledge base browser.

### List View

- [ ] **Section header:** "Knowledge Base" with BookOpen icon and lesson count.
- [ ] **Lesson items:** Up to 6 known lessons listed (Orchestration Patterns, Agent
      Behavior, Review Quality, Skill Design, State Management, Scenarios). Each shows
      title and content summary.
- [ ] **Clickable items:** Each lesson is a button. Hovering changes background to
      `PARCHMENT.cardHover`.

### Detail View

- [ ] **Lesson selected:** Clicking a lesson title fetches content from
      `/api/state/artifact-content?path=<filePath>` and renders it in a scrollable
      parchment card.
- [ ] **Back button:** An ArrowLeft + "Back to topics" button returns to the list view.
- [ ] **Loading state:** While fetching, a Loader2 spinner + "Loading lesson..." appears.
- [ ] **Error state:** If fetch fails, shows "Could not load lesson content." with a
      "Retry" button (RefreshCw icon).
- [ ] **Markdown rendering:** Content is rendered via `renderBriefMarkdown()` with
      proper heading, list, and code formatting.

### Empty State

- [ ] **No lessons:** If both store lessons and fallback list are empty, shows BookOpen
      icon + "No knowledge captured yet" + "Lessons will appear here as the team learns".

---

## 12. DirectivePanel

The DirectivePanel (`DirectivePanel.tsx`) is shown when viewing a specific directive
(accessed via ActionPanel or furniture clicks). Note: This panel is imported via
the panels index but is primarily rendered as a sub-view within ActionPanel.

### Active Directive View

- [ ] **Health card:** Shows directive title, weight badge (color-coded), elapsed time
      (ticking every second), current step with step-level elapsed time, and status
      indicators ("Awaiting CEO sign-off", "Failed").
- [ ] **Pipeline stepper:** If pipeline steps exist, a `PipelineStepper` component
      renders the step progression with status icons.
- [ ] **Project cards:** Each project shows title, status icon (checkmark/spinner/X/skip/circle),
      phase badge (if active), and task progress bar with `completed/total` count.

### Empty State

- [ ] **No directive:** Shows Terminal icon + "No active directive" +
      "Start from backlog or type /directive in terminal".
- [ ] **History list:** Below the empty state, a "Recent Directives" section shows up to
      5 recent directives with status icons, titles, weight badges, and time ago.

---

## 13. WebSocket Live Updates

The dashboard receives live updates via WebSocket. These checks verify that changes
on the server are reflected in the UI without page refresh.

### Connection

- [ ] **Initial full_state:** On page load, the WebSocket sends a `full_state` message
      containing the complete dashboard state. The UI populates immediately.
- [ ] **Connection indicator:** The green dot in the GameHeader is visible.
- [ ] **StatusPanel shows "Online":** The Connection vital card in StatusPanel shows
      a green dot and "Online".

### Session Updates

- [ ] **New session appears:** When a new Claude session starts (e.g., run
      `claude -p "hello"` in terminal), it appears in the Team panel and Log panel
      within a few seconds.
- [ ] **Session status change:** When a session transitions from `working` to `done`,
      the Team panel updates (agent moves from Working to Loafing), and a completion
      event appears in the Log panel.
- [ ] **Agent status on canvas:** When an agent session starts working, the corresponding
      character on the canvas shows active behavior (typing animation at desk).

### Directive Updates

- [ ] **Directive started:** Starting a new `/directive` creates a directive card in the
      StatusPanel's Active Directives section and an event in the LogPanel.
- [ ] **Pipeline step progression:** As pipeline steps complete, the progress bars in
      StatusPanel update, and step-level events appear in the Log.
- [ ] **Directive completion:** When a directive completes, it moves from Active to
      the Velocity section.

### Activity Updates

- [ ] **Tool activity:** When an agent uses a tool (e.g., Edit, Bash), the TeamPanel's
      working agent card updates to show the tool name and detail.
- [ ] **AgentTicker updates:** The floating ticker updates with current agent activity.
- [ ] **Activity in LogPanel:** Tool activity events appear in the Log under the
      "Agents" filter (not "Key").

### Disconnection

- [ ] **Server stops:** Stop the server (`Ctrl+C`). The green connection dot should
      disappear. StatusPanel Connection card shows red dot + "Offline".
- [ ] **Reconnection:** Restart the server. The dashboard should reconnect automatically,
      the green dot reappears, and a full state refresh occurs.
- [ ] **Connection events in Log:** "Disconnected from server" and "Connected to server"
      events appear in the LogPanel.

---

## 14. Responsive Layout

Test the dashboard at different viewport sizes.

### Desktop (>= 1024px)

- [ ] **Full layout:** Header + canvas + SidePanel side-by-side. SidePanel appears as a
      right column when a panel is open.
- [ ] **XL width:** At >= 1280px, SidePanel width increases from 320px to 384px.
- [ ] **Header shows date + time:** Center section shows both date and time.

### Tablet (768px - 1023px)

- [ ] **Side panel fits:** SidePanel still renders as a side column but takes a larger
      proportion of the screen. Canvas area shrinks accordingly.
- [ ] **Header buttons readable:** All 5 HUD buttons are visible and tappable.

### Mobile (< 768px)

- [ ] **Bottom sheet mode:** The SidePanel renders as a bottom sheet overlay instead of
      a side column.
- [ ] **Time only in header:** Only time is shown, not date.
- [ ] **Canvas still interactive:** The canvas area fills the full width. Touch interactions
      (tap to select, drag to scroll) work correctly.
- [ ] **Sheet dismissal:** The bottom sheet can be dismissed by tapping the backdrop
      or pressing Escape.

### Mobile Breakpoint Transition

- [ ] **Resize from desktop to mobile:** Resizing the browser window below 768px
      while a panel is open transitions from side panel to bottom sheet without
      losing the selected panel.
- [ ] **Resize from mobile to desktop:** Resizing above 768px while the bottom sheet
      is open transitions to the side panel layout.

---

## 15. Edge Cases and Error States

### Empty Data

- [ ] **Zero sessions:** With no active Claude sessions, the Team panel shows
      "Everyone's loafing" with the Fish icon. Status panel shows 0 active sessions.
- [ ] **Zero directives:** All directive-dependent panels show their empty states
      (ActionPanel, StatusPanel Active Directives, CeoDeskPanel, ConferencePanel, etc.).
- [ ] **Zero events:** LogPanel shows "No events yet" empty state.

### Rapid State Changes

- [ ] **Multiple simultaneous updates:** Start several sessions at once. The dashboard
      handles the burst of WebSocket messages without visual glitches or errors.
- [ ] **Panel open during update:** With a panel open (e.g., Team), new sessions
      appearing or status changes should update the panel content live without closing it.

### Long Content

- [ ] **Long agent name:** Agents with long task names show truncation (`truncate` class)
      rather than breaking the layout.
- [ ] **Many sessions:** With a large number of sessions (e.g., 20+), the Team panel and
      Log panel remain scrollable and responsive.
- [ ] **Long directive name:** Directive titles truncate properly in StatusPanel and
      ActionPanel cards.

### Error Recovery

- [ ] **API endpoint failure:** If `/api/state/artifact-content` fails (BookshelfPanel),
      the "Retry" button re-fetches the content. The failure state is shown clearly.
- [ ] **WebSocket reconnect:** After losing and regaining the WebSocket connection,
      the dashboard receives a fresh `full_state` snapshot and UI is consistent.

---

## Summary

| Section | Component(s) | Check Count |
|---------|-------------|-------------|
| 0. Prerequisites | Server, API | 9 |
| 1. GamePage Layout | GamePage, AgentTicker | 8 |
| 2. GameHeader | GameHeader | 15 |
| 3. CanvasOffice | CanvasOffice | 17 |
| 4. SidePanel | SidePanel | 14 |
| 5. TeamPanel | TeamPanel | 15 |
| 6. ActionPanel | ActionPanel, DirectivePanel | 12 |
| 7. StatusPanel | StatusPanel | 13 |
| 8. LogPanel | LogPanel | 11 |
| 9. AgentPanel | AgentPanel | 10 |
| 10. Furniture Panels | 6 panels | 15 |
| 11. BookshelfPanel | BookshelfPanel | 9 |
| 12. DirectivePanel | DirectivePanel | 6 |
| 13. WebSocket | Live updates | 13 |
| 14. Responsive | Viewport sizes | 10 |
| 15. Edge Cases | Error states | 8 |
| **Total** | | **185** |
