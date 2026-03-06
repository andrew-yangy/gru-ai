export {
  TILE_SIZE,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_COLS,
  MAX_ROWS,
  MATRIX_EFFECT_DURATION_SEC as MATRIX_EFFECT_DURATION,
} from './constants'

export const TileType = {
  WALL: 0,
  FLOOR_1: 1,
  FLOOR_2: 2,
  FLOOR_3: 3,
  FLOOR_4: 4,
  FLOOR_5: 5,
  FLOOR_6: 6,
  FLOOR_7: 7,
  VOID: 8,
} as const
export type TileType = (typeof TileType)[keyof typeof TileType]

/** Per-tile color settings for floor pattern colorization */
export interface FloorColor {
  /** Hue: 0-360 in colorize mode, -180 to +180 in adjust mode */
  h: number
  /** Saturation: 0-100 in colorize mode, -100 to +100 in adjust mode */
  s: number
  /** Brightness -100 to 100 */
  b: number
  /** Contrast -100 to 100 */
  c: number
  /** When true, use Photoshop-style Colorize (grayscale → fixed HSL). Default: adjust mode. */
  colorize?: boolean
}

export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
} as const
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState]

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const
export type Direction = (typeof Direction)[keyof typeof Direction]

/** 2D array of hex color strings (or '' for transparent). [row][col] */
export type SpriteData = string[][]

export interface Seat {
  /** Chair furniture uid */
  uid: string
  /** Tile col where agent sits */
  seatCol: number
  /** Tile row where agent sits */
  seatRow: number
  /** Direction character faces when sitting (toward adjacent desk) */
  facingDir: Direction
  assigned: boolean
}

export interface FurnitureInstance {
  sprite: SpriteData
  /** Furniture type identifier (e.g. 'whiteboard', 'desk') */
  type: string
  /** Pixel x (top-left) */
  x: number
  /** Pixel y (top-left) */
  y: number
  /** Y value used for depth sorting (typically bottom edge) */
  zY: number
}

export interface ToolActivity {
  toolId: string
  status: string
  done: boolean
  permissionWait?: boolean
}

export const FurnitureType = {
  DESK: 'desk',
  BOOKSHELF: 'bookshelf',
  PLANT: 'plant',
  COOLER: 'cooler',
  WHITEBOARD: 'whiteboard',
  CHAIR: 'chair',
  PC: 'pc',
  LAMP: 'lamp',
  COUCH: 'couch',
  SERVER_RACK: 'server_rack',
  COFFEE_TABLE: 'coffee_table',
  FILING_CABINET: 'filing_cabinet',
  RUG: 'rug',
  MONITOR: 'monitor',
  LAPTOP: 'laptop',
  EXEC_CHAIR: 'exec_chair',
  VENDING_MACHINE: 'vending_machine',
  AC_UNIT: 'ac_unit',
  WALL_ART: 'wall_art',
  COPIER: 'copier',
  TV_SCREEN: 'tv_screen',
  PRINTER: 'printer',
} as const
export type FurnitureType = (typeof FurnitureType)[keyof typeof FurnitureType]

export const EditTool = {
  TILE_PAINT: 'tile_paint',
  WALL_PAINT: 'wall_paint',
  FURNITURE_PLACE: 'furniture_place',
  FURNITURE_PICK: 'furniture_pick',
  SELECT: 'select',
  EYEDROPPER: 'eyedropper',
  ERASE: 'erase',
} as const
export type EditTool = (typeof EditTool)[keyof typeof EditTool]

export interface FurnitureCatalogEntry {
  type: string // FurnitureType enum or asset ID
  label: string
  footprintW: number
  footprintH: number
  sprite: SpriteData
  isDesk: boolean
  category?: string
  /** Orientation from rotation group: 'front' | 'back' | 'left' | 'right' */
  orientation?: string
  /** Whether this item can be placed on top of desk/table surfaces */
  canPlaceOnSurfaces?: boolean
  /** Number of tile rows from the top of the footprint that are "background" (allow placement, still block walking). Default 0. */
  backgroundTiles?: number
  /** Whether this item can be placed on wall tiles */
  canPlaceOnWalls?: boolean
}

export interface PlacedFurniture {
  uid: string
  type: string // FurnitureType enum or asset ID
  col: number
  row: number
  /** Optional color override for furniture */
  color?: FloorColor
}

/** Numbered seat position for agent assignment */
export interface SeatPosition {
  col: number
  row: number
  dir: Direction
}

export interface OfficeLayout {
  version: 1
  cols: number
  rows: number
  tiles: TileType[]
  furniture: PlacedFurniture[]
  /** Per-tile color settings, parallel to tiles array. null = wall/no color */
  tileColors?: Array<FloorColor | null>
  /** Raw TMX tile GID layers for direct tileset rendering.
   *  Each layer is a flat array parallel to tiles[]. Rendered bottom-to-top.
   *  GID 0 = transparent (show layer below). */
  gidLayers?: number[][]
  /** Numbered seat positions (index 0 = seat-1, index 1 = seat-2, etc.) */
  seatPositions?: SeatPosition[]
}

/** Agent status from backend session state */
export type AgentStatus = 'working' | 'waiting' | 'idle' | 'error' | 'offline'

/** Context data threaded from the session/activity layer */
export interface SessionInfo {
  taskName?: string
  toolName?: string
  detail?: string
}

export interface Character {
  id: number
  state: CharacterState
  dir: Direction
  /** Pixel position */
  x: number
  y: number
  /** Current tile column */
  tileCol: number
  /** Current tile row */
  tileRow: number
  /** Remaining path steps (tile coords) */
  path: Array<{ col: number; row: number }>
  /** 0-1 lerp between current tile and next tile */
  moveProgress: number
  /** Current tool name for typing vs reading animation, or null */
  currentTool: string | null
  /** Palette index (0-5) */
  palette: number
  /** Hue shift in degrees (0 = no shift, ≥45 for repeated palettes) */
  hueShift: number
  /** Animation frame index */
  frame: number
  /** Time accumulator for animation */
  frameTimer: number
  /** Timer for idle wander decisions */
  wanderTimer: number
  /** Number of wander moves completed in current roaming cycle */
  wanderCount: number
  /** Max wander moves before returning to seat for rest */
  wanderLimit: number
  /** Whether the agent is actively working */
  isActive: boolean
  /** Assigned seat uid, or null if no seat */
  seatId: string | null
  /** Active speech bubble type, or null if none showing */
  bubbleType: 'permission' | 'waiting' | null
  /** Countdown timer for bubble (waiting: 2→0, permission: unused) */
  bubbleTimer: number
  /** Timer to stay seated while inactive after seat reassignment (counts down to 0) */
  seatTimer: number
  /** Whether this character represents a sub-agent (spawned by Task tool) */
  isSubagent: boolean
  /** Parent agent ID if this is a sub-agent, null otherwise */
  parentAgentId: number | null
  /** Active matrix spawn/despawn effect, or null */
  matrixEffect: 'spawn' | 'despawn' | null
  /** Timer counting up from 0 to MATRIX_EFFECT_DURATION */
  matrixEffectTimer: number
  /** Per-column random seeds (16 values) for staggered rain timing */
  matrixEffectSeeds: number[]
  /** Workspace folder name (only set for multi-root workspaces) */
  folderName?: string
  /** Current agent status from backend (working/waiting/idle/error/offline) */
  agentStatus: AgentStatus
  /** Context data from session/activity for tooltip/panel display */
  sessionInfo: SessionInfo
  /** Pending status waiting to be applied after debounce delay */
  pendingStatus: AgentStatus | null
  /** Countdown timer for status change debounce (seconds remaining) */
  statusChangeTimer: number
  /** True when agent has an error — stays at desk with error indicator */
  hasError: boolean
  /** True for the CEO / player-controlled character — skips AI FSM */
  isPlayerControlled: boolean
  /** Linger timer (seconds remaining) — delays routing to break room after task completion */
  lingerTimer: number
  /** True when agent has multiple concurrent active sessions */
  isBusy: boolean
  /** Current routing destination zone, or null if at default location */
  routingZone: string | null
  /** Saved desk seatId while temporarily assigned to a conference/review seat */
  originalSeatId: string | null
  /** Accumulator counting idle time before personality animation triggers */
  personalityTimer: number
  /** Current personality animation frame index (-1 = inactive, 0+ = playing) */
  personalityFrame: number
  /** Random threshold (8-15s) before personality idle animation triggers */
  personalityThreshold: number
  /** True when this character is within proximity radius of the CEO */
  isNearPlayer: boolean
  /** Tile that blocked movement (set by updateCharacter, consumed by OfficeState) */
  blockedTile: { col: number; row: number } | null
}
