# Requirements Document

## Introduction

This feature replaces the current `SequenceInputUI` with a dedicated overlay box positioned above Machine 1 that displays the required input sequence during machine interaction. The overlay supports uninterrupted processing of multiple queued items within the same machine, showing clear transitions between item sequences. The overlay is only visible while the player is actively interacting with a machine and always renders at the same fixed position above Machine 1, regardless of which machine the player is operating.

## Glossary

- **Overlay_Box**: A temporary, rectangular UI container rendered above Machine 1 that displays the current input sequence during machine interaction.
- **Sequence_Display**: The row of directional arrow symbols inside the Overlay_Box representing the required input steps.
- **Step_Indicator**: A single arrow symbol within the Sequence_Display, color-coded to reflect its completion state (pending, completed, or failed).
- **Machine_System**: The system (`MachineSystem`) that manages machine state, item intake, interaction sequences, and item output.
- **Active_Interaction**: The currently active player-machine interaction, containing the item, sequence, and step progress.
- **Queued_Item**: An item held in a machine's `heldItems` array awaiting processing after the current interaction completes.
- **Sequence_Transition**: The brief visual pause between completing one item's sequence and beginning the next queued item's sequence.
- **Player**: The factory worker controlled by the user.
- **Direction**: One of the four directional inputs: up, down, left, or right.

## Requirements

### Requirement 1: Overlay Box Visibility

**User Story:** As a player, I want the sequence overlay to appear only while I am actively interacting with a machine, so that it does not clutter the screen during navigation.

#### Acceptance Criteria

1. WHEN the Player starts a machine interaction, THE Overlay_Box SHALL become visible.
2. WHEN the Active_Interaction ends with a success result and no Queued_Item remains in the machine, THE Overlay_Box SHALL hide after a brief result display period.
3. WHEN the Active_Interaction ends with a failed result, THE Overlay_Box SHALL hide after a brief result display period.
4. WHEN the Active_Interaction is cancelled by the Player, THE Overlay_Box SHALL hide after a brief result display period.
5. WHILE no Active_Interaction exists, THE Overlay_Box SHALL remain hidden.
6. THE Overlay_Box SHALL use a consistent result display delay of 600 milliseconds before hiding.

### Requirement 2: Overlay Box Positioning

**User Story:** As a player, I want the sequence display to always appear in the same location above Machine 1, so that I always know where to look regardless of which machine I am operating.

#### Acceptance Criteria

1. THE Overlay_Box SHALL be positioned above Machine 1 in the game layout.
2. THE Overlay_Box SHALL be horizontally centered relative to Machine 1.
3. WHILE the Player is interacting with any machine, THE Overlay_Box SHALL render at the fixed position above Machine 1.
4. WHEN the game window is resized, THE Overlay_Box SHALL reposition itself using the LayoutSystem scaling to maintain its relative position above Machine 1.

### Requirement 3: Sequence Display

**User Story:** As a player, I want to see the full required input sequence with clear directional arrows, so that I know exactly which inputs to enter.

#### Acceptance Criteria

1. WHEN an Active_Interaction begins, THE Sequence_Display SHALL render one Step_Indicator per required Direction in the sequence.
2. THE Sequence_Display SHALL use arrow symbols (↑, ↓, ←, →) to represent each Direction.
3. THE Sequence_Display SHALL arrange Step_Indicators in a horizontal row within the Overlay_Box.
4. WHEN an Active_Interaction begins, THE Sequence_Display SHALL show all Step_Indicators in a pending color (grey).
5. THE Sequence_Display SHALL use monospace font to ensure consistent arrow spacing.

### Requirement 4: Step Progress Feedback

**User Story:** As a player, I want to see which steps I have completed and which remain, so that I can track my progress through the sequence.

#### Acceptance Criteria

1. WHEN the Player enters a correct Direction input, THE Sequence_Display SHALL change the corresponding Step_Indicator color from pending (grey) to completed (green).
2. WHEN the Player enters an incorrect Direction input, THE Sequence_Display SHALL change the failed Step_Indicator color to failed (red).
3. THE Sequence_Display SHALL update Step_Indicator colors immediately upon input, with no perceptible delay.
4. WHILE an Active_Interaction is in progress, THE Sequence_Display SHALL preserve the color state of all previously completed Step_Indicators.

### Requirement 5: Success Result Display

**User Story:** As a player, I want clear visual confirmation when I complete a sequence successfully, so that I know the item was processed.

#### Acceptance Criteria

1. WHEN the Player completes all steps in the sequence correctly, THE Sequence_Display SHALL change all Step_Indicators to the completed color (green).
2. WHEN a sequence is completed successfully, THE Overlay_Box SHALL display the success state for the result display period before transitioning.

### Requirement 6: Failure Result Display

**User Story:** As a player, I want to see which step I failed on, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN the Player enters an incorrect Direction, THE Sequence_Display SHALL mark the failed step in the failed color (red).
2. WHEN a sequence fails, THE Overlay_Box SHALL display the failure state for the result display period before hiding.

### Requirement 7: Cancellation Result Display

**User Story:** As a player, I want feedback when I cancel an interaction, so that I know the action was intentional.

#### Acceptance Criteria

1. WHEN the Player cancels an Active_Interaction, THE Overlay_Box SHALL display a "Cancelled" label.
2. WHEN an interaction is cancelled, THE Overlay_Box SHALL hide the Step_Indicators and show only the cancellation label.
3. WHEN an interaction is cancelled, THE Overlay_Box SHALL display the cancellation state for the result display period before hiding.

### Requirement 8: Multi-Item Queue Processing

**User Story:** As a player, I want to process multiple items in a row without leaving the machine, so that I can work efficiently under pressure.

#### Acceptance Criteria

1. WHEN the Player completes a sequence successfully and the machine contains at least one Queued_Item, THE Machine_System SHALL automatically start a new Active_Interaction with the next Queued_Item.
2. WHEN a new Active_Interaction starts after a successful completion, THE Overlay_Box SHALL remain visible and transition to the new sequence after the result display period.
3. WHEN transitioning between item sequences, THE Sequence_Display SHALL clear the previous sequence and render the new sequence with all Step_Indicators in the pending color.
4. WHILE the machine contains Queued_Items after a successful completion, THE Overlay_Box SHALL continue the interaction loop without requiring the Player to press Interact again.
5. WHEN the last Queued_Item's sequence is completed successfully, THE Overlay_Box SHALL display the success state and then hide after the result display period.

### Requirement 9: Machine Label Display

**User Story:** As a player, I want to see which machine I am currently operating, so that I maintain context awareness.

#### Acceptance Criteria

1. WHILE an Active_Interaction is in progress, THE Overlay_Box SHALL display a label identifying the active machine (e.g., "Machine 1", "Machine 2", "Machine 3").
2. THE Overlay_Box SHALL position the machine label above the Sequence_Display within the overlay area.

### Requirement 10: Removal of Previous Sequence Visualization

**User Story:** As a developer, I want to remove the old sequence visualization code, so that there is a single, clear implementation for displaying input sequences.

#### Acceptance Criteria

1. WHEN the Overlay_Box feature is implemented, THE GameScene SHALL use the new Overlay_Box instead of the previous SequenceInputUI for all sequence display purposes.
2. THE GameScene SHALL remove all references to the previous SequenceInputUI rendering logic that is replaced by the Overlay_Box.

### Requirement 11: Responsive Layout

**User Story:** As a player, I want the overlay to scale correctly on different screen sizes, so that the sequence is always readable.

#### Acceptance Criteria

1. THE Overlay_Box SHALL scale its position using the LayoutSystem scaleX and scaleY methods.
2. THE Overlay_Box SHALL scale its font sizes using the LayoutSystem scaleFontSize method.
3. THE Overlay_Box SHALL scale the spacing between Step_Indicators using the LayoutSystem scaleValue method.
4. WHEN the game window is resized during an active interaction, THE Overlay_Box SHALL update its layout without interrupting the interaction state.
