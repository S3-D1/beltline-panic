import {
  INLET_START,
  INLET_END,
  ITEM_SIZE,
  ITEM_VALUES,
  COLLISION_THRESHOLD,
  MIN_BELT_SPACING,
  LOOP_WAYPOINTS,
} from '../data/ConveyorConfig';
import { DELIVERY_CONFIG } from '../data/DeliveryConfig';
import { ConveyorSystem, ConveyorItem } from './ConveyorSystem';
import { GameManager } from '../systems/GameManager';
import { isSafeToRelease } from './SafeReleaseSystem';
import { distance } from './SafeReleaseSystem';
import { createSeededRandom } from '../utils/random';

export interface UpdateResult {
  exitedValues: number[];
  collision: { a: ConveyorItem; b: ConveyorItem } | null;
}

// Compute inlet length dynamically from config coordinates
const inletLength = Math.sqrt(
  (INLET_END.x - INLET_START.x) ** 2 + (INLET_END.y - INLET_START.y) ** 2,
);

/** Gate offset: the leading inlet item waits at 0.5*beltWidth + 0.5*itemSize
 * back from the junction so it doesn't visually sit inside the loop.
 * Belt width = 3 * ITEM_SIZE (matches BeltDrawing). */
const BELT_WIDTH = ITEM_SIZE * 3;
const GATE_OFFSET_PX = 0.5 * BELT_WIDTH + 0.5 * ITEM_SIZE; // 28px
const GATE_PROGRESS = 1.0 - GATE_OFFSET_PX / inletLength;

/** Queue spacing: consecutive inlet items are 1.1 * ITEM_SIZE apart (center to center). */
const QUEUE_SPACING_PROGRESS = (1.1 * ITEM_SIZE) / inletLength;

/** The point where the inlet enters the loop (waypoint 0). */
const INLET_JUNCTION = LOOP_WAYPOINTS[0];

/** Insecure distance: distance(inlet gate, waypoint 0) + 2.25 * ITEM_SIZE.
 * The gate is GATE_OFFSET_PX back from the junction along the inlet. */
const INLET_INSECURE_DISTANCE = GATE_OFFSET_PX + 2.25 * ITEM_SIZE;

export class ItemSystem {
  private items: ConveyorItem[] = [];
  private spawnTimer = 0;
  private nextDelay: number = DELIVERY_CONFIG.initialSpawnInterval;
  private rng: () => number;

  constructor(private conveyor: ConveyorSystem, seed?: number) {
    this.rng = createSeededRandom(seed ?? Date.now());
  }

  update(delta: number, gameManager: GameManager): UpdateResult {
    // 1. Tick spawn timer and spawn new items (with inlet overflow detection — Task 9.3)
    this.spawnTimer += delta;
    let spawnCollision: { a: ConveyorItem; b: ConveyorItem } | null = null;
    if (this.spawnTimer >= this.nextDelay) {
      // Check if the inlet has room for a new item
      const inletItems = this.items.filter((item) => item.onInlet);
      const rearmostItem = inletItems.length > 0
        ? inletItems.reduce((min, item) => item.inletProgress < min.inletProgress ? item : min)
        : null;

      if (rearmostItem && rearmostItem.inletProgress < QUEUE_SPACING_PROGRESS) {
        // Inlet is full — trigger collision (game over)
        const newSpawn: ConveyorItem = {
          x: INLET_START.x,
          y: INLET_START.y,
          state: 'new',
          onInlet: true,
          inletProgress: 0,
          loopProgress: 0,
          onOutlet: false,
          outletProgress: 0,
        };
        spawnCollision = { a: newSpawn, b: rearmostItem };
      } else {
        // Spawn normally
        this.items.push({
          x: INLET_START.x,
          y: INLET_START.y,
          state: 'new',
          onInlet: true,
          inletProgress: 0,
          loopProgress: 0,
          onOutlet: false,
          outletProgress: 0,
        });
      }
      this.spawnTimer -= this.nextDelay;

      // Compute next jittered spawn delay
      const interval = gameManager.getSpawnInterval();
      const jitter = gameManager.getSpawnJitter();
      this.nextDelay = interval + interval * jitter * (2 * this.rng() - 1);
      this.nextDelay = Math.max(this.nextDelay, DELIVERY_CONFIG.minSpawnDelay);
    }

    // 2a. Inlet-to-belt gating — clamp leading inlet item at junction BEFORE conveyor advances
    // This prevents the conveyor from transitioning the item onto the belt when it's unsafe.
    const inletItemsBeforeAdvance = this.items
      .filter((item) => item.onInlet)
      .sort((a, b) => b.inletProgress - a.inletProgress); // leading items first

    if (inletItemsBeforeAdvance.length > 0) {
      const leadingItem = inletItemsBeforeAdvance[0];
      // If the leading item is at or near the gate, check belt safety
      if (leadingItem.inletProgress >= GATE_PROGRESS - 0.001) {
        // Check if any loop item is too close to the inlet junction
        const loopItems = this.items.filter(
          (other) => other !== leadingItem && !other.onInlet && !other.onOutlet,
        );
        const tooClose = loopItems.some((item) => {
          return distance(item, INLET_JUNCTION) < INLET_INSECURE_DISTANCE;
        });
        if (tooClose) {
          // Unsafe — clamp at gate position
          leadingItem.inletProgress = GATE_PROGRESS;
          const pos = this.conveyor.getPositionOnInlet(GATE_PROGRESS);
          leadingItem.x = pos.x;
          leadingItem.y = pos.y;
        }
      }
    }

    // 2b. Advance positions via ConveyorSystem
    this.conveyor.update(delta, this.items, gameManager.getBeltSpeed());

    // 2c. Inlet-to-belt gating — after advance, only allow ONE item to transition per frame.
    // If multiple items transitioned (due to high delta or clustering), revert all but the first.
    // Also revert the first if the belt entry is unsafe (edge case with simultaneous arrivals).
    const justTransitioned = this.items.filter(
      (item) => !item.onInlet && !item.onOutlet && item.loopProgress < 0.01,
    );
    // Check items that just arrived at belt entry — keep at most one, and only if safe
    if (justTransitioned.length > 0) {
      // Sort by loopProgress so the most advanced one is "first"
      justTransitioned.sort((a, b) => a.loopProgress - b.loopProgress);

      const beltEntryPoint = this.conveyor.getPositionOnLoop(0);

      for (let i = 0; i < justTransitioned.length; i++) {
        const item = justTransitioned[i];
        if (i === 0) {
          // Check safety: no loop item too close to junction
          const loopItems = this.items.filter(
            (other) => other !== item && !other.onInlet && !other.onOutlet,
          );
          const tooClose = loopItems.some((other) => {
            return distance(other, INLET_JUNCTION) < INLET_INSECURE_DISTANCE;
          });
          if (!tooClose) {
            continue; // safe — keep this one on the belt
          }
        }
        // Revert back to inlet at gate position
        item.onInlet = true;
        item.inletProgress = GATE_PROGRESS;
        item.loopProgress = 0;
        const pos = this.conveyor.getPositionOnInlet(GATE_PROGRESS);
        item.x = pos.x;
        item.y = pos.y;
      }
    }

    // 2d. Inlet queuing — enforce spacing between consecutive inlet items (Task 9.1)
    const inletItemsAfterAdvance = this.items
      .filter((item) => item.onInlet)
      .sort((a, b) => b.inletProgress - a.inletProgress); // leading items first

    for (let i = 0; i < inletItemsAfterAdvance.length - 1; i++) {
      const leadItem = inletItemsAfterAdvance[i];
      const trailingItem = inletItemsAfterAdvance[i + 1];
      if (leadItem.inletProgress - trailingItem.inletProgress < QUEUE_SPACING_PROGRESS) {
        trailingItem.inletProgress = leadItem.inletProgress - QUEUE_SPACING_PROGRESS;
        const pos = this.conveyor.getPositionOnInlet(trailingItem.inletProgress);
        trailingItem.x = pos.x;
        trailingItem.y = pos.y;
      }
    }

    // 3. Collect exited items: filter where onOutlet && outletProgress >= 1
    const exitedValues: number[] = [];
    this.items = this.items.filter((item) => {
      if (item.onOutlet && item.outletProgress >= 1) {
        exitedValues.push(ITEM_VALUES[item.state]);
        return false;
      }
      return true;
    });

    // 4. Check collisions: O(n²) pairwise distance check (Task 9.4 — skip inlet-inlet pairs)
    let collision: { a: ConveyorItem; b: ConveyorItem } | null = spawnCollision;
    for (let i = 0; i < this.items.length && !collision; i++) {
      for (let j = i + 1; j < this.items.length; j++) {
        const a = this.items[i];
        const b = this.items[j];
        // Skip collision checks between two inlet items
        if (a.onInlet && b.onInlet) continue;
        // Skip collision between a waiting inlet item and a loop item near the junction
        if (a.onInlet && a.inletProgress >= GATE_PROGRESS - 0.01 && !b.onInlet && !b.onOutlet) {
          if (distance(b, INLET_JUNCTION) < INLET_INSECURE_DISTANCE) continue;
        }
        if (b.onInlet && b.inletProgress >= GATE_PROGRESS - 0.01 && !a.onInlet && !a.onOutlet) {
          if (distance(a, INLET_JUNCTION) < INLET_INSECURE_DISTANCE) continue;
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= COLLISION_THRESHOLD) {
          collision = { a, b };
          break;
        }
      }
    }

    // 5. Return result
    return { exitedValues, collision };
  }

  getItems(): ConveyorItem[] {
    return this.items;
  }
}
