import Phaser from 'phaser';
import { AUDIO_KEYS } from '../data/AudioKeys';
import { ASSET_PATHS } from '../data/AssetKeys';
import { AudioManager } from '../systems/AudioManager';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Load audio assets
    this.load.audio(AUDIO_KEYS.MUSIC_INTRO, 'assets/audio/music_intro_loop.wav');
    this.load.audio(AUDIO_KEYS.MUSIC_FACTORY, 'assets/audio/beltline_panic_factory_loop_8bit.wav');
    this.load.audio(AUDIO_KEYS.MUSIC_SCOREBOARD, 'assets/audio/music_scoreboard_loop.wav');
    this.load.audio(AUDIO_KEYS.STINGER_GAME_OVER, 'assets/audio/stinger_game_over_3s.wav');
    this.load.audio(AUDIO_KEYS.SFX_MACHINE_USE, 'assets/audio/sfx_machine_use.wav');
    this.load.audio(AUDIO_KEYS.SFX_SCORE, 'assets/audio/sfx_score.wav');
    this.load.audio(AUDIO_KEYS.SFX_ERROR, 'assets/audio/sfx_error.wav');

    // Load image assets
    for (const [key, path] of Object.entries(ASSET_PATHS)) {
      this.load.image(key, path);
    }

    // Log warning on asset load failure — do not halt the game
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Failed to load asset: ${file.key} (${file.url})`);
    });
  }

  create(): void {
    this.game.audioManager = new AudioManager(this.game);
    this.scene.start('StartScene');
  }
}
