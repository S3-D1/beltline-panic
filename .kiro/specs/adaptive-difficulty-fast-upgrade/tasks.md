# Tasks

## Task 1: Add GameBalanceConfig

- [x] 1.1 Create `src/data/GameBalanceConfig.ts` with `GameBalanceConfig` interface and `DEFAULT_GAME_BALANCE_CONFIG` object
- [x] 1.2 Include sections: `targetPanicTimeSeconds`, `belt`, `spawns`, `economy`, `upgrades`
- [x] 1.3 Set upgrade base costs: automation=10, automationSpeed=12, capacity=15, quality=20
- [x] 1.4 Set costMultiplierPerLevel array: [1.0, 1.45, 2.1, 3.0, 4.3, 6.1, 8.6, 12.0, 16.5, 22.5]

## Task 2: Update UpgradeConfig Quality Tables

- [x] 2.1 Update `QUALITY_MODIFIER_TABLE` to `[1.00, 1.20, 1.45, 1.75, 2.10, 2.50, 3.00, 3.60, 4.30, 5.10, 6.00]`
- [x] 2.2 Update `SEQUENCE_LENGTH_TABLE` to `[3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10]`

## Task 3: Add Difficulty Tracking to GameManager

- [x] 3.1 Add `elapsedSeconds`, `timeDifficulty`, `overtimeDifficulty` private fields to GameManager
- [x] 3.2 Accept optional `GameBalanceConfig` in constructor, default to `DEFAULT_GAME_BALANCE_CONFIG`
- [x] 3.3 Modify `update(delta)` to accumulate `elapsedSeconds` and recalculate `timeDifficulty` and `overtimeDifficulty`
- [x] 3.4 Add `startRun()` and `resetRun()` methods that reset elapsed time and difficulty values
- [x] 3.5 Add `getDifficultySnapshot()` method returning all current difficulty values
- [x] 3.6 Add `isPanicMode()` method returning `elapsedSeconds >= targetPanicTimeSeconds`

## Task 4: Add Belt Speed Scaling

- [x] 4.1 Add `getBeltSpeedFactor()` method: `1.0 + pow(timeDifficulty, curveExponent) * (maxNormalSpeedFactor - baseSpeedFactor) + overtimeDifficulty * overtimeSpeedGrowth`
- [x] 4.2 Update `GameScene` to pass `DELIVERY_CONFIG.initialBeltSpeed * gameManager.getBeltSpeedFactor()` to ConveyorSystem

## Task 5: Add Spawn Rate Scaling

- [x] 5.1 Add `getSpawnIntervalMs()` method: `lerp(startIntervalMs, panicIntervalMs, pow(timeDifficulty, curveExponent)) - overtimeDifficulty * 120`, clamped to [minIntervalMs, startIntervalMs]
- [x] 5.2 Add `getNextSpawnDelayMs()` method: multiply spawnIntervalMs by random factor in [randomMinFactor, randomMaxFactor], floor at minIntervalMs
- [x] 5.3 Update `ItemSystem` to use `gameManager.getNextSpawnDelayMs()` for spawn timing instead of old jitter calculation

## Task 6: Add Early Income Assist

- [x] 6.1 Add `getIncomeMultiplier()` method: `lerp(earlyIncomeMultiplier, 1.0, clamp(elapsedSeconds / earlyIncomeDurationSeconds, 0, 1))`
- [x] 6.2 Update `GameScene` to apply `getIncomeMultiplier()` to cashout payout values

## Task 7: Add Upgrade Cost Calculation

- [x] 7.1 Add new `getUpgradeCost(type: string, nextLevel: number)` method using per-type base costs and costMultiplierPerLevel
- [x] 7.2 Add `getUpgradeLevelDefinition(type: string, level: number)` method returning fixed level values
- [x] 7.3 Update `TerminalUI` to use new per-type upgrade cost display
- [x] 7.4 Update `attemptPurchase` and `canPurchase` to use new cost calculation

## Task 8: Write Property-Based Tests

- [x] 8.1 [PBT] Create `src/tests/adaptiveDifficulty.property.test.ts` with property tests for difficulty formulas
- [x] 8.2 [PBT] Test: TimeDifficulty is always in [0, 1] for any elapsed time >= 0
- [x] 8.3 [PBT] Test: OvertimeDifficulty is always >= 0 and is 0 before panic time
- [x] 8.4 [PBT] Test: BeltSpeedFactor is monotonically non-decreasing and always >= 1.0
- [x] 8.5 [PBT] Test: SpawnIntervalMs is always in [280, 1450] and monotonically non-increasing
- [x] 8.6 [PBT] Test: NextSpawnDelayMs is always >= 280
- [x] 8.7 [PBT] Test: IncomeMultiplier is always in [1.0, 1.4] and monotonically non-increasing
- [x] 8.8 [PBT] Test: Upgrade cost is monotonically increasing with level
- [x] 8.9 [PBT] Test: isPanicMode is consistent with elapsed time >= targetPanicTimeSeconds
- [x] 8.10 [PBT] Test: DifficultySnapshot fields are consistent with individual getter methods

## Task 9: Write Example-Based Tests

- [x] 9.1 Test: DEFAULT_GAME_BALANCE_CONFIG has all required sections and values
- [x] 9.2 Test: Boundary values at t=0 (beltSpeed=1.0, spawnInterval=1450, income=1.4, panic=false)
- [x] 9.3 Test: Boundary values at t=75 (beltSpeed≈2.8, spawnInterval≈420, income=1.0, panic=true)
- [x] 9.4 Test: Overtime values at t=90 (beltSpeed>2.8, spawnInterval<420)
- [x] 9.5 Test: Upgrade cost calculations match round(baseCost * multiplier) for all types
- [x] 9.6 Test: Fixed level definitions match spec values
- [x] 9.7 Test: startRun/resetRun resets all difficulty values

## Task 10: Update Existing Tests

- [x] 10.1 Update `src/tests/gameManager.test.ts` to work with new GameManager API
- [x] 10.2 Update `src/tests/upgradeSystem.test.ts` to reflect new quality table values
- [x] 10.3 Verify all existing tests pass with the new changes
