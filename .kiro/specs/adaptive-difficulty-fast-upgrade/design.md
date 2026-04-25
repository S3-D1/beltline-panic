# Design Document

## Overview

This design replaces the existing piecewise-linear `DeliveryConfig` progression curves with a power-curve-based difficulty model controlled entirely by `GameManager`. The new system uses elapsed run time to derive all pacing values (belt speed, spawn rate, income, panic mode) through a single `GameBalanceConfig` object. Upgrade costs switch from per-machine exponential pricing to per-type base costs with a shared 10-level cost multiplier array. Quality upgrade definitions are updated with explicit `valueMultiplier` and `sequenceLength` per level.

## Architecture

### Components

1. **GameBalanceConfig** (`src/data/GameBalanceConfig.ts`) — New config file containing `DEFAULT_GAME_BALANCE_CONFIG` with all tunable balance parameters organized into sections: `targetPanicTimeSeconds`, `belt`, `spawns`, `economy`, `upgrades`.

2. **GameManager** (`src/systems/GameManager.ts`) — Extended with difficulty tracking, new API methods (`getBeltSpeedFactor`, `getSpawnIntervalMs`, `getNextSpawnDelayMs`, `getIncomeMultiplier`, `isPanicMode`, `getDifficultySnapshot`, `getUpgradeLevelDefinition`, `startRun`, `resetRun`), and new upgrade cost calculation using per-type base costs.

3. **UpgradeConfig** (`src/data/UpgradeConfig.ts`) — Updated quality tables with new `valueMultiplier` and `sequenceLength` arrays matching the spec. Existing `AUTOMATION_SPEED_TABLE`, `AUTOMATION_LEVEL_TABLE`, and `CAPACITY_TABLE` remain unchanged.

4. **ItemSystem** (`src/systems/ItemSystem.ts`) — Modified to use `GameManager.getNextSpawnDelayMs()` for spawn timing instead of the old jitter-based calculation.

5. **GameScene** (`src/scenes/GameScene.ts`) — Modified to pass `GameManager.getBeltSpeedFactor()` derived speed to `ConveyorSystem.update()` and to apply `getIncomeMultiplier()` to cashout payouts.

6. **TerminalUI** (`src/ui/TerminalUI.ts`) — Modified to display upgrade costs from the new per-type cost system.

### Data Flow

```
GameManager.update(deltaMs)
  ├── elapsedSeconds += deltaMs / 1000
  ├── timeDifficulty = clamp(elapsedSeconds / targetPanicTimeSeconds, 0, 1)
  ├── overtimeDifficulty = max(0, elapsedSeconds - targetPanicTimeSeconds) / 30
  ├── beltSpeedFactor = 1.0 + pow(timeDifficulty, 1.6) * 1.8 + overtimeDifficulty * 0.8
  ├── spawnIntervalMs = lerp(1450, 420, pow(timeDifficulty, 1.25)) - overtimeDifficulty * 120
  │                     clamped to [280, 1450]
  ├── incomeMultiplier = lerp(1.4, 1.0, clamp(elapsedSeconds / 25, 0, 1))
  └── isPanicMode = elapsedSeconds >= targetPanicTimeSeconds

GameScene.update()
  ├── gameManager.update(delta)
  ├── beltSpeed = DELIVERY_CONFIG.initialBeltSpeed * gameManager.getBeltSpeedFactor()
  ├── conveyorSystem.update(delta, items, beltSpeed)
  ├── itemSystem.update(delta, gameManager)  // uses getNextSpawnDelayMs()
  └── for exitedValues: gameManager.addPayout(value * gameManager.getIncomeMultiplier())
```

## Detailed Design

### GameBalanceConfig

New file at `src/data/GameBalanceConfig.ts`:

```typescript
export interface GameBalanceConfig {
  targetPanicTimeSeconds: number;

  belt: {
    baseSpeedFactor: number;
    maxNormalSpeedFactor: number;
    overtimeSpeedGrowth: number;
    curveExponent: number;
  };

  spawns: {
    startIntervalMs: number;
    panicIntervalMs: number;
    minIntervalMs: number;
    curveExponent: number;
    randomMinFactor: number;
    randomMaxFactor: number;
  };

  economy: {
    baseItemValue: number;
    earlyIncomeMultiplier: number;
    earlyIncomeDurationSeconds: number;
  };

  upgrades: {
    baseCosts: Record<string, number>;
    costMultiplierPerLevel: number[];
  };
}

export const DEFAULT_GAME_BALANCE_CONFIG: GameBalanceConfig = {
  targetPanicTimeSeconds: 75,

  belt: {
    baseSpeedFactor: 1.0,
    maxNormalSpeedFactor: 2.8,
    overtimeSpeedGrowth: 0.8,
    curveExponent: 1.6,
  },

  spawns: {
    startIntervalMs: 1450,
    panicIntervalMs: 420,
    minIntervalMs: 280,
    curveExponent: 1.25,
    randomMinFactor: 0.75,
    randomMaxFactor: 1.35,
  },

  economy: {
    baseItemValue: 5,
    earlyIncomeMultiplier: 1.4,
    earlyIncomeDurationSeconds: 25,
  },

  upgrades: {
    baseCosts: {
      automation: 10,
      automationSpeed: 12,
      capacity: 15,
      quality: 20,
    },
    costMultiplierPerLevel: [
      1.0, 1.45, 2.1, 3.0, 4.3,
      6.1, 8.6, 12.0, 16.5, 22.5,
    ],
  },
};
```

### Updated UpgradeConfig Quality Tables

The existing `QUALITY_MODIFIER_TABLE` and `SEQUENCE_LENGTH_TABLE` in `src/data/UpgradeConfig.ts` are updated to match the new spec values:

```typescript
export const QUALITY_MODIFIER_TABLE: readonly number[] = [
  1.00, 1.20, 1.45, 1.75, 2.10, 2.50, 3.00, 3.60, 4.30, 5.10, 6.00,
] as const;

export const SEQUENCE_LENGTH_TABLE: readonly number[] = [
  3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10,
] as const;
```

### GameManager Extensions

The `GameManager` class gains these new fields and methods:

```typescript
// New private fields
private elapsedSeconds: number = 0;
private timeDifficulty: number = 0;
private overtimeDifficulty: number = 0;
private config: GameBalanceConfig;

// Constructor accepts optional config
constructor(config?: GameBalanceConfig) {
  this.config = config ?? DEFAULT_GAME_BALANCE_CONFIG;
  // ... existing init
}

// New public methods
startRun(): void
resetRun(): void
getDifficultySnapshot(): DifficultySnapshot
getBeltSpeedFactor(): number
getSpawnIntervalMs(): number
getNextSpawnDelayMs(): number
getIncomeMultiplier(): number
isPanicMode(): boolean
getUpgradeCost(type: UpgradeType, nextLevel: number): number
getUpgradeLevelDefinition(type: UpgradeType, level: number): unknown
```

The existing `update(delta)` method is modified to:
1. Convert delta from ms to seconds and accumulate `elapsedSeconds`
2. Recalculate `timeDifficulty` and `overtimeDifficulty`
3. Remove the old `evaluateCurve` calls for spawn/belt progression

### UpgradeType Changes

The `UpgradeType` in `UpgradeConfig.ts` is extended to include `'automationSpeed'` as a distinct type for the new per-type cost system. The existing `'speed'` type maps to `'automationSpeed'` in the balance config. The `UPGRADE_DIRECTION_MAP` continues to map `left` → `speed`, and the cost lookup translates `speed` to the `automationSpeed` base cost.

### ItemSystem Spawn Timing

The `ItemSystem` spawn delay calculation changes from:
```typescript
// Old: jitter-based
const interval = gameManager.getSpawnInterval();
const jitter = gameManager.getSpawnJitter();
this.nextDelay = interval + interval * jitter * (2 * this.rng() - 1);
this.nextDelay = Math.max(this.nextDelay, DELIVERY_CONFIG.minSpawnDelay);
```
To:
```typescript
// New: GameManager-controlled
this.nextDelay = gameManager.getNextSpawnDelayMs();
```

### GameScene Belt Speed

The belt speed passed to `ConveyorSystem.update()` changes from:
```typescript
// Old: curve-based
const beltSpeed = this.gameManager.getBeltSpeed();
```
To:
```typescript
// New: factor-based
const beltSpeed = DELIVERY_CONFIG.initialBeltSpeed * this.gameManager.getBeltSpeedFactor();
```

### GameScene Income Multiplier

The payout in the game loop changes from:
```typescript
// Old: direct value
this.gameManager.addPayout(val);
```
To:
```typescript
// New: multiplied value
const multipliedVal = Math.round(val * this.gameManager.getIncomeMultiplier());
this.gameManager.addPayout(multipliedVal);
```

### TerminalUI Cost Display

The `TerminalUI` upgrade cost display changes from using `gameManager.getUpgradeCost(machineId, type)` (per-machine exponential) to using the new per-type cost system. The cost for a given upgrade type at the next level is:

```typescript
const nextLevel = gameManager.getUpgradeLevel(machineId, type) + 1;
const cost = gameManager.getUpgradeCost(type, nextLevel);
```

## Correctness Properties

### Property 1: TimeDifficulty is always in [0, 1]

For any non-negative elapsed time, `timeDifficulty` must be clamped between 0 and 1.

```
FOR ALL elapsedSeconds >= 0:
  0 <= timeDifficulty <= 1
```

### Property 2: OvertimeDifficulty is always non-negative

For any non-negative elapsed time, `overtimeDifficulty` must be >= 0.

```
FOR ALL elapsedSeconds >= 0:
  overtimeDifficulty >= 0
```

### Property 3: OvertimeDifficulty is 0 before panic time

For any elapsed time less than `targetPanicTimeSeconds`, overtime difficulty must be exactly 0.

```
FOR ALL elapsedSeconds in [0, targetPanicTimeSeconds):
  overtimeDifficulty === 0
```

### Property 4: BeltSpeedFactor is monotonically non-decreasing

Belt speed factor must never decrease as elapsed time increases.

```
FOR ALL t1 < t2 where t1 >= 0:
  beltSpeedFactor(t1) <= beltSpeedFactor(t2)
```

### Property 5: BeltSpeedFactor is always >= 1.0

The belt speed multiplier must never go below the base speed.

```
FOR ALL elapsedSeconds >= 0:
  beltSpeedFactor >= 1.0
```

### Property 6: SpawnIntervalMs is always in [280, 1450]

The base spawn interval must always be within the configured bounds.

```
FOR ALL elapsedSeconds >= 0:
  280 <= spawnIntervalMs <= 1450
```

### Property 7: SpawnIntervalMs is monotonically non-increasing

The base spawn interval must never increase as elapsed time increases.

```
FOR ALL t1 < t2 where t1 >= 0:
  spawnIntervalMs(t1) >= spawnIntervalMs(t2)
```

### Property 8: NextSpawnDelayMs is always >= 280

The randomized spawn delay must never go below the minimum.

```
FOR ALL calls to getNextSpawnDelayMs():
  result >= 280
```

### Property 9: IncomeMultiplier is always in [1.0, 1.4]

The income multiplier must always be within the configured range.

```
FOR ALL elapsedSeconds >= 0:
  1.0 <= incomeMultiplier <= 1.4
```

### Property 10: IncomeMultiplier is monotonically non-increasing

The income multiplier must never increase as elapsed time increases.

```
FOR ALL t1 < t2 where t1 >= 0:
  incomeMultiplier(t1) >= incomeMultiplier(t2)
```

### Property 11: Upgrade cost is monotonically increasing with level

For any upgrade type, cost at level N+1 must be greater than cost at level N.

```
FOR ALL type in UpgradeType, level in [1, 9]:
  getUpgradeCost(type, level + 1) > getUpgradeCost(type, level)
```

### Property 12: isPanicMode consistency with elapsed time

Panic mode must be false before 75s and true at or after 75s.

```
FOR ALL elapsedSeconds:
  isPanicMode === (elapsedSeconds >= targetPanicTimeSeconds)
```

### Property 13: DifficultySnapshot internal consistency

All fields in the snapshot must be consistent with each other and with the individual getter methods.

```
FOR ALL snapshots:
  snapshot.beltSpeedFactor === getBeltSpeedFactor()
  snapshot.spawnIntervalMs === getSpawnIntervalMs()
  snapshot.incomeMultiplier === getIncomeMultiplier()
  snapshot.isPanicMode === isPanicMode()
```

## Test Strategy

### Property-Based Tests (fast-check)

Properties 1–13 above are tested with `fast-check` by generating random elapsed times (0–200s) and verifying invariants hold. These are pure math tests with no external dependencies — ideal for PBT.

### Example-Based Tests (vitest)

- Config structure: verify `DEFAULT_GAME_BALANCE_CONFIG` has all required sections and values
- Boundary values: verify exact outputs at t=0, t=25, t=75, t=90
- Upgrade costs: verify specific cost calculations match `round(baseCost * multiplier)`
- Fixed level definitions: verify all table values match spec
- Integration: verify ItemSystem uses `getNextSpawnDelayMs()`, GameScene applies income multiplier

## Files to Change

| File | Change |
|------|--------|
| `src/data/GameBalanceConfig.ts` | **New** — `GameBalanceConfig` interface and `DEFAULT_GAME_BALANCE_CONFIG` |
| `src/data/UpgradeConfig.ts` | Update `QUALITY_MODIFIER_TABLE` and `SEQUENCE_LENGTH_TABLE` values |
| `src/systems/GameManager.ts` | Add difficulty tracking, new API methods, new cost system, accept config |
| `src/systems/ItemSystem.ts` | Use `getNextSpawnDelayMs()` for spawn timing |
| `src/scenes/GameScene.ts` | Use `getBeltSpeedFactor()` for belt speed, apply income multiplier |
| `src/ui/TerminalUI.ts` | Use new per-type upgrade cost display |
| `src/tests/gameManager.test.ts` | Update tests for new API |
| `src/tests/adaptiveDifficulty.property.test.ts` | **New** — Property-based tests for difficulty formulas |
