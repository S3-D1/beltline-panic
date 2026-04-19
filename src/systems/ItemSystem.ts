import {
  SPAWN_INTERVAL,
  TRANSITION_ZONES,
  INLET_START,
} from '../data/ConveyorConfig';
import { ConveyorSystem, ConveyorItem } from './ConveyorSystem';

export class ItemSystem {
  private items: ConveyorItem[] = [];
  private spawnTimer = 0;

  constructor(private conveyor: ConveyorSystem) {}

  update(delta: number): void {
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
      });
      this.spawnTimer -= SPAWN_INTERVAL;
    }

    // 2. Advance positions via ConveyorSystem
    this.conveyor.update(delta, this.items);

    // 3. Check transition zones for loop items
    for (const item of this.items) {
      if (item.onInlet) continue;

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
  }

  getItems(): ConveyorItem[] {
    return this.items;
  }
}
