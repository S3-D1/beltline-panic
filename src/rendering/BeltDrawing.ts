import { PALETTE } from './Palette';
import { LayoutSystem } from '../systems/LayoutSystem';
import {
  INLET_START,
  INLET_END,
  OUTLET_START,
  OUTLET_END,
  LOOP_WAYPOINTS,
  ITEM_SIZE,
  Point,
} from '../data/ConveyorConfig';

export interface BeltDrawParams {
  graphics: Phaser.GameObjects.Graphics;
  layoutSystem: LayoutSystem;
  beltOffset: number;   // animation offset in pixels, advances each frame
  gameOver: boolean;     // stop animation when true (caller responsibility)
}

/** Segment spacing in base-resolution pixels. */
const SEGMENT_SPACING = 20;

/** Belt visual thickness in base-resolution pixels — wide enough for 3 items side by side. */
const BELT_WIDTH = ITEM_SIZE * 3;

/** Depth of each drawn segment rectangle in base-resolution pixels. */
const SEGMENT_DEPTH = 6;

/** Thickness of the edge rail lines in base-resolution pixels. */
const RAIL_THICKNESS = 2;

/** Half the belt width — used for perpendicular offset. */
const HALF_WIDTH = BELT_WIDTH / 2;

/**
 * A straight path segment with optional insets at start/end to avoid corner overlap.
 * Horizontal segments are inset by HALF_WIDTH at corners so vertical segments
 * can extend through the corner cleanly.
 */
interface PathSegment {
  from: Point;
  to: Point;
  /** Full geometric length of the segment. */
  length: number;
  /** Drawing start offset — skip this many pixels from `from`. */
  drawStart: number;
  /** Drawing end offset — stop this many pixels before `to`. */
  drawEnd: number;
  dx: number;
  dy: number;
  nx: number;
  ny: number;
  isVertical: boolean;
}

/**
 * Build path segments for: inlet → loop edges → outlet.
 * Horizontal segments are inset at corners so vertical segments own the corner area.
 */
function buildPathSegments(): PathSegment[] {
  const raw: { from: Point; to: Point; isLoop: boolean }[] = [];

  // Inlet
  raw.push({ from: INLET_START, to: INLET_END, isLoop: false });

  // Loop edges
  for (let i = 0; i < LOOP_WAYPOINTS.length; i++) {
    const a = LOOP_WAYPOINTS[i];
    const b = LOOP_WAYPOINTS[(i + 1) % LOOP_WAYPOINTS.length];
    raw.push({ from: a, to: b, isLoop: true });
  }

  // Outlet
  raw.push({ from: OUTLET_START, to: OUTLET_END, isLoop: false });

  const segments: PathSegment[] = [];

  for (const r of raw) {
    const rawDx = r.to.x - r.from.x;
    const rawDy = r.to.y - r.from.y;
    const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    if (len === 0) continue;
    const dx = rawDx / len;
    const dy = rawDy / len;
    const isVert = Math.abs(dx) < 0.01;

    // Horizontal loop segments get inset at both ends so vertical segments
    // extend through corners without overlap.
    // Vertical loop segments extend the full length (they own the corners).
    // Inlet/outlet are horizontal but only connect at one end to the loop,
    // so they get inset only at the loop-connection end.
    let drawStart = 0;
    let drawEnd = 0;

    if (r.isLoop && !isVert) {
      // Horizontal loop segment: inset both ends
      drawStart = HALF_WIDTH;
      drawEnd = HALF_WIDTH;
    } else if (!r.isLoop) {
      // Inlet: connects to loop at its end (INLET_END)
      // Outlet: connects to loop at its start (OUTLET_START)
      // Inset the end that touches the loop
      if (r.from === INLET_START) {
        drawEnd = HALF_WIDTH; // end connects to loop
      } else {
        drawStart = HALF_WIDTH; // start connects to loop
      }
    }
    // Vertical loop segments: drawStart=0, drawEnd=0 (full length, owns corners)
    // Extend vertical segments by HALF_WIDTH at both ends so they cover the
    // corner area where horizontal segments were inset.
    if (r.isLoop && isVert) {
      drawStart = -HALF_WIDTH;
      drawEnd = -HALF_WIDTH;
    }

    segments.push({
      from: r.from,
      to: r.to,
      length: len,
      drawStart,
      drawEnd,
      dx, dy,
      nx: -dy, ny: dx,
      isVertical: isVert,
    });
  }

  return segments;
}

/** Cached path segments — geometry is static. */
const PATH_SEGMENTS = buildPathSegments();

/**
 * Draws the conveyor belt loop, inlet, and outlet with animated repeating segments.
 */
export function drawBelt(params: BeltDrawParams): void {
  const { graphics: g, layoutSystem: ls, beltOffset } = params;

  g.clear();

  const halfDepth = SEGMENT_DEPTH / 2;
  let stepIndex = 0;
  const pixelShift = (beltOffset % 1) * SEGMENT_SPACING;

  for (const seg of PATH_SEGMENTS) {
    const drawLen = seg.length - seg.drawStart - seg.drawEnd;
    if (drawLen <= 0) { continue; }

    // Walk along the drawable portion of this segment
    let dist = -pixelShift;
    while (dist < drawLen + SEGMENT_SPACING) {
      if (dist >= -SEGMENT_SPACING && dist <= drawLen + SEGMENT_SPACING) {
        const clampedDist = Math.max(0, Math.min(dist, drawLen));
        // Actual distance along the full segment (offset by drawStart)
        const fullDist = seg.drawStart + clampedDist;
        const t = fullDist / seg.length;
        const cx = seg.from.x + (seg.to.x - seg.from.x) * t;
        const cy = seg.from.y + (seg.to.y - seg.from.y) * t;

        const color = (stepIndex + Math.floor(beltOffset)) % 2 === 0
          ? PALETTE.BELT_BASE
          : PALETTE.BELT_SEGMENT;

        g.fillStyle(color, 1);

        const scaledHalfW = ls.scaleValue(HALF_WIDTH);
        const scaledHalfD = ls.scaleValue(halfDepth);
        const sx = ls.scaleX(cx);
        const sy = ls.scaleY(cy);

        if (!seg.isVertical) {
          // Horizontal: belt width is vertical, depth is horizontal
          g.fillRect(sx - scaledHalfD, sy - scaledHalfW, scaledHalfD * 2, scaledHalfW * 2);
        } else {
          // Vertical: belt width is horizontal, depth is vertical
          g.fillRect(sx - scaledHalfW, sy - scaledHalfD, scaledHalfW * 2, scaledHalfD * 2);
        }
      }

      dist += SEGMENT_SPACING;
      stepIndex++;
    }
  }

  // --- Draw edge rails along both sides of each path segment ---
  const scaledRailThickness = Math.max(ls.scaleValue(RAIL_THICKNESS), 1);
  g.lineStyle(scaledRailThickness, PALETTE.BELT_EDGE, 1);

  for (const seg of PATH_SEGMENTS) {
    // Compute inset start/end points for rails to match the drawn area
    const startT = seg.drawStart / seg.length;
    const endT = 1 - seg.drawEnd / seg.length;
    const fromX = seg.from.x + (seg.to.x - seg.from.x) * startT;
    const fromY = seg.from.y + (seg.to.y - seg.from.y) * startT;
    const toX = seg.from.x + (seg.to.x - seg.from.x) * endT;
    const toY = seg.from.y + (seg.to.y - seg.from.y) * endT;

    // Rail on the "left" side (positive normal direction)
    g.lineBetween(
      ls.scaleX(fromX + seg.nx * HALF_WIDTH),
      ls.scaleY(fromY + seg.ny * HALF_WIDTH),
      ls.scaleX(toX + seg.nx * HALF_WIDTH),
      ls.scaleY(toY + seg.ny * HALF_WIDTH),
    );

    // Rail on the "right" side (negative normal direction)
    g.lineBetween(
      ls.scaleX(fromX - seg.nx * HALF_WIDTH),
      ls.scaleY(fromY - seg.ny * HALF_WIDTH),
      ls.scaleX(toX - seg.nx * HALF_WIDTH),
      ls.scaleY(toY - seg.ny * HALF_WIDTH),
    );
  }
}
