import Phaser from 'phaser';
import { InputSystem, LAYOUT, PlayerPosition } from '../systems/InputSystem';
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
import { AudioManager } from '../systems/AudioManager';
import { FeedbackManager } from '../systems/FeedbackManager';
import { MuteButtonUI } from '../ui/MuteButtonUI';
import { drawFloor } from '../rendering/FloorDrawing';
import { PATH_SEGMENTS, BELT_WIDTH } from '../rendering/BeltDrawing';
import { ASSET_KEYS, ITEM_STATE_ASSET } from '../data/AssetKeys';

import { MACHINE_DEFINITIONS } from '../data/MachineConfig';
import { ITEM_SIZE } from '../data/ConveyorConfig';
import { DELIVERY_CONFIG } from '../data/DeliveryConfig';
import { UPGRADE_DIRECTION_MAP } from '../data/UpgradeConfig';

interface BeltSegmentSprite {
  tileSprite: Phaser.GameObjects.TileSprite;
  baseX: number;      // center X in base resolution
  baseY: number;      // center Y in base resolution
  baseWidth: number;   // segment length in base resolution
  baseHeight: number;  // belt width in base resolution
  rotation: number;    // radians
  isVertical: boolean;
}

interface ItemSpriteEntry {
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
}

interface MachineSpriteState {
  sprite: Phaser.GameObjects.Sprite;
  machineId: string;
  baseX: number;
  baseY: number;
  baseWidth: number;
  baseHeight: number;
  rotation: number; // radians — orientation to face the belt
}

const INITIAL_ITEM_POOL_SIZE = 10;

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private workerSprite!: Phaser.GameObjects.Sprite;
  private conveyorSystem!: ConveyorSystem;
  private itemSystem!: ItemSystem;
  private itemSpritePool: ItemSpriteEntry[] = [];
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
  private machineSprites: MachineSpriteState[] = [];
  private machineSystem!: MachineSystem;
  private sequenceInputUI!: SequenceInputUI;
  private actionLayer!: ActionLayer;
  private touchButtonUI!: TouchButtonUI;
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private layoutGraphics!: Phaser.GameObjects.Graphics;
  private floorGraphics!: Phaser.GameObjects.Graphics;
  private beltSegmentSprites: BeltSegmentSprite[] = [];
  private terminalSprite!: Phaser.GameObjects.Sprite;
  private prevInteractionState: 'idle' | 'active' | 'success' | 'failed' | 'cancelled' = 'idle';
  private audioManager!: AudioManager;
  private feedbackManager!: FeedbackManager;
  private muteButton!: MuteButtonUI;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset runtime state — field initializers only run in the constructor,
    // but scene.start() re-invokes create() without re-constructing.
    this.gameOver = false;
    this.collidedItems = null;
    this.blinkTimer = 0;
    this.beltOffset = 0;
    this.terminalMode = false;
    this.prevInteractionState = 'idle';

    this.layoutSystem.update(this.scale.width, this.scale.height);

    // Remove previous resize listener to avoid stacking on restart
    this.scale.off('resize');
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
      if (this.muteButton) {
        this.muteButton.resize(this.layoutSystem);
      }

      // Reposition and rescale belt TileSprites
      this.resizeBeltTileSprites();

      // Reposition and rescale terminal sprite
      this.resizeTerminalSprite();

      // Reposition and rescale machine sprites
      this.resizeMachineSprites();

      // Reposition FeedbackManager UI elements (Task 12.6)
      if (this.feedbackManager) {
        this.feedbackManager.handleResize();
      }
    });

    // Create floor graphics at lowest depth
    this.floorGraphics = this.add.graphics();
    this.floorGraphics.setDepth(-2);

    // Create belt TileSprites for each path segment
    this.createBeltTileSprites();

    // Create terminal sprite (left side of belt, vertically centered)
    this.createTerminalSprite();

    this.drawLayout();
    this.actionLayer = new ActionLayer(this);
    this.inputSystem = new InputSystem();
    this.conveyorSystem = new ConveyorSystem();
    this.itemSystem = new ItemSystem(this.conveyorSystem);
    this.createItemSpritePool();
    this.createWorkerSprite();
    this.createMachineSprites();

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

    // Audio: get AudioManager and play gameplay music
    this.audioManager = this.game.audioManager as AudioManager;
    this.audioManager.playGameplayMusic();

    // Mute button UI (bottom-right corner) — handles both click and M key
    if (this.muteButton) {
      this.muteButton.destroy();
    }
    this.muteButton = new MuteButtonUI(this, this.layoutSystem);

    // FeedbackManager — centralized feedback system (Task 12.1)
    this.feedbackManager = new FeedbackManager(
      this,
      this.layoutSystem,
      this.gameManager,
      this.audioManager,
    );
    this.feedbackManager.init(this.budgetText, this.scoreText);

    // Pass machine sprite references to FeedbackManager (mapped to MachineSpriteDef format)
    this.feedbackManager.setMachineSprites(
      this.machineSprites.map(ms => ({
        sprite: ms.sprite,
        machineId: ms.machineId,
        baseX: ms.baseX,
        baseY: ms.baseY,
      })),
    );

    // Pass item sprite pool references to FeedbackManager (Task 12.5)
    this.feedbackManager.setItemSpritePool(this.itemSpritePool);

    // Wire TerminalUI to FeedbackManager (Task 12.1)
    this.terminalUI.setFeedbackManager(this.feedbackManager);
    this.terminalUI.setTerminalSprite(this.terminalSprite);

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
        const phaseBefore = this.terminalUI.getPhase();

        this.terminalUI.handleInput(direction, interact);

        // If budget decreased, a purchase was made — apply upgrades for the affected machine
        if (this.gameManager.getBudget() < budgetBefore && selectedMachineBefore) {
          const machines = this.machineSystem.getMachines();
          const targetMachine = machines.find(m => m.definition.id === selectedMachineBefore);
          if (targetMachine) {
            this.gameManager.applyUpgrades(selectedMachineBefore, targetMachine);
          }
        }

        // Detect insufficient budget: direction was pressed in upgrade-select phase,
        // budget didn't change, and the upgrade is not at max level (Task 12.4, Req 5.5, 5.6)
        if (
          direction &&
          phaseBefore === 'upgrade-select' &&
          selectedMachineBefore &&
          this.gameManager.getBudget() === budgetBefore
        ) {
          // Check if the attempted upgrade type is not at max (if it's at max, TerminalUI already handles it)
          const upgradeType = UPGRADE_DIRECTION_MAP[direction];
          if (upgradeType && !this.gameManager.isMaxLevel(selectedMachineBefore, upgradeType)) {
            const cost = this.gameManager.getUpgradeCost(selectedMachineBefore, upgradeType);
            if (this.gameManager.getBudget() < cost) {
              this.feedbackManager.notifyInsufficientBudget(cost);
            }
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
      const beltSpeed = DELIVERY_CONFIG.initialBeltSpeed * this.gameManager.getBeltSpeedFactor();
      const pixelsPerMs = beltSpeed / 1000;
      const distanceThisFrame = pixelsPerMs * delta;
      this.beltOffset += distanceThisFrame;

      const result = this.itemSystem.update(delta, this.gameManager, beltSpeed);

      for (const val of result.exitedValues) {
        const multipliedVal = Math.round(val * this.gameManager.getIncomeMultiplier());
        this.gameManager.addPayout(multipliedVal);
        this.audioManager.playScore();
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

        // SFX triggers — detect state transitions before updateSequenceUI overwrites prevInteractionState
        if (this.prevInteractionState !== 'success' && machineResult.interactionState === 'success') {
          this.audioManager.playMachineUse();
        }
        if (this.prevInteractionState !== 'failed' && machineResult.interactionState === 'failed') {
          this.audioManager.playError();

          // Notify FeedbackManager about wrong input for hint display (Task 12.3)
          const machines = this.machineSystem.getMachines();
          const playerPos = this.inputSystem.getPlayerPosition();
          const machineIdx = machines.findIndex(m => m.definition.playerPosition === playerPos);
          if (machineIdx >= 0) {
            this.feedbackManager.setWrongInput(machineIdx, true);
            this.feedbackManager.showWrongItemFeedback(machineIdx);
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

      // Automation feedback: "Auto" floating text + warning sound on full machines (Task 13.1, Req 7.6, 8.5)
      const machines = this.machineSystem.getMachines();
      for (let mi = 0; mi < machines.length; mi++) {
        const machine = machines[mi];
        if (machine.autoProcessing) {
          // Show "Auto" floating text in cyan near the machine (Req 7.6)
          this.feedbackManager.showAutomationFloatingText(mi);

          // Play warning sound when automation triggers on a full machine (Req 8.5)
          if (machine.heldItems.length >= machine.capacity) {
            this.audioManager.playWarning();
          }
        }
      }

      // Update gameplay music speed based on current belt speed
      this.audioManager.updateGameplayMusicSpeed(
        beltSpeed,
        DELIVERY_CONFIG.initialBeltSpeed,
        DELIVERY_CONFIG.maxBeltSpeed,
      );

      // FeedbackManager per-frame updates (Task 12.2)
      this.feedbackManager.update(delta);
      this.feedbackManager.renderStatusLights(this.machineSystem.getMachines());
      this.feedbackManager.renderInteractionHints(
        this.machineSystem.getMachines(),
        this.inputSystem.getPlayerPosition(),
        this.terminalMode,
        delta,
      );
      this.feedbackManager.trackMachineTransitions(this.machineSystem.getMachines());
      this.feedbackManager.trackItemTransitions(this.itemSystem.getItems());
    } else {
      this.blinkTimer += delta;
    }

    // Per-frame rendering (back-to-front): Belt → Terminal → Machines → Items → Player
    // Floor is static and only redrawn on resize in drawLayout()
    // Belt TileSprites are static (no scrolling animation). beltOffset is still
    // tracked above for item movement calculations, but the visual tiles don't scroll.

    // Terminal sprite — swap texture based on player position
    this.updateTerminalSprite();
    this.updateMachineSprites();
    this.syncItemSprites();
    // Worker sprite rendering — update texture, flip, position, and scale
    this.updateWorkerSprite();

    // Sync mute button label with actual mute state
    this.muteButton.update();
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

  /**
   * Creates belt TileSprite instances for each path segment (inlet, loop edges, outlet).
   * Each TileSprite is sized to the segment's drawable length × belt width,
   * rotated to match the segment direction, and positioned at the segment center.
   *
   * No setCrop() is needed: the belt PNG (1536×1024, RGB, no alpha channel) is
   * fully opaque — there is no transparent padding to clip. The TileSprite
   * dimensions (baseWidth × BELT_WIDTH) already constrain the visible region
   * to exactly the belt strip.
   */
  private createBeltTileSprites(): void {
    // Destroy any existing belt TileSprites (e.g., on scene restart)
    for (const seg of this.beltSegmentSprites) {
      seg.tileSprite.destroy();
    }
    this.beltSegmentSprites = [];

    const ls = this.layoutSystem;

    for (const seg of PATH_SEGMENTS) {
      const drawLen = seg.length - seg.drawStart - seg.drawEnd;
      if (drawLen <= 0) continue;

      // Compute center of the drawable portion in base resolution
      const startT = seg.drawStart / seg.length;
      const endT = 1 - seg.drawEnd / seg.length;
      const midT = (startT + endT) / 2;
      const baseX = seg.from.x + (seg.to.x - seg.from.x) * midT;
      const baseY = seg.from.y + (seg.to.y - seg.from.y) * midT;

      // TileSprite dimensions in base resolution:
      // width = segment drawable length (along the belt direction)
      // height = belt width (perpendicular to belt direction)
      const baseWidth = drawLen;
      const baseHeight = BELT_WIDTH;

      // Determine rotation based on segment direction:
      // - Right-moving horizontal: 0
      // - Left-moving horizontal: π (180°)
      // - Down-moving vertical: π/2 (90°)
      // - Up-moving vertical: 3π/2 (270°)
      const isVertical = seg.isVertical;
      let rotation: number;
      if (isVertical) {
        rotation = seg.dy > 0 ? Math.PI / 2 : (3 * Math.PI) / 2;
      } else {
        rotation = seg.dx > 0 ? 0 : Math.PI;
      }

      // Create TileSprite at screen-scaled dimensions
      const screenWidth = ls.scaleValue(baseWidth);
      const screenHeight = ls.scaleValue(baseHeight);
      const tileSprite = this.add.tileSprite(
        ls.scaleX(baseX),
        ls.scaleY(baseY),
        screenWidth,
        screenHeight,
        ASSET_KEYS.BELT,
      );
      tileSprite.setOrigin(0.5, 0.5);
      tileSprite.setRotation(rotation);
      tileSprite.setDepth(-1);

      // Uniform tile scale: fit texture height to belt width, preserve aspect ratio
      const texFrame = this.textures.getFrame(ASSET_KEYS.BELT);
      const tileScale = ls.scaleValue(baseHeight) / texFrame.height;
      tileSprite.setTileScale(tileScale, tileScale);

      this.beltSegmentSprites.push({
        tileSprite,
        baseX,
        baseY,
        baseWidth,
        baseHeight,
        rotation,
        isVertical,
      });
    }
  }

  /**
   * Repositions and rescales all belt TileSprites on resize.
   */
  private resizeBeltTileSprites(): void {
    const ls = this.layoutSystem;
    const texFrame = this.textures.getFrame(ASSET_KEYS.BELT);

    for (const seg of this.beltSegmentSprites) {
      seg.tileSprite.setPosition(ls.scaleX(seg.baseX), ls.scaleY(seg.baseY));
      seg.tileSprite.width = ls.scaleValue(seg.baseWidth);
      seg.tileSprite.height = ls.scaleValue(seg.baseHeight);

      // Uniform tile scale: fit texture height to belt width, preserve aspect ratio
      const tileScale = ls.scaleValue(seg.baseHeight) / texFrame.height;
      seg.tileSprite.setTileScale(tileScale, tileScale);
    }
  }

  private drawLayout(): void {
    // Clear previous layout graphics so we can redraw on resize
    if (this.layoutGraphics) {
      this.layoutGraphics.clear();
    } else {
      this.layoutGraphics = this.add.graphics();
      // Keep layout graphics below sprites so it never obscures
      // transparent regions of terminal or machine sprites (depth 0).
      this.layoutGraphics.setDepth(-1);
    }

    const ls = this.layoutSystem;

    // Floor — walkable/non-walkable distinction (replaces old movementAreaGraphics)
    drawFloor({ graphics: this.floorGraphics, layoutSystem: ls });
  }

  private enterGameOver(a: ConveyorItem, b: ConveyorItem): void {
    this.gameOver = true;
    this.collidedItems = [a, b];
    this.time.delayedCall(3000, () => {
      this.scene.start('GameOverScene', { score: this.gameManager.getScore() });
    });
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(String(this.gameManager.getScore()).padStart(8, '0'));
    this.budgetText.setText('$' + this.gameManager.getBudget());
  }

  /**
   * Creates 3 machine sprite instances, one per machine definition.
   * Positions, rotates, and scales each sprite to match the existing MachineDrawing body layout.
   */
  private createMachineSprites(): void {
    // Destroy any existing machine sprites (e.g., on scene restart)
    for (const ms of this.machineSprites) {
      ms.sprite.destroy();
    }
    this.machineSprites = [];

    const ls = this.layoutSystem;

    // Machine body positions and dimensions matching MachineDrawing.ts
    const machineConfigs: { id: string; pos: string; baseX: number; baseY: number; baseWidth: number; baseHeight: number; rotation: number }[] = [];

    for (const def of MACHINE_DEFINITIONS) {
      let bx: number, by: number, bw: number, bh: number, rotation: number;

      switch (def.playerPosition) {
        case 'up': {
          // Machine 1 — top: covers top belt strip
          // Asset has transparent padding at bottom (~12px), so shift down to compensate
          bw = 140;
          bh = 90;
          bx = LAYOUT.CENTER_X - bw / 2;
          by = LAYOUT.BELT_Y + LAYOUT.BELT_THICKNESS - bh + 12;
          rotation = 0;
          break;
        }
        case 'right': {
          // Machine 2 — right: covers right belt strip
          // Asset has transparent padding; after 90° rotation the padding is on the left visible side
          bw = 140;
          bh = 90;
          bx = LAYOUT.BELT_X + LAYOUT.BELT_W - LAYOUT.BELT_THICKNESS - 12;
          by = LAYOUT.CENTER_Y - bw / 2;
          rotation = Math.PI / 2;
          break;
        }
        case 'down': {
          // Machine 3 — bottom: covers bottom belt strip
          // Asset has transparent padding at bottom (which is top after 180° rotation), shift up
          bw = 140;
          bh = 90;
          bx = LAYOUT.CENTER_X - bw / 2;
          by = LAYOUT.BELT_Y + LAYOUT.BELT_H - LAYOUT.BELT_THICKNESS - 12;
          rotation = Math.PI;
          break;
        }
        default:
          continue;
      }

      // For rotated machines (90°), the visible footprint swaps bw/bh.
      // Compute center accordingly.
      const rotated = Math.abs(rotation - Math.PI / 2) < 0.01;
      machineConfigs.push({
        id: def.id,
        pos: def.playerPosition,
        baseX: rotated ? bx + bh / 2 : bx + bw / 2,  // center X
        baseY: rotated ? by + bw / 2 : by + bh / 2,  // center Y
        baseWidth: bw,
        baseHeight: bh,
        rotation,
      });
    }

    for (const cfg of machineConfigs) {
      const sprite = this.add.sprite(
        ls.scaleX(cfg.baseX),
        ls.scaleY(cfg.baseY),
        ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE,
      );
      sprite.setOrigin(0.5, 0.5);
      sprite.setRotation(cfg.rotation);
      sprite.setDepth(1);

      // Scale sprite to cover the machine body dimensions
      const frame = sprite.frame;
      const scaleX = ls.scaleValue(cfg.baseWidth) / frame.width;
      const scaleY = ls.scaleValue(cfg.baseHeight) / frame.height;
      sprite.setScale(scaleX, scaleY);

      this.machineSprites.push({
        sprite,
        machineId: cfg.id,
        baseX: cfg.baseX,
        baseY: cfg.baseY,
        baseWidth: cfg.baseWidth,
        baseHeight: cfg.baseHeight,
        rotation: cfg.rotation,
      });
    }
  }

  /**
   * Each frame, swaps machine sprite texture based on state:
   * - machine_interaction_active when player is interacting
   * - machine_no-interaction_active when machine is active
   * - machine_no-interaction_inactive when idle
   */
  private updateMachineSprites(): void {
    const machines = this.machineSystem.getMachines();

    for (const ms of this.machineSprites) {
      const machine = machines.find(m => m.definition.id === ms.machineId);
      if (!machine) continue;

      // Determine the correct texture based on machine state
      let textureKey: string;
      if (this.machineSystem.isPlayerInteracting(ms.machineId)) {
        textureKey = ASSET_KEYS.MACHINE_INTERACTION_ACTIVE;
      } else if (this.machineSystem.isActive(ms.machineId)) {
        textureKey = ASSET_KEYS.MACHINE_NO_INTERACTION_ACTIVE;
      } else {
        textureKey = ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE;
      }

      ms.sprite.setTexture(textureKey);

      // Recompute scale after texture swap (textures may have different frame sizes)
      const ls = this.layoutSystem;
      const frame = ms.sprite.frame;
      const scaleX = ls.scaleValue(ms.baseWidth) / frame.width;
      const scaleY = ls.scaleValue(ms.baseHeight) / frame.height;
      ms.sprite.setScale(scaleX, scaleY);
    }
  }

  /**
   * Repositions and rescales machine sprites on resize.
   */
  private resizeMachineSprites(): void {
    const ls = this.layoutSystem;

    for (const ms of this.machineSprites) {
      ms.sprite.setPosition(ls.scaleX(ms.baseX), ls.scaleY(ms.baseY));

      const frame = ms.sprite.frame;
      const scaleX = ls.scaleValue(ms.baseWidth) / frame.width;
      const scaleY = ls.scaleValue(ms.baseHeight) / frame.height;
      ms.sprite.setScale(scaleX, scaleY);
    }
  }

  /** Worker sprite size in base-resolution pixels (doubled from original 40). */
  private static readonly WORKER_SIZE = 80;

  /** Terminal body dimensions in base-resolution pixels (from TerminalDrawing). */
  private static readonly TERMINAL_BODY_W = LAYOUT.STATION_H * 2;  // 80
  private static readonly TERMINAL_BODY_H = LAYOUT.STATION_W * 2;  // 120
  /** Terminal center position in base resolution — centered between inner left belt edge and left floor node. */
  private static readonly TERMINAL_BASE_X = (LAYOUT.BELT_X + LAYOUT.BELT_THICKNESS + (LAYOUT.CENTER_X - LAYOUT.NODE_OFFSET - LAYOUT.NODE_SIZE / 2)) / 2;
  private static readonly TERMINAL_BASE_Y = LAYOUT.CENTER_Y;  // 300

  /**
   * Creates the terminal sprite in create() using terminal_inactive as default texture.
   * Positioned at the left side of the belt, vertically centered (matching TerminalDrawing).
   */
  private createTerminalSprite(): void {
    if (this.terminalSprite) {
      this.terminalSprite.destroy();
    }

    const ls = this.layoutSystem;

    this.terminalSprite = this.add.sprite(
      ls.scaleX(GameScene.TERMINAL_BASE_X),
      ls.scaleY(GameScene.TERMINAL_BASE_Y),
      ASSET_KEYS.TERMINAL_INACTIVE,
    );
    this.terminalSprite.setOrigin(0.5, 0.5);
    this.terminalSprite.setDepth(0);

    // Scale sprite to cover 40×60 base-resolution pixels
    const frame = this.terminalSprite.frame;
    const scaleX = ls.scaleValue(GameScene.TERMINAL_BODY_W) / frame.width;
    const scaleY = ls.scaleValue(GameScene.TERMINAL_BODY_H) / frame.height;
    this.terminalSprite.setScale(scaleX, scaleY);
  }

  /**
   * Each frame, swaps terminal sprite texture based on terminal interaction state:
   * terminal_active when terminalMode is true (player is interacting), terminal_inactive otherwise.
   */
  private updateTerminalSprite(): void {
    const textureKey = this.terminalMode
      ? ASSET_KEYS.TERMINAL_ACTIVE
      : ASSET_KEYS.TERMINAL_INACTIVE;

    this.terminalSprite.setTexture(textureKey);

    // Recompute scale after texture swap (textures may have different frame sizes)
    const ls = this.layoutSystem;
    const frame = this.terminalSprite.frame;
    const scaleX = ls.scaleValue(GameScene.TERMINAL_BODY_W) / frame.width;
    const scaleY = ls.scaleValue(GameScene.TERMINAL_BODY_H) / frame.height;
    this.terminalSprite.setScale(scaleX, scaleY);
  }

  /**
   * Repositions and rescales terminal sprite on resize.
   */
  private resizeTerminalSprite(): void {
    const ls = this.layoutSystem;

    this.terminalSprite.setPosition(
      ls.scaleX(GameScene.TERMINAL_BASE_X),
      ls.scaleY(GameScene.TERMINAL_BASE_Y),
    );

    const frame = this.terminalSprite.frame;
    const scaleX = ls.scaleValue(GameScene.TERMINAL_BODY_W) / frame.width;
    const scaleY = ls.scaleValue(GameScene.TERMINAL_BODY_H) / frame.height;
    this.terminalSprite.setScale(scaleX, scaleY);
  }

  /**
   * Creates the worker sprite in create() using worker_64_front as default texture.
   * Depth 2 places the worker above items and machines.
   */
  private createWorkerSprite(): void {
    if (this.workerSprite) {
      this.workerSprite.destroy();
    }

    const ls = this.layoutSystem;
    const { x, y } = this.inputSystem.getPlayerCoords();

    this.workerSprite = this.add.sprite(
      ls.scaleX(x),
      ls.scaleY(y),
      ASSET_KEYS.WORKER_FRONT,
    );
    this.workerSprite.setOrigin(0.5, 0.5);
    this.workerSprite.setDepth(2);

    // Scale to WORKER_SIZE base-resolution pixels
    const targetScreenSize = ls.scaleValue(GameScene.WORKER_SIZE);
    const frame = this.workerSprite.frame;
    const spriteScale = targetScreenSize / Math.max(frame.width, frame.height);
    this.workerSprite.setScale(spriteScale);
  }

  /**
   * Returns the correct (assetKey, flipX) pair for a given player position.
   */
  private getWorkerTextureForPosition(position: PlayerPosition): { key: string; flipX: boolean } {
    switch (position) {
      case 'center': return { key: ASSET_KEYS.WORKER_FRONT, flipX: false };
      case 'up':     return { key: ASSET_KEYS.WORKER_BACK, flipX: false };
      case 'down':   return { key: ASSET_KEYS.WORKER_FRONT, flipX: false };
      case 'left':   return { key: ASSET_KEYS.WORKER_SIDE, flipX: true };
      case 'right':  return { key: ASSET_KEYS.WORKER_SIDE, flipX: false };
    }
  }

  /**
   * Each frame, updates the worker sprite texture, flipX, position, and scale
   * based on the current player position.
   */
  private updateWorkerSprite(): void {
    const ls = this.layoutSystem;
    const position = this.inputSystem.getPlayerPosition();
    const { x, y } = this.inputSystem.getPlayerCoords();

    // Update texture and flip based on player position
    const { key, flipX } = this.getWorkerTextureForPosition(position);
    this.workerSprite.setTexture(key);
    this.workerSprite.setFlipX(flipX);

    // Position at scaled player coordinates
    this.workerSprite.setPosition(ls.scaleX(x), ls.scaleY(y));

    // Scale to WORKER_SIZE base-resolution pixels (recompute after texture swap)
    const targetScreenSize = ls.scaleValue(GameScene.WORKER_SIZE);
    const frame = this.workerSprite.frame;
    const spriteScale = targetScreenSize / Math.max(frame.width, frame.height);
    this.workerSprite.setScale(spriteScale);
  }

  /**
   * Creates the initial item sprite pool with INITIAL_ITEM_POOL_SIZE entries.
   * Each sprite starts hidden and uses the 'new' item texture as default.
   */
  private createItemSpritePool(): void {
    // Destroy any existing pool sprites (e.g., on scene restart)
    for (const entry of this.itemSpritePool) {
      entry.sprite.destroy();
    }
    this.itemSpritePool = [];

    for (let i = 0; i < INITIAL_ITEM_POOL_SIZE; i++) {
      this.addItemSpriteToPool();
    }
  }

  /**
   * Adds a single sprite entry to the item pool.
   */
  private addItemSpriteToPool(): ItemSpriteEntry {
    const sprite = this.add.sprite(0, 0, ITEM_STATE_ASSET['new']);
    sprite.setOrigin(0.5, 0.5);
    sprite.setVisible(false);
    sprite.setDepth(0);
    const entry: ItemSpriteEntry = { sprite, active: false };
    this.itemSpritePool.push(entry);
    return entry;
  }

  /**
   * Syncs the item sprite pool with the current items each frame.
   * Sets position, texture, scale, visibility, and collision blink tint.
   */
  private syncItemSprites(): void {
    const items = this.itemSystem.getItems();
    const ls = this.layoutSystem;

    // Grow pool if needed (Task 3.4)
    while (items.length > this.itemSpritePool.length) {
      this.addItemSpriteToPool();
    }

    // Compute the target display scale: ITEM_SIZE base pixels → screen pixels
    // The sprite source is 64×64, so we need to scale it down to ITEM_SIZE in base resolution
    const targetScreenSize = ls.scaleValue(ITEM_SIZE);

    for (let i = 0; i < this.itemSpritePool.length; i++) {
      const entry = this.itemSpritePool[i];

      if (i < items.length) {
        const item = items[i];
        const textureKey = ITEM_STATE_ASSET[item.state];

        entry.sprite.setPosition(ls.scaleX(item.x), ls.scaleY(item.y));
        entry.sprite.setTexture(textureKey);

        // Scale sprite so it displays at ITEM_SIZE base-resolution pixels
        const frame = entry.sprite.frame;
        const spriteScale = targetScreenSize / Math.max(frame.width, frame.height);
        entry.sprite.setScale(spriteScale);

        entry.sprite.setVisible(true);
        entry.active = true;

        // Collision blink effect (Task 3.3)
        const isCollided = this.gameOver && this.collidedItems !== null &&
          (item === this.collidedItems[0] || item === this.collidedItems[1]);

        if (isCollided) {
          if (Math.floor(this.blinkTimer / 300) % 2 === 0) {
            entry.sprite.setTint(0xff0000);
          } else {
            entry.sprite.clearTint();
          }
        } else {
          entry.sprite.clearTint();
        }
      } else {
        // Hide unused pool sprites
        entry.sprite.setVisible(false);
        entry.active = false;
      }
    }
  }
}
