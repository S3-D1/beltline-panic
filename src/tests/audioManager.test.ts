import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from '../systems/AudioManager';
import {
  AUDIO_KEYS,
  GAMEPLAY_MUSIC_RATE_MIN,
  GAMEPLAY_MUSIC_RATE_MAX,
} from '../data/AudioKeys';

// --- Mock helpers ---

/** Create a mock Phaser.Sound.BaseSound with play, stop, setRate. */
function createMockSound() {
  return {
    play: vi.fn(),
    stop: vi.fn(),
    setRate: vi.fn(),
  };
}

type MockSound = ReturnType<typeof createMockSound>;

interface MockGame {
  sound: {
    mute: boolean;
    add: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
  };
  _sounds: Record<string, MockSound>;
}

/** Access AudioManager private fields for test assertions. */
interface AudioManagerInternals {
  currentMusicKey: string | null;
  currentMusic: MockSound | null;
  currentRate: number;
}

function internals(am: AudioManager): AudioManagerInternals {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return am as any;
}

function mockSounds(game: MockGame): Record<string, MockSound> {
  return game._sounds;
}

/**
 * Create a mock Phaser.Game with a mock sound manager.
 * `add()` registers sounds so `get()` can retrieve them.
 * `play()` is a fire-and-forget SFX call.
 */
function createMockGame(): MockGame {
  const sounds: Record<string, MockSound> = {};

  const soundManager = {
    mute: false,
    add: vi.fn((key: string, _config?: unknown) => {
      const s = createMockSound();
      sounds[key] = s;
      return s;
    }),
    get: vi.fn((key: string) => sounds[key] ?? null),
    play: vi.fn(),
  };

  return { sound: soundManager, _sounds: sounds };
}

function asGame(mock: MockGame): Phaser.Game {
  return mock as unknown as Phaser.Game;
}

// --- Tests ---

describe('AudioManager — music playback methods', () => {
  let game: MockGame;
  let audioManager: AudioManager;

  beforeEach(() => {
    game = createMockGame();
    audioManager = new AudioManager(asGame(game));
  });

  // Validates: Requirements 2.1
  it('playIntroMusic() starts music_intro_loop with loop enabled', () => {
    audioManager.playIntroMusic();

    expect(game.sound.add).toHaveBeenCalledWith(AUDIO_KEYS.MUSIC_INTRO, { loop: true });
    const sound = mockSounds(game)[AUDIO_KEYS.MUSIC_INTRO];
    expect(sound.play).toHaveBeenCalled();
    expect(internals(audioManager).currentMusicKey).toBe(AUDIO_KEYS.MUSIC_INTRO);
  });

  // Validates: Requirements 2.2
  it('playGameplayMusic() starts music_factory_loop with loop enabled', () => {
    audioManager.playGameplayMusic();

    expect(game.sound.add).toHaveBeenCalledWith(AUDIO_KEYS.MUSIC_FACTORY, { loop: true });
    const sound = mockSounds(game)[AUDIO_KEYS.MUSIC_FACTORY];
    expect(sound.play).toHaveBeenCalled();
    expect(internals(audioManager).currentMusicKey).toBe(AUDIO_KEYS.MUSIC_FACTORY);
  });

  // Validates: Requirements 2.3
  it('playScoreboardMusic() starts music_scoreboard_loop with loop enabled', () => {
    audioManager.playScoreboardMusic();

    expect(game.sound.add).toHaveBeenCalledWith(AUDIO_KEYS.MUSIC_SCOREBOARD, { loop: true });
    const sound = mockSounds(game)[AUDIO_KEYS.MUSIC_SCOREBOARD];
    expect(sound.play).toHaveBeenCalled();
    expect(internals(audioManager).currentMusicKey).toBe(AUDIO_KEYS.MUSIC_SCOREBOARD);
  });

  // Validates: Requirements 2.4
  it('playGameOverStinger() starts stinger_game_over_3s without loop', () => {
    audioManager.playGameOverStinger();

    expect(game.sound.add).toHaveBeenCalledWith(AUDIO_KEYS.STINGER_GAME_OVER, { loop: false });
    const sound = mockSounds(game)[AUDIO_KEYS.STINGER_GAME_OVER];
    expect(sound.play).toHaveBeenCalled();
    expect(internals(audioManager).currentMusicKey).toBe(AUDIO_KEYS.STINGER_GAME_OVER);
  });

  // Validates: Requirements 2.7
  it('calling same music method twice does not restart (idempotence)', () => {
    audioManager.playIntroMusic();
    const firstSound = mockSounds(game)[AUDIO_KEYS.MUSIC_INTRO];
    const firstRef = internals(audioManager).currentMusic;

    audioManager.playIntroMusic();

    // add() should only be called once — second call is a no-op
    expect(game.sound.add).toHaveBeenCalledTimes(1);
    expect(firstSound.play).toHaveBeenCalledTimes(1);
    expect(internals(audioManager).currentMusic).toBe(firstRef);
  });

  // Validates: Requirements 2.5, 4.7
  it('switching music stops previous track before starting new one', () => {
    audioManager.playIntroMusic();
    const introSound = mockSounds(game)[AUDIO_KEYS.MUSIC_INTRO];

    audioManager.playGameplayMusic();

    expect(introSound.stop).toHaveBeenCalled();
    expect(internals(audioManager).currentMusicKey).toBe(AUDIO_KEYS.MUSIC_FACTORY);
  });

  // Validates: Requirements 1.4
  it('missing audio key logs warning and does not throw', () => {
    // Override get() to return null for all keys (simulating missing assets)
    game.sound.get = vi.fn(() => null);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => audioManager.playIntroMusic()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(AUDIO_KEYS.MUSIC_INTRO),
    );

    warnSpy.mockRestore();
  });
});

describe('AudioManager — SFX methods', () => {
  let game: MockGame;
  let audioManager: AudioManager;

  beforeEach(() => {
    game = createMockGame();
    audioManager = new AudioManager(asGame(game));
  });

  // Validates: Requirements 3.1
  it('playMachineUse() calls game.sound.play with sfx_machine_use', () => {
    audioManager.playMachineUse();
    expect(game.sound.play).toHaveBeenCalledWith(AUDIO_KEYS.SFX_MACHINE_USE);
  });

  // Validates: Requirements 3.2
  it('playScore() calls game.sound.play with sfx_score', () => {
    audioManager.playScore();
    expect(game.sound.play).toHaveBeenCalledWith(AUDIO_KEYS.SFX_SCORE);
  });

  // Validates: Requirements 3.3
  it('playError() calls game.sound.play with sfx_error', () => {
    audioManager.playError();
    expect(game.sound.play).toHaveBeenCalledWith(AUDIO_KEYS.SFX_ERROR);
  });
});

describe('AudioManager — mute control', () => {
  let game: MockGame;
  let audioManager: AudioManager;

  beforeEach(() => {
    game = createMockGame();
    audioManager = new AudioManager(asGame(game));
  });

  // Validates: Requirements 4.3, 8.1
  it('setMuted(true) sets game.sound.mute to true', () => {
    audioManager.setMuted(true);
    expect(game.sound.mute).toBe(true);
  });

  // Validates: Requirements 4.4, 8.2
  it('setMuted(false) sets game.sound.mute to false', () => {
    game.sound.mute = true;
    audioManager.setMuted(false);
    expect(game.sound.mute).toBe(false);
  });

  // Validates: Requirements 4.5
  it('toggleMuted() inverts current state', () => {
    expect(game.sound.mute).toBe(false);

    audioManager.toggleMuted();
    expect(game.sound.mute).toBe(true);

    audioManager.toggleMuted();
    expect(game.sound.mute).toBe(false);
  });

  // Validates: Requirements 4.5, 8.1, 8.2
  it('isMuted() returns game.sound.mute', () => {
    expect(audioManager.isMuted()).toBe(false);

    game.sound.mute = true;
    expect(audioManager.isMuted()).toBe(true);

    game.sound.mute = false;
    expect(audioManager.isMuted()).toBe(false);
  });
});

describe('AudioManager — updateGameplayMusicSpeed', () => {
  let game: MockGame;
  let audioManager: AudioManager;

  const BASE = 60;
  const MAX = 180;

  beforeEach(() => {
    game = createMockGame();
    audioManager = new AudioManager(asGame(game));
  });

  // Validates: Requirements 5.6
  it('no-op when currentMusicKey is not music_factory_loop', () => {
    // Play intro music instead of gameplay music
    audioManager.playIntroMusic();
    const introSound = mockSounds(game)[AUDIO_KEYS.MUSIC_INTRO];

    audioManager.updateGameplayMusicSpeed(120, BASE, MAX);

    // setRate should not be called on the intro sound
    expect(introSound.setRate).not.toHaveBeenCalled();
  });

  // Validates: Requirements 5.7
  it('NaN/undefined/Infinity belt speed uses baseBeltSpeed fallback', () => {
    audioManager.playGameplayMusic();
    const factorySound = mockSounds(game)[AUDIO_KEYS.MUSIC_FACTORY];

    // NaN
    audioManager.updateGameplayMusicSpeed(NaN, BASE, MAX);
    expect(factorySound.setRate).toHaveBeenCalled();
    let rate = internals(audioManager).currentRate;
    expect(rate).toBeCloseTo(GAMEPLAY_MUSIC_RATE_MIN, 2);

    // Infinity
    factorySound.setRate.mockClear();
    audioManager.updateGameplayMusicSpeed(Infinity, BASE, MAX);
    expect(factorySound.setRate).toHaveBeenCalled();
    rate = internals(audioManager).currentRate;
    expect(rate).toBeCloseTo(GAMEPLAY_MUSIC_RATE_MIN, 2);

    // undefined (cast to number)
    factorySound.setRate.mockClear();
    audioManager.updateGameplayMusicSpeed(undefined as unknown as number, BASE, MAX);
    expect(factorySound.setRate).toHaveBeenCalled();
    rate = internals(audioManager).currentRate;
    expect(rate).toBeCloseTo(GAMEPLAY_MUSIC_RATE_MIN, 2);
  });

  // Validates: Requirements 5.1, 5.2
  it('rate at base belt speed (60) produces rate near 1.0', () => {
    audioManager.playGameplayMusic();

    // Call multiple times to let smoothing converge
    for (let i = 0; i < 200; i++) {
      audioManager.updateGameplayMusicSpeed(BASE, BASE, MAX);
    }

    const rate = internals(audioManager).currentRate;
    expect(rate).toBeCloseTo(GAMEPLAY_MUSIC_RATE_MIN, 2);
  });

  // Validates: Requirements 5.2, 5.3
  it('rate at max belt speed (180) produces rate approaching 1.35', () => {
    audioManager.playGameplayMusic();

    // Call many times to let smoothing converge toward 1.35
    for (let i = 0; i < 200; i++) {
      audioManager.updateGameplayMusicSpeed(MAX, BASE, MAX);
    }

    const rate = internals(audioManager).currentRate;
    expect(rate).toBeCloseTo(GAMEPLAY_MUSIC_RATE_MAX, 1);
  });

  // Validates: Requirements 5.5
  it('rate is clamped to [1.0, 1.35] for out-of-range belt speeds', () => {
    audioManager.playGameplayMusic();

    // Very low speed (below base)
    for (let i = 0; i < 200; i++) {
      audioManager.updateGameplayMusicSpeed(-1000, BASE, MAX);
    }
    let rate = internals(audioManager).currentRate;
    expect(rate).toBeGreaterThanOrEqual(GAMEPLAY_MUSIC_RATE_MIN);
    expect(rate).toBeLessThanOrEqual(GAMEPLAY_MUSIC_RATE_MAX);

    // Very high speed (above max)
    for (let i = 0; i < 200; i++) {
      audioManager.updateGameplayMusicSpeed(99999, BASE, MAX);
    }
    rate = internals(audioManager).currentRate;
    expect(rate).toBeGreaterThanOrEqual(GAMEPLAY_MUSIC_RATE_MIN);
    expect(rate).toBeLessThanOrEqual(GAMEPLAY_MUSIC_RATE_MAX);
  });
});
