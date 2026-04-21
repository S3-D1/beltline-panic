# Implementation Plan: upgrade-terminal

## Overview

Add the first playable upgrade terminal with a budget economy, configurable upgrade pricing, four upgrade types per machine, automation behavior, and activity indicators. Introduce `GameManager` to centralize score, budget, and upgrade logic. Add `UpgradeConfig` for data-driven tuning, `AutomationSystem` for timer-based auto-processing, and `TerminalUI` for the two-phase upgrade interaction flow. Modify `MachineSystem` to support auto-processing and activity state. Update `GameScene` to wire everything together with budget display, activity indicators, and input routing.

## Tasks

- [x] 1. Create UpgradeConfig with upgrade data and direction mappings
  - [x] 1.1 Create `src/data/UpgradeConfig.ts` with all exported types and constants
    - Define `UpgradeConfigData` interface with basePrices, maxLevel, all increment values, automation timing values
    - Export `UPGRADE_CONFIG` constant with: machine1=50, machine2=250, machine3=1000, maxLevel=10, capacityIncrement=1, qualityIncrement=0.1, sequenceLengthIncrement=1, automationIncrement=1, automationBaseTimingMs=1100, automationSpeedReductionMs=100
    - Define and export `UpgradeType` as `'capacity' | 'quality' | 'speed' | 'automation'`
    - Export `UPGRADE_DIRECTION_MAP`: up→capacity, right→automation, down→quality, left→speed
    - Export `MACHINE_DIRECTION_MAP`: up→machine1, right→machine2, down→machine3, left→null
    - _Requirements: 1.4, 1.5, 5.1–5.4, 6.1–6.4, 9.5, 18.1, 18.3_

- [x] 2. Create GameManager with score, budget, upgrade levels, and purchase logic
  - [x] 2.1 Create `src/systems/GameManager.ts` with the GameManager class
    - Initialize score=0, budget=0, upgradeLevels for machine1/machine2/machine3 all at {capacity:0, quality:0, speed:0, automation:0}
    - Implement `getScore()`, `getBudget()`, `getUpgradeLevels(machineId)`, `getUpgradeLevel(machineId, type)`
    - Implement `addPayout(value)`: add value to both score and budget
    - Implement `getUpgradeCost(machineId, type)`: return `UPGRADE_CONFIG.basePrices[machineId] * Math.pow(2, currentLevel)`
    - Implement `attemptPurchase(machineId, type)`: check level < maxLevel AND budget >= cost; if valid, deduct cost, increment level, return true; otherwise return false
    - Implement `applyUpgrades(machineId, machine)`: set machine.capacity, workQuality, requiredSequenceLength, automationLevel based on current levels and config increments added to MACHINE_DEFAULTS
    - Implement `getAutomationTiming(machineId)`: return automationBaseTimingMs - (speedLevel * automationSpeedReductionMs)
    - Read all values from UPGRADE_CONFIG, not hardcoded literals
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 3.1, 3.2, 3.3, 6.5, 6.6, 6.7, 7.1, 7.2, 8.1, 8.2, 9.1–9.5, 10.1, 11.1, 11.2, 12.1, 12.2, 13.2, 18.2_

- [x] 3. Add autoProcess method and activity state to MachineSystem
  - [x] 3.1 Modify `src/systems/MachineSystem.ts` to add automation support
    - Add `autoProcessing: boolean` field to MachineState interface in MachineConfig.ts (default false)
    - Add `autoProcess(machineId: string): ConveyorItem | null` method to MachineSystem
      - Find machine by id, check heldItems.length > 0
      - Pop first held item, set item.state = outputStatus, set loopProgress = zoneProgressEnd, onInlet=false, onOutlet=false
      - Return the item (or null if no items)
    - Add `resetAutoProcessingFlags()` method to clear all autoProcessing flags (called at start of each frame)
    - Add `setAutoProcessing(machineId: string)` method to set the flag
    - Add `isActive(machineId: string): boolean` accessor: returns true if activeInteraction !== null OR autoProcessing === true
    - _Requirements: 13.3, 14.1, 14.2, 14.3, 14.5, 15.2, 15.3_

- [x] 4. Create AutomationSystem for timer-based auto-processing
  - [x] 4.1 Create `src/systems/AutomationSystem.ts` with the AutomationSystem class
    - Initialize timers record for machine1, machine2, machine3 at 0
    - Implement `update(delta, machines, gameManager, machineSystem)`:
      - For each machine: skip if automationLevel === 0
      - Skip and reset timer if machine has activeInteraction (manual interaction active)
      - Skip if heldItems.length === 0
      - Increment timer by delta
      - If timer >= gameManager.getAutomationTiming(machineId): call machineSystem.autoProcess(machineId), add returned item to belt, set autoProcessing flag, reset timer
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 5. Checkpoint — Verify new system files compile
  - Run `npm run build` and ensure no errors. Ask the user if questions arise.

- [x] 6. Create TerminalUI for upgrade interaction flow
  - [x] 6.1 Create `src/ui/TerminalUI.ts` with the TerminalUI class
    - Implement constructor taking scene, layoutSystem, gameManager
    - Implement `open()`: set active, show machine selection phase UI
    - Implement `close()`: set inactive, destroy all UI elements
    - Implement `isActive()`, `getPhase()`, `getSelectedMachineId()` accessors
    - Implement `handleInput(direction, interact)`:
      - If interact: close terminal (machine-select) or go back to machine-select (upgrade-select)
      - If direction in machine-select: map to machine via MACHINE_DIRECTION_MAP, if not null switch to upgrade-select
      - If direction in upgrade-select: map to upgrade type via UPGRADE_DIRECTION_MAP, call gameManager.attemptPurchase, refresh UI
    - Implement `renderMachineSelect()`: show directional labels for machine selection, left shows no option
    - Implement `renderUpgradeSelect()`: show selected machine name, four upgrade buttons with type/cost/affordability
      - Cost text green (#00ff00) if budget >= cost, red (#ff0000) if budget < cost
      - Show "MAX" if level === 10
    - Use Phaser.GameObjects.Text and simple rectangles, consistent with placeholder style
    - Support resize via layoutSystem
    - _Requirements: 4.2, 5.1–5.5, 6.1–6.9, 16.1–16.7, 17.1, 17.2_

- [x] 7. Integrate all new systems into GameScene
  - [x] 7.1 Update `src/scenes/GameScene.ts` to wire GameManager
    - Import GameManager, instantiate in create()
    - Replace `this.score += val` with `this.gameManager.addPayout(val)`
    - Update score display to read from gameManager.getScore()
    - Add budget text display next to score with "$" prefix
    - Update budget display each frame from gameManager.getBudget()
    - Handle resize for budget text
    - _Requirements: 1.7, 2.1, 2.2, 2.3, 3.1_

  - [x] 7.2 Update `src/scenes/GameScene.ts` to wire AutomationSystem
    - Import AutomationSystem, instantiate in create()
    - Call automationSystem.update() each frame with delta, machines, gameManager, machineSystem
    - Handle returned auto-processed items: push back to itemSystem.getItems()
    - Call machineSystem.resetAutoProcessingFlags() at start of each frame
    - _Requirements: 14.1, 14.4_

  - [x] 7.3 Update `src/scenes/GameScene.ts` to wire TerminalUI and input routing
    - Import TerminalUI, instantiate in create()
    - Add terminalMode boolean flag
    - In update(): if terminalMode, route direction+interact to terminalUI.handleInput()
    - If terminalUI closes, exit terminalMode
    - If not terminalMode and player at 'left' and interact: enter terminalMode, open terminalUI
    - Block player movement and machine interaction while terminalMode is active
    - After any purchase, call gameManager.applyUpgrades() for the affected machine
    - _Requirements: 4.1, 4.3, 4.4, 6.8, 6.9_

  - [x] 7.4 Add activity indicator rendering to GameScene
    - For each machine, draw a small filled circle (radius ~6) in the top-right corner of the machine rectangle
    - Color: 0x00ff00 if machineSystem.isActive(machineId), 0xff0000 otherwise
    - Render indicators in the renderMachines() method
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 8. Checkpoint — Verify full integration builds and runs
  - Run `npm run build` and ensure no errors. Ask the user if questions arise.
  - Verify terminal mode can be entered and exited.
  - Verify budget display appears next to score.
  - Verify activity indicators render on machines.

- [x] 9. Write GameManager unit and property tests
  - [x] 9.1 Create `src/tests/gameManager.test.ts` with unit tests
    - **Example 1**: GameManager initial score is 0
    - **Example 2**: GameManager initial budget is 0
    - **Example 3**: Base prices match config (machine1=50, machine2=250, machine3=1000)
    - **Example 4**: Config has all required fields (basePrices, maxLevel, all increments, timing values)
    - **Example 5**: Machine direction map: up→machine1, right→machine2, down→machine3, left→null
    - **Example 6**: Upgrade direction map: up→capacity, right→automation, down→quality, left→speed
    - **Example 7**: Cost at level 0 = base price
    - **Example 8**: Cost at level 1 = base price × 2
    - **Example 9**: Cost at level 2 = base price × 4
    - **Example 10**: Automation timing at level 0 = 1100ms
    - **Example 11**: Automation level starts at 0 for all machines
    - **Example 12**: Terminal does not offer self-upgrade (no 'terminal' in MACHINE_DIRECTION_MAP values)
    - **Example 13**: Config object is imported from data file, not defined in GameManager
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1–5.4, 6.1–6.4, 9.2–9.4, 12.1, 13.1, 17.1, 17.2, 18.2, 18.3_

  - [ ]* 9.2 Write property test — Property 1: upgrade cost follows exponential formula
    - `// Feature: upgrade-terminal, Property 1: upgrade cost follows exponential formula`
    - Generate random machineId, upgradeType, level (0–9); set level via purchases with sufficient budget
    - Assert: getUpgradeCost equals basePrices[machineId] * Math.pow(2, level)
    - _Requirements: 9.1–9.4_

  - [ ]* 9.3 Write property test — Property 2: successful purchase deducts exact cost
    - `// Feature: upgrade-terminal, Property 2: successful purchase deducts exact cost and increments level`
    - Generate random machineId, upgradeType, sufficient budget
    - Assert: budget decreased by cost, level increased by 1
    - _Requirements: 6.5, 1.6_

  - [ ]* 9.4 Write property test — Property 3: insufficient budget rejects purchase
    - `// Feature: upgrade-terminal, Property 3: insufficient budget rejects purchase without state change`
    - Generate random machineId, upgradeType, budget < cost
    - Assert: attemptPurchase returns false, budget and level unchanged
    - _Requirements: 6.6, 7.1, 7.2_

  - [ ]* 9.5 Write property test — Property 4: max level rejects purchase
    - `// Feature: upgrade-terminal, Property 4: max level rejects purchase without state change`
    - Generate random machineId, upgradeType; purchase 10 times to max
    - Assert: 11th attemptPurchase returns false, budget and level unchanged
    - _Requirements: 6.7, 8.1, 8.2_

  - [ ]* 9.6 Write property test — Property 5: budget never goes below zero
    - `// Feature: upgrade-terminal, Property 5: budget never goes below zero`
    - Generate random sequence of addPayout and attemptPurchase calls (1–50 ops)
    - Assert: getBudget() >= 0 after every operation
    - _Requirements: 7.1, 7.2_

  - [ ]* 9.7 Write property test — Property 6: score never decreases
    - `// Feature: upgrade-terminal, Property 6: score never decreases`
    - Generate random sequence of addPayout and attemptPurchase calls (1–50 ops)
    - Assert: score is monotonically non-decreasing
    - _Requirements: 3.3_

  - [ ]* 9.8 Write property test — Property 7: payout adds equally to score and budget
    - `// Feature: upgrade-terminal, Property 7: payout adds equally to score and budget`
    - Generate random positive payout value (1–10000)
    - Assert: both score and budget increase by exactly that value
    - _Requirements: 3.1, 3.2_

  - [ ]* 9.9 Write property test — Property 8: all upgrade levels start at zero
    - `// Feature: upgrade-terminal, Property 8: all upgrade levels start at zero`
    - Generate random machineId, random upgradeType
    - Assert: getUpgradeLevel returns 0 on fresh GameManager
    - _Requirements: 1.3_

  - [ ]* 9.10 Write property test — Property 9: capacity upgrade effect is correct
    - `// Feature: upgrade-terminal, Property 9: capacity upgrade effect is correct`
    - Generate random machineId, random N (0–10) capacity upgrades
    - Assert: after applyUpgrades, machine.capacity === MACHINE_DEFAULTS.capacity + N * capacityIncrement
    - _Requirements: 10.1_

  - [ ]* 9.11 Write property test — Property 10: quality upgrade effect is correct
    - `// Feature: upgrade-terminal, Property 10: quality upgrade effect is correct`
    - Generate random machineId, random N (0–10) quality upgrades
    - Assert: workQuality ≈ MACHINE_DEFAULTS.workQuality + N * qualityIncrement AND requiredSequenceLength === MACHINE_DEFAULTS.requiredSequenceLength + N * sequenceLengthIncrement
    - _Requirements: 11.1, 11.2_

  - [ ]* 9.12 Write property test — Property 11: automation timing is correct
    - `// Feature: upgrade-terminal, Property 11: automation timing is correct`
    - Generate random machineId, random speed level (0–10)
    - Assert: getAutomationTiming === automationBaseTimingMs - level * automationSpeedReductionMs
    - _Requirements: 12.1, 12.2_

  - [ ]* 9.13 Write property test — Property 12: purchase round-trip preserves budget + cost identity
    - `// Feature: upgrade-terminal, Property 12: purchase round-trip preserves budget + cost identity`
    - Generate random machineId, upgradeType, sufficient budget
    - Assert: preBudget === postBudget + cost
    - _Requirements: 6.5, 7.1_

- [x] 10. Write integration tests
  - [x] 10.1 Add integration unit tests to existing test files
    - **Example 14**: `GameScene.ts` source imports GameManager — append to `src/tests/gameScene.test.ts`
    - **Example 15**: `GameScene.ts` source imports AutomationSystem — append to `src/tests/gameScene.test.ts`
    - **Example 16**: `MachineSystem.ts` source has autoProcess method — append to `src/tests/machineSystem.test.ts`
    - _Requirements: Integration, 19.4_

- [x] 11. Final checkpoint — Verify full build and all tests pass
  - Run `npm run build` and ensure no errors.
  - Run `npx vitest --run` and ensure all tests pass.
  - Verify the project runs correctly in the browser.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- All property tests use **fast-check** with a minimum of 100 iterations each
- `GameManager.applyUpgrades()` must be called after each purchase to sync machine properties
- The `autoProcessing` flag on MachineState is a per-frame visual flag, reset at the start of each frame
- Input routing priority: terminal mode > machine interaction > navigation
- The terminal visual block already exists in GameScene (blue rectangle at left position) — no new visual element needed
- Budget display uses "$" prefix to distinguish from score
- All upgrade values are read from `UPGRADE_CONFIG` in `UpgradeConfig.ts` for easy tuning
- The `MACHINE_DIRECTION_MAP` intentionally maps left to null — no machine selection on left
- Automation does not simulate sequence inputs — it directly sets output status
