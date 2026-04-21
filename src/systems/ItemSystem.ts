import {
  SPAWN_INTERVAL,
  INLET_START,
  INLET_END,
  ITEM_VALUES,
  COLLISION_THRESHOLD,
  MIN_BELT_SPACING,
} from '../data/ConveyorConfig';
import { ConveyorSystem, ConveyorItem } from './ConveyorSystem';
import { isSafeToRelease } from './SafeReleaseSystem';

export interface UpdateResult {
  exitedValues: number[];
  collision: { a: ConveyorItem; b: ConveyorItem } | null;
}

// Compute inlet length dynamically from config coordinates
const inletLength = Math.sqrt(
  (INLET_END.x - INLET_START.x) ** 2 + (INLET_END.y - INLET_START.y) ** 2,
);
const minInletSpacingProgress = MIN_BELT_SPACING / inletLength;

export class ItemSystem {
  private items: ConveyorItem[] = [];
  private spawnTimer = 0;

  constructor(private conveyor: ConveyorSystem) {}

  update(delta: number): UpdateResult {
    // 1. Tick spawn timer and spawn new items (with inlet overflow detection — Task 9.3)
    this.spawnTimer += delta;
    let spawnCollision: { a: ConveyorItem; b: ConveyorItem } | null = null;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      // Check if the inlet has room for a new item
      const inletItems = this.items.filter((item) => item.onInlet);
      const rearmostItem = inletItems.length > 0
        ? inletItems.reduce((min, item) => item.inletProgress < min.inletProgress ? item : min)
        : null;

      if (rearmostItem && rearmostItem.inletProgress < minInletSpacingProgress) {
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
      this.spawnTimer -= SPAWN_INTERVAL;
    }

    // 2a. Inlet-to-belt gating — clamp leading inlet item at junction BEFORE conveyor advances
    // This prevents the conveyor from transitioning the item onto the belt when it's unsafe.
    const inletItemsBeforeAdvance = this.items
      .filter((item) => item.onInlet)
      .sort((a, b) => b.inletProgress - a.inletProgress); // leading items first

    if (inletItemsBeforeAdvance.length > 0) {
      const leadingItem = inletItemsBeforeAdvance[0];
      // If the leading item is at or near the junction, check belt safety
      if (leadingItem.inletProgress >= 1.0 - 0.001) {
        const beltEntryPoint = this.conveyor.getPositionOnLoop(0);
        const beltItems = this.items.filter(
          (other) => !other.onInlet && !other.onOutlet,
        );
        if (!isSafeToRelease(beltEntryPoint, beltItems, MIN_BELT_SPACING)) {
          // Unsafe — clamp at junction so conveyor.update() won't transition it
          leadingItem.inletProgress = 0.999;
          const pos = this.conveyor.getPositionOnInlet(1.0);
          leadingItem.x = pos.x;
          leadingItem.y = pos.y;
        }
      }
    }

    // 2b. Advance positions via ConveyorSystem
    this.conveyor.update(delta, this.items);

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
        // For the first item, check safety against existing belt items (excluding itself)
        // For subsequent items, always revert (only one transition per frame)
        if (i === 0) {
          const beltItems = this.items.filter(
            (other) => other !== item && !other.onInlet && !other.onOutlet,
          );
          if (isSafeToRelease(beltEntryPoint, beltItems, MIN_BELT_SPACING)) {
            continue; // safe — keep this one on the belt
          }
        }
        // Revert back to inlet at junction
        item.onInlet = true;
        item.inletProgress = 1.0;
        item.loopProgress = 0;
        const pos = this.conveyor.getPositionOnInlet(1.0);
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
      if (leadItem.inletProgress - trailingItem.inletProgress < minInletSpacingProgress) {
        trailingItem.inletProgress = leadItem.inletProgress - minInletSpacingProgress;
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
