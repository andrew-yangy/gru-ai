// ---------------------------------------------------------------------------
// CanvasOffice — Canvas 2D office renderer using full pixel-agents engine
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { OFFICE_LAYOUT } from './office-layout'
import { OFFICE_AGENTS } from './types'
import type { AgentStatus, SessionInfo } from './pixel-types'
import { OfficeState } from './engine/officeState'
import { renderFrame, type SelectionRenderState, type IdentityOverlay } from './engine/renderer'
import { TILE_SIZE } from './pixel-types'
import { MAX_DELTA_TIME_SEC, ZOOM_MIN, ZOOM_MAX, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_SNAP_THRESHOLD } from './constants'
import { loadAllAssets, onTilesetReady } from './asset-loader'
import { CharacterState } from './pixel-types'
import { ROOM_ZONES, getZoneAt } from './engine/roomZones'

// Build id -> agentName lookup (CEO shows as "You")
const AGENT_ID_TO_NAME = new Map(
  OFFICE_AGENTS.map((a) => [a.id, a.isPlayer ? 'You' : a.agentName])
)
// Build agentName -> id reverse lookup
const AGENT_NAME_TO_ID = new Map(OFFICE_AGENTS.map((a) => [a.agentName, a.id]))
// Build id -> real agentName (not "You") for item click resolution
const AGENT_ID_TO_REAL_NAME = new Map(OFFICE_AGENTS.map((a) => [a.id, a.agentName]))

// Find the player-controlled CEO agent
const CEO_AGENT = OFFICE_AGENTS.find((a) => a.isPlayer) ?? null
const CEO_ID = CEO_AGENT?.id ?? null

/** Tooltip state for room hover */
interface TooltipState {
  x: number
  y: number
  roomName: string
  agents: string[]
}

/** Item click info passed up to GamePage */
export interface ClickedItem {
  type: 'desk' | 'furniture' | 'server' | 'conference' | 'wall'
  col: number
  row: number
  agentName?: string
}

interface CanvasOfficeProps {
  onAgentClick?: (agentName: string) => void
  onItemClick?: (item: ClickedItem | null) => void
  agentStatuses: Record<string, AgentStatus>
  /** Per-agent session context (task name, active tool) for Character.sessionInfo */
  agentSessionInfos?: Record<string, SessionInfo>
  /** Per-agent busy flag (multiple active sessions) */
  agentBusyMap?: Record<string, boolean>
  selectedAgentName?: string | null
}

export default function CanvasOffice({
  onAgentClick,
  onItemClick,
  agentStatuses,
  agentSessionInfos,
  agentBusyMap: _agentBusyMap,
  selectedAgentName,
}: CanvasOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<OfficeState | null>(null)
  const cameraRef = useRef({ zoom: 3, panX: 0, panY: 0 })
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const dragRef = useRef<{
    active: boolean
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const propsRef = useRef({ onAgentClick, onItemClick, agentStatuses, agentSessionInfos, selectedAgentName })
  propsRef.current = { onAgentClick, onItemClick, agentStatuses, agentSessionInfos, selectedAgentName }

  const [zoomLevel, setZoomLevel] = useState(3)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Initialize office state + add agents + load assets
  useEffect(() => {
    const state = new OfficeState(OFFICE_LAYOUT)
    for (const agent of OFFICE_AGENTS) {
      state.addAgent(agent.id, agent.palette, agent.hueShift, agent.seatId, true)
    }
    // Mark CEO as player-controlled and start idle (not typing at desk)
    if (CEO_ID !== null) {
      const ceoCh = state.characters.get(CEO_ID)
      if (ceoCh) {
        ceoCh.isPlayerControlled = true
        ceoCh.state = CharacterState.IDLE
        ceoCh.isActive = false
        ceoCh.agentStatus = 'working'
      }
    }
    stateRef.current = state
    loadAllAssets()
    onTilesetReady(() => {
      state.rebuildFurnitureInstances()
    })
  }, [])

  // Sync agent statuses from props (debounced inside OfficeState)
  // Skip player-controlled CEO
  useEffect(() => {
    const state = stateRef.current
    if (!state) return
    for (const agent of OFFICE_AGENTS) {
      if (agent.isPlayer) continue
      const status = agentStatuses[agent.agentName] ?? 'offline'
      state.setAgentStatus(agent.id, status)
    }
  }, [agentStatuses])

  // Sync session context info (task name, tool name)
  useEffect(() => {
    const state = stateRef.current
    if (!state || !agentSessionInfos) return
    for (const agent of OFFICE_AGENTS) {
      const info = agentSessionInfos[agent.agentName]
      if (info) {
        state.setAgentSessionInfo(agent.id, info)
      }
    }
  }, [agentSessionInfos])

  // Sync selected agent
  useEffect(() => {
    const state = stateRef.current
    if (!state) return
    if (selectedAgentName) {
      const agent = OFFICE_AGENTS.find((a) => a.agentName === selectedAgentName)
      state.selectedAgentId = agent ? agent.id : null
    } else {
      state.selectedAgentId = null
    }
  }, [selectedAgentName])

  // WASD keyboard input for CEO movement
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || CEO_ID === null) return

    const onKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current
      if (!state) return
      const ceo = state.characters.get(CEO_ID!)
      if (!ceo || !ceo.isPlayerControlled) return
      if (ceo.state === CharacterState.WALK && ceo.path.length > 0) return

      let dc = 0
      let dr = 0
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':    dr = -1; break
        case 's': case 'arrowdown':  dr = 1;  break
        case 'a': case 'arrowleft':  dc = -1; break
        case 'd': case 'arrowright': dc = 1;  break
        default: return
      }
      e.preventDefault()
      const targetCol = ceo.tileCol + dc
      const targetRow = ceo.tileRow + dr
      state.walkToTile(CEO_ID!, targetCol, targetRow)
    }

    canvas.addEventListener('keydown', onKeyDown)
    canvas.focus()
    return () => canvas.removeEventListener('keydown', onKeyDown)
  }, [])

  // ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (w === 0 || h === 0) return
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    })

    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  // Animation loop
  useEffect(() => {
    const loop = (time: number) => {
      const canvas = canvasRef.current
      const state = stateRef.current
      if (!canvas || !state) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const dt =
        lastTimeRef.current === 0
          ? 0
          : Math.min((time - lastTimeRef.current) / 1000, MAX_DELTA_TIME_SEC)
      lastTimeRef.current = time

      state.update(dt)

      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const cam = cameraRef.current

      // Smooth camera follow for CEO
      if (CEO_ID !== null && dt > 0) {
        const ceo = state.characters.get(CEO_ID)
        if (ceo && ceo.isPlayerControlled) {
          const cols = state.tileMap[0]?.length ?? 1
          const rows = state.tileMap.length ?? 1
          const mapW = cols * TILE_SIZE * cam.zoom
          const mapH = rows * TILE_SIZE * cam.zoom
          const baseOffsetX = Math.floor((w - mapW) / 2)
          const baseOffsetY = Math.floor((h - mapH) / 2)
          const targetPanX = w / 2 - ceo.x * cam.zoom - baseOffsetX
          const targetPanY = h / 2 - ceo.y * cam.zoom - baseOffsetY
          const dx = targetPanX - cam.panX
          const dy = targetPanY - cam.panY
          if (Math.abs(dx) > CAMERA_FOLLOW_SNAP_THRESHOLD || Math.abs(dy) > CAMERA_FOLLOW_SNAP_THRESHOLD) {
            cam.panX += dx * CAMERA_FOLLOW_LERP
            cam.panY += dy * CAMERA_FOLLOW_LERP
          } else {
            cam.panX = targetPanX
            cam.panY = targetPanY
          }
        }
      }

      const ctx = canvas.getContext('2d')!
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = false

      const selection: SelectionRenderState = {
        selectedAgentId: state.selectedAgentId,
        hoveredAgentId: state.hoveredAgentId,
        hoveredTile: state.hoveredTile,
        seats: state.seats,
        characters: state.characters,
      }

      const statuses = propsRef.current.agentStatuses
      const statusMap = new Map<number, import('./types').AgentStatus>()
      for (const [name, status] of Object.entries(statuses)) {
        const id = AGENT_NAME_TO_ID.get(name)
        if (id !== undefined) statusMap.set(id, status)
      }
      if (CEO_ID !== null) statusMap.set(CEO_ID, 'working')

      const identity: IdentityOverlay = {
        nameMap: AGENT_ID_TO_NAME,
        statusMap,
        time: time / 1000,
      }

      renderFrame(
        ctx,
        w,
        h,
        state.tileMap,
        state.furniture,
        state.getCharacters(),
        cam.zoom,
        cam.panX,
        cam.panY,
        selection,
        undefined,
        state.layout.tileColors,
        state.layout.cols,
        state.layout.rows,
        state.layout.gidLayers,
        identity,
      )

      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Wheel zoom (anchored to cursor)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cam = cameraRef.current
      const delta = e.deltaY < 0 ? 0.5 : -0.5
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom + delta))
      if (newZoom === cam.zoom) return

      const dpr = window.devicePixelRatio || 1
      const logW = canvas.width / dpr
      const logH = canvas.height / dpr
      const state = stateRef.current
      const cols = state?.tileMap[0]?.length ?? 1
      const rows = state?.tileMap.length ?? 1

      const mapW = cols * TILE_SIZE * cam.zoom
      const mapH = rows * TILE_SIZE * cam.zoom
      const offsetX = Math.floor((logW - mapW) / 2) + Math.round(cam.panX)
      const offsetY = Math.floor((logH - mapH) / 2) + Math.round(cam.panY)

      const worldX = (e.offsetX - offsetX) / cam.zoom
      const worldY = (e.offsetY - offsetY) / cam.zoom

      const newMapW = cols * TILE_SIZE * newZoom
      const newMapH = rows * TILE_SIZE * newZoom
      const newBaseOffsetX = Math.floor((logW - newMapW) / 2)
      const newBaseOffsetY = Math.floor((logH - newMapH) / 2)

      cam.panX = e.offsetX - worldX * newZoom - newBaseOffsetX
      cam.panY = e.offsetY - worldY * newZoom - newBaseOffsetY
      cam.zoom = newZoom
      setZoomLevel(Math.round(newZoom))
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  // Convert screen coords to world coords
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return { worldX: 0, worldY: 0 }

    const dpr = window.devicePixelRatio || 1
    const logW = canvas.width / dpr
    const logH = canvas.height / dpr
    const cam = cameraRef.current
    const cols = state.tileMap[0]?.length ?? 1
    const rows = state.tileMap.length ?? 1
    const mapW = cols * TILE_SIZE * cam.zoom
    const mapH = rows * TILE_SIZE * cam.zoom
    const offsetX = Math.floor((logW - mapW) / 2) + Math.round(cam.panX)
    const offsetY = Math.floor((logH - mapH) / 2) + Math.round(cam.panY)

    return {
      worldX: (screenX - offsetX) / cam.zoom,
      worldY: (screenY - offsetY) / cam.zoom,
    }
  }, [])

  // Resolve character id -> display name ("You" for CEO)
  const resolveAgentName = useCallback((charId: number): string => {
    return AGENT_ID_TO_NAME.get(charId) ?? ''
  }, [])

  // Resolve character id -> real agent name (for data lookups, never "You")
  const resolveRealAgentName = useCallback((charId: number): string => {
    return AGENT_ID_TO_REAL_NAME.get(charId) ?? ''
  }, [])

  // ---------------------------------------------------------------------------
  // Click handler: process a click at world coordinates.
  // Priority: agent > furniture/desk > click-to-move (CEO)
  // ---------------------------------------------------------------------------
  const processClick = useCallback(
    (worldX: number, worldY: number) => {
      const state = stateRef.current
      if (!state) return

      // 1. Agent hit (highest priority)
      const charId = state.getCharacterAt(worldX, worldY)
      if (charId !== null) {
        state.selectedAgentId = charId === state.selectedAgentId ? null : charId
        const name = resolveAgentName(charId)
        if (name && propsRef.current.onAgentClick) {
          propsRef.current.onAgentClick(name)
        }
        return
      }

      // 2. Furniture/desk hit (second priority)
      const tileInfo = state.getTileInfoAt(worldX, worldY)
      if (tileInfo && tileInfo.type !== 'wall') {
        state.selectedAgentId = null
        let agentName: string | undefined
        if (tileInfo.type === 'desk' && tileInfo.agentId !== undefined) {
          agentName = resolveRealAgentName(tileInfo.agentId)
        }
        const item: ClickedItem = {
          type: tileInfo.type,
          col: tileInfo.col,
          row: tileInfo.row,
          agentName,
        }
        if (propsRef.current.onItemClick) {
          propsRef.current.onItemClick(item)
        }
        return
      }

      // 3. Empty space -- deselect + click-to-move CEO
      state.selectedAgentId = null
      if (propsRef.current.onAgentClick) {
        propsRef.current.onAgentClick('')
      }
      if (propsRef.current.onItemClick) {
        propsRef.current.onItemClick(null)
      }
      if (CEO_ID !== null) {
        const tileCol = Math.floor(worldX / TILE_SIZE)
        const tileRow = Math.floor(worldY / TILE_SIZE)
        state.walkToTile(CEO_ID, tileCol, tileRow)
      }
    },
    [resolveAgentName, resolveRealAgentName],
  )

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    dragRef.current = {
      active: false,
      startX: e.nativeEvent.offsetX,
      startY: e.nativeEvent.offsetY,
      startPanX: cameraRef.current.panX,
      startPanY: cameraRef.current.panY,
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      if (!drag) {
        const state = stateRef.current
        if (state) {
          const screenX = e.nativeEvent.offsetX
          const screenY = e.nativeEvent.offsetY
          const { worldX, worldY } = screenToWorld(screenX, screenY)
          const charId = state.getCharacterAt(worldX, worldY)
          state.hoveredAgentId = charId

          // Check furniture for pointer cursor
          const tileInfo = charId === null ? state.getTileInfoAt(worldX, worldY) : null
          const isInteractive = charId !== null || (tileInfo !== null && tileInfo.type !== 'wall')

          if (canvasRef.current) {
            canvasRef.current.style.cursor = isInteractive ? 'pointer' : 'default'
          }

          // Room hover tooltip: only show when not hovering agent or interactive furniture
          if (charId === null && !isInteractive) {
            const col = Math.floor(worldX / TILE_SIZE)
            const row = Math.floor(worldY / TILE_SIZE)
            const zoneId = getZoneAt(col, row)
            if (zoneId) {
              const zone = ROOM_ZONES[zoneId]
              const agentsInZone = state.getAgentsInZone(
                zone.bounds.minCol, zone.bounds.minRow,
                zone.bounds.maxCol, zone.bounds.maxRow,
              )
              const agentNames = agentsInZone
                .map((a) => AGENT_ID_TO_NAME.get(a.id) ?? '')
                .filter((n) => n !== '')
              setTooltip({
                x: screenX + 12,
                y: screenY - 8,
                roomName: zone.label,
                agents: agentNames,
              })
            } else {
              setTooltip(null)
            }
          } else {
            setTooltip(null)
          }
        }
        return
      }

      // Drag panning
      const dx = e.nativeEvent.offsetX - drag.startX
      const dy = e.nativeEvent.offsetY - drag.startY
      if (!drag.active && Math.sqrt(dx * dx + dy * dy) >= 4) drag.active = true
      if (drag.active) {
        cameraRef.current.panX = drag.startPanX + dx
        cameraRef.current.panY = drag.startPanY + dy
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
        setTooltip(null)
      }
    },
    [screenToWorld],
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      if (!drag) return
      if (!drag.active) {
        const { worldX, worldY } = screenToWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        processClick(worldX, worldY)
      }
      dragRef.current = null
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    },
    [screenToWorld, processClick],
  )

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null
    const state = stateRef.current
    if (state) state.hoveredAgentId = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    setTooltip(null)
  }, [])

  // Touch handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function touchOffset(t: Touch) {
      const rect = canvas!.getBoundingClientRect()
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    function touchDist(a: Touch, b: Touch) {
      return Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2)
    }

    let pinch: { startDist: number; startZoom: number } | null = null

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      if (e.touches.length === 2) {
        dragRef.current = null
        pinch = {
          startDist: touchDist(e.touches[0], e.touches[1]),
          startZoom: cameraRef.current.zoom,
        }
        return
      }
      if (e.touches.length === 1) {
        pinch = null
        const pos = touchOffset(e.touches[0])
        dragRef.current = {
          active: false,
          startX: pos.x,
          startY: pos.y,
          startPanX: cameraRef.current.panX,
          startPanY: cameraRef.current.panY,
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      if (e.touches.length === 2 && pinch) {
        const d = touchDist(e.touches[0], e.touches[1])
        const newZoom = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, pinch.startZoom * (d / pinch.startDist)),
        )
        cameraRef.current.zoom = newZoom
        setZoomLevel(Math.round(newZoom))
        return
      }
      if (e.touches.length === 1 && dragRef.current) {
        const pos = touchOffset(e.touches[0])
        const drag = dragRef.current
        const dx = pos.x - drag.startX
        const dy = pos.y - drag.startY
        if (!drag.active && Math.sqrt(dx * dx + dy * dy) >= 4) drag.active = true
        if (drag.active) {
          cameraRef.current.panX = drag.startPanX + dx
          cameraRef.current.panY = drag.startPanY + dy
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      if (pinch) {
        pinch = null
        if (e.touches.length === 0) dragRef.current = null
        return
      }
      if (e.touches.length === 0 && dragRef.current && !dragRef.current.active) {
        const state = stateRef.current
        if (state) {
          const dpr = window.devicePixelRatio || 1
          const logW = canvas!.width / dpr
          const logH = canvas!.height / dpr
          const cam = cameraRef.current
          const cols = state.tileMap[0]?.length ?? 1
          const rows = state.tileMap.length ?? 1
          const mapW = cols * TILE_SIZE * cam.zoom
          const mapH = rows * TILE_SIZE * cam.zoom
          const offsetX = Math.floor((logW - mapW) / 2) + Math.round(cam.panX)
          const offsetY = Math.floor((logH - mapH) / 2) + Math.round(cam.panY)
          const worldX = (dragRef.current.startX - offsetX) / cam.zoom
          const worldY = (dragRef.current.startY - offsetY) / cam.zoom
          // Touch tap: same priority logic as mouse click
          const charId = state.getCharacterAt(worldX, worldY)
          if (charId !== null) {
            state.selectedAgentId = charId === state.selectedAgentId ? null : charId
            const name = AGENT_ID_TO_NAME.get(charId) ?? ''
            if (name && propsRef.current.onAgentClick) {
              propsRef.current.onAgentClick(name)
            }
          } else {
            const tileInfo = state.getTileInfoAt(worldX, worldY)
            if (tileInfo && tileInfo.type !== 'wall') {
              state.selectedAgentId = null
              let agentName: string | undefined
              if (tileInfo.type === 'desk' && tileInfo.agentId !== undefined) {
                agentName = AGENT_ID_TO_REAL_NAME.get(tileInfo.agentId)
              }
              if (propsRef.current.onItemClick) {
                propsRef.current.onItemClick({
                  type: tileInfo.type,
                  col: tileInfo.col,
                  row: tileInfo.row,
                  agentName,
                })
              }
            } else {
              state.selectedAgentId = null
              if (propsRef.current.onAgentClick) {
                propsRef.current.onAgentClick('')
              }
              if (propsRef.current.onItemClick) {
                propsRef.current.onItemClick(null)
              }
            }
          }
        }
      }
      dragRef.current = null
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="block touch-none outline-none"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        aria-label="Office simulation"
        role="img"
      />
      {zoomLevel > 1 && (
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
          {zoomLevel}x
        </div>
      )}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-black/80 text-white text-xs px-3 py-2 rounded-lg shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y, maxWidth: 200 }}
          role="tooltip"
        >
          <div className="font-semibold mb-0.5">{tooltip.roomName}</div>
          {tooltip.agents.length > 0 ? (
            <div className="text-white/70">
              {tooltip.agents.join(', ')}
            </div>
          ) : (
            <div className="text-white/50 italic">Empty</div>
          )}
        </div>
      )}
    </div>
  )
}
