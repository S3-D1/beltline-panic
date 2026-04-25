import Phaser from 'phaser';
import { Direction } from '../data/MachineConfig';
import { LayoutSystem } from '../systems/LayoutSystem';

// Overlay configuration constants
const RESULT_DELAY = 600;        // ms before auto-hide or transition after result
const OVERLAY_BASE_X = 400;      // LAYOUT.CENTER_X — horizontally centered
const OVERLAY_BASE_Y = 28;       // Top edge of the screen
const OVERLAY_WIDTH = 280;       // Base-resolution minimum width of background box
const OVERLAY_HEIGHT = 44;       // Base-resolution height — compact top bar
const OVERLAY_PADDING = 24;      // Base-resolution horizontal padding inside the box
const STEP_SPACING = 32;         // Base-resolution spacing between step indicators
const LABEL_FONT_SIZE = 11;      // Base font size for machine label
const STEP_FONT_SIZE = 22;       // Base font size for arrow step indicators
const RESULT_FONT_SIZE = 18;     // Base font size for result/cancelled text
const BG_COLOR = 0x1a1a2e;       // Match floor dark tone
const BG_ALPHA = 0.92;           // Slightly more opaque for readability at top edge

// Color scheme
const COLOR_PENDING = '#666688';
const COLOR_COMPLETED = '#00ff00';
const COLOR_FAILED = '#ff4444';
const COLOR_CANCELLED = '#ffcc00';
const COLOR_LABEL = '#ffcc00';
const COLOR_PREVIEW = '#444466';  // Dimmed preview for upcoming sequence
const COLOR_DELIMITER = '#888888'; // Separator between current and next sequence

const DELIMITER_CHAR = '»';       // Visual separator between completed and upcoming
const PREVIEW_MAX_STEPS = 3;      // Max arrows to preview from the next sequence

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
  OVERLAY_PADDING,
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
  COLOR_PREVIEW,
  COLOR_DELIMITER,
  DELIMITER_CHAR,
  PREVIEW_MAX_STEPS,
  ARROW_MAP,
};

export class MachineInputOverlay {
  private scene: Phaser.Scene;
  private layoutSystem: LayoutSystem;
  private bgRect: Phaser.GameObjects.Rectangle | null = null;
  private labelText: Phaser.GameObjects.Text | null = null;
  private stepTexts: Phaser.GameObjects.Text[] = [];
  private resultText: Phaser.GameObjects.Text | null = null;
  private previewTexts: Phaser.GameObjects.Text[] = [];
  private delimiterText: Phaser.GameObjects.Text | null = null;
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

    // Compute dynamic width: fit the step row + padding, but at least OVERLAY_WIDTH
    const stepsWidth = sequence.length * STEP_SPACING;
    const dynamicWidth = Math.max(OVERLAY_WIDTH, stepsWidth + OVERLAY_PADDING * 2);

    // Create background rectangle with subtle border
    this.bgRect = this.scene.add.rectangle(
      ls.scaleX(OVERLAY_BASE_X),
      ls.scaleY(OVERLAY_BASE_Y),
      ls.scaleValue(dynamicWidth),
      ls.scaleValue(OVERLAY_HEIGHT),
      BG_COLOR,
      BG_ALPHA,
    ).setOrigin(0.5, 0.5);
    this.bgRect.setStrokeStyle(ls.scaleValue(1), 0x3a3a5e, 1);
    this.bgRect.setDepth(10);

    // Create machine label (e.g., "machine1" → "Machine 1") — left-aligned inside the box
    const label = machineId.replace('machine', 'Machine ');
    this.labelText = this.scene.add.text(
      ls.scaleX(OVERLAY_BASE_X),
      ls.scaleY(OVERLAY_BASE_Y - 12),
      label,
      {
        fontFamily: 'monospace',
        fontSize: `${ls.scaleFontSize(LABEL_FONT_SIZE)}px`,
        color: COLOR_LABEL,
      },
    ).setOrigin(0.5, 0.5);
    this.labelText.setDepth(11);

    // Create step indicator texts — centered row below the label
    const stepSpacing = ls.scaleValue(STEP_SPACING);
    const totalWidth = sequence.length * stepSpacing;
    const startX = ls.scaleX(OVERLAY_BASE_X) - totalWidth / 2 + stepSpacing / 2;
    const stepY = ls.scaleY(OVERLAY_BASE_Y + 6);
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
      txt.setDepth(11);
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
      this.resultText.setDepth(11);
    }

    // Schedule hide after RESULT_DELAY
    this.hideEvent = this.scene.time.delayedCall(RESULT_DELAY, () => {
      this.hide();
    });
  }

  /**
   * Transition to a new sequence after showing the current success result.
   * Shows all current steps green, a delimiter, and a dimmed preview of the
   * next sequence's first few arrows. After RESULT_DELAY, swaps to the full
   * new sequence.
   */
  transitionToNext(sequence: Direction[], machineId: string): void {
    // Cancel any pending hide timer
    if (this.hideEvent) {
      this.hideEvent.destroy();
      this.hideEvent = null;
    }

    // Turn all current steps green (success feedback)
    for (const txt of this.stepTexts) {
      txt.setColor(COLOR_COMPLETED);
    }

    // Append delimiter + preview of next sequence
    this.showNextPreview(sequence);

    // Store pending transition and schedule the swap
    this.pendingTransition = { sequence, machineId };
    this.hideEvent = this.scene.time.delayedCall(RESULT_DELAY, () => {
      const pending = this.pendingTransition;
      this.pendingTransition = null;
      this.hideEvent = null;
      if (pending) {
        this.show(pending.sequence, pending.machineId);
      }
    });
  }

  /**
   * Append a delimiter and dimmed preview arrows after the current step row.
   * Shows up to PREVIEW_MAX_STEPS arrows from the next sequence.
   */
  private showNextPreview(nextSequence: Direction[]): void {
    this.clearPreview();

    if (nextSequence.length === 0) return;

    const ls = this.layoutSystem;
    const stepSpacing = ls.scaleValue(STEP_SPACING);
    const stepY = ls.scaleY(OVERLAY_BASE_Y + 6);
    const stepFontSize = ls.scaleFontSize(STEP_FONT_SIZE);

    // Position the delimiter after the last step text
    const lastStep = this.stepTexts[this.stepTexts.length - 1];
    const delimX = lastStep ? lastStep.x + stepSpacing * 0.8 : ls.scaleX(OVERLAY_BASE_X);

    // Delimiter character
    this.delimiterText = this.scene.add.text(
      delimX,
      stepY,
      DELIMITER_CHAR,
      {
        fontFamily: 'monospace',
        fontSize: `${stepFontSize}px`,
        color: COLOR_DELIMITER,
      },
    ).setOrigin(0.5, 0.5);
    this.delimiterText.setDepth(11);

    // Preview arrows (dimmed)
    const previewCount = Math.min(nextSequence.length, PREVIEW_MAX_STEPS);
    for (let i = 0; i < previewCount; i++) {
      const arrow = ARROW_MAP[nextSequence[i]];
      const px = delimX + stepSpacing * (i + 0.8);
      const txt = this.scene.add.text(
        px,
        stepY,
        arrow,
        {
          fontFamily: 'monospace',
          fontSize: `${stepFontSize}px`,
          color: COLOR_PREVIEW,
        },
      ).setOrigin(0.5, 0.5);
      txt.setDepth(11);
      this.previewTexts.push(txt);
    }

    // Grow the background box to fit the preview
    if (this.bgRect) {
      const currentStepsWidth = this.stepTexts.length * STEP_SPACING;
      const delimiterWidth = STEP_SPACING * 0.8;
      const previewWidth = previewCount * STEP_SPACING;
      const totalContentWidth = currentStepsWidth + delimiterWidth + previewWidth + STEP_SPACING * 0.4;
      const newWidth = Math.max(OVERLAY_WIDTH, totalContentWidth + OVERLAY_PADDING * 2);
      this.bgRect.setSize(ls.scaleValue(newWidth), ls.scaleValue(OVERLAY_HEIGHT));
    }
  }

  /** Remove preview elements (delimiter + preview arrows). */
  private clearPreview(): void {
    if (this.delimiterText) {
      this.delimiterText.destroy();
      this.delimiterText = null;
    }
    for (const txt of this.previewTexts) {
      txt.destroy();
    }
    this.previewTexts = [];
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
    this.clearPreview();
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

    // Reposition and resize background rectangle (dynamic width based on step count)
    const stepsWidth = this.stepTexts.length * STEP_SPACING;
    const dynamicWidth = Math.max(OVERLAY_WIDTH, stepsWidth + OVERLAY_PADDING * 2);

    if (this.bgRect) {
      this.bgRect.setPosition(ls.scaleX(OVERLAY_BASE_X), ls.scaleY(OVERLAY_BASE_Y));
      this.bgRect.setSize(ls.scaleValue(dynamicWidth), ls.scaleValue(OVERLAY_HEIGHT));
      this.bgRect.setStrokeStyle(ls.scaleValue(1), 0x3a3a5e, 1);
    }

    // Reposition and resize label text
    if (this.labelText) {
      this.labelText.setPosition(ls.scaleX(OVERLAY_BASE_X), ls.scaleY(OVERLAY_BASE_Y - 12));
      this.labelText.setFontSize(ls.scaleFontSize(LABEL_FONT_SIZE));
    }

    // Reposition and resize step texts — preserve colors (do not reset progress)
    const stepSpacing = ls.scaleValue(STEP_SPACING);
    const totalWidth = this.stepTexts.length * stepSpacing;
    const startX = ls.scaleX(OVERLAY_BASE_X) - totalWidth / 2 + stepSpacing / 2;
    const stepY = ls.scaleY(OVERLAY_BASE_Y + 6);
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
