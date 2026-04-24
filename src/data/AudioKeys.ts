// --- Audio asset key constants ---

export const AUDIO_KEYS = {
  MUSIC_INTRO: 'music_intro_loop',
  MUSIC_FACTORY: 'music_factory_loop',
  MUSIC_SCOREBOARD: 'music_scoreboard_loop',
  STINGER_GAME_OVER: 'stinger_game_over_3s',
  SFX_MACHINE_USE: 'sfx_machine_use',
  SFX_SCORE: 'sfx_score',
  SFX_ERROR: 'sfx_error',
} as const;

// --- Gameplay music rate constants ---

export const GAMEPLAY_MUSIC_RATE_MIN = 1.0;
export const GAMEPLAY_MUSIC_RATE_MAX = 1.35;
export const GAMEPLAY_MUSIC_RATE_SMOOTHING = 0.05;
