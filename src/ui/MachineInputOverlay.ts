import Phaser from 'phaser';
import { Direction } from '../data/MachineConfig';
import { LayoutSystem } from '../systems/LayoutSystem';

// Overlay configuration constants
const RESULT_DELAY = 600;        // ms before auto-hide or transition after result
const OVERLAY_BASE_X = 400;      // LAYOUT.CENTER_X — centered on Machine 1
const OVERLAY_BASE_Y = 100;      // Above Machine 1
const OVERLAY_WIDTH = 220;       // Base-resolution width of background box
const OVERLAY_HEIGHT = 70;       // Base-resolution height of background box
const STEP_SPACING = 36;         // Base-resolution spacing between step indicators
const LABEL_FONT_SIZE = 16;      // Base font size for machine label
const STEP_FONT_SIZE = 28;       // Base font size for arrow step indicators
const RESULT_FONT_SIZE = 22;     // Base font size for result/cancelled text
const BG_COLOR = 0x000000;       // Background rectangle color
const BG_ALPHA = 0.75;           // Background rectangle opacity

// Color scheme
const COLOR_PENDING = '#aaaaaa';
const COLOR_COMPLETED = '#00ff00';
const COLOR_FAILED = '#ff0000';
const COLOR_CANCELLED = '#ffcc00';
const COLOR_LABEL = '#ffffff';

const ARROW_MAP: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export {
  RESULT_DELAY,
  OVERLAY_BASE_X,
  OVERLAY_BASE_Y,
  OVERLAY_WIDTH,
  OVERLAY_HEIGHT,
  STEP_SPACING,
  LABEL_FONT_SIZE,
  STEP_FONT_SIZE,
  RESULT_FONT_SIZE,
  BG_COLOR,
  BG_ALPHA,
  COLOR_PENDING,
  COLOR_COMPLETED,
  COLOR_FAILED,
  COLOR_CANCELLED,
  COLOR_LABEL,
  ARROW_MAP,
};

export class MachineInputOverlay {
  private scene: Phaser.Scene;
  private layoutSystem: LayoutSystem;
  private bgRect: Phaser.GameObjects.Rectangle | null = null;
  private labelText: Phaser.GameObjects.Text | null = null;
  private stepTexts: Phaser.GameObjects.Text[] = [];
  private resultText: Phaser.GameObjects.Text | null = null;
  private visible = false;
  private currentSequence: Direction[] = [];
  private currentMachineId = '';
  private hideEvent: Phaser.Time.TimerEvent | null = null;
  private pendingTransition: { sequence: Direction[]; machineId: string } | null = null;

  constructor(scene: Phaser.Scene, layoutSystem: LayoutSystem) {
    this.scene = scene;
    this.layoutSystem = layoutSystem;
  }

  /** Show the overlay with a new sequence. Called when interaction starts. */
  show(sequence: Direction[], machineId: string): void {
    // Double-show safety: clean up any existing state first
    this.hide();

    const ls = this.layoutSystem;

    // Create background rectangle
    this.bgRect = this.scene.add.rectangle(
      ls.scaleX(OVERLAY_BASE_X),
      ls.scaleY(OVERLAY_BASE_Y),
      ls.scaleValue(OVERLAY_WIDTH),
      ls.scaleValue(OVERLAY_HEIGHT),
      BG_COLOR,
      BG_ALPHA,
    ).setOrigin(0.5, 0.5);

    // Create machine label (e.g., "machine1" → "Machine 1")
    const label = machineId.replace('machine', 'Machine ');
    this.labelText = this.scene.add.text(
      ls.scaleX(OVERLAY_BASE_X),
      ls.scaleY(OVERLAY_BASE_Y - 20),
      label,
      {
        fontFamily: 'monospace',
        fontSize: `${ls.scaleFontSize(LABEL_FONT_SIZE)}px`,
        color: COLOR_LABEL,
      },
    ).setOrigin(0.5, 0.5);

    // Create step indicator texts
    const stepSpacing = ls.scaleValue(STEP_SPACING);
    const totalWidth = sequence.length * stepSpacing;
    const startX = ls.scaleX(OVERLAY_BASE_X) - totalWidth / 2 + stepSpacing / 2;
    const stepY = ls.scaleY(OVERLAY_BASE_Y + 8);
    const stepFontSize = ls.scaleFontSize(STEP_FONT_SIZE);

    for (let i = 0; i < sequence.length; i++) {
      const arrow = ARROW_MAP[sequence[i]];
      const txt = this.scene.add.text(
        startX + i * stepSpacing,
        stepY,
        arrow,
        {
          fontFamily: 'monospace',
          fontSize: `${stepFontSize}px`,
          color: COLOR_PENDING,
        },
      ).setOrigin(0.5, 0.5);
      this.stepTexts.push(txt);
    }

    this.visible = true;
    this.currentSequence = sequence;
    this.currentMachineId = machineId;
  }

  /** Update a step indicator to completed (green). */
  highlightStep(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex >= this.stepTexts.length) return;
    for (let i = 0; i <= stepIndex; i++) {
      this.stepTexts[i].setColor(COLOR_COMPLETED);
    }
  }

  /** Display a result state (success/failed/cancelled). Auto-hides after RESULT_DELAY. */
  showResult(result: 'success' | 'failed' | 'cancelled'): void {
    // Cancel any pending hide timer first
    if (this.hideEvent) {
      this.hideEvent.destroy();
      this.hideEvent = null;
    }

    if (result === 'success') {
      // Turn all step indicators green
      for (const txt of this.stepTexts) {
        txt.setColor(COLOR_COMPLETED);
      }
    } else if (result === 'failed') {
      // Mark the first unhighlighted step red
      const failIdx = this.stepTexts.findIndex(t => t.style.color !== COLOR_COMPLETED);
      if (failIdx >= 0 && failIdx < this.stepTexts.length) {
        this.stepTexts[failIdx].setColor(COLOR_FAILED);
      }
    } else if (result === 'cancelled') {
      // Hide step indicators
      for (const txt of this.stepTexts) {
        txt.setVisible(false);
      }
      // Hide the label text
      if (this.labelText) this.labelText.setVisible(false);

      // Show "Cancelled" text at the overlay center position
      const ls = this.layoutSystem;
      this.resultText = this.scene.add.text(
        ls.scaleX(OVERLAY_BASE_X),
        ls.scaleY(OVERLAY_BASE_Y),
        'Cancelled',
        {
          fontFamily: 'monospace',
          fontSize: `${ls.scaleFontSize(RESULT_FONT_SIZE)}px`,
          color: COLOR_CANCELLED,
        },
      ).setOrigin(0.5, 0.5);
    }

    // Schedule hide after RESULT_DELAY
    this.hideEvent = this.scene.time.delayedCall(RESULT_DELAY, () => {
      this.hide();
    });
  }

  /**
   * Transition to a new sequence after showing the current success result.
   * Called when auto-chaining to the next queued item.
   * Waits for the result display period, then renders the new sequence.
   */
  transitionToNext(sequence: Direction[], machineId: string): void {
    if (this.hideEvent) {
      // A result display timer is pending — store the transition and replace the timer
      this.pendingTransition = { sequence, machineId };
      this.hideEvent.destroy();
      this.hideEvent = this.scene.time.delayedCall(RESULT_DELAY, () => {
        const pending = this.pendingTransition;
        this.pendingTransition = null;
        this.hideEvent = null;
        if (pending) {
          this.show(pending.sequence, pending.machineId);
        }
      });
    } else {
      // No timer pending — show immediately
      this.show(sequence, machineId);
    }
  }

  /** Hide the overlay and destroy all game objects. */
  hide(): void {
    if (this.bgRect) {
      this.bgRect.destroy();
      this.bgRect = null;
    }
    if (this.labelText) {
      this.labelText.destroy();
      this.labelText = null;
    }
    for (const txt of this.stepTexts) {
      txt.destroy();
    }
    this.stepTexts = [];
    if (this.resultText) {
      this.resultText.destroy();
      this.resultText = null;
    }
    if (this.hideEvent) {
      this.hideEvent.destroy();
      this.hideEvent = null;
    }
    this.pendingTransition = null;
    this.visible = false;
  }

  /** Reposition and rescale all elements on window resize. */
  resize(layoutSystem: LayoutSystem): void {
    this.layoutSystem = layoutSystem;

    if (!this.visible) return;

    const ls = this.layoutSystem;

    // Reposition and resize background rectangle
    if (this.bgRect) {
      this.bgRect.setPosition(ls.scaleX(OVERLAY_BASE_X), ls.scaleY(OVERLAY_BASE_Y));
      this.bgRect.setSize(ls.scaleValue(OVERLAY_WIDTH), ls.scaleValue(OVERLAY_HEIGHT));
    }

    // Reposition and resize label text
    if (this.labelText) {
      this.labelText.setPosition(ls.scaleX(OVERLAY_BASE_X), ls.scaleY(OVERLAY_BASE_Y - 20));
      this.labelText.setFontSize(ls.scaleFontSize(LABEL_FONT_SIZE));
    }

    // Reposition and resize step texts — preserve colors (do not reset progress)
    const stepSpacing = ls.scaleValue(STEP_SPACING);
    const totalWidth = this.stepTexts.length * stepSpacing;
    const startX = ls.scaleX(OVERLAY_BASE_X) - totalWidth / 2 + stepSpacing / 2;
    const stepY = ls.scaleY(OVERLAY_BASE_Y + 8);
    const stepFontSize = ls.scaleFontSize(STEP_FONT_SIZE);

    for (let i = 0; i < this.stepTexts.length; i++) {
      this.stepTexts[i].setPosition(startX + i * stepSpacing, stepY);
      this.stepTexts[i].setFontSize(stepFontSize);
    }

    // Reposition and resize result text (if it exists, e.g., during cancelled state)
    if (this.resultText) {
      this.resultText.setPosition(ls.scaleX(OVERLAY_BASE_X), ls.scaleY(OVERLAY_BASE_Y));
      this.resultText.setFontSize(ls.scaleFontSize(RESULT_FONT_SIZE));
    }
  }

  /** Whether the overlay is currently visible. */
  isVisible(): boolean {
    return this.visible;
  }
}
