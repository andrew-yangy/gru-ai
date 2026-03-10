import { CharacterState, Direction, FurnitureActivityType, TILE_SIZE } from '../pixel-types'
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from '../pixel-types'
import type { CharacterSprites } from '../sprites/spriteData'
import { findPath, isWalkable } from '../layout/tileMap'
import {
  WALK_SPEED_PX_PER_SEC,
  WALK_FRAME_DURATION_SEC,
  TYPE_FRAME_DURATION_SEC,
  WANDER_PAUSE_MIN_SEC,
  WANDER_PAUSE_MAX_SEC,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_MOVES_BEFORE_REST_MAX,
  SEAT_REST_MIN_SEC,
  SEAT_REST_MAX_SEC,
  PERSONALITY_FRAME_DURATION_SEC,
  PERSONALITY_FRAME_COUNT,
  PERSONALITY_IDLE_MIN_SEC,
  PERSONALITY_IDLE_MAX_SEC,
  IDLE_TIER_RECENT_MS,
  IDLE_TIER_MODERATE_MS,
  WANDER_IDLE_THRESHOLD_MS,
} from '../constants'
// Personality idle sprites removed — were hand-drawn templates that looked bad next to PNG characters.
// Stubs return null/default so the personality timer logic still works but never overrides the sprite.
const getPersonalityIdleFrame = (_p: number, _d: number, _f: number) => null
const getPersonalityFrameCount = (_p: number) => PERSONALITY_FRAME_COUNT

import type { IdleTier } from '../pixel-types'

/** Compute idle tier from session info. Returns 'long' when no activity data exists. */
export function computeIdleTier(lastActivityMs: number | undefined): IdleTier {
  if (!lastActivityMs) return 'long' // no session data → treat as long idle
  const elapsed = Date.now() - lastActivityMs
  if (elapsed < IDLE_TIER_RECENT_MS) return 'recent'
  if (elapsed < IDLE_TIER_MODERATE_MS) return 'moderate'
  return 'long'
}

/** Check if an idle agent has been idle long enough to wander (> 30 min idle).
 *  Agents idle < 30 min stay at their workspace desk. No session data → wander (demo mode). */
function shouldWander(ch: Character): boolean {
  if (!ch.sessionInfo.lastActivityMs) return true // no session data → wander
  const elapsed = Date.now() - ch.sessionInfo.lastActivityMs
  return elapsed >= WANDER_IDLE_THRESHOLD_MS
}

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'])

export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false
  return READING_TOOLS.has(tool)
}

/** Get the pathfinding target for a seat — approach point if available, else seat tile */
function seatPathTarget(seat: Seat): { col: number; row: number } {
  if (seat.approachCol != null && seat.approachRow != null) {
    return { col: seat.approachCol, row: seat.approachRow }
  }
  return { col: seat.seatCol, row: seat.seatRow }
}

/** Check if character is at the seat or its approach point */
function isAtSeatOrApproach(ch: Character, seat: Seat): boolean {
  if (ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) return true
  if (seat.approachCol != null && seat.approachRow != null &&
      ch.tileCol === seat.approachCol && ch.tileRow === seat.approachRow) return true
  return false
}

/** Snap character to the actual seat tile (instant teleport from approach point) */
function snapToSeat(ch: Character, seat: Seat): void {
  ch.tileCol = seat.seatCol
  ch.tileRow = seat.seatRow
  const center = tileCenter(seat.seatCol, seat.seatRow)
  ch.x = center.x
  ch.y = center.y
  ch.dir = seat.facingDir
  ch.isSeated = true
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  }
}

/** Direction from one tile to an adjacent tile */
function directionBetween(fromCol: number, fromRow: number, toCol: number, toRow: number): Direction {
  const dc = toCol - fromCol
  const dr = toRow - fromRow
  if (dc > 0) return Direction.RIGHT
  if (dc < 0) return Direction.LEFT
  if (dr > 0) return Direction.DOWN
  return Direction.UP
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  const col = seat ? seat.seatCol : 1
  const row = seat ? seat.seatRow : 1
  const center = tileCenter(col, row)
  return {
    id,
    state: CharacterState.IDLE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: seat ? randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC) : 0,
    wanderCount: 0,
    wanderLimit: randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX),
    isActive: false,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    agentStatus: 'idle',
    idleTier: 'long',
    sessionInfo: {},
    pendingStatus: null,
    statusChangeTimer: 0,
    hasError: false,
    isPlayerControlled: false,
    lingerTimer: 0,
    isBusy: false,
    routingZone: null,
    originalSeatId: null,
    personalityTimer: 0,
    personalityFrame: -1,
    personalityThreshold: 8 + Math.random() * 7,
    isNearPlayer: false,
    blockedTile: null,
    needsWanderDestination: false,
    activityTarget: null,
    activityStartTime: 0,
    activityType: null,
    isSeated: seat !== null,
    chatEmoji: null,
    chatEmojiTimer: 0,
    chatEmojiVisible: false,
  }
}

/** Reset personality idle animation state (call when leaving IDLE) */
function resetPersonality(ch: Character): void {
  ch.personalityFrame = -1
  ch.personalityTimer = 0
  ch.personalityThreshold = 8 + Math.random() * 7
}

/** Convert held key set to a directional delta. Last-pressed wins if multiple held. */
function heldKeysToDirection(keys: Set<string>): { dc: number; dr: number } | null {
  // Priority: check each direction. If multiple keys are held, pick based on
  // a fixed priority (most recent key isn't tracked, so use WASD priority order)
  let dc = 0
  let dr = 0
  if (keys.has('w') || keys.has('arrowup')) dr -= 1
  if (keys.has('s') || keys.has('arrowdown')) dr += 1
  if (keys.has('a') || keys.has('arrowleft')) dc -= 1
  if (keys.has('d') || keys.has('arrowright')) dc += 1
  // If both opposing directions are held, they cancel out
  if (dc === 0 && dr === 0) return null
  // If diagonal, prefer the vertical axis (arbitrary but consistent)
  if (dc !== 0 && dr !== 0) dc = 0
  return { dc, dr }
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  heldKeys?: Set<string>,
  occupiedTiles?: Set<string>,
): void {
  ch.frameTimer += dt

  // Player-controlled characters: walk + typing animation, no AI FSM
  if (ch.isPlayerControlled) {
    // TYPE state: animate typing, break out when player presses movement keys
    if (ch.state === CharacterState.TYPE) {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      // If keys pressed, exit TYPE to IDLE so movement can start
      if (heldKeys && heldKeys.size > 0) {
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
      }
      // If no longer working, exit TYPE
      if (ch.agentStatus !== 'working') {
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
      }
      return
    }
    if (ch.state === CharacterState.WALK) {
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }
      if (ch.path.length === 0) {
        // Path exhausted — check if held keys want to continue movement
        const nextDir = heldKeys ? heldKeysToDirection(heldKeys) : null
        if (nextDir) {
          const targetCol = ch.tileCol + nextDir.dc
          const targetRow = ch.tileRow + nextDir.dr
          if (isWalkable(targetCol, targetRow, tileMap, blockedTiles, occupiedTiles)) {
            ch.path = [{ col: targetCol, row: targetRow }]
            ch.moveProgress = 0
            // Continue walking — don't transition to IDLE
          } else {
            // Blocked — stop and signal collision
            ch.blockedTile = { col: targetCol, row: targetRow }
            const center = tileCenter(ch.tileCol, ch.tileRow)
            ch.x = center.x
            ch.y = center.y
            ch.state = CharacterState.IDLE
            ch.frame = 0
            ch.frameTimer = 0
          }
        } else {
          const center = tileCenter(ch.tileCol, ch.tileRow)
          ch.x = center.x
          ch.y = center.y
          ch.state = CharacterState.IDLE
          ch.frame = 0
          ch.frameTimer = 0
        }
        return
      }
      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)
      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt
      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t
      if (ch.moveProgress >= 1) {
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
        // If path is now empty and keys are held, immediately queue next tile
        if (ch.path.length === 0 && heldKeys) {
          const nextDirAfterStep = heldKeysToDirection(heldKeys)
          if (nextDirAfterStep) {
            const targetCol = ch.tileCol + nextDirAfterStep.dc
            const targetRow = ch.tileRow + nextDirAfterStep.dr
            if (isWalkable(targetCol, targetRow, tileMap, blockedTiles, occupiedTiles)) {
              ch.path = [{ col: targetCol, row: targetRow }]
              ch.moveProgress = 0
            }
          }
        }
      }
    } else if (ch.state === CharacterState.IDLE && heldKeys && heldKeys.size > 0) {
      // Idle but keys are held — start moving
      const nextDir = heldKeysToDirection(heldKeys)
      if (nextDir) {
        const targetCol = ch.tileCol + nextDir.dc
        const targetRow = ch.tileRow + nextDir.dr
        if (isWalkable(targetCol, targetRow, tileMap, blockedTiles, occupiedTiles)) {
          ch.path = [{ col: targetCol, row: targetRow }]
          ch.moveProgress = 0
          ch.state = CharacterState.WALK
          ch.frame = 0
          ch.frameTimer = 0
          ch.dir = directionBetween(ch.tileCol, ch.tileRow, targetCol, targetRow)
        } else {
          // Blocked — signal collision for flash feedback
          ch.blockedTile = { col: targetCol, row: targetRow }
        }
      }
    } else if (ch.state === CharacterState.IDLE && ch.agentStatus === 'working' && (!heldKeys || heldKeys.size === 0)) {
      // Player is idle and working — show typing animation
      ch.state = CharacterState.TYPE
      ch.frame = 0
      ch.frameTimer = 0
    }
    return
  }

  switch (ch.state) {
    case CharacterState.TYPE: {
      // Reset personality state if we were in an idle personality animation
      if (ch.personalityFrame >= 0) resetPersonality(ch)

      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      // If no longer active, stand up and start wandering (after seatTimer expires)
      // But stay seated if in a meeting/review zone (not kitchen/break-room)
      if (!ch.isActive && (ch.routingZone !== 'meeting' && ch.routingZone !== 'review')) {
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt
          break
        }
        ch.seatTimer = 0 // clear sentinel
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        ch.wanderCount = 0
        ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
      }
      break
    }

    case CharacterState.IDLE: {
      // Static pose unless personality animation is playing
      if (ch.personalityFrame < 0) {
        ch.frame = 0
      }
      if (ch.seatTimer < 0) ch.seatTimer = 0 // clear turn-end sentinel

      // Personality idle animation (not for player-controlled characters)
      if (!ch.isPlayerControlled) {
        if (ch.personalityFrame === -1) {
          // Not playing — accumulate idle time toward threshold
          ch.personalityTimer += dt
          if (ch.personalityTimer >= ch.personalityThreshold) {
            ch.personalityFrame = 0
            ch.frameTimer = 0
          }
        } else {
          // Playing personality animation — advance frames
          if (ch.frameTimer >= PERSONALITY_FRAME_DURATION_SEC) {
            ch.frameTimer -= PERSONALITY_FRAME_DURATION_SEC
            ch.personalityFrame++
            if (ch.personalityFrame >= getPersonalityFrameCount(ch.palette)) {
              // Animation complete — reset to static idle
              ch.personalityFrame = -1
              ch.personalityTimer = 0
              ch.personalityThreshold = PERSONALITY_IDLE_MIN_SEC + Math.random() * (PERSONALITY_IDLE_MAX_SEC - PERSONALITY_IDLE_MIN_SEC)
              ch.frame = 0
            }
          }
        }
      }

      // If became active, pathfind to seat (via approach point)
      if (ch.isActive) {
        if (!ch.seatId) {
          // No seat assigned — type in place
          ch.state = CharacterState.TYPE
          ch.frame = 0
          ch.frameTimer = 0
          break
        }
        const seat = seats.get(ch.seatId)
        if (seat) {
          const target = seatPathTarget(seat)
          const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles, occupiedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
          } else {
            // Already at approach point or seat — snap to seat and sit down
            snapToSeat(ch, seat)
            ch.state = CharacterState.TYPE
            ch.frame = 0
            ch.frameTimer = 0
          }
        }
        break
      }
      // If in a meeting/review zone, sit at assigned seat if arrived
      if ((ch.routingZone === 'meeting' || ch.routingZone === 'review') && ch.seatId) {
        const seat = seats.get(ch.seatId)
        if (seat && isAtSeatOrApproach(ch, seat)) {
          snapToSeat(ch, seat)
          ch.state = CharacterState.TYPE
          ch.frame = 0
          ch.frameTimer = 0
        }
        break
      }
      if (ch.routingZone === 'meeting' || ch.routingZone === 'review') break
      // Clear non-meeting routing zones (kitchen/break-room) — handled by normal wander logic
      if (ch.routingZone) ch.routingZone = null

      // Not yet long-idle: stay at desk. Long-idle (wandering tier): wander to furniture.
      if (!shouldWander(ch)) {
        // Recently idle — go back to seat if not already there
        if (ch.seatId) {
          const seat = seats.get(ch.seatId)
          if (seat) {
            if (!isAtSeatOrApproach(ch, seat)) {
              const target = seatPathTarget(seat)
              const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles, occupiedTiles)
              if (path.length > 0) {
                ch.path = path
                ch.moveProgress = 0
                ch.state = CharacterState.WALK
                ch.frame = 0
                ch.frameTimer = 0
              }
            } else {
              // At seat or approach point — snap to seat, face desk, stay still
              snapToSeat(ch, seat)
            }
          }
        }
        break
      }

      // Countdown wander timer
      ch.wanderTimer -= dt
      if (ch.wanderTimer <= 0) {
        // Check if we've wandered enough — return to seat for a rest
        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId)
          if (seat) {
            const target = seatPathTarget(seat)
            const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles, occupiedTiles)
            if (path.length > 0) {
              ch.path = path
              ch.moveProgress = 0
              ch.state = CharacterState.WALK
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
        }
        // Signal to officeState that this character needs a wander destination.
        // officeState.update() will pick a destination (furniture or random tile)
        // and set the path + transition to WALK.
        ch.needsWanderDestination = true
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
      }
      break
    }

    case CharacterState.WALK: {
      ch.isSeated = false
      // Reset personality state if we were in an idle personality animation
      if (ch.personalityFrame >= 0) resetPersonality(ch)

      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y

        if (ch.isActive) {
          if (!ch.seatId) {
            // No seat — type in place
            ch.state = CharacterState.TYPE
          } else {
            const seat = seats.get(ch.seatId)
            if (seat && isAtSeatOrApproach(ch, seat)) {
              // At approach point or seat — snap to seat and sit down
              snapToSeat(ch, seat)
              ch.state = CharacterState.TYPE
            } else {
              ch.state = CharacterState.IDLE
            }
          }
        } else if (ch.activityTarget) {
          // Arrived at an interaction point — transition to ACTIVITY.
          // officeState will handle occupiedPoints tracking via its update loop.
          ch.state = CharacterState.ACTIVITY
          ch.frame = 0
          ch.frameTimer = 0
        } else {
          // Check if arrived at assigned seat (or its approach point)
          if (ch.seatId) {
            const seat = seats.get(ch.seatId)
            if (seat && isAtSeatOrApproach(ch, seat)) {
              snapToSeat(ch, seat)
              if (!shouldWander(ch)) {
                // Not long-idle — stay seated quietly (no typing)
                ch.state = CharacterState.IDLE
              } else {
                // Long-idle — brief rest at desk then wander again
                ch.state = CharacterState.TYPE
                // seatTimer < 0 is a sentinel from setAgentActive(false) meaning
                // "turn just ended" — skip the long rest so idle transition is immediate
                if (ch.seatTimer < 0) {
                  ch.seatTimer = 0
                } else {
                  ch.seatTimer = randomRange(SEAT_REST_MIN_SEC, SEAT_REST_MAX_SEC)
                }
              }
              ch.wanderCount = 0
              ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
          ch.state = CharacterState.IDLE
          ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        }
        ch.frame = 0
        ch.frameTimer = 0
        break
      }

      // Move toward next tile in path
      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0

        // Re-validate next step: if another character now occupies it, clear path.
        // Also clear activityTarget so the agent goes IDLE (not ACTIVITY at wrong tile).
        if (ch.path.length > 0 && occupiedTiles) {
          const ahead = ch.path[0]
          if (occupiedTiles.has(`${ahead.col},${ahead.row}`)) {
            ch.path = []
            ch.activityTarget = null
            ch.activityType = null
          }
        }
      }

      // If became active while wandering, repath to seat (via approach point)
      if (ch.isActive && ch.seatId) {
        const seat = seats.get(ch.seatId)
        if (seat) {
          const target = seatPathTarget(seat)
          const lastStep = ch.path[ch.path.length - 1]
          if (!lastStep || lastStep.col !== target.col || lastStep.row !== target.row) {
            const newPath = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles, occupiedTiles)
            if (newPath.length > 0) {
              ch.path = newPath
              ch.moveProgress = 0
            }
          }
        }
      }
      break
    }

    case CharacterState.ACTIVITY: {
      // Reset personality state on entry
      if (ch.personalityFrame >= 0) resetPersonality(ch)

      // If agent became active (got work), immediately exit activity and go to desk
      if (ch.isActive) {
        exitActivity(ch)
        break
      }

      // Advance animation for all activity types
      const actType = ch.activityType
      if (
        actType === FurnitureActivityType.WATCHING_TV ||
        actType === FurnitureActivityType.ARCADE ||
        actType === FurnitureActivityType.READING ||
        actType === FurnitureActivityType.VENDING
      ) {
        // 2-frame animation using typing/reading frame timing
        if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
          ch.frameTimer -= TYPE_FRAME_DURATION_SEC
          ch.frame = (ch.frame + 1) % 2
        }
      } else if (
        actType === FurnitureActivityType.EXERCISING ||
        actType === FurnitureActivityType.PLAYING_PINGPONG
      ) {
        // 4-frame walk cycle — bouncing/swinging motion
        const speed = actType === FurnitureActivityType.PLAYING_PINGPONG ? 0.2 : 0.25
        if (ch.frameTimer >= speed) {
          ch.frameTimer -= speed
          ch.frame = (ch.frame + 1) % 4
        }
      } else if (
        actType === FurnitureActivityType.PLAYING_POOL ||
        actType === FurnitureActivityType.LOUNGING
      ) {
        // Slow 2-frame — subtle leaning/shifting
        if (ch.frameTimer >= 0.5) {
          ch.frameTimer -= 0.5
          ch.frame = (ch.frame + 1) % 2
        }
      }

      // Count down activity duration
      ch.activityStartTime -= dt
      if (ch.activityStartTime <= 0) {
        exitActivity(ch)
      }
      break
    }
  }
}

/** Exit ACTIVITY state — reset to IDLE with fresh wander timer */
function exitActivity(ch: Character): void {
  ch.state = CharacterState.IDLE
  ch.frame = 0
  ch.frameTimer = 0
  ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
  ch.wanderCount = 0
  ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
  // If seated at a furniture chair (snapped to a blocked tile), we need to stand up.
  // The character will be at the blocked seat tile — just mark as not seated.
  // The next wander cycle will pathfind from the current tile, which handles blocked-tile escape.
  ch.isSeated = false
  ch.activityTarget = null
  ch.activityType = null
  ch.activityStartTime = 0
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2]
      }
      return sprites.typing[ch.dir][ch.frame % 2]
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4]
    case CharacterState.ACTIVITY: {
      const actType = ch.activityType
      if (actType === FurnitureActivityType.WATCHING_TV || actType === FurnitureActivityType.ARCADE) {
        return sprites.typing[ch.dir][ch.frame % 2]
      }
      if (actType === FurnitureActivityType.READING || actType === FurnitureActivityType.VENDING) {
        return sprites.reading[ch.dir][ch.frame % 2]
      }
      if (actType === FurnitureActivityType.EXERCISING || actType === FurnitureActivityType.PLAYING_PINGPONG) {
        // Walk cycle frames — bouncing/swinging motion
        return sprites.walk[ch.dir][ch.frame % 4]
      }
      if (actType === FurnitureActivityType.PLAYING_POOL || actType === FurnitureActivityType.LOUNGING) {
        // Slow 2-frame shift between walk poses
        return sprites.walk[ch.dir][ch.frame % 2 === 0 ? 1 : 3]
      }
      return sprites.walk[ch.dir][1]
    }
    case CharacterState.IDLE: {
      // Check for personality idle animation override
      if (ch.personalityFrame >= 0) {
        const pFrame = getPersonalityIdleFrame(ch.palette, ch.dir, ch.personalityFrame)
        if (pFrame) return pFrame
      }
      return sprites.walk[ch.dir][1]
    }
    default:
      return sprites.walk[ch.dir][1]
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}
