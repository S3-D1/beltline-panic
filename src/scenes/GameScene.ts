import Phaser from 'phaser';
import { InputSystem, LAYOUT } from '../systems/InputSystem';
import { ConveyorSystem, ConveyorItem } from '../systems/ConveyorSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { ITEM_COLORS, INLET_START, INLET_END, OUTLET_START, OUTLET_END, ITEM_SIZE } from '../data/ConveyorConfig';
import { MachineSystem } from '../systems/MachineSystem';
import { SequenceInputUI } from '../ui/SequenceInputUI';
import { Direction } from '../data/MachineConfig';

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

  private machineGraphics!: Phaser.GameObjects.Graphics;
  private machineSystem!: MachineSystem;
  private sequenceInputUI!: SequenceInputUI;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private dirKeyUp!: Phaser.Input.Keyboard.Key;
  private dirKeyDown!: Phaser.Input.Keyboard.Key;
  private dirKeyLeft!: Phaser.Input.Keyboard.Key;
  private dirKeyRight!: Phaser.Input.Keyboard.Key;
  private dirKeyW!: Phaser.Input.Keyboard.Key;
  private dirKeyS!: Phaser.Input.Keyboard.Key;
  private dirKeyA!: Phaser.Input.Keyboard.Key;
  private dirKeyD!: Phaser.Input.Keyboard.Key;
  private prevInteractionState: 'idle' | 'active' | 'success' | 'failed' | 'cancelled' = 'idle';

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
    this.machineGraphics = this.add.graphics();

    // Machine system and UI
    this.machineSystem = new MachineSystem();
    this.sequenceInputUI = new SequenceInputUI(this);

    // Interact key (Space)
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Direction keys for machine interaction (separate from InputSystem's private keys)
    const kb = this.input.keyboard!;
    this.dirKeyUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.dirKeyDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.dirKeyLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.dirKeyRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.dirKeyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.dirKeyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dirKeyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.dirKeyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

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
      const interactionActive = this.machineSystem.getActiveInteraction() !== null;

      // Skip player movement when machine interaction is active (input routing)
      if (!interactionActive) {
        this.inputSystem.update();
      }

      const result = this.itemSystem.update(delta);

      for (const val of result.exitedValues) {
        this.score += val;
      }
      this.updateScoreDisplay();

      if (result.collision) {
        this.enterGameOver(result.collision.a, result.collision.b);
      }

      // Machine system update
      const playerPos = this.inputSystem.getPlayerPosition();
      const interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
      const direction = this.getDirectionJustPressed();
      const machineResult = this.machineSystem.update(
        this.itemSystem.getItems(),
        playerPos,
        interactPressed,
        direction,
      );

      // Handle returned items: MachineSystem already spliced intaken items from the array,
      // so we just push returned items back
      for (const item of machineResult.itemsToReturn) {
        this.itemSystem.getItems().push(item);
      }

      // Update SequenceInputUI based on interaction state changes
      this.updateSequenceUI(machineResult.interactionState);
    } else {
      this.blinkTimer += delta;
    }

    this.renderMachines();
    this.renderItems();
    // Player rendering
    const { x, y } = this.inputSystem.getPlayerCoords();
    this.playerGraphic.clear();
    this.playerGraphic.fillStyle(0xff0000, 1);
    this.playerGraphic.fillRect(x - 20, y - 20, 40, 40);
  }

  private getDirectionJustPressed(): Direction | null {
    if (Phaser.Input.Keyboard.JustDown(this.dirKeyUp) || Phaser.Input.Keyboard.JustDown(this.dirKeyW)) return 'up';
    if (Phaser.Input.Keyboard.JustDown(this.dirKeyDown) || Phaser.Input.Keyboard.JustDown(this.dirKeyS)) return 'down';
    if (Phaser.Input.Keyboard.JustDown(this.dirKeyLeft) || Phaser.Input.Keyboard.JustDown(this.dirKeyA)) return 'left';
    if (Phaser.Input.Keyboard.JustDown(this.dirKeyRight) || Phaser.Input.Keyboard.JustDown(this.dirKeyD)) return 'right';
    return null;
  }

  private updateSequenceUI(interactionState: 'idle' | 'active' | 'success' | 'failed' | 'cancelled'): void {
    const interaction = this.machineSystem.getActiveInteraction();

    // Interaction just started — show UI
    if (interactionState === 'active' && this.prevInteractionState !== 'active') {
      if (interaction) {
        this.sequenceInputUI.show(interaction.sequence, interaction.machineId);
      }
    }

    // Interaction is active — highlight current step progress
    if (interactionState === 'active' && interaction && interaction.currentStep > 0) {
      this.sequenceInputUI.highlightStep(interaction.currentStep - 1);
    }

    // Interaction ended with a result
    if (interactionState === 'success') {
      this.sequenceInputUI.showResult('success');
    } else if (interactionState === 'failed') {
      this.sequenceInputUI.showResult('failed');
    } else if (interactionState === 'cancelled') {
      this.sequenceInputUI.showResult('cancelled');
    }

    this.prevInteractionState = interactionState;
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

    // Left — UpgradeTerminal (static, not a machine)
    g.fillStyle(0x4488ff, 1);
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

  private renderMachines(): void {
    this.machineGraphics.clear();
    const machines = this.machineSystem.getMachines();

    for (const machine of machines) {
      const color = machine.activeInteraction !== null ? 0xffcc00 : 0x4488ff;
      this.machineGraphics.fillStyle(color, 1);

      switch (machine.definition.playerPosition) {
        case 'up': // Machine 1 — top
          this.machineGraphics.fillRect(
            LAYOUT.CENTER_X - LAYOUT.STATION_W / 2,
            LAYOUT.BELT_Y - LAYOUT.STATION_H,
            LAYOUT.STATION_W,
            LAYOUT.STATION_H,
          );
          break;
        case 'right': // Machine 2 — right
          this.machineGraphics.fillRect(
            LAYOUT.BELT_X + LAYOUT.BELT_W,
            LAYOUT.CENTER_Y - LAYOUT.STATION_H / 2,
            LAYOUT.STATION_H,
            LAYOUT.STATION_W,
          );
          break;
        case 'down': // Machine 3 — bottom
          this.machineGraphics.fillRect(
            LAYOUT.CENTER_X - LAYOUT.STATION_W / 2,
            LAYOUT.BELT_Y + LAYOUT.BELT_H,
            LAYOUT.STATION_W,
            LAYOUT.STATION_H,
          );
          break;
      }
    }
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
