# Implementation Plan: touch-input-layer

## Overview

Add a unified input layer (ActionLayer) and five on-screen touch buttons (TouchButtonUI) to Beltline Panic. Refactor InputSystem to consume actions from ActionLayer instead of reading keys directly. Wire GameScene through ActionLayer with visual feedback on touch buttons for all input sources. Extend StartScene with pointer-to-start support. All new code is TypeScript using Phaser 3 pointer events — no new dependencies.

## Tasks

- [x] 1. Create ActionLayer — unified action dispatch system
  - [x] 1.1 Create `src/systems/ActionLayer.ts` with the ActionLayer class
    - Define and export `GameAction` type: `'up' | 'down' | 'left' | 'right' | 'interact'`
    - Implement constructor taking `Phaser.Scene`, register keyboard listeners for arrow keys, WASD, and Space via Phaser key `'down'` events calling `pushAction`
    - Guard against `scene.input.keyboard` being null (touch-only devices)
    - Implement `pushAction(action: GameAction)`: set `directionAction` for directional actions (last wins), set `interactAction = true` for interact
    - Implement `consumeActions()`: return `{ direction, interact }` and clear the buffer
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 11.1, 11.3, 11.4_

- [x] 2. Create TouchButtonUI — on-screen buttons with feedback
  - [x] 2.1 Create `src/ui/TouchButtonUI.ts` with the TouchButtonUI class
    - Define and export `FeedbackType` type: `'positive' | 'negative'`
    - Export button visual constants: `DEFAULT_ALPHA`, `DEFAULT_BORDER_COLOR`, `POSITIVE_ALPHA`, `POSITIVE_BORDER_COLOR`, `NEGATIVE_COLOR`, `NEGATIVE_ALPHA`, `FEEDBACK_DURATION`, `BUTTON_SIZE`, `BUTTON_GAP`, `BUTTON_POSITIONS`
    - Implement constructor taking `(scene, actionLayer)`: create five `Phaser.GameObjects.Rectangle` buttons in cross pattern centered on `LAYOUT.CENTER_X/CENTER_Y`
    - Set each button to `depth >= 100`, `setInteractive()`, default fill `0xffffff` at `0.15` alpha, stroke `1px` `0xaaaaaa` at `0.6` alpha
    - Add directional arrow and dot labels on each button
    - Register `pointerdown` on each button to call `actionLayer.pushAction(action)`
    - Implement `triggerFeedback(action: GameAction, type: FeedbackType)`:
      - Cancel any existing feedback timer on that button
      - Positive: increase fill alpha to `0.5`, set border to green `0x00ff00` width `2`
      - Negative: set fill to red `0xff0000` at `0.4` alpha, red border, play shake animation (x-offset steps at 40ms intervals on both rect and label)
      - Schedule `restoreDefault` after `FEEDBACK_DURATION` (150ms)
    - Implement `restoreDefault(action)`: reset fill, stroke, and x/y position to defaults
    - Implement `getButton(action)` accessor
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 11.2, 11.4_

- [x] 3. Checkpoint — Verify new files compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor InputSystem to accept direction from outside
  - [x] 4.1 Modify `src/systems/InputSystem.ts` to remove keyboard reads
    - Remove constructor `scene` parameter and all `Phaser.Input.Keyboard.Key` fields
    - Remove `getPressedDirection()` private method
    - Change `update()` signature to `update(direction: Direction | null): void`
    - Keep `LAYOUT`, `PlayerPosition`, `OPPOSITE` exports unchanged
    - Keep `getPlayerPosition()` and `getPlayerCoords()` unchanged
    - Remove the `Phaser` import (no longer needed)
    - _Requirements: 2.4, 12.2, 12.4_

- [x] 5. Rewire GameScene through ActionLayer
  - [x] 5.1 Update `src/scenes/GameScene.ts` to use ActionLayer and TouchButtonUI
    - Import `ActionLayer` and `TouchButtonUI`
    - Remove all direct keyboard key fields (`interactKey`, `dirKeyUp/Down/Left/Right`, `dirKeyW/S/A/D`)
    - Remove `getDirectionJustPressed()` method
    - In `create()`: instantiate `ActionLayer(this)`, `InputSystem()` (no scene arg), `TouchButtonUI(this, actionLayer)`
    - In `update()`: call `actionLayer.consumeActions()` to get `{ direction, interact }`
    - Pass `direction` to `inputSystem.update(direction)` when no interaction is active
    - Pass `direction` and `interact` to `machineSystem.update()`
    - _Requirements: 2.4, 12.2, 12.4_

  - [x] 5.2 Add feedback logic to GameScene update loop
    - After movement: if direction was provided and position changed → `triggerFeedback(direction, 'positive')`; if position unchanged → `triggerFeedback(direction, 'negative')`
    - During machine interaction: if direction matches expected step → `triggerFeedback(direction, 'positive')`; if wrong → `triggerFeedback(direction, 'negative')`
    - On interact: if interaction started → `triggerFeedback('interact', 'positive')`; if no interaction possible → `triggerFeedback('interact', 'negative')`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.3_

- [x] 6. Add pointer-to-start in StartScene
  - [x] 6.1 Update `src/scenes/StartScene.ts` with pointer support
    - Add `this.input.once('pointerdown', ...)` to start the game on tap/click
    - Update instruction text to `'Press any key or tap to start'`
    - Keep existing keyboard listener unchanged
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Checkpoint — Verify full integration builds and runs
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Write ActionLayer tests
  - [ ]* 8.1 Write property test — Property 1: ActionLayer action round-trip
    - `// Feature: touch-input-layer, Property 1: ActionLayer action round-trip`
    - Generate a random `GameAction` from `['up', 'down', 'left', 'right', 'interact']`
    - Create ActionLayer with mocked scene, push the action, call `consumeActions()`
    - Assert: directional actions return correct `direction`, interact returns `interact: true`
    - Assert: second `consumeActions()` returns `{ direction: null, interact: false }`
    - Create in `src/tests/actionLayer.test.ts`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 8.2 Write property test — Property 8: InputSystem state machine preserves behavior
    - `// Feature: touch-input-layer, Property 8: InputSystem state machine preserves behavior under ActionLayer`
    - Generate a random sequence of directions (length 1–20)
    - Create InputSystem, apply each direction via `update(direction)`
    - Assert: final position is one of the five valid `PlayerPosition` values
    - Assert: movement rules hold (from center any direction moves there, from directional only opposite returns to center)
    - Append to `src/tests/actionLayer.test.ts`
    - **Validates: Requirements 12.2**

- [ ] 9. Write TouchButtonUI tests
  - [ ]* 9.1 Write unit tests for TouchButtonUI creation and layout
    - **Example 1**: TouchButtonUI creates exactly 5 buttons (one per GameAction)
    - **Example 2**: Button positions match expected cross layout coordinates from `BUTTON_POSITIONS`
    - **Example 3**: Default button fill alpha is `0.15` (strongly transparent)
    - **Example 4**: Buttons have visible border (non-zero stroke width)
    - **Example 10**: Buttons have depth >= 100 (above gameplay elements)
    - **Example 11**: `triggerFeedback` is a public method accepting `(GameAction, FeedbackType)`
    - Create in `src/tests/touchButtonUI.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 5.3, 10.1, 10.2**

  - [ ]* 9.2 Write property test — Property 2: Positive feedback changes button appearance
    - `// Feature: touch-input-layer, Property 2: positive feedback changes button appearance`
    - Generate a random `GameAction`
    - Create TouchButtonUI with mocked scene, call `triggerFeedback(action, 'positive')`
    - Assert: button's fill alpha > `DEFAULT_ALPHA`, border color matches `POSITIVE_BORDER_COLOR`
    - Append to `src/tests/touchButtonUI.test.ts`
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.3 Write property test — Property 3: Negative feedback changes appearance and offsets position
    - `// Feature: touch-input-layer, Property 3: negative feedback changes button appearance and offsets position`
    - Generate a random `GameAction`
    - Create TouchButtonUI with mocked scene, record button's original x, call `triggerFeedback(action, 'negative')`
    - Assert: button's fill color is `NEGATIVE_COLOR`, button's x !== original x
    - Append to `src/tests/touchButtonUI.test.ts`
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 9.4 Write property test — Property 4: Feedback restores default after duration
    - `// Feature: touch-input-layer, Property 4: feedback restores default appearance after duration`
    - Generate a random `GameAction`, a random feedback type from `['positive', 'negative']`
    - Create TouchButtonUI, trigger feedback, advance scene time past `FEEDBACK_DURATION`
    - Assert: button's fill alpha === `DEFAULT_ALPHA`, border color === `DEFAULT_BORDER_COLOR`, x/y === original position
    - Append to `src/tests/touchButtonUI.test.ts`
    - **Validates: Requirements 6.3, 7.3, 9.3**

  - [ ]* 9.5 Write property test — Property 7: Re-triggering feedback cancels previous animation
    - `// Feature: touch-input-layer, Property 7: re-triggering feedback cancels previous animation`
    - Generate a random `GameAction`, two random feedback types
    - Trigger first feedback, then immediately trigger second feedback on the same button
    - Assert: after `FEEDBACK_DURATION` from the second trigger, button is at default; first timer does not interfere
    - Append to `src/tests/touchButtonUI.test.ts`
    - **Validates: Requirements 9.2**

- [ ] 10. Write feedback rules tests
  - [ ]* 10.1 Write property test — Property 5: Movement feedback matches position change outcome
    - `// Feature: touch-input-layer, Property 5: movement feedback matches position change outcome`
    - Generate a random `PlayerPosition`, a random directional action
    - Create InputSystem at the given position, apply the direction, check if position changed
    - Assert: if position changed → positive feedback expected; if unchanged → negative feedback expected
    - Create in `src/tests/feedbackRules.test.ts`
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 10.2 Write property test — Property 6: Machine interaction feedback matches sequence step correctness
    - `// Feature: touch-input-layer, Property 6: machine interaction feedback matches sequence step correctness`
    - Generate a random expected direction (next step in a sequence), a random input direction
    - Compare expected vs actual direction
    - Assert: if they match → positive feedback expected; if they don't → negative feedback expected
    - Append to `src/tests/feedbackRules.test.ts`
    - **Validates: Requirements 8.3, 8.4**

- [x] 11. Write integration and structural tests
  - [ ]* 11.1 Write unit tests for button dispatch
    - **Example 5**: Each of the 5 buttons dispatches the correct `GameAction` via `pointerdown`
    - Append to `src/tests/touchButtonUI.test.ts`
    - **Validates: Requirements 2.2, 3.1–3.7**

  - [x] 11.2 Add GameScene source check to existing tests
    - **Example 6**: `GameScene.ts` source does not use `JustDown` or `addKey` directly
    - Append to `src/tests/gameScene.test.ts`
    - _Requirements: 2.4_

  - [x] 11.3 Add StartScene tests
    - **Example 7**: `StartScene.ts` source contains keyboard listener (`'keydown'`)
    - **Example 8**: `StartScene.ts` source contains `pointerdown` listener
    - **Example 9**: `StartScene.ts` source contains text mentioning tap or click
    - Append to or create `src/tests/startScene.test.ts`
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 11.4 Add structural tests
    - **Example 12**: `ActionLayer.ts` exists under `src/systems`
    - **Example 13**: `TouchButtonUI.ts` exists under `src/ui`
    - **Example 14**: `package.json` has no new dependencies beyond Phaser 3
    - **Example 15**: `ConveyorSystem.ts`, `ItemSystem.ts`, `MachineSystem.ts` source unchanged (hash or content check)
    - Append to `src/tests/structure.test.ts`
    - _Requirements: 11.1, 11.2, 11.4, 12.3, 12.4_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `npm run build` completes without errors.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using **fast-check** with a minimum of 100 iterations each
- Unit tests validate specific examples and edge cases
- The `LAYOUT` and `PlayerPosition` exports remain in `InputSystem.ts` to avoid changing imports across the codebase
- `ConveyorSystem`, `ItemSystem`, and `MachineSystem` logic is not modified — only GameScene's consumption of input changes
