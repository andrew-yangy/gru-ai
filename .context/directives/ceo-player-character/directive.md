# CEO Player Character — Full Redo

Redo the CEO player-controlled character from the Phase 3 Living Office. The current implementation shipped with critical gaps: no camera follow (DOD said "smoothly follows" but it's not implemented), no continuous WASD movement (tap-to-move only), focus loss kills input, and no visual distinction for the CEO character.

## What exists today

- CEO added to agent-registry.json with isPlayer flag
- isPlayerControlled flag on Character, skips AI FSM in updateCharacter()
- WASD keydown handler on canvas (single-tap, no hold-to-walk)
- Click-to-move via A* pathfinding (walkToTile)
- cameraFollowId field exists on OfficeState but is NEVER SET or consumed by renderer
- CEO uses same generic palette system as all other agents

## What's wrong

1. **No camera follow** — cameraFollowId is dead code. CEO walks off-screen. Renderer uses static center + panX/panY with no character tracking.
2. **No continuous movement** — Only keydown, no keyup tracking. Can't hold WASD to walk. Must tap repeatedly, feels broken.
3. **WASD blocks mid-step** — Input rejected while walking (early return on WALK state). Creates stuttery stop-start movement.
4. **Canvas focus loss** — canvas.focus() once on mount. Click SidePanel = lose all keyboard input. No focus indicator, no re-focus mechanism.
5. **Click conflicts** — Empty space click both deselects selection AND moves CEO. Should be separate intents.
6. **No distinct CEO appearance** — DOD said "distinct sprite" but CEO looks like every other agent. No crown, no glow, no visual marker saying "this is you."
7. **No collision feedback** — Walking into walls silently fails.
8. **No interaction on approach** — Walking up to an agent does nothing. Proximity should trigger something (highlight, auto-select, speech bubble).

## Success criteria

- Hold WASD for continuous smooth movement (not tap-per-tile)
- Camera smoothly tracks CEO with configurable deadzone (not locked center)
- CEO visually distinct — immediately identifiable as "you" without reading the nameplate
- Click-to-move and click-to-select are separate, non-conflicting interactions
- Keyboard input works regardless of which UI panel has focus
- Walking near an agent highlights them (proximity interaction)
- Collision feedback (subtle bounce or blocked indicator)
- Movement feels like a real game — comparable to pixel-agents quality

## Quality bar

Best-in-market pixel art game. The CEO movement should feel as good as any indie pixel RPG. This is the primary interaction — if it feels bad, the whole game feels bad.
