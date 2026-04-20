import Phaser from 'phaser';
import { Direction } from '../data/MachineConfig';

export type GameAction = 'up' | 'down' | 'left' | 'right' | 'interact';

export class ActionLayer {
  private directionAction: Direction | null = null;
  private interactAction: boolean = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) return; // Guard for touch-only devices

    const bind = (codes: number[], action: GameAction) => {
      for (const code of codes) {
        const key = kb.addKey(code);
        key.on('down', () => this.pushAction(action));
      }
    };

    bind([Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.W], 'up');
    bind([Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.S], 'down');
    bind([Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.A], 'left');
    bind([Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.D], 'right');
    bind([Phaser.Input.Keyboard.KeyCodes.SPACE], 'interact');
  }

  /** Called by TouchButtonUI or any other input source to inject an action. */
  pushAction(action: GameAction): void {
    if (action === 'interact') {
      this.interactAction = true;
    } else {
      // Last direction wins if multiple arrive in one frame
      this.directionAction = action;
    }
  }

  /** Called once per frame by GameScene. Returns buffered actions and clears the buffer. */
  consumeActions(): { direction: Direction | null; interact: boolean } {
    const result = {
      direction: this.directionAction,
      interact: this.interactAction,
    };
    this.directionAction = null;
    this.interactAction = false;
    return result;
  }
}
