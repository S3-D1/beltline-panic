import Phaser from 'phaser';
import { InputSystem, LAYOUT } from '../systems/InputSystem';
import { ConveyorSystem, ConveyorItem } from '../systems/ConveyorSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { ITEM_COLORS, INLET_START, INLET_END, OUTLET_START, OUTLET_END, ITEM_SIZE } from '../data/ConveyorConfig';

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private playerGraphic!: Phaser.GameObjects.Graphics;
  private conveyorSystem!: ConveyorSystem;
  private itemSystem!: ItemSystem;
  private itemGraphics!: Phaser.GameObjects.Graphics;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private gameOverText!: Phaser.GameObjects.Text;
  private collidedItems: [ConveyorItem, ConveyorItem] | null = null;
  private blinkTimer: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.drawLayout();
    this.inputSystem = new InputSystem(this);
    this.conveyorSystem = new ConveyorSystem();
    this.itemSystem = new ItemSystem(this.conveyorSystem);
    this.itemGraphics = this.add.graphics();
    this.playerGraphic = this.add.graphics();

    // Score text - top-right corner, monospace white
    this.scoreText = this.add.text(this.scale.width - 16, 16, '00000000', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(1, 0);

    // Game over text - centered, hidden initially
    this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Game Over', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ff0000',
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  update(_time: number, delta: number): void {
    if (!this.gameOver) {
      this.inputSystem.update();
      const result = this.itemSystem.update(delta);

      for (const val of result.exitedValues) {
        this.score += val;
      }
      this.updateScoreDisplay();

      if (result.collision) {
        this.enterGameOver(result.collision.a, result.collision.b);
      }
    } else {
      this.blinkTimer += delta;
    }

    this.renderItems();
    // Player rendering
    const { x, y } = this.inputSystem.getPlayerCoords();
    this.playerGraphic.clear();
    this.playerGraphic.fillStyle(0xff0000, 1);
    this.playerGraphic.fillRect(x - 20, y - 20, 40, 40);
  }

  private drawLayout(): void {
    const g = this.add.graphics();

    // ConveyorBelt — dark unfilled rectangular loop
    g.lineStyle(LAYOUT.BELT_THICKNESS, 0x333333, 1);
    g.strokeRect(LAYOUT.BELT_X, LAYOUT.BELT_Y, LAYOUT.BELT_W, LAYOUT.BELT_H);

    // Inlet line — horizontal segment feeding into the belt loop
    g.lineStyle(LAYOUT.BELT_THICKNESS, 0x333333, 1);
    g.lineBetween(INLET_START.x, INLET_START.y, INLET_END.x, INLET_END.y);

    // Outlet line — horizontal segment leaving the belt loop
    g.lineStyle(LAYOUT.BELT_THICKNESS, 0x333333, 1);
    g.lineBetween(OUTLET_START.x, OUTLET_START.y, OUTLET_END.x, OUTLET_END.y);

    // Station blocks (blue) — top, right, bottom, left
    g.fillStyle(0x4488ff, 1);
    // Top — Machine 1
    g.fillRect(
      LAYOUT.CENTER_X - LAYOUT.STATION_W / 2,
      LAYOUT.BELT_Y - LAYOUT.STATION_H,
      LAYOUT.STATION_W,
      LAYOUT.STATION_H,
    );
    // Right — Machine 2
    g.fillRect(
      LAYOUT.BELT_X + LAYOUT.BELT_W,
      LAYOUT.CENTER_Y - LAYOUT.STATION_H / 2,
      LAYOUT.STATION_H,
      LAYOUT.STATION_W,
    );
    // Bottom — Machine 3
    g.fillRect(
      LAYOUT.CENTER_X - LAYOUT.STATION_W / 2,
      LAYOUT.BELT_Y + LAYOUT.BELT_H,
      LAYOUT.STATION_W,
      LAYOUT.STATION_H,
    );
    // Left — UpgradeTerminal
    g.fillRect(
      LAYOUT.BELT_X - LAYOUT.STATION_H,
      LAYOUT.CENTER_Y - LAYOUT.STATION_H / 2,
      LAYOUT.STATION_H,
      LAYOUT.STATION_W,
    );

    // MovementArea — lightly tinted cross
    const ma = this.add.graphics();
    ma.fillStyle(0xffffff, 0.08);
    const ns = LAYOUT.NODE_SIZE;
    const off = LAYOUT.NODE_OFFSET;
    // Center node
    ma.fillRect(LAYOUT.CENTER_X - ns / 2, LAYOUT.CENTER_Y - ns / 2, ns, ns);
    // Up node
    ma.fillRect(LAYOUT.CENTER_X - ns / 2, LAYOUT.CENTER_Y - off - ns / 2, ns, ns);
    // Down node
    ma.fillRect(LAYOUT.CENTER_X - ns / 2, LAYOUT.CENTER_Y + off - ns / 2, ns, ns);
    // Left node
    ma.fillRect(LAYOUT.CENTER_X - off - ns / 2, LAYOUT.CENTER_Y - ns / 2, ns, ns);
    // Right node
    ma.fillRect(LAYOUT.CENTER_X + off - ns / 2, LAYOUT.CENTER_Y - ns / 2, ns, ns);
  }

  private enterGameOver(a: ConveyorItem, b: ConveyorItem): void {
    this.gameOver = true;
    this.collidedItems = [a, b];
    this.gameOverText.setVisible(true);
    this.scoreText.setColor('#ff0000');
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(String(this.score).padStart(8, '0'));
  }

  private renderItems(): void {
    this.itemGraphics.clear();
    const items = this.itemSystem.getItems();
    for (const item of items) {
      let color = ITEM_COLORS[item.state];
      if (this.gameOver && this.collidedItems) {
        if (item === this.collidedItems[0] || item === this.collidedItems[1]) {
          color = Math.floor(this.blinkTimer / 300) % 2 === 0 ? 0xff0000 : ITEM_COLORS[item.state];
        }
      }
      this.itemGraphics.fillStyle(color, 1);
      this.itemGraphics.fillRect(
        item.x - ITEM_SIZE / 2,
        item.y - ITEM_SIZE / 2,
        ITEM_SIZE,
        ITEM_SIZE,
      );
    }
  }
}
