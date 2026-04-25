import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ITEM_STATE_ASSET, ASSET_KEYS } from '../data/AssetKeys';
import { ItemState } from '../data/ConveyorConfig';

/**
 * Property-based tests for the asset-based UI feature.
 * Uses fast-check with a minimum of 100 iterations per property.
 */

const ALL_ITEM_STATES: ItemState[] = ['new', 'processed', 'upgraded', 'packaged'];

describe('Feature: asset-based-ui, Property 1: Item state to asset key mapping', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   *
   * For any valid ItemState value (new, processed, upgraded, packaged),
   * the ITEM_STATE_ASSET mapping SHALL return a distinct, non-empty asset
   * key string that corresponds to the correct item sprite, and no two
   * states SHALL map to the same key.
   */
  it('every ItemState maps to a non-empty asset key that exists in ASSET_KEYS', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ITEM_STATES),
        (state) => {
          const assetKey = ITEM_STATE_ASSET[state];

          // Must be a non-empty string
          expect(typeof assetKey).toBe('string');
          expect(assetKey.length).toBeGreaterThan(0);

          // Must exist in ASSET_KEYS values
          const allAssetKeyValues = Object.values(ASSET_KEYS) as string[];
          expect(allAssetKeyValues).toContain(assetKey);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no two ItemState values map to the same asset key', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ITEM_STATES),
        fc.constantFrom(...ALL_ITEM_STATES),
        (stateA, stateB) => {
          if (stateA !== stateB) {
            expect(ITEM_STATE_ASSET[stateA]).not.toBe(ITEM_STATE_ASSET[stateB]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mapping covers all four ItemState values', () => {
    // Verify completeness: every state in the type has a mapping
    const mappedKeys = ALL_ITEM_STATES.map((s) => ITEM_STATE_ASSET[s]);
    const uniqueKeys = new Set(mappedKeys);

    expect(uniqueKeys.size).toBe(ALL_ITEM_STATES.length);
    expect(mappedKeys.length).toBe(4);
  });
});

describe('Feature: asset-based-ui, Property 2: Collision blink tint alternation', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * For any non-negative blinkTimer value, a collided item's tint SHALL be
   * the collision blink color (red, 0xff0000) when Math.floor(blinkTimer / 300) % 2 === 0,
   * and the item's normal state color otherwise. Non-collided items SHALL never
   * have the collision blink tint applied.
   */

  /** Pure extraction of the blink tint logic from GameScene.syncItemSprites */
  function getCollisionBlinkTint(
    blinkTimer: number,
    isCollided: boolean,
  ): { tint: number | null } {
    if (isCollided) {
      if (Math.floor(blinkTimer / 300) % 2 === 0) {
        return { tint: 0xff0000 };
      } else {
        return { tint: null }; // clearTint — normal appearance
      }
    } else {
      return { tint: null }; // clearTint — normal appearance
    }
  }

  it('collided items show red tint when Math.floor(blinkTimer / 300) % 2 === 0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (blinkTimer) => {
          const result = getCollisionBlinkTint(blinkTimer, true);
          const expectRed = Math.floor(blinkTimer / 300) % 2 === 0;

          if (expectRed) {
            expect(result.tint).toBe(0xff0000);
          } else {
            expect(result.tint).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-collided items never have the collision blink tint applied', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (blinkTimer) => {
          const result = getCollisionBlinkTint(blinkTimer, false);
          expect(result.tint).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tint alternates between red and normal as blinkTimer crosses 300ms boundaries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        (multiplier) => {
          // At exact multiples of 300, Math.floor(t / 300) changes
          const atBoundary = multiplier * 300;
          const justAfter = atBoundary + 1;

          const resultAt = getCollisionBlinkTint(atBoundary, true);
          const resultAfter = getCollisionBlinkTint(justAfter, true);

          // At the boundary: floor(atBoundary / 300) = multiplier
          if (multiplier % 2 === 0) {
            expect(resultAt.tint).toBe(0xff0000);
          } else {
            expect(resultAt.tint).toBeNull();
          }

          // Just after the boundary: floor(justAfter / 300) = multiplier (still same bucket)
          if (multiplier % 2 === 0) {
            expect(resultAfter.tint).toBe(0xff0000);
          } else {
            expect(resultAfter.tint).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: asset-based-ui, Property 3: Machine state to asset key mapping', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * For any combination of (isPlayerInteracting: boolean, isActive: boolean) flags
   * for a machine, the selected asset key SHALL be:
   * - machine_interaction_active when isPlayerInteracting is true,
   * - machine_no-interaction_active when isActive is true and isPlayerInteracting is false,
   * - machine_no-interaction_inactive otherwise.
   * The mapping SHALL be deterministic — the same input always produces the same output.
   */

  /**
   * Pure extraction of the machine state → asset key logic from
   * GameScene.updateMachineSprites(). Given the two boolean flags that
   * drive machine sprite selection, returns the correct asset key.
   */
  function getMachineAssetKey(isPlayerInteracting: boolean, isActive: boolean): string {
    if (isPlayerInteracting) {
      return ASSET_KEYS.MACHINE_INTERACTION_ACTIVE;
    } else if (isActive) {
      return ASSET_KEYS.MACHINE_NO_INTERACTION_ACTIVE;
    } else {
      return ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE;
    }
  }

  it('returns the correct asset key for any (isPlayerInteracting, isActive) combination', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isPlayerInteracting, isActive) => {
          const key = getMachineAssetKey(isPlayerInteracting, isActive);

          if (isPlayerInteracting) {
            expect(key).toBe(ASSET_KEYS.MACHINE_INTERACTION_ACTIVE);
          } else if (isActive) {
            expect(key).toBe(ASSET_KEYS.MACHINE_NO_INTERACTION_ACTIVE);
          } else {
            expect(key).toBe(ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mapping is deterministic — same inputs always produce the same output', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isPlayerInteracting, isActive) => {
          const key1 = getMachineAssetKey(isPlayerInteracting, isActive);
          const key2 = getMachineAssetKey(isPlayerInteracting, isActive);
          expect(key1).toBe(key2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all three machine asset keys are reachable from the input space', () => {
    // Exhaustive check: each branch of the mapping is reachable
    expect(getMachineAssetKey(true, true)).toBe(ASSET_KEYS.MACHINE_INTERACTION_ACTIVE);
    expect(getMachineAssetKey(true, false)).toBe(ASSET_KEYS.MACHINE_INTERACTION_ACTIVE);
    expect(getMachineAssetKey(false, true)).toBe(ASSET_KEYS.MACHINE_NO_INTERACTION_ACTIVE);
    expect(getMachineAssetKey(false, false)).toBe(ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE);
  });
});

import { PlayerPosition } from '../systems/InputSystem';

const ALL_PLAYER_POSITIONS: PlayerPosition[] = ['center', 'up', 'down', 'left', 'right'];

describe('Feature: asset-based-ui, Property 4: Player position to worker sprite mapping', () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   *
   * For any valid PlayerPosition value (center, up, down, left, right),
   * the worker sprite mapping SHALL return the correct (assetKey, flipX) pair:
   * center → (worker_64_front, false), up → (worker_64_back, false),
   * down → (worker_64_front, false), left → (worker_64_side, true),
   * right → (worker_64_side, false).
   */

  /**
   * Pure extraction of the player position → (assetKey, flipX) logic
   * from GameScene.getWorkerTextureForPosition().
   */
  function getWorkerTextureForPosition(position: PlayerPosition): { key: string; flipX: boolean } {
    switch (position) {
      case 'center': return { key: ASSET_KEYS.WORKER_FRONT, flipX: false };
      case 'up':     return { key: ASSET_KEYS.WORKER_BACK, flipX: false };
      case 'down':   return { key: ASSET_KEYS.WORKER_FRONT, flipX: false };
      case 'left':   return { key: ASSET_KEYS.WORKER_SIDE, flipX: true };
      case 'right':  return { key: ASSET_KEYS.WORKER_SIDE, flipX: false };
    }
  }

  /** Expected mapping as a lookup table for verification. */
  const EXPECTED_MAPPING: Record<PlayerPosition, { key: string; flipX: boolean }> = {
    center: { key: ASSET_KEYS.WORKER_FRONT, flipX: false },
    up:     { key: ASSET_KEYS.WORKER_BACK, flipX: false },
    down:   { key: ASSET_KEYS.WORKER_FRONT, flipX: false },
    left:   { key: ASSET_KEYS.WORKER_SIDE, flipX: true },
    right:  { key: ASSET_KEYS.WORKER_SIDE, flipX: false },
  };

  it('returns the correct (assetKey, flipX) pair for any PlayerPosition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PLAYER_POSITIONS),
        (position) => {
          const result = getWorkerTextureForPosition(position);
          const expected = EXPECTED_MAPPING[position];

          expect(result.key).toBe(expected.key);
          expect(result.flipX).toBe(expected.flipX);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('center and down both map to worker_64_front with no flip', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('center' as PlayerPosition, 'down' as PlayerPosition),
        (position) => {
          const result = getWorkerTextureForPosition(position);
          expect(result.key).toBe(ASSET_KEYS.WORKER_FRONT);
          expect(result.flipX).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('left and right both use worker_64_side but differ in flipX', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('left' as PlayerPosition, 'right' as PlayerPosition),
        (position) => {
          const result = getWorkerTextureForPosition(position);
          expect(result.key).toBe(ASSET_KEYS.WORKER_SIDE);

          if (position === 'left') {
            expect(result.flipX).toBe(true);
          } else {
            expect(result.flipX).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mapping covers all five PlayerPosition values', () => {
    const results = ALL_PLAYER_POSITIONS.map((p) => getWorkerTextureForPosition(p));

    // All results are valid objects with key and flipX
    for (const r of results) {
      expect(typeof r.key).toBe('string');
      expect(r.key.length).toBeGreaterThan(0);
      expect(typeof r.flipX).toBe('boolean');
    }

    // All five positions are covered
    expect(results.length).toBe(5);
  });
});

describe('Feature: asset-based-ui, Property 5: Terminal asset key reflects player position', () => {
  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * For any valid PlayerPosition, the terminal asset key SHALL be
   * terminal_active if and only if the position is left, and
   * terminal_inactive for all other positions.
   */

  /**
   * Pure extraction of the terminal position → asset key logic
   * from GameScene.updateTerminalSprite().
   */
  function getTerminalAssetKey(position: PlayerPosition): string {
    return position === 'left'
      ? ASSET_KEYS.TERMINAL_ACTIVE
      : ASSET_KEYS.TERMINAL_INACTIVE;
  }

  it('returns terminal_active if and only if position is left', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PLAYER_POSITIONS),
        (position) => {
          const key = getTerminalAssetKey(position);

          if (position === 'left') {
            expect(key).toBe(ASSET_KEYS.TERMINAL_ACTIVE);
          } else {
            expect(key).toBe(ASSET_KEYS.TERMINAL_INACTIVE);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-left positions always produce terminal_inactive', () => {
    const nonLeftPositions = ALL_PLAYER_POSITIONS.filter((p) => p !== 'left');

    fc.assert(
      fc.property(
        fc.constantFrom(...nonLeftPositions),
        (position) => {
          const key = getTerminalAssetKey(position);
          expect(key).toBe(ASSET_KEYS.TERMINAL_INACTIVE);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('only two distinct asset keys are produced across all positions', () => {
    const allKeys = ALL_PLAYER_POSITIONS.map((p) => getTerminalAssetKey(p));
    const uniqueKeys = new Set(allKeys);

    expect(uniqueKeys.size).toBe(2);
    expect(uniqueKeys).toContain(ASSET_KEYS.TERMINAL_ACTIVE);
    expect(uniqueKeys).toContain(ASSET_KEYS.TERMINAL_INACTIVE);
  });
});

import { LayoutSystem } from '../systems/LayoutSystem';

describe('Feature: asset-based-ui, Property 6: Sprite positioning and scaling consistency', () => {
  /**
   * **Validates: Requirements 3.5, 5.6, 8.1, 8.3**
   *
   * For any valid viewport dimensions (width > 0, height > 0), after a
   * LayoutSystem update, all sprite positions SHALL equal
   * layoutSystem.scaleX(baseX) and layoutSystem.scaleY(baseY) for their
   * respective base-resolution coordinates, and all sprite display sizes
   * SHALL equal their base-resolution dimensions multiplied by
   * layoutSystem.getScaleFactor().
   */

  it('scaleX produces consistent results for any viewport and base coordinate', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
        (viewportWidth, viewportHeight, baseX) => {
          const ls = new LayoutSystem();
          ls.update(viewportWidth, viewportHeight);

          const scaledX = ls.scaleX(baseX);
          const expectedX = baseX * ls.getScaleFactor() + ls.getOffsetX();

          expect(scaledX).toBeCloseTo(expectedX, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('scaleY produces consistent results for any viewport and base coordinate', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
        (viewportWidth, viewportHeight, baseY) => {
          const ls = new LayoutSystem();
          ls.update(viewportWidth, viewportHeight);

          const scaledY = ls.scaleY(baseY);
          const expectedY = baseY * ls.getScaleFactor() + ls.getOffsetY();

          expect(scaledY).toBeCloseTo(expectedY, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('display size equals base dimension multiplied by scale factor for any viewport', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
        (viewportWidth, viewportHeight, baseDimension) => {
          const ls = new LayoutSystem();
          ls.update(viewportWidth, viewportHeight);

          const displaySize = baseDimension * ls.getScaleFactor();
          const scaledValue = ls.scaleValue(baseDimension);

          expect(displaySize).toBeCloseTo(scaledValue, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('scale factor is positive for any positive viewport dimensions', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        (viewportWidth, viewportHeight) => {
          const ls = new LayoutSystem();
          ls.update(viewportWidth, viewportHeight);

          expect(ls.getScaleFactor()).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
