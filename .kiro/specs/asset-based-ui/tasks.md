# Tasks: Asset-Based UI

## Task 1: Create Asset Key Registry and Update PreloadScene

- [x] 1.1 Create `src/data/AssetKeys.ts` with `ASSET_KEYS` constants and `ASSET_PATHS` mapping for all 13 image assets
- [x] 1.2 Update `src/scenes/PreloadScene.ts` to iterate `ASSET_PATHS` and call `this.load.image(key, path)` for each entry
- [x] 1.3 Add `loaderror` event handler in PreloadScene that logs `console.warn` with the failed asset key and URL
- [x] 1.4 Add `ITEM_STATE_ASSET` mapping (ItemState → asset key) to `AssetKeys.ts`
- [x] 1.5 Write unit test verifying PreloadScene loads all 13 image assets with correct keys

## Task 2: Replace Belt Rendering with TileSprites

- [x] 2.1 Create belt TileSprite instances in `GameScene.create()` for each path segment (inlet, loop edges, outlet) using the `belt` texture key
- [x] 2.2 Position and rotate each belt TileSprite to align with its path segment direction (0° horizontal, 90° vertical)
- [x] 2.3 Scale belt TileSprites to match existing belt width (`ITEM_SIZE * 3` base-resolution pixels) via LayoutSystem
- [x] 2.4 Animate belt TileSprites each frame by advancing `tilePositionX`/`tilePositionY` proportional to belt speed and delta
- [x] 2.5 Stop belt animation advancement when `gameOver` is true
- [x] 2.6 Handle resize: reposition and rescale all belt TileSprites on `scale.resize` event
- [x] 2.7 Remove the `beltGraphics` Graphics object and `drawBelt` import from GameScene once TileSprites are working

## Task 3: Replace Item Rendering with Sprites

- [x] 3.1 Create an item sprite pool in `GameScene.create()` with initial capacity, using `ITEM_STATE_ASSET` to set textures
- [x] 3.2 Each frame in `GameScene.update()`, sync the sprite pool with `itemSystem.getItems()`: set position, texture (based on item state), scale (ITEM_SIZE via LayoutSystem), and visibility
- [x] 3.3 Implement collision blink effect on item sprites: alternate tint between red (`0xff0000`) and normal every 300ms using `blinkTimer` for collided items
- [x] 3.4 Dynamically grow the sprite pool when more items exist than pool size
- [x] 3.5 Remove the `itemGraphics` Graphics object and `drawItems` import from GameScene once sprites are working

## Task 4: Replace Machine Rendering with Sprites

- [x] 4.1 Create 3 machine sprite instances in `GameScene.create()`, one per machine definition, using `machine_no-interaction_inactive` as default texture
- [x] 4.2 Position each machine sprite at the correct base-resolution coordinates matching the existing `MachineDrawing.ts` body positions
- [x] 4.3 Rotate each machine sprite to face the belt: Machine 1 (up) faces down, Machine 2 (right) faces left, Machine 3 (down) faces up
- [x] 4.4 Scale each machine sprite to cover existing body dimensions (100×60 horizontal, 60×100 vertical) via LayoutSystem
- [x] 4.5 Each frame, swap machine sprite texture based on state: `machine_interaction_active` when player interacting, `machine_no-interaction_active` when active, `machine_no-interaction_inactive` when idle
- [x] 4.6 Handle resize: reposition and rescale machine sprites on `scale.resize` event
- [x] 4.7 Remove the `machineGraphics` Graphics object and `drawMachines` import from GameScene once sprites are working

## Task 5: Replace Player Rendering with Worker Sprite

- [x] 5.1 Create a single worker sprite instance in `GameScene.create()` using `worker_64_front` as default texture
- [x] 5.2 Each frame, update worker sprite texture and flipX based on player position: center/down → front, up → back, left → side+flipX, right → side
- [x] 5.3 Scale worker sprite to match existing player size (40 base-resolution pixels) via LayoutSystem
- [x] 5.4 Position worker sprite at `inputSystem.getPlayerCoords()` scaled through LayoutSystem each frame
- [x] 5.5 Remove the `playerGraphic` Graphics object and inline player rendering code from GameScene once sprite is working

## Task 6: Replace Terminal Rendering with Sprites

- [x] 6.1 Create a terminal sprite instance in `GameScene.create()` using `terminal_inactive` as default texture
- [x] 6.2 Position terminal sprite at the existing terminal body location (left side of belt, vertically centered) using LayoutSystem
- [x] 6.3 Each frame, swap terminal sprite texture: `terminal_active` when player is at `left` position, `terminal_inactive` otherwise
- [x] 6.4 Scale terminal sprite to cover existing body dimensions (40×60 base-resolution pixels) via LayoutSystem
- [x] 6.5 Handle resize: reposition and rescale terminal sprite on `scale.resize` event
- [x] 6.6 Remove the `terminalGraphics` Graphics object and `drawTerminal` import from GameScene once sprite is working

## Task 7: Replace Start Scene Background with Sprites

- [x] 7.1 Create a belt TileSprite in `StartScene.create()` for the decorative belt band, using the `belt` texture at reduced alpha (0.5)
- [x] 7.2 Create 3 machine Image instances in `StartScene.create()` using `machine_no-interaction_inactive` at reduced alpha (0.35), positioned and rotated to match existing silhouette layout
- [x] 7.3 Handle resize: reposition and rescale start scene belt and machine sprites on `scale.resize` event
- [x] 7.4 Remove the `bgGraphics` Graphics object and `drawStartBackground` import from StartScene once sprites are working

## Task 8: Cleanup Placeholder Drawing Code

- [x] 8.1 Remove unused shape-drawing functions from `ItemDrawing.ts` (`drawCube`, `drawBall`, `drawShinyBall`, `drawGift`, and `drawItems` if fully replaced)
- [x] 8.2 Remove programmatic shape-drawing code from `TerminalDrawing.ts` (`drawTerminal` function and related constants)
- [x] 8.3 Remove programmatic shape-drawing code from `MachineDrawing.ts` (`drawMachines` function and related helpers)
- [x] 8.4 Remove programmatic belt drawing code from `BeltDrawing.ts` (`drawBelt` function and related helpers)
- [x] 8.5 Remove programmatic start background drawing from `StartDrawing.ts` (`drawStartBackground` function)
- [x] 8.6 Remove unused color constants from `Palette.ts` that were only referenced by replaced placeholder code, retaining constants still used by floor grid, UI text, and collision blink
- [x] 8.7 Remove any now-unused imports across GameScene, StartScene, and rendering modules

## Task 9: Property-Based Tests

- [x] 9.1 Install `fast-check` as a dev dependency
- [x] 9.2 Write property test: Item state → asset key mapping is correct and complete (Property 1)
- [x] 9.3 Write property test: Collision blink tint alternates correctly for any timer value (Property 2)
- [x] 9.4 Write property test: Machine state → asset key mapping is deterministic (Property 3)
- [x] 9.5 Write property test: Player position → worker sprite mapping is correct (Property 4)
- [x] 9.6 Write property test: Terminal asset key reflects player position (Property 5)
- [x] 9.7 Write property test: Sprite positioning and scaling is consistent with LayoutSystem for any viewport (Property 6)

## Task 10: Visual Adjustment — Terminal Active State

- [x] 10.1 Update `updateTerminalSprite()` in `GameScene.ts` to use `this.terminalMode` instead of `inputSystem.getPlayerPosition() === 'left'` for choosing between `terminal_active` and `terminal_inactive` textures
  - The terminal should show as active only during an ongoing terminal interaction, not just when the player is at the `left` position
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 10.2 Update property test for Property 5 to validate terminal asset key based on `(playerPosition, terminalMode)` pairs instead of just `playerPosition`
  - **Property 5: Terminal asset key reflects interaction state**
  - **Validates: Requirements 10.1, 10.2, 10.3**

## Task 11: Visual Adjustment — Worker Size Doubled

- [x] 11.1 Update `createWorkerSprite()` and `updateWorkerSprite()` in `GameScene.ts` to scale the worker sprite to 80 base-resolution pixels instead of 40
  - Extract the size into a named constant (e.g., `WORKER_SIZE = 80`) for clarity
  - _Requirements: 11.1, 11.2_

## Task 12: Visual Adjustment — Terminal Transparent Background

- [x] 12.1 Verify and fix terminal sprite transparency in `GameScene.ts`
  - Ensure no opaque background fill, tint, or overlapping Graphics object obscures the terminal PNG's native alpha transparency
  - Check that the floor grid or layout graphics do not draw an opaque rectangle behind the terminal
  - Adjust depth ordering if needed so the terminal sprite's transparent regions show through correctly
  - _Requirements: 12.1, 12.2_

## Task 13: Visual Adjustment — Machine Size and Orientation

- [x] 13.1 Update `createMachineSprites()` in `GameScene.ts` to increase machine dimensions and position them to overlap the belt
  - Machine 1 (top): increase to ~140×90 base-resolution pixels, shift position so it overlaps the top belt edge
  - Machine 2 (right): increase to ~90×140 base-resolution pixels, shift position so it overlaps the right belt edge
  - Machine 3 (bottom): increase to ~140×90 base-resolution pixels, shift position so it overlaps the bottom belt edge
  - _Requirements: 13.1, 13.2_

- [x] 13.2 Verify machine rotation keeps monitor/face directed toward center of play area
  - Machine 1 (top) rotation = π (faces down toward center)
  - Machine 2 (right) rotation = π/2 (faces left toward center)
  - Machine 3 (bottom) rotation = 0 (faces up toward center)
  - Confirm texture swapping and resize handling still work at the new dimensions
  - _Requirements: 13.2, 13.3, 13.4_

## Task 14: Visual Adjustment — Belt Static Display and Cropping

- [x] 14.1 Remove belt animation from `GameScene.update()` — delete the per-frame `tilePositionX`/`tilePositionY` advancement loop for belt TileSprites
  - Keep `beltOffset` tracking for item movement calculations (items still move on the belt path)
  - Only the visual belt scrolling should stop
  - _Requirements: 14.1_

- [x] 14.2 Ensure only the visible belt portion of the asset is displayed
  - If the belt PNG has transparent padding, use `setCrop()` or adjust TileSprite dimensions to clip to the opaque belt region
  - Verify belt segment positioning, rotation, and resize behavior remain correct
  - _Requirements: 14.2, 14.3_

## Task 15: Checkpoint — Visual Adjustments

- [x] 15. Ensure all tests pass, ask the user if questions arise.
  - Verify terminal active state only shows during interaction
  - Verify worker sprite is visibly larger
  - Verify terminal has transparent background
  - Verify machines are bigger and overlap the belt
  - Verify belt is static with no scrolling animation
  - _Requirements: 10, 11, 12, 13, 14_
