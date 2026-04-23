# Implementation Plan: Dynamic Item Delivery

## Overview

Replace the static item spawning and fixed belt speed with a dynamic, time-progressing delivery system. Implementation proceeds bottom-up: data config → pure utilities → GameManager extensions → system refactors → scene wiring. Each step builds on the previous and is testable in isolation.

## Tasks

- [x] 1. Create DeliveryConfig and progression utilities
  - [x] 1.1 Create `src/data/DeliveryConfig.ts` with `ProgressionPoint` interface, `DeliveryConfigData` interface, and `DELIVERY_CONFIG` constant
    - Define `ProgressionPoint` with `time` (ms) and `multiplier` fields
    - Define `DeliveryConfigData` with `initialSpawnInterval`, `initialBeltSpeed`, `initialJitter`, `minSpawnInterval`, `maxBeltSpeed`, `minSpawnDelay`, `spawnIntervalCurve`, and `beltSpeedCurve`
    - Export `DELIVERY_CONFIG` with default values from the design (3000 ms spawn, 60 px/s belt, 0.25 jitter, 800 ms floor, 180 px/s ceiling, 200 ms min delay, and the piecewise-linear curves)
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 1.2 Create `src/utils/progression.ts` with `evaluateCurve` function
    - Implement piecewise-linear interpolation: before first point returns first multiplier, after last point returns last multiplier, between two points linearly interpolates
    - Accept `ProgressionPoint[]` and `time: number`, return `number`
    - _Requirements: 3.4_

  - [x] 1.3 Create `src/utils/random.ts` with `createSeededRandom` function
    - Implement mulberry32 algorithm returning a `() => number` that produces floats in [0, 1)
    - Accept a `seed: number` parameter
    - _Requirements: 1.4, 7.1, 7.2_

  - [x] 1.4 Write property tests for `evaluateCurve` and `createSeededRandom`
    - **Property 3: PRNG determinism** — two instances with the same seed produce identical sequences
    - **Validates: Requirements 1.4, 7.2**
    - Create `src/tests/dynamicDelivery.property.test.ts` with fast-check
    - Minimum 100 iterations per property

  - [x] 1.5 Write unit tests for `evaluateCurve`
    - Test interpolation between known points, before first point, after last point, single-point curve, empty curve
    - Add tests to `src/tests/dynamicDelivery.test.ts`
    - _Requirements: 3.4_

- [x] 2. Extend GameManager with delivery state and progression
  - [x] 2.1 Add delivery state and `update(delta)` method to `src/systems/GameManager.ts`
    - Add private fields: `elapsedTime`, `currentSpawnInterval`, `currentBeltSpeed`, `currentJitter`
    - Import `DELIVERY_CONFIG` and `evaluateCurve`
    - Initialize all delivery fields from `DELIVERY_CONFIG` in the constructor
    - Implement `update(delta)`: accumulate `elapsedTime`, evaluate both curves, apply multipliers to initial values, clamp spawn interval to `minSpawnInterval` floor and belt speed to `maxBeltSpeed` ceiling
    - _Requirements: 2.6, 3.1, 3.2, 3.3, 3.5, 3.6, 4.3_

  - [x] 2.2 Add public getter methods to GameManager
    - `getSpawnInterval(): number` — returns `currentSpawnInterval`
    - `getSpawnJitter(): number` — returns `currentJitter`
    - `getBeltSpeed(): number` — returns `currentBeltSpeed`
    - `getElapsedTime(): number` — returns `elapsedTime`
    - _Requirements: 2.1, 2.2, 2.3, 7.3_

  - [x] 2.3 Write property tests for GameManager progression
    - **Property 5: Time accumulation** — after a sequence of non-negative deltas, `getElapsedTime()` equals their sum within floating-point tolerance
    - **Validates: Requirements 3.1**
    - **Property 6: Spawn interval monotonicity** — for t1 < t2 with non-increasing multiplier curve, `getSpawnInterval()` at t2 ≤ at t1
    - **Validates: Requirements 3.2**
    - **Property 7: Belt speed monotonicity** — for t1 < t2 with non-decreasing multiplier curve, `getBeltSpeed()` at t2 ≥ at t1
    - **Validates: Requirements 3.3**
    - **Property 8: Spawn interval floor** — for any elapsed time, `getSpawnInterval()` ≥ `minSpawnInterval`
    - **Validates: Requirements 3.5**
    - **Property 9: Belt speed ceiling** — for any elapsed time, `getBeltSpeed()` ≤ `maxBeltSpeed`
    - **Validates: Requirements 3.6**
    - Add to `src/tests/dynamicDelivery.property.test.ts`, minimum 100 iterations each

  - [x] 2.4 Write unit tests for GameManager delivery API
    - Test that initial values match `DELIVERY_CONFIG`
    - Test that getters return expected values after construction
    - Test `update(delta)` advances elapsed time correctly
    - Add to `src/tests/dynamicDelivery.test.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 4.3, 7.3_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor ConveyorSystem to accept dynamic speed
  - [x] 4.1 Update `ConveyorSystem.update()` in `src/systems/ConveyorSystem.ts` to accept a `speed` parameter
    - Change signature from `update(delta, items)` to `update(delta, items, speed)`
    - Replace `CONVEYOR_SPEED` usage inside `update()` with the `speed` parameter
    - Remove the `CONVEYOR_SPEED` import (keep the constant exported from `ConveyorConfig.ts` for backward compatibility)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 Update existing ConveyorSystem tests in `src/tests/conveyorSystem.test.ts`
    - Add the `speed` argument (use `60` to match the old `CONVEYOR_SPEED`) to all existing `update()` calls so tests compile and pass
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 4.3 Write property test for speed parameterization
    - **Property 10: Speed parameterization** — for any positive speed and delta, an inlet item advances by `speed × delta / 1000 / inletLength` in progress, confirming caller-provided speed is used
    - **Validates: Requirements 5.1**
    - Add to `src/tests/dynamicDelivery.property.test.ts`, minimum 100 iterations

- [x] 5. Refactor ItemSystem for jittered spawning
  - [x] 5.1 Update `src/systems/ItemSystem.ts` to use GameManager and seedable PRNG
    - Remove import of `SPAWN_INTERVAL` from `ConveyorConfig`
    - Import `createSeededRandom` from `src/utils/random.ts` and `DELIVERY_CONFIG` from `src/data/DeliveryConfig.ts`
    - Update constructor to accept an optional `seed` parameter; create PRNG with `createSeededRandom(seed ?? Date.now())`
    - Add private fields: `nextDelay` (initialized from `DELIVERY_CONFIG.initialSpawnInterval`), `rng`
    - Change `update(delta)` signature to `update(delta, gameManager)` where `gameManager` provides `getSpawnInterval()`, `getSpawnJitter()`, and the `minSpawnDelay` from config
    - After each spawn, compute next delay: `interval + interval * jitter * (2 * rng() - 1)`, clamped to `minSpawnDelay`
    - Replace fixed `SPAWN_INTERVAL` comparison with `nextDelay`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 7.1_

  - [x] 5.2 Update existing ItemSystem tests in `src/tests/itemSystem.test.ts`
    - Pass a mock or real `GameManager` instance to `update()` calls
    - Ensure all existing tests compile and pass with the new signature
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.3 Write property tests for jitter computation
    - **Property 1: Jitter bounds** — for any interval > 0 and jitter in [0, 1], computed delay (before clamping) falls within [interval × (1 − jitter), interval × (1 + jitter)]
    - **Validates: Requirements 1.1, 1.3**
    - **Property 2: Visible variation** — for non-zero jitter and any seed, a sequence of ≥ 10 delays contains at least two distinct values
    - **Validates: Requirements 1.2**
    - **Property 4: Minimum delay clamp** — for any interval, jitter, and random value, the final delay ≥ `minSpawnDelay` (200 ms)
    - **Validates: Requirements 1.5**
    - Add to `src/tests/dynamicDelivery.property.test.ts`, minimum 100 iterations each

  - [x] 5.4 Write unit tests for ItemSystem jittered spawning
    - Test that with jitter 0 and a fixed seed, spawn intervals are perfectly even
    - Test that with jitter > 0, spawn intervals vary
    - Test that spawn delay never goes below `minSpawnDelay`
    - Add to `src/tests/dynamicDelivery.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.4_

- [x] 6. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Wire everything together in GameScene
  - [x] 7.1 Update `src/scenes/GameScene.ts` to drive the dynamic delivery system
    - Call `gameManager.update(delta)` at the start of the update loop (before `itemSystem.update`)
    - Pass `gameManager` to `itemSystem.update(delta, gameManager)`
    - Pass `gameManager.getBeltSpeed()` as the `speed` argument to `conveyorSystem.update(delta, items, speed)`
    - Pass an optional seed to `ItemSystem` constructor if needed for debug reproducibility
    - _Requirements: 2.4, 2.5, 3.1, 5.1_

  - [x] 7.2 Update existing GameScene tests in `src/tests/gameScene.test.ts`
    - Ensure tests account for the new `update()` signatures and GameManager integration
    - Verify no regressions in scene creation or update flow
    - _Requirements: 6.1, 6.5_

  - [x] 7.3 Write integration unit tests for the wired system
    - Test that after several frames, `gameManager.getElapsedTime()` advances
    - Test that `gameManager.getSpawnInterval()` decreases over simulated time
    - Test that `gameManager.getBeltSpeed()` increases over simulated time
    - Test that `ConveyorConfig.CONVEYOR_SPEED` and `SPAWN_INTERVAL` constants still exist (backward compatibility)
    - Test that ItemSystem source does not import `SPAWN_INTERVAL`
    - Test that ConveyorSystem `update()` does not reference `CONVEYOR_SPEED` internally
    - Add to `src/tests/dynamicDelivery.test.ts`
    - _Requirements: 2.4, 2.5, 3.2, 3.3, 6.5_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 10 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Existing test suites (`conveyorSystem.test.ts`, `itemSystem.test.ts`, `gameManager.test.ts`, `gameScene.test.ts`) must continue to pass after refactoring — signature changes are handled in tasks 4.2, 5.2, and 7.2
- `CONVEYOR_SPEED` and `SPAWN_INTERVAL` remain exported from `ConveyorConfig.ts` for backward compatibility
