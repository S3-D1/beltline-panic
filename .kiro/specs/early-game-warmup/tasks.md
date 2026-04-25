# Implementation Plan: Early-Game Warm-Up

## Overview

Add a warm-up phase to the spawn system that reduces the initial spawn rate for the first 15 seconds, then linearly transitions back to the existing difficulty curve by 45 seconds. The implementation adds a `warmUp` config section to `GameBalanceConfig`, a `getWarmUpMultiplier()` method to `GameManager`, and modifies `getSpawnIntervalMs()` to apply the multiplier before clamping. No changes to `ItemSystem`, `getNextSpawnDelayMs()`, `getBeltSpeedFactor()`, or `startRun()`.

## Tasks

- [x] 1. Add warmUp config section to GameBalanceConfig
  - [x] 1.1 Extend `GameBalanceConfig` interface and `DEFAULT_GAME_BALANCE_CONFIG`
    - Add `warmUp` section to the `GameBalanceConfig` interface in `src/data/GameBalanceConfig.ts` with fields: `warmUpEndSeconds: number`, `transitionEndSeconds: number`, `spawnIntervalMultiplier: number`
    - Add default values to `DEFAULT_GAME_BALANCE_CONFIG`: `warmUpEndSeconds: 15`, `transitionEndSeconds: 45`, `spawnIntervalMultiplier: 3.0`
    - _Requirements: 4.1, 4.3_

- [x] 2. Implement warm-up multiplier logic in GameManager
  - [x] 2.1 Add `getWarmUpMultiplier()` method to `GameManager`
    - Add a public method `getWarmUpMultiplier()` to `src/systems/GameManager.ts`
    - Read `warmUpEndSeconds`, `transitionEndSeconds`, and `spawnIntervalMultiplier` from `this.config.warmUp`
    - Return `spawnIntervalMultiplier` (3.0) when `elapsedSeconds <= warmUpEndSeconds`
    - Return `1.0` when `elapsedSeconds >= transitionEndSeconds`
    - Return `spawnIntervalMultiplier - (spawnIntervalMultiplier - 1.0) * ((elapsedSeconds - warmUpEndSeconds) / (transitionEndSeconds - warmUpEndSeconds))` during the transition phase
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 4.2_

  - [x] 2.2 Modify `getSpawnIntervalMs()` to apply the warm-up multiplier
    - In `src/systems/GameManager.ts`, after computing the base interval and overtime reduction, multiply `interval` by `this.getWarmUpMultiplier()`
    - Scale the upper clamp bound by the multiplier: `clamp(interval, minIntervalMs, startIntervalMs * this.getWarmUpMultiplier())`
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 5.1, 5.2_

  - [x]* 2.3 Write property test: warm-up multiplier three-phase formula
    - Create `src/tests/earlyGameWarmup.property.test.ts`
    - **Property 1: Warm-up multiplier follows the three-phase formula**
    - Generate random non-negative elapsed times with `fc.float({ min: 0, max: 300 })`
    - Construct a `GameManager` with default config, advance to the generated time, assert the multiplier matches the expected phase formula
    - Use `{ numRuns: 100 }` minimum
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1**

  - [x]* 2.4 Write property test: post-warm-up spawn interval identity
    - **Property 2: Post-warm-up spawn interval is identical to the baseline system**
    - Generate elapsed times `>= 45` with `fc.float({ min: 45, max: 300 })`
    - Construct two `GameManager` instances with the same seed — one with default config, one with `spawnIntervalMultiplier: 1.0` — advance both to the same time, assert `getSpawnIntervalMs()` returns the same value
    - Use `{ numRuns: 100 }` minimum
    - **Validates: Requirements 3.1, 3.2**

  - [x]* 2.5 Write property test: jitter bounds scale with warm-up
    - **Property 3: Jitter bounds scale proportionally with warm-up interval**
    - Generate random elapsed times and a fixed seed, advance a `GameManager`, call `getNextSpawnDelayMs()` and assert the result is within `[getSpawnIntervalMs() × randomMinFactor, getSpawnIntervalMs() × randomMaxFactor]` floored by `minIntervalMs`
    - Use `{ numRuns: 100 }` minimum
    - **Validates: Requirements 5.1, 5.2**

  - [x]* 2.6 Write property test: belt speed unaffected by warm-up
    - **Property 4: Belt speed is unaffected by warm-up**
    - Generate random elapsed times, construct two `GameManager` instances — one with default warm-up config, one with `spawnIntervalMultiplier: 1.0` — advance both to the same time, assert `getBeltSpeedFactor()` returns the same value
    - Use `{ numRuns: 100 }` minimum
    - **Validates: Requirements 7.1, 7.2**

  - [x]* 2.7 Write property test: warm-up multiplier monotonicity
    - **Property 5: Warm-up multiplier is monotonically non-increasing**
    - Generate pairs of elapsed times `t1 <= t2` with `fc.float({ min: 0, max: 300 })`, advance a `GameManager` to each, assert `getWarmUpMultiplier()` at `t1` >= `getWarmUpMultiplier()` at `t2`
    - Use `{ numRuns: 100 }` minimum
    - **Validates: Requirements 1.1, 2.1, 3.1**

- [x] 3. Checkpoint — Verify warm-up logic and property tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write unit tests for warm-up edge cases and examples
  - [x]* 4.1 Write unit tests for warm-up feature
    - Create `src/tests/earlyGameWarmup.test.ts`
    - Test config structure: `DEFAULT_GAME_BALANCE_CONFIG.warmUp` has expected default values (`warmUpEndSeconds: 15`, `transitionEndSeconds: 45`, `spawnIntervalMultiplier: 3.0`)
    - Test boundary at t=0: multiplier is exactly 3.0, effective spawn interval is `1450 × 3.0 = 4350`ms
    - Test boundary at t=15: multiplier is exactly 3.0
    - Test boundary at t=45: multiplier is exactly 1.0
    - Test mid-transition at t=30: multiplier is exactly 2.0
    - Test custom config: `GameManager` with custom `warmUp` values uses those values correctly
    - Test reset: after advancing past warm-up, `startRun()` resets elapsed time so multiplier returns to 3.0
    - Test spawn interval at t=0 with seeded RNG: verify `getNextSpawnDelayMs()` falls in expected jitter range around 4350ms
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 2.4, 3.1, 3.2, 4.1, 4.3, 5.1, 5.2, 6.1, 6.2_

- [x] 5. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the five correctness properties from the design document using fast-check
- Unit tests validate specific boundary values, edge cases, and config integration
- No new files are created beyond the two test files — all production changes are in existing files
- The warm-up resets automatically via `startRun()` resetting `elapsedSeconds` to 0, so no additional reset logic is needed
