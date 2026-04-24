import Phaser from 'phaser';
import { LayoutSystem } from '../systems/LayoutSystem';
import { drawStartBackground } from '../rendering/StartDrawing';

export class StartScene extends Phaser.Scene {
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.layoutSystem.update(this.scale.width, this.scale.height);

    // Background graphics at lowest depth
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);
    drawStartBackground({ graphics: this.bgGraphics, layoutSystem: this.layoutSystem });

    // Title text above background
    this.titleText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(260),
      'Beltline Panic',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(48)}px`,
        fontFamily: 'monospace',
        color: '#ffffff',
      }
    ).setOrigin(0.5).setDepth(1);

    // Prompt text above background
    this.promptText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(340),
      'Press any key or tap to start',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
        color: '#aaaaaa',
      }
    ).setOrigin(0.5).setDepth(1);

    // Handle resize: redraw background and reposition text
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layoutSystem.update(gameSize.width, gameSize.height);

      drawStartBackground({ graphics: this.bgGraphics, layoutSystem: this.layoutSystem });

      this.titleText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(260)
      );
      this.titleText.setFontSize(this.layoutSystem.scaleFontSize(48));

      this.promptText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(340)
      );
      this.promptText.setFontSize(this.layoutSystem.scaleFontSize(20));
    });

    this.input.keyboard!.once('keydown', () => {
      this.scene.start('GameScene');
    });

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
