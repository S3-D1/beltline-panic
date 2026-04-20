import Phaser from 'phaser';
import { Direction } from '../data/MachineConfig';
import { LAYOUT } from '../systems/InputSystem';

const ARROW_MAP: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

const STEP_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '32px',
  color: '#aaaaaa',
};

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '18px',
  color: '#ffffff',
};

const RESULT_DELAY = 600; // ms before auto-hide after result

export class SequenceInputUI {
  private scene: Phaser.Scene;
  private stepTexts: Phaser.GameObjects.Text[] = [];
  private labelText: Phaser.GameObjects.Text | null = null;
  private resultText: Phaser.GameObjects.Text | null = null;
  private visible = false;
  private hideEvent: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(sequence: Direction[], machineId: string): void {
    this.hide();
    this.visible = true;

    const baseY = LAYOUT.BELT_Y - 60;
    const stepSpacing = 36;
    const totalWidth = sequence.length * stepSpacing;
    const startX = LAYOUT.CENTER_X - totalWidth / 2 + stepSpacing / 2;

    // Machine label
    const label = machineId.replace('machine', 'Machine ');
    this.labelText = this.scene.add.text(LAYOUT.CENTER_X, baseY - 28, label, LABEL_STYLE)
      .setOrigin(0.5, 0.5);

    // Arrow steps
    for (let i = 0; i < sequence.length; i++) {
      const arrow = ARROW_MAP[sequence[i]];
      const txt = this.scene.add.text(startX + i * stepSpacing, baseY, arrow, { ...STEP_STYLE })
        .setOrigin(0.5, 0.5);
      this.stepTexts.push(txt);
    }
  }

  highlightStep(stepIndex: number): void {
    for (let i = 0; i <= stepIndex && i < this.stepTexts.length; i++) {
      this.stepTexts[i].setColor('#00ff00');
    }
  }

  showResult(result: 'success' | 'failed' | 'cancelled'): void {
    // Cancel any pending hide
    if (this.hideEvent) {
      this.hideEvent.destroy();
      this.hideEvent = null;
    }

    if (result === 'success') {
      // Flash all green
      for (const txt of this.stepTexts) {
        txt.setColor('#00ff00');
      }
    } else if (result === 'failed') {
      // Turn last entered step red
      const lastGreen = this.stepTexts.findIndex(t => t.style.color !== '#00ff00');
      const failIdx = lastGreen === -1 ? this.stepTexts.length - 1 : lastGreen;
      if (failIdx >= 0 && failIdx < this.stepTexts.length) {
        this.stepTexts[failIdx].setColor('#ff0000');
      }
    } else if (result === 'cancelled') {
      // Show "Cancelled" text
      this.resultText = this.scene.add.text(
        LAYOUT.CENTER_X,
        LAYOUT.BELT_Y - 60,
        'Cancelled',
        { fontFamily: 'monospace', fontSize: '24px', color: '#ffcc00' },
      ).setOrigin(0.5, 0.5);
      // Hide step arrows immediately for cancel
      for (const txt of this.stepTexts) {
        txt.setVisible(false);
      }
      if (this.labelText) this.labelText.setVisible(false);
    }

    // Auto-hide after brief delay
    this.hideEvent = this.scene.time.delayedCall(RESULT_DELAY, () => {
      this.hide();
    });
  }

  hide(): void {
    if (this.hideEvent) {
      this.hideEvent.destroy();
      this.hideEvent = null;
    }
    for (const txt of this.stepTexts) {
      txt.destroy();
    }
    this.stepTexts = [];
    if (this.labelText) {
      this.labelText.destroy();
      this.labelText = null;
    }
    if (this.resultText) {
      this.resultText.destroy();
      this.resultText = null;
    }
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }
}
