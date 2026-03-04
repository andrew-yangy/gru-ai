import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { OFFICE_AGENTS, type AgentStatus, type SelectedItem } from './types';
import GameHeader from './GameHeader';
import CanvasOffice from './CanvasOffice';
import SidePanel from './SidePanel';

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

  const handleClose = useCallback(() => {
    setSelected(null);
    setSheetOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <GameHeader />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-0 bg-stone-200 dark:bg-stone-950">
          <CanvasOffice
            onAgentClick={handleAgentClick}
            agentStatuses={agentStatuses}
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
