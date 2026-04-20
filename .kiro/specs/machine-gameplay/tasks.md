# Implementation Plan: machine-gameplay

## Overview

Replace automatic item state transitions with a player-driven machine interaction system. Add `MachineConfig.ts`, `MachineSystem.ts`, and `SequenceInputUI.ts`. Modify `ItemSystem.ts` to remove transition zone logic. Update `GameScene.ts` to wire the machine system, handle input routing, and render machine states.

## Tasks

- [x] 1. Create MachineConfig with machine definitions and types
  - [x] 1.1 Create `src/data/MachineConfig.ts` with all exported types and constants
    - Define `Direction`, `SequenceStrategy`, `MachineDefinition`, `MachineState`, `ActiveInteraction` types
    - Export `BASE_SEQUENCE`, `MACHINE_DEFAULTS`, `MACHINE_DEFINITIONS` array
    - Machine 1: accepted `['new']`, output `'processed'`, position `'up'`, zone 0.10–0.18, strategy `'fixed'`, fixedSequence `[L,U,U,R,L,D]`
    - Machine 2: accepted `['processed']`, output `'upgraded'`, position `'right'`, zone 0.35–0.43, strategy `'per-run'`
    - Machine 3: accepted `['processed','upgraded']`, output `'packaged'`, position `'down'`, zone 0.60–0.68, strategy `'per-item'`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2, 12.3, 13.1_

- [x] 2. Create MachineSystem with intake, interaction, and output logic
  - [x] 2.1 Create `src/systems/MachineSystem.ts` with the MachineSystem class
    - Implement constructor: initialize `MachineState` for each definition with defaults, generate per-run sequence for Machine 2
    - Export `MachineUpdateResult` interface
    - Export `generateRandomSequence(length)` and `getActiveSequence(machine, baseSeq)` as module-level functions
    - Implement `update(items, playerPosition, interactJustPressed, directionJustPressed)`:
      - Step 1: Intake check — scan items for matching status, aligned progress (midpoint ± 0.01), below capacity; remove from belt, add to heldItems
      - Step 2: Interaction start — if interact pressed, no active interaction, player at machine position, machine has held item → create ActiveInteraction with currentStep=0, generate sequence per strategy
      - Step 3: Interaction step — if active and direction pressed: correct → advance step, if complete → success (set output state, return item at zoneProgressEnd); incorrect → abort (return item unchanged at zoneProgressEnd)
      - Step 4: Interaction cancel — if active and interact pressed → cancel (return item unchanged at zoneProgressEnd)
    - Implement `getMachines()`, `getActiveInteraction()` accessors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.4, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 13.2, 13.3_

- [x] 3. Remove automatic state transitions from ItemSystem
  - [x] 3.1 Modify `src/systems/ItemSystem.ts` to remove transition zone logic
    - Remove the loop that checks `TRANSITION_ZONES` and changes `item.state`
    - Remove the `TRANSITION_ZONES` import (if no longer needed)
    - Keep all other logic (spawning, conveyor update, outlet, collision) unchanged
    - _Requirements: 11.1, 11.2_

- [x] 4. Create SequenceInputUI for interaction feedback
  - [x] 4.1 Create `src/ui/SequenceInputUI.ts` with the SequenceInputUI class
    - Implement constructor taking `Phaser.Scene`
    - Implement `show(sequence, machineId)` — create text objects for each step as directional arrows, show machine label
    - Implement `highlightStep(stepIndex)` — set matched steps to green
    - Implement `showResult(result)` — flash red on fail, show "Cancelled" on cancel, flash all green on success, then hide after brief delay
    - Implement `hide()` — destroy/hide all text objects
    - Implement `isVisible()` accessor
    - Use `Phaser.GameObjects.Text` only, no external assets
    - _Requirements: 4.3, 5.1, 5.2, 5.4, 7.4, 10.1, 10.2, 10.3_

- [x] 5. Checkpoint — Verify new files compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate MachineSystem and SequenceInputUI into GameScene
  - [x] 6.1 Update `src/scenes/GameScene.ts` to wire MachineSystem
    - Import `MachineSystem`, `SequenceInputUI`, `MachineConfig` types
    - Add `interactKey` (Space) registration in `create()`
    - Instantiate `MachineSystem` and `SequenceInputUI` in `create()`
    - In `update()`: skip `inputSystem.update()` when interaction is active (input routing)
    - In `update()`: read player position, interact just-pressed, direction just-pressed; call `machineSystem.update()`
    - Handle `MachineUpdateResult`: remove intaken items from rendering, add returned items back
    - Update `SequenceInputUI` based on interaction state changes
    - _Requirements: 4.1, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2_

  - [x] 6.2 Add active machine visual feedback in `GameScene`
    - In machine rendering: use distinct color (e.g. yellow `0xffcc00`) for machines with `activeInteraction !== null`
    - Keep default blue (`0x4488ff`) for inactive machines
    - _Requirements: 9.1, 9.2_

- [x] 7. Checkpoint — Verify full integration builds and runs
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write MachineSystem tests
  - [x] 8.1 Create `src/tests/machineSystem.test.ts` with unit tests for machine config
    - **Example 1**: Machine 1 config matches requirements (accepted, output, fixed sequence)
    - **Example 2**: Machine 2 config matches requirements (accepted, output, per-run strategy)
    - **Example 3**: Machine 3 config matches requirements (accepted, output, per-item strategy)
    - **Example 4**: Machine position mappings (1→up, 2→right, 3→down)
    - **Example 5**: Machine properties are mutable (can reassign capacity, automationLevel, etc.)
    - **Example 9**: `MachineSystem.ts` source does not import Phaser physics
    - _Requirements: 1.3, 1.4, 1.5, 12.1, 12.2, 12.3, 13.1_

  - [ ]* 8.2 Write property test — Property 1: machine defaults are correct
    - `// Feature: machine-gameplay, Property 1: machine defaults are correct`
    - Generate a random machine index (0–2); assert all default values and required fields
    - _Requirements: 1.1, 1.2_

  - [ ]* 8.3 Write property test — Property 2: sequence adaptation trims and extends
    - `// Feature: machine-gameplay, Property 2: sequence adaptation trims and extends correctly`
    - Generate a random 6-step base sequence and random length N (1–20); assert output length and cycling
    - _Requirements: 2.4, 2.5, 13.3_

  - [ ]* 8.4 Write property test — Property 3: per-run sequence consistency
    - `// Feature: machine-gameplay, Property 3: per-run sequence is consistent across items`
    - Create MachineSystem, retrieve Machine 2 sequence multiple times; assert identical
    - _Requirements: 2.2_

  - [ ]* 8.5 Write property test — Property 4: per-item sequence validity
    - `// Feature: machine-gameplay, Property 4: per-item sequence is valid`
    - Trigger Machine 3 intake multiple times; assert each sequence is 6 valid directions
    - _Requirements: 2.3_

  - [ ]* 8.6 Write property test — Property 5: intake occurs when conditions are met
    - `// Feature: machine-gameplay, Property 5: intake occurs when conditions are met`
    - Generate matching item at aligned progress, machine below capacity; assert intake
    - _Requirements: 3.1, 3.3_

  - [ ]* 8.7 Write property test — Property 6: capacity enforcement rejects intake
    - `// Feature: machine-gameplay, Property 6: capacity enforcement rejects intake`
    - Fill machine to capacity, create another matching item; assert no intake
    - _Requirements: 3.2, 13.2_

  - [ ]* 8.8 Write property test — Property 7: interaction starts under correct conditions
    - `// Feature: machine-gameplay, Property 7: interaction starts under correct conditions`
    - Machine with held item, player at position, press interact; assert ActiveInteraction created
    - _Requirements: 4.1, 4.2, 8.1_

  - [ ]* 8.9 Write property test — Property 8: only one interaction active at a time
    - `// Feature: machine-gameplay, Property 8: only one interaction can be active at a time`
    - Start interaction on one machine, attempt on another; assert first remains
    - _Requirements: 4.4_

  - [ ]* 8.10 Write property test — Property 9: wrong input aborts and returns item unchanged
    - `// Feature: machine-gameplay, Property 9: wrong input aborts and returns item unchanged`
    - Active interaction, wrong direction; assert abort, item returned unchanged
    - _Requirements: 5.3, 7.1, 7.3_

  - [ ]* 8.11 Write property test — Property 10: successful completion
    - `// Feature: machine-gameplay, Property 10: successful completion changes state and returns item`
    - Feed all correct steps; assert item state changed, returned at zoneProgressEnd
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 8.12 Write property test — Property 11: cancel returns item unchanged
    - `// Feature: machine-gameplay, Property 11: cancel returns item unchanged`
    - Active interaction, press interact; assert item returned unchanged
    - _Requirements: 7.2, 7.3_

  - [ ]* 8.13 Write property test — Property 12: sequence progress resets
    - `// Feature: machine-gameplay, Property 12: sequence progress resets per interaction`
    - Two sequential interactions; assert second starts at currentStep 0
    - _Requirements: 8.1, 8.2_

- [x] 9. Write ItemSystem transition removal test
  - [ ]* 9.1 Write property test — Property 13: ItemSystem no longer transitions
    - `// Feature: machine-gameplay, Property 13: ItemSystem no longer transitions item states`
    - Random item state and progress in transition zone; assert state unchanged after update
    - Append to `src/tests/itemSystem.test.ts`
    - _Requirements: 11.1, 11.2_

  - [x] 9.2 Write unit test: ItemSystem source no longer applies transition zones
    - **Example 6**: Verify `ItemSystem.ts` source does not iterate `TRANSITION_ZONES` to change state
    - Append to `src/tests/itemSystem.test.ts`
    - _Requirements: 11.1_

- [x] 10. Write GameScene integration tests
  - [x] 10.1 Add integration unit tests to `src/tests/gameScene.test.ts`
    - **Example 7**: `GameScene.ts` source imports and instantiates `MachineSystem`
    - **Example 8**: `GameScene.ts` source imports and instantiates `SequenceInputUI`
    - _Requirements: Integration_

- [x] 11. Final checkpoint — Verify full build and all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `npm run build` completes without errors.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests use **fast-check** with a minimum of 100 iterations each
- `getActiveSequence` and `generateRandomSequence` should be exported as standalone functions for testability
- The `TRANSITION_ZONES` constant remains in `ConveyorConfig.ts` but is no longer consumed by `ItemSystem`
- Input routing: `GameScene` skips `InputSystem.update()` while a machine interaction is active, so directional keys go to `MachineSystem` instead of player movement
- Machine zone progress ranges match the existing `TRANSITION_ZONES` values for visual consistency
