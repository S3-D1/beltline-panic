import { describe, it, expect } from 'vitest';
import { evaluateCurve } from '../utils/progression';
import { ProgressionPoint } from '../data/DeliveryConfig';

/**
 * Unit tests for evaluateCurve — piecewise-linear interpolation.
 * Requirements: 3.4
 */
describe('evaluateCurve', () => {
  // --- Empty curve ---

  it('returns 1.0 for an empty curve', () => {
    expect(evaluateCurve([], 0)).toBe(1.0);
    expect(evaluateCurve([], 50000)).toBe(1.0);
    expect(evaluateCurve([], -100)).toBe(1.0);
  });

  // --- Single-point curve ---

  it('returns the single point multiplier regardless of time', () => {
    const curve: ProgressionPoint[] = [{ time: 10000, multiplier: 2.5 }];
    expect(evaluateCurve(curve, 0)).toBe(2.5);
    expect(evaluateCurve(curve, 10000)).toBe(2.5);
    expect(evaluateCurve(curve, 99999)).toBe(2.5);
  });

  // --- Before first point ---

  it('returns the first multiplier when time is before the first point', () => {
    const curve: ProgressionPoint[] = [
      { time: 1000, multiplier: 1.0 },
      { time: 5000, multiplier: 2.0 },
    ];
    expect(evaluateCurve(curve, 0)).toBe(1.0);
    expect(evaluateCurve(curve, 500)).toBe(1.0);
    expect(evaluateCurve(curve, -1000)).toBe(1.0);
  });

  // --- After last point ---

  it('returns the last multiplier when time is after the last point', () => {
    const curve: ProgressionPoint[] = [
      { time: 0, multiplier: 1.0 },
      { time: 60000, multiplier: 0.5 },
    ];
    expect(evaluateCurve(curve, 60000)).toBe(0.5);
    expect(evaluateCurve(curve, 100000)).toBe(0.5);
    expect(evaluateCurve(curve, 999999)).toBe(0.5);
  });

  // --- Interpolation between known points ---

  it('interpolates linearly at the midpoint of two points', () => {
    const curve: ProgressionPoint[] = [
      { time: 0, multiplier: 1.0 },
      { time: 10000, multiplier: 2.0 },
    ];
    // Midpoint: t=5000 → multiplier = 1.5
    expect(evaluateCurve(curve, 5000)).toBe(1.5);
  });

  it('interpolates linearly at 25% between two points', () => {
    const curve: ProgressionPoint[] = [
      { time: 0, multiplier: 1.0 },
      { time: 10000, multiplier: 2.0 },
    ];
    // 25%: t=2500 → multiplier = 1.25
    expect(evaluateCurve(curve, 2500)).toBe(1.25);
  });

  it('interpolates correctly across a multi-segment curve', () => {
    const curve: ProgressionPoint[] = [
      { time: 0, multiplier: 1.0 },
      { time: 60000, multiplier: 0.7 },
      { time: 120000, multiplier: 0.5 },
      { time: 300000, multiplier: 0.3 },
    ];

    // At exact points
    expect(evaluateCurve(curve, 0)).toBe(1.0);
    expect(evaluateCurve(curve, 60000)).toBe(0.7);
    expect(evaluateCurve(curve, 120000)).toBe(0.5);
    expect(evaluateCurve(curve, 300000)).toBe(0.3);

    // Midpoint of first segment: t=30000 → 1.0 + 0.5*(0.7-1.0) = 0.85
    expect(evaluateCurve(curve, 30000)).toBeCloseTo(0.85, 10);

    // Midpoint of second segment: t=90000 → 0.7 + 0.5*(0.5-0.7) = 0.6
    expect(evaluateCurve(curve, 90000)).toBeCloseTo(0.6, 10);

    // Midpoint of third segment: t=210000 → 0.5 + 0.5*(0.3-0.5) = 0.4
    expect(evaluateCurve(curve, 210000)).toBeCloseTo(0.4, 10);
  });

  it('interpolates with increasing multipliers (belt speed curve)', () => {
    const curve: ProgressionPoint[] = [
      { time: 0, multiplier: 1.0 },
      { time: 60000, multiplier: 1.3 },
      { time: 120000, multiplier: 1.7 },
    ];

    // Midpoint of first segment: t=30000 → 1.0 + 0.5*(1.3-1.0) = 1.15
    expect(evaluateCurve(curve, 30000)).toBeCloseTo(1.15, 10);

    // Midpoint of second segment: t=90000 → 1.3 + 0.5*(1.7-1.3) = 1.5
    expect(evaluateCurve(curve, 90000)).toBeCloseTo(1.5, 10);
  });

  // --- Exact boundary values ---

  it('returns exact multiplier when time matches a curve point exactly', () => {
    const curve: ProgressionPoint[] = [
      { time: 0, multiplier: 1.0 },
      { time: 5000, multiplier: 3.0 },
      { time: 10000, multiplier: 5.0 },
    ];
    expect(evaluateCurve(curve, 0)).toBe(1.0);
    expect(evaluateCurve(curve, 5000)).toBe(3.0);
    expect(evaluateCurve(curve, 10000)).toBe(5.0);
  });
});

import { GameManager } from '../systems/GameManager';
import { DELIVERY_CONFIG } from '../data/DeliveryConfig';

/**
 * Unit tests for GameManager delivery API.
 * Requirements: 2.1, 2.2, 2.3, 2.6, 4.3, 7.3
 */
describe('GameManager delivery API', () => {
  // --- Initial values match DELIVERY_CONFIG (Req 2.6, 4.3) ---

  it('initializes spawnInterval from DELIVERY_CONFIG', () => {
    const gm = new GameManager();
    expect(gm.getSpawnInterval()).toBe(DELIVERY_CONFIG.initialSpawnInterval);
  });

  it('initializes beltSpeed from DELIVERY_CONFIG', () => {
    const gm = new GameManager();
    expect(gm.getBeltSpeed()).toBe(DELIVERY_CONFIG.initialBeltSpeed);
  });

  it('initializes jitter from DELIVERY_CONFIG', () => {
    const gm = new GameManager();
    expect(gm.getSpawnJitter()).toBe(DELIVERY_CONFIG.initialJitter);
  });

  it('initializes elapsedTime to 0', () => {
    const gm = new GameManager();
    expect(gm.getElapsedTime()).toBe(0);
  });

  // --- Getters return expected values after construction (Req 2.1, 2.2, 2.3, 7.3) ---

  it('getSpawnInterval returns a number', () => {
    const gm = new GameManager();
    expect(typeof gm.getSpawnInterval()).toBe('number');
  });

  it('getSpawnJitter returns a number in [0, 1]', () => {
    const gm = new GameManager();
    const jitter = gm.getSpawnJitter();
    expect(jitter).toBeGreaterThanOrEqual(0);
    expect(jitter).toBeLessThanOrEqual(1);
  });

  it('getBeltSpeed returns a positive number', () => {
    const gm = new GameManager();
    expect(gm.getBeltSpeed()).toBeGreaterThan(0);
  });

  it('getElapsedTime returns a number', () => {
    const gm = new GameManager();
    expect(typeof gm.getElapsedTime()).toBe('number');
  });

  // --- update(delta) advances elapsed time correctly (Req 2.6, 3.1) ---

  it('update(delta) advances elapsedTime by delta', () => {
    const gm = new GameManager();
    gm.update(1000);
    expect(gm.getElapsedTime()).toBe(1000);
  });

  it('multiple updates accumulate elapsedTime', () => {
    const gm = new GameManager();
    gm.update(500);
    gm.update(300);
    gm.update(200);
    expect(gm.getElapsedTime()).toBe(1000);
  });

  it('update(0) does not change elapsedTime', () => {
    const gm = new GameManager();
    gm.update(0);
    expect(gm.getElapsedTime()).toBe(0);
  });

  it('update recalculates spawnInterval based on progression curve', () => {
    const gm = new GameManager();
    // Advance to 60000 ms (1 min) — spawn multiplier should be 0.7
    gm.update(60000);
    expect(gm.getSpawnInterval()).toBeCloseTo(
      DELIVERY_CONFIG.initialSpawnInterval * 0.7,
      5,
    );
  });

  it('update recalculates beltSpeed based on progression curve', () => {
    const gm = new GameManager();
    // Advance to 60000 ms (1 min) — belt multiplier should be 1.3
    gm.update(60000);
    expect(gm.getBeltSpeed()).toBeCloseTo(
      DELIVERY_CONFIG.initialBeltSpeed * 1.3,
      5,
    );
  });
});

import { createSeededRandom } from '../utils/random';

/**
 * Helper: compute a jittered spawn delay using the same formula as ItemSystem.
 * delay = interval + interval * jitter * (2 * rng() - 1)
 * delay = max(delay, minSpawnDelay)
 */
function computeJitteredDelay(
  interval: number,
  jitter: number,
  rng: () => number,
  minSpawnDelay: number,
): number {
  const raw = interval + interval * jitter * (2 * rng() - 1);
  return Math.max(raw, minSpawnDelay);
}

/**
 * Unit tests for ItemSystem jittered spawning logic.
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.4
 */
describe('ItemSystem jittered spawning', () => {
  // --- Jitter 0: perfectly even intervals (Req 1.3) ---

  it('with jitter 0 and a fixed seed, spawn intervals are perfectly even', () => {
    const rng = createSeededRandom(42);
    const interval = 3000;
    const jitter = 0;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay;

    const delays: number[] = [];
    for (let i = 0; i < 20; i++) {
      delays.push(computeJitteredDelay(interval, jitter, rng, minDelay));
    }

    // Every delay should be exactly the interval
    for (const d of delays) {
      expect(d).toBe(interval);
    }
  });

  it('with jitter 0, all delays in a sequence are identical', () => {
    const rng = createSeededRandom(999);
    const interval = 2000;
    const jitter = 0;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay;

    const delays: number[] = [];
    for (let i = 0; i < 10; i++) {
      delays.push(computeJitteredDelay(interval, jitter, rng, minDelay));
    }

    const unique = new Set(delays);
    expect(unique.size).toBe(1);
    expect(delays[0]).toBe(interval);
  });

  // --- Jitter > 0: spawn intervals vary (Req 1.1, 1.2) ---

  it('with jitter > 0, spawn intervals vary across a sequence', () => {
    const rng = createSeededRandom(42);
    const interval = 3000;
    const jitter = 0.25;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay;

    const delays: number[] = [];
    for (let i = 0; i < 20; i++) {
      delays.push(computeJitteredDelay(interval, jitter, rng, minDelay));
    }

    const unique = new Set(delays);
    // With 20 samples and jitter 0.25, we expect multiple distinct values
    expect(unique.size).toBeGreaterThan(1);
  });

  it('with jitter > 0, delays fall within the expected jitter bounds', () => {
    const rng = createSeededRandom(123);
    const interval = 3000;
    const jitter = 0.25;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay;

    const lowerBound = interval * (1 - jitter); // 2250
    const upperBound = interval * (1 + jitter); // 3750

    for (let i = 0; i < 50; i++) {
      const delay = computeJitteredDelay(interval, jitter, rng, minDelay);
      // After clamping, delay >= minDelay, but the raw value is within bounds
      // Since interval*(1-jitter) = 2250 > 200 = minDelay, clamp doesn't affect this case
      expect(delay).toBeGreaterThanOrEqual(lowerBound);
      expect(delay).toBeLessThanOrEqual(upperBound);
    }
  });

  // --- Minimum spawn delay clamp (Req 1.5) ---

  it('spawn delay never goes below minSpawnDelay', () => {
    const rng = createSeededRandom(42);
    // Use a very small interval with high jitter to force the clamp
    const interval = 250;
    const jitter = 1.0;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay; // 200 ms

    for (let i = 0; i < 100; i++) {
      const delay = computeJitteredDelay(interval, jitter, rng, minDelay);
      expect(delay).toBeGreaterThanOrEqual(minDelay);
    }
  });

  it('clamp activates when raw delay would be below minSpawnDelay', () => {
    // Construct a scenario where interval * (1 - jitter) < minSpawnDelay
    // interval=300, jitter=0.5 → lower bound = 150, which is < 200
    const rng = createSeededRandom(7);
    const interval = 300;
    const jitter = 0.5;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay; // 200 ms

    let clampedCount = 0;
    const trials = 100;
    for (let i = 0; i < trials; i++) {
      const delay = computeJitteredDelay(interval, jitter, rng, minDelay);
      expect(delay).toBeGreaterThanOrEqual(minDelay);
      if (delay === minDelay) clampedCount++;
    }

    // With interval=300, jitter=0.5, raw range is [150, 450].
    // Values in [150, 200) get clamped to 200. We expect some clamped values.
    expect(clampedCount).toBeGreaterThan(0);
  });

  it('minSpawnDelay is 200 ms as configured', () => {
    expect(DELIVERY_CONFIG.minSpawnDelay).toBe(200);
  });

  // --- Determinism with same seed (Req 1.4, 2.4) ---

  it('same seed produces identical delay sequences', () => {
    const interval = 3000;
    const jitter = 0.25;
    const minDelay = DELIVERY_CONFIG.minSpawnDelay;

    const rng1 = createSeededRandom(42);
    const rng2 = createSeededRandom(42);

    for (let i = 0; i < 20; i++) {
      const d1 = computeJitteredDelay(interval, jitter, rng1, minDelay);
      const d2 = computeJitteredDelay(interval, jitter, rng2, minDelay);
      expect(d1).toBe(d2);
    }
  });
});

import fs from 'fs';
import path from 'path';

/**
 * Integration unit tests for the wired dynamic delivery system.
 * Requirements: 2.4, 2.5, 3.2, 3.3, 6.5
 */
describe('Wired system integration', () => {
  // --- GameManager elapsed time advances after several frames (Req 2.4) ---

  it('gameManager.getElapsedTime() advances after several update frames', () => {
    const gm = new GameManager();
    const deltas = [16, 16, 16, 16, 16]; // 5 frames at ~60fps
    for (const d of deltas) {
      gm.update(d);
    }
    expect(gm.getElapsedTime()).toBe(80);
    expect(gm.getElapsedTime()).toBeGreaterThan(0);
  });

  // --- Spawn interval decreases over simulated time (Req 3.2) ---

  it('gameManager.getSpawnInterval() decreases over simulated time', () => {
    const gm = new GameManager();
    const initialInterval = gm.getSpawnInterval();

    // Advance to 60 seconds (1 min) — multiplier should be 0.7
    gm.update(60000);
    const intervalAt1Min = gm.getSpawnInterval();
    expect(intervalAt1Min).toBeLessThan(initialInterval);

    // Advance to 120 seconds (2 min total) — multiplier should be 0.5
    gm.update(60000);
    const intervalAt2Min = gm.getSpawnInterval();
    expect(intervalAt2Min).toBeLessThan(intervalAt1Min);

    // Advance to 300 seconds (5 min total) — multiplier should be 0.3
    gm.update(180000);
    const intervalAt5Min = gm.getSpawnInterval();
    expect(intervalAt5Min).toBeLessThan(intervalAt2Min);
  });

  // --- Belt speed increases over simulated time (Req 3.3) ---

  it('gameManager.getBeltSpeed() increases over simulated time', () => {
    const gm = new GameManager();
    const initialSpeed = gm.getBeltSpeed();

    // Advance to 60 seconds (1 min) — multiplier should be 1.3
    gm.update(60000);
    const speedAt1Min = gm.getBeltSpeed();
    expect(speedAt1Min).toBeGreaterThan(initialSpeed);

    // Advance to 120 seconds (2 min total) — multiplier should be 1.7
    gm.update(60000);
    const speedAt2Min = gm.getBeltSpeed();
    expect(speedAt2Min).toBeGreaterThan(speedAt1Min);

    // Advance to 300 seconds (5 min total) — multiplier should be 2.5
    gm.update(180000);
    const speedAt5Min = gm.getBeltSpeed();
    expect(speedAt5Min).toBeGreaterThan(speedAt2Min);
  });

  // --- Backward compatibility: CONVEYOR_SPEED and SPAWN_INTERVAL still exported (Req 6.5) ---

  it('ConveyorConfig.ts still exports CONVEYOR_SPEED constant', () => {
    const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
    const source = fs.readFileSync(configPath, 'utf-8');
    expect(source).toMatch(/export\s+(const|let|var)\s+CONVEYOR_SPEED\b/);
  });

  it('ConveyorConfig.ts still exports SPAWN_INTERVAL constant', () => {
    const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
    const source = fs.readFileSync(configPath, 'utf-8');
    expect(source).toMatch(/export\s+(const|let|var)\s+SPAWN_INTERVAL\b/);
  });

  // --- ItemSystem source does NOT import SPAWN_INTERVAL (Req 2.4) ---

  it('ItemSystem source does not import SPAWN_INTERVAL', () => {
    const itemSystemPath = path.resolve(__dirname, '../systems/ItemSystem.ts');
    const source = fs.readFileSync(itemSystemPath, 'utf-8');
    // Should not have SPAWN_INTERVAL in any import statement
    const importLines = source.split('\n').filter(line => line.match(/^\s*import\b/));
    for (const line of importLines) {
      expect(line).not.toContain('SPAWN_INTERVAL');
    }
  });

  // --- ConveyorSystem update() does not reference CONVEYOR_SPEED internally (Req 2.5) ---

  it('ConveyorSystem update() body does not reference CONVEYOR_SPEED', () => {
    const conveyorPath = path.resolve(__dirname, '../systems/ConveyorSystem.ts');
    const source = fs.readFileSync(conveyorPath, 'utf-8');

    // Extract the update method body
    const updateStart = source.indexOf('update(');
    expect(updateStart).toBeGreaterThan(-1);

    // Find the method body by counting braces from the opening {
    const bodyStart = source.indexOf('{', updateStart);
    let depth = 0;
    let bodyEnd = bodyStart;
    for (let i = bodyStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      if (source[i] === '}') depth--;
      if (depth === 0) {
        bodyEnd = i;
        break;
      }
    }

    const updateBody = source.slice(bodyStart, bodyEnd + 1);
    expect(updateBody).not.toContain('CONVEYOR_SPEED');
  });
});
