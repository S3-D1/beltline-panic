# Implementation Plan: gameplay-skeleton

## Overview

Replace `InitialScene` with `StartScene` and `GameScene`, implement `InputSystem` for discrete five-position player navigation, render the placeholder factory layout, and wire everything into `main.ts`.

## Tasks

- [x] 1. Delete InitialScene and its test
  - Delete `src/scenes/InitialScene.ts`
  - Delete `src/tests/initialScene.test.ts`
  - _Requirements: 1.1 (InitialScene is replaced by StartScene as entry point)_

- [ ] 2. Implement InputSystem
  - [x] 2.1 Create `src/systems/InputSystem.ts`
    - Define `PlayerPosition` type: `'center' | 'up' | 'down' | 'left' | 'right'`
    - Define `LAYOUT` constants object (SCENE_W, SCENE_H, CENTER_X, CENTER_Y, NODE_OFFSET, NODE_SIZE, BELT_X, BELT_Y, BELT_W, BELT_H, BELT_THICKNESS, STATION_W, STATION_H)
    - Implement `InputSystem` class with `constructor(scene: Phaser.Scene)`, `update()`, `getPlayerPosition()`, `getPlayerCoords()`
    - Register UP/W, DOWN/S, LEFT/A, RIGHT/D key bindings in constructor
    - Implement movement transition table in `update()`: from center any direction moves to that position; from a directional position only the opposite key returns to center, all others are no-ops
    - _Requirements: 8.1, 9.1–9.5, 10.1–10.5, 11.1–11.2, 12.1–12.4_

  - [ ]* 2.2 Write unit tests for InputSystem (Examples 5–6)
    - Test that fresh `InputSystem` has `getPlayerPosition() === 'center'`
    - Test that all eight key codes (UP, W, DOWN, S, LEFT, A, RIGHT, D) are registered
    - File: `src/tests/inputSystem.test.ts`
    - _Requirements: 8.1, 12.1–12.4_

  - [ ]* 2.3 Write property test — Property 1: coordinate mapping
    - `// Feature: gameplay-skeleton, Property 1: coordinate mapping is correct for all positions`
    - Generate a random `PlayerPosition`; assert `getPlayerCoords()` returns the expected `{ x, y }` from LAYOUT constants
    - File: `src/tests/inputSystem.test.ts`
    - _Requirements: 7.2, 7.3_

  - [ ]* 2.4 Write property test — Property 2: center to directional
    - `// Feature: gameplay-skeleton, Property 2: moving from center reaches the correct directional position`
    - Generate a random directional key; fresh InputSystem at center; assert position equals key name after pressing
    - File: `src/tests/inputSystem.test.ts`
    - _Requirements: 9.1–9.5_

  - [ ]* 2.5 Write property test — Property 3: directional to center
    - `// Feature: gameplay-skeleton, Property 3: pressing the opposite key from a directional position returns to center`
    - Generate a random `DirectionalPosition`; set InputSystem to that position; press opposite key; assert `getPlayerPosition() === 'center'`
    - File: `src/tests/inputSystem.test.ts`
    - _Requirements: 10.1–10.5_

  - [ ]* 2.6 Write property test — Property 4: non-returning keys are no-ops
    - `// Feature: gameplay-skeleton, Property 4: non-returning keys are no-ops from a directional position`
    - Generate a random `DirectionalPosition` and a key that is NOT the opposite; assert position is unchanged
    - File: `src/tests/inputSystem.test.ts`
    - _Requirements: 11.1_

  - [ ]* 2.7 Write property test — Property 5: position invariant
    - `// Feature: gameplay-skeleton, Property 5: player position is always a valid value`
    - Generate a random sequence of directional keys (length 1–20); apply all; assert result is one of the five valid values
    - File: `src/tests/inputSystem.test.ts`
    - _Requirements: 11.2_

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement StartScene
  - [x] 4.1 Create `src/scenes/StartScene.ts`
    - Extend `Phaser.Scene` with key `'StartScene'`
    - In `create()`: render "Beltline Panic" centered on screen and "Press any key to start" below it
    - Register a one-shot `keydown` listener that calls `this.scene.start('GameScene')`
    - _Requirements: 1.2, 1.3, 2.1, 2.2_

  - [ ]* 4.2 Write unit tests for StartScene (Examples 1–4)
    - Test that `main.ts` scene array lists `StartScene` first
    - Test that `StartScene.ts` source contains `"Beltline Panic"`
    - Test that `StartScene.ts` source contains a prompt string (e.g. `"any key"`)
    - Test that `StartScene.ts` source registers a keydown listener calling `scene.start('GameScene')`
    - File: `src/tests/startScene.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [ ] 5. Implement GameScene
  - [x] 5.1 Create `src/scenes/GameScene.ts`
    - Extend `Phaser.Scene` with key `'GameScene'`
    - In `create()`: draw static layout using `Phaser.GameObjects.Graphics` — ConveyorBelt as dark unfilled rectangular loop, four station blocks (3 Machine + 1 UpgradeTerminal) as blue rectangles at top/right/bottom/left of belt, at least two Item shapes as small purple rectangles on the belt path, MovementArea as lightly tinted cross covering center + four directional nodes
    - In `create()`: instantiate `InputSystem`, create `playerGraphic` as `Phaser.GameObjects.Graphics`
    - In `update()`: call `inputSystem.update()`, clear and redraw player as red rectangle at `inputSystem.getPlayerCoords()`
    - Do NOT import or invoke ConveyorSystem, ItemSystem, MachineSystem, UpgradeSystem, EconomySystem, or DifficultySystem
    - _Requirements: 3.1–3.2, 4.1–4.3, 5.1–5.2, 6.1–6.2, 7.1–7.3, 8.1, 13.1–13.5_

  - [ ]* 5.2 Write unit tests for GameScene (Example 7)
    - Test that `GameScene.ts` source does not import any of: ConveyorSystem, ItemSystem, MachineSystem, UpgradeSystem, EconomySystem, DifficultySystem
    - File: `src/tests/gameScene.test.ts`
    - _Requirements: 13.1–13.5_

- [x] 6. Update main.ts
  - Remove `InitialScene` import and registration
  - Import and register `StartScene` and `GameScene` in the scene array, with `StartScene` first
  - _Requirements: 1.1_

- [x] 7. Final checkpoint — Ensure all tests pass and build succeeds
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `npm run build` completes without errors.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All five property tests use **fast-check** with a minimum of 100 iterations each
- `LAYOUT` constants should be exported from `InputSystem.ts` so tests can reference them directly
- `InputSystem` is a plain TypeScript class — not a Phaser plugin; `GameScene` owns its lifecycle
