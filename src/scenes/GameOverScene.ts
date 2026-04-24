import Phaser from 'phaser';
import { LayoutSystem } from '../systems/LayoutSystem';
import { ScoreStorage, isAllowedChar } from '../utils/ScoreStorage';
import { PALETTE } from '../rendering/Palette';

/** Convert a numeric hex color (0xRRGGBB) to a CSS hex string (#RRGGBB). */
function hexColor(value: number): string {
  return '#' + value.toString(16).padStart(6, '0');
}

const MAX_NAME_LENGTH = 12;

export class GameOverScene extends Phaser.Scene {
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private scoreStorage: ScoreStorage;
  private phase: 'nameInput' | 'scoreboard' = 'nameInput';
  private finalScore: number = 0;
  private currentName: string = '';
  private savedTimestamp: number | null = null;

  // Name Input UI text objects
  private titleText: Phaser.GameObjects.Text | null = null;
  private scoreDisplayText: Phaser.GameObjects.Text | null = null;
  private promptText: Phaser.GameObjects.Text | null = null;
  private nameDisplayText: Phaser.GameObjects.Text | null = null;

  // Scoreboard UI text objects (stored for resize repositioning)
  private scoreboardTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'GameOverScene' });
    this.scoreStorage = new ScoreStorage();
  }

  init(data: { score?: number }): void {
    const raw = Number(data?.score);
    this.finalScore = Number.isFinite(raw) ? raw : 0;
  }

  create(): void {
    this.layoutSystem.update(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layoutSystem.update(gameSize.width, gameSize.height);
      this.repositionNameInput();
      this.repositionScoreboard();
    });

    // Initialize phase state
    this.phase = 'nameInput';
    this.currentName = '';
    this.savedTimestamp = null;

    this.showNameInput();
  }

  // --- Name Input phase (Task 3.2) ---

  /** Name Input phase: display title, score, prompt, and capture keyboard input. */
  private showNameInput(): void {
    const primaryColor = hexColor(PALETTE.TEXT_PRIMARY);
    const accentColor = hexColor(PALETTE.TEXT_ACCENT);

    // "GAME OVER" title
    this.titleText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(160),
      'GAME OVER',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(48)}px`,
        fontFamily: 'monospace',
        color: primaryColor,
      }
    ).setOrigin(0.5);

    // Final score display
    this.scoreDisplayText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(230),
      `Score: ${this.finalScore}`,
      {
        fontSize: `${this.layoutSystem.scaleFontSize(28)}px`,
        fontFamily: 'monospace',
        color: accentColor,
      }
    ).setOrigin(0.5);

    // "Enter your name:" prompt
    this.promptText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(310),
      'Enter your name:',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
        fontFamily: 'monospace',
        color: primaryColor,
      }
    ).setOrigin(0.5);

    // Current name text (updates as player types)
    this.nameDisplayText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(360),
      '_',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(28)}px`,
        fontFamily: 'monospace',
        color: accentColor,
      }
    ).setOrigin(0.5);

    // Listen for keyboard input
    this.input.keyboard!.on('keydown', this.handleKeyInput, this);
  }

  /** Handle individual key presses during name input. */
  private handleKeyInput(event: KeyboardEvent): void {
    if (this.phase !== 'nameInput') return;

    if (event.key === 'Enter') {
      if (this.currentName.length > 0) {
        this.confirmName();
      }
      return;
    }

    if (event.key === 'Backspace') {
      if (this.currentName.length > 0) {
        this.currentName = this.currentName.slice(0, -1);
        this.updateNameDisplay();
      }
      return;
    }

    // Only accept allowed characters, enforce max length
    if (isAllowedChar(event.key) && this.currentName.length < MAX_NAME_LENGTH) {
      this.currentName += event.key;
      this.updateNameDisplay();
    }
  }

  /** Update the name display text to reflect the current name. */
  private updateNameDisplay(): void {
    if (this.nameDisplayText) {
      this.nameDisplayText.setText(this.currentName.length > 0 ? this.currentName : '_');
    }
  }

  /** Confirm the entered name, save the score, and transition to scoreboard phase. */
  private confirmName(): void {
    const savedList = this.scoreStorage.saveScore(this.currentName, this.finalScore);

    // Find the just-saved entry by matching name, score, and picking the latest timestamp
    const matchingEntries = savedList.filter(
      e => e.name === this.currentName && e.score === this.finalScore
    );
    if (matchingEntries.length > 0) {
      // Pick the entry with the largest (most recent) timestamp
      this.savedTimestamp = Math.max(...matchingEntries.map(e => e.timestamp));
    }

    // Remove keyboard listener for name input
    this.input.keyboard!.off('keydown', this.handleKeyInput, this);

    // Transition to scoreboard phase
    this.phase = 'scoreboard';
    this.showScoreboard();
  }

  /** Reposition all name input text objects on resize. */
  private repositionNameInput(): void {
    if (this.phase !== 'nameInput') return;

    if (this.titleText) {
      this.titleText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(160)
      );
      this.titleText.setFontSize(this.layoutSystem.scaleFontSize(48));
    }

    if (this.scoreDisplayText) {
      this.scoreDisplayText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(230)
      );
      this.scoreDisplayText.setFontSize(this.layoutSystem.scaleFontSize(28));
    }

    if (this.promptText) {
      this.promptText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(310)
      );
      this.promptText.setFontSize(this.layoutSystem.scaleFontSize(20));
    }

    if (this.nameDisplayText) {
      this.nameDisplayText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(360)
      );
      this.nameDisplayText.setFontSize(this.layoutSystem.scaleFontSize(28));
    }
  }

  // --- Stub methods (filled in by tasks 3.3, 3.4) ---

  /** Scoreboard phase: display ranked scores and highlight the just-saved entry. */
  private showScoreboard(): void {
    // Destroy name input UI elements
    if (this.titleText) { this.titleText.destroy(); this.titleText = null; }
    if (this.scoreDisplayText) { this.scoreDisplayText.destroy(); this.scoreDisplayText = null; }
    if (this.promptText) { this.promptText.destroy(); this.promptText = null; }
    if (this.nameDisplayText) { this.nameDisplayText.destroy(); this.nameDisplayText = null; }

    const primaryColor = hexColor(PALETTE.TEXT_PRIMARY);
    const accentColor = hexColor(PALETTE.TEXT_ACCENT);
    this.scoreboardTexts = [];

    // "TOP SCORES" header
    const headerText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(80),
      'TOP SCORES',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(36)}px`,
        fontFamily: 'monospace',
        color: accentColor,
      }
    ).setOrigin(0.5);
    this.scoreboardTexts.push(headerText);

    const scores = this.scoreStorage.getScores();

    if (scores.length === 0) {
      // Empty state
      const emptyText = this.add.text(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(300),
        'No scores recorded yet',
        {
          fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
          fontFamily: 'monospace',
          color: primaryColor,
        }
      ).setOrigin(0.5);
      this.scoreboardTexts.push(emptyText);
    } else {
      // Render each score entry
      const startY = 140;
      const rowSpacing = 36;

      for (let i = 0; i < scores.length; i++) {
        const entry = scores[i];
        const isHighlighted = this.savedTimestamp !== null && entry.timestamp === this.savedTimestamp;
        const color = isHighlighted ? accentColor : primaryColor;
        const rank = i + 1;
        const label = `${String(rank).padStart(2, ' ')}. ${entry.name.padEnd(12, ' ')}  ${entry.score}`;

        const entryText = this.add.text(
          this.layoutSystem.scaleX(400),
          this.layoutSystem.scaleY(startY + i * rowSpacing),
          label,
          {
            fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
            fontFamily: 'monospace',
            color,
          }
        ).setOrigin(0.5);
        this.scoreboardTexts.push(entryText);
      }
    }

    // "Press any key or tap to restart" prompt at the bottom
    const restartPrompt = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(540),
      'Press any key or tap to restart',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(18)}px`,
        fontFamily: 'monospace',
        color: primaryColor,
      }
    ).setOrigin(0.5);
    this.scoreboardTexts.push(restartPrompt);

    this.setupRestartListeners();
  }

  /** Reposition all scoreboard text objects on resize. */
  private repositionScoreboard(): void {
    if (this.phase !== 'scoreboard') return;
    if (this.scoreboardTexts.length === 0) return;

    const scores = this.scoreStorage.getScores();

    // Header is always index 0
    const header = this.scoreboardTexts[0];
    header.setPosition(this.layoutSystem.scaleX(400), this.layoutSystem.scaleY(80));
    header.setFontSize(this.layoutSystem.scaleFontSize(36));

    if (scores.length === 0) {
      // Empty state text is index 1
      if (this.scoreboardTexts.length > 1) {
        const emptyText = this.scoreboardTexts[1];
        emptyText.setPosition(this.layoutSystem.scaleX(400), this.layoutSystem.scaleY(300));
        emptyText.setFontSize(this.layoutSystem.scaleFontSize(20));
      }
    } else {
      // Score entries start at index 1
      const startY = 140;
      const rowSpacing = 36;
      for (let i = 0; i < scores.length; i++) {
        const textObj = this.scoreboardTexts[1 + i];
        if (textObj) {
          textObj.setPosition(
            this.layoutSystem.scaleX(400),
            this.layoutSystem.scaleY(startY + i * rowSpacing)
          );
          textObj.setFontSize(this.layoutSystem.scaleFontSize(20));
        }
      }
    }

    // Restart prompt is always the last element
    const restartPrompt = this.scoreboardTexts[this.scoreboardTexts.length - 1];
    if (restartPrompt && restartPrompt !== header) {
      restartPrompt.setPosition(this.layoutSystem.scaleX(400), this.layoutSystem.scaleY(540));
      restartPrompt.setFontSize(this.layoutSystem.scaleFontSize(18));
    }
  }

  /** Set up any-key / tap listeners for restarting. */
  private setupRestartListeners(): void {
    this.input.keyboard!.once('keydown', this.startNewRun, this);
    this.input.once('pointerdown', this.startNewRun, this);
  }

  /** Transition to a fresh GameScene run. */
  private startNewRun(): void {
    this.scene.start('GameScene');
  }
}
