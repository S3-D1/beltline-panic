import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.add.text(400, 260, 'Beltline Panic', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(400, 340, 'Press any key to start', {
      fontSize: '20px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown', () => {
      this.scene.start('GameScene');
    });
  }
}
