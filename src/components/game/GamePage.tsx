import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { OFFICE_AGENTS, type SelectedItem } from './types';
import type { AgentStatus, SessionInfo } from './pixel-types';
import GameHeader, { type HudPanel } from './GameHeader';
import CanvasOffice, { type ClickedItem } from './CanvasOffice';
import SidePanel from './SidePanel';
import type { TileType } from './types';
import type { Session } from '@/stores/types';
import { getZoneAt } from './engine/roomZones';

// ---------------------------------------------------------------------------
// Agent name set for O(1) lookup
// ---------------------------------------------------------------------------

const KNOWN_AGENTS = new Set(OFFICE_AGENTS.map((a) => a.agentName));

// ---------------------------------------------------------------------------
// Furniture-to-HUD-tab mapping
// When a furniture click resolves to one of these TileTypes, open the
// corresponding HUD tab instead of the furniture-specific panel.
// ---------------------------------------------------------------------------

const FURNITURE_TAB_MAP: Partial<Record<TileType, HudPanel>> = {
  'ceo-desk':    'action',     // CEO desk -> Action tab (inbox)
  'whiteboard':  'directive',  // Whiteboard -> Directive tab
  'conference':  'ops',        // Conference room -> Ops tab (company overview)
  'server-room': 'team',      // Server room -> Team tab (sessions)
};

// ---------------------------------------------------------------------------
// Mobile breakpoint
// ---------------------------------------------------------------------------

const MOBILE_BREAKPOINT = 768;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

// ---------------------------------------------------------------------------
// Map session status -> simplified AgentStatus
// ---------------------------------------------------------------------------

function toAgentStatus(sessionStatus: string): AgentStatus {
  switch (sessionStatus) {
    case 'working':          return 'working';
    case 'waiting-approval':
    case 'waiting-input':    return 'waiting';
    case 'idle':
    case 'paused':
    case 'done':             return 'idle';
    case 'error':            return 'error';
    default:                 return 'offline';
  }
}

// ---------------------------------------------------------------------------
// Pixel-art overlay styles
// ---------------------------------------------------------------------------

const PIXEL_BORDER_STYLE = {
  boxShadow: 'inset -2px -2px 0 0 #8B6914, inset 2px 2px 0 0 #F5ECD7',
} as const;

// ---------------------------------------------------------------------------
// StatsOverlay (Task 5)
// ---------------------------------------------------------------------------

function StatsOverlay({ sessions }: { sessions: Session[] }) {
  const directiveState = useDashboardStore((s) => s.directiveState);

  const workingCount = new Set(
    sessions.filter((s) => s.status === 'working' && s.agentName).map((s) => s.agentName)
  ).size;
  const staffCount = OFFICE_AGENTS.filter((a) => !a.isPlayer).length;
  const progressCurrent = directiveState?.currentProject ?? 0;
  const progressTotal = directiveState?.totalProjects ?? 0;

  return (
    <div
      className="absolute top-2 right-2 z-10 font-mono text-[10px] leading-snug px-2.5 py-2 pointer-events-none select-none"
      style={{
        backgroundColor: '#5C3D2E',
        color: '#F5ECD7',
        borderRadius: '2px',
        boxShadow: [
          '0 0 0 1px #3D2B1F',
          '0 2px 4px rgba(0,0,0,0.3)',
          'inset 1px 1px 0 0 #6B4C3B',
          'inset -1px -1px 0 0 #3D2B1F',
        ].join(', '),
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span>
          <span style={{ color: '#C4A265' }}>Staff:</span> {staffCount}
        </span>
        <span>
          <span style={{ color: '#C4A265' }}>Working:</span>{' '}
          <span style={{ color: workingCount > 0 ? '#22C55E' : '#F5ECD7' }}>{workingCount}</span>
        </span>
        {progressTotal > 0 && (
          <span>
            <span style={{ color: '#C4A265' }}>In Progress:</span> {progressCurrent}/{progressTotal}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ControlsHint (Task 6)
// ---------------------------------------------------------------------------

function ControlsHint() {
  return (
    <div
      className="absolute bottom-2 right-2 z-10 font-mono text-[10px] px-2 py-1 pointer-events-none select-none"
      style={{
        backgroundColor: '#3D2B1F',
        color: '#C4A265',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px #5C3D2E, inset 1px 1px 0 0 #4A2F20',
      }}
    >
      WASD / Arrows: Move&nbsp;&nbsp;|&nbsp;&nbsp;Click: Interact
    </div>
  );
}

// ---------------------------------------------------------------------------
// GamePage
// ---------------------------------------------------------------------------

export default function GamePage() {
  const sessions = useDashboardStore((s) => s.sessions);
  const sessionActivities = useDashboardStore((s) => s.sessionActivities);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Derive agent statuses from sessions (include subagents — agents often
  // appear only as subagents of directive pipeline sessions)
  const agentStatuses = useMemo<Record<string, AgentStatus>>(() => {
    const map: Record<string, AgentStatus> = {};
    for (const name of KNOWN_AGENTS) {
      map[name] = 'offline';
    }
    const priority: Record<AgentStatus, number> = { working: 3, waiting: 2, idle: 1, error: 1, offline: 0 };
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName)) {
        const status = toAgentStatus(s.status);
        if (priority[status] > priority[map[s.agentName] ?? 'offline']) {
          map[s.agentName] = status;
        }
      }
    }
    return map;
  }, [sessions]);

  // Derive per-agent session context info (prefer working session's activity)
  const agentSessionInfos = useMemo<Record<string, SessionInfo>>(() => {
    const map: Record<string, SessionInfo> = {};
    const mapPriority: Record<string, number> = {};
    const statusPri: Record<string, number> = { working: 3, 'waiting-approval': 2, 'waiting-input': 2, idle: 1, paused: 1, done: 0, error: 0 };
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName)) {
        const pri = statusPri[s.status] ?? 0;
        if (pri >= (mapPriority[s.agentName] ?? -1)) {
          mapPriority[s.agentName] = pri;
          const activity = sessionActivities[s.id];
          map[s.agentName] = {
            taskName: s.feature ?? undefined,
            toolName: activity?.tool ?? undefined,
            detail: activity?.detail ?? undefined,
          };
        }
      }
    }
    return map;
  }, [sessions, sessionActivities]);

  // Derive per-agent busy flag
  const agentBusyMap = useMemo<Record<string, boolean>>(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName)) {
        const status = toAgentStatus(s.status);
        if (status === 'working' || status === 'waiting') {
          counts[s.agentName] = (counts[s.agentName] ?? 0) + 1;
        }
      }
    }
    const map: Record<string, boolean> = {};
    for (const name of KNOWN_AGENTS) {
      map[name] = (counts[name] ?? 0) > 1;
    }
    return map;
  }, [sessions]);

  // Derive agent interactions: parent<->subagent pairs where both are known office agents
  // Also derive subagentsByParent for meeting room routing (directed: parent → children)
  const { agentInteractions, subagentsByParent } = useMemo(() => {
    const sessionToAgent = new Map<string, string>();
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName)) {
        sessionToAgent.set(s.id, s.agentName);
      }
    }
    const pairs: Array<[string, string]> = [];
    const seen = new Set<string>();
    const byParent = new Map<string, string[]>();
    // Group active subagents by parentSessionId for meeting detection
    // Handles cases where parent session isn't a known agent (e.g., CEO/directive spawns brainstorm agents)
    const siblingsByParentSid = new Map<string, string[]>();
    for (const s of sessions) {
      if (s.isSubagent && s.parentSessionId && s.agentName && KNOWN_AGENTS.has(s.agentName)) {
        const parentAgent = sessionToAgent.get(s.parentSessionId);
        if (parentAgent && parentAgent !== s.agentName) {
          // Parent is a known agent — track as directed parent→child
          const key = [parentAgent, s.agentName].sort().join(':');
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push([parentAgent, s.agentName]);
          }
          const children = byParent.get(parentAgent) ?? [];
          if (!children.includes(s.agentName)) {
            children.push(s.agentName);
            byParent.set(parentAgent, children);
          }
        }
        // Also track siblings: active subagents sharing same parent session
        if (s.status === 'working' || s.status === 'waiting-approval' || s.status === 'waiting-input') {
          const siblings = siblingsByParentSid.get(s.parentSessionId) ?? [];
          if (!siblings.includes(s.agentName)) {
            siblings.push(s.agentName);
            siblingsByParentSid.set(s.parentSessionId, siblings);
          }
        }
      }
    }
    // Convert sibling groups to byParent entries (pick first agent as "parent" for meeting routing)
    // Skip groups where agents are already covered by a directed parent→child entry
    const alreadyCovered = new Set<string>();
    for (const [parent, children] of byParent) {
      alreadyCovered.add(parent);
      for (const child of children) alreadyCovered.add(child);
    }
    for (const [, agents] of siblingsByParentSid) {
      if (agents.length >= 3) {
        // Skip if most agents already appear in directed groups
        const uncovered = agents.filter(a => !alreadyCovered.has(a));
        if (uncovered.length < agents.length) continue; // overlap with directed group
        // Use the first agent as the meeting "host"
        const host = agents[0];
        const existing = byParent.get(host) ?? [];
        for (const agent of agents.slice(1)) {
          if (!existing.includes(agent)) existing.push(agent);
        }
        byParent.set(host, existing);
      }
    }
    return { agentInteractions: pairs, subagentsByParent: byParent };
  }, [sessions]);

  // Derive review interactions
  const reviewInteractions = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    const sessionToAgent = new Map<string, string>();
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName)) {
        sessionToAgent.set(s.id, s.agentName);
      }
    }
    for (const s of sessions) {
      if (
        s.isSubagent &&
        s.parentSessionId &&
        s.agentName &&
        KNOWN_AGENTS.has(s.agentName) &&
        s.feature &&
        /review|audit/i.test(s.feature)
      ) {
        const parentAgent = sessionToAgent.get(s.parentSessionId);
        if (parentAgent && parentAgent !== s.agentName) {
          map.set(s.agentName, parentAgent);
        }
      }
    }
    return map;
  }, [sessions]);

  // Handle agent click from canvas
  const handleAgentClick = useCallback((agentName: string) => {
    if (!agentName) {
      setSelected(null);
      setSheetOpen(false);
      return;
    }

    if (selected?.agentName === agentName) {
      setSelected(null);
      setSheetOpen(false);
      return;
    }

    const agent = OFFICE_AGENTS.find((a) => a.agentName === agentName);
    if (agent) {
      setSelected({
        type: 'desk',
        agentName: agent.agentName,
        position: agent.position,
      });
      setSheetOpen(true);
    }
  }, [selected]);

  const handleClose = useCallback(() => {
    setSelected(null);
    setSheetOpen(false);
  }, []);

  // Wire HUD buttons to SidePanel with toggle behavior
  const handlePanelRequest = useCallback((panel: HudPanel) => {
    const typeMap: Record<HudPanel, TileType> = {
      team: 'hud-team',
      action: 'hud-action',
      ops: 'hud-ops',
      directive: 'hud-directive',
      log: 'hud-log',
    };
    // Toggle: if same panel already open, close it
    if (selected?.type === typeMap[panel]) {
      setSelected(null);
      setSheetOpen(false);
      return;
    }
    setSelected({ type: typeMap[panel], position: { row: 0, col: 0 } });
    setSheetOpen(true);
  }, [selected]);

  // Handle furniture/desk click from canvas
  const handleItemClick = useCallback((item: ClickedItem | null) => {
    if (!item) {
      setSelected(null);
      setSheetOpen(false);
      return;
    }

    const typeMap: Record<ClickedItem['type'], TileType> = {
      desk: 'desk',
      furniture: 'desk',
      server: 'server-room',
      conference: 'conference',
      wall: 'wall',
      whiteboard: 'whiteboard',
      bookshelf: 'bookshelf',
    };

    let tileType = typeMap[item.type];

    // Route generic 'furniture' clicks by room zone for richer panels
    if (item.type === 'furniture') {
      const zone = getZoneAt(item.col, item.row);
      if (zone === 'ceo-office') tileType = 'ceo-desk';
      else if (zone === 'meeting') tileType = 'conference';
      else if (zone === 'server-room') tileType = 'server-room';
    }

    // If this furniture type maps to a HUD tab, open that tab instead
    const hudPanel = FURNITURE_TAB_MAP[tileType];
    if (hudPanel) {
      handlePanelRequest(hudPanel);
      return;
    }

    setSelected({
      type: tileType,
      agentName: item.agentName,
      position: { row: item.row, col: item.col },
    });
    setSheetOpen(true);
  }, [handlePanelRequest]);

  // Derive which HudPanel is active (for header button highlight)
  const activePanel = useMemo<HudPanel | null>(() => {
    if (!selected) return null;
    switch (selected.type) {
      case 'hud-team': return 'team';
      case 'hud-action': return 'action';
      case 'hud-ops': return 'ops';
      case 'hud-directive': return 'directive';
      case 'hud-log': return 'log';
      default: return null;
    }
  }, [selected]);

  const gameContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={gameContainerRef} className="flex flex-col h-full">
      <GameHeader
        onPanelRequest={handlePanelRequest}
        gameContainerRef={gameContainerRef}
        activePanel={activePanel}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-auto bg-stone-200 dark:bg-stone-950 relative">
          <CanvasOffice
            onAgentClick={handleAgentClick}
            onItemClick={handleItemClick}
            agentStatuses={agentStatuses}
            agentSessionInfos={agentSessionInfos}
            agentBusyMap={agentBusyMap}
            agentInteractions={agentInteractions}
            subagentsByParent={subagentsByParent}
            reviewInteractions={reviewInteractions}
            selectedAgentName={selected?.agentName ?? null}
          />
          <StatsOverlay sessions={sessions} />
          <ControlsHint />
        </div>

        {/* SidePanel on desktop when something is selected */}
        {!isMobile && selected && (
          <SidePanel
            selected={selected}
            agentStatuses={agentStatuses}
            onClose={handleClose}
            variant="side"
          />
        )}
      </div>

      {isMobile && sheetOpen && selected && (
        <SidePanel
          selected={selected}
          agentStatuses={agentStatuses}
          onClose={handleClose}
          variant="bottom"
        />
      )}

    </div>
  );
}
