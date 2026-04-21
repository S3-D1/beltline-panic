# Implementation Plan: Responsive UI

## Overview

Replace the fixed 800×600 canvas with a fullscreen, aspect-ratio-preserving layout system. A single `LayoutSystem` class computes a uniform scale factor and centering offset from the base resolution. All scenes and UI components reference it for positions and sizes. Phaser's Scale Manager handles canvas resizing; `LayoutSystem` handles coordinate conversion.

Implementation proceeds bottom-up: core system first, then Phaser config and HTML/CSS, then scene-by-scene integration, then UI components, and finally tests.

## Tasks

- [x] 1. Create LayoutSystem core class
  - [x] 1.1 Create `src/systems/LayoutSystem.ts` with the LayoutSystem class
    - Import `LAYOUT` from `InputSystem` for `SCENE_W` (800) and `SCENE_H` (600) base constants
    - Implement `update(viewportWidth, viewportHeight)` that computes `scaleFactor = min(vw / SCENE_W, vh / SCENE_H)`, `offsetX = (vw - SCENE_W * scaleFactor) / 2`, `offsetY = (vh - SCENE_H * scaleFactor) / 2`
    - Add defensive clamp: if viewport dimensions are <= 0, set scaleFactor to a small positive value (0.01)
    - Implement `getScaleFactor()`, `getOffsetX()`, `getOffsetY()`
    - Implement `scaleX(baseX)` returning `baseX * scaleFactor + offsetX`
    - Implement `scaleY(baseY)` returning `baseY * scaleFactor + offsetY`
    - Implement `scaleValue(baseValue)` returning `baseValue * scaleFactor`
    - Implement `scaleFontSize(baseFontSize)` returning `max(baseFontSize * scaleFactor, 12)`
    - Implement `scaleWithMin(baseValue, minCSS)` returning `max(baseValue * scaleFactor, minCSS)`
    - Export the class as a named export
    - _Requirements: 2.1, 2.2, 2.3, 5.2, 6.5, 8.1, 8.2, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 1.2 Write property test: scale factor and centering (Property 1)
    - **Property 1: Scale factor and centering are correct for any viewport**
    - **Validates: Requirements 1.3, 2.1, 2.3, 3.1, 3.2, 4.3, 8.1, 8.2, 8.3**
    - Create `src/tests/layoutSystem.test.ts`
    - Use fast-check to generate random viewport width (1–4000) and height (1–4000)
    - Assert scaleFactor equals `min(vw/800, vh/600)` within floating-point tolerance
    - Assert offsetX equals `(vw - 800 * scaleFactor) / 2`
    - Assert offsetY equals `(vh - 600 * scaleFactor) / 2`
    - Assert `800 * scaleFactor <= vw` and `600 * scaleFactor <= vh`
    - Assert `offsetX >= 0` and `offsetY >= 0`
    - Include comment tag: `// Feature: responsive-ui, Property 1: scale factor and centering are correct for any viewport`

  - [ ]* 1.3 Write property test: uniform scaling (Property 2)
    - **Property 2: Uniform scaling across all conversion methods**
    - **Validates: Requirements 2.2, 3.4, 5.1, 5.3, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 12.3**
    - Generate random viewport dimensions (1–4000) and two random base coordinates (0–800, 0–600)
    - Assert `scaleX(x) === x * getScaleFactor() + getOffsetX()`
    - Assert `scaleY(y) === y * getScaleFactor() + getOffsetY()`
    - Assert `scaleValue(v) === v * getScaleFactor()`
    - Assert distance between scaled points equals distance between base points times scaleFactor
    - Include comment tag: `// Feature: responsive-ui, Property 2: uniform scaling across all conversion methods`

  - [ ]* 1.4 Write property test: touch button minimum size (Property 3)
    - **Property 3: Touch button minimum size enforcement**
    - **Validates: Requirements 5.2**
    - Generate random viewport dimensions (1–4000) and random base button size (10–200)
    - Assert `scaleWithMin(baseSize, 40) >= 40`
    - Assert when `baseSize * scaleFactor >= 40`, result equals `baseSize * scaleFactor`
    - Assert when `baseSize * scaleFactor < 40`, result equals `40`
    - Include comment tag: `// Feature: responsive-ui, Property 3: touch button minimum size enforcement`

  - [ ]* 1.5 Write property test: font size minimum (Property 4)
    - **Property 4: Font size minimum enforcement**
    - **Validates: Requirements 6.5**
    - Generate random viewport dimensions (1–4000) and random base font size (1–100)
    - Assert `scaleFontSize(baseFontSize) >= 12`
    - Assert when `baseFontSize * scaleFactor >= 12`, result equals `baseFontSize * scaleFactor`
    - Assert when `baseFontSize * scaleFactor < 12`, result equals `12`
    - Include comment tag: `// Feature: responsive-ui, Property 4: font size minimum enforcement`

  - [ ]* 1.6 Write unit tests for LayoutSystem API and behavior
    - Add to `src/tests/layoutSystem.test.ts`
    - Test that LayoutSystem exports `getScaleFactor`, `scaleX`, `scaleY`, `scaleValue`, `scaleFontSize`, `scaleWithMin` methods (Req 12.4)
    - Test that LayoutSystem has no orientation-specific code paths (Req 12.2)
    - Test that LayoutSystem has no gameplay-parameter methods (no speed, spawn, timing) (Req 4.2, 4.4)
    - Test at base resolution (800×600): scaleFactor is 1, offsets are 0 (Req 2.1, 2.3)
    - Test at double resolution (1600×1200): scaleFactor is 2, offsets are 0 (Req 8.1)
    - Test at wide viewport (1600×600): scaleFactor is 1, horizontal centering offset is 400 (Req 2.3)
    - Test at tall viewport (800×1200): scaleFactor is 1, vertical centering offset is 300 (Req 2.3)
    - _Requirements: 2.1, 2.3, 4.2, 4.4, 8.1, 12.2, 12.4_

- [x] 2. Checkpoint — Verify LayoutSystem core
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Update Phaser config and HTML/CSS for fullscreen
  - [x] 3.1 Update `src/main.ts` Phaser config with Scale Manager settings
    - Move `width` and `height` inside a `scale` block
    - Set `mode: Phaser.Scale.FIT`
    - Set `autoCenter: Phaser.Scale.CENTER_BOTH`
    - Keep `width: 800`, `height: 600` as the base resolution
    - Keep `backgroundColor: '#1a1a2e'`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 3.2 Update `index.html` with fullscreen CSS
    - Add a `<style>` block in `<head>` with `html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; background: #1a1a2e; }`
    - Background color matches the game background for seamless letterbox/pillarbox
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 3.3 Extend `src/tests/config.test.ts` with Phaser scale config and CSS tests
    - Test that `main.ts` contains `Phaser.Scale.FIT` or `Scale.FIT` (Req 9.1, 9.2)
    - Test that `main.ts` contains `Phaser.Scale.CENTER_BOTH` or `Scale.CENTER_BOTH` (Req 9.3)
    - Test that `index.html` contains CSS with `margin: 0`, `padding: 0`, `overflow: hidden` (Req 10.1)
    - Test that `index.html` contains CSS with `width: 100%` and `height: 100%` (Req 10.2)
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2_

- [x] 4. Integrate LayoutSystem into GameScene
  - [x] 4.1 Update `src/scenes/GameScene.ts` to create and use LayoutSystem
    - Import `LayoutSystem` from `../systems/LayoutSystem`
    - Create a `LayoutSystem` instance as a class property
    - In `create()`, call `layoutSystem.update(this.scale.width, this.scale.height)`
    - Listen to `this.scale.on('resize', (gameSize) => ...)` to call `layoutSystem.update()` and trigger re-layout
    - _Requirements: 9.4, 3.3, 12.1_

  - [x] 4.2 Update GameScene `drawLayout()` to use LayoutSystem for all static graphics
    - Replace all direct `LAYOUT` coordinate usage in `drawLayout()` with `layoutSystem.scaleX()`, `scaleY()`, `scaleValue()` calls
    - Conveyor belt rect: `layoutSystem.scaleX(LAYOUT.BELT_X)`, `scaleY(LAYOUT.BELT_Y)`, `scaleValue(LAYOUT.BELT_W)`, `scaleValue(LAYOUT.BELT_H)`
    - Belt thickness: `layoutSystem.scaleValue(LAYOUT.BELT_THICKNESS)`
    - Inlet/outlet lines: scale start and end coordinates
    - Upgrade terminal rect: scale position and dimensions
    - Movement area nodes: scale center, offsets, and node sizes
    - Store the layout graphics reference so it can be cleared and redrawn on resize
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 4.3 Update GameScene rendering to use LayoutSystem for dynamic elements
    - Player graphic: use `layoutSystem.scaleX(x)`, `scaleY(y)` for position, `scaleValue(40)` for size
    - Item rendering: use `layoutSystem.scaleX(item.x)`, `scaleY(item.y)` for position, `scaleValue(ITEM_SIZE)` for size
    - Machine rendering: scale all machine rect positions and dimensions through LayoutSystem
    - Score text: position at `layoutSystem.scaleX(LAYOUT.SCENE_W - 16)`, `scaleY(16)`, font size `layoutSystem.scaleFontSize(24)`
    - Game over text: position at `layoutSystem.scaleX(LAYOUT.CENTER_X)`, `scaleY(LAYOUT.CENTER_Y)`, font size `layoutSystem.scaleFontSize(48)`
    - _Requirements: 6.1, 6.2, 7.3, 7.4_

  - [x] 4.4 Add resize handler to GameScene that redraws layout and repositions all elements
    - On resize event: clear and redraw static layout graphics via `drawLayout()`
    - Reposition score text and game over text
    - Update font sizes on score and game over text
    - Pass updated LayoutSystem to UI components (TouchButtonUI, SequenceInputUI)
    - _Requirements: 1.2, 3.3, 9.4_

- [x] 5. Integrate LayoutSystem into StartScene
  - [x] 5.1 Update `src/scenes/StartScene.ts` to use LayoutSystem
    - Import `LayoutSystem` from `../systems/LayoutSystem`
    - Create a `LayoutSystem` instance in `create()`
    - Call `layoutSystem.update(this.scale.width, this.scale.height)`
    - Position title text at `layoutSystem.scaleX(400)`, `scaleY(260)` with font size `layoutSystem.scaleFontSize(48)`
    - Position prompt text at `layoutSystem.scaleX(400)`, `scaleY(340)` with font size `layoutSystem.scaleFontSize(20)`
    - Listen to resize event to reposition and resize text
    - _Requirements: 6.4, 12.1_

- [x] 6. Integrate LayoutSystem into UI components
  - [x] 6.1 Update `src/ui/TouchButtonUI.ts` to use LayoutSystem
    - Accept a `LayoutSystem` parameter in the constructor
    - Compute button positions using `layoutSystem.scaleX()` / `scaleY()` with base `BUTTON_POSITIONS` coordinates
    - Compute button size using `layoutSystem.scaleWithMin(BUTTON_SIZE, 40)` for the 40px minimum
    - Label font size uses `layoutSystem.scaleFontSize(20)`
    - Add a `resize(layoutSystem: LayoutSystem)` method that repositions and resizes all buttons and labels
    - Scale shake feedback animation offsets with `layoutSystem.scaleValue()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.3_

  - [x] 6.2 Update `src/ui/SequenceInputUI.ts` to use LayoutSystem
    - Accept a `LayoutSystem` parameter in the constructor
    - Compute arrow positions using `layoutSystem.scaleX()` / `scaleY()` with base coordinates
    - Step text font size uses `layoutSystem.scaleFontSize(32)`
    - Label text font size uses `layoutSystem.scaleFontSize(18)`
    - Step spacing scales with `layoutSystem.scaleValue(36)`
    - Cancelled text font size uses `layoutSystem.scaleFontSize(24)`
    - _Requirements: 6.3, 12.1_

  - [x] 6.3 Update GameScene constructor calls to pass LayoutSystem to UI components
    - Pass `layoutSystem` to `new TouchButtonUI(this, this.actionLayer, layoutSystem)`
    - Pass `layoutSystem` to `new SequenceInputUI(this, layoutSystem)`
    - Call `touchButtonUI.resize(layoutSystem)` in the resize handler
    - _Requirements: 12.1, 12.3_

- [x] 7. Checkpoint — Verify full integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Final checkpoint — Ensure all tests pass
  - Run `npm test` to verify all existing and new tests pass
  - Ensure no regressions in existing test suites
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the four correctness properties from the design document
- The `LAYOUT` constant in `InputSystem.ts` remains unchanged as the base-resolution reference
- `InputSystem` itself requires no changes — it continues to return base-resolution coordinates
- Checkpoints ensure incremental validation at key integration points
