# Requirements Document

## Introduction

Beltline Panic needs an adaptive difficulty system controlled by `GameManager` so that normal rounds last around 30–95 seconds and the player gets meaningful upgrades early. The `GameManager` shall centrally control belt speed, item spawn interval, spawn randomness, panic mode, early income assist, upgrade costs, and fixed upgrade level values. This replaces the existing piecewise-linear progression curves with a power-curve-based difficulty model tuned for short arcade sessions.

## Glossary

- **GameManager**: The central gameplay system (`src/systems/GameManager.ts`) that tracks score, budget, upgrade levels, and now also difficulty progression.
- **TimeDifficulty**: A normalized value from `0` to `1` representing how far the current run has progressed toward panic time. Calculated as `clamp(elapsedSeconds / targetPanicTimeSeconds, 0, 1)`.
- **OvertimeDifficulty**: A value starting at `0` that increases after panic time is reached. Calculated as `max(0, elapsedSeconds - targetPanicTimeSeconds) / 30`.
- **DifficultySnapshot**: A read-only object exposing all current difficulty values in a single call.
- **BeltSpeedFactor**: A multiplier applied to the base belt speed, starting at `1.0` and increasing with difficulty.
- **SpawnIntervalMs**: The base time in milliseconds between item spawns, decreasing with difficulty.
- **IncomeMultiplier**: A multiplier applied to cashout rewards, starting above `1.0` and fading to `1.0` over time.
- **PanicMode**: A boolean state that activates when elapsed time reaches `targetPanicTimeSeconds` (default `75s`), signaling the late-game phase.
- **UpgradeType**: One of `automation`, `automationSpeed`, `capacity`, or `quality`.
- **CostMultiplierPerLevel**: An array of 10 multipliers applied to base upgrade costs, one per purchasable level.
- **GameBalanceConfig**: A configuration object containing all tunable balance parameters for difficulty, belt speed, spawns, economy, and upgrade costs.

## Requirements

### Requirement 1: Difficulty Tracking

**User Story:** As a player, I want the game to become more intense over time so that the round never feels boring.

#### Acceptance Criteria

1. THE GameManager SHALL track elapsed run time in seconds starting from `0` when a run begins.
2. WHEN the GameManager update method is called, THE GameManager SHALL recalculate TimeDifficulty as `clamp(elapsedSeconds / targetPanicTimeSeconds, 0, 1)`.
3. WHEN the GameManager update method is called, THE GameManager SHALL recalculate OvertimeDifficulty as `max(0, elapsedSeconds - targetPanicTimeSeconds) / 30`.
4. THE GameManager SHALL expose a `getDifficultySnapshot()` method that returns a DifficultySnapshot containing `elapsedSeconds`, `timeDifficulty`, `overtimeDifficulty`, `beltSpeedFactor`, `spawnIntervalMs`, `incomeMultiplier`, and `isPanicMode`.
5. WHEN `startRun()` is called, THE GameManager SHALL reset elapsed time to `0` and recalculate all difficulty values.
6. THE GameManager SHALL use `75` seconds as the default `targetPanicTimeSeconds`.

### Requirement 2: Belt Speed Scaling

**User Story:** As a player, I want the belt to become faster over time so that the game becomes more hectic.

#### Acceptance Criteria

1. THE GameManager SHALL expose a `getBeltSpeedFactor()` method that returns the current belt speed multiplier.
2. THE GameManager SHALL calculate BeltSpeedFactor as `1.0 + pow(timeDifficulty, 1.6) * 1.8 + overtimeDifficulty * 0.8`.
3. WHEN TimeDifficulty is `0`, THE GameManager SHALL return a BeltSpeedFactor of `1.0`.
4. WHEN TimeDifficulty is `1` and OvertimeDifficulty is `0`, THE GameManager SHALL return a BeltSpeedFactor of approximately `2.8`.
5. WHEN OvertimeDifficulty is greater than `0`, THE GameManager SHALL continue increasing BeltSpeedFactor beyond `2.8`.
6. THE GameManager SHALL read belt speed parameters (`baseSpeedFactor`, `maxNormalSpeedFactor`, `overtimeSpeedGrowth`, `curveExponent`) from the GameBalanceConfig.

### Requirement 3: Spawn Rate Scaling

**User Story:** As a player, I want more items to arrive over time so that pressure increases.

#### Acceptance Criteria

1. THE GameManager SHALL expose a `getSpawnIntervalMs()` method that returns the current base spawn interval in milliseconds.
2. THE GameManager SHALL expose a `getNextSpawnDelayMs()` method that returns a randomized spawn delay based on the current spawn interval.
3. THE GameManager SHALL calculate SpawnIntervalMs as `lerp(1450, 420, pow(timeDifficulty, 1.25))` minus `overtimeDifficulty * 120`, clamped between `280` and `1450`.
4. WHEN `getNextSpawnDelayMs()` is called, THE GameManager SHALL multiply SpawnIntervalMs by a random factor between `0.75` and `1.35`, with a floor of `280ms`.
5. WHEN TimeDifficulty is `0`, THE GameManager SHALL return a SpawnIntervalMs of `1450`.
6. WHEN TimeDifficulty is `1` and OvertimeDifficulty is `0`, THE GameManager SHALL return a SpawnIntervalMs of approximately `420`.
7. THE GameManager SHALL read spawn parameters (`startIntervalMs`, `panicIntervalMs`, `minIntervalMs`, `curveExponent`, `randomMinFactor`, `randomMaxFactor`) from the GameBalanceConfig.

### Requirement 4: Early Income Assist

**User Story:** As a player, I want to afford the first upgrade quickly so that the upgrade loop starts early.

#### Acceptance Criteria

1. THE GameManager SHALL expose a `getIncomeMultiplier()` method that returns the current income multiplier.
2. THE GameManager SHALL calculate IncomeMultiplier as `lerp(1.4, 1.0, clamp(elapsedSeconds / 25, 0, 1))`.
3. WHEN elapsed time is `0`, THE GameManager SHALL return an IncomeMultiplier of `1.4`.
4. WHEN elapsed time is `25` seconds or more, THE GameManager SHALL return an IncomeMultiplier of `1.0`.
5. THE GameManager SHALL read economy parameters (`earlyIncomeMultiplier`, `earlyIncomeDurationSeconds`) from the GameBalanceConfig.

### Requirement 5: Upgrade Costs

**User Story:** As a designer, I want early upgrades to be cheap while later upgrades become expensive.

#### Acceptance Criteria

1. THE GameManager SHALL expose a `getUpgradeCost(type, nextLevel)` method that accepts an UpgradeType and a level number and returns the cost for that upgrade level.
2. THE GameManager SHALL calculate upgrade cost as `round(baseCost * costMultiplierPerLevel[nextLevel - 1])`.
3. THE GameManager SHALL use base costs of `10` for automation, `12` for automationSpeed, `15` for capacity, and `20` for quality.
4. THE GameManager SHALL use the CostMultiplierPerLevel array `[1.0, 1.45, 2.1, 3.0, 4.3, 6.1, 8.6, 12.0, 16.5, 22.5]` for levels 1 through 10.
5. THE GameManager SHALL read base costs and cost multipliers from the GameBalanceConfig.
6. WHEN `nextLevel` is less than `1` or greater than `10`, THE GameManager SHALL return a cost indicating the upgrade is unavailable.

### Requirement 6: Fixed Upgrade Level Definitions

**User Story:** As a designer, I want predictable upgrade levels so that balancing stays stable.

#### Acceptance Criteria

1. THE GameManager SHALL define automation levels scaling from `0` at level 0 to `10` at level 10.
2. THE GameManager SHALL define automation speed values as `[1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]` milliseconds for levels 0 through 10.
3. THE GameManager SHALL define capacity values as `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]` for levels 0 through 10.
4. THE GameManager SHALL define quality levels with both a `valueMultiplier` and a `sequenceLength` for each level 0 through 10.
5. THE GameManager SHALL define quality `valueMultiplier` values as `[1.00, 1.20, 1.45, 1.75, 2.10, 2.50, 3.00, 3.60, 4.30, 5.10, 6.00]` for levels 0 through 10.
6. THE GameManager SHALL define quality `sequenceLength` values as `[3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10]` for levels 0 through 10.
7. THE GameManager SHALL expose a `getUpgradeLevelDefinition(type, level)` method that returns the fixed values for a given upgrade type and level.

### Requirement 7: Panic Mode

**User Story:** As a player, I want the late game to become unstable so that runs naturally end after a short arcade session.

#### Acceptance Criteria

1. THE GameManager SHALL expose an `isPanicMode()` method that returns a boolean.
2. WHEN elapsed time reaches `75` seconds, THE GameManager SHALL return `true` from `isPanicMode()`.
3. WHILE PanicMode is active, THE GameManager SHALL continue increasing BeltSpeedFactor through OvertimeDifficulty.
4. WHILE PanicMode is active, THE GameManager SHALL continue decreasing SpawnIntervalMs through OvertimeDifficulty.
5. THE GameManager SHALL read the panic time threshold from `targetPanicTimeSeconds` in the GameBalanceConfig.

### Requirement 8: Balance Configuration

**User Story:** As a designer, I want all balance values to be configurable through a single config object so that tuning is easy.

#### Acceptance Criteria

1. THE GameManager SHALL define a `DEFAULT_GAME_BALANCE_CONFIG` object containing all tunable balance parameters.
2. THE GameManager SHALL organize the config into sections: `targetPanicTimeSeconds`, `belt`, `spawns`, `economy`, and `upgrades`.
3. THE GameManager SHALL use the GameBalanceConfig values for all difficulty, speed, spawn, income, and cost calculations.
4. WHEN a custom GameBalanceConfig is provided, THE GameManager SHALL use the custom values instead of the defaults.

### Requirement 9: Integration with Existing Systems

**User Story:** As a developer, I want the new difficulty system to replace the old progression curves so that the game uses a single source of truth for pacing.

#### Acceptance Criteria

1. THE ItemSystem SHALL use `GameManager.getNextSpawnDelayMs()` for spawn timing instead of the old jitter-based interval calculation.
2. THE ConveyorSystem SHALL receive belt speed derived from `GameManager.getBeltSpeedFactor()` instead of the old curve-based belt speed.
3. WHEN an item is cashed out, THE GameManager SHALL apply `getIncomeMultiplier()` to the payout value.
4. THE TerminalUI SHALL display upgrade costs from the new `getUpgradeCost(type, nextLevel)` method.
5. THE GameManager SHALL remove dependency on the old `DeliveryConfig` progression curves for difficulty scaling.
