import type { Direction } from '../data/MachineConfig';

export type PlayerPosition = 'center' | 'up' | 'down' | 'left' | 'right';

export const LAYOUT = {
  SCENE_W: 800,
  SCENE_H: 600,
  CENTER_X: 400,
  CENTER_Y: 300,

  BELT_X: 200,
  BELT_Y: 150,
  BELT_W: 400,
  BELT_H: 300,
  BELT_THICKNESS: 20,

  NODE_SIZE: 60,
  NODE_OFFSET: 100,

  STATION_W: 60,
  STATION_H: 40,
} as const;

const OPPOSITE: Record<string, PlayerPosition> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export class InputSystem {
  private position: PlayerPosition = 'center';

  constructor() {}

  /** Called each frame with the direction from ActionLayer (or null). */
  update(direction: Direction | null): void {
    if (!direction) return;

    if (this.position === 'center') {
      this.position = direction;
    } else if (direction === OPPOSITE[this.position]) {
      this.position = 'center';
    }
    // Otherwise: no-op (non-returning key from a directional position)
  }

  getPlayerPosition(): PlayerPosition {
    return this.position;
  }

  getPlayerCoords(): { x: number; y: number } {
    switch (this.position) {
      case 'center': return { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y };
      case 'up':     return { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y - LAYOUT.NODE_OFFSET };
      case 'down':   return { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y + LAYOUT.NODE_OFFSET };
      case 'left':   return { x: LAYOUT.CENTER_X - LAYOUT.NODE_OFFSET, y: LAYOUT.CENTER_Y };
      case 'right':  return { x: LAYOUT.CENTER_X + LAYOUT.NODE_OFFSET, y: LAYOUT.CENTER_Y };
    }
  }
}
