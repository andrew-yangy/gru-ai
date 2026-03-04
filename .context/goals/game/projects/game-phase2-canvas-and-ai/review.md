# Review: Canvas 2D Engine Core

## Review Summary

| Reviewer | Outcome | Round |
|----------|---------|-------|
| Sarah (CTO) | fail -> pass (after fixes) | Round 1 failed, Round 2 passed |
| Marcus (CPO) | fail -> pass (after fixes) | Round 1 failed, Round 2 passed |

## Round 1 Findings (pre-fix)

Both reviewers independently identified the same 3 critical issues:

1. **Hover highlight on non-interactive tiles**: hoverRef.current was set for ALL in-bounds tiles including floor/wall, creating false click affordance. Both flagged this as DOD criterion 7 violation.

2. **Grid not centered at default zoom**: fitToView() clamped offsets to Math.max(0, ...), so at 1x zoom on wide viewport the grid sat in top-left corner instead of being centered.

3. **Dead code: engine/input.ts + ghost types**: The entire input translator module was built but never imported by CanvasOffice.tsx. Three types (RenderState, TileHitResult, GameAction) were also unused.

Additional Sarah findings:
- First-frame render artifact (dirtyRef starts true before ResizeObserver fires)
- Canvas font state reset in inner loop (minor perf concern for future)
- Dark mode regression (canvas has no dark color variants)

Additional Marcus findings:
- No zoom affordance at 1x (badge hidden, no hint that scroll-to-zoom exists)
- Pan cancels on mouseLeave (brief cursor exit loses drag)
- Missing .context/preferences.md (corrections check could not complete)

## Fixes Applied (Riley, Round 2)

1. Hover scoped to INTERACTIVE_TILES only in handleMouseMove
2. Grid centering via negative offsets in fitToView/clampToBounds
3. Deleted engine/input.ts and ghost types from engine/types.ts
4. dirtyRef initial value changed from true to false

## Architecture Quality (Sarah)

Engine architecture rated **solid**:
- Camera math correct (worldToScreen/screenToTile are exact inverses)
- zoomAtPoint anchor-zoom math verified correct
- DPR handling standard and correct
- Dirty-flag rAF pattern correct
- propsRef stale-closure avoidance correct

## Product Quality (Marcus)

UX rated **partial improvement**:
- Zoom math correct and feels good (cursor-anchored, integer steps)
- Drag pan + bounds clamping solid
- Selection persistence works (ring stays while SidePanel open)
- Missing: dark mode, zoom discovery hint, touch support

## Known Gaps (deferred, not blocking)

- Dark mode canvas colors (light-only hex values)
- Keyboard navigation (OfficeGrid had tabIndex per tile, Canvas has single element)
- Touch/pinch support
- Zoom controls UI (+/- buttons)
- OfficeGrid.tsx still exists as dead code (delete after CEO visual verify)
