// ---------------------------------------------------------------------------
// CanvasOffice — Canvas 2D office renderer using full pixel-agents engine
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { OFFICE_LAYOUT } from './office-layout'
import { OFFICE_AGENTS, type AgentStatus } from './types'
import { OfficeState } from './engine/officeState'
import { renderFrame, type SelectionRenderState } from './engine/renderer'
import { TILE_SIZE } from './pixel-types'
import { MAX_DELTA_TIME_SEC, ZOOM_MIN, ZOOM_MAX } from './constants'
import { loadAllAssets, onTilesetReady } from './asset-loader'

// Build id → agentName lookup
const AGENT_ID_TO_NAME = new Map(OFFICE_AGENTS.map((a) => [a.id, a.agentName]))

interface CanvasOfficeProps {
  onAgentClick?: (agentName: string) => void
  agentStatuses: Record<string, AgentStatus>
  selectedAgentName?: string | null
}

export default function CanvasOffice({
  onAgentClick,
  agentStatuses,
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
  const propsRef = useRef({ onAgentClick, agentStatuses, selectedAgentName })
  propsRef.current = { onAgentClick, agentStatuses, selectedAgentName }

  const [zoomLevel, setZoomLevel] = useState(3)

  // Initialize office state + add agents + load assets
  useEffect(() => {
    const state = new OfficeState(OFFICE_LAYOUT)
    for (const agent of OFFICE_AGENTS) {
      // addAgent(id, preferredPalette, preferredHueShift, preferredSeatId, skipSpawnEffect)
      state.addAgent(agent.id, agent.palette, 0, agent.seatId, true)
    }
    stateRef.current = state
    loadAllAssets()
    onTilesetReady(() => {
      // Rebuild furniture instances with new tileset sprites
      state.rebuildFurnitureInstances()
    })
  }, [])

  // Sync agent active states from statuses
  useEffect(() => {
    const state = stateRef.current
    if (!state) return
    for (const agent of OFFICE_AGENTS) {
      const status = agentStatuses[agent.agentName] ?? 'offline'
      state.setAgentActive(agent.id, status === 'working' || status === 'waiting')
    }
  }, [agentStatuses])

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
      const ctx = canvas.getContext('2d')!
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = false

      const cam = cameraRef.current

      // Build selection state for seat indicators + outlines
      const selection: SelectionRenderState = {
        selectedAgentId: state.selectedAgentId,
        hoveredAgentId: state.hoveredAgentId,
        hoveredTile: state.hoveredTile,
        seats: state.seats,
        characters: state.characters,
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
        undefined, // no editor
        state.layout.tileColors,
        state.layout.cols,
        state.layout.rows,
        state.layout.gidLayers,
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

  // Resolve character id → agent name
  const resolveAgentName = useCallback((charId: number): string => {
    return AGENT_ID_TO_NAME.get(charId) ?? ''
  }, [])

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
        // Hover cursor + hovered agent
        const state = stateRef.current
        if (state) {
          const { worldX, worldY } = screenToWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
          const charId = state.getCharacterAt(worldX, worldY)
          state.hoveredAgentId = charId
          if (canvasRef.current) {
            canvasRef.current.style.cursor = charId !== null ? 'pointer' : 'default'
          }
        }
        return
      }

      const dx = e.nativeEvent.offsetX - drag.startX
      const dy = e.nativeEvent.offsetY - drag.startY
      if (!drag.active && Math.sqrt(dx * dx + dy * dy) >= 4) drag.active = true
      if (drag.active) {
        cameraRef.current.panX = drag.startPanX + dx
        cameraRef.current.panY = drag.startPanY + dy
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
      }
    },
    [screenToWorld],
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      if (!drag) return
      if (!drag.active) {
        const state = stateRef.current
        if (state) {
          const { worldX, worldY } = screenToWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
          const charId = state.getCharacterAt(worldX, worldY)
          if (charId !== null) {
            state.selectedAgentId = charId === state.selectedAgentId ? null : charId
            const name = resolveAgentName(charId)
            if (name && propsRef.current.onAgentClick) {
              propsRef.current.onAgentClick(name)
            }
          } else {
            state.selectedAgentId = null
            if (propsRef.current.onAgentClick) {
              propsRef.current.onAgentClick('')
            }
          }
        }
      }
      dragRef.current = null
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    },
    [screenToWorld, resolveAgentName],
  )

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null
    const state = stateRef.current
    if (state) state.hoveredAgentId = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'
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
          const charId = state.getCharacterAt(worldX, worldY)
          if (charId !== null) {
            state.selectedAgentId = charId === state.selectedAgentId ? null : charId
            const name = AGENT_ID_TO_NAME.get(charId) ?? ''
            if (name && propsRef.current.onAgentClick) {
              propsRef.current.onAgentClick(name)
            }
          } else {
            state.selectedAgentId = null
            if (propsRef.current.onAgentClick) {
              propsRef.current.onAgentClick('')
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
        className="block touch-none"
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
    </div>
  )
}
