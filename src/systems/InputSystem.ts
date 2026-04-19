import Phaser from 'phaser';

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

  private keyUp: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyDown: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyLeft: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyRight: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keyUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  update(): void {
    const pressed = this.getPressedDirection();
    if (!pressed) return;

    if (this.position === 'center') {
      this.position = pressed;
    } else if (pressed === OPPOSITE[this.position]) {
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

  private getPressedDirection(): PlayerPosition | null {
    if (Phaser.Input.Keyboard.JustDown(this.keyUp) || Phaser.Input.Keyboard.JustDown(this.keyW)) return 'up';
    if (Phaser.Input.Keyboard.JustDown(this.keyDown) || Phaser.Input.Keyboard.JustDown(this.keyS)) return 'down';
    if (Phaser.Input.Keyboard.JustDown(this.keyLeft) || Phaser.Input.Keyboard.JustDown(this.keyA)) return 'left';
    if (Phaser.Input.Keyboard.JustDown(this.keyRight) || Phaser.Input.Keyboard.JustDown(this.keyD)) return 'right';
    return null;
  }
}
