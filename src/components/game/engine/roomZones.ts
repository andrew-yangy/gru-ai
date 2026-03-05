// ---------------------------------------------------------------------------
// Room Zone definitions and context-aware spatial routing for agents.
// Zones are tile-coordinate rectangles carved from the 32x32 office layout.
// ---------------------------------------------------------------------------

import type { Character, AgentStatus, SessionInfo } from '../pixel-types'

// ---------------------------------------------------------------------------
// Zone types
// ---------------------------------------------------------------------------

export interface RoomZone {
  id: RoomZoneId
  label: string
  bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number }
  /** Walkable tiles agents can target within this zone */
  waypoints: Array<{ col: number; row: number }>
}

export type RoomZoneId =
  | 'ceo-office'
  | 'meeting'
  | 'workspace'
  | 'server-room'
  | 'break-room'
  | 'lobby'

// ---------------------------------------------------------------------------
// Zone definitions (based on office-layout.ts 32x32 grid)
// ---------------------------------------------------------------------------

export const ROOM_ZONES: Record<RoomZoneId, RoomZone> = {
  'ceo-office': {
    id: 'ceo-office',
    label: 'Manager Office',
    bounds: { minCol: 1, maxCol: 15, minRow: 2, maxRow: 10 },
    waypoints: [
      { col: 3, row: 7 },
      { col: 7, row: 7 },
      { col: 10, row: 7 },
      { col: 3, row: 9 },
      { col: 7, row: 9 },
    ],
  },
  meeting: {
    id: 'meeting',
    label: 'Conference Room',
    bounds: { minCol: 17, maxCol: 30, minRow: 2, maxRow: 10 },
    waypoints: [
      { col: 20, row: 8 },
      { col: 23, row: 8 },
      { col: 26, row: 8 },
      { col: 20, row: 3 },
      { col: 26, row: 3 },
    ],
  },
  workspace: {
    id: 'workspace',
    label: 'Open Workspace',
    bounds: { minCol: 1, maxCol: 30, minRow: 12, maxRow: 25 },
    waypoints: [
      { col: 2, row: 13 },
      { col: 2, row: 18 },
      { col: 16, row: 13 },
      { col: 16, row: 18 },
      { col: 16, row: 24 },
    ],
  },
  'server-room': {
    id: 'server-room',
    label: 'Server Room',
    bounds: { minCol: 1, maxCol: 8, minRow: 27, maxRow: 30 },
    waypoints: [
      { col: 2, row: 28 },
      { col: 4, row: 29 },
      { col: 6, row: 28 },
      { col: 3, row: 30 },
    ],
  },
  'break-room': {
    id: 'break-room',
    label: 'Break Room',
    bounds: { minCol: 20, maxCol: 30, minRow: 27, maxRow: 30 },
    waypoints: [
      { col: 22, row: 28 },
      { col: 25, row: 29 },
      { col: 28, row: 28 },
      { col: 24, row: 30 },
    ],
  },
  lobby: {
    id: 'lobby',
    label: 'Lobby',
    bounds: { minCol: 1, maxCol: 30, minRow: 25, maxRow: 31 },
    waypoints: [
      { col: 10, row: 28 },
      { col: 15, row: 29 },
      { col: 18, row: 28 },
    ],
  },
}

// ---------------------------------------------------------------------------
// Tool classification helpers
// ---------------------------------------------------------------------------

/** Tools associated with infrastructure / server / deployment work */
const INFRA_TOOLS = new Set([
  'Bash',
  'bash',
  'server',
  'deploy',
  'docker',
  'npm',
  'yarn',
  'bun',
  'prisma',
  'migration',
])

/** Check if a tool name suggests infrastructure work */
function isInfraTool(toolName: string | undefined): boolean {
  if (!toolName) return false
  const lower = toolName.toLowerCase()
  // Exact match on known tool names
  if (INFRA_TOOLS.has(toolName)) return true
  // Substring match for compound tool names
  return lower.includes('server') || lower.includes('deploy') || lower.includes('docker')
}

/** Check if a tool name suggests agent/discussion work */
function isAgentTool(toolName: string | undefined): boolean {
  if (!toolName) return false
  return toolName.includes('Agent') || toolName.includes('agent')
}

// ---------------------------------------------------------------------------
// Routing logic
// ---------------------------------------------------------------------------

export interface RoutingResult {
  zoneId: RoomZoneId
  waypoint: { col: number; row: number }
}

/**
 * Choose the appropriate destination zone and waypoint tile based on
 * the agent's current status and session context.
 *
 * Returns null when the agent should stay put (waiting, error at desk).
 */
export function chooseDestination(
  ch: Character,
  status: AgentStatus,
  sessionInfo: SessionInfo,
): RoutingResult | null {
  switch (status) {
    case 'working': {
      // Agent tool / subagents => meeting room for discussion
      if (isAgentTool(sessionInfo.toolName)) {
        return pickWaypoint('meeting')
      }
      // Infra tools => server room
      if (isInfraTool(sessionInfo.toolName)) {
        return pickWaypoint('server-room')
      }
      // Default working => own desk (handled externally via sendToSeat)
      return null
    }

    case 'waiting':
      // Stay at current location
      return null

    case 'idle':
      // Go to break room
      return pickWaypoint('break-room')

    case 'error':
      // Stay at desk with error indicator
      return null

    case 'offline':
      // Wander to break room
      return pickWaypoint('break-room')

    default:
      return null
  }
}

/**
 * Pick a random waypoint from a zone.
 */
function pickWaypoint(zoneId: RoomZoneId): RoutingResult {
  const zone = ROOM_ZONES[zoneId]
  const waypoint = zone.waypoints[Math.floor(Math.random() * zone.waypoints.length)]
  return { zoneId, waypoint }
}

/**
 * Check which zone a tile position falls within.
 * Returns the zone ID or null if not in any defined zone.
 */
export function getZoneAt(col: number, row: number): RoomZoneId | null {
  // Check specific zones first (server-room and break-room overlap with lobby)
  for (const zoneId of ['ceo-office', 'meeting', 'workspace', 'server-room', 'break-room', 'lobby'] as RoomZoneId[]) {
    const zone = ROOM_ZONES[zoneId]
    const b = zone.bounds
    if (col >= b.minCol && col <= b.maxCol && row >= b.minRow && row <= b.maxRow) {
      return zoneId
    }
  }
  return null
}
