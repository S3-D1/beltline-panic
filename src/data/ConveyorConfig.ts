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

export const LOOP_WAYPOINTS: Point[] = [
  { x: LAYOUT.BELT_X,                  y: LAYOUT.BELT_Y },                  // top-left
  { x: LAYOUT.BELT_X + LAYOUT.BELT_W,  y: LAYOUT.BELT_Y },                  // top-right
  { x: LAYOUT.BELT_X + LAYOUT.BELT_W,  y: LAYOUT.BELT_Y + LAYOUT.BELT_H },  // bottom-right
  { x: LAYOUT.BELT_X,                  y: LAYOUT.BELT_Y + LAYOUT.BELT_H },  // bottom-left
];

// Inlet: horizontal segment entering from the left into the top-left corner
export const INLET_START: Point = { x: LAYOUT.BELT_X - 80, y: LAYOUT.BELT_Y };
export const INLET_END: Point   = { x: LAYOUT.BELT_X,      y: LAYOUT.BELT_Y }; // == LOOP_WAYPOINTS[0]

// --- Transition zones (progress ranges on the loop, 0–1) ---

export const TRANSITION_ZONES: TransitionZone[] = [
  { progressStart: 0.10, progressEnd: 0.18, fromState: 'new',       toState: 'processed' }, // Machine_1 (top edge)
  { progressStart: 0.35, progressEnd: 0.43, fromState: 'processed', toState: 'upgraded'  }, // Machine_2 (right edge)
  { progressStart: 0.60, progressEnd: 0.68, fromState: 'upgraded',  toState: 'packaged'  }, // Machine_3 (bottom edge)
];
