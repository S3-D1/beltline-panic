import {
  INLET_START,
  INLET_END,
  OUTLET_START,
  OUTLET_END,
  LOOP_WAYPOINTS,
  ITEM_SIZE,
  Point,
} from '../data/ConveyorConfig';

/** Belt visual thickness in base-resolution pixels — wide enough for 3 items side by side. */
export const BELT_WIDTH = ITEM_SIZE * 3;

/** Half the belt width — used for perpendicular offset in segment geometry. */
const HALF_WIDTH = BELT_WIDTH / 2;

/**
 * A straight path segment with optional insets at start/end to avoid corner overlap.
 * Horizontal segments are inset by HALF_WIDTH at corners so vertical segments
 * can extend through the corner cleanly.
 */
export interface PathSegment {
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
export function buildPathSegments(): PathSegment[] {
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
export const PATH_SEGMENTS = buildPathSegments();
