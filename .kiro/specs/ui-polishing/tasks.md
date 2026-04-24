# Implementation Plan: UI Polishing

## Overview

Refactor all rendering in Beltline Panic from inline drawing code in `GameScene.ts` and `StartScene.ts` into a dedicated `src/rendering/` module directory. Each module handles one visual element (palette, belt, machines, items, floor, terminal, start scene). Tasks are ordered so that each step produces a buildable, testable result — starting with the shared palette, then layering drawing modules from back to front, and finishing by wiring everything into the scenes.

## Tasks

- [x] 1. Create Palette module and rendering directory
  - [x] 1.1 Create `src/rendering/Palette.ts` with the centralized `PALETTE` constant
    - Export a single `PALETTE` object containing all ~20 color constants as defined in the design (floor, belt, machine, item, terminal, player, UI groups)
    - Use `as const` for type safety
    - _Requirements: 6.1, 10.1, 10.3_
  - [ ]* 1.2 Write unit tests for Palette completeness
    - Verify `PALETTE` contains all required color group keys (floor, belt, machine, item, terminal, player, UI)
    - Verify all values are valid hex numbers (non-negative integers)
    - _Requirements: 6.1_

- [x] 2. Implement FloorDrawing module
  - [x] 2.1 Create `src/rendering/FloorDrawing.ts` with `drawFloor()` function
    - Accept `FloorDrawParams` (graphics, layoutSystem)
    - Fill the entire scaled game area with `PALETTE.FLOOR_DARK` for the non-walkable area
    - Draw the five walkable node positions as `PALETTE.FLOOR_LIGHT` squares (matching `NODE_SIZE`) with subtle `PALETTE.FLOOR_GRID` tile lines inside each
    - Draw narrow lighter connecting strips between adjacent walkable nodes to hint at paths
    - This replaces the current `movementAreaGraphics` white-tinted rectangles in `GameScene.drawLayout()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.2, 6.4, 10.1_
  - [ ]* 2.2 Write unit tests for FloorDrawing
    - Verify `drawFloor` calls graphics methods without throwing given a mock Graphics and LayoutSystem
    - Verify floor is drawn using palette colors, not hardcoded values
    - _Requirements: 4.1, 4.2_

- [x] 3. Implement BeltDrawing module
  - [x] 3.1 Create `src/rendering/BeltDrawing.ts` with `drawBelt()` function
    - Accept `BeltDrawParams` (graphics, layoutSystem, beltOffset, gameOver)
    - Walk along each path segment (inlet, four loop edges, outlet) in fixed pixel steps (~20px segment spacing at base resolution)
    - At each step draw a small filled rectangle perpendicular to path direction, alternating `BELT_BASE` / `BELT_SEGMENT` colors based on `(stepIndex + beltOffset) % 2`
    - Draw thin edge rails along both sides using `BELT_EDGE`
    - Use `LAYOUT` constants and conveyor config (`INLET_START`, `INLET_END`, `OUTLET_START`, `OUTLET_END`, `LOOP_WAYPOINTS`) for path geometry
    - When `gameOver` is true the segments still render but the offset is frozen (caller responsibility — function just draws at the given offset)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.2, 6.3, 10.1_
  - [ ]* 3.2 Write unit tests for BeltDrawing
    - Verify `drawBelt` does not throw with valid params and a mock Graphics
    - Verify belt uses palette colors
    - _Requirements: 1.1, 1.4_

- [x] 4. Implement TerminalDrawing module
  - [x] 4.1 Create `src/rendering/TerminalDrawing.ts` with `drawTerminal()` function
    - Accept `TerminalDrawParams` (graphics, layoutSystem, playerPosition)
    - Draw the terminal body as a filled rectangle using `PALETTE.TERMINAL_BODY` at the existing left-side position
    - Draw an inset screen rectangle using `PALETTE.TERMINAL_SCREEN` (or `TERMINAL_SCREEN_LIT` when `playerPosition === 'left'`)
    - Add 2-3 small decorative button rectangles below the screen using `PALETTE.MACHINE_PANEL`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.2, 10.1_
  - [ ]* 4.2 Write unit tests for TerminalDrawing
    - Verify `drawTerminal` does not throw with valid params
    - Verify screen color changes when playerPosition is 'left' vs other positions
    - _Requirements: 5.4_

- [x] 5. Implement MachineDrawing module
  - [x] 5.1 Create `src/rendering/MachineDrawing.ts` with `drawMachines()` function
    - Accept `MachineDrawParams` (graphics, layoutSystem, machines, machineSystem)
    - Draw each machine with a larger body that covers the belt section beneath its zone and extends outward
    - Use per-machine colors from palette: `MACHINE1_BODY` (blue), `MACHINE2_BODY` (green), `MACHINE3_BODY` (red)
    - Add distinctive features per machine: Machine 1 gets chimney rectangles, Machine 2 gets a gauge circle, Machine 3 gets vent lines
    - Draw a control panel rectangle on the face facing center using `MACHINE_PANEL` (or `MACHINE_PANEL_LIT` when player is interacting)
    - Draw activity indicator circle: `MACHINE_INDICATOR_ON` when active, `MACHINE_INDICATOR_OFF` otherwise
    - When player is interacting, draw a 1px bright border around the control panel
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.2, 10.1_
  - [ ]* 5.2 Write unit tests for MachineDrawing
    - Verify `drawMachines` handles an empty machines array without throwing
    - Verify each machine position (up, right, down) is handled
    - Verify indicator color changes based on active state
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 6. Implement ItemDrawing module
  - [x] 6.1 Create `src/rendering/ItemDrawing.ts` with `drawItems()` function
    - Accept `ItemDrawParams` (graphics, layoutSystem, items, gameOver, collidedItems, blinkTimer)
    - Draw each item with a distinct shape per state:
      - `new`: metallic cube — filled square with darker right/bottom edge shading
      - `processed`: ball — filled circle with lower-right crescent shading
      - `upgraded`: shiny ball — circle with upper-left highlight square
      - `packaged`: wrapped gift — filled square with cross ribbon pattern
    - Use palette colors for each state (`ITEM_NEW`, `ITEM_PROCESSED`, `ITEM_UPGRADED`, `ITEM_PACKAGED` and their accent colors)
    - Preserve collision blink logic: alternate between `ITEM_COLLISION_BLINK` and state color every 300ms using `blinkTimer`
    - Fall back to plain cube drawing for any unrecognized item state
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.2, 10.1_
  - [ ]* 6.2 Write unit tests for ItemDrawing
    - Verify `drawItems` handles all four item states without throwing
    - Verify empty items array is handled gracefully
    - Verify fallback behavior for an unrecognized item state
    - Verify collision blink alternates color based on blinkTimer
    - _Requirements: 3.5, 3.7_

- [x] 7. Checkpoint — Verify all rendering modules build
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire rendering modules into GameScene
  - [x] 8.1 Add `beltOffset` animation state to `GameScene`
    - Add a `private beltOffset: number = 0` field
    - In `update()`, advance `beltOffset` each frame proportional to belt speed and delta when not in game-over state
    - _Requirements: 1.2, 1.5, 9.6_
  - [x] 8.2 Refactor `GameScene.drawLayout()` to use FloorDrawing and BeltDrawing
    - Replace the inline belt stroke and movement area drawing with calls to `drawFloor()` and static belt elements
    - Use a dedicated `floorGraphics` object at lowest depth for floor, redrawn only on resize
    - Remove the old `movementAreaGraphics` object and its inline drawing code
    - Remove the old inline belt `strokeRect` and `lineBetween` calls from `drawLayout()`
    - Keep the resize handler calling `drawFloor()` and `drawBelt()` for the static redraw
    - _Requirements: 4.5, 9.1, 9.5_
  - [x] 8.3 Refactor `GameScene.drawLayout()` to use TerminalDrawing
    - Replace the inline terminal `fillRect` with a call to `drawTerminal()`
    - Pass `inputSystem.getPlayerPosition()` so the terminal can highlight when in range
    - Remove the old inline terminal drawing code
    - _Requirements: 5.1, 5.4_
  - [x] 8.4 Replace `GameScene.renderMachines()` with MachineDrawing
    - Replace the entire body of `renderMachines()` with a call to `drawMachines()`
    - Pass the machines array and machineSystem reference
    - Remove all inline machine drawing code
    - _Requirements: 2.1, 2.5, 2.6_
  - [x] 8.5 Replace `GameScene.renderItems()` with ItemDrawing
    - Replace the entire body of `renderItems()` with a call to `drawItems()`
    - Pass items, gameOver, collidedItems, and blinkTimer
    - Remove all inline item drawing code
    - _Requirements: 3.1, 3.7_
  - [x] 8.6 Update per-frame rendering call order in `GameScene.update()`
    - Ensure rendering calls follow the back-to-front order: Floor (static, on resize only) → Belt (per-frame with beltOffset) → Terminal (per-frame) → Machines (per-frame) → Items (per-frame) → Player → HUD
    - Add per-frame `drawBelt()` and `drawTerminal()` calls in `update()` at the correct position
    - Update player character color to use `PALETTE.PLAYER` instead of hardcoded `0xff0000`
    - _Requirements: 8.1, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ]* 8.7 Write unit tests for GameScene rendering integration
    - Verify GameScene creates without errors (existing test coverage)
    - Verify beltOffset advances when not in game-over state
    - Verify beltOffset stops advancing in game-over state
    - _Requirements: 1.2, 1.5, 9.6_

- [x] 9. Implement StartDrawing module and wire into StartScene
  - [x] 9.1 Create `src/rendering/StartDrawing.ts` with `drawStartBackground()` function
    - Accept `StartDrawParams` (graphics, layoutSystem)
    - Draw a decorative horizontal conveyor belt silhouette across the middle using `BELT_BASE` and `BELT_SEGMENT` colors
    - Draw 2-3 small machine silhouettes along the belt using machine body colors
    - Keep it static (no animation) and minimal
    - _Requirements: 7.1, 7.2, 7.3, 6.2, 10.1_
  - [x] 9.2 Wire `drawStartBackground()` into `StartScene.create()`
    - Add a Graphics object and call `drawStartBackground()` before the title and prompt text
    - Update title text style to use monospace font family for pixel-style consistency
    - Ensure title and prompt text remain clearly readable on top of the background
    - Handle resize by redrawing the background
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 9.3 Write unit tests for StartDrawing
    - Verify `drawStartBackground` does not throw with valid params
    - _Requirements: 7.2_

- [x] 10. Final checkpoint — Verify full build and all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `vite build` completes without errors
  - Verify no external image assets are loaded or referenced
  - Verify all rendering uses Phaser 3 Graphics methods and palette colors only

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design has no Correctness Properties section, so property-based tests are not included
- All rendering modules are stateless functions — animation state lives in the scenes
- No layout constants, gameplay systems, or input behavior are modified
- Checkpoints ensure incremental validation at key integration points
