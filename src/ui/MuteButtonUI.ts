import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { LayoutSystem } from '../systems/LayoutSystem';

/** Base-resolution coordinates for the mute button (bottom-right corner). */
const BASE_X = 784;
const BASE_Y = 584;
const BASE_FONT_SIZE = 14;
const LABEL_UNMUTED = "🔊 ON  (Push 'M' to toggle)";
const LABEL_MUTED = "🔇 MUTE (Push 'M' to toggle)";
const DEPTH = 200;

export class MuteButtonUI {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private audioManager: AudioManager;
  private keyHandler: (event: KeyboardEvent) => void;
  private lastMuted: boolean;

  constructor(scene: Phaser.Scene, layoutSystem: LayoutSystem) {
    this.scene = scene;
    this.audioManager = scene.game.audioManager as AudioManager;

    const fontSize = layoutSystem.scaleFontSize(BASE_FONT_SIZE);
    this.lastMuted = this.audioManager.isMuted();

    this.text = scene.add.text(
      layoutSystem.scaleX(BASE_X),
      layoutSystem.scaleY(BASE_Y),
      this.lastMuted ? LABEL_MUTED : LABEL_UNMUTED,
      {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
      },
    )
      .setOrigin(1, 1)
      .setDepth(DEPTH)
      .setAlpha(0.6);

    this.text.setInteractive({ useHandCursor: true });

    this.text.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.audioManager.toggleMuted();
    });

    // Keyboard shortcut: M key toggles mute
    this.keyHandler = (event: KeyboardEvent) => {
      if (event.key !== 'm' && event.key !== 'M') return;
      this.audioManager.toggleMuted();
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  /** Sync label with actual mute state. Call from scene update() for guaranteed consistency. */
  update(): void {
    const muted = this.audioManager.isMuted();
    if (muted !== this.lastMuted) {
      this.lastMuted = muted;
      this.text.setText(muted ? LABEL_MUTED : LABEL_UNMUTED);
    }
  }

  /** Update label text to match current mute state. */
  updateLabel(): void {
    const muted = this.audioManager.isMuted();
    this.lastMuted = muted;
    this.text.setText(muted ? LABEL_MUTED : LABEL_UNMUTED);
  }

  /** Reposition and rescale on resize. */
  resize(layoutSystem: LayoutSystem): void {
    const fontSize = layoutSystem.scaleFontSize(BASE_FONT_SIZE);
    this.text.setPosition(
      layoutSystem.scaleX(BASE_X),
      layoutSystem.scaleY(BASE_Y),
    );
    this.text.setFontSize(fontSize);
  }

  /** Clean up the text object and keyboard listener. */
  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.text.destroy();
  }
}
