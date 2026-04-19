import {
  Point,
  ItemState,
  LOOP_WAYPOINTS,
  INLET_START,
  INLET_END,
  CONVEYOR_SPEED,
} from '../data/ConveyorConfig';

export interface ConveyorItem {
  x: number;
  y: number;
  state: ItemState;
  onInlet: boolean;
  inletProgress: number;
  loopProgress: number;
}

export class ConveyorSystem {
  private loopLength: number;
  private inletLength: number;
  private segmentLengths: number[];

  constructor() {
    // Compute segment lengths between consecutive waypoints
    this.segmentLengths = [];
    for (let i = 0; i < LOOP_WAYPOINTS.length; i++) {
      const a = LOOP_WAYPOINTS[i];
      const b = LOOP_WAYPOINTS[(i + 1) % LOOP_WAYPOINTS.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      this.segmentLengths.push(Math.sqrt(dx * dx + dy * dy));
    }

    this.loopLength = this.segmentLengths.reduce((sum, l) => sum + l, 0);

    const idx = INLET_END.x - INLET_START.x;
    const idy = INLET_END.y - INLET_START.y;
    this.inletLength = Math.sqrt(idx * idx + idy * idy);
  }

  getPositionOnInlet(progress: number): Point {
    return {
      x: INLET_START.x + progress * (INLET_END.x - INLET_START.x),
      y: INLET_START.y + progress * (INLET_END.y - INLET_START.y),
    };
  }

  getPositionOnLoop(progress: number): Point {
    const distance = progress * this.loopLength;
    let cumulative = 0;

    for (let i = 0; i < this.segmentLengths.length; i++) {
      const segLen = this.segmentLengths[i];
      if (cumulative + segLen >= distance) {
        const t = (distance - cumulative) / segLen;
        const a = LOOP_WAYPOINTS[i];
        const b = LOOP_WAYPOINTS[(i + 1) % LOOP_WAYPOINTS.length];
        return {
          x: a.x + t * (b.x - a.x),
          y: a.y + t * (b.y - a.y),
        };
      }
      cumulative += segLen;
    }

    // Fallback: return last waypoint (should not normally reach here)
    return { ...LOOP_WAYPOINTS[0] };
  }

  update(delta: number, items: ConveyorItem[]): void {
    if (delta <= 0) return;

    const pixelsPerMs = CONVEYOR_SPEED / 1000;
    const distanceThisFrame = pixelsPerMs * delta;

    for (const item of items) {
      if (item.onInlet) {
        item.inletProgress += distanceThisFrame / this.inletLength;

        if (item.inletProgress >= 1) {
          const overflow = (item.inletProgress - 1) * this.inletLength;
          item.onInlet = false;
          item.loopProgress = overflow / this.loopLength;
        }
      } else {
        item.loopProgress += distanceThisFrame / this.loopLength;

        if (item.loopProgress >= 1) {
          item.loopProgress -= 1;
        }
      }

      // Update position
      if (item.onInlet) {
        const pos = this.getPositionOnInlet(item.inletProgress);
        item.x = pos.x;
        item.y = pos.y;
      } else {
        const pos = this.getPositionOnLoop(item.loopProgress);
        item.x = pos.x;
        item.y = pos.y;
      }
    }
  }
}
