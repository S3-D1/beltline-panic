import { PALETTE } from './Palette';
import { LAYOUT } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';

export interface FloorDrawParams {
  graphics: Phaser.GameObjects.Graphics;
  layoutSystem: LayoutSystem;
}

/** Node positions in base resolution, derived from LAYOUT constants. */
const NODE_POSITIONS = [
  { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y },                          // center
  { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y - LAYOUT.NODE_OFFSET },     // up
  { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y + LAYOUT.NODE_OFFSET },     // down
  { x: LAYOUT.CENTER_X - LAYOUT.NODE_OFFSET, y: LAYOUT.CENTER_Y },     // left
  { x: LAYOUT.CENTER_X + LAYOUT.NODE_OFFSET, y: LAYOUT.CENTER_Y },     // right
];

/** Pairs of node indices that should be connected by walkable strips. */
const CONNECTIONS: [number, number][] = [
  [0, 1], // center ↔ up
  [0, 2], // center ↔ down
  [0, 3], // center ↔ left
  [0, 4], // center ↔ right
];

/** Width of the connecting strips between nodes, in base resolution pixels. */
const STRIP_WIDTH = 20;

/** Number of grid lines drawn inside each walkable node square. */
const GRID_LINES = 3;

/**
 * Draws the floor background with walkable/non-walkable distinction.
 * Should be called on a dedicated Graphics object at the lowest depth,
 * redrawn only on resize (not per-frame).
 */
export function drawFloor(params: FloorDrawParams): void {
  const { graphics: g, layoutSystem: ls } = params;

  g.clear();

  // 1. Fill the entire scaled game area with the dark floor color
  g.fillStyle(PALETTE.FLOOR_DARK, 1);
  g.fillRect(
    ls.scaleX(0),
    ls.scaleY(0),
    ls.scaleValue(LAYOUT.SCENE_W),
    ls.scaleValue(LAYOUT.SCENE_H),
  );

  // 2. Draw connecting strips between adjacent walkable nodes
  const halfStrip = STRIP_WIDTH / 2;
  g.fillStyle(PALETTE.FLOOR_LIGHT, 1);

  for (const [aIdx, bIdx] of CONNECTIONS) {
    const a = NODE_POSITIONS[aIdx];
    const b = NODE_POSITIONS[bIdx];

    if (a.x === b.x) {
      // Vertical connection
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      g.fillRect(
        ls.scaleX(a.x - halfStrip),
        ls.scaleY(minY),
        ls.scaleValue(STRIP_WIDTH),
        ls.scaleValue(maxY - minY),
      );
    } else {
      // Horizontal connection
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      g.fillRect(
        ls.scaleX(minX),
        ls.scaleY(a.y - halfStrip),
        ls.scaleValue(maxX - minX),
        ls.scaleValue(STRIP_WIDTH),
      );
    }
  }

  // 3. Draw walkable node squares with subtle grid pattern
  const ns = LAYOUT.NODE_SIZE;
  const halfNs = ns / 2;

  for (const node of NODE_POSITIONS) {
    const sx = ls.scaleX(node.x - halfNs);
    const sy = ls.scaleY(node.y - halfNs);
    const sw = ls.scaleValue(ns);
    const sh = ls.scaleValue(ns);

    // Fill the node square
    g.fillStyle(PALETTE.FLOOR_LIGHT, 1);
    g.fillRect(sx, sy, sw, sh);

    // Draw subtle grid lines inside the square
    g.lineStyle(1, PALETTE.FLOOR_GRID, 1);
    const step = ns / (GRID_LINES + 1);

    for (let i = 1; i <= GRID_LINES; i++) {
      const offset = step * i;
      // Horizontal grid line
      g.lineBetween(
        sx,
        ls.scaleY(node.y - halfNs + offset),
        sx + sw,
        ls.scaleY(node.y - halfNs + offset),
      );
      // Vertical grid line
      g.lineBetween(
        ls.scaleX(node.x - halfNs + offset),
        sy,
        ls.scaleX(node.x - halfNs + offset),
        sy + sh,
      );
    }
  }
}
