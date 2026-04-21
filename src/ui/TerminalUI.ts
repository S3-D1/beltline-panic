import Phaser from 'phaser';
import { Direction } from '../data/MachineConfig';
import {
  UpgradeType,
  UPGRADE_DIRECTION_MAP,
  MACHINE_DIRECTION_MAP,
  UPGRADE_CONFIG,
} from '../data/UpgradeConfig';
import { GameManager } from '../systems/GameManager';
import { LayoutSystem } from '../systems/LayoutSystem';
import { LAYOUT } from '../systems/InputSystem';

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

  constructor(scene: Phaser.Scene, layoutSystem: LayoutSystem, gameManager: GameManager) {
    this.scene = scene;
    this.layoutSystem = layoutSystem;
    this.gameManager = gameManager;
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
        this.gameManager.attemptPurchase(this.selectedMachineId, upgradeType);
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

    // Background overlay
    const bg = this.scene.add.rectangle(
      cx, cy,
      ls.scaleValue(320), ls.scaleValue(280),
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

      // Button background rectangle
      const btnBg = this.scene.add.rectangle(
        bx, by,
        ls.scaleValue(100), ls.scaleValue(44),
        0x333333, 0.9,
      );
      this.uiElements.push(btnBg);

      // Upgrade type label
      const typeText = this.scene.add.text(bx, by - ls.scaleValue(8), label, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
      }).setOrigin(0.5, 0.5);
      this.uiElements.push(typeText);

      // Cost or MAX label
      let costStr: string;
      let costColor: string;
      if (isMax) {
        costStr = 'MAX';
        costColor = '#ffcc00';
      } else {
        costStr = `$${cost}`;
        costColor = canAfford ? '#00ff00' : '#ff0000';
      }

      const costText = this.scene.add.text(bx, by + ls.scaleValue(8), costStr, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: costColor,
      }).setOrigin(0.5, 0.5);
      this.uiElements.push(costText);
    }

    // Hint
    const hint = this.scene.add.text(cx, cy + offset + ls.scaleValue(40), '[Interact to go back]', {
      fontFamily: 'monospace',
      fontSize: `${ls.scaleFontSize(12)}px`,
      color: '#888888',
    }).setOrigin(0.5, 0.5);
    this.uiElements.push(hint);
  }
}
