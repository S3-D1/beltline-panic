import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GameManager } from '../systems/GameManager';
import { DEFAULT_GAME_BALANCE_CONFIG } from '../data/GameBalanceConfig';

/**
 * Property-based tests for the adaptive difficulty system.
 * Uses fast-check with a minimum of 100 iterations per property.
 */

// Helper: advance a GameManager to a given elapsed time in ms
function advanceTo(gm: GameManager, elapsedMs: number): void {
  gm.update(elapsedMs);
}

// ── Property 1: TimeDifficulty bounds ───────────────────────────────────

describe('Property 1: TimeDifficulty bounds', () => {
  /**
   * For any non-negative elapsed time, timeDifficulty must be in [0, 1].
   */
  it('timeDifficulty is always in [0, 1] for any elapsed time >= 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 500_000, noNaN: true, noDefaultInfinity: true }),
        (elapsedMs) => {
          const gm = new GameManager();
          advanceTo(gm, elapsedMs);
          const snap = gm.getDifficultySnapshot();
          expect(snap.timeDifficulty).toBeGreaterThanOrEqual(0);
          expect(snap.timeDifficulty).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 2: OvertimeDifficulty bounds ───────────────────────────────

describe('Property 2: OvertimeDifficulty bounds', () => {
  /**
   * For any non-negative elapsed time, overtimeDifficulty must be >= 0.
   * Before panic time, overtimeDifficulty must be exactly 0.
   */
  it('overtimeDifficulty is always >= 0 and is 0 before panic time', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 500_000, noNaN: true, noDefaultInfinity: true }),
        (elapsedMs) => {
          const gm = new GameManager();
          advanceTo(gm, elapsedMs);
          const snap = gm.getDifficultySnapshot();

          expect(snap.overtimeDifficulty).toBeGreaterThanOrEqual(0);

          const elapsedSeconds = elapsedMs / 1000;
          if (elapsedSeconds < DEFAULT_GAME_BALANCE_CONFIG.targetPanicTimeSeconds) {
            expect(snap.overtimeDifficulty).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 3: BeltSpeedFactor monotonicity and floor ──────────────────

describe('Property 3: BeltSpeedFactor monotonicity and floor', () => {
  /**
   * Belt speed factor must be monotonically non-decreasing and always >= 1.0.
   */
  it('beltSpeedFactor is monotonically non-decreasing and always >= 1.0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        (t1Ms, offsetMs) => {
          const t2Ms = t1Ms + offsetMs;

          const gm1 = new GameManager();
          advanceTo(gm1, t1Ms);
          const speed1 = gm1.getBeltSpeedFactor();

          const gm2 = new GameManager();
          advanceTo(gm2, t2Ms);
          const speed2 = gm2.getBeltSpeedFactor();

          expect(speed1).toBeGreaterThanOrEqual(1.0);
          expect(speed2).toBeGreaterThanOrEqual(1.0);
          expect(speed2).toBeGreaterThanOrEqual(speed1 - 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 4: SpawnIntervalMs bounds and monotonicity ─────────────────

describe('Property 4: SpawnIntervalMs bounds and monotonicity', () => {
  /**
   * Spawn interval must always be in [280, 1450 × warmUpMultiplier] and monotonically non-increasing.
   * The warm-up multiplier scales the upper bound during the first 45 seconds.
   */
  it('spawnIntervalMs is always in [280, 1450 × warmUpMultiplier] and monotonically non-increasing', () => {
    const maxWarmUpInterval = DEFAULT_GAME_BALANCE_CONFIG.spawns.startIntervalMs
      * DEFAULT_GAME_BALANCE_CONFIG.warmUp.spawnIntervalMultiplier; // 1450 × 3.0 = 4350

    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        (t1Ms, offsetMs) => {
          const t2Ms = t1Ms + offsetMs;

          const gm1 = new GameManager();
          advanceTo(gm1, t1Ms);
          const interval1 = gm1.getSpawnIntervalMs();

          const gm2 = new GameManager();
          advanceTo(gm2, t2Ms);
          const interval2 = gm2.getSpawnIntervalMs();

          expect(interval1).toBeGreaterThanOrEqual(280);
          expect(interval1).toBeLessThanOrEqual(maxWarmUpInterval);
          expect(interval2).toBeGreaterThanOrEqual(280);
          expect(interval2).toBeLessThanOrEqual(maxWarmUpInterval);
          expect(interval2).toBeLessThanOrEqual(interval1 + 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 5: NextSpawnDelayMs floor ──────────────────────────────────

describe('Property 5: NextSpawnDelayMs floor', () => {
  /**
   * The randomized spawn delay must never go below 280ms.
   */
  it('nextSpawnDelayMs is always >= 280', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        (elapsedMs) => {
          const gm = new GameManager(undefined, 42);
          advanceTo(gm, elapsedMs);

          // Call multiple times to test different random values
          for (let i = 0; i < 5; i++) {
            expect(gm.getNextSpawnDelayMs()).toBeGreaterThanOrEqual(280);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 6: IncomeMultiplier bounds and monotonicity ────────────────

describe('Property 6: IncomeMultiplier bounds and monotonicity', () => {
  /**
   * Income multiplier must always be in [1.0, 1.4] and monotonically non-increasing.
   */
  it('incomeMultiplier is always in [1.0, 1.4] and monotonically non-increasing', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        (t1Ms, offsetMs) => {
          const t2Ms = t1Ms + offsetMs;

          const gm1 = new GameManager();
          advanceTo(gm1, t1Ms);
          const income1 = gm1.getIncomeMultiplier();

          const gm2 = new GameManager();
          advanceTo(gm2, t2Ms);
          const income2 = gm2.getIncomeMultiplier();

          expect(income1).toBeGreaterThanOrEqual(1.0 - 1e-9);
          expect(income1).toBeLessThanOrEqual(1.4 + 1e-9);
          expect(income2).toBeGreaterThanOrEqual(1.0 - 1e-9);
          expect(income2).toBeLessThanOrEqual(1.4 + 1e-9);
          expect(income2).toBeLessThanOrEqual(income1 + 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 7: Upgrade cost monotonicity ───────────────────────────────

describe('Property 7: Upgrade cost monotonicity', () => {
  /**
   * For any upgrade type, cost at level N+1 must be greater than cost at level N.
   */
  it('upgrade cost is monotonically increasing with level', () => {
    const types = ['automation', 'speed', 'capacity', 'quality'];

    fc.assert(
      fc.property(
        fc.constantFrom(...types),
        fc.integer({ min: 1, max: 9 }),
        (type, level) => {
          const gm = new GameManager();
          const costN = gm.getUpgradeCost(type, level);
          const costN1 = gm.getUpgradeCost(type, level + 1);

          expect(costN).toBeGreaterThan(0);
          expect(costN1).toBeGreaterThan(costN);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 8: isPanicMode consistency ─────────────────────────────────

describe('Property 8: isPanicMode consistency', () => {
  /**
   * isPanicMode must be false before 75s and true at or after 75s.
   */
  it('isPanicMode is consistent with elapsed time >= targetPanicTimeSeconds', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        (elapsedMs) => {
          const gm = new GameManager();
          advanceTo(gm, elapsedMs);

          const elapsedSeconds = elapsedMs / 1000;
          const expected = elapsedSeconds >= DEFAULT_GAME_BALANCE_CONFIG.targetPanicTimeSeconds;
          expect(gm.isPanicMode()).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 9: DifficultySnapshot consistency ──────────────────────────

describe('Property 9: DifficultySnapshot consistency', () => {
  /**
   * All fields in the snapshot must be consistent with individual getter methods.
   */
  it('difficultySnapshot fields are consistent with individual getter methods', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 300_000, noNaN: true, noDefaultInfinity: true }),
        (elapsedMs) => {
          const gm = new GameManager(undefined, 42);
          advanceTo(gm, elapsedMs);

          const snap = gm.getDifficultySnapshot();

          expect(snap.beltSpeedFactor).toBe(gm.getBeltSpeedFactor());
          expect(snap.spawnIntervalMs).toBe(gm.getSpawnIntervalMs());
          expect(snap.incomeMultiplier).toBe(gm.getIncomeMultiplier());
          expect(snap.isPanicMode).toBe(gm.isPanicMode());
        },
      ),
      { numRuns: 100 },
    );
  });
});
