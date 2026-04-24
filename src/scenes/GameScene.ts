import Phaser from 'phaser';
import { InputSystem, LAYOUT } from '../systems/InputSystem';
import { ConveyorSystem, ConveyorItem } from '../systems/ConveyorSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { MachineSystem } from '../systems/MachineSystem';
import { SequenceInputUI } from '../ui/SequenceInputUI';
import { ActionLayer } from '../systems/ActionLayer';
import { TouchButtonUI } from '../ui/TouchButtonUI';
import { LayoutSystem } from '../systems/LayoutSystem';
import { GameManager } from '../systems/GameManager';
import { AutomationSystem } from '../systems/AutomationSystem';
import { TerminalUI } from '../ui/TerminalUI';
import { drawFloor } from '../rendering/FloorDrawing';
import { drawBelt } from '../rendering/BeltDrawing';
import { drawTerminal } from '../rendering/TerminalDrawing';
import { drawMachines } from '../rendering/MachineDrawing';
import { drawItems } from '../rendering/ItemDrawing';
import { PALETTE } from '../rendering/Palette';

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private playerGraphic!: Phaser.GameObjects.Graphics;
  private conveyorSystem!: ConveyorSystem;
  private itemSystem!: ItemSystem;
  private itemGraphics!: Phaser.GameObjects.Graphics;
  private gameManager!: GameManager;
  private scoreText!: Phaser.GameObjects.Text;
  private budgetText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private collidedItems: [ConveyorItem, ConveyorItem] | null = null;
  private blinkTimer: number = 0;
  private beltOffset: number = 0;

  private automationSystem!: AutomationSystem;
  private terminalUI!: TerminalUI;
  private terminalMode: boolean = false;
  private machineGraphics!: Phaser.GameObjects.Graphics;
  private machineSystem!: MachineSystem;
  private sequenceInputUI!: SequenceInputUI;
  private actionLayer!: ActionLayer;
  private touchButtonUI!: TouchButtonUI;
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private layoutGraphics!: Phaser.GameObjects.Graphics;
  private floorGraphics!: Phaser.GameObjects.Graphics;
  private beltGraphics!: Phaser.GameObjects.Graphics;
  private terminalGraphics!: Phaser.GameObjects.Graphics;
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

      // Reposition and resize budget text
      this.budgetText?.setPosition(
        this.layoutSystem.scaleX(LAYOUT.SCENE_W - 16),
        this.layoutSystem.scaleY(44),
      );
      this.budgetText?.setFontSize(this.layoutSystem.scaleFontSize(20));

      // Pass updated layout to UI components
      if (this.touchButtonUI) {
        this.touchButtonUI.resize(this.layoutSystem);
      }
    });

    // Create floor graphics at lowest depth, belt graphics slightly above
    this.floorGraphics = this.add.graphics();
    this.floorGraphics.setDepth(-2);
    this.beltGraphics = this.add.graphics();
    this.beltGraphics.setDepth(-1);
    this.terminalGraphics = this.add.graphics();
    this.terminalGraphics.setDepth(0);

    this.drawLayout();
    this.actionLayer = new ActionLayer(this);
    this.inputSystem = new InputSystem();
    this.conveyorSystem = new ConveyorSystem();
    this.itemSystem = new ItemSystem(this.conveyorSystem);
    this.itemGraphics = this.add.graphics();
    this.playerGraphic = this.add.graphics();
    this.machineGraphics = this.add.graphics();

    // Machine system and UI
    this.machineSystem = new MachineSystem(this.conveyorSystem);
    this.sequenceInputUI = new SequenceInputUI(this, this.layoutSystem);
    this.touchButtonUI = new TouchButtonUI(this, this.actionLayer, this.layoutSystem);

    // GameManager
    this.gameManager = new GameManager();

    // AutomationSystem
    this.automationSystem = new AutomationSystem();

    // TerminalUI
    this.terminalUI = new TerminalUI(this, this.layoutSystem, this.gameManager);

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

    // Budget text - below score, monospace green with "$" prefix
    this.budgetText = this.add.text(
      this.layoutSystem.scaleX(LAYOUT.SCENE_W - 16),
      this.layoutSystem.scaleY(44),
      '$0',
      {
        fontFamily: 'monospace',
        fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
        color: '#00ff00',
      },
    ).setOrigin(1, 0);

  }

  update(_time: number, delta: number): void {
    if (!this.gameOver) {
      this.machineSystem.resetAutoProcessingFlags();

      const { direction, interact } = this.actionLayer.consumeActions();

      const interactionActive = this.machineSystem.getActiveInteraction() !== null;

      // Input routing priority:
      // 1. Terminal mode → all input goes to TerminalUI
      // 2. Machine interaction active → directional input goes to MachineSystem
      // 3. Otherwise → directional input goes to InputSystem for movement, interact checks for terminal or machine interaction start

      if (this.terminalMode) {
        // Record budget before handling input to detect purchases
        const budgetBefore = this.gameManager.getBudget();
        const selectedMachineBefore = this.terminalUI.getSelectedMachineId();

        this.terminalUI.handleInput(direction, interact);

        // If budget decreased, a purchase was made — apply upgrades for the affected machine
        if (this.gameManager.getBudget() < budgetBefore && selectedMachineBefore) {
          const machines = this.machineSystem.getMachines();
          const targetMachine = machines.find(m => m.definition.id === selectedMachineBefore);
          if (targetMachine) {
            this.gameManager.applyUpgrades(selectedMachineBefore, targetMachine);
          }
        }

        // Check if terminal was closed
        if (!this.terminalUI.isActive()) {
          this.terminalMode = false;
        }
      } else if (interactionActive) {
        // Machine interaction is active — directional input goes to MachineSystem
        // (player movement is blocked, handled below in machine system update)
      } else {
        // Normal navigation mode
        // Check if player is at 'left' position and interact is pressed → enter terminal mode
        if (interact && this.inputSystem.getPlayerPosition() === 'left') {
          this.terminalMode = true;
          this.terminalUI.open();
        } else {
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
      }

      // Advance delivery progression (spawn interval, belt speed) before systems tick
      this.gameManager.update(delta);

      // Advance belt animation offset proportional to belt speed
      const segmentSpacing = 20; // base-resolution pixels per segment
      this.beltOffset += (this.gameManager.getBeltSpeed() / 1000) * (delta / 1000) * (1 / segmentSpacing);

      const result = this.itemSystem.update(delta, this.gameManager);

      for (const val of result.exitedValues) {
        this.gameManager.addPayout(val);
      }
      this.updateScoreDisplay();

      if (result.collision) {
        this.enterGameOver(result.collision.a, result.collision.b);
      }

      // Machine system update — skip when terminal mode is active
      if (!this.terminalMode) {
        const machineResult = this.machineSystem.update(
          this.itemSystem.getItems(),
          this.inputSystem.getPlayerPosition(),
          interact,
          direction,
          this.itemSystem.getItems(),
        );

        // Handle returned items: MachineSystem already spliced intaken items from the array,
        // so we just push returned items back
        for (const item of machineResult.itemsToReturn) {
          this.itemSystem.getItems().push(item);
        }

        // Attempt to release pending items from all machines
        const releasedItems = this.machineSystem.tryReleasePendingAll(this.itemSystem.getItems());
        for (const item of releasedItems) {
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
      }

      // Automation system update
      const autoProcessedItems = this.automationSystem.update(
        delta,
        this.machineSystem.getMachines(),
        this.gameManager,
        this.machineSystem,
        this.itemSystem.getItems(),
      );
      for (const item of autoProcessedItems) {
        this.itemSystem.getItems().push(item);
      }
    } else {
      this.blinkTimer += delta;
    }

    // Per-frame rendering (back-to-front): Belt → Terminal → Machines → Items → Player
    // Floor is static and only redrawn on resize in drawLayout()
    drawBelt({ graphics: this.beltGraphics, layoutSystem: this.layoutSystem, beltOffset: this.beltOffset, gameOver: this.gameOver });
    this.terminalGraphics.clear();
    drawTerminal({ graphics: this.terminalGraphics, layoutSystem: this.layoutSystem, playerPosition: this.inputSystem.getPlayerPosition() });
    this.renderMachines();
    this.renderItems();
    // Player rendering
    const { x, y } = this.inputSystem.getPlayerCoords();
    const playerSize = this.layoutSystem.scaleValue(40);
    this.playerGraphic.clear();
    this.playerGraphic.fillStyle(PALETTE.PLAYER, 1);
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

    const ls = this.layoutSystem;

    // Floor — walkable/non-walkable distinction (replaces old movementAreaGraphics)
    drawFloor({ graphics: this.floorGraphics, layoutSystem: ls });

    // Belt — static redraw on create/resize (animated per-frame in update via task 8.6)
    drawBelt({ graphics: this.beltGraphics, layoutSystem: ls, beltOffset: this.beltOffset, gameOver: this.gameOver });

    // Left — UpgradeTerminal (drawn via TerminalDrawing module)
    drawTerminal({ graphics: this.terminalGraphics, layoutSystem: ls, playerPosition: this.inputSystem?.getPlayerPosition() ?? 'center' });
  }

  private enterGameOver(a: ConveyorItem, b: ConveyorItem): void {
    this.gameOver = true;
    this.collidedItems = [a, b];
    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', { score: this.gameManager.getScore() });
    });
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(String(this.gameManager.getScore()).padStart(8, '0'));
    this.budgetText.setText('$' + this.gameManager.getBudget());
  }

  private renderMachines(): void {
    this.machineGraphics.clear();
    drawMachines({
      graphics: this.machineGraphics,
      layoutSystem: this.layoutSystem,
      machines: this.machineSystem.getMachines(),
      machineSystem: this.machineSystem,
    });
  }

  private renderItems(): void {
    this.itemGraphics.clear();
    drawItems({
      graphics: this.itemGraphics,
      layoutSystem: this.layoutSystem,
      items: this.itemSystem.getItems(),
      gameOver: this.gameOver,
      collidedItems: this.collidedItems,
      blinkTimer: this.blinkTimer,
    });
  }
}
