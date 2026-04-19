# Implementation Plan: outlet-score-gameover

## Overview

Extend the existing conveyor prototype with an outlet path, score system, and game-over condition. All changes go into existing files: `ConveyorConfig.ts`, `ConveyorSystem.ts`, `ItemSystem.ts`, and `GameScene.ts`. Tests are appended to existing test files. Each task builds incrementally — outlet geometry first, then movement logic, then scoring, then game-over.

## Tasks

- [x] 1. Add outlet geometry and item values to ConveyorConfig
  - [x] 1.1 Add outlet constants to `src/data/ConveyorConfig.ts`
    - Export `OUTLET_BRANCH_PROGRESS = 0.893`
    - Export `OUTLET_START: Point` at `(LAYOUT.BELT_X, LAYOUT.CENTER_Y)`
    - Export `OUTLET_END: Point` at `(LAYOUT.BELT_X - 80, LAYOUT.CENTER_Y)`
    - Export `ITEM_VALUES: Record<ItemState, number>` with `new: 0, processed: 10, upgraded: 11, packaged: 22`
    - Export `COLLISION_THRESHOLD = ITEM_SIZE`
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.4, 7.2_

  - [ ]* 1.2 Write unit tests for outlet config values in `src/tests/conveyorSystem.test.ts`
    - Verify `OUTLET_START` lies on the loop path at `OUTLET_BRANCH_PROGRESS` within tolerance
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.3 Write unit tests for item values in `src/tests/itemSystem.test.ts`
    - Verify `ITEM_VALUES` maps: new=0, processed=10, upgraded=11, packaged=22
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2. Add outlet path movement and branch point redirection to ConveyorSystem
  - [x] 2.1 Extend `ConveyorItem` interface and `ConveyorSystem` class in `src/systems/ConveyorSystem.ts`
    - Add `onOutlet: boolean` and `outletProgress: number` fields to `ConveyorItem`
    - Import `OUTLET_START`, `OUTLET_END`, `OUTLET_BRANCH_PROGRESS` from config
    - Compute `outletLength` in constructor
    - Add `getPositionOnOutlet(progress: number): Point` method (linear interpolation)
    - In `update()`: for loop items crossing `OUTLET_BRANCH_PROGRESS`, redirect to outlet if `state !== 'new'`; handle wrap-around crossing
    - In `update()`: advance `outletProgress` for outlet items at `CONVEYOR_SPEED`; update position via `getPositionOnOutlet()`
    - _Requirements: 1.1, 2.1, 2.2, 2.4, 3.1, 3.2_

  - [ ]* 2.2 Write property test for branch point redirection (Property 1) in `src/tests/conveyorSystem.test.ts`
    - **Property 1: Branch point redirection depends on item state**
    - Generate random ItemState and loopProgress just before branch point; assert outlet redirection iff state !== 'new'
    - **Validates: Requirements 2.1, 3.1, 3.2**

  - [ ]* 2.3 Write property test for outlet movement (Property 2) in `src/tests/conveyorSystem.test.ts`
    - **Property 2: Outlet movement is proportional to delta time**
    - Generate random positive delta and starting outletProgress; assert progress increase matches formula
    - **Validates: Requirements 2.2**

  - [ ]* 2.4 Write property test for outlet positions (Property 3) in `src/tests/conveyorSystem.test.ts`
    - **Property 3: Outlet positions lie on the outlet segment**
    - Generate random progress in [0,1]; assert getPositionOnOutlet equals lerp(OUTLET_START, OUTLET_END, progress)
    - **Validates: Requirements 2.4**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add outlet removal, value lookup, and collision detection to ItemSystem
  - [x] 4.1 Update `ItemSystem` in `src/systems/ItemSystem.ts`
    - Import `ITEM_VALUES`, `COLLISION_THRESHOLD` from config
    - Define and export `UpdateResult` interface: `{ exitedValues: number[]; collision: { a: ConveyorItem; b: ConveyorItem } | null }`
    - Change `update(delta)` return type to `UpdateResult`
    - Add `onOutlet: false` and `outletProgress: 0` to spawned items
    - After conveyor update: skip transition zone checks for outlet items (`if (item.onInlet || item.onOutlet) continue`)
    - Collect exited items: filter where `onOutlet && outletProgress >= 1`, look up `ITEM_VALUES[item.state]`, remove from array
    - Check collisions: O(n²) pairwise distance check, return first pair where distance ≤ `COLLISION_THRESHOLD`
    - Return `{ exitedValues, collision }`
    - _Requirements: 2.3, 5.1, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 4.2 Write property test for item exit (Property 4) in `src/tests/itemSystem.test.ts`
    - **Property 4: Item exit removes item and yields correct value**
    - Generate random non-new ItemState and outletProgress near 1.0; assert removal and correct value
    - **Validates: Requirements 2.3, 5.1**

  - [ ]* 4.3 Write property test for score invariance (Property 5) in `src/tests/itemSystem.test.ts`
    - **Property 5: Score only changes when items exit**
    - Generate items not near outlet end; assert exitedValues is empty after small delta
    - **Validates: Requirements 5.3**

  - [ ]* 4.4 Write property test for collision detection (Property 7) in `src/tests/itemSystem.test.ts`
    - **Property 7: Collision detection by distance threshold**
    - Generate two random positions; assert collision iff distance ≤ COLLISION_THRESHOLD
    - **Validates: Requirements 7.2, 7.4**

  - [ ]* 4.5 Write property test for game-over freeze (Property 8) in `src/tests/itemSystem.test.ts`
    - **Property 8: Game-over freezes all gameplay**
    - Generate random items; assert update with gameOver=true leaves items unchanged
    - **Validates: Requirements 8.2, 8.3, 10.1, 10.2**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add score display, game-over state, outlet rendering, and blink effect to GameScene
  - [x] 6.1 Update `GameScene` in `src/scenes/GameScene.ts`
    - Add `score: number`, `gameOver: boolean`, `collidedItems`, `blinkTimer: number` fields
    - Add `scoreText: Phaser.GameObjects.Text` in top-right corner, initialized to `"00000000"`, monospace white
    - Add `gameOverText: Phaser.GameObjects.Text` centered, hidden initially, showing `"Game Over"`
    - In `drawLayout()`: draw outlet line from `OUTLET_START` to `OUTLET_END` with same belt style
    - In `update()`: if not gameOver, call `itemSystem.update(delta)`, accumulate `exitedValues` into score, update score display, check collision → enter game-over
    - If gameOver: skip itemSystem.update, only advance blinkTimer
    - Add `enterGameOver(a, b)`: set gameOver=true, store collided pair, show game-over text, change score color to red
    - Add `updateScoreDisplay()`: format as `String(score).padStart(8, '0')`
    - In `renderItems()`: for collided items during game-over, alternate fill between red and `ITEM_COLORS[item.state]` every 300ms based on blinkTimer; all other items use normal state color
    - Continue rendering player, movement area, machine blocks as before
    - _Requirements: 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 6.2 Write property test for score formatting (Property 6) in `src/tests/gameScene.test.ts`
    - **Property 6: Score formatting is zero-padded to 8 digits**
    - Generate random non-negative integer; assert padStart(8, '0') has length 8
    - **Validates: Requirements 4.2**

  - [ ]* 6.3 Write property test for collision blink (Property 9) in `src/tests/gameScene.test.ts`
    - **Property 9: Collision blink alternates between red and state color**
    - Generate random non-new ItemState and blinkTimer; assert color is red when `Math.floor(blinkTimer / 300) % 2 === 0`, else ITEM_COLORS[state]
    - **Validates: Requirements 9.2, 9.3, 11.2**

  - [ ]* 6.4 Write property test for non-collided item colors (Property 10) in `src/tests/gameScene.test.ts`
    - **Property 10: Non-collided items always use their state color**
    - Generate random ItemState and gameOver boolean; assert render color equals ITEM_COLORS[state]
    - **Validates: Requirements 9.4, 11.1**

  - [ ]* 6.5 Write property test for blink immutability (Property 11) in `src/tests/gameScene.test.ts`
    - **Property 11: Blink effect does not mutate item state or color config**
    - Generate items with collided pair; assert ITEM_COLORS and item states unchanged after render
    - **Validates: Requirements 11.3**

  - [ ]* 6.6 Write unit tests for GameScene source checks in `src/tests/gameScene.test.ts`
    - Verify GameScene.ts draws outlet line with same style as inlet
    - Verify GameScene.ts still draws inlet line
    - Verify score initializes to 0 and displays as "00000000"
    - Verify GameScene.ts contains "Game Over" text creation
    - Verify GameScene.ts does not contain restart/retry logic
    - Verify GameScene.ts still renders player, movement area, machine blocks
    - _Requirements: 1.3, 1.5, 4.3, 8.4, 10.4, 12.4_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already in devDependencies) with minimum 100 iterations
- All test code is appended to existing test files, not new files
- No new system files are created — all changes go into existing files
- Checkpoints ensure incremental validation
