import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GameManager } from '../systems/GameManager';
import { DEFAULT_GAME_BALANCE_CONFIG } from '../data/GameBalanceConfig';

/**
 * Property-based tests for the early-game warm-up system.
 * Uses fast-check with a minimum of 100 iterations per property.
 *
 * The warm-up multiplier follows a three-phase formula:
 *   Phase 1 (0 ≤ t ≤ 15):  multiplier = 3.0
 *   Phase 2 (15 < t < 45):  multiplier = 3.0 - 2.0 × ((t - 15) / 30)
 *   Phase 3 (t ≥ 45):       multiplier = 1.0
 */

// Helper: advance a GameManager to a given elapsed time in seconds
function advanceToSeconds(gm: GameManager, seconds: number): void {
  gm.update(seconds * 1000);
}

// ── Property 1: Warm-up multiplier follows the three-phase formula ──────

describe('Feature: early-game-warmup, Property 1: Warm-up multiplier three-phase formula', () => {
  /**
   * For any non-negative elapsed time t:
   * - If t <= 15: multiplier = 3.0
   * - If 15 < t < 45: multiplier = 3.0 - 2.0 * ((t - 15) / 30)
   * - If t >= 45: multiplier = 1.0
   *
   * The multiplier is always in [1.0, 3.0].
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1**
   */
  it('multiplier matches the expected phase formula for any elapsed time', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        (elapsedSeconds) => {
          const gm = new GameManager();
          advanceToSeconds(gm, elapsedSeconds);

          const multiplier = gm.getWarmUpMultiplier();

          // Compute expected multiplier from the three-phase formula
          let expected: number;
          if (elapsedSeconds <= 15) {
            expected = 3.0;
          } else if (elapsedSeconds >= 45) {
            expected = 1.0;
          } else {
            expected = 3.0 - 2.0 * ((elapsedSeconds - 15) / 30);
          }

          // Allow small floating-point tolerance
          expect(multiplier).toBeCloseTo(expected, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiplier is always in the range [1.0, 3.0]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        (elapsedSeconds) => {
          const gm = new GameManager();
          advanceToSeconds(gm, elapsedSeconds);

          const multiplier = gm.getWarmUpMultiplier();

          expect(multiplier).toBeGreaterThanOrEqual(1.0);
          expect(multiplier).toBeLessThanOrEqual(3.0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 2: Post-warm-up spawn interval is identical to the baseline system ──

describe('Feature: early-game-warmup, Property 2: Post-warm-up spawn interval identity', () => {
  /**
   * For any elapsed time t >= 45 seconds, getSpawnIntervalMs() on a GameManager
   * with warm-up config SHALL return the same value as getSpawnIntervalMs() on a
   * GameManager without warm-up (multiplier = 1.0), given the same elapsed time.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('spawn interval after warm-up matches a baseline system with multiplier 1.0', () => {
    const seed = 42;

    // Baseline config: same as default but with spawnIntervalMultiplier set to 1.0
    const baselineConfig = {
      ...DEFAULT_GAME_BALANCE_CONFIG,
      warmUp: {
        ...DEFAULT_GAME_BALANCE_CONFIG.warmUp,
        spawnIntervalMultiplier: 1.0,
      },
    };

    fc.assert(
      fc.property(
        fc.float({ min: 45, max: 300, noNaN: true }),
        (elapsedSeconds) => {
          const gmDefault = new GameManager(undefined, seed);
          const gmBaseline = new GameManager(baselineConfig, seed);

          advanceToSeconds(gmDefault, elapsedSeconds);
          advanceToSeconds(gmBaseline, elapsedSeconds);

          expect(gmDefault.getSpawnIntervalMs()).toBe(gmBaseline.getSpawnIntervalMs());
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 3: Jitter bounds scale proportionally with warm-up interval ──

describe('Feature: early-game-warmup, Property 3: Jitter bounds scale with warm-up', () => {
  /**
   * For any elapsed time, getNextSpawnDelayMs() SHALL return a value in the range
   * [getSpawnIntervalMs() × randomMinFactor, getSpawnIntervalMs() × randomMaxFactor],
   * with a floor of minIntervalMs. The warm-up multiplier is already baked into
   * getSpawnIntervalMs(), so jitter scales proportionally.
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  it('getNextSpawnDelayMs() falls within the expected jitter range', () => {
    const seed = 12345;
    const { randomMinFactor, randomMaxFactor, minIntervalMs } = DEFAULT_GAME_BALANCE_CONFIG.spawns;

    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        (elapsedSeconds) => {
          const gm = new GameManager(undefined, seed);
          advanceToSeconds(gm, elapsedSeconds);

          const baseInterval = gm.getSpawnIntervalMs();
          const delay = gm.getNextSpawnDelayMs();

          const lowerBound = Math.max(baseInterval * randomMinFactor, minIntervalMs);
          const upperBound = baseInterval * randomMaxFactor;

          expect(delay).toBeGreaterThanOrEqual(lowerBound - 0.001);
          expect(delay).toBeLessThanOrEqual(upperBound + 0.001);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 4: Belt speed is unaffected by warm-up ─────────────────────

describe('Feature: early-game-warmup, Property 4: Belt speed unaffected by warm-up', () => {
  /**
   * For any elapsed time, getBeltSpeedFactor() on a GameManager with warm-up
   * config SHALL return the same value as getBeltSpeedFactor() on a GameManager
   * without warm-up config (multiplier = 1.0), given the same elapsed time.
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  it('belt speed factor is identical with and without warm-up config', () => {
    const seed = 42;

    // Baseline config: same as default but with spawnIntervalMultiplier set to 1.0
    const baselineConfig = {
      ...DEFAULT_GAME_BALANCE_CONFIG,
      warmUp: {
        ...DEFAULT_GAME_BALANCE_CONFIG.warmUp,
        spawnIntervalMultiplier: 1.0,
      },
    };

    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        (elapsedSeconds) => {
          const gmDefault = new GameManager(undefined, seed);
          const gmBaseline = new GameManager(baselineConfig, seed);

          advanceToSeconds(gmDefault, elapsedSeconds);
          advanceToSeconds(gmBaseline, elapsedSeconds);

          expect(gmDefault.getBeltSpeedFactor()).toBe(gmBaseline.getBeltSpeedFactor());
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 5: Warm-up multiplier is monotonically non-increasing ──────

describe('Feature: early-game-warmup, Property 5: Warm-up multiplier monotonicity', () => {
  /**
   * For any two elapsed times t1 <= t2, getWarmUpMultiplier() at t1 SHALL be
   * greater than or equal to getWarmUpMultiplier() at t2. The multiplier never
   * increases over time.
   *
   * **Validates: Requirements 1.1, 2.1, 3.1**
   */
  it('multiplier at t1 >= multiplier at t2 for any t1 <= t2', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        fc.float({ min: 0, max: 300, noNaN: true }),
        (a, b) => {
          // Sort so t1 <= t2
          const t1 = Math.min(a, b);
          const t2 = Math.max(a, b);

          const gm1 = new GameManager();
          const gm2 = new GameManager();

          advanceToSeconds(gm1, t1);
          advanceToSeconds(gm2, t2);

          expect(gm1.getWarmUpMultiplier()).toBeGreaterThanOrEqual(gm2.getWarmUpMultiplier());
        },
      ),
      { numRuns: 100 },
    );
  });
});
