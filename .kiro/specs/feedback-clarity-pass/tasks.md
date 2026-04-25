# Implementation Plan: Feedback Clarity Pass

## Overview

Add a centralized FeedbackManager system to Beltline Panic that layers readable hints, floating text, sound hooks, and visual effects on top of existing gameplay systems. The FeedbackManager reads from GameManager, MachineSystem, and ItemSystem as sources of truth and dispatches feedback through Phaser tweens, text objects, and AudioManager calls. Implementation proceeds bottom-up: audio keys first, then the FeedbackManager core, then each feedback domain (items, machines, hints, budget, upgrades, floating text, visual juice), and finally GameScene integration.

## Tasks

- [x] 1. Extend AudioManager with new SFX keys and methods
  - [x] 1.1 Add SFX_LEVEL_UP, SFX_PAYMENT, and SFX_WARNING entries to AUDIO_KEYS in `src/data/AudioKeys.ts` mapping to `sfx_level_up`, `sfx_payment`, and `sfx_warning`
    - _Requirements: 8.2_
  - [x] 1.2 Add playLevelUp(), playPayment(), and playWarning() methods to `src/systems/AudioManager.ts` using the existing playSfx helper pattern
    - Each method calls `this.playSfx(AUDIO_KEYS.SFX_LEVEL_UP)` etc.
    - The existing playSfx already catches errors and logs warnings, satisfying the silent-fail requirement
    - _Requirements: 8.1, 8.3_
  - [x] 1.3 Register the three new audio files in `src/scenes/PreloadScene.ts` so they are loaded at startup
    - Add `this.load.audio(AUDIO_KEYS.SFX_LEVEL_UP, 'assets/audio/sfx_level_up.wav')` and equivalent for payment and warning
    - _Requirements: 8.2_
  - [ ]* 1.4 Write unit tests for the new AudioManager SFX methods
    - Verify playLevelUp, playPayment, playWarning call playSfx with correct keys
    - Verify mute state suppresses playback
    - _Requirements: 8.1, 8.3, 8.4_

- [x] 2. Create FeedbackManager core and floating text system
  - [x] 2.1 Create `src/systems/FeedbackManager.ts` with the FeedbackManager class
    - Constructor accepts Phaser.Scene, LayoutSystem, GameManager, AudioManager references
    - Store references to existing budget text and score text Phaser.GameObjects.Text instances passed during init
    - Log new feedback element types to console at initialization for traceability
    - _Requirements: 1.1, 1.2, 1.6, 10.1, 10.2_
  - [x] 2.2 Implement showFloatingText(x, y, message, color, duration?) method in FeedbackManager
    - Create a Phaser text object at (x, y) that rises 30px upward and fades to alpha 0 over duration (default 1000ms) using Phaser tweens
    - Destroy the text object on tween complete to prevent memory leaks
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 2.3 Implement floating text pool limit of 8 simultaneous instances
    - Track active floating texts in an array
    - When limit reached, destroy the oldest before creating a new one
    - _Requirements: 7.4, 7.5_
  - [ ]* 2.4 Write unit tests for FeedbackManager floating text
    - Test that showFloatingText creates text objects with correct position, color, message
    - Test pool limit enforcement destroys oldest when at capacity
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Checkpoint — Core systems
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement machine state derivation and status lights
  - [x] 4.1 Add deriveMachineState() method to FeedbackManager that computes Machine_State from MachineState fields
    - Priority order: blocked → full → wrongInput → processing → ready → automated → upgraded → idle
    - blocked: pendingReleaseItems at capacity AND heldItems at capacity
    - full: heldItems count equals capacity AND no activeInteraction
    - wrongInput: last interaction result was failed (track via a per-machine flag set from GameScene)
    - processing: activeInteraction is not null
    - ready: heldItems count > 0 AND activeInteraction is null
    - automated: automationLevel > 0 AND heldItems count === 0
    - upgraded: any upgrade level > 0 AND heldItems count === 0
    - idle: default
    - _Requirements: 3.1, 10.1_
  - [x] 4.2 Add renderStatusLights() method to FeedbackManager that draws a small colored circle near each machine sprite
    - Color mapping: idle=#888888, ready=#00ff00, processing=#ffcc00, blocked=#ff0000, full=#ff8800, wrongInput=#ff0000, automated=#00ccff, upgraded=#4488ff
    - Use Phaser.GameObjects.Arc or Graphics for the circle, positioned relative to machine sprite
    - Update every frame based on derived Machine_State
    - _Requirements: 3.2, 3.6_
  - [x] 4.3 Track machine state transitions for blocked state shake animation
    - When a machine transitions TO blocked, trigger a horizontal shake tween on the machine sprite (amplitude 3px, 3 oscillations, 300ms)
    - _Requirements: 3.4, 9.4_
  - [ ]* 4.4 Write unit tests for deriveMachineState
    - Test each Machine_State derivation with appropriate MachineState field combinations
    - Test priority ordering when multiple conditions are true
    - _Requirements: 3.1_

- [x] 5. Implement interaction hints
  - [x] 5.1 Add renderInteractionHints() method to FeedbackManager
    - Display Interaction_Hint text near each machine based on derived Machine_State
    - ready + player adjacent: "E: Process"
    - processing: "Working..."
    - blocked: "Blocked!" in red (regardless of player position)
    - full: "Full!" in orange (regardless of player position)
    - wrongInput: "Wrong Step" in red (auto-hide after 1000ms)
    - automated: "Auto Lv. {level}" where level is current automation level
    - Use Phaser text objects, reuse/update each frame rather than creating new ones
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8_
  - [x] 5.2 Add terminal interaction hint
    - When player is adjacent to terminal (position === 'left') and not in terminal mode: show "E: Upgrades" near terminal
    - Hide when terminal is open or player moves away
    - _Requirements: 4.6_
  - [x] 5.3 Implement hint conflict resolution using priority order
    - blocked > full > wrongInput > processing > ready > automated > upgraded > idle
    - Only show the highest-priority hint per machine
    - _Requirements: 4.7_

- [x] 6. Implement item state feedback
  - [x] 6.1 Add item transition detection to FeedbackManager
    - Track previous item states each frame to detect state transitions
    - On state transition: trigger scale-pop tween on the item sprite (scale to 1.3x over 100ms, return to 1.0x over 200ms)
    - _Requirements: 2.1, 2.2, 9.1_
  - [x] 6.2 Add wrong-item feedback
    - When a machine interaction fails because the item state is not in acceptedInputStatuses, show "Wrong Step" floating text in red near the machine and play error sound hook
    - Detect via the interactionState 'failed' result from MachineSystem.update
    - _Requirements: 2.3, 2.4_
  - [x] 6.3 Add packaged-state completion effects
    - When an item transitions to packaged: play a completion pulse (scale to 1.4x over 150ms, return to 1.0x over 250ms) and show "Complete!" floating text in green
    - _Requirements: 2.6, 7.6_
  - [x] 6.4 Add upgraded-state sparkle effect
    - When an item transitions to upgraded: emit a brief particle burst near the item (6 particles, 400ms lifetime) using Phaser particle emitter
    - _Requirements: 9.2_
  - [x] 6.5 Add packaged-state radial pulse effect
    - When an item transitions to packaged: play a radial pulse (expanding circle graphic that fades over 300ms) from the item position
    - _Requirements: 9.3_

- [x] 7. Checkpoint — Item and machine feedback
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement budget feedback
  - [x] 8.1 Add budget change tracking to FeedbackManager
    - Store previousBudget each frame, compare with GameManager.getBudget()
    - On increase: show "+{amount}" floating text in green near budget text, play UI_Pulse (scale to 1.15x over 100ms, return to 1.0x over 150ms), play payment sound hook
    - On decrease: show "-{amount}" floating text in yellow near budget text
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.6, 10.2_
  - [x] 8.2 Add insufficient budget feedback
    - When a purchase is attempted with insufficient budget: show "Need {amount}" floating text in red near budget text, play red-tinted UI_Pulse (400ms) on budget text
    - Expose a method notifyInsufficientBudget(cost) that GameScene calls when TerminalUI purchase fails
    - _Requirements: 5.5, 5.6_
  - [x] 8.3 Add budget text consistency check
    - Each frame in the update method, verify budget text matches GameManager.getBudget() and correct if mismatched
    - _Requirements: 5.7, 10.7_

- [x] 9. Implement upgrade feedback in TerminalUI
  - [x] 9.1 Add current level display to TerminalUI upgrade-select phase
    - Show "{level} / {maxLevel}" (e.g., "3 / 10") for each upgrade type in renderUpgradeSelect
    - _Requirements: 6.1_
  - [x] 9.2 Add next-upgrade preview to TerminalUI upgrade-select phase
    - Below the cost label, show preview of next upgrade effect using the upgrade tables:
    - Speed: "{current}ms → {next}ms" from AUTOMATION_SPEED_TABLE
    - Capacity: "Cap: {current} → {next}" from CAPACITY_TABLE
    - Quality: "Qual: {current}x → {next}x" from QUALITY_MODIFIER_TABLE
    - Automation: "Auto: {current} → {next}" from AUTOMATION_LEVEL_TABLE
    - Hide preview when at max level, show "MAX" in yellow instead
    - _Requirements: 6.2, 6.3, 6.4, 10.3, 10.4_
  - [x] 9.3 Add upgrade purchase feedback hooks
    - After successful purchase in TerminalUI.handleInput: call FeedbackManager methods to play level-up sound, show "Upgraded!" floating text in green, and play UI_Pulse on terminal sprite (400ms)
    - After failed purchase at max level: show "MAX" floating text in yellow
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 8.5_

- [x] 10. Implement visual juice effects
  - [x] 10.1 Add processing glow effect to FeedbackManager
    - When a machine is actively processing via player interaction: oscillate machine sprite alpha between 0.85 and 1.0 at one cycle per 600ms using a Phaser tween
    - Stop the tween when interaction ends
    - _Requirements: 9.7_
  - [x] 10.2 Add terminal flash-white effect
    - On successful upgrade purchase: briefly tint the terminal sprite white (0xffffff) for 200ms then clear tint
    - _Requirements: 9.5_
  - [x] 10.3 Add machine blocked shake animation
    - Horizontal shake: amplitude 3px, 3 oscillations, 300ms total using Phaser tween on the machine sprite x position
    - Triggered on transition to blocked state (already detected in task 4.3)
    - _Requirements: 9.4, 3.4_
  - [x] 10.4 Ensure all visual effects use Phaser tweens and complete within 500ms
    - Audit all tween durations to confirm none exceed 500ms
    - Use Phaser.Tweens for all animations, no manual per-frame tracking
    - _Requirements: 9.8, 9.9_

- [x] 11. Checkpoint — Budget, upgrade, and visual effects
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integrate FeedbackManager into GameScene
  - [x] 12.1 Instantiate FeedbackManager in GameScene.create()
    - Pass scene, layoutSystem, gameManager, audioManager, and references to scoreText and budgetText
    - Register existing feedback elements (machine sprite texture-swap, ITEM_STATE_ASSET mapping, SequenceInputUI, AudioManager)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 12.2 Wire FeedbackManager.update() into GameScene.update()
    - Call feedbackManager.update(delta) each frame, passing current machine states, items, player position, and interaction results
    - Pass MachineSystem.getMachines() for machine state derivation
    - Pass interactionState from MachineSystem.update result for wrongInput tracking
    - _Requirements: 10.1, 10.5_
  - [x] 12.3 Wire sound hooks into existing GameScene event flow
    - playMachineUse on process start (already exists — verify FeedbackManager doesn't duplicate)
    - playScore on item exit (already exists — verify)
    - playError on wrong input and blocked machine interaction attempt
    - playLevelUp on successful upgrade purchase
    - playPayment on budget earned (item payout)
    - playWarning on automation trigger when machine is full
    - _Requirements: 8.5, 10.6_
  - [x] 12.4 Wire upgrade purchase events from TerminalUI to FeedbackManager
    - Detect budget decrease in GameScene terminal input handling (already tracks budgetBefore)
    - On purchase success: call feedbackManager upgrade feedback methods
    - On insufficient budget: call feedbackManager.notifyInsufficientBudget(cost)
    - On max level attempt: call feedbackManager max level feedback
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 5.5, 5.6_
  - [x] 12.5 Wire item state transition detection
    - Pass item sprite pool references to FeedbackManager so it can apply tweens to the correct sprites
    - Connect item state change detection to scale-pop, sparkle, and radial pulse effects
    - _Requirements: 2.2, 9.1, 9.2, 9.3_
  - [x] 12.6 Handle resize for FeedbackManager UI elements
    - Reposition status lights, interaction hints, and any active floating text on scale.resize event
    - _Requirements: 1.1_

- [x] 13. Add automation and remaining floating text triggers
  - [x] 13.1 Add automation trigger floating text
    - When AutomationSystem processes an item: show "Auto" floating text in cyan near the machine
    - When automation triggers on a full machine: play warning sound hook
    - _Requirements: 7.6, 8.5_
  - [x] 13.2 Wire all remaining floating text event triggers per Requirement 7.6
    - Verify all 10 floating text events are connected: budget earned, budget spent, upgrade bought, machine blocked, machine full, wrong item, max upgrade, insufficient budget, item completed, automation triggered
    - _Requirements: 7.6_
  - [x] 13.3 Ensure FeedbackManager reads all state from GameManager and MachineSystem without caching
    - Verify no independent budget, upgrade level, or machine state caching in FeedbackManager
    - Only previousBudget for change detection is allowed (compared fresh each frame)
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 14. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 10 requirements are covered by implementation
  - Verify FeedbackManager reads from GameManager as single source of truth
  - Verify no duplicate feedback elements (reuses existing budget text, machine sprites, AudioManager)
  - Verify all floating text events fire correctly
  - Verify all sound hooks are connected
  - Verify all visual effects use Phaser tweens and complete within 500ms

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The FeedbackManager is a new system in `src/systems/` following the existing architecture pattern
- All animations use Phaser tweens per Requirement 9.9 — no manual per-frame animation tracking
- The design.md is empty, so tasks are derived directly from the detailed requirements document
- Existing AudioManager, TerminalUI, and GameScene patterns are extended rather than replaced
