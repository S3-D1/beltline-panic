import { LAYOUT } from '../systems/InputSystem';

// --- Interfaces ---

export interface Point {
  x: number;
  y: number;
}

export type ItemState = 'new' | 'processed' | 'upgraded' | 'packaged';

export interface TransitionZone {
  progressStart: number; // normalized 0–1 on loop path
  progressEnd: number;
  fromState: ItemState;
  toState: ItemState;
}

// --- Constants ---

export const ITEM_COLORS: Record<ItemState, number> = {
  new:       0x9944cc,
  processed: 0xcccc00,
  upgraded:  0x44cc44,
  packaged:  0x886622,
};

export const CONVEYOR_SPEED = 60;   // pixels per second
export const SPAWN_INTERVAL = 3000; // ms between spawns
export const ITEM_SIZE = 14;        // px, square side length

// --- Path geometry derived from LAYOUT ---

// Inlet & Outlet Y-positions: equally spaced between terminal (CENTER_Y) and belt edges
const INLET_Y = LAYOUT.BELT_Y + (LAYOUT.CENTER_Y - LAYOUT.BELT_Y) / 2;   // midpoint between top edge and terminal
const OUTLET_Y = LAYOUT.CENTER_Y + (LAYOUT.BELT_Y + LAYOUT.BELT_H - LAYOUT.CENTER_Y) / 2; // midpoint between terminal and bottom edge

// Inlet/Outlet horizontal start: centered between terminal left edge and scene left edge
const INLET_OUTLET_X = (LAYOUT.BELT_X - LAYOUT.STATION_H) / 2;

export const LOOP_WAYPOINTS: Point[] = [
  { x: LAYOUT.BELT_X,                  y: INLET_Y },                        // inlet junction (left edge)
  { x: LAYOUT.BELT_X,                  y: LAYOUT.BELT_Y },                  // top-left corner
  { x: LAYOUT.BELT_X + LAYOUT.BELT_W,  y: LAYOUT.BELT_Y },                  // top-right corner
  { x: LAYOUT.BELT_X + LAYOUT.BELT_W,  y: LAYOUT.BELT_Y + LAYOUT.BELT_H },  // bottom-right corner
  { x: LAYOUT.BELT_X,                  y: LAYOUT.BELT_Y + LAYOUT.BELT_H },  // bottom-left corner
  { x: LAYOUT.BELT_X,                  y: OUTLET_Y },                       // outlet junction (left edge)
];

// Inlet: horizontal segment entering from the left into the left belt edge
export const INLET_START: Point = { x: INLET_OUTLET_X, y: INLET_Y };
export const INLET_END: Point   = { x: LAYOUT.BELT_X,   y: INLET_Y };

// --- Transition zones (progress ranges on the loop, 0–1) ---

export const TRANSITION_ZONES: TransitionZone[] = [
  { progressStart: 0.15, progressEnd: 0.23, fromState: 'new',       toState: 'processed' }, // Machine_1 (top edge)
  { progressStart: 0.39, progressEnd: 0.47, fromState: 'processed', toState: 'upgraded'  }, // Machine_2 (right edge)
  { progressStart: 0.63, progressEnd: 0.71, fromState: 'upgraded',  toState: 'packaged'  }, // Machine_3 (bottom edge)
];

// --- Outlet geometry ---
// Outlet branch at waypoint 5 (outlet junction): distance = 75+400+300+400+75 = 1250, total = 1400
export const OUTLET_BRANCH_PROGRESS = 1250 / 1400;
export const OUTLET_START: Point = { x: LAYOUT.BELT_X, y: OUTLET_Y };
export const OUTLET_END: Point   = { x: INLET_OUTLET_X, y: OUTLET_Y };

// --- Item values ---
export const ITEM_VALUES: Record<ItemState, number> = {
  new:       0,
  processed: 10,
  upgraded:  11,  // 10 * 1.1
  packaged:  22,  // 10 * 1.1 * 2
};

// --- Spacing ---
export const ITEM_DIAGONAL = Math.sqrt(ITEM_SIZE * ITEM_SIZE + ITEM_SIZE * ITEM_SIZE);
export const MIN_BELT_SPACING = 2 * ITEM_DIAGONAL;

// --- Collision ---
export const COLLISION_THRESHOLD = ITEM_SIZE; // distance in pixels
