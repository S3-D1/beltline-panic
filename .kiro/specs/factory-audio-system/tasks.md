# Implementation Plan: Factory Audio System

## Overview

Add a complete audio layer to Beltline Panic: scene-specific background music, gameplay sound effects, a mute toggle (button + M key shortcut), and dynamic music speed tied to conveyor belt speed. Implementation follows a bottom-up dependency order — constants first, then AudioManager, then PreloadScene, then scene integrations, then tests.

## Tasks

- [x] 1. Create AudioKeys constants file
  - Create `src/data/AudioKeys.ts` with the `AUDIO_KEYS` object mapping stable string keys to audio asset identifiers
  - Export `GAMEPLAY_MUSIC_RATE_MIN` (1.0), `GAMEPLAY_MUSIC_RATE_MAX` (1.35), and `GAMEPLAY_MUSIC_RATE_SMOOTHING` (0.05) constants
  - _Requirements: 1.3, 4.1_

- [x] 2. Create AudioManager class
  - [x] 2.1 Create `src/systems/AudioManager.ts` with constructor accepting `Phaser.Game`
    - Initialize private fields: `currentMusicKey: string | null`, `currentMusic: Phaser.Sound.BaseSound | null`, `currentRate: number`
    - Import and use constants from `AudioKeys.ts`
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 2.2 Implement music playback methods
    - `playIntroMusic()`: stop current music, start `music_intro_loop` with `{ loop: true }`, update `currentMusicKey` and `currentMusic`; if same key already playing, return early (idempotence)
    - `playGameplayMusic()`: same pattern for `music_factory_loop`, reset `currentRate` to 1.0
    - `playScoreboardMusic()`: same pattern for `music_scoreboard_loop`
    - `playGameOverStinger()`: stop current music, play `stinger_game_over_3s` with `{ loop: false }`, update tracking fields
    - Guard each method: if `this.game.sound.get(key)` returns null, log `console.warn` and return without crashing
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 1.4, 4.7_

  - [x] 2.3 Implement SFX methods
    - `playMachineUse()`: call `this.game.sound.play(AUDIO_KEYS.SFX_MACHINE_USE)`
    - `playScore()`: call `this.game.sound.play(AUDIO_KEYS.SFX_SCORE)`
    - `playError()`: call `this.game.sound.play(AUDIO_KEYS.SFX_ERROR)`
    - Guard each: check key exists before playing
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Implement mute control methods
    - `setMuted(muted: boolean)`: set `this.game.sound.mute = muted`
    - `toggleMuted()`: call `setMuted(!this.isMuted())`
    - `isMuted()`: return `this.game.sound.mute`
    - _Requirements: 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 2.5 Implement `updateGameplayMusicSpeed(currentBeltSpeed, baseBeltSpeed, maxBeltSpeed)`
    - Guard: if `currentMusicKey !== AUDIO_KEYS.MUSIC_FACTORY`, return
    - Guard: if `!Number.isFinite(currentBeltSpeed)`, use `baseBeltSpeed` as fallback
    - Compute `normalized = clamp((currentBeltSpeed - baseBeltSpeed) / (maxBeltSpeed - baseBeltSpeed), 0, 1)`
    - Compute `targetRate = GAMEPLAY_MUSIC_RATE_MIN + normalized * (GAMEPLAY_MUSIC_RATE_MAX - GAMEPLAY_MUSIC_RATE_MIN)`
    - Smooth: `this.currentRate = lerp(this.currentRate, targetRate, GAMEPLAY_MUSIC_RATE_SMOOTHING)`
    - Clamp: `this.currentRate = clamp(this.currentRate, GAMEPLAY_MUSIC_RATE_MIN, GAMEPLAY_MUSIC_RATE_MAX)`
    - Apply: `(this.currentMusic as Phaser.Sound.WebAudioSound).setRate(this.currentRate)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 3. Checkpoint — Verify AudioManager compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create PreloadScene
  - Create `src/scenes/PreloadScene.ts` extending `Phaser.Scene` with key `'PreloadScene'`
  - In `preload()`: load all 7 audio files using `this.load.audio(key, path)` with keys from `AUDIO_KEYS` and paths matching the Audio Asset Registry
  - In `create()`: instantiate `AudioManager` and store on `(this.game as any).audioManager`, then call `this.scene.start('StartScene')`
  - _Requirements: 1.1, 1.2, 1.3, 4.6_

- [x] 5. Update main.ts to include PreloadScene
  - Import `PreloadScene` from `'./scenes/PreloadScene'`
  - Change scene array to `[PreloadScene, StartScene, GameScene, GameOverScene]`
  - _Requirements: 1.1_

- [x] 6. Create MuteButtonUI component
  - Create `src/ui/MuteButtonUI.ts` with constructor accepting `(scene: Phaser.Scene, layoutSystem: LayoutSystem)`
  - Get AudioManager from `(scene.game as any).audioManager`
  - Create a `Phaser.GameObjects.Text` at bottom-right using `layoutSystem.scaleX(784)`, `layoutSystem.scaleY(584)`, origin `(1, 1)`, depth 200
  - Label: `'♪ MUSIC'` when unmuted, `'× MUTE'` when muted; monospace font
  - Set text interactive; on `pointerdown`, call `audioManager.toggleMuted()` then `this.updateLabel()`
  - Implement `updateLabel()` to read `audioManager.isMuted()` and set text accordingly
  - Implement `resize(layoutSystem)` to reposition and rescale
  - Implement `destroy()` to clean up the text object
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.5_

- [x] 7. Integrate AudioManager into StartScene
  - [x] 7.1 Add audio playback and mute button to StartScene.create()
    - Get AudioManager: `const audioManager = (this.game as any).audioManager as AudioManager`
    - Call `audioManager.playIntroMusic()`
    - Create `MuteButtonUI` instance, store as field for resize access
    - _Requirements: 2.1, 6.1, 6.5_

  - [x] 7.2 Add M key handler and filter any-key listener in StartScene
    - Register M key: `this.input.keyboard!.on('keydown-M', () => { audioManager.toggleMuted(); muteButton.updateLabel(); })`
    - Replace `this.input.keyboard!.once('keydown', ...)` with a filtered listener using `on('keydown', ...)` that checks `if (event.key === 'm' || event.key === 'M') return;` then removes all keydown listeners and starts GameScene
    - _Requirements: 7.1, 7.2, 7.4, 7.6_

  - [x] 7.3 Add MuteButtonUI resize call in StartScene resize handler
    - Call `muteButton.resize(this.layoutSystem)` inside the existing `this.scale.on('resize', ...)` callback
    - _Requirements: 6.1_

- [x] 8. Integrate AudioManager into GameScene
  - [x] 8.1 Add audio playback and mute button to GameScene.create()
    - Get AudioManager, call `audioManager.playGameplayMusic()`
    - Create `MuteButtonUI` instance, store as field
    - Register M key handler for mute toggle
    - _Requirements: 2.2, 6.1, 7.1_

  - [x] 8.2 Add SFX triggers in GameScene.update()
    - After `machineResult` is computed and `updateSequenceUI` is called, detect state transitions:
      - `this.prevInteractionState !== 'success' && machineResult.interactionState === 'success'` → `audioManager.playMachineUse()`
      - `this.prevInteractionState !== 'failed' && machineResult.interactionState === 'failed'` → `audioManager.playError()`
    - Inside the `for (const val of result.exitedValues)` loop, after `gameManager.addPayout(val)` → `audioManager.playScore()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 8.3 Add gameplay music speed update in GameScene.update()
    - After all game logic (after automation system update), call:
      ```
      audioManager.updateGameplayMusicSpeed(
        this.gameManager.getBeltSpeed(),
        DELIVERY_CONFIG.initialBeltSpeed,
        DELIVERY_CONFIG.maxBeltSpeed
      );
      ```
    - Import `DELIVERY_CONFIG` from `'../data/DeliveryConfig'` (already imported)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.4 Add MuteButtonUI resize call in GameScene resize handler
    - Call `muteButton.resize(this.layoutSystem)` alongside existing `touchButtonUI.resize()`
    - _Requirements: 6.1_

- [x] 9. Integrate AudioManager into GameOverScene
  - [x] 9.1 Add audio playback and mute button to GameOverScene.create()
    - Get AudioManager, call `audioManager.playGameOverStinger()`
    - Create `MuteButtonUI` instance, store as field
    - Register M key handler for mute toggle
    - _Requirements: 2.4, 6.1, 7.1_

  - [x] 9.2 Add scoreboard music in GameOverScene.showScoreboard()
    - Call `audioManager.playScoreboardMusic()` at the start of `showScoreboard()`
    - _Requirements: 2.3_

  - [x] 9.3 Filter M key from restart listener in GameOverScene
    - Replace `this.input.keyboard!.once('keydown', this.startNewRun, this)` with a filtered listener using `on('keydown', ...)` that checks `if (event.key === 'm' || event.key === 'M') return;` then removes all keydown listeners and calls `this.startNewRun()`
    - _Requirements: 7.3, 7.5, 7.6_

  - [x] 9.4 Add MuteButtonUI resize call in GameOverScene resize handler
    - Call `muteButton.resize(this.layoutSystem)` inside the existing resize callback
    - _Requirements: 6.1_

- [x] 10. Checkpoint — Verify full integration compiles and runs
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Write unit tests for AudioManager
  - [x] 11.1 Create `src/tests/audioManager.test.ts` with Phaser SoundManager mocks
    - Mock `Phaser.Game` with a mock `sound` object supporting `mute`, `play()`, `add()`, `get()`
    - Mock `Phaser.Sound.BaseSound` with `play()`, `stop()`, `setRate()` methods
    - _Requirements: 4.1_

  - [x] 11.2 Write unit tests for music playback methods
    - Test `playIntroMusic()` starts `music_intro_loop` with loop enabled
    - Test `playGameplayMusic()` starts `music_factory_loop` with loop enabled
    - Test `playScoreboardMusic()` starts `music_scoreboard_loop` with loop enabled
    - Test `playGameOverStinger()` starts `stinger_game_over_3s` without loop
    - Test calling same music method twice does not restart (idempotence)
    - Test switching music stops previous track before starting new one
    - Test missing audio key logs warning and does not throw
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 1.4_

  - [x] 11.3 Write unit tests for SFX methods
    - Test `playMachineUse()` calls `game.sound.play('sfx_machine_use')`
    - Test `playScore()` calls `game.sound.play('sfx_score')`
    - Test `playError()` calls `game.sound.play('sfx_error')`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 11.4 Write unit tests for mute control
    - Test `setMuted(true)` sets `game.sound.mute` to true
    - Test `setMuted(false)` sets `game.sound.mute` to false
    - Test `toggleMuted()` inverts current state
    - Test `isMuted()` returns `game.sound.mute`
    - _Requirements: 4.3, 4.4, 4.5, 8.1, 8.2_

  - [x] 11.5 Write unit tests for updateGameplayMusicSpeed
    - Test no-op when `currentMusicKey` is not `music_factory_loop`
    - Test NaN/undefined/Infinity belt speed uses baseBeltSpeed fallback
    - Test rate at base belt speed (60) produces rate near 1.0
    - Test rate at max belt speed (180) produces rate approaching 1.35
    - Test rate is clamped to [1.0, 1.35] for out-of-range belt speeds
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7_

- [ ] 12. Write property-based tests for AudioManager
  - [ ]* 12.1 Write property test for music exclusivity invariant
    - **Property 1: Music exclusivity invariant**
    - Generate random sequences of music-switching method names using `fc.array(fc.constantFrom(...))`
    - Execute each in order on an AudioManager with mocked Phaser sound
    - After each call, assert: `currentMusicKey` matches the last call, and at most one sound is "playing"
    - Minimum 100 iterations
    - **Validates: Requirements 2.5, 2.8, 4.7**

  - [ ]* 12.2 Write property test for music playback idempotence
    - **Property 2: Music playback idempotence**
    - Generate a random music method name
    - Call it twice on the AudioManager
    - Assert the `currentMusic` reference is the same object after both calls
    - Minimum 100 iterations
    - **Validates: Requirements 2.7, 4.2**

  - [ ]* 12.3 Write property test for mute toggle round-trip
    - **Property 3: Mute toggle round-trip**
    - Generate a random initial mute state (boolean)
    - Set it via `setMuted()`, then `toggleMuted()` twice
    - Assert final state equals initial state
    - Assert `game.sound.mute` equals `isMuted()` at every step
    - Minimum 100 iterations
    - **Validates: Requirements 4.5, 8.1, 8.2**

  - [ ]* 12.4 Write property test for gameplay music rate bounds invariant
    - **Property 4: Gameplay music rate bounds invariant**
    - Generate a random array of belt speed values using `fc.array(fc.double({ min: -1000, max: 10000, noNaN: false }))` including negatives, zero, very large numbers, NaN, Infinity
    - For each value, call `updateGameplayMusicSpeed(speed, 60, 180)`
    - After each call, assert `currentRate` is in [1.0, 1.35]
    - Minimum 100 iterations
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, matching the existing project stack
- All audio goes through Phaser's built-in SoundManager; mute state is linked to `game.sound.mute`
- SFX edge detection in GameScene reuses the existing `prevInteractionState` field
