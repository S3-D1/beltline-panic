import { AUDIO_KEYS, GAMEPLAY_MUSIC_RATE_MIN, GAMEPLAY_MUSIC_RATE_MAX, GAMEPLAY_MUSIC_RATE_SMOOTHING } from '../data/AudioKeys';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class AudioManager {
  private game: Phaser.Game;
  private currentMusicKey: string | null;
  private currentMusic: Phaser.Sound.BaseSound | null;
  private currentRate: number;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.currentMusicKey = null;
    this.currentMusic = null;
    this.currentRate = GAMEPLAY_MUSIC_RATE_MIN;
  }

  // --- Music helper (shared logic for all music methods) ---

  private playMusic(key: string, loop: boolean): void {
    // Idempotence: if same key already playing, return early
    if (this.currentMusicKey === key) {
      return;
    }

    // Stop current music if any
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
      this.currentMusicKey = null;
    }

    // Create the sound instance
    const sound = this.game.sound.add(key, { loop });

    // Guard: verify the sound was registered in the manager
    if (!this.game.sound.get(key)) {
      console.warn(`AudioManager: sound key "${key}" not found`);
      return;
    }

    sound.play();
    this.currentMusic = sound;
    this.currentMusicKey = key;
  }

  // --- Music methods ---

  playIntroMusic(): void {
    this.playMusic(AUDIO_KEYS.MUSIC_INTRO, true);
  }

  playGameplayMusic(): void {
    this.playMusic(AUDIO_KEYS.MUSIC_FACTORY, true);
    this.currentRate = GAMEPLAY_MUSIC_RATE_MIN;
  }

  playScoreboardMusic(): void {
    this.playMusic(AUDIO_KEYS.MUSIC_SCOREBOARD, true);
  }

  playGameOverStinger(): void {
    this.playMusic(AUDIO_KEYS.STINGER_GAME_OVER, false);
  }

  // --- SFX helper ---

  private playSfx(key: string): void {
    try {
      this.game.sound.play(key);
    } catch {
      console.warn(`AudioManager: sound key "${key}" not found`);
    }
  }

  // --- SFX methods ---

  playMachineUse(): void {
    this.playSfx(AUDIO_KEYS.SFX_MACHINE_USE);
  }

  playScore(): void {
    this.playSfx(AUDIO_KEYS.SFX_SCORE);
  }

  playError(): void {
    this.playSfx(AUDIO_KEYS.SFX_ERROR);
  }

  playLevelUp(): void {
    this.playSfx(AUDIO_KEYS.SFX_LEVEL_UP);
  }

  playPayment(): void {
    this.playSfx(AUDIO_KEYS.SFX_PAYMENT);
  }

  playWarning(): void {
    this.playSfx(AUDIO_KEYS.SFX_WARNING);
  }

  // --- Mute control (implemented in task 2.4) ---

  setMuted(muted: boolean): void {
    this.game.sound.mute = muted;
  }

  toggleMuted(): void {
    this.setMuted(!this.isMuted());
  }

  isMuted(): boolean {
    return this.game.sound.mute;
  }

  // --- Gameplay music speed (implemented in task 2.5) ---

  updateGameplayMusicSpeed(
    currentBeltSpeed: number,
    baseBeltSpeed: number,
    maxBeltSpeed: number,
  ): void {
    // Guard: only adjust rate when gameplay music is active
    if (this.currentMusicKey !== AUDIO_KEYS.MUSIC_FACTORY) {
      return;
    }

    // Guard: fallback to baseBeltSpeed for non-finite inputs
    const speed = Number.isFinite(currentBeltSpeed) ? currentBeltSpeed : baseBeltSpeed;

    // Normalize belt speed to [0, 1] range
    const normalized = clamp(
      (speed - baseBeltSpeed) / (maxBeltSpeed - baseBeltSpeed),
      0,
      1,
    );

    // Compute target playback rate
    const targetRate =
      GAMEPLAY_MUSIC_RATE_MIN +
      normalized * (GAMEPLAY_MUSIC_RATE_MAX - GAMEPLAY_MUSIC_RATE_MIN);

    // Smooth toward target
    this.currentRate = lerp(this.currentRate, targetRate, GAMEPLAY_MUSIC_RATE_SMOOTHING);

    // Final clamp for safety
    this.currentRate = clamp(this.currentRate, GAMEPLAY_MUSIC_RATE_MIN, GAMEPLAY_MUSIC_RATE_MAX);

    // Apply to the playing sound
    if (this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setRate(this.currentRate);
    }
  }
}
