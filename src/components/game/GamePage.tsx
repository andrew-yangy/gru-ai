import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { OFFICE_AGENTS, type SelectedItem } from './types';
import type { AgentStatus, SessionInfo } from './pixel-types';
import GameHeader, { type HudPanel } from './GameHeader';
import CanvasOffice, { type ClickedItem } from './CanvasOffice';
import SidePanel from './SidePanel';
import type { TileType } from './types';

// ---------------------------------------------------------------------------
// Agent name set for O(1) lookup
// ---------------------------------------------------------------------------

const KNOWN_AGENTS = new Set(OFFICE_AGENTS.map((a) => a.agentName));

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
// Map session status → simplified AgentStatus
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
// GamePage
// ---------------------------------------------------------------------------

export default function GamePage() {
  const sessions = useDashboardStore((s) => s.sessions);
  const sessionActivities = useDashboardStore((s) => s.sessionActivities);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Derive agent statuses from sessions
  const agentStatuses = useMemo<Record<string, AgentStatus>>(() => {
    const map: Record<string, AgentStatus> = {};
    for (const name of KNOWN_AGENTS) {
      map[name] = 'offline';
    }
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName) && !s.isSubagent) {
        map[s.agentName] = toAgentStatus(s.status);
      }
    }
    return map;
  }, [sessions]);

  // Derive per-agent session context info (task/feature name, active tool)
  const agentSessionInfos = useMemo<Record<string, SessionInfo>>(() => {
    const map: Record<string, SessionInfo> = {};
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName) && !s.isSubagent) {
        const activity = sessionActivities[s.id];
        map[s.agentName] = {
          taskName: s.feature ?? undefined,
          toolName: activity?.tool ?? undefined,
        };
      }
    }
    return map;
  }, [sessions, sessionActivities]);

  // Derive per-agent busy flag (multiple active sessions = busy)
  const agentBusyMap = useMemo<Record<string, boolean>>(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.agentName && KNOWN_AGENTS.has(s.agentName) && !s.isSubagent) {
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

  // Handle agent click from canvas
  const handleAgentClick = useCallback((agentName: string) => {
    if (!agentName) {
      // Clicked empty space — deselect
      setSelected(null);
      setSheetOpen(false);
      return;
    }

    // Toggle off if same agent clicked
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

  // Handle furniture/desk click from canvas
  const handleItemClick = useCallback((item: ClickedItem | null) => {
    if (!item) {
      setSelected(null);
      setSheetOpen(false);
      return;
    }

    // Map ClickedItem.type to TileType for SidePanel
    const typeMap: Record<ClickedItem['type'], TileType> = {
      desk: 'desk',
      furniture: 'desk', // generic furniture shows as desk panel
      server: 'server-room',
      conference: 'conference',
      wall: 'wall',
    };

    const tileType = typeMap[item.type];

    setSelected({
      type: tileType,
      agentName: item.agentName,
      position: { row: item.row, col: item.col },
    });
    setSheetOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
    setSheetOpen(false);
  }, []);

  const handlePanelRequest = useCallback((_panel: HudPanel) => {
    // Placeholder: future implementation will open SidePanel with the
    // requested view (team overview, sessions list, or reports).
    // For now this is a no-op callback wired up for when SidePanel
    // gains multi-view support.
  }, []);

  return (
    <div className="flex flex-col h-full">
      <GameHeader onPanelRequest={handlePanelRequest} />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-0 bg-stone-200 dark:bg-stone-950">
          <CanvasOffice
            onAgentClick={handleAgentClick}
            onItemClick={handleItemClick}
            agentStatuses={agentStatuses}
            agentSessionInfos={agentSessionInfos}
            agentBusyMap={agentBusyMap}
            selectedAgentName={selected?.agentName ?? null}
          />
        </div>

        {!isMobile && (
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
