import {
  SPAWN_INTERVAL,
  TRANSITION_ZONES,
  INLET_START,
  ITEM_VALUES,
  COLLISION_THRESHOLD,
} from '../data/ConveyorConfig';
import { ConveyorSystem, ConveyorItem } from './ConveyorSystem';

export interface UpdateResult {
  exitedValues: number[];
  collision: { a: ConveyorItem; b: ConveyorItem } | null;
}

export class ItemSystem {
  private items: ConveyorItem[] = [];
  private spawnTimer = 0;

  constructor(private conveyor: ConveyorSystem) {}

  update(delta: number): UpdateResult {
    // 1. Tick spawn timer and spawn new items
    this.spawnTimer += delta;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
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
      this.spawnTimer -= SPAWN_INTERVAL;
    }

    // 2. Advance positions via ConveyorSystem
    this.conveyor.update(delta, this.items);

    // 3. Check transition zones for loop items (skip inlet and outlet items)
    for (const item of this.items) {
      if (item.onInlet || item.onOutlet) continue;

      for (const zone of TRANSITION_ZONES) {
        if (
          item.state === zone.fromState &&
          item.loopProgress >= zone.progressStart &&
          item.loopProgress <= zone.progressEnd
        ) {
          item.state = zone.toState;
        }
      }
    }

    // 4. Collect exited items: filter where onOutlet && outletProgress >= 1
    const exitedValues: number[] = [];
    this.items = this.items.filter((item) => {
      if (item.onOutlet && item.outletProgress >= 1) {
        exitedValues.push(ITEM_VALUES[item.state]);
        return false;
      }
      return true;
    });

    // 5. Check collisions: O(n²) pairwise distance check
    let collision: { a: ConveyorItem; b: ConveyorItem } | null = null;
    for (let i = 0; i < this.items.length && !collision; i++) {
      for (let j = i + 1; j < this.items.length; j++) {
        const a = this.items[i];
        const b = this.items[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= COLLISION_THRESHOLD) {
          collision = { a, b };
          break;
        }
      }
    }

    // 6. Return result
    return { exitedValues, collision };
  }

  getItems(): ConveyorItem[] {
    return this.items;
  }
}
