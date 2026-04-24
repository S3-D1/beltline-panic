# Requirements Document

## Introduction

Beltline Panic currently has no audio. This feature integrates scene-specific background music, gameplay sound effects, a global mute toggle (button and keyboard shortcut), and dynamic music speed that reacts to conveyor belt speed. All audio assets are pre-supplied `.wav` files located in `public/assets/audio/`. A centralized AudioManager service coordinates playback, mute state, and music switching across all three scenes (StartScene, GameScene, GameOverScene).

## Glossary

- **AudioManager**: A centralized service class responsible for managing all music playback, sound effect playback, mute state, and gameplay music speed. Accessible from any scene via the Phaser game instance.
- **Scene**: One of the three Phaser scenes in the game — StartScene, GameScene, or GameOverScene.
- **Music_Loop**: A background audio track that plays continuously with looping enabled until explicitly stopped or replaced.
- **Sound_Effect**: A short audio clip triggered by a gameplay event, played over the current Music_Loop without interrupting it.
- **Stinger**: A one-shot audio clip that plays once without looping, used for transitional moments such as game over.
- **Mute_State**: A boolean flag indicating whether all game audio (music and sound effects) is globally silenced. Persists across scene transitions.
- **Gameplay_Music_Rate**: The playback speed of the factory loop music during GameScene, ranging from 1.0 to 1.35, derived from the current conveyor belt speed.
- **Belt_Speed**: The current conveyor belt speed in pixels per second, obtained from `GameManager.getBeltSpeed()`.
- **Base_Belt_Speed**: The initial belt speed defined in `DeliveryConfig` as `initialBeltSpeed` (60 px/s).
- **Max_Belt_Speed**: The maximum belt speed defined in `DeliveryConfig` as `maxBeltSpeed` (180 px/s).
- **Mute_Button**: A persistent on-screen UI element in the bottom-right corner that toggles Mute_State.
- **Phaser_Global_Mute**: The built-in Phaser audio mute flag accessed via `this.scene.game.sound.mute`.

## Audio Asset Registry

| Key                    | File Path                                              | Type         | Looping |
|------------------------|--------------------------------------------------------|--------------|---------|
| `music_intro_loop`     | `/assets/audio/music_intro_loop.wav`                   | Music_Loop   | Yes     |
| `music_factory_loop`   | `/assets/audio/beltline_panic_factory_loop_8bit.wav`   | Music_Loop   | Yes     |
| `music_scoreboard_loop`| `/assets/audio/music_scoreboard_loop.wav`              | Music_Loop   | Yes     |
| `stinger_game_over_3s` | `/assets/audio/stinger_game_over_3s.wav`               | Stinger      | No      |
| `sfx_machine_use`      | `/assets/audio/sfx_machine_use.wav`                    | Sound_Effect | No      |
| `sfx_score`            | `/assets/audio/sfx_score.wav`                          | Sound_Effect | No      |
| `sfx_error`            | `/assets/audio/sfx_error.wav`                          | Sound_Effect | No      |

## Requirements

### Requirement 1: Preload Audio Assets

**User Story:** As a player, I want all audio assets to be loaded before any scene plays them, so that I never experience missing or delayed audio during gameplay.

#### Acceptance Criteria

1. THE AudioManager SHALL register all seven audio files listed in the Audio Asset Registry with Phaser's audio loader before any Scene attempts playback.
2. WHEN a Scene calls a playback method on the AudioManager, THE AudioManager SHALL only play audio that has completed loading.
3. THE AudioManager SHALL use stable string keys from the Audio Asset Registry so that all Scenes reference the same audio assets by the same key.
4. IF an audio file fails to load or a key is referenced that was not registered, THEN THE AudioManager SHALL log a descriptive warning to the browser console and continue operation without crashing.

### Requirement 2: Scene-Specific Music

**User Story:** As a player, I want each scene to have its own background music, so that the audio reinforces the mood of each phase of the game.

#### Acceptance Criteria

1. WHEN StartScene becomes active, THE AudioManager SHALL play `music_intro_loop` as a continuous Music_Loop.
2. WHEN GameScene becomes active, THE AudioManager SHALL play `music_factory_loop` as a continuous Music_Loop.
3. WHEN GameOverScene transitions to the scoreboard phase, THE AudioManager SHALL play `music_scoreboard_loop` as a continuous Music_Loop.
4. WHEN GameOverScene enters the game-over phase, THE AudioManager SHALL play `stinger_game_over_3s` once without looping.
5. WHEN a Scene transition occurs, THE AudioManager SHALL stop the current Music_Loop before starting the next scene's music.
6. WHILE a Music_Loop is playing, THE AudioManager SHALL allow Sound_Effects to play concurrently without interrupting the Music_Loop.
7. WHEN a Scene requests the same Music_Loop that is already playing, THE AudioManager SHALL continue the existing playback and not create a duplicate instance.
8. THE AudioManager SHALL ensure that at most one Music_Loop or Stinger plays at any given time.

### Requirement 3: Sound Effects

**User Story:** As a player, I want to hear sound effects for key gameplay interactions, so that I get immediate audio feedback on my actions.

#### Acceptance Criteria

1. WHEN a machine interaction sequence completes successfully, THE AudioManager SHALL play `sfx_machine_use`.
2. WHEN the player's score increases from an item payout, THE AudioManager SHALL play `sfx_score`.
3. WHEN a machine interaction sequence fails due to incorrect input, THE AudioManager SHALL play `sfx_error`.
4. WHILE a Music_Loop is playing, THE AudioManager SHALL play Sound_Effects over the Music_Loop without stopping or restarting the Music_Loop.
5. WHILE Mute_State is true, THE AudioManager SHALL suppress playback of all Sound_Effects.

### Requirement 4: Central AudioManager Service

**User Story:** As a developer, I want a single centralized audio service, so that all scenes share consistent audio behavior without duplicating playback logic.

#### Acceptance Criteria

1. THE AudioManager SHALL expose the following methods: `playIntroMusic()`, `playGameplayMusic()`, `playScoreboardMusic()`, `playGameOverStinger()`, `playMachineUse()`, `playScore()`, `playError()`, `setMuted(muted: boolean)`, `toggleMuted()`, `isMuted()`, `updateGameplayMusicSpeed(currentBeltSpeed: number, baseBeltSpeed: number, maxBeltSpeed: number)`.
2. THE AudioManager SHALL track the currently playing music instance and its key so that duplicate playback requests for the same key are ignored.
3. WHEN `setMuted(true)` is called, THE AudioManager SHALL set Phaser_Global_Mute to true.
4. WHEN `setMuted(false)` is called, THE AudioManager SHALL set Phaser_Global_Mute to false.
5. WHEN `toggleMuted()` is called, THE AudioManager SHALL invert the current Mute_State and update Phaser_Global_Mute accordingly.
6. THE AudioManager SHALL be accessible from StartScene, GameScene, and GameOverScene without requiring scene-specific instantiation.
7. WHEN a music-switching method is called, THE AudioManager SHALL stop the previously playing music before starting the new track.

### Requirement 5: Gameplay Music Speed Follows Conveyor Belt Speed

**User Story:** As a player, I want the factory music to speed up as the conveyor belt accelerates, so that the audio intensity matches the gameplay pressure.

#### Acceptance Criteria

1. WHILE GameScene is active, THE AudioManager SHALL compute a normalized speed value as `Clamp((currentBeltSpeed - baseBeltSpeed) / (maxBeltSpeed - baseBeltSpeed), 0, 1)`.
2. THE AudioManager SHALL compute a target playback rate as `Linear(1.0, 1.35, normalizedSpeed)`.
3. THE AudioManager SHALL smooth the transition from the current Gameplay_Music_Rate toward the target rate using `Linear(currentRate, targetRate, 0.05)` per update call.
4. THE AudioManager SHALL apply the smoothed Gameplay_Music_Rate to the `music_factory_loop` instance via `setRate()`.
5. THE AudioManager SHALL clamp Gameplay_Music_Rate to the range 1.0 to 1.35 inclusive.
6. WHILE StartScene or GameOverScene is active, THE AudioManager SHALL not modify the playback rate of the current Music_Loop.
7. IF `currentBeltSpeed` is undefined, null, or not a finite number, THEN THE AudioManager SHALL use Base_Belt_Speed as the fallback value and maintain a Gameplay_Music_Rate of 1.0.

### Requirement 6: Mute Button UI

**User Story:** As a player, I want a visible mute button on screen, so that I can toggle audio on or off without a keyboard.

#### Acceptance Criteria

1. THE Mute_Button SHALL be visible in the bottom-right corner of the screen in StartScene, GameScene, and GameOverScene.
2. THE Mute_Button SHALL display `♪ MUSIC` when Mute_State is false and `× MUTE` when Mute_State is true.
3. WHEN the player clicks or taps the Mute_Button, THE Mute_Button SHALL call `AudioManager.toggleMuted()` and update its displayed label immediately.
4. THE Mute_Button SHALL use a monospace pixel-style font consistent with the existing game UI.
5. WHILE a scene transition occurs, THE Mute_Button SHALL reflect the persisted Mute_State of the AudioManager in the new scene.
6. THE Mute_Button SHALL not trigger any scene-start, scene-restart, or gameplay input when clicked.

### Requirement 7: Keyboard Shortcut M for Mute Toggle

**User Story:** As a player, I want to press M to toggle mute, so that I can quickly control audio without clicking a button.

#### Acceptance Criteria

1. WHEN the player presses the M key, THE AudioManager SHALL toggle Mute_State and the Mute_Button label SHALL update immediately.
2. WHEN the player presses the M key in StartScene, THE StartScene SHALL not start the game.
3. WHEN the player presses the M key in GameOverScene during the scoreboard phase, THE GameOverScene SHALL not restart the game.
4. THE StartScene SHALL modify its "any key" listener to ignore the M key and only respond to keys other than M for starting the game.
5. THE GameOverScene SHALL modify its "any key" restart listener to ignore the M key and only respond to keys other than M for restarting.
6. THE StartScene and GameOverScene SHALL use Enter and Space as the preferred explicit start/restart keys, while continuing to accept other non-M keys.

### Requirement 8: Mute State Linked to Phaser Global Sound Mute

**User Story:** As a developer, I want the mute toggle to control Phaser's built-in global mute, so that all audio (music and sound effects) is silenced through a single mechanism.

#### Acceptance Criteria

1. WHEN Mute_State changes to true, THE AudioManager SHALL set `game.sound.mute` to true.
2. WHEN Mute_State changes to false, THE AudioManager SHALL set `game.sound.mute` to false.
3. THE AudioManager SHALL ensure that both Music_Loops and Sound_Effects are affected by Phaser_Global_Mute.
4. WHILE a scene transition occurs, THE AudioManager SHALL preserve the current Mute_State so that the new scene inherits the same mute setting.
5. THE Mute_Button label SHALL remain synchronized with the actual value of Phaser_Global_Mute at all times.
