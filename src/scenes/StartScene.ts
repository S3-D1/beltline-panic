import Phaser from 'phaser';
import { LAYOUT } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';
import { AudioManager } from '../systems/AudioManager';
import { MuteButtonUI } from '../ui/MuteButtonUI';
import { ASSET_KEYS } from '../data/AssetKeys';

/** Base-resolution layout constants. */
const PADDING = 60;
const TITLE_Y = 120;
const PRE_GAME_Y = 340;
const PROMPT_Y = LAYOUT.SCENE_H - PADDING; // 540

export class StartScene extends Phaser.Scene {
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private titleImage!: Phaser.GameObjects.Image;
  private preGameImage!: Phaser.GameObjects.Image;
  private promptText!: Phaser.GameObjects.Text;
  private muteButton!: MuteButtonUI;

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.layoutSystem.update(this.scale.width, this.scale.height);

    const ls = this.layoutSystem;
    const centerX = LAYOUT.SCENE_W / 2;

    // --- Title image at the top ---
    this.titleImage = this.add.image(
      ls.scaleX(centerX),
      ls.scaleY(TITLE_Y),
      ASSET_KEYS.TITLE,
    );
    this.titleImage.setOrigin(0.5, 0.5);
    this.titleImage.setDepth(1);
    this.scaleTitleImage(ls);

    // --- Pre-game image in the center ---
    this.preGameImage = this.add.image(
      ls.scaleX(centerX),
      ls.scaleY(PRE_GAME_Y),
      ASSET_KEYS.PRE_GAME,
    );
    this.preGameImage.setOrigin(0.5, 0.5);
    this.preGameImage.setDepth(0);
    this.scalePreGameImage(ls);

    // --- Prompt text at the bottom ---
    this.promptText = this.add.text(
      ls.scaleX(centerX),
      ls.scaleY(PROMPT_Y),
      'Press any key or tap to start',
      {
        fontSize: `${ls.scaleFontSize(20)}px`,
        color: '#aaaaaa',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5).setDepth(1);

    // Audio: play intro music
    const audioManager = this.game.audioManager as AudioManager;
    audioManager.playIntroMusic();

    // Mute button UI (bottom-right corner)
    if (this.muteButton) {
      this.muteButton.destroy();
    }
    this.muteButton = new MuteButtonUI(this, this.layoutSystem);

    // Handle resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layoutSystem.update(gameSize.width, gameSize.height);
      const resLs = this.layoutSystem;
      const resCenterX = LAYOUT.SCENE_W / 2;

      this.titleImage.setPosition(resLs.scaleX(resCenterX), resLs.scaleY(TITLE_Y));
      this.scaleTitleImage(resLs);

      this.preGameImage.setPosition(resLs.scaleX(resCenterX), resLs.scaleY(PRE_GAME_Y));
      this.scalePreGameImage(resLs);

      this.promptText.setPosition(resLs.scaleX(resCenterX), resLs.scaleY(PROMPT_Y));
      this.promptText.setFontSize(resLs.scaleFontSize(20));

      this.muteButton.resize(this.layoutSystem);
    });

    // Any key (except M) starts the game
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'm' || event.key === 'M') return;
      this.input.keyboard!.removeAllListeners('keydown');
      this.scene.start('GameScene');
    });

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }

  update(): void {
    if (this.muteButton) {
      this.muteButton.update();
    }
  }

  /** Scale the title image to fit within a max width of ~320 base pixels. */
  private scaleTitleImage(ls: LayoutSystem): void {
    const maxBaseWidth = 320;
    const frame = this.titleImage.frame;
    const targetWidth = ls.scaleValue(maxBaseWidth);
    const scale = Math.min(targetWidth / frame.width, 1);
    this.titleImage.setScale(scale);
  }

  /** Scale the pre-game image to fit within ~600 base width and ~260 base height. */
  private scalePreGameImage(ls: LayoutSystem): void {
    const maxBaseWidth = 600;
    const maxBaseHeight = 260;
    const frame = this.preGameImage.frame;
    const scaleW = ls.scaleValue(maxBaseWidth) / frame.width;
    const scaleH = ls.scaleValue(maxBaseHeight) / frame.height;
    const scale = Math.min(scaleW, scaleH, 1);
    this.preGameImage.setScale(scale);
  }
}
