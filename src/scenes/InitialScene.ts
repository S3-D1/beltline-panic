import Phaser from 'phaser';

export class InitialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InitialScene' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy, 'Beltline Panic', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 60, '© s3-d1', {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }
}
