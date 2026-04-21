# Implementation Plan: Safe Release

## Overview

Implement a spacing-aware hold-and-release mechanism that prevents avoidable belt collisions. The core change is a pure-function `SafeReleaseSystem` module that gates all item releases (from machines and the inlet) behind a minimum belt spacing check. Machines gain a `pendingReleaseItems` FIFO queue, the inlet gains queuing and gated belt entry, and collision detection is updated to skip inlet-inlet pairs.

## Tasks

- [x] 1. Add spacing constants to ConveyorConfig
  - [x] 1.1 Add ITEM_DIAGONAL and MIN_BELT_SPACING constants to `src/data/ConveyorConfig.ts`
    - `ITEM_DIAGONAL = Math.sqrt(ITEM_SIZE * ITEM_SIZE + ITEM_SIZE * ITEM_SIZE)`
    - `MIN_BELT_SPACING = 2 * ITEM_DIAGONAL`
    - Export both as named constants
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create SafeReleaseSystem module
  - [x] 2.1 Create `src/systems/SafeReleaseSystem.ts` with pure functions
    - Export `distance(a: Point, b: Point): number` — Euclidean distance between two points
    - Export `isSafeToRelease(candidatePosition: Point, beltItems: ConveyorItem[], minSpacing: number): boolean`
    - `isSafeToRelease` filters items to only those on the loop (not `onInlet`, not `onOutlet`), then returns `true` iff every belt item is at least `minSpacing` away from the candidate position
    - Import `Point` from ConveyorConfig and `ConveyorItem` from ConveyorSystem
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property test for isSafeToRelease (Property 1: Safety check correctness)
    - **Property 1: Safety check correctness**
    - Generate random Point candidates and random arrays of ConveyorItem (varying onInlet, onOutlet, x, y)
    - Assert: `isSafeToRelease` returns `true` iff Euclidean distance from candidate to every belt-only item >= `minSpacing`
    - Place in `src/tests/safeReleaseSystem.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 3. Checkpoint — Verify SafeReleaseSystem
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add pendingReleaseItems to MachineState and update MachineSystem
  - [x] 4.1 Add `pendingReleaseItems: ConveyorItem[]` to `MachineState` interface in `src/data/MachineConfig.ts`
    - Initialize as empty array `[]` in MachineSystem constructor
    - _Requirements: 3.2, 4.1_

  - [x] 4.2 Add `getUsedCapacity(machine)` method to MachineSystem
    - Returns `machine.heldItems.length + (machine.activeInteraction !== null ? 1 : 0) + machine.pendingReleaseItems.length`
    - Update intake check in `update()` to use `getUsedCapacity(machine) >= machine.capacity` instead of `machine.heldItems.length >= machine.capacity`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 4.3 Write property test for getUsedCapacity (Property 4: Used capacity formula)
    - **Property 4: Used capacity formula**
    - Generate random MachineState with varying heldItems, activeInteraction, and pendingReleaseItems
    - Assert: `getUsedCapacity` equals `heldItems.length + (activeInteraction !== null ? 1 : 0) + pendingReleaseItems.length`
    - Place in `src/tests/machineSystem.test.ts`
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 4.4 Write property test for intake refusal at full capacity (Property 5: Intake refused at full capacity)
    - **Property 5: Intake refused at full capacity**
    - Generate machine states where `getUsedCapacity >= capacity` and belt items in the intake zone
    - Assert: no items are intaken when machine is at full capacity
    - Place in `src/tests/machineSystem.test.ts`
    - **Validates: Requirements 4.2**

  - [x] 4.5 Add `tryReleasePending(machine, beltItems)` method to MachineSystem
    - Accept `ConveyorSystem` reference in MachineSystem constructor for `getPositionOnLoop()` calls
    - For the given machine, check if `pendingReleaseItems` is non-empty
    - Get the release position via `conveyorSystem.getPositionOnLoop(machine.definition.zoneProgressEnd)`
    - Call `isSafeToRelease()` with the release position and current belt items
    - If safe: shift the oldest item from `pendingReleaseItems`, set its `loopProgress` to `zoneProgressEnd`, set `onInlet = false`, `onOutlet = false`, and return it
    - If unsafe: return `null`
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 4.6 Add `tryReleasePendingAll(beltItems)` method to MachineSystem
    - Iterate all machines, call `tryReleasePending` for each, collect and return all released items
    - _Requirements: 3.3, 3.4_

  - [ ]* 4.7 Write property test for pending release FIFO (Property 3: Pending release drains in FIFO order when safe)
    - **Property 3: Pending release drains in FIFO order when safe**
    - Generate machines with multiple pendingReleaseItems and belt states (safe/unsafe)
    - Assert: when safe, the released item is the oldest (first-inserted); when unsafe, no item is released
    - Place in `src/tests/machineSystem.test.ts`
    - **Validates: Requirements 3.3, 3.4, 3.5**

- [x] 5. Checkpoint — Verify MachineState and capacity changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update MachineSystem interaction outcomes to use safe release
  - [x] 6.1 Update success/fail/cancel paths in `MachineSystem.update()` to gate releases via `isSafeToRelease`
    - On interaction success: compute release position via `getPositionOnLoop(zoneProgressEnd)`, call `isSafeToRelease`. If safe, push to `itemsToReturn`. If unsafe, push to `machine.pendingReleaseItems` with output state.
    - On interaction fail: same check. If safe, push to `itemsToReturn` with original state. If unsafe, push to `machine.pendingReleaseItems` with original state.
    - On interaction cancel: same check. If safe, push to `itemsToReturn` with original state. If unsafe, push to `machine.pendingReleaseItems` with original state.
    - Pass current belt items list to `update()` method (add parameter)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.2 Write property test for player interaction release gating (Property 12: Player interaction release gated by safety)
    - **Property 12: Player interaction release gated by safety**
    - Generate interaction outcomes (success/fail/cancel) with varying belt states
    - Assert: item goes to belt if safe, to pendingReleaseItems if unsafe; fail/cancel preserve original state
    - Place in `src/tests/machineSystem.test.ts`
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

  - [ ]* 6.3 Write property test for machine release decision (Property 2: Machine release decision matches safety check)
    - **Property 2: Machine release decision matches safety check**
    - Generate machine processing completions with varying belt states
    - Assert: item placed on belt iff `isSafeToRelease` is true, added to `pendingReleaseItems` iff false
    - Place in `src/tests/machineSystem.test.ts`
    - **Validates: Requirements 3.1, 3.2, 9.2, 9.3**

- [x] 7. Update AutomationSystem to respect safe release via MachineSystem
  - [x] 7.1 Update `MachineSystem.completeAutoInteraction()` to check `isSafeToRelease` before returning item
    - If safe: return the item as before (set output state, loopProgress, etc.)
    - If unsafe: add item to `machine.pendingReleaseItems` with output state, clear `machine.activeInteraction`, return `null`
    - AutomationSystem already handles `null` returns — no changes needed in AutomationSystem itself
    - Also update `MachineSystem.autoProcess()` with the same safe release check
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 8. Checkpoint — Verify machine and automation safe release
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update ItemSystem for inlet queuing, gated belt entry, spawn overflow, and collision exclusion
  - [x] 9.1 Add inlet queuing logic to `ItemSystem.update()`
    - After advancing inlet items via `conveyor.update()`, sort inlet items by `inletProgress` descending (leading items first)
    - Compute `minInletSpacingProgress = MIN_BELT_SPACING / inletLength` (inletLength = 80px from INLET_START to INLET_END)
    - For each consecutive pair: if `leadItem.inletProgress - trailingItem.inletProgress < minInletSpacingProgress`, clamp trailing item's `inletProgress` to `leadItem.inletProgress - minInletSpacingProgress`
    - Update trailing item's position via `conveyor.getPositionOnInlet()`
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 9.2 Add inlet-to-belt gating in `ItemSystem.update()`
    - Before the conveyor advances inlet items, check the leading inlet item (highest `inletProgress`)
    - If `inletProgress >= 1.0`: call `isSafeToRelease` with the belt entry point (`getPositionOnLoop(0)`) and current belt items
    - If unsafe: clamp `inletProgress` to `1.0`, keep `onInlet = true`, update position to inlet end
    - If safe: allow normal transition (existing conveyor logic handles it)
    - Import `isSafeToRelease` from SafeReleaseSystem and `MIN_BELT_SPACING` from ConveyorConfig
    - _Requirements: 5.3, 6.1, 6.2, 6.3_

  - [x] 9.3 Update spawn logic for inlet overflow detection
    - Before spawning a new item, check the rearmost inlet item (lowest `inletProgress`)
    - If rearmost item's `inletProgress < minInletSpacingProgress`: trigger collision (game over) between the new spawn and the rearmost item
    - Otherwise: spawn normally at `inletProgress = 0`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.4 Update collision detection to skip inlet-inlet pairs
    - In the pairwise collision check loop, skip pairs where both `a.onInlet === true` and `b.onInlet === true`
    - All other pairs (belt-belt, belt-inlet, outlet-outlet, etc.) continue to be checked
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 9.5 Write property test for inlet-to-belt gating (Property 6)
    - **Property 6: Inlet-to-belt transition gated by safety**
    - Generate leading inlet items at junction with varying belt states
    - Assert: item transitions to belt iff `isSafeToRelease` reports safe
    - Place in `src/tests/itemSystem.test.ts`
    - **Validates: Requirements 5.3, 6.1, 6.2, 6.3**

  - [ ]* 9.6 Write property test for inlet trailing item pause (Property 7)
    - **Property 7: Inlet trailing items pause when too close**
    - Generate pairs of consecutive inlet items with varying progress values
    - Assert: trailing item does not advance past `leadItem.inletProgress - minInletSpacingProgress`
    - Place in `src/tests/itemSystem.test.ts`
    - **Validates: Requirements 5.2**

  - [ ]* 9.7 Write property test for inlet item ordering (Property 8)
    - **Property 8: Inlet item ordering preserved**
    - Generate sequences of spawned inlet items
    - Assert: items enter the belt loop in the same order they were spawned
    - Place in `src/tests/itemSystem.test.ts`
    - **Validates: Requirements 5.4**

  - [ ]* 9.8 Write property test for spawn overflow (Property 9)
    - **Property 9: Spawn overflow triggers collision iff inlet is full**
    - Generate inlet states with varying rearmost item positions
    - Assert: collision triggered iff rearmost `inletProgress < minInletSpacingProgress`; otherwise spawn succeeds
    - Place in `src/tests/itemSystem.test.ts`
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 9.9 Write property test for inlet-inlet collision exclusion (Property 10)
    - **Property 10: Inlet-inlet collision pairs are skipped**
    - Generate pairs of items both on inlet with varying distances
    - Assert: no collision reported between two inlet items regardless of distance
    - Place in `src/tests/itemSystem.test.ts`
    - **Validates: Requirements 5.1, 8.1**

  - [ ]* 9.10 Write property test for belt collision preservation (Property 11)
    - **Property 11: Belt collision detection preserved for non-inlet pairs**
    - Generate pairs where at least one item is not on inlet, with varying distances
    - Assert: collision reported when distance <= COLLISION_THRESHOLD
    - Place in `src/tests/itemSystem.test.ts`
    - **Validates: Requirements 8.2, 8.3**

- [x] 10. Checkpoint — Verify ItemSystem changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update GameScene orchestration
  - [x] 11.1 Update `GameScene.create()` to pass `ConveyorSystem` to `MachineSystem` constructor
    - Change `new MachineSystem()` to `new MachineSystem(this.conveyorSystem)`
    - _Requirements: 3.1, 3.3_

  - [x] 11.2 Update `GameScene.update()` to call `tryReleasePendingAll` and pass belt items to machine update
    - After `machineSystem.update()`, call `machineSystem.tryReleasePendingAll(this.itemSystem.getItems())`
    - Push all returned items into `this.itemSystem.getItems()`
    - Pass `this.itemSystem.getItems()` as a parameter to `machineSystem.update()` for safe release checks
    - _Requirements: 3.3, 3.4, 11.1, 11.2, 11.3, 11.4_

- [x] 12. Final verification — Ensure all existing and new tests pass
  - Run the full test suite to confirm no regressions
  - Verify existing conveyor, machine, item, outlet, and GameManager tests still pass
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- SafeReleaseSystem is a pure function module — no class instantiation needed
- Tests use source parsing to avoid Phaser import chain (matching existing test patterns)
- fast-check library is used for property-based testing with minimum 100 iterations per property
