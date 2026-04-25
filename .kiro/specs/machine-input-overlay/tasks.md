# Implementation Plan: Machine Input Overlay

## Overview

Replace the existing `SequenceInputUI` with a new `MachineInputOverlay` component that renders a fixed-position overlay box above Machine 1 during machine interactions. Extend `MachineSystem` with auto-chain logic so completing a sequence with queued items automatically starts the next interaction. Integrate the new overlay into `GameScene`, wire up resize handling, and remove the old `SequenceInputUI` code.

## Tasks

- [x] 1. Create MachineInputOverlay UI component
  - [x] 1.1 Create `src/ui/MachineInputOverlay.ts` with overlay constants, ARROW_MAP, and class skeleton
    - Define `RESULT_DELAY`, `OVERLAY_BASE_X`, `OVERLAY_BASE_Y`, `OVERLAY_WIDTH`, `OVERLAY_HEIGHT`, `STEP_SPACING`, font sizes, `BG_COLOR`, `BG_ALPHA`, and color scheme constants
    - Define `ARROW_MAP` record mapping Direction to arrow symbols (↑, ↓, ←, →)
    - Create `MachineInputOverlay` class with constructor accepting `Phaser.Scene` and `LayoutSystem`
    - Add private fields: `bgRect`, `labelText`, `stepTexts`, `resultText`, `visible`, `currentSequence`, `currentMachineId`, `hideEvent`, `pendingTransition`
    - Implement `isVisible()` returning the `visible` flag
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 3.5_

  - [x] 1.2 Implement `show(sequence, machineId)` method
    - Call `hide()` first to clean up any existing state (double-show safety)
    - Create background rectangle at `(OVERLAY_BASE_X, OVERLAY_BASE_Y)` using `LayoutSystem.scaleX/scaleY`, with `BG_COLOR` and `BG_ALPHA`
    - Create machine label text above the sequence row, converting machineId to human-readable form (e.g., "machine1" → "Machine 1")
    - Create step indicator texts: one per Direction in the sequence, arranged horizontally with `STEP_SPACING`, all in pending color `#aaaaaa`
    - Set `visible = true`, store `currentSequence` and `currentMachineId`
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2_

  - [x] 1.3 Implement `highlightStep(stepIndex)`, `showResult(result)`, and `hide()` methods
    - `highlightStep(stepIndex)`: set steps 0 through stepIndex to green `#00ff00`, leave rest as pending; no-op if index out of range
    - `showResult('success')`: turn all step indicators green, schedule `hide()` after `RESULT_DELAY`
    - `showResult('failed')`: mark the first unhighlighted step red `#ff0000`, schedule `hide()` after `RESULT_DELAY`
    - `showResult('cancelled')`: hide step indicators, show "Cancelled" text in yellow `#ffcc00`, schedule `hide()` after `RESULT_DELAY`
    - `hide()`: destroy all game objects (`bgRect`, `labelText`, `stepTexts`, `resultText`), cancel any pending timer events, set `visible = false`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x] 1.4 Implement `transitionToNext(sequence, machineId)` for auto-chain transitions
    - If a hide timer is pending (from `showResult('success')`), store the new sequence/machineId as `pendingTransition`
    - When the timer fires, instead of hiding, call `show()` with the pending sequence to render the new sequence
    - If no timer is pending, call `show()` immediately with the new sequence
    - _Requirements: 8.2, 8.3, 8.5_

  - [x] 1.5 Implement `resize(layoutSystem)` method
    - Reposition `bgRect` to `scaleX(OVERLAY_BASE_X)`, `scaleY(OVERLAY_BASE_Y)` and rescale dimensions
    - Reposition and rescale `labelText`, all `stepTexts`, and `resultText` using updated `LayoutSystem`
    - Preserve visibility, step count, and step color states — do not reset interaction progress
    - _Requirements: 2.4, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 1.6 Write property tests for MachineInputOverlay (Properties 1–8, 10–13)
    - Create `src/tests/machineInputOverlay.property.test.ts`
    - Mock `Phaser.Scene` and `Phaser.GameObjects.Text`/`Rectangle` to test overlay logic without a running Phaser instance
    - **Property 1: Show makes overlay visible** — _Validates: Requirements 1.1_
    - **Property 2: Hide returns overlay to hidden state** — _Validates: Requirements 1.5_
    - **Property 3: Fixed position regardless of active machine** — _Validates: Requirements 2.1, 2.2, 2.3_
    - **Property 4: Step indicator count and initial color** — _Validates: Requirements 3.1, 3.4_
    - **Property 5: Step indicators use correct arrow symbols** — _Validates: Requirements 3.2_
    - **Property 6: Step indicators arranged horizontally** — _Validates: Requirements 3.3_
    - **Property 7: Highlight step preserves previous progress** — _Validates: Requirements 4.1, 4.4_
    - **Property 8: Success result turns all steps green** — _Validates: Requirements 5.1_
    - **Property 10: Transition resets sequence display to pending** — _Validates: Requirements 8.3_
    - **Property 11: Machine label matches active machine** — _Validates: Requirements 9.1_
    - **Property 12: All overlay dimensions scale with LayoutSystem** — _Validates: Requirements 11.1, 11.2, 11.3_
    - **Property 13: Resize preserves interaction state** — _Validates: Requirements 11.4_

  - [ ]* 1.7 Write unit tests for MachineInputOverlay edge cases and timing
    - Create `src/tests/machineInputOverlay.test.ts`
    - Test result display timing: success/failed/cancelled hide after exactly RESULT_DELAY (600ms)
    - Test failure marks the correct step red (the first unhighlighted step)
    - Test cancellation shows "Cancelled" text and hides step indicators
    - Test double `show()` cleans up previous state before rendering new sequence
    - Test empty sequence edge case (renders background and label, no step indicators)
    - Test invalid step index is a no-op (negative or >= sequence length)
    - Test `transitionToNext()` flow: success → pending transition → new sequence renders
    - _Requirements: 1.6, 4.2, 6.1, 7.1, 7.2, 8.2, 8.3_

- [x] 2. Checkpoint — Verify overlay component
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add auto-chain logic to MachineSystem
  - [x] 3.1 Extend `MachineUpdateResult` with `chainedInteraction` field
    - Add `chainedInteraction: ActiveInteraction | null` to the `MachineUpdateResult` interface
    - Initialize `chainedInteraction` to `null` in the `update()` method result
    - _Requirements: 8.1, 8.4_

  - [x] 3.2 Implement auto-chain in the success branch of `MachineSystem.update()`
    - After a successful interaction completes and the item is returned/queued for release, check if `machine.heldItems.length > 0`
    - If queued items exist, shift the next item, generate a new sequence via `getSequenceForMachine()`, create a new `ActiveInteraction`, assign it to both `this.activeInteraction` and `machine.activeInteraction`, and set `result.chainedInteraction`
    - If no queued items, leave `this.activeInteraction = null` as current behavior
    - _Requirements: 8.1, 8.4_

  - [ ]* 3.3 Write property test for auto-chain (Property 9)
    - Add to `src/tests/machineInputOverlay.property.test.ts` or a dedicated file
    - **Property 9: Auto-chain processes all queued items without interact**
    - Test that for any machine with N queued items (N ≥ 1), completing the current interaction automatically starts a new `ActiveInteraction` with the next item, returning `chainedInteraction` in the result
    - **Validates: Requirements 8.1, 8.4**

  - [ ]* 3.4 Write unit tests for auto-chain edge cases
    - Add to `src/tests/machineInputOverlay.test.ts` or `src/tests/machineSystem.test.ts`
    - Test auto-chain end condition: last item success → no chained interaction, overlay hides
    - Test auto-chain with single queued item → chains once, then stops
    - Test auto-chain does not trigger on failure or cancellation
    - _Requirements: 8.1, 8.4, 8.5_

- [x] 4. Checkpoint — Verify auto-chain logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate MachineInputOverlay into GameScene
  - [x] 5.1 Replace `SequenceInputUI` with `MachineInputOverlay` in GameScene
    - Replace `import { SequenceInputUI }` with `import { MachineInputOverlay }`
    - Replace `private sequenceInputUI!: SequenceInputUI` with `private machineInputOverlay!: MachineInputOverlay`
    - In `create()`, replace `new SequenceInputUI(this, this.layoutSystem)` with `new MachineInputOverlay(this, this.layoutSystem)`
    - _Requirements: 10.1, 10.2_

  - [x] 5.2 Update `updateSequenceUI()` to use MachineInputOverlay API
    - Replace `this.sequenceInputUI.show()` with `this.machineInputOverlay.show()`
    - Replace `this.sequenceInputUI.highlightStep()` with `this.machineInputOverlay.highlightStep()`
    - Replace `this.sequenceInputUI.showResult()` with `this.machineInputOverlay.showResult()`
    - Add handling for `chainedInteraction`: when `machineResult.interactionState === 'success'` and `machineResult.chainedInteraction` is not null, call `this.machineInputOverlay.transitionToNext()` with the chained interaction's sequence and machineId instead of `showResult('success')`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 5.1, 6.1, 7.1, 8.2_

  - [x] 5.3 Add resize handling for MachineInputOverlay
    - In the `scale.on('resize')` callback in `create()`, add `this.machineInputOverlay.resize(this.layoutSystem)`
    - _Requirements: 2.4, 11.1, 11.2, 11.3, 11.4_

- [x] 6. Remove old SequenceInputUI
  - [x] 6.1 Delete `src/ui/SequenceInputUI.ts`
    - Remove the file entirely
    - Verify no remaining imports or references to `SequenceInputUI` exist in the codebase
    - _Requirements: 10.1, 10.2_

  - [ ]* 6.2 Update existing tests that reference SequenceInputUI
    - Search for any test files that import or reference `SequenceInputUI` and update or remove those references
    - _Requirements: 10.2_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and timing behavior
- The overlay uses Phaser game objects (Rectangle, Text) consistent with the existing UI pattern
- Auto-chain logic is a small extension to the existing `MachineSystem.update()` success branch
