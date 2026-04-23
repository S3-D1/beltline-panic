import { describe, it, expect } from 'vitest';
import { createSeededRandom } from './random';

describe('createSeededRandom', () => {
  it('produces floats in [0, 1)', () => {
    const rng = createSeededRandom(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic: same seed produces same sequence', () => {
    const a = createSeededRandom(123);
    const b = createSeededRandom(123);
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    const valuesA = Array.from({ length: 10 }, () => a());
    const valuesB = Array.from({ length: 10 }, () => b());
    // At least one value should differ
    const allSame = valuesA.every((v, i) => v === valuesB[i]);
    expect(allSame).toBe(false);
  });
});
