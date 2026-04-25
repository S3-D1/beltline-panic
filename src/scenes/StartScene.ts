import Phaser from 'phaser';
import { LAYOUT } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';
import { AudioManager } from '../systems/AudioManager';
import { MuteButtonUI } from '../ui/MuteButtonUI';
import { ASSET_KEYS } from '../data/AssetKeys';

/** Belt band height in base-resolution pixels (matches StartDrawing). */
const BELT_BAND_HEIGHT = 20;

/** Machine silhouette dimensions in base-resolution pixels (matches StartDrawing). */
const MACHINE_W = 40;
const MACHINE_H = 30;

/** Belt band Y center in base resolution (slightly below center for title room). */
const BELT_Y = LAYOUT.SCENE_H / 2 + 40; // 340

/** Belt horizontal extents in base resolution. */
const BELT_LEFT = 60;
const BELT_RIGHT = LAYOUT.SCENE_W - 60; // 740
const BELT_WIDTH = BELT_RIGHT - BELT_LEFT; // 680

/** Machine silhouette configs: baseX/baseY are top-left corners, matching StartDrawing positions. */
const MACHINE_CONFIGS = [
  // Machine 1 — left portion of belt, sits above
  { baseX: 180, baseY: BELT_Y - BELT_BAND_HEIGHT / 2 - MACHINE_H - 2, baseW: MACHINE_W, baseH: MACHINE_H, rotation: 0 },
  // Machine 2 — center of belt, sits above (wider: 48px)
  { baseX: 380, baseY: BELT_Y - BELT_BAND_HEIGHT / 2 - MACHINE_H - 2, baseW: MACHINE_W + 8, baseH: MACHINE_H, rotation: 0 },
  // Machine 3 — right portion of belt, sits below
  { baseX: 560, baseY: BELT_Y + BELT_BAND_HEIGHT / 2 + 2, baseW: MACHINE_W, baseH: MACHINE_H, rotation: 0 },
];

export class StartScene extends Phaser.Scene {
  private layoutSystem: LayoutSystem = new LayoutSystem();
  private beltTileSprite!: Phaser.GameObjects.TileSprite;
  private machineImages: Phaser.GameObjects.Image[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private muteButton!: MuteButtonUI;

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.layoutSystem.update(this.scale.width, this.scale.height);

    const ls = this.layoutSystem;

    // --- Decorative belt band TileSprite ---
    // Center of the belt band in base resolution
    const beltCenterX = BELT_LEFT + BELT_WIDTH / 2;
    const beltCenterY = BELT_Y;

    this.beltTileSprite = this.add.tileSprite(
      ls.scaleX(beltCenterX),
      ls.scaleY(beltCenterY),
      ls.scaleValue(BELT_WIDTH),
      ls.scaleValue(BELT_BAND_HEIGHT),
      ASSET_KEYS.BELT,
    );
    this.beltTileSprite.setOrigin(0.5, 0.5);
    this.beltTileSprite.setAlpha(0.5);
    this.beltTileSprite.setDepth(0);

    // --- Machine silhouette Images ---
    // Destroy any existing machine images (e.g., on scene restart)
    for (const img of this.machineImages) {
      img.destroy();
    }
    this.machineImages = [];

    for (const cfg of MACHINE_CONFIGS) {
      // Convert top-left to center coordinates
      const centerX = cfg.baseX + cfg.baseW / 2;
      const centerY = cfg.baseY + cfg.baseH / 2;

      const img = this.add.image(
        ls.scaleX(centerX),
        ls.scaleY(centerY),
        ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE,
      );
      img.setOrigin(0.5, 0.5);
      img.setAlpha(0.35);
      img.setRotation(cfg.rotation);
      img.setDepth(0);

      // Scale to cover the silhouette dimensions
      const frame = img.frame;
      const scaleX = ls.scaleValue(cfg.baseW) / frame.width;
      const scaleY = ls.scaleValue(cfg.baseH) / frame.height;
      img.setScale(scaleX, scaleY);

      this.machineImages.push(img);
    }

    // Title text above background
    this.titleText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(260),
      'Beltline Panic',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(48)}px`,
        fontFamily: 'monospace',
        color: '#ffffff',
      }
    ).setOrigin(0.5).setDepth(1);

    // Prompt text above background
    this.promptText = this.add.text(
      this.layoutSystem.scaleX(400),
      this.layoutSystem.scaleY(340),
      'Press any key or tap to start',
      {
        fontSize: `${this.layoutSystem.scaleFontSize(20)}px`,
        color: '#aaaaaa',
      }
    ).setOrigin(0.5).setDepth(1);

    // Audio: get AudioManager and play intro music
    const audioManager = this.game.audioManager as AudioManager;
    audioManager.playIntroMusic();

    // Mute button UI (bottom-right corner) — handles both click and M key
    if (this.muteButton) {
      this.muteButton.destroy();
    }
    this.muteButton = new MuteButtonUI(this, this.layoutSystem);

    // Handle resize: reposition and rescale sprites and text
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layoutSystem.update(gameSize.width, gameSize.height);

      const resLs = this.layoutSystem;

      // Reposition and rescale belt TileSprite
      const resBeltCenterX = BELT_LEFT + BELT_WIDTH / 2;
      this.beltTileSprite.setPosition(
        resLs.scaleX(resBeltCenterX),
        resLs.scaleY(BELT_Y),
      );
      this.beltTileSprite.width = resLs.scaleValue(BELT_WIDTH);
      this.beltTileSprite.height = resLs.scaleValue(BELT_BAND_HEIGHT);

      // Reposition and rescale machine images
      for (let i = 0; i < MACHINE_CONFIGS.length; i++) {
        const cfg = MACHINE_CONFIGS[i];
        const img = this.machineImages[i];
        if (!img) continue;

        const centerX = cfg.baseX + cfg.baseW / 2;
        const centerY = cfg.baseY + cfg.baseH / 2;
        img.setPosition(resLs.scaleX(centerX), resLs.scaleY(centerY));

        const frame = img.frame;
        const scaleX = resLs.scaleValue(cfg.baseW) / frame.width;
        const scaleY = resLs.scaleValue(cfg.baseH) / frame.height;
        img.setScale(scaleX, scaleY);
      }

      this.titleText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(260)
      );
      this.titleText.setFontSize(this.layoutSystem.scaleFontSize(48));

      this.promptText.setPosition(
        this.layoutSystem.scaleX(400),
        this.layoutSystem.scaleY(340)
      );
      this.promptText.setFontSize(this.layoutSystem.scaleFontSize(20));

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
}
