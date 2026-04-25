import { describe, it, expect } from 'vitest';
import { GameManager } from '../systems/GameManager';
import { DEFAULT_GAME_BALANCE_CONFIG } from '../data/GameBalanceConfig';

/**
 * Example-based unit tests for the early-game warm-up system.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.3, 2.4, 3.1, 3.2, 4.1, 4.3, 5.1, 5.2, 6.1, 6.2
 */

// Helper: advance a GameManager to a given elapsed time in seconds
function advanceToSeconds(gm: GameManager, seconds: number): void {
  gm.update(seconds * 1000);
}

// ── Config structure ────────────────────────────────────────────────────

describe('warmUp config structure', () => {
  it('DEFAULT_GAME_BALANCE_CONFIG.warmUp has expected default values', () => {
    const { warmUp } = DEFAULT_GAME_BALANCE_CONFIG;
    expect(warmUp.warmUpEndSeconds).toBe(15);
    expect(warmUp.transitionEndSeconds).toBe(45);
    expect(warmUp.spawnIntervalMultiplier).toBe(3.0);
  });
});

// ── Warm-up multiplier boundary values ──────────────────────────────────

describe('Warm-up multiplier boundary values', () => {
  it('at t=0, multiplier is exactly 3.0', () => {
    const gm = new GameManager();
    expect(gm.getWarmUpMultiplier()).toBe(3.0);
  });

  it('at t=0, effective spawn interval is 1450 × 3.0 = 4350ms', () => {
    const gm = new GameManager();
    expect(gm.getSpawnIntervalMs()).toBe(4350);
  });

  it('at t=15, multiplier is exactly 3.0', () => {
    const gm = new GameManager();
    advanceToSeconds(gm, 15);
    expect(gm.getWarmUpMultiplier()).toBe(3.0);
  });

  it('at t=45, multiplier is exactly 1.0', () => {
    const gm = new GameManager();
    advanceToSeconds(gm, 45);
    expect(gm.getWarmUpMultiplier()).toBe(1.0);
  });

  it('at t=30 (mid-transition), multiplier is exactly 2.0', () => {
    const gm = new GameManager();
    advanceToSeconds(gm, 30);
    expect(gm.getWarmUpMultiplier()).toBe(2.0);
  });
});

// ── Custom config ───────────────────────────────────────────────────────

describe('Custom warmUp config', () => {
  it('GameManager with custom warmUp values uses those values correctly', () => {
    const customConfig = {
      ...DEFAULT_GAME_BALANCE_CONFIG,
      warmUp: {
        warmUpEndSeconds: 10,
        transitionEndSeconds: 30,
        spawnIntervalMultiplier: 5.0,
      },
    };

    const gm = new GameManager(customConfig);

    // During warm-up phase (t <= 10): multiplier = 5.0
    expect(gm.getWarmUpMultiplier()).toBe(5.0);

    // At t=10: still in warm-up, multiplier = 5.0
    advanceToSeconds(gm, 10);
    expect(gm.getWarmUpMultiplier()).toBe(5.0);

    // At t=20 (midpoint of 10..30 transition): multiplier = 5.0 - 4.0 * 0.5 = 3.0
    const gm2 = new GameManager(customConfig);
    advanceToSeconds(gm2, 20);
    expect(gm2.getWarmUpMultiplier()).toBe(3.0);

    // At t=30: transition complete, multiplier = 1.0
    const gm3 = new GameManager(customConfig);
    advanceToSeconds(gm3, 30);
    expect(gm3.getWarmUpMultiplier()).toBe(1.0);
  });
});

// ── Reset on new run ────────────────────────────────────────────────────

describe('Warm-up reset on new run', () => {
  it('after advancing past warm-up, startRun() resets multiplier to 3.0', () => {
    const gm = new GameManager();

    // Advance past the warm-up and transition phases
    advanceToSeconds(gm, 60);
    expect(gm.getWarmUpMultiplier()).toBe(1.0);

    // Reset the run
    gm.startRun();

    // Multiplier should be back to 3.0 (elapsed time is 0 again)
    expect(gm.getWarmUpMultiplier()).toBe(3.0);
    expect(gm.getSpawnIntervalMs()).toBe(4350);
  });
});

// ── Spawn interval with jitter at t=0 ──────────────────────────────────

describe('Spawn interval with jitter at t=0', () => {
  it('getNextSpawnDelayMs() at t=0 falls in expected jitter range around 4350ms', () => {
    const seed = 42;
    const gm = new GameManager(undefined, seed);

    const baseInterval = gm.getSpawnIntervalMs();
    expect(baseInterval).toBe(4350);

    const { randomMinFactor, randomMaxFactor, minIntervalMs } = DEFAULT_GAME_BALANCE_CONFIG.spawns;
    const lowerBound = Math.max(baseInterval * randomMinFactor, minIntervalMs); // 4350 * 0.75 = 3262.5
    const upperBound = baseInterval * randomMaxFactor; // 4350 * 1.35 = 5872.5

    const delay = gm.getNextSpawnDelayMs();
    expect(delay).toBeGreaterThanOrEqual(lowerBound);
    expect(delay).toBeLessThanOrEqual(upperBound);
  });
});
