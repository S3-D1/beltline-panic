import Phaser from 'phaser';
import { Direction } from '../data/MachineConfig';
import {
  UpgradeType,
  UPGRADE_DIRECTION_MAP,
  MACHINE_DIRECTION_MAP,
  UPGRADE_CONFIG,
  AUTOMATION_SPEED_TABLE,
  CAPACITY_TABLE,
  QUALITY_MODIFIER_TABLE,
  AUTOMATION_LEVEL_TABLE,
} from '../data/UpgradeConfig';
import { GameManager } from '../systems/GameManager';
import { LayoutSystem } from '../systems/LayoutSystem';
import { LAYOUT } from '../systems/InputSystem';
import { FeedbackManager } from '../systems/FeedbackManager';

export type TerminalPhase = 'machine-select' | 'upgrade-select';

const MACHINE_LABELS: Record<string, string> = {
  machine1: 'Machine 1',
  machine2: 'Machine 2',
  machine3: 'Machine 3',
};

const UPGRADE_LABELS: Record<UpgradeType, string> = {
  capacity: 'Capacity',
  quality: 'Quality',
  speed: 'Speed',
  automation: 'Automation',
};

export class TerminalUI {
  private scene: Phaser.Scene;
  private layoutSystem: LayoutSystem;
  private gameManager: GameManager;
  private phase: TerminalPhase = 'machine-select';
  private selectedMachineId: string | null = null;
  private active: boolean = false;
  private uiElements: Phaser.GameObjects.GameObject[] = [];
  private feedbackManager: FeedbackManager | null = null;
  private terminalSprite: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Phaser.Scene, layoutSystem: LayoutSystem, gameManager: GameManager) {
    this.scene = scene;
    this.layoutSystem = layoutSystem;
    this.gameManager = gameManager;
  }

  /** Set the FeedbackManager reference for upgrade purchase feedback (Task 9.3) */
  setFeedbackManager(feedbackManager: FeedbackManager): void {
    this.feedbackManager = feedbackManager;
  }

  /** Set the terminal sprite reference for UI_Pulse effects (Task 9.3) */
  setTerminalSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.terminalSprite = sprite;
  }

  open(): void {
    this.active = true;
    this.phase = 'machine-select';
    this.selectedMachineId = null;
    this.renderMachineSelect();
  }

  close(): void {
    this.active = false;
    this.selectedMachineId = null;
    this.destroyUI();
  }

  isActive(): boolean {
    return this.active;
  }

  getPhase(): TerminalPhase {
    return this.phase;
  }

  getSelectedMachineId(): string | null {
    return this.selectedMachineId;
  }

  handleInput(direction: Direction | null, interact: boolean): void {
    if (!this.active) return;

    if (interact) {
      if (this.phase === 'machine-select') {
        this.close();
      } else if (this.phase === 'upgrade-select') {
        this.phase = 'machine-select';
        this.selectedMachineId = null;
        this.destroyUI();
        this.renderMachineSelect();
      }
      return;
    }

    if (!direction) return;

    if (this.phase === 'machine-select') {
      const machineId = MACHINE_DIRECTION_MAP[direction];
      if (machineId !== null) {
        this.selectedMachineId = machineId;
        this.phase = 'upgrade-select';
        this.destroyUI();
        this.renderUpgradeSelect();
      }
    } else if (this.phase === 'upgrade-select') {
      const upgradeType = UPGRADE_DIRECTION_MAP[direction];
      if (upgradeType && this.selectedMachineId) {
        // Check if already at max level before attempting purchase (Task 9.3)
        const isMaxBefore = this.gameManager.isMaxLevel(this.selectedMachineId, upgradeType);

        if (isMaxBefore) {
          // At max level — show "MAX" floating text in yellow (Req 6.8)
          if (this.feedbackManager && this.terminalSprite) {
            this.feedbackManager.showFloatingText(
              this.terminalSprite.x,
              this.terminalSprite.y,
              'MAX',
              '#ffcc00',
            );
          }
        } else {
          const success = this.gameManager.attemptPurchase(this.selectedMachineId, upgradeType);

          if (success && this.feedbackManager) {
            // Successful purchase — play level-up sound, show "Upgraded!" text, pulse terminal (Req 6.5, 6.6, 6.7, 8.5)
            this.feedbackManager.playUpgradeFeedback(this.terminalSprite);
          }
        }

        this.destroyUI();
        this.renderUpgradeSelect();
      }
    }
  }

  private destroyUI(): void {
    for (const el of this.uiElements) {
      el.destroy();
    }
    this.uiElements = [];
  }

  private renderMachineSelect(): void {
    this.destroyUI();

    const ls = this.layoutSystem;
    const cx = ls.scaleX(LAYOUT.CENTER_X);
    const cy = ls.scaleY(LAYOUT.CENTER_Y);
    const offset = ls.scaleValue(80);
    const fontSize = ls.scaleFontSize(16);
    const titleFontSize = ls.scaleFontSize(20);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    };

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: `${titleFontSize}px`,
      color: '#ffcc00',
    };

    // Background overlay
    const bg = this.scene.add.rectangle(
      cx, cy,
      ls.scaleValue(300), ls.scaleValue(250),
      0x000000, 0.85,
    );
    this.uiElements.push(bg);

    // Title
    const title = this.scene.add.text(cx, cy - offset - ls.scaleValue(20), 'UPGRADE TERMINAL', titleStyle)
      .setOrigin(0.5, 0.5);
    this.uiElements.push(title);

    // Up = Machine 1
    const upLabel = this.scene.add.text(cx, cy - offset + ls.scaleValue(10), '↑ Machine 1', textStyle)
      .setOrigin(0.5, 0.5);
    this.uiElements.push(upLabel);

    // Right = Machine 2
    const rightLabel = this.scene.add.text(cx + offset, cy, 'Machine 2 →', textStyle)
      .setOrigin(0.5, 0.5);
    this.uiElements.push(rightLabel);

    // Down = Machine 3
    const downLabel = this.scene.add.text(cx, cy + offset, '↓ Machine 3', textStyle)
      .setOrigin(0.5, 0.5);
    this.uiElements.push(downLabel);

    // Left = no option
    const leftLabel = this.scene.add.text(cx - offset, cy, '—', { ...textStyle, color: '#666666' })
      .setOrigin(0.5, 0.5);
    this.uiElements.push(leftLabel);

    // Hint
    const hint = this.scene.add.text(cx, cy + offset + ls.scaleValue(30), '[Interact to close]', {
      ...textStyle,
      fontSize: `${ls.scaleFontSize(12)}px`,
      color: '#888888',
    }).setOrigin(0.5, 0.5);
    this.uiElements.push(hint);
  }

  private renderUpgradeSelect(): void {
    this.destroyUI();

    if (!this.selectedMachineId) return;

    const ls = this.layoutSystem;
    const cx = ls.scaleX(LAYOUT.CENTER_X);
    const cy = ls.scaleY(LAYOUT.CENTER_Y);
    const offset = ls.scaleValue(80);
    const fontSize = ls.scaleFontSize(14);
    const titleFontSize = ls.scaleFontSize(18);
    const budget = this.gameManager.getBudget();

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: `${titleFontSize}px`,
      color: '#ffcc00',
    };

    // Background overlay — slightly taller to fit level + preview text
    const bg = this.scene.add.rectangle(
      cx, cy,
      ls.scaleValue(320), ls.scaleValue(300),
      0x000000, 0.85,
    );
    this.uiElements.push(bg);

    // Machine name title
    const machineName = MACHINE_LABELS[this.selectedMachineId] || this.selectedMachineId;
    const title = this.scene.add.text(cx, cy - offset - ls.scaleValue(30), machineName, titleStyle)
      .setOrigin(0.5, 0.5);
    this.uiElements.push(title);

    // Render four upgrade buttons in cross pattern
    const directions: { dir: Direction; dx: number; dy: number }[] = [
      { dir: 'up', dx: 0, dy: -offset },
      { dir: 'right', dx: offset + ls.scaleValue(10), dy: 0 },
      { dir: 'down', dx: 0, dy: offset },
      { dir: 'left', dx: -(offset + ls.scaleValue(10)), dy: 0 },
    ];

    for (const { dir, dx, dy } of directions) {
      const upgradeType = UPGRADE_DIRECTION_MAP[dir];
      const label = UPGRADE_LABELS[upgradeType];
      const level = this.gameManager.getUpgradeLevel(this.selectedMachineId, upgradeType);
      const isMax = level >= UPGRADE_CONFIG.maxLevel;
      const cost = this.gameManager.getUpgradeCost(this.selectedMachineId, upgradeType);
      const canAfford = budget >= cost;

      const bx = cx + dx;
      const by = cy + dy;
      const smallFontSize = ls.scaleFontSize(10);

      // Button background rectangle — taller to fit level + preview text
      const btnBg = this.scene.add.rectangle(
        bx, by,
        ls.scaleValue(120), ls.scaleValue(60),
        0x333333, 0.9,
      );
      this.uiElements.push(btnBg);

      // Upgrade type label + level display (Task 9.1, Req 6.1)
      const levelStr = `${level} / ${UPGRADE_CONFIG.maxLevel}`;
      const typeText = this.scene.add.text(bx, by - ls.scaleValue(18), `${label}  ${levelStr}`, {
        fontFamily: 'monospace',
        fontSize: `${ls.scaleFontSize(11)}px`,
        color: '#ffffff',
      }).setOrigin(0.5, 0.5);
      this.uiElements.push(typeText);

      // Cost or MAX label (Req 6.3, 6.4)
      let costStr: string;
      let costColor: string;
      if (isMax) {
        costStr = 'MAX';
        costColor = '#ffcc00';
      } else {
        costStr = `${cost}`;
        costColor = canAfford ? '#00ff00' : '#ff0000';
      }

      const costText = this.scene.add.text(bx, by - ls.scaleValue(4), costStr, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: costColor,
      }).setOrigin(0.5, 0.5);
      this.uiElements.push(costText);

      // Next-upgrade preview or hide when at max (Task 9.2, Req 6.2, 6.3, 10.3, 10.4)
      if (!isMax) {
        const previewStr = this.getUpgradePreview(upgradeType, level);
        const previewText = this.scene.add.text(bx, by + ls.scaleValue(12), previewStr, {
          fontFamily: 'monospace',
          fontSize: `${smallFontSize}px`,
          color: '#aaaaaa',
        }).setOrigin(0.5, 0.5);
        this.uiElements.push(previewText);
      }
    }

    // Hint
    const hint = this.scene.add.text(cx, cy + offset + ls.scaleValue(40), '[Interact to go back]', {
      fontFamily: 'monospace',
      fontSize: `${ls.scaleFontSize(12)}px`,
      color: '#888888',
    }).setOrigin(0.5, 0.5);
    this.uiElements.push(hint);
  }

  /**
   * Get a human-readable preview string for the next upgrade level.
   * Uses the upgrade tables to show current → next values.
   * (Task 9.2, Req 6.2, 10.3, 10.4)
   */
  private getUpgradePreview(type: UpgradeType, currentLevel: number): string {
    const nextLevel = currentLevel + 1;

    switch (type) {
      case 'speed': {
        const current = AUTOMATION_SPEED_TABLE[currentLevel];
        const next = AUTOMATION_SPEED_TABLE[nextLevel];
        return `${current}ms → ${next}ms`;
      }
      case 'capacity': {
        const current = CAPACITY_TABLE[currentLevel];
        const next = CAPACITY_TABLE[nextLevel];
        return `Cap: ${current} → ${next}`;
      }
      case 'quality': {
        const current = QUALITY_MODIFIER_TABLE[currentLevel];
        const next = QUALITY_MODIFIER_TABLE[nextLevel];
        return `Qual: ${current.toFixed(2)}x → ${next.toFixed(2)}x`;
      }
      case 'automation': {
        const current = AUTOMATION_LEVEL_TABLE[currentLevel];
        const next = AUTOMATION_LEVEL_TABLE[nextLevel];
        return `Auto: ${current} → ${next}`;
      }
    }
  }
}
