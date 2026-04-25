import { describe, it, expect } from 'vitest';
import { GameManager } from '../systems/GameManager';
import { DEFAULT_GAME_BALANCE_CONFIG } from '../data/GameBalanceConfig';
import {
  AUTOMATION_SPEED_TABLE,
  AUTOMATION_LEVEL_TABLE,
  SEQUENCE_LENGTH_TABLE,
  QUALITY_MODIFIER_TABLE,
  CAPACITY_TABLE,
} from '../data/UpgradeConfig';

/**
 * Example-based tests for the adaptive difficulty system.
 */

// ── Config structure ────────────────────────────────────────────────────

describe('DEFAULT_GAME_BALANCE_CONFIG structure', () => {
  it('has all required top-level sections', () => {
    expect(DEFAULT_GAME_BALANCE_CONFIG).toHaveProperty('targetPanicTimeSeconds');
    expect(DEFAULT_GAME_BALANCE_CONFIG).toHaveProperty('belt');
    expect(DEFAULT_GAME_BALANCE_CONFIG).toHaveProperty('spawns');
    expect(DEFAULT_GAME_BALANCE_CONFIG).toHaveProperty('economy');
    expect(DEFAULT_GAME_BALANCE_CONFIG).toHaveProperty('upgrades');
  });

  it('targetPanicTimeSeconds is 75', () => {
    expect(DEFAULT_GAME_BALANCE_CONFIG.targetPanicTimeSeconds).toBe(75);
  });

  it('belt section has correct default values', () => {
    const { belt } = DEFAULT_GAME_BALANCE_CONFIG;
    expect(belt.baseSpeedFactor).toBe(1.0);
    expect(belt.maxNormalSpeedFactor).toBe(2.8);
    expect(belt.overtimeSpeedGrowth).toBe(0.8);
    expect(belt.curveExponent).toBe(1.6);
  });

  it('spawns section has correct default values', () => {
    const { spawns } = DEFAULT_GAME_BALANCE_CONFIG;
    expect(spawns.startIntervalMs).toBe(1450);
    expect(spawns.panicIntervalMs).toBe(420);
    expect(spawns.minIntervalMs).toBe(280);
    expect(spawns.curveExponent).toBe(1.25);
    expect(spawns.randomMinFactor).toBe(0.75);
    expect(spawns.randomMaxFactor).toBe(1.35);
  });

  it('economy section has correct default values', () => {
    const { economy } = DEFAULT_GAME_BALANCE_CONFIG;
    expect(economy.baseItemValue).toBe(5);
    expect(economy.earlyIncomeMultiplier).toBe(1.4);
    expect(economy.earlyIncomeDurationSeconds).toBe(25);
  });

  it('upgrades section has correct base costs', () => {
    const { upgrades } = DEFAULT_GAME_BALANCE_CONFIG;
    expect(upgrades.baseCosts.automation).toBe(10);
    expect(upgrades.baseCosts.automationSpeed).toBe(12);
    expect(upgrades.baseCosts.capacity).toBe(15);
    expect(upgrades.baseCosts.quality).toBe(20);
  });

  it('upgrades section has correct costMultiplierPerLevel', () => {
    const { upgrades } = DEFAULT_GAME_BALANCE_CONFIG;
    expect(upgrades.costMultiplierPerLevel).toEqual([
      1.0, 1.45, 2.1, 3.0, 4.3, 6.1, 8.6, 12.0, 16.5, 22.5,
    ]);
  });
});

// ── Boundary values at t=0 ──────────────────────────────────────────────

describe('Boundary values at t=0', () => {
  it('beltSpeedFactor is 1.0', () => {
    const gm = new GameManager();
    expect(gm.getBeltSpeedFactor()).toBe(1.0);
  });

  it('spawnIntervalMs is 1450', () => {
    const gm = new GameManager();
    expect(gm.getSpawnIntervalMs()).toBe(1450);
  });

  it('incomeMultiplier is 1.4', () => {
    const gm = new GameManager();
    expect(gm.getIncomeMultiplier()).toBeCloseTo(1.4, 5);
  });

  it('isPanicMode is false', () => {
    const gm = new GameManager();
    expect(gm.isPanicMode()).toBe(false);
  });

  it('timeDifficulty is 0', () => {
    const gm = new GameManager();
    expect(gm.getDifficultySnapshot().timeDifficulty).toBe(0);
  });

  it('overtimeDifficulty is 0', () => {
    const gm = new GameManager();
    expect(gm.getDifficultySnapshot().overtimeDifficulty).toBe(0);
  });
});

// ── Boundary values at t=75s (panic threshold) ──────────────────────────

describe('Boundary values at t=75s', () => {
  it('beltSpeedFactor is approximately 2.8', () => {
    const gm = new GameManager();
    gm.update(75000); // 75s in ms
    expect(gm.getBeltSpeedFactor()).toBeCloseTo(2.8, 1);
  });

  it('spawnIntervalMs is approximately 420', () => {
    const gm = new GameManager();
    gm.update(75000);
    expect(gm.getSpawnIntervalMs()).toBeCloseTo(420, 0);
  });

  it('incomeMultiplier is 1.0 (faded completely by 25s)', () => {
    const gm = new GameManager();
    gm.update(75000);
    expect(gm.getIncomeMultiplier()).toBeCloseTo(1.0, 5);
  });

  it('isPanicMode is true', () => {
    const gm = new GameManager();
    gm.update(75000);
    expect(gm.isPanicMode()).toBe(true);
  });

  it('timeDifficulty is 1.0', () => {
    const gm = new GameManager();
    gm.update(75000);
    expect(gm.getDifficultySnapshot().timeDifficulty).toBe(1.0);
  });

  it('overtimeDifficulty is 0', () => {
    const gm = new GameManager();
    gm.update(75000);
    expect(gm.getDifficultySnapshot().overtimeDifficulty).toBeCloseTo(0, 5);
  });
});

// ── Overtime values at t=90s ────────────────────────────────────────────

describe('Overtime values at t=90s', () => {
  it('beltSpeedFactor is greater than 2.8', () => {
    const gm = new GameManager();
    gm.update(90000);
    expect(gm.getBeltSpeedFactor()).toBeGreaterThan(2.8);
  });

  it('spawnIntervalMs is less than 420', () => {
    const gm = new GameManager();
    gm.update(90000);
    expect(gm.getSpawnIntervalMs()).toBeLessThan(420);
  });

  it('overtimeDifficulty is 0.5 (15s / 30)', () => {
    const gm = new GameManager();
    gm.update(90000);
    expect(gm.getDifficultySnapshot().overtimeDifficulty).toBeCloseTo(0.5, 5);
  });
});

// ── Income multiplier fade ──────────────────────────────────────────────

describe('Income multiplier fade', () => {
  it('at t=12.5s, incomeMultiplier is 1.2 (midpoint of fade)', () => {
    const gm = new GameManager();
    gm.update(12500);
    expect(gm.getIncomeMultiplier()).toBeCloseTo(1.2, 2);
  });

  it('at t=25s, incomeMultiplier is 1.0', () => {
    const gm = new GameManager();
    gm.update(25000);
    expect(gm.getIncomeMultiplier()).toBeCloseTo(1.0, 5);
  });

  it('at t=50s, incomeMultiplier is still 1.0', () => {
    const gm = new GameManager();
    gm.update(50000);
    expect(gm.getIncomeMultiplier()).toBeCloseTo(1.0, 5);
  });
});

// ── Upgrade cost calculations ───────────────────────────────────────────

describe('Upgrade cost calculations', () => {
  it('automation costs match round(10 * multiplier) for all levels', () => {
    const gm = new GameManager();
    const multipliers = DEFAULT_GAME_BALANCE_CONFIG.upgrades.costMultiplierPerLevel;
    for (let level = 1; level <= 10; level++) {
      expect(gm.getUpgradeCost('automation', level)).toBe(
        Math.round(10 * multipliers[level - 1]),
      );
    }
  });

  it('automationSpeed costs match round(12 * multiplier) for all levels', () => {
    const gm = new GameManager();
    const multipliers = DEFAULT_GAME_BALANCE_CONFIG.upgrades.costMultiplierPerLevel;
    for (let level = 1; level <= 10; level++) {
      expect(gm.getUpgradeCost('automationSpeed', level)).toBe(
        Math.round(12 * multipliers[level - 1]),
      );
    }
  });

  it('capacity costs match round(15 * multiplier) for all levels', () => {
    const gm = new GameManager();
    const multipliers = DEFAULT_GAME_BALANCE_CONFIG.upgrades.costMultiplierPerLevel;
    for (let level = 1; level <= 10; level++) {
      expect(gm.getUpgradeCost('capacity', level)).toBe(
        Math.round(15 * multipliers[level - 1]),
      );
    }
  });

  it('quality costs match round(20 * multiplier) for all levels', () => {
    const gm = new GameManager();
    const multipliers = DEFAULT_GAME_BALANCE_CONFIG.upgrades.costMultiplierPerLevel;
    for (let level = 1; level <= 10; level++) {
      expect(gm.getUpgradeCost('quality', level)).toBe(
        Math.round(20 * multipliers[level - 1]),
      );
    }
  });

  it('returns -1 for level 0 (below range)', () => {
    const gm = new GameManager();
    expect(gm.getUpgradeCost('automation', 0)).toBe(-1);
  });

  it('returns -1 for level 11 (above range)', () => {
    const gm = new GameManager();
    expect(gm.getUpgradeCost('automation', 11)).toBe(-1);
  });
});

// ── Fixed level definitions ─────────────────────────────────────────────

describe('Fixed level definitions', () => {
  it('automation levels match AUTOMATION_LEVEL_TABLE', () => {
    const gm = new GameManager();
    for (let level = 0; level <= 10; level++) {
      const def = gm.getUpgradeLevelDefinition('automation', level) as { automationLevel: number };
      expect(def.automationLevel).toBe(AUTOMATION_LEVEL_TABLE[level]);
    }
  });

  it('automationSpeed levels match AUTOMATION_SPEED_TABLE', () => {
    const gm = new GameManager();
    for (let level = 0; level <= 10; level++) {
      const def = gm.getUpgradeLevelDefinition('automationSpeed', level) as { speedMs: number };
      expect(def.speedMs).toBe(AUTOMATION_SPEED_TABLE[level]);
    }
  });

  it('capacity levels match CAPACITY_TABLE', () => {
    const gm = new GameManager();
    for (let level = 0; level <= 10; level++) {
      const def = gm.getUpgradeLevelDefinition('capacity', level) as { capacity: number };
      expect(def.capacity).toBe(CAPACITY_TABLE[level]);
    }
  });

  it('quality levels have correct valueMultiplier and sequenceLength', () => {
    const gm = new GameManager();
    for (let level = 0; level <= 10; level++) {
      const def = gm.getUpgradeLevelDefinition('quality', level) as {
        valueMultiplier: number;
        sequenceLength: number;
      };
      expect(def.valueMultiplier).toBe(QUALITY_MODIFIER_TABLE[level]);
      expect(def.sequenceLength).toBe(SEQUENCE_LENGTH_TABLE[level]);
    }
  });

  it('returns null for invalid level', () => {
    const gm = new GameManager();
    expect(gm.getUpgradeLevelDefinition('automation', -1)).toBeNull();
    expect(gm.getUpgradeLevelDefinition('automation', 11)).toBeNull();
  });

  it('returns null for unknown type', () => {
    const gm = new GameManager();
    expect(gm.getUpgradeLevelDefinition('unknown', 0)).toBeNull();
  });
});

// ── startRun / resetRun ─────────────────────────────────────────────────

describe('startRun / resetRun', () => {
  it('startRun resets all difficulty values', () => {
    const gm = new GameManager();
    gm.update(80000); // advance past panic
    expect(gm.isPanicMode()).toBe(true);

    gm.startRun();
    const snap = gm.getDifficultySnapshot();
    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.timeDifficulty).toBe(0);
    expect(snap.overtimeDifficulty).toBe(0);
    expect(gm.isPanicMode()).toBe(false);
    expect(gm.getBeltSpeedFactor()).toBe(1.0);
    expect(gm.getSpawnIntervalMs()).toBe(1450);
    expect(gm.getIncomeMultiplier()).toBeCloseTo(1.4, 5);
  });

  it('resetRun is an alias for startRun', () => {
    const gm = new GameManager();
    gm.update(80000);
    gm.resetRun();
    expect(gm.getDifficultySnapshot().elapsedSeconds).toBe(0);
    expect(gm.isPanicMode()).toBe(false);
  });
});
