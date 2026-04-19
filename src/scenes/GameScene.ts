import Phaser from 'phaser';
import { InputSystem, LAYOUT } from '../systems/InputSystem';
import { ConveyorSystem } from '../systems/ConveyorSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { ITEM_COLORS, INLET_START, INLET_END, ITEM_SIZE } from '../data/ConveyorConfig';

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private playerGraphic!: Phaser.GameObjects.Graphics;
  private conveyorSystem!: ConveyorSystem;
  private itemSystem!: ItemSystem;
  private itemGraphics!: Phaser.GameObjects.Graphics;

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
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update();
    this.itemSystem.update(delta);
    this.renderItems();
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

  private renderItems(): void {
    this.itemGraphics.clear();
    const items = this.itemSystem.getItems();
    for (const item of items) {
      this.itemGraphics.fillStyle(ITEM_COLORS[item.state], 1);
      this.itemGraphics.fillRect(
        item.x - ITEM_SIZE / 2,
        item.y - ITEM_SIZE / 2,
        ITEM_SIZE,
        ITEM_SIZE,
      );
    }
  }
}
