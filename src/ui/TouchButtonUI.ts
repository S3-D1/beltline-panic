import Phaser from 'phaser';
import { GameAction, ActionLayer } from '../systems/ActionLayer';
import { LAYOUT } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';

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
export const NEGATIVE_COLOR = 0xff0000;
export const NEGATIVE_ALPHA = 0.4;
export const FEEDBACK_DURATION = 150; // ms

const ACTION_LABELS: Record<GameAction, string> = {
  up: '↑', down: '↓', left: '←', right: '→', interact: '●',
};

const ALL_ACTIONS: GameAction[] = ['up', 'down', 'left', 'right', 'interact'];

export class TouchButtonUI {
  private scene: Phaser.Scene;
  private buttons: Map<GameAction, Phaser.GameObjects.Rectangle> = new Map();
  private labels: Map<GameAction, Phaser.GameObjects.Text> = new Map();
  private feedbackTimers: Map<GameAction, Phaser.Time.TimerEvent> = new Map();
  /** Current scaled positions, updated on resize. Used for shake restore. */
  private scaledPositions: Map<GameAction, { x: number; y: number }> = new Map();
  private layoutSystem: LayoutSystem;

  constructor(scene: Phaser.Scene, actionLayer: ActionLayer, layoutSystem: LayoutSystem) {
    this.scene = scene;
    this.layoutSystem = layoutSystem;

    const scaledSize = layoutSystem.scaleWithMin(BUTTON_SIZE, 40);
    const fontSize = layoutSystem.scaleFontSize(20);

    for (const action of ALL_ACTIONS) {
      const basePos = BUTTON_POSITIONS[action];
      const sx = layoutSystem.scaleX(basePos.x);
      const sy = layoutSystem.scaleY(basePos.y);
      this.scaledPositions.set(action, { x: sx, y: sy });

      // Create rectangle button
      const rect = scene.add.rectangle(sx, sy, scaledSize, scaledSize)
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
      const label = scene.add.text(sx, sy, ACTION_LABELS[action], {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.4).setDepth(101);

      this.labels.set(action, label);
    }
  }

  /** Reposition and resize all buttons and labels for a new layout. */
  resize(layoutSystem: LayoutSystem): void {
    this.layoutSystem = layoutSystem;
    const scaledSize = layoutSystem.scaleWithMin(BUTTON_SIZE, 40);
    const fontSize = layoutSystem.scaleFontSize(20);

    for (const action of ALL_ACTIONS) {
      const basePos = BUTTON_POSITIONS[action];
      const sx = layoutSystem.scaleX(basePos.x);
      const sy = layoutSystem.scaleY(basePos.y);
      this.scaledPositions.set(action, { x: sx, y: sy });

      const rect = this.buttons.get(action);
      if (rect) {
        rect.setPosition(sx, sy);
        rect.setSize(scaledSize, scaledSize);
        // Update the interactive hit area to match the new size
        rect.setInteractive();
      }

      const label = this.labels.get(action);
      if (label) {
        label.setPosition(sx, sy);
        label.setFontSize(fontSize);
      }
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
      rect.setStrokeStyle(2, POSITIVE_BORDER_COLOR, 1);
    } else {
      rect.setFillStyle(NEGATIVE_COLOR, NEGATIVE_ALPHA);
      rect.setStrokeStyle(2, 0xff0000, 1);
      // Shake: scale offsets with layoutSystem
      const pos = this.scaledPositions.get(action)!;
      const off4 = this.layoutSystem.scaleValue(4);
      const off2 = this.layoutSystem.scaleValue(2);
      rect.x = pos.x + off4;
      this.scene.time.delayedCall(40, () => { rect.x = pos.x - off4; });
      this.scene.time.delayedCall(80, () => { rect.x = pos.x + off2; });
      this.scene.time.delayedCall(120, () => { rect.x = pos.x; });
      // Also shake the label
      const label = this.labels.get(action);
      if (label) {
        label.x = pos.x + off4;
        this.scene.time.delayedCall(40, () => { label.x = pos.x - off4; });
        this.scene.time.delayedCall(80, () => { label.x = pos.x + off2; });
        this.scene.time.delayedCall(120, () => { label.x = pos.x; });
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
    const pos = this.scaledPositions.get(action)!;
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
