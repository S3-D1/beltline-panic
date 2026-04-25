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
  machine1: 'MACHINE 1',
  machine2: 'MACHINE 2',
  machine3: 'MACHINE 3',
};

const UPGRADE_LABELS: Record<UpgradeType, string> = {
  capacity: 'Capacity',
  quality: 'Quality',
  speed: 'Speed',
  automation: 'Automation',
};

const ARROW_MAP: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

// Modal styling — matches MachineInputOverlay palette
const BG_COLOR = 0x1a1a2e;
const BG_ALPHA = 1.0;
const BORDER_COLOR = 0x3a3a5e;
const ROW_DIVIDER_COLOR = 0x3a3a5e;

// Terminal position in base resolution (from GameScene)
const TERMINAL_X = (LAYOUT.BELT_X + LAYOUT.BELT_THICKNESS + (LAYOUT.CENTER_X - LAYOUT.NODE_OFFSET - LAYOUT.NODE_SIZE / 2)) / 2;
const TERMINAL_TOP_Y = LAYOUT.CENTER_Y - (LAYOUT.STATION_W * 2) / 2 + 12;

// Modal anchored so its bottom edge meets the terminal top
const MODAL_BASE_X = TERMINAL_X;
const MODAL_WIDTH = 240;
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 36;
const HINT_HEIGHT = 20;

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

  setFeedbackManager(feedbackManager: FeedbackManager): void {
    this.feedbackManager = feedbackManager;
  }

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
        const isMaxBefore = this.gameManager.isMaxLevel(this.selectedMachineId, upgradeType);

        if (isMaxBefore) {
          if (this.feedbackManager && this.terminalSprite) {
            this.feedbackManager.showFloatingText(
              this.terminalSprite.x, this.terminalSprite.y, 'MAX', '#ffcc00',
            );
          }
        } else {
          const success = this.gameManager.attemptPurchase(this.selectedMachineId, upgradeType);
          if (success && this.feedbackManager) {
            this.feedbackManager.playUpgradeFeedback(this.terminalSprite);
          }
        }

        this.destroyUI();
        this.renderUpgradeSelect();
      }
    }
  }

  private destroyUI(): void {
    for (const el of this.uiElements) el.destroy();
    this.uiElements = [];
  }

  // ── Machine select modal ──────────────────────────────────────────

  private renderMachineSelect(): void {
    this.destroyUI();
    const ls = this.layoutSystem;
    const rows = 3;
    const totalHeight = HEADER_HEIGHT + rows * ROW_HEIGHT + HINT_HEIGHT;
    const bottomY = TERMINAL_TOP_Y;
    const modalCenterY = bottomY - totalHeight / 2;
    const topY = bottomY - totalHeight;
    const pad = 12;

    const bg = this.scene.add.rectangle(
      ls.scaleX(MODAL_BASE_X), ls.scaleY(modalCenterY),
      ls.scaleValue(MODAL_WIDTH), ls.scaleValue(totalHeight),
      BG_COLOR, BG_ALPHA,
    ).setOrigin(0.5, 0.5).setDepth(10);
    bg.setStrokeStyle(ls.scaleValue(1), BORDER_COLOR, 1);
    this.uiElements.push(bg);

    const headerY = topY + HEADER_HEIGHT / 2;
    this.uiElements.push(this.scene.add.text(
      ls.scaleX(MODAL_BASE_X), ls.scaleY(headerY), 'SELECT MACHINE',
      { fontFamily: 'monospace', fontSize: `${ls.scaleFontSize(12)}px`, color: '#ffcc00' },
    ).setOrigin(0.5, 0.5).setDepth(11));

    this.addDivider(ls, topY + HEADER_HEIGHT);

    const machines: { dir: Direction; label: string }[] = [
      { dir: 'up', label: 'Machine 1' },
      { dir: 'right', label: 'Machine 2' },
      { dir: 'down', label: 'Machine 3' },
    ];

    for (let i = 0; i < machines.length; i++) {
      const m = machines[i];
      const cy = topY + HEADER_HEIGHT + ROW_HEIGHT * i + ROW_HEIGHT / 2;
      const arrow = ARROW_MAP[m.dir];
      const fs = ls.scaleFontSize(11);

      this.uiElements.push(this.scene.add.text(
        ls.scaleX(MODAL_BASE_X - MODAL_WIDTH / 2 + pad), ls.scaleY(cy),
        `${arrow} ${m.label}`,
        { fontFamily: 'monospace', fontSize: `${fs}px`, color: '#ffffff' },
      ).setOrigin(0, 0.5).setDepth(11));

      this.uiElements.push(this.scene.add.text(
        ls.scaleX(MODAL_BASE_X + MODAL_WIDTH / 2 - pad), ls.scaleY(cy),
        `[${arrow}]`,
        { fontFamily: 'monospace', fontSize: `${ls.scaleFontSize(10)}px`, color: '#666688' },
      ).setOrigin(1, 0.5).setDepth(11));

      if (i < machines.length - 1) {
        this.addDivider(ls, topY + HEADER_HEIGHT + ROW_HEIGHT * (i + 1));
      }
    }

    this.uiElements.push(this.scene.add.text(
      ls.scaleX(MODAL_BASE_X), ls.scaleY(topY + totalHeight - HINT_HEIGHT / 2),
      '[Space] close',
      { fontFamily: 'monospace', fontSize: `${ls.scaleFontSize(9)}px`, color: '#888888' },
    ).setOrigin(0.5, 0.5).setDepth(11));
  }

  // ── Upgrade select modal ──────────────────────────────────────────

  private renderUpgradeSelect(): void {
    this.destroyUI();
    if (!this.selectedMachineId) return;

    const ls = this.layoutSystem;
    const budget = this.gameManager.getBudget();
    const rows = 4;
    const totalHeight = HEADER_HEIGHT + rows * ROW_HEIGHT + HINT_HEIGHT;
    const bottomY = TERMINAL_TOP_Y;
    const modalCenterY = bottomY - totalHeight / 2;
    const topY = bottomY - totalHeight;
    const pad = 12;

    const bg = this.scene.add.rectangle(
      ls.scaleX(MODAL_BASE_X), ls.scaleY(modalCenterY),
      ls.scaleValue(MODAL_WIDTH), ls.scaleValue(totalHeight),
      BG_COLOR, BG_ALPHA,
    ).setOrigin(0.5, 0.5).setDepth(10);
    bg.setStrokeStyle(ls.scaleValue(1), BORDER_COLOR, 1);
    this.uiElements.push(bg);

    // Header: machine name + money on same line
    const machineName = MACHINE_LABELS[this.selectedMachineId] || this.selectedMachineId;
    const headerY = topY + HEADER_HEIGHT / 2;

    this.uiElements.push(this.scene.add.text(
      ls.scaleX(MODAL_BASE_X - MODAL_WIDTH / 2 + pad), ls.scaleY(headerY),
      machineName,
      { fontFamily: 'monospace', fontSize: `${ls.scaleFontSize(11)}px`, color: '#ffcc00' },
    ).setOrigin(0, 0.5).setDepth(11));

    this.uiElements.push(this.scene.add.text(
      ls.scaleX(MODAL_BASE_X + MODAL_WIDTH / 2 - pad), ls.scaleY(headerY),
      `$${budget}`,
      { fontFamily: 'monospace', fontSize: `${ls.scaleFontSize(11)}px`, color: '#aaaaaa' },
    ).setOrigin(1, 0.5).setDepth(11));

    this.addDivider(ls, topY + HEADER_HEIGHT);

    // Upgrade rows — single line each
    const upgradeRows: { dir: Direction; type: UpgradeType }[] = [
      { dir: 'up', type: 'capacity' },
      { dir: 'left', type: 'speed' },
      { dir: 'down', type: 'quality' },
      { dir: 'right', type: 'automation' },
    ];

    for (let i = 0; i < upgradeRows.length; i++) {
      const { dir, type } = upgradeRows[i];
      const cy = topY + HEADER_HEIGHT + ROW_HEIGHT * i + ROW_HEIGHT / 2;
      this.renderUpgradeRow(ls, cy, dir, type, pad);

      if (i < upgradeRows.length - 1) {
        this.addDivider(ls, topY + HEADER_HEIGHT + ROW_HEIGHT * (i + 1));
      }
    }

    this.uiElements.push(this.scene.add.text(
      ls.scaleX(MODAL_BASE_X), ls.scaleY(topY + totalHeight - HINT_HEIGHT / 2),
      '[Space] back',
      { fontFamily: 'monospace', fontSize: `${ls.scaleFontSize(9)}px`, color: '#888888' },
    ).setOrigin(0.5, 0.5).setDepth(11));
  }

  /** Render a single-line upgrade row: ↑ Cap  2/10  $15 */
  private renderUpgradeRow(
    ls: LayoutSystem, cy: number, dir: Direction, type: UpgradeType, pad: number,
  ): void {
    if (!this.selectedMachineId) return;

    const level = this.gameManager.getUpgradeLevel(this.selectedMachineId, type);
    const isMax = level >= UPGRADE_CONFIG.maxLevel;
    const cost = this.gameManager.getUpgradeCost(this.selectedMachineId, type);
    const canAfford = this.gameManager.getBudget() >= cost;
    const arrow = ARROW_MAP[dir];
    const label = UPGRADE_LABELS[type];
    const fs = ls.scaleFontSize(10);
    const leftX = MODAL_BASE_X - MODAL_WIDTH / 2 + pad;
    const rightX = MODAL_BASE_X + MODAL_WIDTH / 2 - pad;

    // Arrow + short name
    this.uiElements.push(this.scene.add.text(
      ls.scaleX(leftX), ls.scaleY(cy),
      `${arrow} ${label}`,
      { fontFamily: 'monospace', fontSize: `${fs}px`, color: '#ffffff' },
    ).setOrigin(0, 0.5).setDepth(11));

    // Level
    this.uiElements.push(this.scene.add.text(
      ls.scaleX(MODAL_BASE_X + 16), ls.scaleY(cy),
      `${level}/${UPGRADE_CONFIG.maxLevel}`,
      { fontFamily: 'monospace', fontSize: `${fs}px`, color: '#aaaaaa' },
    ).setOrigin(0.5, 0.5).setDepth(11));

    // Cost
    let costStr: string;
    let costColor: string;
    if (isMax) {
      costStr = 'MAX';
      costColor = '#ffcc00';
    } else {
      costStr = `$${cost}`;
      costColor = canAfford ? '#00ff00' : '#ff4444';
    }

    this.uiElements.push(this.scene.add.text(
      ls.scaleX(rightX), ls.scaleY(cy),
      costStr,
      { fontFamily: 'monospace', fontSize: `${fs}px`, color: costColor },
    ).setOrigin(1, 0.5).setDepth(11));
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private addDivider(ls: LayoutSystem, baseY: number): void {
    const left = MODAL_BASE_X - MODAL_WIDTH / 2 + 6;
    const right = MODAL_BASE_X + MODAL_WIDTH / 2 - 6;
    const line = this.scene.add.line(
      0, 0,
      ls.scaleX(left), ls.scaleY(baseY),
      ls.scaleX(right), ls.scaleY(baseY),
      ROW_DIVIDER_COLOR, 0.6,
    ).setOrigin(0, 0).setDepth(11);
    this.uiElements.push(line);
  }

  private getUpgradePreview(type: UpgradeType, currentLevel: number): string {
    const nextLevel = currentLevel + 1;
    switch (type) {
      case 'speed': return `${AUTOMATION_SPEED_TABLE[currentLevel]}ms→${AUTOMATION_SPEED_TABLE[nextLevel]}ms`;
      case 'capacity': return `${CAPACITY_TABLE[currentLevel]}→${CAPACITY_TABLE[nextLevel]} slots`;
      case 'quality': return `${QUALITY_MODIFIER_TABLE[currentLevel].toFixed(2)}x→${QUALITY_MODIFIER_TABLE[nextLevel].toFixed(2)}x`;
      case 'automation': return `${AUTOMATION_LEVEL_TABLE[currentLevel]}→${AUTOMATION_LEVEL_TABLE[nextLevel]} auto`;
    }
  }
}
