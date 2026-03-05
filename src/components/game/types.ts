// ---------------------------------------------------------------------------
// Game Types -- Office Simulation
// ---------------------------------------------------------------------------

import registry from '../../../.claude/agent-registry.json';

/** Agent status derived from session data */
export type AgentStatus = 'working' | 'waiting' | 'idle' | 'error' | 'offline';

/** Tile type strings (kept for SidePanel compatibility) */
export type TileType =
  | 'floor'
  | 'wall'
  | 'desk'
  | 'ceo-desk'
  | 'conference'
  | 'whiteboard'
  | 'mailbox'
  | 'bell'
  | 'server-room'
  | 'door';

/** Currently selected item (kept for SidePanel compatibility) */
export interface SelectedItem {
  type: TileType;
  agentName?: string;
  position: { row: number; col: number };
}

/** Agent definition for game presence */
export interface AgentDesk {
  id: number;
  agentName: string;
  agentRole: string;
  palette: number;
  hueShift: number;
  seatId: string;
  position: { row: number; col: number };
  color: string;
  /** True for the CEO / player-controlled character */
  isPlayer: boolean;
}

/** Agents with game presence, derived from the canonical agent-registry.json */
export const OFFICE_AGENTS: AgentDesk[] = registry.agents
  .filter((a) => a.game !== null)
  .map((a, idx) => ({
    id: idx + 1,
    agentName: a.name.split(' ')[0],
    agentRole: a.title,
    palette: a.game!.palette,
    hueShift: (a.game as Record<string, unknown>).hueShift as number ?? 0,
    seatId: a.game!.seatId,
    position: { row: a.game!.position.row, col: a.game!.position.col },
    color: a.game!.color,
    isPlayer: !!(a.game as Record<string, unknown>).isPlayer,
  }));

/** Map from grid character code to agent name (kept for compat) */
export const AGENT_CHAR_MAP: Record<string, string> = Object.fromEntries(
  OFFICE_AGENTS.map((a) => {
    // Use first letter, except Marcus -> 'X' to avoid collision with Morgan's 'M'
    const char = a.agentName === 'Marcus' ? 'X' : a.agentName[0];
    return [char, a.agentName];
  })
);

/** Interactive tile types the user can click (kept for compat) */
export const INTERACTIVE_TILES: Set<TileType> = new Set([
  'desk',
  'ceo-desk',
  'conference',
  'whiteboard',
  'mailbox',
  'bell',
  'server-room',
  'door',
]);
