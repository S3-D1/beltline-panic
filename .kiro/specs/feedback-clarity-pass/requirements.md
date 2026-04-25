# Requirements Document

## Introduction

The Feedback Clarity Pass improves player understanding of all active gameplay states in Beltline Panic. The game already has functional systems for items, machines, budget, upgrades, and automation, but the feedback layer is incomplete: machine states are only communicated through sprite texture swaps (three textures), items change sprite by state but lack transition feedback, budget is displayed as static text, the upgrade terminal shows cost and MAX but not current level or preview, and there are no floating text indicators, interaction hints, or visual juice effects. This feature adds a centralized FeedbackManager that layers readable hints, floating text, sound hooks, and small visual effects on top of existing systems without changing gameplay logic, values, or balance.

## Glossary

- **FeedbackManager**: A new centralized system responsible for dispatching floating text, UI pulses, world hints, sound hooks, and visual effects in response to gameplay events.
- **GameManager**: The existing source-of-truth system that tracks score, budget, upgrade levels, upgrade costs, machine value configs, delivery progression, and belt speed.
- **MachineSystem**: The existing system that manages machine states, item intake, player interactions, auto-processing, and pending releases.
- **ItemSystem**: The existing system that handles item spawning, conveyor movement, collision detection, and exit scoring.
- **AudioManager**: The existing central audio system that plays music and SFX, supports mute control, and adjusts gameplay music speed.
- **TerminalUI**: The existing upgrade terminal overlay that handles machine-select and upgrade-select phases, displays costs and MAX labels.
- **Machine_State**: One of: idle, ready, processing, blocked, full, wrongInput, automated, upgraded, disabled. Derived from MachineState fields (heldItems, activeInteraction, automationLevel, capacity, pendingReleaseItems, autoProcessing).
- **Item_State**: One of the ConveyorConfig item states: new, processed, upgraded, packaged.
- **Floating_Text**: A short text label that appears near an event location, rises or fades over a brief duration, and auto-destroys.
- **Interaction_Hint**: A contextual text label displayed near a machine or terminal indicating the available or blocked action.
- **Status_Light**: A small colored indicator rendered near a machine sprite that communicates the current Machine_State.
- **UI_Pulse**: A brief scale or alpha animation applied to a UI element to draw attention to a value change.
- **Sound_Hook**: A call to AudioManager to play a specific SFX key in response to a gameplay event, failing silently when the audio file is missing or sound is muted.

## Requirements

### Requirement 1: Existing Feedback Audit

**User Story:** As a developer, I want to audit existing feedback elements before adding new ones, so that the implementation reuses and extends what already exists rather than duplicating or conflicting.

#### Acceptance Criteria

1. WHEN the FeedbackManager is initialized, THE FeedbackManager SHALL detect and register existing feedback elements including the budget text display, the score text display, the machine sprite texture-swap system, the item sprite state-asset mapping, the SequenceInputUI, and the AudioManager SFX methods.
2. THE FeedbackManager SHALL reuse the existing budget text Phaser.GameObjects.Text instance for budget display updates rather than creating a duplicate.
3. THE FeedbackManager SHALL reuse the existing machine sprite texture-swap logic in GameScene.updateMachineSprites rather than replacing it.
4. THE FeedbackManager SHALL reuse the existing ITEM_STATE_ASSET mapping for base item visuals rather than introducing a separate item rendering path.
5. THE FeedbackManager SHALL extend the existing AudioManager by adding new SFX methods for missing sound hooks (level-up, payment, warning) rather than creating a parallel audio system.
6. WHEN a new feedback element is created that did not previously exist, THE FeedbackManager SHALL log the element type to the console at initialization for development traceability.

### Requirement 2: Item State Feedback

**User Story:** As a player, I want items to be visually distinguishable by their current state, so that I can immediately understand what each item is and what it needs next.

#### Acceptance Criteria

1. THE FeedbackManager SHALL display each item using the existing ITEM_STATE_ASSET sprite for its current Item_State (new, processed, upgraded, packaged).
2. WHEN an item transitions from one Item_State to another after successful machine processing, THE FeedbackManager SHALL play a brief scale-pop animation on the item sprite lasting no more than 300ms.
3. WHEN a player attempts to interact with a machine using an item whose Item_State is not in the machine's acceptedInputStatuses, THE FeedbackManager SHALL display a Floating_Text reading "Wrong Step" near the machine position in red color.
4. WHEN a player attempts to interact with a machine using an item whose Item_State is not accepted, THE FeedbackManager SHALL play the error Sound_Hook.
5. WHILE a machine is processing an item via player interaction, THE FeedbackManager SHALL apply a gentle pulsing alpha animation to the item sprite inside the SequenceInputUI at a rate of one cycle per 800ms.
6. WHEN an item reaches the packaged state, THE FeedbackManager SHALL play a completion pulse effect on the item sprite lasting no more than 400ms.

### Requirement 3: Machine State Feedback

**User Story:** As a player, I want each machine to clearly communicate its current state, so that I can make quick decisions about where to go and what to do.

#### Acceptance Criteria

1. THE FeedbackManager SHALL derive a Machine_State for each machine every frame from MachineState fields using the following priority order (highest first): blocked (pendingReleaseItems at capacity and heldItems at capacity), full (heldItems count equals capacity and no activeInteraction), wrongInput (last interaction result was failed), processing (activeInteraction is not null), ready (heldItems count is greater than zero and activeInteraction is null), automated (automationLevel is greater than zero and heldItems count equals zero), upgraded (any upgrade level is greater than zero and heldItems count equals zero), idle (default).
2. THE FeedbackManager SHALL render a Status_Light as a small colored circle near each machine sprite using the following color mapping: idle as gray (#888888), ready as green (#00ff00), processing as yellow (#ffcc00), blocked as red (#ff0000), full as orange (#ff8800), wrongInput as red (#ff0000), automated as cyan (#00ccff), upgraded as blue (#4488ff).
3. THE FeedbackManager SHALL display an Interaction_Hint text near each machine reflecting the current Machine_State using the priority order defined in acceptance criterion 1.
4. WHEN a machine transitions to the blocked state, THE FeedbackManager SHALL play a brief shake animation on the machine sprite with amplitude no greater than 4 pixels and duration no greater than 400ms.
5. WHEN a machine transitions to the processing state via player interaction, THE FeedbackManager SHALL play the machine-use Sound_Hook.
6. THE FeedbackManager SHALL use at least three distinct feedback channels per machine from the set: Status_Light, Interaction_Hint, sprite texture swap, animation, Floating_Text, progress indicator, Sound_Hook, UI_Pulse.

### Requirement 4: Interaction Hints

**User Story:** As a player, I want contextual hints near machines and terminals, so that I always know what action is available or why an action is blocked.

#### Acceptance Criteria

1. WHEN the player is adjacent to a machine in the ready state, THE FeedbackManager SHALL display an Interaction_Hint reading "E: Process" near the machine.
2. WHEN the player is adjacent to a machine in the processing state, THE FeedbackManager SHALL display an Interaction_Hint reading "Working..." near the machine.
3. WHEN a machine is in the blocked state, THE FeedbackManager SHALL display an Interaction_Hint reading "Blocked!" near the machine in red color regardless of player position.
4. WHEN a machine is in the full state, THE FeedbackManager SHALL display an Interaction_Hint reading "Full!" near the machine in orange color regardless of player position.
5. WHEN a machine interaction fails due to wrong input, THE FeedbackManager SHALL display an Interaction_Hint reading "Wrong Step" near the machine in red color for no more than 1000ms.
6. WHEN the player is adjacent to the upgrade terminal, THE FeedbackManager SHALL display an Interaction_Hint reading "E: Upgrades" near the terminal.
7. THE FeedbackManager SHALL resolve hint conflicts using the following priority order (highest first): blocked, full, wrongInput, processing, ready, automated, upgraded, idle.
8. WHEN a machine has automationLevel greater than zero and is in the automated state, THE FeedbackManager SHALL display an Interaction_Hint reading "Auto Lv. {level}" where {level} is the current automation level.

### Requirement 5: Budget Feedback

**User Story:** As a player, I want clear feedback when my budget changes, so that I always know how much money I have and when it increases or decreases.

#### Acceptance Criteria

1. THE FeedbackManager SHALL keep the budget text display visible and updated every frame to match the GameManager budget value during gameplay.
2. WHEN the GameManager budget increases due to item payout, THE FeedbackManager SHALL display a Floating_Text reading "+{amount}" in green color near the budget text display, where {amount} is the payout value.
3. WHEN the GameManager budget increases, THE FeedbackManager SHALL play a UI_Pulse animation on the budget text display lasting no more than 300ms.
4. WHEN the GameManager budget decreases due to an upgrade purchase, THE FeedbackManager SHALL display a Floating_Text reading "-{amount}" in yellow color near the budget text display, where {amount} is the purchase cost.
5. WHEN a player attempts an upgrade purchase with insufficient budget, THE FeedbackManager SHALL display a Floating_Text reading "Need {amount}" in red color near the budget text display, where {amount} is the upgrade cost.
6. WHEN a player attempts an upgrade purchase with insufficient budget, THE FeedbackManager SHALL play a red-tinted UI_Pulse animation on the budget text display lasting no more than 400ms.
7. THE budget text display value SHALL equal the GameManager.getBudget() return value at the end of every frame.

### Requirement 6: Upgrade Feedback

**User Story:** As a player, I want to see my current upgrade levels, preview the next upgrade effect, and get clear feedback on purchases, so that I can make informed upgrade decisions.

#### Acceptance Criteria

1. WHILE the TerminalUI is in the upgrade-select phase, THE TerminalUI SHALL display the current level and max level for each upgrade type in the format "{level} / {maxLevel}" (e.g., "3 / 10").
2. WHILE the TerminalUI is in the upgrade-select phase and an upgrade is not at max level, THE TerminalUI SHALL display a preview of the next upgrade effect below the cost label (e.g., "Speed: 800ms → 700ms" for automation speed, "Cap: 2 → 3" for capacity, "Qual: 1.15x → 1.30x" for quality, "Auto: 2 → 3" for automation level).
3. WHEN an upgrade has reached max level, THE TerminalUI SHALL display "MAX" in yellow color in place of the cost and hide the preview text.
4. WHILE the TerminalUI is in the upgrade-select phase, THE TerminalUI SHALL visually distinguish affordable upgrades (green cost text) from unaffordable upgrades (red cost text) using the existing color scheme.
5. WHEN a player successfully purchases an upgrade, THE FeedbackManager SHALL play the level-up Sound_Hook.
6. WHEN a player successfully purchases an upgrade, THE FeedbackManager SHALL display a Floating_Text reading "Upgraded!" in green color near the terminal.
7. WHEN a player successfully purchases an upgrade, THE FeedbackManager SHALL play a UI_Pulse animation on the terminal sprite lasting no more than 400ms.
8. WHEN a player attempts to purchase an upgrade at max level, THE FeedbackManager SHALL display a Floating_Text reading "MAX" in yellow color near the terminal.

### Requirement 7: Floating Feedback Text

**User Story:** As a player, I want short floating text messages for important gameplay events, so that I get immediate confirmation of what just happened.

#### Acceptance Criteria

1. THE FeedbackManager SHALL provide a showFloatingText method that accepts position (x, y), message string, color, and optional duration parameters.
2. WHEN showFloatingText is called, THE FeedbackManager SHALL create a Phaser text object at the specified position that rises upward by no more than 30 pixels and fades to zero alpha over the specified duration, defaulting to 1000ms.
3. WHEN the Floating_Text animation completes, THE FeedbackManager SHALL destroy the Phaser text object to prevent memory leaks.
4. THE FeedbackManager SHALL limit the number of simultaneously visible Floating_Text instances to no more than 8 to prevent visual clutter.
5. WHEN a new Floating_Text is requested and the limit of 8 is reached, THE FeedbackManager SHALL destroy the oldest visible Floating_Text before creating the new one.
6. THE FeedbackManager SHALL display Floating_Text for the following events: budget earned ("+{amount}" green), budget spent ("-{amount}" yellow), upgrade bought ("Upgraded!" green), machine blocked ("Blocked!" red), machine full ("Full!" orange), wrong item ("Wrong Step" red), max upgrade ("MAX" yellow), insufficient budget ("Need {amount}" red), item completed (packaged state reached, "Complete!" green), automation triggered ("Auto" cyan).

### Requirement 8: Sound Hooks

**User Story:** As a player, I want audio feedback for important gameplay events, so that I receive multi-sensory confirmation of actions and state changes.

#### Acceptance Criteria

1. THE AudioManager SHALL expose the following additional SFX methods: playLevelUp() using the sfx_level_up audio key, playPayment() using the sfx_payment audio key, playWarning() using the sfx_warning audio key.
2. THE AudioManager SHALL register the audio keys SFX_LEVEL_UP, SFX_PAYMENT, and SFX_WARNING in the AUDIO_KEYS constant mapping to the existing audio files sfx_level_up.wav, sfx_payment.wav, and sfx_warning.wav.
3. WHEN a Sound_Hook method is called and the corresponding audio file is not loaded, THE AudioManager SHALL log a warning to the console and continue without throwing an error.
4. WHILE the AudioManager mute state is true, THE AudioManager SHALL suppress all Sound_Hook playback.
5. THE FeedbackManager SHALL call the following Sound_Hooks for gameplay events: playMachineUse() on process start, playScore() on process complete (item exits belt), playError() on wrong input and on blocked machine interaction attempt, playLevelUp() on successful upgrade purchase, playPayment() on budget earned (item payout), playWarning() on automation trigger when machine is full.

### Requirement 9: Visual Juice Effects

**User Story:** As a player, I want small visual effects that make the game feel responsive and satisfying, so that interactions feel impactful without distracting from gameplay.

#### Acceptance Criteria

1. WHEN an item successfully transitions to a new Item_State, THE FeedbackManager SHALL play a scale-pop effect on the item sprite that scales to 1.3x over 100ms then returns to 1.0x over 200ms.
2. WHEN an item transitions to the upgraded state, THE FeedbackManager SHALL play a brief sparkle particle effect near the item position using no more than 6 particles lasting no more than 400ms.
3. WHEN an item transitions to the packaged state, THE FeedbackManager SHALL play a radial pulse effect expanding outward from the item position over 300ms then fading.
4. WHEN a machine transitions to the blocked state, THE FeedbackManager SHALL play a horizontal shake animation on the machine sprite with amplitude of 3 pixels, frequency of 3 oscillations, and total duration of 300ms.
5. WHEN a player successfully purchases an upgrade, THE FeedbackManager SHALL play a brief flash-white effect on the terminal sprite lasting no more than 200ms.
6. WHEN the budget text value changes, THE FeedbackManager SHALL play a scale-pulse on the budget text that scales to 1.15x over 100ms then returns to 1.0x over 150ms.
7. WHEN a machine is actively processing via player interaction, THE FeedbackManager SHALL apply a slow pulsing glow effect to the machine sprite by oscillating alpha between 0.85 and 1.0 at a rate of one cycle per 600ms.
8. THE FeedbackManager SHALL ensure all visual effects complete within 500ms to avoid overlapping with subsequent gameplay events.
9. THE FeedbackManager SHALL use Phaser tweens for all animations to maintain consistency with the existing rendering approach and avoid manual per-frame animation tracking.

### Requirement 10: GameManager Integration

**User Story:** As a developer, I want all feedback to read from GameManager as the single source of truth, so that displayed values are always accurate and consistent with game state.

#### Acceptance Criteria

1. THE FeedbackManager SHALL read machine capacity, automation level, and held item count from MachineState objects provided by MachineSystem.getMachines() rather than maintaining independent state.
2. THE FeedbackManager SHALL read budget values exclusively from GameManager.getBudget() rather than caching or computing budget independently.
3. THE FeedbackManager SHALL read upgrade levels exclusively from GameManager.getUpgradeLevel() for all upgrade level displays and previews.
4. THE FeedbackManager SHALL compute upgrade cost previews using GameManager.getUpgradeCost() and the corresponding upgrade table (AUTOMATION_SPEED_TABLE, CAPACITY_TABLE, QUALITY_MODIFIER_TABLE, AUTOMATION_LEVEL_TABLE) for next-level value lookups.
5. WHEN GameManager.applyUpgrades() is called after a purchase, THE FeedbackManager SHALL reflect the updated machine values in the next frame without requiring a manual refresh call.
6. THE FeedbackManager SHALL read the AudioManager mute state via AudioManager.isMuted() before dispatching any Sound_Hook to respect the existing mute control.
7. IF the FeedbackManager detects a mismatch between displayed budget text and GameManager.getBudget(), THEN THE FeedbackManager SHALL correct the displayed value immediately in the same frame.
