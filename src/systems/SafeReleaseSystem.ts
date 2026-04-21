import { Point } from '../data/ConveyorConfig';
import { ConveyorItem } from './ConveyorSystem';

/**
 * Compute Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a candidate position has at least minSpacing clearance
 * from all belt items (items on the loop, not on inlet or outlet).
 */
export function isSafeToRelease(
  candidatePosition: Point,
  beltItems: ConveyorItem[],
  minSpacing: number,
): boolean {
  for (const item of beltItems) {
    if (item.onInlet || item.onOutlet) continue;
    if (distance(candidatePosition, item) < minSpacing) return false;
  }
  return true;
}
