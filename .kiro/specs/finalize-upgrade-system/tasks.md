# Implementation Plan: Finalize Upgrade System

## Overview

Replace the increment-based upgrade calculation system with fixed lookup tables across `UpgradeConfig.ts` and `GameManager.ts`. Add five lookup table arrays, remove six increment fields, introduce `MachineValueConfig` for per-machine balancing, refactor all upgrade application and cost methods to use table lookups, add query methods, and write property-based and example-based tests. No changes to `AutomationSystem.ts`, `MachineSystem.ts`, or UI files — they consume existing API signatures.

## Tasks

- [x] 1. Add lookup tables to UpgradeConfig.ts and remove increment fields
  - [x] 1.1 Add the five lookup table arrays as readonly exports
    - Add `AUTOMATION_SPEED_TABLE`: `[1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]`
    - Add `AUTOMATION_LEVEL_TABLE`: `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
    - Add `SEQUENCE_LENGTH_TABLE`: `[3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 10]`
    - Add `QUALITY_MODIFIER_TABLE`: `[1.00, 1.15, 1.30, 1.50, 1.75, 2.00, 2.35, 2.75, 3.25, 4.00, 5.00]`
    - Add `CAPACITY_TABLE`: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]`
    - Each array must have exactly 11 entries typed as `readonly number[]` with `as const`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Remove increment fields from UpgradeConfigData interface and UPGRADE_CONFIG constant
    - Remove `capacityIncrement`, `qualityIncrement`, `sequenceLengthIncrement`, `automationIncrement`, `automationBaseTimingMs`, `automationSpeedReductionMs` from the `UpgradeConfigData` interface
    - Remove the same six fields from the `UPGRADE_CONFIG` constant
    - Retain `basePrices` and `maxLevel` in both the interface and constant
    - _Requirements: 11.1, 11.4_

- [x] 2. Add MachineValueConfig and refactor GameManager methods
  - [x] 2.1 Add MachineValueConfig type and MACHINE_VALUE_CONFIGS constant
    - Define `MachineValueConfig` interface with fields: `machineId`, `baseValue`, `factor`, `qualityScalingMode` (`'baseValue' | 'factor'`), `costBasePrice`
    - Define `MACHINE_VALUE_CONFIGS` readonly array with entries for machine1 (baseValue: 10, factor: 1.0, qualityScalingMode: 'baseValue', costBasePrice: 50), machine2 (baseValue: 25, factor: 1.5, qualityScalingMode: 'factor', costBasePrice: 250), machine3 (baseValue: 50, factor: 2.0, qualityScalingMode: 'factor', costBasePrice: 1000)
    - Export `MachineValueConfig` interface for test access
    - _Requirements: 7.1, 7.3, 8.1_

  - [x] 2.2 Add new query methods to GameManager
    - Add `getMachineValueConfig(machineId)` that finds config from `MACHINE_VALUE_CONFIGS` or throws
    - Add `isMaxLevel(machineId, type)` returning `true` when level >= `UPGRADE_CONFIG.maxLevel`
    - Add `canPurchase(machineId, type)` returning `true` when not max level and budget >= cost
    - Add `getNextUpgradeCost(machineId, type)` returning cost or `null` at max level
    - _Requirements: 2.4, 7.4, 9.3, 9.4_

  - [x] 2.3 Refactor applyUpgrades to use lookup tables
    - Replace `MACHINE_DEFAULTS.capacity + levels.capacity * UPGRADE_CONFIG.capacityIncrement` with `CAPACITY_TABLE[levels.capacity]`
    - Replace sequence length arithmetic with `SEQUENCE_LENGTH_TABLE[levels.quality]`
    - Replace automation level arithmetic with `AUTOMATION_LEVEL_TABLE[levels.automation]`
    - Compute `workQuality` using `QUALITY_MODIFIER_TABLE[levels.quality]` multiplied by either `config.baseValue` or `config.factor` based on `qualityScalingMode`
    - Import the five lookup tables from `UpgradeConfig`
    - _Requirements: 1.6, 4.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.4, 11.2, 11.3_

  - [x] 2.4 Refactor getAutomationTiming to use AUTOMATION_SPEED_TABLE
    - Replace `UPGRADE_CONFIG.automationBaseTimingMs - (speedLevel * UPGRADE_CONFIG.automationSpeedReductionMs)` with `AUTOMATION_SPEED_TABLE[speedLevel]`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.5 Refactor getUpgradeCost to use MachineValueConfig.costBasePrice
    - Replace `UPGRADE_CONFIG.basePrices[machineId]` with `this.getMachineValueConfig(machineId).costBasePrice`
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Checkpoint — Verify core refactor
  - Ensure the project compiles with no TypeScript errors
  - Run existing tests to confirm no regressions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update existing tests and write example-based unit tests
  - [x] 4.1 Update existing gameManager.test.ts
    - Remove assertions for `capacityIncrement`, `qualityIncrement`, `sequenceLengthIncrement`, `automationIncrement`, `automationBaseTimingMs`, `automationSpeedReductionMs` in the "config has all required fields" test
    - Update that test to check for lookup table exports instead
    - Existing cost and timing tests at level 0 should still pass (values unchanged)
    - _Requirements: 11.1_

  - [x] 4.2 Create example-based unit tests in src/tests/upgradeSystem.test.ts
    - Test each of the 5 lookup tables has exactly 11 entries with correct values (Requirements 1.1–1.5)
    - Test all upgrade levels start at 0 for all machines (Requirement 2.1)
    - Test MachineValueConfig structure: each machine has valid config with all required fields (Requirements 7.1, 7.4)
    - Test UPGRADE_CONFIG does not contain old increment fields (Requirement 11.1)
    - Test UPGRADE_CONFIG retains `maxLevel` and `basePrices` (Requirement 11.4)
    - Test preserved exports: `UpgradeType`, `UPGRADE_DIRECTION_MAP`, `MACHINE_DIRECTION_MAP` exist with correct values
    - Test `getNextUpgradeCost` returns `null` at max level (Requirement 8.4)
    - Test `isMaxLevel` returns `false` at level 0 and `true` at level 10 (Requirement 2.4)
    - Test `canPurchase` returns `false` when budget is 0 and level is 0 (Requirement 9.4)
    - Test `applyUpgrades` at level 0 sets capacity=1, sequenceLength=3, automationLevel=0 (Requirements 2.1, 3.3, 4.2, 5.5, 6.2)
    - Test `applyUpgrades` at level 10 sets capacity=11, sequenceLength=10, automationLevel=10 (Requirements 3.4, 4.3, 5.6, 6.3)
    - _Requirements: 1.1–1.5, 2.1, 2.4, 7.1, 7.4, 8.4, 9.4, 11.1, 11.4_

- [x] 5. Checkpoint — Verify example-based tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Write property-based tests
  - [ ]* 6.1 Write property test: applyUpgrades sets capacity, sequenceLength, and automationLevel from lookup tables
    - **Property 1: applyUpgrades sets capacity, sequenceLength, and automationLevel from lookup tables**
    - Generate random machineId from {machine1, machine2, machine3} and random levels 0–10 for each upgrade type
    - Assert `machine.capacity === CAPACITY_TABLE[levels.capacity]`, `machine.requiredSequenceLength === SEQUENCE_LENGTH_TABLE[levels.quality]`, `machine.automationLevel === AUTOMATION_LEVEL_TABLE[levels.automation]`
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 1.6, 4.1, 5.1, 6.1, 6.4, 11.3**

  - [ ]* 6.2 Write property test: getAutomationTiming returns the Automation Speed lookup table value
    - **Property 2: getAutomationTiming returns the Automation Speed lookup table value**
    - Generate random machineId and random speed level 0–10
    - Assert `getAutomationTiming(machineId) === AUTOMATION_SPEED_TABLE[speedLevel]`
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 6.3 Write property test: Quality modifier application respects scaling mode
    - **Property 3: Quality modifier application respects scaling mode**
    - Generate random machineId and random quality level 0–10
    - Assert `machine.workQuality` equals `config.baseValue * QUALITY_MODIFIER_TABLE[level]` or `config.factor * QUALITY_MODIFIER_TABLE[level]` depending on `qualityScalingMode`
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 7.2**

  - [ ]* 6.4 Write property test: Max level boundary enforcement
    - **Property 4: Max level boundary enforcement**
    - Generate random machineId and random upgrade type, set level to 10
    - Assert `attemptPurchase` returns `false`, budget and level unchanged, `isMaxLevel` returns `true`
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 6.5 Write property test: Upgrade cost formula
    - **Property 5: Upgrade cost formula**
    - Generate random machineId, random upgrade type, random level 0–9
    - Assert `getUpgradeCost(machineId, type) === costBasePrice * 2^level`
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ]* 6.6 Write property test: Successful purchase deducts cost and increments level
    - **Property 6: Successful purchase deducts cost and increments level**
    - Generate random machineId, upgrade type, level 0–9, and sufficient budget
    - Assert `attemptPurchase` returns `true`, budget reduced by exact cost, level incremented by 1
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 9.2**

  - [ ]* 6.7 Write property test: Insufficient budget rejects purchase without side effects
    - **Property 7: Insufficient budget rejects purchase without side effects**
    - Generate random machineId, upgrade type, level 0–9, and budget less than cost
    - Assert `attemptPurchase` returns `false`, budget and level unchanged
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 9.1**

  - [ ]* 6.8 Write property test: Upgrade independence across machines and types
    - **Property 8: Upgrade independence across machines and types**
    - Generate random machineId and upgrade type, purchase one upgrade
    - Assert all other machines' levels and all other upgrade types on the same machine remain unchanged
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 10.1**

  - [ ]* 6.9 Write property test: canPurchase correctness
    - **Property 9: canPurchase correctness**
    - Generate random machineId, upgrade type, random budget, and random level
    - Assert `canPurchase` returns `true` iff level < 10 AND budget >= cost
    - Use `{ numRuns: 100 }`
    - **Validates: Requirements 9.4, 2.4**

- [x] 7. Final checkpoint — Ensure all tests pass
  - Run the full test suite
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check with 100 iterations each
- Unit tests validate specific examples, edge cases, and structural correctness
- No changes needed to AutomationSystem.ts, MachineSystem.ts, or UI files — they consume existing API signatures
- Property test file: `src/tests/upgradeSystem.property.test.ts`
- Example test file: `src/tests/upgradeSystem.test.ts`
