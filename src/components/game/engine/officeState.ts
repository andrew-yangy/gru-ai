import { TILE_SIZE, MATRIX_EFFECT_DURATION, CharacterState, Direction, FurnitureActivityType } from '../pixel-types'
import {
  HUE_SHIFT_MIN_DEG,
  HUE_SHIFT_RANGE_DEG,
  WAITING_BUBBLE_DURATION_SEC,
  DISMISS_BUBBLE_FAST_FADE_SEC,
  INACTIVE_SEAT_TIMER_MIN_SEC,
  INACTIVE_SEAT_TIMER_RANGE_SEC,
  AUTO_ON_FACING_DEPTH,
  AUTO_ON_SIDE_DEPTH,
  CHARACTER_SITTING_OFFSET_PX,
  CHARACTER_HIT_HALF_WIDTH,
  CHARACTER_HIT_HEIGHT,
  CHARACTER_SPRITE_SCALE,
  LINGER_MIN_SEC,
  LINGER_MAX_SEC,
  COLLISION_FLASH_DURATION_SEC,
  PROXIMITY_RADIUS_TILES,
  MEETING_SUBAGENT_THRESHOLD,
  INTERACTION_POINTS,
  getAvailableInteractionPoint,
  type OccupancyInfo,
  CHAT_PROXIMITY_TILES,
  CHAT_SHOW_MIN_SEC,
  CHAT_SHOW_MAX_SEC,
  CHAT_HIDE_MIN_SEC,
  CHAT_HIDE_MAX_SEC,
  CHAT_EMOJI_POOL,
  IDLE_TIER_MODERATE_MS,
} from '../constants'
import type { Character, Seat, FurnitureInstance, TileType as TileTypeVal, OfficeLayout, PlacedFurniture, AgentStatus, SessionInfo, InteractionPoint } from '../pixel-types'
import { createCharacter, updateCharacter, computeIdleTier } from './characters'
import { getCharacterTemplateCount } from '../sprites/spriteData'
import { matrixEffectSeeds } from './matrixEffect'
import { isWalkable, getWalkableTiles, findPath } from '../layout/tileMap'
import { chooseDestination, pickWaypoint, isAgentAllowedInZone, getZoneAt, ROOM_ZONES } from './roomZones'
import type { RoomZoneId } from './roomZones'
import {
  createDefaultLayout,
  layoutToTileMap,
  layoutToFurnitureInstances,
  layoutToSeats,
  getBlockedTiles,
  getBlockedTilesFromGids,
  seatsFromPositions,
} from '../layout/layoutSerializer'
import { getCatalogEntry, getOnStateType } from '../layout/furnitureCatalog'
import { WALL_GIDS } from '../office-layout'

export class OfficeState {
  layout: OfficeLayout
  tileMap: TileTypeVal[][]
  seats: Map<string, Seat>
  blockedTiles: Set<string>
  /** Tiles currently occupied by characters (rebuilt each update tick) */
  occupiedTiles: Set<string> = new Set()
  furniture: FurnitureInstance[]
  walkableTiles: Array<{ col: number; row: number }>
  characters: Map<number, Character> = new Map()
  selectedAgentId: number | null = null
  cameraFollowId: number | null = null
  hoveredAgentId: number | null = null
  hoveredTile: { col: number; row: number } | null = null
  /** Keys currently held down by the player (for continuous WASD movement) */
  heldKeys: Set<string> = new Set()
  /** Collision flash overlay for blocked tile feedback */
  collisionFlash: { col: number; row: number; timer: number } | null = null
  /** Maps "parentId:toolId" → sub-agent character ID (negative) */
  subagentIdMap: Map<string, number> = new Map()
  /** Reverse lookup: sub-agent character ID → parent info */
  subagentMeta: Map<number, { parentAgentId: number; parentToolId: string }> = new Map()
  /** Whether a conference meeting is currently active */
  meetingActive = false
  /** All agent IDs participating in the current meeting */
  meetingAgents: Set<number> = new Set()
  /** Active review pairs: reviewerId -> builderId (reviewer walks to builder's desk) */
  reviewPairs: Map<number, number> = new Map()
  /** Session-derived subagent counts: parentId → childIds (for meeting detection from props) */
  sessionSubagentsByParent: Map<number, number[]> = new Map()
  /** Interaction point occupancy: pointId → { count, agentIds } */
  occupiedPoints: Map<string, OccupancyInfo> = new Map()
  private nextSubagentId = -1

  /** Maps seat uid → { col, row } for pre-computed approach points */
  seatApproachMap: Map<string, { col: number; row: number }> = new Map()

  constructor(layout?: OfficeLayout) {
    this.layout = layout || createDefaultLayout()
    this.tileMap = layoutToTileMap(this.layout)

    // Use GID-based collision + numbered seats when available
    if (this.layout.seatPositions) {
      this.seats = seatsFromPositions(this.layout.seatPositions)
    } else {
      this.seats = layoutToSeats(this.layout.furniture)
    }

    if (this.layout.collisionLayer) {
      // Pre-computed collision layer — use directly
      this.blockedTiles = new Set<string>()
      for (let i = 0; i < this.layout.collisionLayer.length; i++) {
        if (this.layout.collisionLayer[i] === 1) {
          const col = i % this.layout.cols
          const row = Math.floor(i / this.layout.cols)
          this.blockedTiles.add(`${col},${row}`)
        }
      }
    } else if (this.layout.gidLayers && this.layout.gidLayers.length > 0) {
      // Fallback: derive blocked tiles from GID layers 1+2
      this.blockedTiles = getBlockedTilesFromGids(this.layout.gidLayers, this.layout.cols, [1, 2])
    } else {
      this.blockedTiles = getBlockedTiles(this.layout.furniture)
    }

    // Populate approach points on seats
    this.buildSeatApproachMap(this.layout)

    this.furniture = layoutToFurnitureInstances(this.layout.furniture)
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles)
  }

  /** Build the seat approach map from layout data, setting approachCol/approachRow on each seat */
  private buildSeatApproachMap(layout: OfficeLayout): void {
    this.seatApproachMap.clear()
    if (layout.seatApproachPoints) {
      for (const ap of layout.seatApproachPoints) {
        this.seatApproachMap.set(ap.seatName, { col: ap.col, row: ap.row })
        const seat = this.seats.get(ap.seatName)
        if (seat) {
          seat.approachCol = ap.col
          seat.approachRow = ap.row
        }
      }
    }
  }

  /** Rebuild all derived state from a new layout. Reassigns existing characters.
   *  @param shift Optional pixel shift to apply when grid expands left/up */
  rebuildFromLayout(layout: OfficeLayout, shift?: { col: number; row: number }): void {
    this.layout = layout
    this.tileMap = layoutToTileMap(layout)

    if (layout.seatPositions) {
      this.seats = seatsFromPositions(layout.seatPositions)
    } else {
      this.seats = layoutToSeats(layout.furniture)
    }

    if (layout.collisionLayer) {
      this.blockedTiles = new Set<string>()
      for (let i = 0; i < layout.collisionLayer.length; i++) {
        if (layout.collisionLayer[i] === 1) {
          const col = i % layout.cols
          const row = Math.floor(i / layout.cols)
          this.blockedTiles.add(`${col},${row}`)
        }
      }
    } else if (layout.gidLayers && layout.gidLayers.length > 0) {
      this.blockedTiles = getBlockedTilesFromGids(layout.gidLayers, layout.cols, [1, 2])
    } else {
      this.blockedTiles = getBlockedTiles(layout.furniture)
    }

    // Rebuild approach point map
    this.buildSeatApproachMap(layout)

    this.rebuildFurnitureInstances()
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles)

    // Shift character positions when grid expands left/up
    if (shift && (shift.col !== 0 || shift.row !== 0)) {
      for (const ch of this.characters.values()) {
        ch.tileCol += shift.col
        ch.tileRow += shift.row
        ch.x += shift.col * TILE_SIZE
        ch.y += shift.row * TILE_SIZE
        // Clear path since tile coords changed
        ch.path = []
        ch.moveProgress = 0
      }
    }

    // Reassign characters to new seats, preserving existing assignments when possible
    for (const seat of this.seats.values()) {
      seat.assigned = false
    }

    // First pass: try to keep characters at their existing seats
    for (const ch of this.characters.values()) {
      if (ch.seatId && this.seats.has(ch.seatId)) {
        const seat = this.seats.get(ch.seatId)!
        if (!seat.assigned) {
          seat.assigned = true
          // Snap character to seat position
          ch.tileCol = seat.seatCol
          ch.tileRow = seat.seatRow
          const cx = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
          const cy = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
          ch.x = cx
          ch.y = cy
          ch.dir = seat.facingDir
          ch.isSeated = true
          continue
        }
      }
      ch.seatId = null // will be reassigned below
    }

    // Second pass: assign remaining characters to free seats
    for (const ch of this.characters.values()) {
      if (ch.seatId) continue
      const seatId = this.findFreeSeat()
      if (seatId) {
        this.seats.get(seatId)!.assigned = true
        ch.seatId = seatId
        const seat = this.seats.get(seatId)!
        ch.tileCol = seat.seatCol
        ch.tileRow = seat.seatRow
        ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
        ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
        ch.dir = seat.facingDir
        ch.isSeated = true
      }
    }

    // Relocate any characters that ended up outside bounds or on non-walkable tiles
    for (const ch of this.characters.values()) {
      if (ch.seatId) continue // seated characters are fine
      if (ch.tileCol < 0 || ch.tileCol >= layout.cols || ch.tileRow < 0 || ch.tileRow >= layout.rows) {
        this.relocateCharacterToWalkable(ch)
      }
    }
  }

  /** Move a character to a random walkable tile */
  private relocateCharacterToWalkable(ch: Character): void {
    if (this.walkableTiles.length === 0) return
    const spawn = this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)]
    ch.tileCol = spawn.col
    ch.tileRow = spawn.row
    ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2
    ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2
    ch.path = []
    ch.moveProgress = 0
  }

  getLayout(): OfficeLayout {
    return this.layout
  }

  /**
   * Pathfind a character to their seat using the approach point.
   * If an approach point exists, pathfind to the approach point (walkable tile).
   * The character will be snapped to the seat tile on arrival (handled in characters.ts).
   * Returns the path (empty if already at approach point or no path found).
   */
  private pathfindToSeat(ch: Character, seat: Seat, occupiedTiles?: Set<string>): Array<{ col: number; row: number }> {
    if (seat.approachCol != null && seat.approachRow != null) {
      // Approach-point-based pathfinding — target is always a walkable tile
      if (ch.tileCol === seat.approachCol && ch.tileRow === seat.approachRow) {
        return [] // Already at approach point
      }
      return findPath(ch.tileCol, ch.tileRow, seat.approachCol, seat.approachRow, this.tileMap, this.blockedTiles, occupiedTiles)
    }
    // Fallback for layouts without approach points: use legacy withOwnSeatUnblocked
    return this.withOwnSeatUnblocked(ch, () =>
      findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles, occupiedTiles)
    )
  }

  /** Get the blocked-tile key for a character's own seat, or null */
  private ownSeatKey(ch: Character): string | null {
    if (!ch.seatId) return null
    const seat = this.seats.get(ch.seatId)
    if (!seat) return null
    return `${seat.seatCol},${seat.seatRow}`
  }

  /** Temporarily unblock a character's own seat + minimal corridor to reach it.
   *  LEGACY FALLBACK — only used for layouts without pre-computed approach points. */
  private withOwnSeatUnblocked<T>(ch: Character, fn: () => T): T {
    if (!ch.seatId) return fn()
    const seat = this.seats.get(ch.seatId)
    if (!seat) return fn()

    const { seatCol: c, seatRow: r } = seat
    const keysToUnblock: string[] = [`${c},${r}`] // always unblock the seat itself

    const neighbors = [
      { key: `${c - 1},${r}`, adjTiles: [{ c: c - 2, r }, { c: c - 1, r: r - 1 }, { c: c - 1, r: r + 1 }] },
      { key: `${c + 1},${r}`, adjTiles: [{ c: c + 2, r }, { c: c + 1, r: r - 1 }, { c: c + 1, r: r + 1 }] },
      { key: `${c},${r - 1}`, adjTiles: [{ c, r: r - 2 }, { c: c - 1, r: r - 1 }, { c: c + 1, r: r - 1 }] },
      { key: `${c},${r + 1}`, adjTiles: [{ c, r: r + 2 }, { c: c - 1, r: r + 1 }, { c: c + 1, r: r + 1 }] },
    ]
    for (const n of neighbors) {
      if (!this.blockedTiles.has(n.key)) {
        break
      }
      const hasAccess = n.adjTiles.some(t =>
        isWalkable(t.c, t.r, this.tileMap, this.blockedTiles)
      )
      if (hasAccess) {
        keysToUnblock.push(n.key)
        break
      }
    }

    if (keysToUnblock.length === 1) {
      keysToUnblock.push(
        `${c - 1},${r}`, `${c + 1},${r}`,
        `${c},${r - 1}`, `${c},${r + 1}`,
      )
    }

    const wasBlocked: string[] = []
    for (const k of keysToUnblock) {
      if (this.blockedTiles.delete(k)) wasBlocked.push(k)
    }
    const result = fn()
    for (const k of wasBlocked) {
      this.blockedTiles.add(k)
    }
    return result
  }

  private findFreeSeat(): string | null {
    for (const [uid, seat] of this.seats) {
      if (!seat.assigned) return uid
    }
    return null
  }

  /**
   * Pick a diverse palette for a new agent based on currently active agents.
   * First 6 agents each get a unique skin (random order). Beyond 6, skins
   * repeat in balanced rounds with a random hue shift (≥45°).
   */
  private pickDiversePalette(): { palette: number; hueShift: number } {
    // Count how many non-sub-agents use each base palette (0-5)
    const counts = new Array(getCharacterTemplateCount()).fill(0) as number[]
    for (const ch of this.characters.values()) {
      if (ch.isSubagent) continue
      counts[ch.palette]++
    }
    const minCount = Math.min(...counts)
    // Available = palettes at the minimum count (least used)
    const available: number[] = []
    for (let i = 0; i < getCharacterTemplateCount(); i++) {
      if (counts[i] === minCount) available.push(i)
    }
    const palette = available[Math.floor(Math.random() * available.length)]
    // First round (minCount === 0): no hue shift. Subsequent rounds: random ≥45°.
    let hueShift = 0
    if (minCount > 0) {
      hueShift = HUE_SHIFT_MIN_DEG + Math.floor(Math.random() * HUE_SHIFT_RANGE_DEG)
    }
    return { palette, hueShift }
  }

  addAgent(id: number, preferredPalette?: number, preferredHueShift?: number, preferredSeatId?: string, skipSpawnEffect?: boolean, folderName?: string): void {
    if (this.characters.has(id)) return

    let palette: number
    let hueShift: number
    if (preferredPalette !== undefined) {
      palette = preferredPalette
      hueShift = preferredHueShift ?? 0
    } else {
      const pick = this.pickDiversePalette()
      palette = pick.palette
      hueShift = pick.hueShift
    }

    // Try preferred seat first, then any free seat
    let seatId: string | null = null
    if (preferredSeatId && this.seats.has(preferredSeatId)) {
      const seat = this.seats.get(preferredSeatId)!
      if (!seat.assigned) {
        seatId = preferredSeatId
      }
    }
    if (!seatId) {
      seatId = this.findFreeSeat()
    }

    let ch: Character
    if (seatId) {
      const seat = this.seats.get(seatId)!
      seat.assigned = true
      ch = createCharacter(id, palette, seatId, seat, hueShift)
    } else {
      // No seats — spawn at random walkable tile
      const spawn = this.walkableTiles.length > 0
        ? this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)]
        : { col: 1, row: 1 }
      ch = createCharacter(id, palette, null, null, hueShift)
      ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2
      ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2
      ch.tileCol = spawn.col
      ch.tileRow = spawn.row
    }

    if (folderName) {
      ch.folderName = folderName
    }
    if (!skipSpawnEffect) {
      ch.matrixEffect = 'spawn'
      ch.matrixEffectTimer = 0
      ch.matrixEffectSeeds = matrixEffectSeeds()
    }
    this.characters.set(id, ch)
  }

  removeAgent(id: number): void {
    const ch = this.characters.get(id)
    if (!ch) return
    if (ch.matrixEffect === 'despawn') return // already despawning
    // Free seat and clear selection immediately
    if (ch.seatId) {
      const seat = this.seats.get(ch.seatId)
      if (seat) seat.assigned = false
    }
    if (this.selectedAgentId === id) this.selectedAgentId = null
    if (this.cameraFollowId === id) this.cameraFollowId = null
    // Start despawn animation instead of immediate delete
    ch.matrixEffect = 'despawn'
    ch.matrixEffectTimer = 0
    ch.matrixEffectSeeds = matrixEffectSeeds()
    ch.bubbleType = null
  }

  /** Find seat uid at a given tile position, or null */
  getSeatAtTile(col: number, row: number): string | null {
    for (const [uid, seat] of this.seats) {
      if (seat.seatCol === col && seat.seatRow === row) return uid
    }
    return null
  }

  /** Reassign an agent from their current seat to a new seat */
  reassignSeat(agentId: number, seatId: string): void {
    const ch = this.characters.get(agentId)
    if (!ch) return
    // Unassign old seat
    if (ch.seatId) {
      const old = this.seats.get(ch.seatId)
      if (old) old.assigned = false
    }
    // Assign new seat
    const seat = this.seats.get(seatId)
    if (!seat || seat.assigned) return
    seat.assigned = true
    ch.seatId = seatId
    // Pathfind to seat via approach point
    const path = this.pathfindToSeat(ch, seat, this.occupiedTiles)
    if (path.length > 0) {
      ch.path = path
      ch.moveProgress = 0
      ch.state = CharacterState.WALK
      ch.frame = 0
      ch.frameTimer = 0
    } else {
      // Already at approach point or no path — snap to seat and sit down
      ch.tileCol = seat.seatCol
      ch.tileRow = seat.seatRow
      ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
      ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
      ch.state = CharacterState.TYPE
      ch.dir = seat.facingDir
      ch.isSeated = true
      ch.frame = 0
      ch.frameTimer = 0
      if (!ch.isActive) {
        ch.seatTimer = INACTIVE_SEAT_TIMER_MIN_SEC + Math.random() * INACTIVE_SEAT_TIMER_RANGE_SEC
      }
    }
  }

  /** Send an agent back to their currently assigned seat */
  sendToSeat(agentId: number): void {
    const ch = this.characters.get(agentId)
    if (!ch || !ch.seatId) return
    const seat = this.seats.get(ch.seatId)
    if (!seat) return
    const path = this.pathfindToSeat(ch, seat, this.occupiedTiles)
    if (path.length > 0) {
      ch.path = path
      ch.moveProgress = 0
      ch.state = CharacterState.WALK
      ch.frame = 0
      ch.frameTimer = 0
    } else {
      // Already at approach point or seat — snap to seat and sit down
      ch.tileCol = seat.seatCol
      ch.tileRow = seat.seatRow
      ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2
      ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2
      ch.state = CharacterState.TYPE
      ch.dir = seat.facingDir
      ch.isSeated = true
      ch.frame = 0
      ch.frameTimer = 0
      if (!ch.isActive) {
        ch.seatTimer = INACTIVE_SEAT_TIMER_MIN_SEC + Math.random() * INACTIVE_SEAT_TIMER_RANGE_SEC
      }
    }
  }

  /**
   * "Stand up" from a seat — teleport to the nearest walkable tile.
   * Used when the player is at a surrounded desk and wants to move.
   * Returns true if the character was moved.
   */
  standUpFromSeat(agentId: number): boolean {
    const ch = this.characters.get(agentId)
    if (!ch) return false
    // Only teleport if completely surrounded (no adjacent walkable tile)
    const adjDirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }]
    for (const d of adjDirs) {
      if (isWalkable(ch.tileCol + d.dc, ch.tileRow + d.dr, this.tileMap, this.blockedTiles)) {
        return false // Has walkable neighbor, normal movement should work
      }
    }
    // BFS outward from current tile to find nearest walkable tile
    const key = (c: number, r: number) => `${c},${r}`
    const visited = new Set<string>()
    visited.add(key(ch.tileCol, ch.tileRow))
    const queue: Array<{ col: number; row: number }> = [{ col: ch.tileCol, row: ch.tileRow }]
    const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }]
    while (queue.length > 0) {
      const curr = queue.shift()!
      for (const d of dirs) {
        const nc = curr.col + d.dc
        const nr = curr.row + d.dr
        const nk = key(nc, nr)
        if (visited.has(nk)) continue
        visited.add(nk)
        if (isWalkable(nc, nr, this.tileMap, this.blockedTiles)) {
          // Only accept if the tile is connected (has at least one walkable neighbor)
          // to avoid teleporting to isolated walkable islands
          const hasNeighbor = dirs.some(d2 =>
            isWalkable(nc + d2.dc, nr + d2.dr, this.tileMap, this.blockedTiles)
          )
          if (hasNeighbor) {
            ch.tileCol = nc
            ch.tileRow = nr
            ch.x = nc * TILE_SIZE + TILE_SIZE / 2
            ch.y = nr * TILE_SIZE + TILE_SIZE / 2
            ch.path = []
            ch.moveProgress = 0
            ch.state = CharacterState.IDLE
            ch.frame = 0
            ch.frameTimer = 0
            return true
          }
        }
        // Continue BFS through blocked tiles to find walkable ones
        const rows = this.tileMap.length
        const cols = rows > 0 ? this.tileMap[0].length : 0
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
          queue.push({ col: nc, row: nr })
        }
      }
    }
    return false
  }

  /** Walk an agent to an arbitrary walkable tile (right-click command) */
  walkToTile(agentId: number, col: number, row: number): boolean {
    const ch = this.characters.get(agentId)
    if (!ch || ch.isSubagent) return false

    // Check if target is the character's own seat — use approach point
    const seatKey = this.ownSeatKey(ch)
    if (seatKey && seatKey === `${col},${row}`) {
      const seat = this.seats.get(ch.seatId!)!
      const path = this.pathfindToSeat(ch, seat, this.occupiedTiles)
      if (path.length === 0) {
        if (ch.isPlayerControlled && (ch.tileCol !== col || ch.tileRow !== row)) {
          this.collisionFlash = { col, row, timer: COLLISION_FLASH_DURATION_SEC }
        }
        return false
      }
      ch.path = path
      ch.moveProgress = 0
      ch.state = CharacterState.WALK
      ch.frame = 0
      ch.frameTimer = 0
      return true
    }

    if (!isWalkable(col, row, this.tileMap, this.blockedTiles)) {
      if (ch.isPlayerControlled) {
        this.collisionFlash = { col, row, timer: COLLISION_FLASH_DURATION_SEC }
      }
      return false
    }
    const path = findPath(ch.tileCol, ch.tileRow, col, row, this.tileMap, this.blockedTiles, this.occupiedTiles)
    if (path.length === 0) {
      if (ch.isPlayerControlled && (ch.tileCol !== col || ch.tileRow !== row)) {
        this.collisionFlash = { col, row, timer: COLLISION_FLASH_DURATION_SEC }
      }
      return false
    }
    ch.path = path
    ch.moveProgress = 0
    ch.state = CharacterState.WALK
    ch.frame = 0
    ch.frameTimer = 0
    return true
  }

  /** Internal: walk any character (including subagents) to a tile. No player guards. */
  private walkCharacterToTile(ch: Character, col: number, row: number): boolean {
    if (!isWalkable(col, row, this.tileMap, this.blockedTiles)) return false
    const path = findPath(ch.tileCol, ch.tileRow, col, row, this.tileMap, this.blockedTiles, this.occupiedTiles)
    if (path.length === 0) return false
    ch.path = path
    ch.moveProgress = 0
    ch.state = CharacterState.WALK
    ch.frame = 0
    ch.frameTimer = 0
    return true
  }

  /** Create a sub-agent character with the parent's palette. Returns the sub-agent ID. */
  addSubagent(parentAgentId: number, parentToolId: string): number {
    const key = `${parentAgentId}:${parentToolId}`
    if (this.subagentIdMap.has(key)) return this.subagentIdMap.get(key)!

    const id = this.nextSubagentId--
    const parentCh = this.characters.get(parentAgentId)
    const palette = parentCh ? parentCh.palette : 0
    const hueShift = parentCh ? parentCh.hueShift : 0

    // Find the free seat closest to the parent agent
    const parentCol = parentCh ? parentCh.tileCol : 0
    const parentRow = parentCh ? parentCh.tileRow : 0
    const dist = (c: number, r: number) =>
      Math.abs(c - parentCol) + Math.abs(r - parentRow)

    let bestSeatId: string | null = null
    let bestDist = Infinity
    for (const [uid, seat] of this.seats) {
      if (!seat.assigned) {
        const d = dist(seat.seatCol, seat.seatRow)
        if (d < bestDist) {
          bestDist = d
          bestSeatId = uid
        }
      }
    }

    let ch: Character
    if (bestSeatId) {
      const seat = this.seats.get(bestSeatId)!
      seat.assigned = true
      ch = createCharacter(id, palette, bestSeatId, seat, hueShift)
    } else {
      // No seats — spawn at closest walkable tile to parent
      let spawn = { col: 1, row: 1 }
      if (this.walkableTiles.length > 0) {
        let closest = this.walkableTiles[0]
        let closestDist = dist(closest.col, closest.row)
        for (let i = 1; i < this.walkableTiles.length; i++) {
          const d = dist(this.walkableTiles[i].col, this.walkableTiles[i].row)
          if (d < closestDist) {
            closest = this.walkableTiles[i]
            closestDist = d
          }
        }
        spawn = closest
      }
      ch = createCharacter(id, palette, null, null, hueShift)
      ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2
      ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2
      ch.tileCol = spawn.col
      ch.tileRow = spawn.row
    }
    ch.isSubagent = true
    ch.parentAgentId = parentAgentId
    ch.matrixEffect = 'spawn'
    ch.matrixEffectTimer = 0
    ch.matrixEffectSeeds = matrixEffectSeeds()
    this.characters.set(id, ch)

    this.subagentIdMap.set(key, id)
    this.subagentMeta.set(id, { parentAgentId, parentToolId })
    return id
  }

  /** Remove a specific sub-agent character and free its seat */
  removeSubagent(parentAgentId: number, parentToolId: string): void {
    const key = `${parentAgentId}:${parentToolId}`
    const id = this.subagentIdMap.get(key)
    if (id === undefined) return

    const ch = this.characters.get(id)
    if (ch) {
      if (ch.matrixEffect === 'despawn') {
        // Already despawning — just clean up maps
        this.subagentIdMap.delete(key)
        this.subagentMeta.delete(id)
        return
      }
      if (ch.seatId) {
        const seat = this.seats.get(ch.seatId)
        if (seat) seat.assigned = false
      }
      // Start despawn animation — keep character in map for rendering
      ch.matrixEffect = 'despawn'
      ch.matrixEffectTimer = 0
      ch.matrixEffectSeeds = matrixEffectSeeds()
      ch.bubbleType = null
    }
    // Clean up tracking maps immediately so keys don't collide
    this.subagentIdMap.delete(key)
    this.subagentMeta.delete(id)
    if (this.selectedAgentId === id) this.selectedAgentId = null
    if (this.cameraFollowId === id) this.cameraFollowId = null
  }

  /** Remove all sub-agents belonging to a parent agent */
  removeAllSubagents(parentAgentId: number): void {
    const toRemove: string[] = []
    for (const [key, id] of this.subagentIdMap) {
      const meta = this.subagentMeta.get(id)
      if (meta && meta.parentAgentId === parentAgentId) {
        const ch = this.characters.get(id)
        if (ch) {
          if (ch.matrixEffect === 'despawn') {
            // Already despawning — just clean up maps
            this.subagentMeta.delete(id)
            toRemove.push(key)
            continue
          }
          if (ch.seatId) {
            const seat = this.seats.get(ch.seatId)
            if (seat) seat.assigned = false
          }
          // Start despawn animation
          ch.matrixEffect = 'despawn'
          ch.matrixEffectTimer = 0
          ch.matrixEffectSeeds = matrixEffectSeeds()
          ch.bubbleType = null
        }
        this.subagentMeta.delete(id)
        if (this.selectedAgentId === id) this.selectedAgentId = null
        if (this.cameraFollowId === id) this.cameraFollowId = null
        toRemove.push(key)
      }
    }
    for (const key of toRemove) {
      this.subagentIdMap.delete(key)
    }
  }

  /** Look up the sub-agent character ID for a given parent+toolId, or null */
  getSubagentId(parentAgentId: number, parentToolId: string): number | null {
    return this.subagentIdMap.get(`${parentAgentId}:${parentToolId}`) ?? null
  }

  setAgentActive(id: number, active: boolean): void {
    const ch = this.characters.get(id)
    if (ch) {
      ch.isActive = active
      if (!active) {
        // Sentinel -1: signals turn just ended, skip next seat rest timer.
        // Prevents the WALK handler from setting a 2-4 min rest on arrival.
        ch.seatTimer = -1
        ch.path = []
        ch.moveProgress = 0
      }
      this.rebuildFurnitureInstances()
    }
  }

  /** Set agent status and apply immediately. */
  setAgentStatus(id: number, status: AgentStatus): void {
    const ch = this.characters.get(id)
    if (!ch) return
    if (status === ch.agentStatus) return
    this.applyAgentStatus(ch, status)
  }

  /** Update session context data on a character (task name, tool name) */
  setAgentSessionInfo(id: number, info: SessionInfo): void {
    const ch = this.characters.get(id)
    if (!ch) return
    ch.sessionInfo = info
    // Recompute idle tier whenever session info changes
    ch.idleTier = computeIdleTier(info.lastActivityMs)
  }

  /**
   * Apply a committed status change to a character. This is the internal
   * method called when the debounce timer expires (or on immediate application).
   */
  private applyAgentStatus(ch: Character, status: AgentStatus): void {
    const previousStatus = ch.agentStatus
    ch.agentStatus = status
    ch.hasError = false

    // Derive isActive from status (offline treated like idle — not active)
    const wasActive = ch.isActive
    const nowActive = status === 'working'
    ch.isActive = nowActive

    if (!nowActive && wasActive) {
      // Went inactive — use the sentinel to skip long seat rest
      ch.seatTimer = -1
      // Don't clear path if agent is en route to a meeting/review seat
      if (!ch.routingZone) {
        ch.path = []
        ch.moveProgress = 0
      }

      // Start linger timer — agent sits idle at desk before wandering
      ch.lingerTimer = LINGER_MIN_SEC + Math.random() * (LINGER_MAX_SEC - LINGER_MIN_SEC)
    }

    // Route agent to contextually appropriate room (skip player-controlled)
    if (!ch.isPlayerControlled && !ch.isSubagent) {
      this.routeAgent(ch, status)
    }

    this.rebuildFurnitureInstances()
  }

  /**
   * Route an agent to the appropriate room zone based on status and session context.
   * Called after status changes are committed.
   */
  private routeAgent(ch: Character, status: AgentStatus): void {
    // If lingering after task completion, don't route yet (update() handles it)
    if (ch.lingerTimer > 0) return
    // If in a brainstorm meeting or review, don't override — those systems manage routing
    if (ch.routingZone === 'meeting' || ch.routingZone === 'review') return

    // Idle/offline agents with recent activity stay at desk — don't route to break room
    if (status === 'idle' || status === 'offline') {
      const lastMs = ch.sessionInfo.lastActivityMs
      if (lastMs && Date.now() - lastMs < IDLE_TIER_MODERATE_MS) {
        // Send to seat if not already there
        ch.routingZone = null
        if (ch.seatId) {
          const seat = this.seats.get(ch.seatId)
          if (seat && (ch.tileCol !== seat.seatCol || ch.tileRow !== seat.seatRow)) {
            this.sendToSeat(ch.id)
          }
        }
        return
      }
    }

    const result = chooseDestination(ch, status, ch.sessionInfo, this.seats)

    if (!result) {
      // null means stay put or go to desk
      if (status === 'working') {
        // Working at desk — send to seat
        ch.routingZone = null
        if (ch.seatId) {
          const seat = this.seats.get(ch.seatId)
          if (seat && (ch.tileCol !== seat.seatCol || ch.tileRow !== seat.seatRow)) {
            this.sendToSeat(ch.id)
          }
        }
      }
      return
    }

    ch.routingZone = result.zoneId
    this.walkToTile(ch.id, result.waypoint.col, result.waypoint.row)
  }

  /**
   * Pick a wander destination for an idle character.
   * 60% chance: walk to an available interaction point (furniture activity).
   * 40% chance: walk to a random walkable tile.
   * Returns the destination info, or null if no destination is available.
   */
  pickWanderDestination(ch: Character): { col: number; row: number; interactionPoint?: InteractionPoint; isSecondary?: boolean } | null {
    const roll = Math.random()

    // --- 85% furniture interaction point ---
    if (roll < 0.85) {
      const result = getAvailableInteractionPoint(this.occupiedPoints)
      if (result) {
        const { point, isSecondary } = result
        const pointZoneId = point.zoneId as RoomZoneId
        if (!(pointZoneId in ROOM_ZONES) || isAgentAllowedInZone(ch, pointZoneId, this.seats)) {
          const col = isSecondary && point.tileX2 != null ? point.tileX2 : point.tileX
          const row = isSecondary && point.tileY2 != null ? point.tileY2 : point.tileY
          return { col, row, interactionPoint: point, isSecondary }
        }
      }
      // Furniture unavailable — fall through to social approach
    }

    // --- 15% social approach: walk toward another idle agent ---
    {
      const idleAgents: Character[] = []
      for (const other of this.characters.values()) {
        if (other.id === ch.id) continue
        if (other.isPlayerControlled || other.isActive) continue
        if (other.agentStatus === 'working') continue
        if (other.matrixEffect) continue
        // Must be idle or in a low-activity state (not walking to seat)
        if (other.state === CharacterState.IDLE || other.state === CharacterState.ACTIVITY) {
          idleAgents.push(other)
        }
      }

      if (idleAgents.length > 0) {
        // Pick a random idle agent to approach
        const target = idleAgents[Math.floor(Math.random() * idleAgents.length)]
        // Find a walkable adjacent tile next to the target
        const adjDirs = [
          { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
          { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
        ]
        // Shuffle so we don't always pick the same direction
        for (let i = adjDirs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          const tmp = adjDirs[i]
          adjDirs[i] = adjDirs[j]
          adjDirs[j] = tmp
        }
        for (const d of adjDirs) {
          const ac = target.tileCol + d.dc
          const ar = target.tileRow + d.dr
          if (isWalkable(ac, ar, this.tileMap, this.blockedTiles)) {
            // Check zone access
            const z = getZoneAt(ac, ar)
            if (z && !isAgentAllowedInZone(ch, z, this.seats)) continue
            return { col: ac, row: ar }
          }
        }
      }
    }

    // --- Fallback: zone waypoints (break-room or kitchen), never random tiles ---
    const fallbackZones: RoomZoneId[] = ['break-room', 'kitchen']
    const allowedZones = fallbackZones.filter((z) => isAgentAllowedInZone(ch, z, this.seats))
    if (allowedZones.length > 0) {
      const zoneId = allowedZones[Math.floor(Math.random() * allowedZones.length)]
      const waypoints = ROOM_ZONES[zoneId].waypoints
      if (waypoints.length > 0) {
        const wp = waypoints[Math.floor(Math.random() * waypoints.length)]
        return { col: wp.col, row: wp.row }
      }
    }

    return null
  }

  /** Set the busy flag on an agent (multiple concurrent sessions) */
  setAgentBusy(id: number, busy: boolean): void {
    const ch = this.characters.get(id)
    if (ch) {
      ch.isBusy = busy
    }
  }

  /**
   * Set active review pairs (reviewerId -> builderId).
   * Routes reviewers to a walkable tile adjacent to the builder's seat.
   * When a pair is removed, the reviewer returns to normal routing.
   */
  setReviewPairs(pairs: Map<number, number>): void {
    // Detect removed pairs — return those reviewers to normal routing
    for (const [reviewerId] of this.reviewPairs) {
      if (!pairs.has(reviewerId)) {
        const ch = this.characters.get(reviewerId)
        if (ch && !ch.isPlayerControlled && ch.routingZone === 'review') {
          ch.routingZone = null
          this.routeAgent(ch, ch.agentStatus)
        }
      }
    }

    // Detect new pairs — route reviewer to builder's desk area
    for (const [reviewerId, builderId] of pairs) {
      if (!this.reviewPairs.has(reviewerId) || this.reviewPairs.get(reviewerId) !== builderId) {
        const reviewerCh = this.characters.get(reviewerId)
        const builderCh = this.characters.get(builderId)
        if (!reviewerCh || !builderCh || reviewerCh.isPlayerControlled) continue
        // Skip if reviewer is in a brainstorm meeting (higher priority)
        if (reviewerCh.routingZone === 'meeting') continue

        // Stand up from desk if surrounded by blocked tiles
        this.standUpFromSeat(reviewerId)

        // Find builder's seat tile
        const builderSeat = builderCh.seatId ? this.seats.get(builderCh.seatId) : null
        const targetCol = builderSeat ? builderSeat.seatCol : builderCh.tileCol
        const targetRow = builderSeat ? builderSeat.seatRow : builderCh.tileRow

        // Find a walkable adjacent tile (4 cardinal directions)
        const adjDirs = [
          { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
          { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
        ]
        let walked = false
        for (const d of adjDirs) {
          const ac = targetCol + d.dc
          const ar = targetRow + d.dr
          if (isWalkable(ac, ar, this.tileMap, this.blockedTiles)) {
            walked = this.walkToTile(reviewerCh.id, ac, ar)
            if (walked) break
          }
        }

        // Fallback: BFS for nearest walkable tile within 3 tiles
        if (!walked) {
          const visited = new Set<string>()
          const queue: Array<{ col: number; row: number; dist: number }> = []
          visited.add(`${targetCol},${targetRow}`)
          queue.push({ col: targetCol, row: targetRow, dist: 0 })
          while (queue.length > 0) {
            const curr = queue.shift()!
            if (curr.dist > 3) break
            for (const d of adjDirs) {
              const nc = curr.col + d.dc
              const nr = curr.row + d.dr
              const key = `${nc},${nr}`
              if (visited.has(key)) continue
              visited.add(key)
              if (isWalkable(nc, nr, this.tileMap, this.blockedTiles)) {
                walked = this.walkToTile(reviewerCh.id, nc, nr)
                if (walked) break
              }
              if (curr.dist + 1 < 3) {
                const rows = this.tileMap.length
                const cols = rows > 0 ? this.tileMap[0].length : 0
                if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                  queue.push({ col: nc, row: nr, dist: curr.dist + 1 })
                }
              }
            }
            if (walked) break
          }
        }
        // Only set routing zone if we actually managed to walk
        if (walked) {
          reviewerCh.routingZone = 'review'
        }
      }
    }

    this.reviewPairs = pairs
  }

  /** Update session-derived parent→children map for meeting room detection */
  setSubagentsByParent(map: Map<number, number[]>): void {
    this.sessionSubagentsByParent = map
  }

  /** Rebuild furniture instances with auto-state applied (active agents turn electronics ON) */
  rebuildFurnitureInstances(): void {
    // Collect tiles where active agents face desks
    const autoOnTiles = new Set<string>()
    for (const ch of this.characters.values()) {
      if (!ch.isActive || !ch.seatId) continue
      const seat = this.seats.get(ch.seatId)
      if (!seat) continue
      // Find the desk tile(s) the agent faces from their seat
      const dCol = seat.facingDir === Direction.RIGHT ? 1 : seat.facingDir === Direction.LEFT ? -1 : 0
      const dRow = seat.facingDir === Direction.DOWN ? 1 : seat.facingDir === Direction.UP ? -1 : 0
      // Check tiles in the facing direction (desk could be 1-3 tiles deep)
      for (let d = 1; d <= AUTO_ON_FACING_DEPTH; d++) {
        const tileCol = seat.seatCol + dCol * d
        const tileRow = seat.seatRow + dRow * d
        autoOnTiles.add(`${tileCol},${tileRow}`)
      }
      // Also check tiles to the sides of the facing direction (desks can be wide)
      for (let d = 1; d <= AUTO_ON_SIDE_DEPTH; d++) {
        const baseCol = seat.seatCol + dCol * d
        const baseRow = seat.seatRow + dRow * d
        if (dCol !== 0) {
          // Facing left/right: check tiles above and below
          autoOnTiles.add(`${baseCol},${baseRow - 1}`)
          autoOnTiles.add(`${baseCol},${baseRow + 1}`)
        } else {
          // Facing up/down: check tiles left and right
          autoOnTiles.add(`${baseCol - 1},${baseRow}`)
          autoOnTiles.add(`${baseCol + 1},${baseRow}`)
        }
      }
    }

    if (autoOnTiles.size === 0) {
      this.furniture = layoutToFurnitureInstances(this.layout.furniture)
      return
    }

    // Build modified furniture list with auto-state applied
    const modifiedFurniture: PlacedFurniture[] = this.layout.furniture.map((item) => {
      const entry = getCatalogEntry(item.type)
      if (!entry) return item
      // Check if any tile of this furniture overlaps an auto-on tile
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          if (autoOnTiles.has(`${item.col + dc},${item.row + dr}`)) {
            const onType = getOnStateType(item.type)
            if (onType !== item.type) {
              return { ...item, type: onType }
            }
            return item
          }
        }
      }
      return item
    })

    this.furniture = layoutToFurnitureInstances(modifiedFurniture)
  }

  setAgentTool(id: number, tool: string | null): void {
    const ch = this.characters.get(id)
    if (ch) {
      ch.currentTool = tool
    }
  }

  showPermissionBubble(id: number): void {
    const ch = this.characters.get(id)
    if (ch) {
      ch.bubbleType = 'permission'
      ch.bubbleTimer = 0
    }
  }

  clearPermissionBubble(id: number): void {
    const ch = this.characters.get(id)
    if (ch && ch.bubbleType === 'permission') {
      ch.bubbleType = null
      ch.bubbleTimer = 0
    }
  }

  showWaitingBubble(id: number): void {
    const ch = this.characters.get(id)
    if (ch) {
      ch.bubbleType = 'waiting'
      ch.bubbleTimer = WAITING_BUBBLE_DURATION_SEC
    }
  }

  /** Dismiss bubble on click — permission: instant, waiting: quick fade */
  dismissBubble(id: number): void {
    const ch = this.characters.get(id)
    if (!ch || !ch.bubbleType) return
    if (ch.bubbleType === 'permission') {
      ch.bubbleType = null
      ch.bubbleTimer = 0
    } else if (ch.bubbleType === 'waiting') {
      // Trigger immediate fade (0.3s remaining)
      ch.bubbleTimer = Math.min(ch.bubbleTimer, DISMISS_BUBBLE_FAST_FADE_SEC)
    }
  }

  update(dt: number): void {
    // Tick collision flash timer
    if (this.collisionFlash) {
      this.collisionFlash.timer -= dt
      if (this.collisionFlash.timer <= 0) {
        this.collisionFlash = null
      }
    }

    // Tick per-character timers
    for (const ch of this.characters.values()) {
      // Tick linger timer — when it expires, route the agent to their destination
      if (ch.lingerTimer > 0) {
        ch.lingerTimer -= dt
        if (ch.lingerTimer <= 0) {
          ch.lingerTimer = 0
          // Now route the agent if they're still idle/offline
          if (!ch.isPlayerControlled && !ch.isSubagent) {
            this.routeAgent(ch, ch.agentStatus)
          }
        }
      }
    }

    // ── Brainstorm meeting detection ──────────────────────────
    // Merge two sources: dynamically-spawned subagent characters (subagentMeta)
    // and session-derived parent→child relationships (sessionSubagentsByParent)
    const activeSubsPerParent = new Map<number, number[]>()

    // Source 1: Dynamic subagent characters (from addSubagent)
    for (const [subId, meta] of this.subagentMeta) {
      const subCh = this.characters.get(subId)
      if (!subCh || subCh.matrixEffect === 'despawn') continue
      const list = activeSubsPerParent.get(meta.parentAgentId)
      if (list) {
        list.push(subId)
      } else {
        activeSubsPerParent.set(meta.parentAgentId, [subId])
      }
    }

    // Source 2: Session-derived interactions (existing office agents acting as subagents)
    for (const [parentId, childIds] of this.sessionSubagentsByParent) {
      const existing = activeSubsPerParent.get(parentId) ?? []
      for (const childId of childIds) {
        if (!existing.includes(childId) && this.characters.has(childId)) {
          existing.push(childId)
        }
      }
      if (existing.length > 0) activeSubsPerParent.set(parentId, existing)
    }

    // Collect all unique agents across all qualifying parent groups
    const meetingCandidates = new Set<number>()
    for (const [parentId, subIds] of activeSubsPerParent) {
      if (subIds.length >= MEETING_SUBAGENT_THRESHOLD) {
        meetingCandidates.add(parentId)
        for (const id of subIds) meetingCandidates.add(id)
      }
    }
    const shouldMeet = meetingCandidates.size >= MEETING_SUBAGENT_THRESHOLD

    if (shouldMeet && !this.meetingActive) {
      // ── ENTER meeting ──
      this.meetingActive = true

      // Collect reachable conference room seats
      const meetingBounds = { minCol: 23, maxCol: 29, minRow: 0, maxRow: 11 }
      const adjDirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }]
      const confSeats: string[] = []
      for (const [seatId, seat] of this.seats) {
        if (seat.seatCol >= meetingBounds.minCol && seat.seatCol <= meetingBounds.maxCol &&
            seat.seatRow >= meetingBounds.minRow && seat.seatRow <= meetingBounds.maxRow) {
          const hasAccess = adjDirs.some(d =>
            isWalkable(seat.seatCol + d.dc, seat.seatRow + d.dr, this.tileMap, this.blockedTiles)
          )
          if (hasAccess) confSeats.push(seatId)
        }
      }
      let seatIdx = 0

      for (const agentId of meetingCandidates) {
        const ch = this.characters.get(agentId)
        if (!ch || ch.isPlayerControlled) continue
        ch.routingZone = 'meeting'
        this.standUpFromSeat(agentId)
        if (seatIdx < confSeats.length) {
          const confSeatId = confSeats[seatIdx++]
          const confSeat = this.seats.get(confSeatId)
          if (confSeat) {
            const deskSeatId = ch.seatId
            if (!ch.originalSeatId) ch.originalSeatId = deskSeatId
            ch.seatId = confSeatId
            const path = this.pathfindToSeat(ch, confSeat, this.occupiedTiles)
            if (path.length > 0) {
              ch.path = path
              ch.moveProgress = 0
              ch.state = CharacterState.WALK
              ch.frame = 0
              ch.frameTimer = 0
            }
          }
        } else {
          const dest = pickWaypoint('meeting')
          this.walkCharacterToTile(ch, dest.waypoint.col, dest.waypoint.row)
        }
        this.meetingAgents.add(agentId)
      }
    } else if (shouldMeet && this.meetingActive) {
      // ── ONGOING meeting — route late joiners only ──
      for (const agentId of meetingCandidates) {
        if (this.meetingAgents.has(agentId)) continue
        const ch = this.characters.get(agentId)
        if (!ch || ch.isPlayerControlled || ch.routingZone === 'meeting') continue
        ch.routingZone = 'meeting'
        this.standUpFromSeat(agentId)
        const dest = pickWaypoint('meeting')
        this.walkCharacterToTile(ch, dest.waypoint.col, dest.waypoint.row)
        this.meetingAgents.add(agentId)
      }
    } else if (!shouldMeet && this.meetingActive) {
      // ── EXIT meeting — return all agents to normal ──
      for (const agentId of this.meetingAgents) {
        const ch = this.characters.get(agentId)
        if (ch && ch.routingZone === 'meeting') {
          ch.routingZone = null
          if (ch.originalSeatId) {
            ch.seatId = ch.originalSeatId
            ch.originalSeatId = null
          }
          if (!ch.isSubagent && !ch.isPlayerControlled) {
            this.standUpFromSeat(agentId)
            this.routeAgent(ch, ch.agentStatus)
          }
        }
      }
      this.meetingAgents.clear()
      this.meetingActive = false
    }

    // Build set of tiles occupied by characters (for inter-character collision).
    // Also reserve the DESTINATION tile for walking characters so two characters
    // can't target the same tile simultaneously.
    this.occupiedTiles.clear()
    for (const ch of this.characters.values()) {
      if (!ch.matrixEffect) {
        this.occupiedTiles.add(`${ch.tileCol},${ch.tileRow}`)
        if (ch.state === CharacterState.WALK && ch.path.length > 0) {
          const next = ch.path[0]
          this.occupiedTiles.add(`${next.col},${next.row}`)
        }
      }
    }
    const occupiedTiles = this.occupiedTiles

    const toDelete: number[] = []
    for (const ch of this.characters.values()) {
      // Handle matrix effect animation
      if (ch.matrixEffect) {
        ch.matrixEffectTimer += dt
        if (ch.matrixEffectTimer >= MATRIX_EFFECT_DURATION) {
          if (ch.matrixEffect === 'spawn') {
            // Spawn complete — clear effect, resume normal FSM
            ch.matrixEffect = null
            ch.matrixEffectTimer = 0
            ch.matrixEffectSeeds = []
          } else {
            // Despawn complete — mark for deletion
            toDelete.push(ch.id)
          }
        }
        continue // skip normal FSM while effect is active
      }

      // Remove this character's own tiles from occupied set so it doesn't block itself
      const ownKey = `${ch.tileCol},${ch.tileRow}`
      occupiedTiles.delete(ownKey)
      // Also remove own destination tile reservation
      let ownDestKey: string | null = null
      if (ch.state === CharacterState.WALK && ch.path.length > 0) {
        ownDestKey = `${ch.path[0].col},${ch.path[0].row}`
        occupiedTiles.delete(ownDestKey)
      }

      // Pass heldKeys only for player-controlled characters
      const keys = ch.isPlayerControlled ? this.heldKeys : undefined
      updateCharacter(ch, dt, this.walkableTiles, this.seats, this.tileMap, this.blockedTiles, keys, occupiedTiles)

      // Re-add this character's tile (may have changed if it moved)
      occupiedTiles.add(`${ch.tileCol},${ch.tileRow}`)
      // Re-add destination reservation if still walking
      if (ch.state === CharacterState.WALK && ch.path.length > 0) {
        occupiedTiles.add(`${ch.path[0].col},${ch.path[0].row}`)
      }

      // Consume blockedTile signal from player character → collision flash
      if (ch.isPlayerControlled && ch.blockedTile) {
        this.collisionFlash = { col: ch.blockedTile.col, row: ch.blockedTile.row, timer: COLLISION_FLASH_DURATION_SEC }
        ch.blockedTile = null
      }

      // ── Unified wander destination picking ──────────────────
      // When character FSM signals it needs a wander destination, officeState
      // picks one (60% furniture interaction point, 40% random walkable tile).
      if (ch.needsWanderDestination && !ch.isPlayerControlled) {
        ch.needsWanderDestination = false

        // Retry up to 3 times if pathfinding fails (destination may be unreachable)
        for (let attempt = 0; attempt < 3; attempt++) {
          const dest = this.pickWanderDestination(ch)
          if (!dest) continue

          // Strategy 1: teleport to approach point (if seated at blocked tile)
          // Strategy 2: fallback to withOwnSeatUnblocked (if approach point is in dead-end)
          let path: Array<{ col: number; row: number }> = []
          let teleportCol = ch.tileCol
          let teleportRow = ch.tileRow

          const seat = ch.seatId ? this.seats.get(ch.seatId) : null
          if (seat && ch.isSeated && seat.approachCol != null && seat.approachRow != null) {
            // Try from approach point first
            path = findPath(seat.approachCol, seat.approachRow, dest.col, dest.row, this.tileMap, this.blockedTiles, occupiedTiles)
            if (path.length > 0) {
              teleportCol = seat.approachCol
              teleportRow = seat.approachRow
            } else {
              // Approach point may be in dead-end — try unblocking seat neighbors
              path = this.withOwnSeatUnblocked(ch, () =>
                findPath(ch.tileCol, ch.tileRow, dest.col, dest.row, this.tileMap, this.blockedTiles, occupiedTiles)
              )
            }
          } else {
            // Not seated or no approach point — normal pathfinding
            path = findPath(ch.tileCol, ch.tileRow, dest.col, dest.row, this.tileMap, this.blockedTiles, occupiedTiles)
          }

          if (path.length > 0) {
            // Snap to teleport position if needed
            if (teleportCol !== ch.tileCol || teleportRow !== ch.tileRow) {
              ch.tileCol = teleportCol
              ch.tileRow = teleportRow
              ch.x = teleportCol * TILE_SIZE + TILE_SIZE / 2
              ch.y = teleportRow * TILE_SIZE + TILE_SIZE / 2
              ch.isSeated = false
            }
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
            ch.wanderCount++
            if (dest.interactionPoint) {
              ch.activityTarget = dest.interactionPoint.id
            }
            break // Success — stop retrying
          }
        }
      }

      // ── ACTIVITY state entry: set facing, type, duration, track occupancy ──
      // characters.ts transitions to ACTIVITY when path exhausts with activityTarget set.
      // officeState completes the setup using the interaction point data.
      if (ch.state === CharacterState.ACTIVITY && ch.activityTarget && ch.activityStartTime === 0) {
        const point = INTERACTION_POINTS.find((p) => p.id === ch.activityTarget)
        if (point) {
          // Determine if this agent is the secondary user (at secondary tile)
          const isSecondary = point.capacity === 2 &&
            point.tileX2 != null && point.tileY2 != null &&
            ch.tileCol === point.tileX2 && ch.tileRow === point.tileY2
          ch.dir = isSecondary && point.facing2 != null ? point.facing2 : point.facing
          ch.activityType = point.furnitureType
          ch.activityStartTime = point.activityDurationMin +
            Math.random() * (point.activityDurationMax - point.activityDurationMin)
          // Snap to chair/couch seat if the interaction point has seat coordinates
          if (point.seatCol != null && point.seatRow != null) {
            ch.tileCol = point.seatCol
            ch.tileRow = point.seatRow
            ch.x = point.seatCol * TILE_SIZE + TILE_SIZE / 2
            ch.y = point.seatRow * TILE_SIZE + TILE_SIZE / 2
            ch.isSeated = true
          }
          // Occupancy is tracked by the rebuild loop below (counts all chars with activityTarget).
        } else {
          // Invalid point — revert to idle
          ch.state = CharacterState.IDLE
          ch.activityTarget = null
          ch.activityType = null
          ch.activityStartTime = 0
        }
      }


      // Tick bubble timer for waiting bubbles
      if (ch.bubbleType === 'waiting') {
        ch.bubbleTimer -= dt
        if (ch.bubbleTimer <= 0) {
          ch.bubbleType = null
          ch.bubbleTimer = 0
        }
      }
    }
    // Remove characters that finished despawn
    for (const id of toDelete) {
      this.characters.delete(id)
    }

    // ── Paired activity exit ──────────────────────────────────
    // For capacity-2 points: when one agent exits ACTIVITY, force the partner out too.
    // Collect all currently active point IDs and their agents.
    const activeByPoint = new Map<string, number[]>()
    for (const ch of this.characters.values()) {
      if (ch.state === CharacterState.ACTIVITY && ch.activityTarget) {
        const arr = activeByPoint.get(ch.activityTarget)
        if (arr) arr.push(ch.id)
        else activeByPoint.set(ch.activityTarget, [ch.id])
      }
    }
    // For each capacity-2 point that previously had 2 agents but now has only 1,
    // force the remaining agent out (partner left).
    for (const [pointId, prevOcc] of this.occupiedPoints) {
      if (prevOcc.count < 2) continue // only care about previously-paired
      const currentAgents = activeByPoint.get(pointId)
      if (!currentAgents || currentAgents.length < 2) {
        // Partner left — force remaining agent(s) to exit
        if (currentAgents) {
          for (const agentId of currentAgents) {
            const partner = this.characters.get(agentId)
            if (partner && partner.state === CharacterState.ACTIVITY) {
              partner.activityStartTime = 0 // will exit next frame via characters.ts
            }
          }
        }
      }
    }

    // Rebuild occupiedPoints from characters that are at or heading to interaction points.
    // Includes both ACTIVITY-state (arrived) and WALK-state with activityTarget (en route).
    // This prevents multiple characters from claiming the same capacity-1 point.
    this.occupiedPoints.clear()
    for (const ch of this.characters.values()) {
      if (ch.activityTarget) {
        const occ = this.occupiedPoints.get(ch.activityTarget)
        if (occ) {
          occ.count++
          occ.agentIds.push(ch.id)
        } else {
          this.occupiedPoints.set(ch.activityTarget, { count: 1, agentIds: [ch.id] })
        }
      }
    }

    // ── Social chat: idle agents near each other show random emoji ──
    // Build list of idle (non-active, non-despawning, non-player) characters
    // Only allow chat in social zones (kitchen, break-room) — not workspace
    const CHAT_ZONES: Set<string> = new Set(['kitchen', 'break-room'])
    const idleChars: Character[] = []
    for (const ch of this.characters.values()) {
      if (ch.matrixEffect || ch.isPlayerControlled || ch.isActive) continue
      if (ch.agentStatus === 'working') continue
      const zone = getZoneAt(ch.tileCol, ch.tileRow)
      if (!zone || !CHAT_ZONES.has(zone)) continue
      idleChars.push(ch)
    }

    // Build paired proximity map: agentId → partnerId (closest idle neighbor)
    const nearbyIdlePairs = new Set<number>()
    const chatPartnerMap = new Map<number, number>() // agentId → closest partnerId
    for (let i = 0; i < idleChars.length; i++) {
      for (let j = i + 1; j < idleChars.length; j++) {
        const a = idleChars[i]
        const b = idleChars[j]
        const dist = Math.max(
          Math.abs(a.tileCol - b.tileCol),
          Math.abs(a.tileRow - b.tileRow),
        )
        if (dist <= CHAT_PROXIMITY_TILES) {
          nearbyIdlePairs.add(a.id)
          nearbyIdlePairs.add(b.id)
          // Track pairs (first match wins for each agent)
          if (!chatPartnerMap.has(a.id)) chatPartnerMap.set(a.id, b.id)
          if (!chatPartnerMap.has(b.id)) chatPartnerMap.set(b.id, a.id)
        }
      }
    }

    // ── Chat facing: agents in proximity chat face each other ──
    // Set facing whenever both agents are stopped (not walking). Re-applied
    // each frame so facing stays correct even if one agent was walking on entry.
    for (const [aId, bId] of chatPartnerMap) {
      if (aId > bId) continue // process each pair once
      const a = this.characters.get(aId)
      const b = this.characters.get(bId)
      if (!a || !b) continue
      // Skip if either agent is walking or doing a furniture activity (activity agents face their furniture)
      if (a.state === CharacterState.WALK || b.state === CharacterState.WALK) continue
      if (a.state === CharacterState.ACTIVITY || b.state === CharacterState.ACTIVITY) continue
      const dc = b.tileCol - a.tileCol
      const dr = b.tileRow - a.tileRow
      // A faces toward B
      if (dc > 0) a.dir = Direction.RIGHT
      else if (dc < 0) a.dir = Direction.LEFT
      else if (dr > 0) a.dir = Direction.DOWN
      else a.dir = Direction.UP
      // B faces toward A (opposite)
      if (dc > 0) b.dir = Direction.LEFT
      else if (dc < 0) b.dir = Direction.RIGHT
      else if (dr > 0) b.dir = Direction.UP
      else b.dir = Direction.DOWN
    }

    // Update chat emoji timers for all characters
    for (const ch of this.characters.values()) {
      if (ch.matrixEffect) continue

      // If this character is NOT in a nearby idle pair, clear any chat state
      if (!nearbyIdlePairs.has(ch.id)) {
        if (ch.chatEmoji !== null) {
          ch.chatEmoji = null
          ch.chatEmojiTimer = 0
          ch.chatEmojiVisible = false
        }
        continue
      }

      // Pipeline interactions take priority
      if (ch.isActive || ch.agentStatus === 'working') {
        ch.chatEmoji = null
        ch.chatEmojiTimer = 0
        ch.chatEmojiVisible = false
        continue
      }

      // First proximity meeting: show emoji immediately (no hide delay)
      if (ch.chatEmojiTimer === 0 && !ch.chatEmojiVisible && ch.chatEmoji === null) {
        ch.chatEmoji = CHAT_EMOJI_POOL[Math.floor(Math.random() * CHAT_EMOJI_POOL.length)]
        ch.chatEmojiVisible = true
        ch.chatEmojiTimer = CHAT_SHOW_MIN_SEC + Math.random() * (CHAT_SHOW_MAX_SEC - CHAT_SHOW_MIN_SEC)
        continue
      }

      // Tick the chat timer
      ch.chatEmojiTimer -= dt

      if (ch.chatEmojiTimer <= 0) {
        if (ch.chatEmojiVisible) {
          // Was showing — switch to hidden phase
          ch.chatEmojiVisible = false
          ch.chatEmoji = null
          ch.chatEmojiTimer = CHAT_HIDE_MIN_SEC + Math.random() * (CHAT_HIDE_MAX_SEC - CHAT_HIDE_MIN_SEC)
        } else {
          // Was hidden — pick a random emoji and show it
          ch.chatEmoji = CHAT_EMOJI_POOL[Math.floor(Math.random() * CHAT_EMOJI_POOL.length)]
          ch.chatEmojiVisible = true
          ch.chatEmojiTimer = CHAT_SHOW_MIN_SEC + Math.random() * (CHAT_SHOW_MAX_SEC - CHAT_SHOW_MIN_SEC)

          // ── Chat pair sync: when one agent shows, nudge partner to show soon ──
          const partnerId = chatPartnerMap.get(ch.id)
          if (partnerId != null) {
            const partner = this.characters.get(partnerId)
            if (partner && !partner.chatEmojiVisible && partner.chatEmojiTimer > 0.5) {
              // Shorten partner's hide timer so they show within 0.3-0.5s
              partner.chatEmojiTimer = 0.3 + Math.random() * 0.2
            }
          }
        }
      }
    }

    // Compute proximity to player-controlled character
    let playerCh: Character | null = null
    for (const ch of this.characters.values()) {
      if (ch.isPlayerControlled && !ch.matrixEffect) {
        playerCh = ch
        break
      }
    }
    for (const ch of this.characters.values()) {
      if (ch.isPlayerControlled || ch.matrixEffect) {
        ch.isNearPlayer = false
        continue
      }
      if (!playerCh) {
        ch.isNearPlayer = false
        continue
      }
      // Chebyshev distance (max of abs deltas)
      const dist = Math.max(
        Math.abs(ch.tileCol - playerCh.tileCol),
        Math.abs(ch.tileRow - playerCh.tileRow),
      )
      ch.isNearPlayer = dist <= PROXIMITY_RADIUS_TILES
    }
  }

  getCharacters(): Character[] {
    return Array.from(this.characters.values())
  }

  /** Get the agent (character id) assigned to a given seat, or null */
  getAgentAtSeat(seatId: string): number | null {
    for (const ch of this.characters.values()) {
      if (ch.seatId === seatId && ch.matrixEffect !== 'despawn') return ch.id
    }
    return null
  }

  /** Find which seat is closest to a tile position (within 2 tiles). Returns seat uid or null. */
  findSeatNearTile(col: number, row: number): string | null {
    let bestId: string | null = null
    let bestDist = Infinity
    for (const [uid, seat] of this.seats) {
      const d = Math.abs(seat.seatCol - col) + Math.abs(seat.seatRow - row)
      if (d < bestDist && d <= 2) {
        bestDist = d
        bestId = uid
      }
    }
    return bestId
  }

  /**
   * Identify what interactive element is at a world pixel position.
   * Checks GID layers to determine if there's furniture/desk/server at the tile.
   * Returns a description of the tile content, or null for empty floor.
   */
  getTileInfoAt(worldX: number, worldY: number): { type: 'desk' | 'furniture' | 'conference' | 'wall' | 'whiteboard' | 'bookshelf'; col: number; row: number; seatId?: string; agentId?: number } | null {
    const col = Math.floor(worldX / TILE_SIZE)
    const row = Math.floor(worldY / TILE_SIZE)

    if (col < 0 || col >= this.layout.cols || row < 0 || row >= this.layout.rows) return null

    const idx = row * this.layout.cols + col
    const gidLayers = this.layout.gidLayers
    if (!gidLayers || gidLayers.length === 0) return null

    // Check floor layer for wall
    const floorGid = gidLayers[0]?.[idx] ?? 0
    if (WALL_GIDS.has(floorGid)) return { type: 'wall', col, row }

    // Check furniture_base and furniture_top layers (indices 1-2) for non-zero GIDs
    const furnitureBaseGid = gidLayers[1]?.[idx] ?? 0
    const furnitureTopGid = gidLayers[2]?.[idx] ?? 0
    const decoGid = gidLayers[3]?.[idx] ?? 0

    const hasFurniture = furnitureBaseGid !== 0 || furnitureTopGid !== 0 || decoGid !== 0

    if (!hasFurniture) return null

    // Determine type based on proximity to seats (desks are near seats)
    const nearSeatId = this.findSeatNearTile(col, row)
    if (nearSeatId) {
      const agentId = this.getAgentAtSeat(nearSeatId) ?? undefined
      return { type: 'desk', col, row, seatId: nearSeatId, agentId }
    }

    // Conference table detection (Modern Office desk GIDs 10292-10310)
    if (furnitureBaseGid >= 10292 && furnitureBaseGid <= 10310) {
      return { type: 'conference', col, row }
    }
    if (furnitureTopGid >= 10292 && furnitureTopGid <= 10310) {
      return { type: 'conference', col, row }
    }

    // Meeting room shelf/rack detection (Modern Office shelf GIDs 9999-10018)
    if (furnitureBaseGid >= 9999 && furnitureBaseGid <= 10018) {
      return { type: 'furniture', col, row }
    }

    // Whiteboard / bookshelf detection: check if this tile overlaps a known furniture instance
    for (const fi of this.furniture) {
      if (fi.type === 'whiteboard' || fi.type === 'bookshelf') {
        const fw = fi.sprite[0]?.length ?? 0
        const fh = fi.sprite.length
        const fcMin = Math.floor(fi.x / TILE_SIZE)
        const frMin = Math.floor(fi.y / TILE_SIZE)
        if (col >= fcMin && col < fcMin + Math.ceil(fw / TILE_SIZE) && row >= frMin && row < frMin + Math.ceil(fh / TILE_SIZE)) {
          return { type: fi.type as 'whiteboard' | 'bookshelf', col, row }
        }
      }
    }

    return { type: 'furniture', col, row }
  }

  /**
   * Get all agents currently in a room zone.
   * Returns array of { id, agentName } for characters whose tile position falls within the zone bounds.
   */
  getAgentsInZone(colMin: number, rowMin: number, colMax: number, rowMax: number): Array<{ id: number; agentName: string }> {
    const result: Array<{ id: number; agentName: string }> = []
    for (const ch of this.characters.values()) {
      if (ch.matrixEffect === 'despawn') continue
      if (ch.tileCol >= colMin && ch.tileCol <= colMax && ch.tileRow >= rowMin && ch.tileRow <= rowMax) {
        result.push({ id: ch.id, agentName: '' }) // agentName resolved by caller via AGENT_ID_TO_NAME
      }
    }
    return result
  }

  /** Check if a tile is walkable (for click-to-move vs furniture interception) */
  isTileWalkable(col: number, row: number): boolean {
    return isWalkable(col, row, this.tileMap, this.blockedTiles)
  }

  /** Get character at pixel position (for hit testing). Returns id or null. */
  getCharacterAt(worldX: number, worldY: number): number | null {
    const chars = this.getCharacters().sort((a, b) => b.y - a.y)
    for (const ch of chars) {
      // Skip characters that are despawning
      if (ch.matrixEffect === 'despawn') continue
      // Character sprite is 16x24, anchored bottom-center
      // Apply sitting offset to match visual position
      const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0
      const anchorY = ch.y + sittingOffset
      const left = ch.x - CHARACTER_HIT_HALF_WIDTH * CHARACTER_SPRITE_SCALE
      const right = ch.x + CHARACTER_HIT_HALF_WIDTH * CHARACTER_SPRITE_SCALE
      const top = anchorY - CHARACTER_HIT_HEIGHT * CHARACTER_SPRITE_SCALE
      const bottom = anchorY
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return ch.id
      }
    }
    return null
  }
}
