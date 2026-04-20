import Phaser from 'phaser';
import { GameAction, ActionLayer } from '../systems/ActionLayer';
import { LAYOUT } from '../systems/InputSystem';

export type FeedbackType = 'positive' | 'negative';

export const BUTTON_SIZE = 56;
export const BUTTON_GAP = 4;

/** Pixel positions for each button, cross pattern centered on LAYOUT.CENTER */
export const BUTTON_POSITIONS: Record<GameAction, { x: number; y: number }> = {
  up:       { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y - BUTTON_SIZE - BUTTON_GAP },
  down:     { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y + BUTTON_SIZE + BUTTON_GAP },
  left:     { x: LAYOUT.CENTER_X - BUTTON_SIZE - BUTTON_GAP, y: LAYOUT.CENTER_Y },
  right:    { x: LAYOUT.CENTER_X + BUTTON_SIZE + BUTTON_GAP, y: LAYOUT.CENTER_Y },
  interact: { x: LAYOUT.CENTER_X, y: LAYOUT.CENTER_Y },
};

export const DEFAULT_ALPHA = 0.15;
export const DEFAULT_BORDER_COLOR = 0xaaaaaa;
export const DEFAULT_BORDER_WIDTH = 1;
export const POSITIVE_ALPHA = 0.5;
export const POSITIVE_BORDER_COLOR = 0x00ff00;
export const POSITIVE_BORDER_WIDTH = 2;
export const NEGATIVE_COLOR = 0xff0000;
export const NEGATIVE_ALPHA = 0.4;
export const FEEDBACK_DURATION = 150; // ms

export class TouchButtonUI {
  private scene: Phaser.Scene;
  private buttons: Map<GameAction, Phaser.GameObjects.Rectangle> = new Map();
  private labels: Map<GameAction, Phaser.GameObjects.Text> = new Map();
  private feedbackTimers: Map<GameAction, Phaser.Time.TimerEvent> = new Map();

  constructor(scene: Phaser.Scene, actionLayer: ActionLayer) {
    this.scene = scene;

    const actionLabels: Record<GameAction, string> = {
      up: '↑', down: '↓', left: '←', right: '→', interact: '●',
    };

    for (const action of ['up', 'down', 'left', 'right', 'interact'] as GameAction[]) {
      const pos = BUTTON_POSITIONS[action];

      // Create rectangle button
      const rect = scene.add.rectangle(pos.x, pos.y, BUTTON_SIZE, BUTTON_SIZE)
        .setFillStyle(0xffffff, DEFAULT_ALPHA)
        .setStrokeStyle(DEFAULT_BORDER_WIDTH, DEFAULT_BORDER_COLOR, 0.6)
        .setInteractive()
        .setDepth(100);

      // Pointer down triggers action
      rect.on('pointerdown', () => {
        actionLayer.pushAction(action);
      });

      this.buttons.set(action, rect);

      // Label
      const label = scene.add.text(pos.x, pos.y, actionLabels[action], {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.4).setDepth(101);

      this.labels.set(action, label);
    }
  }

  /** Trigger visual feedback on a button. Callable from any gameplay system. */
  triggerFeedback(action: GameAction, type: FeedbackType): void {
    const rect = this.buttons.get(action);
    if (!rect) return;

    // Cancel any existing feedback timer for this button
    const existing = this.feedbackTimers.get(action);
    if (existing) {
      existing.destroy();
      this.feedbackTimers.delete(action);
    }

    if (type === 'positive') {
      rect.setFillStyle(0xffffff, POSITIVE_ALPHA);
      rect.setStrokeStyle(POSITIVE_BORDER_WIDTH, POSITIVE_BORDER_COLOR, 1);
    } else {
      rect.setFillStyle(NEGATIVE_COLOR, NEGATIVE_ALPHA);
      rect.setStrokeStyle(POSITIVE_BORDER_WIDTH, 0xff0000, 1);
      // Shake: offset and restore
      const origX = BUTTON_POSITIONS[action].x;
      rect.x = origX + 4;
      this.scene.time.delayedCall(40, () => { rect.x = origX - 4; });
      this.scene.time.delayedCall(80, () => { rect.x = origX + 2; });
      this.scene.time.delayedCall(120, () => { rect.x = origX; });
      // Also shake the label
      const label = this.labels.get(action);
      if (label) {
        label.x = origX + 4;
        this.scene.time.delayedCall(40, () => { label.x = origX - 4; });
        this.scene.time.delayedCall(80, () => { label.x = origX + 2; });
        this.scene.time.delayedCall(120, () => { label.x = origX; });
      }
    }

    // Restore default after duration
    const timer = this.scene.time.delayedCall(FEEDBACK_DURATION, () => {
      this.restoreDefault(action);
      this.feedbackTimers.delete(action);
    });
    this.feedbackTimers.set(action, timer);
  }

  private restoreDefault(action: GameAction): void {
    const rect = this.buttons.get(action);
    if (!rect) return;
    const pos = BUTTON_POSITIONS[action];
    rect.setFillStyle(0xffffff, DEFAULT_ALPHA);
    rect.setStrokeStyle(DEFAULT_BORDER_WIDTH, DEFAULT_BORDER_COLOR, 0.6);
    rect.x = pos.x;
    rect.y = pos.y;
    const label = this.labels.get(action);
    if (label) {
      label.x = pos.x;
      label.y = pos.y;
    }
  }

  getButton(action: GameAction): Phaser.GameObjects.Rectangle | undefined {
    return this.buttons.get(action);
  }
}
