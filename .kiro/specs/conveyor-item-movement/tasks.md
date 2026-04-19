# Implementation Plan: Conveyor Item Movement

## Overview

Implement path-based item movement on the conveyor belt with inlet spawning, clockwise loop traversal, and automatic state transitions at machine zones. Three new files (`ConveyorConfig.ts`, `ConveyorSystem.ts`, `ItemSystem.ts`) plus updates to `GameScene.ts`. Tests use vitest + fast-check.

## Tasks

- [x] 1. Create ConveyorConfig with path data and constants
  - [x] 1.1 Create `src/data/ConveyorConfig.ts` with all exported types and constants
    - Define `Point`, `ItemState`, `TransitionZone` interfaces
    - Export `ITEM_COLORS`, `CONVEYOR_SPEED`, `SPAWN_INTERVAL`, `ITEM_SIZE`
    - Export `LOOP_WAYPOINTS` derived from LAYOUT constants
    - Export `INLET_START`, `INLET_END`
    - Export `TRANSITION_ZONES` array with progress ranges for Machine_1, Machine_2, Machine_3
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.3, 7.1, 7.2, 8.1, 8.2, 9.1, 9.2, 11.1_

- [x] 2. Create ConveyorSystem with path geometry and movement logic
  - [x] 2.1 Create `src/systems/ConveyorSystem.ts` with the ConveyorItem interface and ConveyorSystem class
    - Define `ConveyorItem` interface (x, y, state, onInlet, inletProgress, loopProgress)
    - Implement constructor computing `loopLength`, `inletLength`, `segmentLengths`
    - Implement `getPositionOnInlet(progress)` — linear interpolation between INLET_START and INLET_END
    - Implement `getPositionOnLoop(progress)` — walk segments, interpolate between waypoints
    - Implement `update(delta, items)` — advance inlet/loop progress, handle inlet-to-loop transfer, wrap loop progress, update x/y
    - Treat `delta <= 0` as no-op
    - _Requirements: 1.1, 1.4, 2.1, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

- [x] 3. Create ItemSystem with spawning and state transitions
  - [x] 3.1 Create `src/systems/ItemSystem.ts` with the ItemSystem class
    - Implement constructor taking a `ConveyorSystem` reference
    - Implement spawn timer logic: accumulate delta, spawn new item at inlet start when timer exceeds `SPAWN_INTERVAL`
    - Implement `update(delta)` — tick spawn timer, call `conveyor.update(delta, items)`, check transition zones
    - Implement transition zone check: for each loop item, match `fromState` against zone range, set `toState`
    - Implement `getItems()` accessor
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.1, 7.1, 7.3, 8.1, 8.3, 9.1, 9.3, 10.1, 10.2, 10.3_

- [x] 4. Checkpoint — Verify core systems compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update GameScene to integrate systems and render dynamic items
  - [x] 5.1 Update `src/scenes/GameScene.ts` to wire ConveyorSystem and ItemSystem
    - Import ConveyorSystem, ItemSystem, ITEM_COLORS, INLET_START, INLET_END, ITEM_SIZE
    - Instantiate ConveyorSystem and ItemSystem in `create()`
    - Call `itemSystem.update(delta)` in `update()`
    - _Requirements: 14.1, 14.2, 14.3_
  - [x] 5.2 Render the inlet line in `drawLayout()`
    - Draw inlet segment from INLET_START to INLET_END using belt stroke style
    - _Requirements: 2.2, 2.3, 2.4, 13.2_
  - [x] 5.3 Render dynamic items and remove static placeholder items
    - Add `renderItems()` method: iterate items, draw filled square at (item.x, item.y) using `ITEM_COLORS[item.state]`
    - Remove the two static purple `fillRect` calls from `drawLayout()`
    - Call `renderItems()` each frame after `itemSystem.update()`
    - _Requirements: 3.3, 7.2, 8.2, 9.2, 11.1, 11.2, 12.1, 12.2, 12.3, 12.4, 13.1, 13.3_

- [x] 6. Checkpoint — Verify build and visual integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write ConveyorSystem tests
  - [x] 7.1 Create `src/tests/conveyorSystem.test.ts` with unit tests for config and geometry
    - **Example 1**: `LOOP_WAYPOINTS` has 4 points forming a closed rectangle matching LAYOUT constants
    - **Example 2**: Waypoint traversal order is clockwise (signed area check)
    - **Example 3**: `INLET_END` equals `LOOP_WAYPOINTS[0]` (inlet connects to loop)
    - **Example 5**: `ConveyorSystem` source does not import Phaser physics
    - **Example 8**: Loop perimeter equals `2 * (BELT_W + BELT_H) = 1400`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4, 5.2_
  - [ ]* 7.2 Write property test: inlet movement proportional to delta (Property 2)
    - **Property 2: Inlet movement is proportional to delta time**
    - **Validates: Requirements 4.1, 6.1**
  - [ ]* 7.3 Write property test: inlet-to-loop transfer (Property 3)
    - **Property 3: Inlet-to-loop transfer**
    - **Validates: Requirements 4.2**
  - [ ]* 7.4 Write property test: inlet positions lie on inlet segment (Property 4)
    - **Property 4: Inlet positions lie on the inlet segment**
    - **Validates: Requirements 4.3**
  - [ ]* 7.5 Write property test: loop movement proportional to delta (Property 5)
    - **Property 5: Loop movement is proportional to delta time**
    - **Validates: Requirements 5.1, 6.1**
  - [ ]* 7.6 Write property test: loop positions lie on loop segments (Property 6)
    - **Property 6: Loop positions lie on loop segments**
    - **Validates: Requirements 5.3**
  - [ ]* 7.7 Write property test: loop progress wraps correctly (Property 7)
    - **Property 7: Loop progress wraps correctly**
    - **Validates: Requirements 5.4**
  - [ ]* 7.8 Write property test: frame-rate independence (Property 8)
    - **Property 8: Frame-rate independence**
    - **Validates: Requirements 6.2**

- [x] 8. Write ItemSystem tests
  - [x] 8.1 Create `src/tests/itemSystem.test.ts` with unit tests for item config and transitions
    - **Example 4**: `ITEM_COLORS` maps all four states to correct hex values
    - **Example 9**: Transition zones are ordered and non-overlapping
    - _Requirements: 3.3, 7.1, 7.2, 8.1, 8.2, 9.1, 9.2, 11.1_
  - [ ]* 8.2 Write property test: spawned items initialize correctly (Property 1)
    - **Property 1: Spawned items initialize correctly**
    - **Validates: Requirements 3.1, 3.2**
  - [ ]* 8.3 Write property test: correct state transition at matching zones (Property 9)
    - **Property 9: Correct state transition at matching zones**
    - **Validates: Requirements 7.1, 8.1, 9.1**
  - [ ]* 8.4 Write property test: state transitions are forward-only and non-repeating (Property 10)
    - **Property 10: State transitions are forward-only and non-repeating**
    - **Validates: Requirements 7.3, 8.3, 9.3, 10.1, 10.2, 10.3**

- [x] 9. Write GameScene integration checks
  - [x] 9.1 Add integration unit tests to verify existing skeleton is preserved
    - **Example 6**: `GameScene.ts` source still instantiates `InputSystem`
    - **Example 7**: `main.ts` scene array still lists `StartScene` first
    - _Requirements: 14.1, 14.2_

- [x] 10. Final checkpoint — Verify full build and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` + `vitest --run`
- Checkpoints ensure incremental validation
- Static placeholder items in GameScene are replaced by dynamic items in task 5.3
