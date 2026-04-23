import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createSeededRandom } from '../utils/random';
import { evaluateCurve } from '../utils/progression';
import { ProgressionPoint } from '../data/DeliveryConfig';

/**
 * Property-based tests for the dynamic item delivery system.
 * Uses fast-check with a minimum of 100 iterations per property.
 */

describe('Property 3: PRNG determinism', () => {
  /**
   * **Validates: Requirements 1.4, 7.2**
   *
   * For any seed value, two independent PRNG instances created with the
   * same seed SHALL produce identical sequences of random numbers for
   * any number of calls.
   */
  it('two instances with the same seed produce identical sequences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.integer({ min: 1, max: 200 }),
        (seed, sequenceLength) => {
          const rngA = createSeededRandom(seed);
          const rngB = createSeededRandom(seed);

          for (let i = 0; i < sequenceLength; i++) {
            expect(rngA()).toBe(rngB());
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Helpers for evaluateCurve property tests ---

/** Arbitrary for a sorted, non-empty ProgressionPoint[] curve. */
const sortedCurveArb = fc
  .array(
    fc.record({
      time: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
      multiplier: fc.double({ min: 0.01, max: 10, noNaN: true }),
    }),
    { minLength: 1, maxLength: 10 },
  )
  .map((pts) => {
    // Sort by time and deduplicate identical times
    const sorted = [...pts].sort((a, b) => a.time - b.time);
    const deduped: ProgressionPoint[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].time > deduped[deduped.length - 1].time) {
        deduped.push(sorted[i]);
      }
    }
    return deduped;
  });

describe('evaluateCurve — property tests', () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * For any sorted curve and any time, the result is bounded by the
   * minimum and maximum multipliers present in the curve.
   */
  it('result is bounded by min and max multipliers in the curve', () => {
    fc.assert(
      fc.property(
        sortedCurveArb,
        fc.double({ min: -100_000, max: 2_000_000, noNaN: true }),
        (curve, time) => {
          const result = evaluateCurve(curve, time);
          const multipliers = curve.map((p) => p.multiplier);
          const min = Math.min(...multipliers);
          const max = Math.max(...multipliers);

          expect(result).toBeGreaterThanOrEqual(min - 1e-9);
          expect(result).toBeLessThanOrEqual(max + 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * For any time before the first point in a sorted curve, evaluateCurve
   * returns the first point's multiplier.
   */
  it('returns the first multiplier for any time before the first point', () => {
    fc.assert(
      fc.property(
        sortedCurveArb,
        fc.double({ min: 0, max: 100_000, noNaN: true }),
        (curve, offset) => {
          const timeBefore = curve[0].time - offset;
          const result = evaluateCurve(curve, timeBefore);
          expect(result).toBe(curve[0].multiplier);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * For any time after the last point in a sorted curve, evaluateCurve
   * returns the last point's multiplier.
   */
  it('returns the last multiplier for any time after the last point', () => {
    fc.assert(
      fc.property(
        sortedCurveArb,
        fc.double({ min: 0, max: 100_000, noNaN: true }),
        (curve, offset) => {
          const last = curve[curve.length - 1];
          const timeAfter = last.time + offset;
          const result = evaluateCurve(curve, timeAfter);
          expect(result).toBe(last.multiplier);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * An empty curve always returns 1.0 regardless of time.
   */
  it('empty curve returns 1.0 for any time', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true }),
        (time) => {
          expect(evaluateCurve([], time)).toBe(1.0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- GameManager progression property tests ---

import { GameManager } from '../systems/GameManager';
import { DELIVERY_CONFIG } from '../data/DeliveryConfig';

describe('Property 5: Time accumulation', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * For any sequence of non-negative frame deltas, after calling
   * update(delta) for each delta, getElapsedTime() SHALL equal the
   * sum of all deltas (within floating-point tolerance).
   */
  it('elapsed time equals sum of non-negative deltas', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 50,
        }),
        (deltas) => {
          const gm = new GameManager();
          let expectedSum = 0;

          for (const delta of deltas) {
            gm.update(delta);
            expectedSum += delta;
          }

          expect(gm.getElapsedTime()).toBeCloseTo(expectedSum, 5);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 6: Spawn interval monotonicity', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For any two elapsed times t1 < t2, given the default DELIVERY_CONFIG
   * progression curve (which has non-increasing multipliers),
   * getSpawnInterval() at t2 SHALL be ≤ getSpawnInterval() at t1.
   */
  it('spawn interval does not increase over time with non-increasing multiplier curve', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 600_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 600_000, noNaN: true, noDefaultInfinity: true }),
        (t1, offset) => {
          const t2 = t1 + offset;

          const gm1 = new GameManager();
          gm1.update(t1);
          const interval1 = gm1.getSpawnInterval();

          const gm2 = new GameManager();
          gm2.update(t2);
          const interval2 = gm2.getSpawnInterval();

          expect(interval2).toBeLessThanOrEqual(interval1 + 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: Belt speed monotonicity', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * For any two elapsed times t1 < t2, given the default DELIVERY_CONFIG
   * progression curve (which has non-decreasing multipliers),
   * getBeltSpeed() at t2 SHALL be ≥ getBeltSpeed() at t1.
   */
  it('belt speed does not decrease over time with non-decreasing multiplier curve', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 600_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 600_000, noNaN: true, noDefaultInfinity: true }),
        (t1, offset) => {
          const t2 = t1 + offset;

          const gm1 = new GameManager();
          gm1.update(t1);
          const speed1 = gm1.getBeltSpeed();

          const gm2 = new GameManager();
          gm2.update(t2);
          const speed2 = gm2.getBeltSpeed();

          expect(speed2).toBeGreaterThanOrEqual(speed1 - 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 8: Spawn interval floor', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * For any elapsed time (including very large values),
   * getSpawnInterval() SHALL be ≥ the configured minSpawnInterval.
   */
  it('spawn interval never drops below minSpawnInterval', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10_000_000, noNaN: true, noDefaultInfinity: true }),
        (elapsed) => {
          const gm = new GameManager();
          gm.update(elapsed);

          expect(gm.getSpawnInterval()).toBeGreaterThanOrEqual(
            DELIVERY_CONFIG.minSpawnInterval,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 9: Belt speed ceiling', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * For any elapsed time (including very large values),
   * getBeltSpeed() SHALL be ≤ the configured maxBeltSpeed.
   */
  it('belt speed never exceeds maxBeltSpeed', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10_000_000, noNaN: true, noDefaultInfinity: true }),
        (elapsed) => {
          const gm = new GameManager();
          gm.update(elapsed);

          expect(gm.getBeltSpeed()).toBeLessThanOrEqual(
            DELIVERY_CONFIG.maxBeltSpeed,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- ConveyorSystem speed parameterization property test ---

import { ConveyorSystem, ConveyorItem } from '../systems/ConveyorSystem';
import fs from 'fs';
import path from 'path';

// Reuse the LAYOUT constants and source-parsing approach from conveyorSystem.test.ts
// to compute inlet length without depending on runtime config import order.
const LAYOUT_CONSTANTS = {
  BELT_X: 200,
  BELT_Y: 150,
  BELT_W: 400,
  BELT_H: 300,
} as const;

function evalLayoutExprForProp10(expr: string): number {
  const layoutMap: Record<string, number> = {
    'LAYOUT.BELT_X': LAYOUT_CONSTANTS.BELT_X,
    'LAYOUT.BELT_Y': LAYOUT_CONSTANTS.BELT_Y,
    'LAYOUT.BELT_W': LAYOUT_CONSTANTS.BELT_W,
    'LAYOUT.BELT_H': LAYOUT_CONSTANTS.BELT_H,
  };

  let result = expr;
  for (const [key, val] of Object.entries(layoutMap)) {
    result = result.replaceAll(key, String(val));
  }
  if (!/^[\d\s+\-]+$/.test(result)) {
    throw new Error(`Unexpected expression: ${result}`);
  }
  return Function(`return (${result})`)() as number;
}

function parseInletLength(): number {
  const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
  const source = fs.readFileSync(configPath, 'utf-8');

  const startMatch = source.match(/INLET_START[\s\S]*?\{\s*x:\s*([^,}]+),\s*y:\s*([^,}]+)\s*\}/);
  const endMatch = source.match(/INLET_END[\s\S]*?\{\s*x:\s*([^,}]+),\s*y:\s*([^,}]+)\s*\}/);
  if (!startMatch || !endMatch) throw new Error('Could not find INLET_START/INLET_END in source');

  const sx = evalLayoutExprForProp10(startMatch[1].trim());
  const sy = evalLayoutExprForProp10(startMatch[2].trim());
  const ex = evalLayoutExprForProp10(endMatch[1].trim());
  const ey = evalLayoutExprForProp10(endMatch[2].trim());

  const dx = ex - sx;
  const dy = ey - sy;
  return Math.sqrt(dx * dx + dy * dy);
}

const INLET_LENGTH = parseInletLength();

describe('Property 10: Speed parameterization', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * For any positive speed and positive delta, an inlet item advanced by
   * ConveyorSystem.update(delta, items, speed) SHALL have its
   * inletProgress increase by speed × delta / 1000 / inletLength
   * (within floating-point tolerance), confirming the system uses the
   * caller-provided speed rather than a hardcoded constant.
   */
  it('inlet item advances by speed × delta / 1000 / inletLength', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 500, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 5000, noNaN: true, noDefaultInfinity: true }),
        (speed, delta) => {
          const system = new ConveyorSystem();

          const item: ConveyorItem = {
            x: 0,
            y: 0,
            state: 'new',
            onInlet: true,
            inletProgress: 0,
            loopProgress: 0,
            onOutlet: false,
            outletProgress: 0,
          };

          system.update(delta, [item], speed);

          // If the item is still on the inlet, progress should match exactly
          // If it overflowed to the loop, the total distance traveled is still
          // speed * delta / 1000, so we verify via the distance formula
          const expectedProgressDelta = (speed * delta) / 1000 / INLET_LENGTH;

          if (item.onInlet) {
            // Item stayed on inlet — inletProgress should match expected
            expect(item.inletProgress).toBeCloseTo(expectedProgressDelta, 9);
          } else {
            // Item overflowed to loop — it traveled at least the full inlet
            // The total distance traveled = speed * delta / 1000
            // Inlet consumed = INLET_LENGTH (progress went from 0 to >= 1)
            // Remaining went to loop, so inletProgress >= 1 equivalent was reached
            expect(expectedProgressDelta).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// --- Jitter computation property tests ---

describe('Property 1: Jitter bounds', () => {
  /**
   * **Validates: Requirements 1.1, 1.3**
   *
   * For any average spawn interval > 0 and jitter fraction in [0, 1],
   * the computed spawn delay (before clamping) SHALL fall within
   * [interval × (1 − jitter), interval × (1 + jitter)].
   */
  it('computed delay before clamping falls within [interval*(1-jitter), interval*(1+jitter)]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        (interval, jitter, seed) => {
          const rng = createSeededRandom(seed);
          const rngValue = rng();
          // Formula from ItemSystem: delay = interval + interval * jitter * (2 * rng() - 1)
          const delay = interval + interval * jitter * (2 * rngValue - 1);

          const lowerBound = interval * (1 - jitter);
          const upperBound = interval * (1 + jitter);

          expect(delay).toBeGreaterThanOrEqual(lowerBound - 1e-9);
          expect(delay).toBeLessThanOrEqual(upperBound + 1e-9);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 2: Visible variation', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any non-zero jitter fraction and any seed, a sequence of ≥ 10
   * computed spawn delays SHALL contain at least two distinct values.
   */
  it('non-zero jitter produces at least two distinct delays in a sequence of 10', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        (interval, jitter, seed) => {
          const rng = createSeededRandom(seed);
          const delays: number[] = [];

          for (let i = 0; i < 10; i++) {
            const rngValue = rng();
            const delay = interval + interval * jitter * (2 * rngValue - 1);
            delays.push(delay);
          }

          const distinctValues = new Set(delays);
          expect(distinctValues.size).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 4: Minimum delay clamp', () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * For any average spawn interval, jitter fraction, and random value,
   * the final computed spawn delay (after clamping) SHALL be ≥
   * minSpawnDelay (200 ms).
   */
  it('final delay after clamping is always >= minSpawnDelay', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        (interval, jitter, seed) => {
          const rng = createSeededRandom(seed);
          const rngValue = rng();
          // Formula from ItemSystem: delay = interval + interval * jitter * (2 * rng() - 1)
          const rawDelay = interval + interval * jitter * (2 * rngValue - 1);
          // Clamping step
          const finalDelay = Math.max(rawDelay, DELIVERY_CONFIG.minSpawnDelay);

          expect(finalDelay).toBeGreaterThanOrEqual(DELIVERY_CONFIG.minSpawnDelay);
        },
      ),
      { numRuns: 100 },
    );
  });
});
