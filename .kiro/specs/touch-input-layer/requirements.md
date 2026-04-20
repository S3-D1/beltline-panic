# Requirements Document

## Introduction

This feature adds a touch-capable input layer to Beltline Panic. Five on-screen buttons (Left, Right, Up, Down, Interact) are placed in the center area of GameScene. These buttons serve two purposes: they provide touch and mouse input as an alternative to keyboard controls, and they act as a unified visual feedback channel for all input sources including keyboard. The StartScene is also extended to support tap and click as an alternative to keyboard start. All input sources (keyboard, mouse, touch) feed into the same action handling layer so gameplay behavior is identical regardless of input method.

## Glossary

- **Touch_Button**: An on-screen interactive element in GameScene that represents one of the five game actions (Left, Right, Up, Down, Interact) and responds to pointer events.
- **Pointer_Event**: A Phaser 3 input event that covers both mouse clicks and touch taps through a single API.
- **Action_Layer**: The unified input handling layer that receives actions from keyboard, mouse, and touch sources and dispatches them to gameplay systems.
- **Positive_Feedback**: A brief visual animation on a Touch_Button indicating that the associated action was accepted by the game (movement succeeded, correct sequence input, successful interaction start).
- **Negative_Feedback**: A brief visual animation on a Touch_Button indicating that the associated action was rejected by the game (movement blocked, wrong sequence direction, interaction not possible).
- **Default_Appearance**: The resting visual state of a Touch_Button: strongly transparent with a subtle border, visually unobtrusive against the game layout.
- **InputSystem**: The existing gameplay system that manages player position via a five-position state machine (center, up, down, left, right).
- **GameScene**: The main gameplay scene containing the conveyor belt, machines, player, and all interactive systems.
- **StartScene**: The title screen scene that currently starts the game on any keyboard press.
- **MachineSystem**: The gameplay system that manages machine interaction, item intake, sequence validation, and item output.
- **Feedback_Duration**: The short time window during which a Touch_Button displays Positive_Feedback or Negative_Feedback before returning to Default_Appearance.

## Requirements

### Requirement 1: On-Screen Button Layout

**User Story:** As a player, I want to see five on-screen buttons in the center area of GameScene, so that I can identify the available actions and use them for touch input.

#### Acceptance Criteria

1. THE GameScene SHALL display five Touch_Buttons representing the actions Left, Right, Up, Down, and Interact.
2. THE GameScene SHALL position the Touch_Buttons in the center area of the game layout, arranged in a directional cross pattern with the Interact button at the center.
3. THE Touch_Buttons SHALL use a strongly transparent appearance by default so that the conveyor belt and gameplay elements remain visible behind them.
4. THE Touch_Buttons SHALL have a visible border so that the player can identify each button despite the high transparency.
5. THE Touch_Buttons SHALL use a minimal placeholder visual style consistent with the existing game aesthetic.

### Requirement 2: Unified Action Layer

**User Story:** As a developer, I want all input sources to feed into a single action handling layer, so that gameplay behavior is identical regardless of whether the player uses keyboard, mouse, or touch.

#### Acceptance Criteria

1. THE Action_Layer SHALL accept actions from keyboard input, mouse pointer events, and touch pointer events.
2. WHEN a Touch_Button is activated by a Pointer_Event, THE Action_Layer SHALL dispatch the same action as the equivalent keyboard input.
3. THE Action_Layer SHALL treat mouse clicks and touch taps identically through Phaser 3 pointer events.
4. THE GameScene SHALL consume actions from the Action_Layer instead of reading keyboard state directly for player movement and machine interaction.
5. THE Action_Layer SHALL support future extension to additional input sources without requiring changes to gameplay systems.

### Requirement 3: Touch and Mouse Button Activation

**User Story:** As a player, I want to tap or click the on-screen buttons to perform game actions, so that I can play the game without a keyboard.

#### Acceptance Criteria

1. WHEN the player presses a Touch_Button via touch tap, THE Action_Layer SHALL dispatch the corresponding action.
2. WHEN the player presses a Touch_Button via mouse click, THE Action_Layer SHALL dispatch the corresponding action.
3. WHEN the player presses the Left Touch_Button, THE Action_Layer SHALL dispatch a left action.
4. WHEN the player presses the Right Touch_Button, THE Action_Layer SHALL dispatch a right action.
5. WHEN the player presses the Up Touch_Button, THE Action_Layer SHALL dispatch an up action.
6. WHEN the player presses the Down Touch_Button, THE Action_Layer SHALL dispatch a down action.
7. WHEN the player presses the Interact Touch_Button, THE Action_Layer SHALL dispatch an interact action.

### Requirement 4: StartScene Touch and Click Support

**User Story:** As a player, I want to start the game by tapping or clicking the screen, so that I can begin playing without a keyboard.

#### Acceptance Criteria

1. THE StartScene SHALL continue to start the game when any keyboard key is pressed.
2. WHEN the player taps or clicks anywhere on the StartScene, THE StartScene SHALL start the game.
3. THE StartScene SHALL treat mouse clicks and touch taps identically through Phaser 3 pointer events.
4. THE StartScene SHALL display text indicating that tap or click is an alternative way to start the game.

### Requirement 5: Button Visibility During Gameplay

**User Story:** As a player, I want the on-screen buttons to remain visible during gameplay, so that I always have access to touch controls and can see input feedback.

#### Acceptance Criteria

1. WHILE the GameScene is active, THE Touch_Buttons SHALL remain visible on screen.
2. THE Touch_Buttons SHALL remain interactive during all gameplay states including navigation and machine interaction.
3. THE Touch_Buttons SHALL be rendered above the conveyor belt and gameplay elements so that the player can always interact with them.

### Requirement 6: Positive Visual Feedback

**User Story:** As a player, I want to see a brief visual confirmation on the matching button when my input is accepted, so that I get clear feedback that my action succeeded.

#### Acceptance Criteria

1. WHEN an action is accepted by the game, THE corresponding Touch_Button SHALL briefly reduce its transparency to become more visible.
2. WHEN an action is accepted by the game, THE corresponding Touch_Button SHALL briefly strengthen its border to become more prominent.
3. WHEN the Feedback_Duration ends after Positive_Feedback, THE Touch_Button SHALL return to its Default_Appearance.
4. THE Positive_Feedback SHALL be triggered for accepted actions regardless of whether the action originated from keyboard, mouse, or touch input.

### Requirement 7: Negative Visual Feedback

**User Story:** As a player, I want to see a brief visual warning on the matching button when my input is rejected, so that I understand my action was not possible.

#### Acceptance Criteria

1. WHEN an action is rejected by the game, THE corresponding Touch_Button SHALL briefly display a transparent red color.
2. WHEN an action is rejected by the game, THE corresponding Touch_Button SHALL play a short shaky animation.
3. WHEN the Feedback_Duration ends after Negative_Feedback, THE Touch_Button SHALL return to its Default_Appearance.
4. THE Negative_Feedback SHALL be triggered for rejected actions regardless of whether the action originated from keyboard, mouse, or touch input.

### Requirement 8: Feedback Trigger Conditions

**User Story:** As a developer, I want clear rules for when positive and negative feedback are triggered, so that the feedback system is consistent and predictable.

#### Acceptance Criteria

1. WHEN a movement action succeeds and the player changes position, THE Action_Layer SHALL trigger Positive_Feedback on the corresponding directional Touch_Button.
2. WHEN a movement action is blocked because the player cannot move in that direction, THE Action_Layer SHALL trigger Negative_Feedback on the corresponding directional Touch_Button.
3. WHEN a correct directional input is entered during machine interaction, THE Action_Layer SHALL trigger Positive_Feedback on the corresponding directional Touch_Button.
4. WHEN an incorrect directional input is entered during machine interaction, THE Action_Layer SHALL trigger Negative_Feedback on the corresponding directional Touch_Button.
5. WHEN the player successfully starts a machine interaction, THE Action_Layer SHALL trigger Positive_Feedback on the Interact Touch_Button.
6. WHEN the player presses interact but no interaction is possible, THE Action_Layer SHALL trigger Negative_Feedback on the Interact Touch_Button.

### Requirement 9: Feedback Timing and Cleanup

**User Story:** As a player, I want feedback animations to be quick and clean, so that they do not interfere with fast-paced gameplay.

#### Acceptance Criteria

1. THE Feedback_Duration SHALL be short enough to remain readable during fast gameplay without blocking subsequent inputs.
2. WHEN a new feedback animation is triggered on a Touch_Button that is already animating, THE Touch_Button SHALL cancel the previous animation and start the new one.
3. WHEN the Feedback_Duration ends, THE Touch_Button SHALL restore to its exact Default_Appearance with no visual artifacts remaining.
4. THE Positive_Feedback and Negative_Feedback SHALL use the same base Touch_Button elements and SHALL NOT create separate UI widgets.

### Requirement 10: Feedback Callable from Gameplay Systems

**User Story:** As a developer, I want button feedback to be callable from any gameplay system, so that feedback is not hardcoded inside button event handlers.

#### Acceptance Criteria

1. THE Touch_Button feedback API SHALL be accessible from the GameScene and any gameplay system that needs to trigger visual feedback.
2. THE Touch_Button feedback API SHALL accept an action identifier and a feedback type (positive or negative) as parameters.
3. THE GameScene SHALL call the feedback API based on the results returned by the InputSystem and MachineSystem, not from within the Touch_Button pointer event handlers alone.

### Requirement 11: Architecture and Extensibility

**User Story:** As a developer, I want the touch input layer to be structured for future extension, so that mobile-focused play and additional input features can be added without a rewrite.

#### Acceptance Criteria

1. THE Action_Layer SHALL be implemented as a separate system or module that can be extended independently of the GameScene.
2. THE Touch_Button rendering and feedback logic SHALL be encapsulated in a dedicated UI component under the src/ui directory.
3. THE Action_Layer SHALL decouple input source detection from action dispatch so that new input sources can be added without modifying existing gameplay systems.
4. THE implementation SHALL use Phaser 3 pointer events for mouse and touch support and SHALL NOT introduce additional input libraries.

### Requirement 12: Build and Runtime Compatibility

**User Story:** As a developer, I want the touch input layer to integrate cleanly with the existing project, so that the game continues to build and run correctly.

#### Acceptance Criteria

1. WHEN the touch input layer is added, THE project SHALL continue to build without errors using the existing Vite and TypeScript configuration.
2. WHEN the touch input layer is added, THE existing keyboard controls SHALL continue to function identically to their current behavior.
3. THE touch input layer SHALL NOT introduce new external dependencies beyond Phaser 3.
4. THE touch input layer SHALL NOT modify the existing conveyor, item, or machine system logic beyond consuming actions from the Action_Layer instead of reading keyboard state directly.
