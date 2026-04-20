import Phaser from 'phaser';
import { LayoutSystem } from '../systems/LayoutSystem';

export class StartScene extends Phaser.Scene {
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.layoutSystem.update(this.scale.width, this.scale.height);

    this.titleText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(260),
      'Beltline Panic',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(48)}px`,
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    this.promptText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(340),
      'Press any key or tap to start',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
        color: '#aaaaaa',
      }
    ).setOrigin(0.5);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layoutSystem.update(gameSize.width, gameSize.height);

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
