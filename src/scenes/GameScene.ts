import Phaser from 'phaser';
import { InputSystem, LAYOUT } from '../systems/InputSystem';
import { ConveyorSystem, ConveyorItem } from '../systems/ConveyorSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { ITEM_COLORS, INLET_START, INLET_END, OUTLET_START, OUTLET_END, ITEM_SIZE } from '../data/ConveyorConfig';
import { MachineSystem } from '../systems/MachineSystem';
import { SequenceInputUI } from '../ui/SequenceInputUI';
import { ActionLayer } from '../systems/ActionLayer';
import { TouchButtonUI } from '../ui/TouchButtonUI';
import { LayoutSystem } from '../systems/LayoutSystem';

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
  private actionLayer!: ActionLayer;
  private touchButtonUI!: TouchButtonUI;
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private layoutGraphics!: Phaser.GameObjects.Graphics;
  private movementAreaGraphics!: Phaser.GameObjects.Graphics;
  private prevInteractionState: 'idle' | 'active' | 'success' | 'failed' | 'cancelled' = 'idle';

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.layoutSystem.update(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layoutSystem.update(gameSize.width, gameSize.height);

      // Redraw static layout graphics
      this.drawLayout();

      // Reposition and resize score text
      this.scoreText?.setPosition(
        this.layoutSystem.scaleX(LAYOUT.SCENE_W - 16),
        this.layoutSystem.scaleY(16),
      );
      this.scoreText?.setFontSize(this.layoutSystem.scaleFontSize(24));

      // Reposition and resize game over text
      this.gameOverText?.setPosition(
        this.layoutSystem.scaleX(LAYOUT.CENTER_X),
        this.layoutSystem.scaleY(LAYOUT.CENTER_Y),
      );
      this.gameOverText?.setFontSize(this.layoutSystem.scaleFontSize(48));

      // Pass updated layout to UI components
      if (this.touchButtonUI) {
        this.touchButtonUI.resize(this.layoutSystem);
      }
    });

    this.drawLayout();
    this.actionLayer = new ActionLayer(this);
    this.inputSystem = new InputSystem();
    this.conveyorSystem = new ConveyorSystem();
    this.itemSystem = new ItemSystem(this.conveyorSystem);
    this.itemGraphics = this.add.graphics();
    this.playerGraphic = this.add.graphics();
    this.machineGraphics = this.add.graphics();

    // Machine system and UI
    this.machineSystem = new MachineSystem();
    this.sequenceInputUI = new SequenceInputUI(this, this.layoutSystem);
    this.touchButtonUI = new TouchButtonUI(this, this.actionLayer, this.layoutSystem);

    // Score text - top-right corner, monospace white
    this.scoreText = this.add.text(
      this.layoutSystem.scaleX(LAYOUT.SCENE_W - 16),
      this.layoutSystem.scaleY(16),
      '00000000',
      {
        fontFamily: 'monospace',
        fontSize: `${this.layoutSystem.scaleFontSize(24)}px`,
        color: '#ffffff',
      },
    ).setOrigin(1, 0);

    // Game over text - centered, hidden initially
    this.gameOverText = this.add.text(
      this.layoutSystem.scaleX(LAYOUT.CENTER_X),
      this.layoutSystem.scaleY(LAYOUT.CENTER_Y),
      'Game Over',
      {
        fontFamily: 'monospace',
        fontSize: `${this.layoutSystem.scaleFontSize(48)}px`,
        color: '#ff0000',
      },
    ).setOrigin(0.5, 0.5).setVisible(false);
  }

  update(_time: number, delta: number): void {
    if (!this.gameOver) {
      const { direction, interact } = this.actionLayer.consumeActions();

      const interactionActive = this.machineSystem.getActiveInteraction() !== null;

      // Skip player movement when machine interaction is active (input routing)
      if (!interactionActive) {
        const prevPos = this.inputSystem.getPlayerPosition();
        this.inputSystem.update(direction);
        const newPos = this.inputSystem.getPlayerPosition();

        // Movement feedback
        if (direction) {
          if (newPos !== prevPos) {
            this.touchButtonUI.triggerFeedback(direction, 'positive');
          } else {
            this.touchButtonUI.triggerFeedback(direction, 'negative');
          }
        }
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
      const machineResult = this.machineSystem.update(
        this.itemSystem.getItems(),
        this.inputSystem.getPlayerPosition(),
        interact,
        direction,
      );

      // Handle returned items: MachineSystem already spliced intaken items from the array,
      // so we just push returned items back
      for (const item of machineResult.itemsToReturn) {
        this.itemSystem.getItems().push(item);
      }

      // Machine interaction feedback
      if (interactionActive && direction) {
        if (machineResult.interactionState === 'active') {
          this.touchButtonUI.triggerFeedback(direction, 'positive');
        } else if (machineResult.interactionState === 'failed') {
          this.touchButtonUI.triggerFeedback(direction, 'negative');
        }
      }
      if (interact) {
        if (machineResult.interactionState === 'active' && this.prevInteractionState !== 'active') {
          this.touchButtonUI.triggerFeedback('interact', 'positive');
        } else if (machineResult.interactionState === 'idle' && !interactionActive) {
          this.touchButtonUI.triggerFeedback('interact', 'negative');
        }
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
    const playerSize = this.layoutSystem.scaleValue(40);
    this.playerGraphic.clear();
    this.playerGraphic.fillStyle(0xff0000, 1);
    this.playerGraphic.fillRect(
      this.layoutSystem.scaleX(x) - playerSize / 2,
      this.layoutSystem.scaleY(y) - playerSize / 2,
      playerSize,
      playerSize,
    );
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
    // Clear previous layout graphics so we can redraw on resize
    if (this.layoutGraphics) {
      this.layoutGraphics.clear();
    } else {
      this.layoutGraphics = this.add.graphics();
    }
    if (this.movementAreaGraphics) {
      this.movementAreaGraphics.clear();
    } else {
      this.movementAreaGraphics = this.add.graphics();
    }

    const g = this.layoutGraphics;
    const ls = this.layoutSystem;

    // ConveyorBelt — dark unfilled rectangular loop
    g.lineStyle(ls.scaleValue(LAYOUT.BELT_THICKNESS), 0x333333, 1);
    g.strokeRect(
      ls.scaleX(LAYOUT.BELT_X),
      ls.scaleY(LAYOUT.BELT_Y),
      ls.scaleValue(LAYOUT.BELT_W),
      ls.scaleValue(LAYOUT.BELT_H),
    );

    // Inlet line — horizontal segment feeding into the belt loop
    g.lineStyle(ls.scaleValue(LAYOUT.BELT_THICKNESS), 0x333333, 1);
    g.lineBetween(
      ls.scaleX(INLET_START.x), ls.scaleY(INLET_START.y),
      ls.scaleX(INLET_END.x), ls.scaleY(INLET_END.y),
    );

    // Outlet line — horizontal segment leaving the belt loop
    g.lineStyle(ls.scaleValue(LAYOUT.BELT_THICKNESS), 0x333333, 1);
    g.lineBetween(
      ls.scaleX(OUTLET_START.x), ls.scaleY(OUTLET_START.y),
      ls.scaleX(OUTLET_END.x), ls.scaleY(OUTLET_END.y),
    );

    // Left — UpgradeTerminal (static, not a machine)
    g.fillStyle(0x4488ff, 1);
    g.fillRect(
      ls.scaleX(LAYOUT.BELT_X - LAYOUT.STATION_H),
      ls.scaleY(LAYOUT.CENTER_Y - LAYOUT.STATION_H / 2),
      ls.scaleValue(LAYOUT.STATION_H),
      ls.scaleValue(LAYOUT.STATION_W),
    );

    // MovementArea — lightly tinted cross
    const ma = this.movementAreaGraphics;
    ma.fillStyle(0xffffff, 0.08);
    const ns = ls.scaleValue(LAYOUT.NODE_SIZE);
    const off = ls.scaleValue(LAYOUT.NODE_OFFSET);
    const cx = ls.scaleX(LAYOUT.CENTER_X);
    const cy = ls.scaleY(LAYOUT.CENTER_Y);
    // Center node
    ma.fillRect(cx - ns / 2, cy - ns / 2, ns, ns);
    // Up node
    ma.fillRect(cx - ns / 2, cy - off - ns / 2, ns, ns);
    // Down node
    ma.fillRect(cx - ns / 2, cy + off - ns / 2, ns, ns);
    // Left node
    ma.fillRect(cx - off - ns / 2, cy - ns / 2, ns, ns);
    // Right node
    ma.fillRect(cx + off - ns / 2, cy - ns / 2, ns, ns);
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
    const ls = this.layoutSystem;

    for (const machine of machines) {
      const color = machine.activeInteraction !== null ? 0xffcc00 : 0x4488ff;
      this.machineGraphics.fillStyle(color, 1);

      switch (machine.definition.playerPosition) {
        case 'up': // Machine 1 — top
          this.machineGraphics.fillRect(
            ls.scaleX(LAYOUT.CENTER_X - LAYOUT.STATION_W / 2),
            ls.scaleY(LAYOUT.BELT_Y - LAYOUT.STATION_H),
            ls.scaleValue(LAYOUT.STATION_W),
            ls.scaleValue(LAYOUT.STATION_H),
          );
          break;
        case 'right': // Machine 2 — right
          this.machineGraphics.fillRect(
            ls.scaleX(LAYOUT.BELT_X + LAYOUT.BELT_W),
            ls.scaleY(LAYOUT.CENTER_Y - LAYOUT.STATION_H / 2),
            ls.scaleValue(LAYOUT.STATION_H),
            ls.scaleValue(LAYOUT.STATION_W),
          );
          break;
        case 'down': // Machine 3 — bottom
          this.machineGraphics.fillRect(
            ls.scaleX(LAYOUT.CENTER_X - LAYOUT.STATION_W / 2),
            ls.scaleY(LAYOUT.BELT_Y + LAYOUT.BELT_H),
            ls.scaleValue(LAYOUT.STATION_W),
            ls.scaleValue(LAYOUT.STATION_H),
          );
          break;
      }
    }
  }

  private renderItems(): void {
    this.itemGraphics.clear();
    const items = this.itemSystem.getItems();
    const scaledItemSize = this.layoutSystem.scaleValue(ITEM_SIZE);
    for (const item of items) {
      let color = ITEM_COLORS[item.state];
      if (this.gameOver && this.collidedItems) {
        if (item === this.collidedItems[0] || item === this.collidedItems[1]) {
          color = Math.floor(this.blinkTimer / 300) % 2 === 0 ? 0xff0000 : ITEM_COLORS[item.state];
        }
      }
      this.itemGraphics.fillStyle(color, 1);
      this.itemGraphics.fillRect(
        this.layoutSystem.scaleX(item.x) - scaledItemSize / 2,
        this.layoutSystem.scaleY(item.y) - scaledItemSize / 2,
        scaledItemSize,
        scaledItemSize,
      );
    }
  }
}
