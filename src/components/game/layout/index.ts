export { FURNITURE_CATALOG, getCatalogEntry, getCatalogByCategory, FURNITURE_CATEGORIES } from './furnitureCatalog'
export type { FurnitureCategory, CatalogEntryWithCategory } from './furnitureCatalog'
export {
  layoutToTileMap,
  layoutToFurnitureInstances,
  getBlockedTiles,
  layoutToSeats,
  getSeatTiles,
  createDefaultLayout,
  serializeLayout,
  deserializeLayout,
} from './layoutSerializer'
export {
  isWalkable,
  getWalkableTiles,
  findPath,
} from './tileMap'
