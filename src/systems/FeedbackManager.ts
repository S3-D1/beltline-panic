import { LayoutSystem } from './LayoutSystem';
import { GameManager } from './GameManager';
import { AudioManager } from './AudioManager';
import { MachineState } from '../data/MachineConfig';
import { PlayerPosition } from './InputSystem';
import { ItemState } from '../data/ConveyorConfig';
import { ConveyorItem } from './ConveyorSystem';

/** Maximum number of simultaneous floating text instances */
const MAX_FLOATING_TEXTS = 8;

/** Default floating text rise distance in base-resolution pixels */
const FLOAT_RISE_PX = 30;

/** Default floating text duration in ms */
const DEFAULT_FLOAT_DURATION = 1000;

/** Derived machine state for feedback purposes (Req 3.1) */
export type Machine_State =
  | 'idle'
  | 'ready'
  | 'processing'
  | 'blocked'
  | 'full'
  | 'wrongInput'
  | 'automated'
  | 'upgraded';

/** Color mapping for status lights (Req 3.2) */
const STATUS_LIGHT_COLORS: Record<Machine_State, number> = {
  idle: 0x888888,
  ready: 0x00ff00,
  processing: 0xffcc00,
  blocked: 0xff0000,
  full: 0xff8800,
  wrongInput: 0xff0000,
  automated: 0x00ccff,
  upgraded: 0x4488ff,
};

/** Status light radius in base-resolution pixels */
const STATUS_LIGHT_RADIUS = 5;

/** Status light offset from machine sprite center (base-resolution pixels) */
const STATUS_LIGHT_OFFSET_Y = -50;

/** Interaction hint offset from machine sprite center (base-resolution pixels) */
const HINT_OFFSET_Y = 45;

/** Interaction hint text colors by Machine_State (CSS color strings) */
const HINT_COLORS: Partial<Record<Machine_State, string>> = {
  blocked: '#ff0000',
  full: '#ff8800',
  wrongInput: '#ff0000',
  processing: '#ffcc00',
  ready: '#ffffff',
  automated: '#00ccff',
};

/** Default hint color for states without a specific mapping */
const HINT_COLOR_DEFAULT = '#cccccc';

/** Duration in ms to show the "Wrong Step" hint before auto-hiding */
const WRONG_INPUT_HINT_DURATION = 1000;

interface FloatingTextEntry {
  text: Phaser.GameObjects.Text;
  tween: Phaser.Tweens.Tween;
}

/** Sprite reference passed from GameScene */
interface MachineSpriteDef {
  sprite: Phaser.GameObjects.Sprite;
  machineId: string;
  baseX: number;
  baseY: number;
}

/** Item sprite reference passed from GameScene for transition effects */
interface ItemSpriteRef {
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
}

export class FeedbackManager {
  private scene: Phaser.Scene;
  private layoutSystem: LayoutSystem;
  private gameManager: GameManager;
  private audioManager: AudioManager;

  /** References to existing HUD text objects (set via init) */
  private budgetText: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;

  /** Active floating text pool */
  private activeFloatingTexts: FloatingTextEntry[] = [];

  /** Per-machine wrong-input flags, keyed by machine index */
  private wrongInputFlags: Map<number, boolean> = new Map();

  /** Machine sprite references from GameScene */
  private machineSpriteDefs: MachineSpriteDef[] = [];

  /** Status light graphics objects, one per machine (indexed same as machineSpriteDefs) */
  private statusLightGraphics: Phaser.GameObjects.Graphics[] = [];

  /** Previous derived Machine_State per machine index, for transition detection */
  private previousMachineStates: Map<number, Machine_State> = new Map();

  /** Persistent hint text objects, one per machine (indexed same as machineSpriteDefs) */
  private hintTexts: Phaser.GameObjects.Text[] = [];

  /** Persistent hint text for the terminal */
  private terminalHintText: Phaser.GameObjects.Text | null = null;

  /** Per-machine wrong-input timers in ms (counts down to auto-hide) */
  private wrongInputTimers: Map<number, number> = new Map();

  /** Item sprite pool references from GameScene (Task 6.1) */
  private itemSpritePool: ItemSpriteRef[] = [];

  /** Previous item states keyed by ConveyorItem reference, for transition detection (Task 6.1) */
  private previousItemStates: Map<ConveyorItem, ItemState> = new Map();

  /** Previous budget value for change detection (Task 8.1, Req 5.1, 10.2) */
  private previousBudget: number = 0;

  /** Whether previousBudget has been initialized (skip first-frame delta) */
  private budgetInitialized: boolean = false;

  /** Active processing glow tweens keyed by machine index (Task 10.1, Req 9.7) */
  private processingGlowTweens: Map<number, Phaser.Tweens.Tween> = new Map();

  constructor(
    scene: Phaser.Scene,
    layoutSystem: LayoutSystem,
    gameManager: GameManager,
    audioManager: AudioManager,
  ) {
    this.scene = scene;
    this.layoutSystem = layoutSystem;
    this.gameManager = gameManager;
    this.audioManager = audioManager;
  }

  /**
   * Initialize the FeedbackManager with references to existing HUD elements.
   * Logs new feedback element types for development traceability.
   */
  init(budgetText: Phaser.GameObjects.Text, scoreText: Phaser.GameObjects.Text): void {
    this.budgetText = budgetText;
    this.scoreText = scoreText;

    // Log new feedback element types at initialization (Req 1.6)
    console.log('[FeedbackManager] Registered existing: budgetText, scoreText');
    console.log('[FeedbackManager] New feedback elements: floatingText, statusLight, interactionHint, visualEffects');
  }

  // ── Per-frame update (Task 8.1, 8.3) ────────────────────────────────

  /**
   * Per-frame update method. Handles budget change tracking, budget text
   * consistency, and will be extended for other per-frame checks.
   *
   * @param delta - Frame delta in ms
   */
  update(_delta: number): void {
    this.trackBudgetChanges();
    this.ensureBudgetTextConsistency();
  }

  // ── Budget change tracking (Task 8.1, Req 5.1, 5.2, 5.3, 5.4, 9.6, 10.2) ──

  /**
   * Compare current budget with previousBudget each frame.
   * On increase: show "+{amount}" green floating text, play UI_Pulse, play payment sound.
   * On decrease: show "-{amount}" yellow floating text.
   */
  private trackBudgetChanges(): void {
    const currentBudget = this.gameManager.getBudget();

    if (!this.budgetInitialized) {
      this.previousBudget = currentBudget;
      this.budgetInitialized = true;
      return;
    }

    if (currentBudget === this.previousBudget) {
      return;
    }

    const diff = currentBudget - this.previousBudget;

    if (diff > 0) {
      // Budget increased — show "+{amount}" in green, pulse, play payment sound
      this.showBudgetFloatingText(`+${diff}`, '#00ff00');
      this.playBudgetPulse();
      this.audioManager.playPayment();
    } else if (diff < 0) {
      // Budget decreased — show "-{amount}" in yellow
      this.showBudgetFloatingText(`-${Math.abs(diff)}`, '#ffcc00');
    }

    this.previousBudget = currentBudget;
  }

  /**
   * Show a floating text near the budget text display.
   */
  private showBudgetFloatingText(message: string, color: string): void {
    if (!this.budgetText) return;

    // Position near the budget text (slightly to the left so it doesn't overlap)
    const x = this.budgetText.x - this.budgetText.width / 2;
    const y = this.budgetText.y;

    this.showFloatingText(x, y, message, color);
  }

  /**
   * Play a UI_Pulse animation on the budget text: scale to 1.15x over 100ms,
   * return to 1.0x over 150ms. Total: 250ms (within 500ms limit per Req 9.8).
   * (Req 5.3, 9.6)
   */
  private playBudgetPulse(): void {
    if (!this.budgetText) return;

    const baseScaleX = this.budgetText.scaleX;
    const baseScaleY = this.budgetText.scaleY;

    this.scene.tweens.add({
      targets: this.budgetText,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 1.15,
      duration: 100,
      ease: 'Quad.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.budgetText,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 150,
          ease: 'Quad.easeIn',
        });
      },
    });
  }

  // ── Insufficient budget feedback (Task 8.2, Req 5.5, 5.6) ─────────

  /**
   * Called by GameScene when a TerminalUI purchase fails due to insufficient budget.
   * Shows "Need {cost}" floating text in red near budget text and plays a
   * red-tinted UI_Pulse (400ms) on the budget text.
   *
   * @param cost - The upgrade cost the player cannot afford
   */
  notifyInsufficientBudget(cost: number): void {
    // "Need {amount}" floating text in red near budget text (Req 5.5)
    this.showBudgetFloatingText(`Need ${cost}`, '#ff0000');

    // Red-tinted UI_Pulse on budget text (Req 5.6)
    this.playRedBudgetPulse();
  }

  /**
   * Play a red-tinted UI_Pulse on the budget text: temporarily change color to red,
   * scale to 1.15x over 200ms, return to 1.0x over 200ms, then restore original color.
   * Total: 400ms (within 500ms limit per Req 9.8).
   */
  private playRedBudgetPulse(): void {
    if (!this.budgetText) return;

    const originalColor = this.budgetText.style.color as string;
    const baseScaleX = this.budgetText.scaleX;
    const baseScaleY = this.budgetText.scaleY;

    // Temporarily tint red
    this.budgetText.setColor('#ff0000');

    this.scene.tweens.add({
      targets: this.budgetText,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 1.15,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.budgetText,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 200,
          ease: 'Quad.easeIn',
          onComplete: () => {
            // Restore original color
            if (this.budgetText) {
              this.budgetText.setColor(originalColor);
            }
          },
        });
      },
    });
  }

  // ── Budget text consistency (Task 8.3, Req 5.7, 10.7) ─────────────

  /**
   * Verify budget text matches GameManager.getBudget() and correct if mismatched.
   * Called every frame in the update method.
   */
  private ensureBudgetTextConsistency(): void {
    if (!this.budgetText) return;

    const expected = '$' + this.gameManager.getBudget();
    if (this.budgetText.text !== expected) {
      this.budgetText.setText(expected);
    }
  }

  /**
   * Display a floating text that rises upward and fades out.
   *
   * @param x - Screen X position
   * @param y - Screen Y position
   * @param message - Text to display
   * @param color - CSS color string (e.g. '#00ff00')
   * @param duration - Animation duration in ms (default 1000)
   */
  showFloatingText(
    x: number,
    y: number,
    message: string,
    color: string,
    duration: number = DEFAULT_FLOAT_DURATION,
  ): void {
    // Enforce pool limit: destroy oldest if at capacity (Req 7.4, 7.5)
    if (this.activeFloatingTexts.length >= MAX_FLOATING_TEXTS) {
      this.destroyFloatingText(this.activeFloatingTexts[0]);
    }

    const text = this.scene.add.text(x, y, message, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color,
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(10); // Above all gameplay elements

    const tween = this.scene.tweens.add({
      targets: text,
      y: y - FLOAT_RISE_PX,
      alpha: 0,
      duration,
      ease: 'Power1',
      onComplete: () => {
        this.destroyFloatingText(entry);
      },
    });

    const entry: FloatingTextEntry = { text, tween };
    this.activeFloatingTexts.push(entry);
  }

  /**
   * Remove a floating text entry from the pool and destroy its Phaser objects.
   */
  private destroyFloatingText(entry: FloatingTextEntry): void {
    const index = this.activeFloatingTexts.indexOf(entry);
    if (index !== -1) {
      this.activeFloatingTexts.splice(index, 1);
    }
    if (entry.tween && entry.tween.isPlaying()) {
      entry.tween.stop();
    }
    if (entry.text && entry.text.active) {
      entry.text.destroy();
    }
  }

  /** Returns the current number of active floating texts (useful for testing) */
  getActiveFloatingTextCount(): number {
    return this.activeFloatingTexts.length;
  }

  // ── Machine sprite references ──────────────────────────────────────

  /**
   * Set machine sprite references so FeedbackManager can position status lights
   * and trigger animations on machine sprites.
   */
  setMachineSprites(sprites: MachineSpriteDef[]): void {
    this.machineSpriteDefs = sprites;

    // Destroy any existing status light graphics
    for (const g of this.statusLightGraphics) {
      g.destroy();
    }
    this.statusLightGraphics = [];

    // Destroy any existing hint texts
    for (const t of this.hintTexts) {
      t.destroy();
    }
    this.hintTexts = [];

    // Create one Graphics object per machine for status lights
    // and one Text object per machine for interaction hints
    for (let i = 0; i < sprites.length; i++) {
      const g = this.scene.add.graphics();
      g.setDepth(5); // Above machines, below floating text
      this.statusLightGraphics.push(g);

      const hintText = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: HINT_COLOR_DEFAULT,
      });
      hintText.setOrigin(0.5, 0.5);
      hintText.setDepth(6); // Above status lights, below floating text
      hintText.setVisible(false);
      this.hintTexts.push(hintText);
    }

    // Create terminal hint text if not already created
    if (!this.terminalHintText) {
      this.terminalHintText = this.scene.add.text(0, 0, 'E: Upgrades', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      });
      this.terminalHintText.setOrigin(0.5, 0.5);
      this.terminalHintText.setDepth(6);
      this.terminalHintText.setVisible(false);
    }
  }

  // ── Wrong-input flag ───────────────────────────────────────────────

  /**
   * Called by GameScene to notify FeedbackManager about wrong input on a machine.
   * The flag auto-clears after one frame of derivation so it only shows briefly.
   * Also starts the wrong-input hint timer for auto-hide after 1000ms.
   */
  setWrongInput(machineIndex: number, failed: boolean): void {
    this.wrongInputFlags.set(machineIndex, failed);
    if (failed) {
      this.wrongInputTimers.set(machineIndex, WRONG_INPUT_HINT_DURATION);
    }
  }

  // ── Machine state derivation (Task 4.1, Req 3.1, 10.1) ───────────

  /**
   * Derive the feedback Machine_State from a MachineState's fields.
   * Priority order: blocked → full → wrongInput → processing → ready → automated → upgraded → idle
   */
  deriveMachineState(machine: MachineState, machineIndex: number): Machine_State {
    // blocked: pendingReleaseItems at capacity AND heldItems at capacity
    if (
      machine.pendingReleaseItems.length >= machine.capacity &&
      machine.heldItems.length >= machine.capacity
    ) {
      return 'blocked';
    }

    // full: heldItems count equals capacity AND no activeInteraction
    if (
      machine.heldItems.length >= machine.capacity &&
      machine.activeInteraction === null
    ) {
      return 'full';
    }

    // wrongInput: per-machine flag set from GameScene
    if (this.wrongInputFlags.get(machineIndex) === true) {
      return 'wrongInput';
    }

    // processing: activeInteraction is not null
    if (machine.activeInteraction !== null) {
      return 'processing';
    }

    // ready: heldItems count > 0 AND activeInteraction is null
    if (machine.heldItems.length > 0 && machine.activeInteraction === null) {
      return 'ready';
    }

    // automated: automationLevel > 0 AND heldItems count === 0
    if (machine.automationLevel > 0 && machine.heldItems.length === 0) {
      return 'automated';
    }

    // upgraded: any upgrade level > 0 AND heldItems count === 0
    // Check via GameManager upgrade levels for this machine
    if (machine.heldItems.length === 0) {
      const levels = this.gameManager.getUpgradeLevels(machine.definition.id);
      if (
        levels.capacity > 0 ||
        levels.quality > 0 ||
        levels.speed > 0 ||
        levels.automation > 0
      ) {
        return 'upgraded';
      }
    }

    // idle: default
    return 'idle';
  }

  // ── Status lights (Task 4.2, Req 3.2, 3.6) ────────────────────────

  /**
   * Draw a small colored circle near each machine sprite based on derived Machine_State.
   * Called every frame from the update loop.
   */
  renderStatusLights(machines: MachineState[]): void {
    const ls = this.layoutSystem;

    for (let i = 0; i < machines.length; i++) {
      const graphics = this.statusLightGraphics[i];
      if (!graphics) continue;

      const spriteDef = this.machineSpriteDefs[i];
      if (!spriteDef) continue;

      const state = this.deriveMachineState(machines[i], i);
      const color = STATUS_LIGHT_COLORS[state];

      graphics.clear();
      graphics.fillStyle(color, 1);

      // Position the light above the machine sprite center
      const screenX = ls.scaleX(spriteDef.baseX);
      const screenY = ls.scaleY(spriteDef.baseY + STATUS_LIGHT_OFFSET_Y);
      const screenRadius = ls.scaleValue(STATUS_LIGHT_RADIUS);

      graphics.fillCircle(screenX, screenY, screenRadius);
    }
  }

  // ── Interaction hints (Task 5.1, 5.2, 5.3, Req 4.1–4.8) ──────────

  /**
   * Render interaction hint text near each machine based on derived Machine_State.
   * Uses deriveMachineState() for conflict resolution (only highest-priority hint shown).
   * Reuses persistent Phaser text objects — updates each frame rather than creating new ones.
   *
   * @param machines - Current machine states from MachineSystem.getMachines()
   * @param playerPosition - Current player position from InputSystem
   * @param terminalOpen - Whether the terminal UI is currently open
   * @param delta - Frame delta in ms for wrong-input timer countdown
   */
  renderInteractionHints(
    machines: MachineState[],
    playerPosition: PlayerPosition,
    terminalOpen: boolean,
    delta: number = 0,
  ): void {
    const ls = this.layoutSystem;

    // Tick down wrong-input timers
    for (const [idx, remaining] of this.wrongInputTimers) {
      const newRemaining = remaining - delta;
      if (newRemaining <= 0) {
        this.wrongInputTimers.delete(idx);
      } else {
        this.wrongInputTimers.set(idx, newRemaining);
      }
    }

    for (let i = 0; i < machines.length; i++) {
      const hintText = this.hintTexts[i];
      if (!hintText) continue;

      const spriteDef = this.machineSpriteDefs[i];
      if (!spriteDef) continue;

      const machine = machines[i];
      const state = this.deriveMachineState(machine, i);
      const isPlayerAdjacent = machine.definition.playerPosition === playerPosition;

      // Determine hint message and color based on state (priority already resolved by deriveMachineState)
      let message: string | null = null;
      let color: string = HINT_COLOR_DEFAULT;

      switch (state) {
        case 'blocked':
          message = 'Blocked!';
          color = HINT_COLORS.blocked!;
          break;
        case 'full':
          message = 'Full!';
          color = HINT_COLORS.full!;
          break;
        case 'wrongInput':
          // Only show if the wrong-input timer is still active
          if (this.wrongInputTimers.has(i)) {
            message = 'Wrong Step';
            color = HINT_COLORS.wrongInput!;
          }
          break;
        case 'processing':
          message = 'Working...';
          color = HINT_COLORS.processing!;
          break;
        case 'ready':
          if (isPlayerAdjacent) {
            message = 'E: Process';
            color = HINT_COLORS.ready!;
          }
          break;
        case 'automated':
          message = `Auto Lv. ${machine.automationLevel}`;
          color = HINT_COLORS.automated!;
          break;
        case 'upgraded':
          // No specific hint text for upgraded state
          break;
        case 'idle':
          // No hint for idle
          break;
      }

      if (message) {
        // Position below the machine sprite center
        const screenX = ls.scaleX(spriteDef.baseX);
        const screenY = ls.scaleY(spriteDef.baseY + HINT_OFFSET_Y);
        const fontSize = ls.scaleFontSize(14);

        hintText.setPosition(screenX, screenY);
        hintText.setFontSize(fontSize);
        hintText.setText(message);
        hintText.setColor(color);
        hintText.setVisible(true);
      } else {
        hintText.setVisible(false);
      }
    }

    // Terminal hint (Task 5.2, Req 4.6)
    this.renderTerminalHint(playerPosition, terminalOpen);
  }

  /**
   * Show or hide the terminal interaction hint.
   * Visible when player is adjacent to terminal (position === 'left') and terminal is not open.
   */
  private renderTerminalHint(playerPosition: PlayerPosition, terminalOpen: boolean): void {
    if (!this.terminalHintText) return;

    if (playerPosition === 'left' && !terminalOpen) {
      const ls = this.layoutSystem;
      // Position near the terminal — use the known terminal base position
      // Terminal is at BELT_X - STATION_H + STATION_H/2, CENTER_Y (from GameScene)
      const terminalBaseX = 200 - 40 + 20; // 180 — matches GameScene.TERMINAL_BASE_X
      const terminalBaseY = 300; // CENTER_Y
      const screenX = ls.scaleX(terminalBaseX);
      const screenY = ls.scaleY(terminalBaseY + HINT_OFFSET_Y);
      const fontSize = ls.scaleFontSize(14);

      this.terminalHintText.setPosition(screenX, screenY);
      this.terminalHintText.setFontSize(fontSize);
      this.terminalHintText.setVisible(true);
    } else {
      this.terminalHintText.setVisible(false);
    }
  }

  // ── State transition tracking (Task 4.3, Req 3.4, 9.4) ────────────

  /**
   * Track machine state transitions and trigger animations on state changes.
   * Called every frame. Detects transition TO blocked and triggers shake.
   * Manages processing glow effect based on processing state (Task 10.1, Req 9.7).
   */
  trackMachineTransitions(machines: MachineState[]): void {
    for (let i = 0; i < machines.length; i++) {
      const currentState = this.deriveMachineState(machines[i], i);
      const previousState = this.previousMachineStates.get(i) ?? 'idle';

      // Transition TO blocked → shake animation + floating text (Task 10.3, 13.2, Req 7.6, 9.4, 3.4)
      if (currentState === 'blocked' && previousState !== 'blocked') {
        this.triggerBlockedShake(i);
        this.showMachineFloatingText(i, 'Blocked!', '#ff0000');
      }

      // Transition TO full → floating text (Task 13.2, Req 7.6)
      if (currentState === 'full' && previousState !== 'full') {
        this.showMachineFloatingText(i, 'Full!', '#ff8800');
      }

      // Processing glow management (Task 10.1, Req 9.7)
      if (currentState === 'processing' && previousState !== 'processing') {
        this.startProcessingGlow(i);
      } else if (currentState !== 'processing' && previousState === 'processing') {
        this.stopProcessingGlow(i);
      }

      this.previousMachineStates.set(i, currentState);
    }

    // Clear wrong-input flags after derivation so they only last one frame
    this.wrongInputFlags.clear();
  }

  /**
   * Trigger a horizontal shake tween on a machine sprite (Task 10.3, Req 9.4, 3.4).
   * Amplitude 3px, 3 oscillations, 300ms total using Phaser tween on sprite x position.
   */
  private triggerBlockedShake(machineIndex: number): void {
    const spriteDef = this.machineSpriteDefs[machineIndex];
    if (!spriteDef) return;

    const sprite = spriteDef.sprite;
    const originalX = sprite.x;

    // 3 oscillations over 300ms: each oscillation = yoyo forward+back = 100ms
    // repeat: 2 means 3 total forward plays → 3 × (50ms + 50ms) = 300ms
    this.scene.tweens.add({
      targets: sprite,
      x: originalX + 3,
      duration: 50,
      yoyo: true,
      repeat: 2, // 3 full oscillations = 300ms total
      ease: 'Sine.easeInOut',
      onComplete: () => {
        sprite.x = originalX; // Ensure we return to exact position
      },
    });
  }

  // ── Processing glow effect (Task 10.1, Req 9.7) ───────────────────

  /**
   * Start a processing glow effect on a machine sprite.
   * Oscillates alpha between 0.85 and 1.0 at one cycle per 600ms using a Phaser tween.
   * The tween loops indefinitely until stopProcessingGlow() is called.
   *
   * @param machineIndex - Index of the machine to apply the glow to
   */
  startProcessingGlow(machineIndex: number): void {
    // Don't create duplicate tweens
    if (this.processingGlowTweens.has(machineIndex)) return;

    const spriteDef = this.machineSpriteDefs[machineIndex];
    if (!spriteDef) return;

    const sprite = spriteDef.sprite;

    // One cycle = 600ms: 300ms to fade down + 300ms to fade back up (yoyo)
    const tween = this.scene.tweens.add({
      targets: sprite,
      alpha: 0.85,
      duration: 300,
      yoyo: true,
      repeat: -1, // Loop indefinitely
      ease: 'Sine.easeInOut',
    });

    this.processingGlowTweens.set(machineIndex, tween);
  }

  /**
   * Stop the processing glow effect on a machine sprite and restore full alpha.
   *
   * @param machineIndex - Index of the machine to stop the glow on
   */
  stopProcessingGlow(machineIndex: number): void {
    const tween = this.processingGlowTweens.get(machineIndex);
    if (!tween) return;

    tween.stop();
    this.processingGlowTweens.delete(machineIndex);

    // Restore full alpha
    const spriteDef = this.machineSpriteDefs[machineIndex];
    if (spriteDef) {
      spriteDef.sprite.setAlpha(1.0);
    }
  }

  // ── Terminal flash-white effect (Task 10.2, Req 9.5) ──────────────

  /**
   * Flash the terminal sprite white on successful upgrade purchase.
   * Fills the sprite with white tint (0xffffff) for 200ms then clears the tint.
   * Total duration: 200ms (within 500ms limit per Req 9.8).
   *
   * @param sprite - The terminal sprite to flash
   */
  flashTerminalWhite(sprite: Phaser.GameObjects.Sprite): void {
    // Apply white fill tint for a visible flash effect
    sprite.setTintFill(0xffffff);

    // Clear tint after 200ms using Phaser timer
    this.scene.time.delayedCall(200, () => {
      sprite.clearTint();
    });
  }

  // ── Item sprite references (Task 6.1) ──────────────────────────────

  /**
   * Set item sprite pool references so FeedbackManager can apply tweens
   * to item sprites on state transitions.
   */
  setItemSpritePool(pool: ItemSpriteRef[]): void {
    this.itemSpritePool = pool;
  }

  // ── Item state transition tracking (Task 6.1, Req 2.1, 2.2, 9.1) ──

  /**
   * Track item state transitions each frame and trigger visual effects.
   * Compares current item states against previous frame to detect changes.
   *
   * @param items - Current conveyor items from ItemSystem.getItems()
   */
  trackItemTransitions(items: ConveyorItem[]): void {
    // Build a set of current items for cleanup
    const currentItems = new Set<ConveyorItem>(items);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prevState = this.previousItemStates.get(item);

      if (prevState !== undefined && prevState !== item.state) {
        // State transition detected — find the matching sprite
        const spriteRef = this.itemSpritePool[i];
        const sprite = spriteRef?.active ? spriteRef.sprite : null;

        if (item.state === 'packaged') {
          // Packaged: completion pulse (Task 6.3, Req 2.6, 7.6)
          if (sprite) {
            this.triggerCompletionPulse(sprite);
          }
          // "Complete!" floating text in green
          const ls = this.layoutSystem;
          this.showFloatingText(
            ls.scaleX(item.x),
            ls.scaleY(item.y),
            'Complete!',
            '#00ff00',
          );
          // Radial pulse effect (Task 6.5, Req 9.3)
          this.triggerRadialPulse(item.x, item.y);
        } else if (item.state === 'upgraded') {
          // Upgraded: scale-pop + sparkle (Task 6.4, Req 9.2)
          if (sprite) {
            this.triggerScalePop(sprite);
          }
          this.triggerSparkleEffect(item.x, item.y);
        } else {
          // Generic state transition: scale-pop (Task 6.1, Req 9.1)
          if (sprite) {
            this.triggerScalePop(sprite);
          }
        }
      }

      // Update tracked state
      this.previousItemStates.set(item, item.state);
    }

    // Clean up entries for items that no longer exist
    for (const trackedItem of this.previousItemStates.keys()) {
      if (!currentItems.has(trackedItem)) {
        this.previousItemStates.delete(trackedItem);
      }
    }
  }

  // ── Scale-pop effect (Task 6.1, Req 9.1) ──────────────────────────

  /**
   * Play a scale-pop tween on an item sprite.
   * Scales to 1.3x over 100ms, then returns to 1.0x over 200ms.
   * Total duration: 300ms (within 500ms limit per Req 9.8).
   */
  private triggerScalePop(sprite: Phaser.GameObjects.Sprite): void {
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;

    this.scene.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 1.3,
      scaleY: baseScaleY * 1.3,
      duration: 100,
      ease: 'Quad.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.tweens.add({
          targets: sprite,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 200,
          ease: 'Quad.easeIn',
        });
      },
    });
  }

  // ── Completion pulse (Task 6.3, Req 2.6) ──────────────────────────

  /**
   * Play a completion pulse on an item sprite for the packaged state.
   * Scales to 1.4x over 150ms, then returns to 1.0x over 250ms.
   * Total duration: 400ms (within 500ms limit per Req 9.8).
   */
  private triggerCompletionPulse(sprite: Phaser.GameObjects.Sprite): void {
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;

    this.scene.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 1.4,
      scaleY: baseScaleY * 1.4,
      duration: 150,
      ease: 'Quad.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.tweens.add({
          targets: sprite,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 250,
          ease: 'Quad.easeIn',
        });
      },
    });
  }

  // ── Wrong-item feedback (Task 6.2, Req 2.3, 2.4) ──────────────────

  /**
   * Show wrong-item feedback when a machine interaction fails because
   * the item state is not in acceptedInputStatuses.
   * Shows "Wrong Step" floating text in red near the machine and plays error sound.
   *
   * @param machineIndex - Index of the machine where the failure occurred
   */
  showWrongItemFeedback(machineIndex: number): void {
    const spriteDef = this.machineSpriteDefs[machineIndex];
    if (!spriteDef) return;

    const ls = this.layoutSystem;
    const screenX = ls.scaleX(spriteDef.baseX);
    const screenY = ls.scaleY(spriteDef.baseY);

    // Show "Wrong Step" floating text in red (Req 2.3)
    this.showFloatingText(screenX, screenY, 'Wrong Step', '#ff0000');

    // Play error sound hook (Req 2.4)
    this.audioManager.playError();
  }

  // ── Sparkle effect (Task 6.4, Req 9.2) ────────────────────────────

  /**
   * Emit a brief particle burst near an item position when it transitions to upgraded.
   * Uses 6 small graphics circles with tweens (lightweight alternative to Phaser particles).
   * Each particle moves outward in a random direction and fades over 400ms.
   */
  private triggerSparkleEffect(baseX: number, baseY: number): void {
    const ls = this.layoutSystem;
    const screenX = ls.scaleX(baseX);
    const screenY = ls.scaleY(baseY);
    const particleCount = 6;
    const lifetime = 400;
    const spread = ls.scaleValue(20); // How far particles travel

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const targetX = screenX + Math.cos(angle) * spread;
      const targetY = screenY + Math.sin(angle) * spread;

      const particle = this.scene.add.graphics();
      particle.setDepth(10);
      particle.fillStyle(0x44cc44, 1); // Green sparkle matching upgraded item color
      const radius = ls.scaleValue(2);
      particle.fillCircle(screenX, screenY, radius);

      this.scene.tweens.add({
        targets: particle,
        x: targetX - screenX,
        y: targetY - screenY,
        alpha: 0,
        duration: lifetime,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  // ── Radial pulse effect (Task 6.5, Req 9.3) ───────────────────────

  /**
   * Play a radial pulse effect: an expanding circle that fades over 300ms.
   * Used when an item transitions to the packaged state.
   */
  private triggerRadialPulse(baseX: number, baseY: number): void {
    const ls = this.layoutSystem;
    const screenX = ls.scaleX(baseX);
    const screenY = ls.scaleY(baseY);
    const startRadius = ls.scaleValue(5);
    const endRadius = ls.scaleValue(30);

    const pulse = this.scene.add.graphics();
    pulse.setDepth(9); // Below floating text, above items

    // Use a proxy object for the tween to animate radius and alpha together
    const proxy = { radius: startRadius, alpha: 1 };

    this.scene.tweens.add({
      targets: proxy,
      radius: endRadius,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        pulse.clear();
        pulse.lineStyle(ls.scaleValue(2), 0x886622, proxy.alpha); // Brown matching packaged color
        pulse.strokeCircle(screenX, screenY, proxy.radius);
      },
      onComplete: () => {
        pulse.destroy();
      },
    });
  }

  // ── Upgrade purchase feedback (Task 9.3, Req 6.5, 6.6, 6.7, 8.5) ─

  /**
   * Called by TerminalUI after a successful upgrade purchase.
   * Plays level-up sound, shows "Upgraded!" floating text in green near the terminal,
   * plays a UI_Pulse on the terminal sprite (400ms), and flashes the terminal white (200ms).
   *
   * @param terminalSprite - The terminal sprite for positioning and pulse effect (may be null)
   */
  playUpgradeFeedback(terminalSprite: Phaser.GameObjects.Sprite | null): void {
    // Play level-up sound (Req 6.5, 8.5)
    this.audioManager.playLevelUp();

    // Show "Upgraded!" floating text in green near terminal (Req 6.6)
    if (terminalSprite) {
      this.showFloatingText(
        terminalSprite.x,
        terminalSprite.y,
        'Upgraded!',
        '#00ff00',
      );

      // Play UI_Pulse on terminal sprite: scale to 1.2x over 200ms, return over 200ms (Req 6.7)
      this.playTerminalPulse(terminalSprite);

      // Flash terminal white for 200ms (Task 10.2, Req 9.5)
      this.flashTerminalWhite(terminalSprite);
    }
  }

  // ── Machine floating text helper (Task 13.2, Req 7.6) ───────────────

  /**
   * Show floating text near a machine sprite. Used for machine state transition
   * floating text events (blocked, full).
   *
   * @param machineIndex - Index of the machine
   * @param message - Text to display
   * @param color - CSS color string
   */
  private showMachineFloatingText(machineIndex: number, message: string, color: string): void {
    const spriteDef = this.machineSpriteDefs[machineIndex];
    if (!spriteDef) return;

    const ls = this.layoutSystem;
    const screenX = ls.scaleX(spriteDef.baseX);
    const screenY = ls.scaleY(spriteDef.baseY);

    this.showFloatingText(screenX, screenY, message, color);
  }

  // ── Automation floating text (Task 13.1, Req 7.6, 8.5) ─────────────

  /**
   * Show "Auto" floating text in cyan near a machine when automation processes an item.
   * Called from GameScene after the automation system update loop.
   *
   * @param machineIndex - Index of the machine that auto-processed
   */
  showAutomationFloatingText(machineIndex: number): void {
    const spriteDef = this.machineSpriteDefs[machineIndex];
    if (!spriteDef) return;

    const ls = this.layoutSystem;
    const screenX = ls.scaleX(spriteDef.baseX);
    const screenY = ls.scaleY(spriteDef.baseY);

    this.showFloatingText(screenX, screenY, 'Auto', '#00ccff');
  }

  // ── Resize handler (Task 12.6, Req 1.1) ─────────────────────────────

  /**
   * Reposition all FeedbackManager UI elements on resize.
   * Status lights and interaction hints are repositioned each frame via
   * renderStatusLights() and renderInteractionHints(), so they auto-adapt.
   * This method handles any active floating texts that need repositioning.
   */
  handleResize(): void {
    // Status lights and hints are repositioned every frame in their render methods,
    // so they automatically adapt to resize. Floating texts are screen-positioned
    // at creation time and short-lived, so they don't need repositioning.
    // Terminal hint is also repositioned every frame in renderInteractionHints.
    // This method exists as a hook for future resize-sensitive elements.
  }

  /**
   * Play a UI_Pulse animation on the terminal sprite.
   * Scales to 1.2x over 200ms, returns to 1.0x over 200ms. Total: 400ms.
   */
  private playTerminalPulse(sprite: Phaser.GameObjects.Sprite): void {
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;

    this.scene.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 1.2,
      scaleY: baseScaleY * 1.2,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.tweens.add({
          targets: sprite,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 200,
          ease: 'Quad.easeIn',
        });
      },
    });
  }
}
