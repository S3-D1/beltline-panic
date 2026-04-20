# Requirements Document

## Introduction

This feature replaces the current automatic item state transitions on the conveyor belt with a proper machine system. Each machine has defined rules, accepted input item statuses, an interaction sequence, and capacity constraints. The player must physically stand in front of a machine, press Interact, and enter a directional input sequence to process items. The system supports three machines with distinct sequence sourcing strategies (fixed, per-run generated, per-item generated). This lays the foundation for future automation, quality, and speed upgrades while keeping the current implementation minimal and deterministic.

## Glossary

- **Machine**: A stationary processing unit positioned along the conveyor belt that accepts items, requires player interaction via a directional sequence, and outputs items with a changed status.
- **Item**: A game object that travels along the conveyor belt and has a status (New, Processed, Upgraded, Packaged).
- **Item_Status**: One of four possible states an item can have: New, Processed, Upgraded, or Packaged.
- **Interaction_Sequence**: An ordered list of directional inputs (Left, Up, Down, Right) that the player must enter to successfully process an item in a machine.
- **Machine_Zone**: The segment of the conveyor belt associated with a specific machine, defined by a progress range on the loop path.
- **Intake**: The act of a machine accepting an item from the belt into its internal processing slot.
- **Capacity**: The maximum number of items a machine can hold internally at one time.
- **Activity_Status**: A boolean flag indicating whether a machine currently holds an item and the player is interacting with the machine.
- **Sequence_Input_UI**: The on-screen display that shows the required interaction sequence during player interaction with a machine.
- **Player_Position**: One of five discrete positions the player can occupy: center, up, down, left, or right.
- **Interact_Key**: The Space key used to start or cancel machine interaction.
- **MachineSystem**: The gameplay system responsible for managing all machine logic including intake, interaction, sequence validation, and item output.
- **Automation_Level**: A machine property (default: 0) reserved for future use that will allow machines to process items without player input.
- **Work_Quality**: A machine property (default: 0.1) reserved for future use that will influence processing outcomes.
- **Work_Speed**: A machine property (default: 5) reserved for future use that will influence processing duration.
- **Required_Sequence_Length**: A machine property (default: 3) that determines how many steps of the interaction sequence the player must enter.

## Requirements

### Requirement 1: Machine Definition and Properties

**User Story:** As a developer, I want each machine to have a well-defined set of properties, so that machine behavior is data-driven and easy to extend.

#### Acceptance Criteria

1. THE MachineSystem SHALL define each machine with the following properties: accepted input item statuses, item capacity, automation level, work quality, required sequence length, work speed, output item status, interaction sequence, and activity status.
2. THE MachineSystem SHALL use these default values for machine properties: capacity of 1, automation level of 0, work quality of 0.1, required sequence length of 3, and work speed of 5.
3. THE MachineSystem SHALL define Machine 1 with accepted input status New, output status Processed, and the fixed interaction sequence Left, Up, Up, Right, Left, Down.
4. THE MachineSystem SHALL define Machine 2 with accepted input status Processed and output status Upgraded.
5. THE MachineSystem SHALL define Machine 3 with accepted input statuses Processed and Upgraded, and output status Packaged.

### Requirement 2: Sequence Generation

**User Story:** As a developer, I want each machine to source its interaction sequence according to its own rules, so that machines feel distinct and gameplay stays varied.

#### Acceptance Criteria

1. THE MachineSystem SHALL use the fixed sequence Left, Up, Up, Right, Left, Down for Machine 1 across all items and all runs.
2. WHEN a game run starts, THE MachineSystem SHALL generate one random 6-step directional sequence for Machine 2 and reuse that same sequence for every item during the run.
3. WHEN an item is intaken by Machine 3, THE MachineSystem SHALL generate a new random 6-step directional sequence for that specific item.
4. WHEN the required sequence length is smaller than 6, THE MachineSystem SHALL use only the first entries of the 6-step sequence up to the required length.
5. WHEN the required sequence length is larger than 6, THE MachineSystem SHALL repeat the 6-step sequence from the beginning to fill the required length.

### Requirement 3: Item Intake

**User Story:** As a player, I want machines to automatically take in matching items from the belt, so that I can focus on the interaction sequences.

#### Acceptance Criteria

1. WHEN an item's status matches one of a machine's accepted input statuses AND the item is fully aligned with the machine position on the belt AND the machine's current item count is below its capacity, THE MachineSystem SHALL intake the item into the machine.
2. WHILE a machine holds a number of items equal to its capacity, THE MachineSystem SHALL reject additional items and allow those items to continue on the belt.
3. WHEN an item is intaken, THE MachineSystem SHALL remove the item from the visible belt and consider the item inside the machine.

### Requirement 4: Player Interaction Start

**User Story:** As a player, I want to interact with a machine by standing in front of it and pressing Interact, so that I can process items.

#### Acceptance Criteria

1. WHEN the player is at the Player_Position corresponding to a machine AND the machine holds at least one item AND the player presses the Interact_Key, THE MachineSystem SHALL start an interaction with that machine.
2. WHEN an interaction starts, THE MachineSystem SHALL set the machine's Activity_Status to true.
3. WHEN an interaction starts, THE Sequence_Input_UI SHALL display the full required interaction sequence for the current item.
4. WHILE an interaction is already active on any machine, THE MachineSystem SHALL prevent starting a new interaction on another machine.

### Requirement 5: Sequence Input and Live Feedback

**User Story:** As a player, I want to see the required sequence and get live feedback on my inputs, so that I know my progress during machine interaction.

#### Acceptance Criteria

1. WHILE an interaction is active, THE Sequence_Input_UI SHALL display all steps of the required interaction sequence.
2. WHEN the player enters a correct directional input matching the next expected step, THE Sequence_Input_UI SHALL highlight that step in green.
3. WHEN the player enters an incorrect directional input, THE MachineSystem SHALL immediately abort the interaction.
4. THE Sequence_Input_UI SHALL clearly indicate which machine is currently being interacted with.

### Requirement 6: Successful Interaction Completion

**User Story:** As a player, I want items to be processed when I complete the sequence correctly, so that I can progress items through the factory.

#### Acceptance Criteria

1. WHEN the player enters the full interaction sequence correctly, THE MachineSystem SHALL set the item's status to the machine's output item status.
2. WHEN the player completes the sequence correctly, THE MachineSystem SHALL place the item back on the belt fully aligned at the end of the machine zone.
3. WHEN the interaction completes successfully, THE MachineSystem SHALL set the machine's Activity_Status to false.

### Requirement 7: Failed and Cancelled Interaction

**User Story:** As a player, I want clear consequences for wrong inputs or cancellation, so that I understand the cost of mistakes.

#### Acceptance Criteria

1. WHEN the player enters an incorrect directional input during an active interaction, THE MachineSystem SHALL abort the interaction and return the item to the belt at the end of the machine zone with its original input status unchanged.
2. WHEN the player presses the Interact_Key during an active interaction, THE MachineSystem SHALL cancel the interaction and return the item to the belt at the end of the machine zone with its original input status unchanged.
3. WHEN an interaction is aborted or cancelled, THE MachineSystem SHALL set the machine's Activity_Status to false.
4. WHEN an interaction is aborted or cancelled, THE Sequence_Input_UI SHALL stop displaying the sequence.

### Requirement 8: Sequence State Reset

**User Story:** As a developer, I want sequence progress to reset between items, so that no stale state carries over.

#### Acceptance Criteria

1. WHEN a new interaction starts for an item, THE MachineSystem SHALL start the sequence from the first step with no prior progress carried over.
2. THE MachineSystem SHALL track sequence progress independently per interaction session.

### Requirement 9: Activity Status Visual Feedback

**User Story:** As a player, I want to see whether a machine is active, so that I can quickly assess the factory state.

#### Acceptance Criteria

1. WHILE a machine's Activity_Status is true, THE GameScene SHALL render the machine with a visually distinct appearance compared to inactive machines.
2. WHILE a machine's Activity_Status is false, THE GameScene SHALL render the machine in its default appearance.

### Requirement 10: Interaction UI Clarity

**User Story:** As a player, I want the interaction UI to clearly communicate the current state, so that I always know what is happening.

#### Acceptance Criteria

1. WHILE an interaction is active, THE Sequence_Input_UI SHALL display the remaining unmatched inputs visibly alongside the already-matched green inputs.
2. WHEN an interaction is cancelled, THE Sequence_Input_UI SHALL provide a visible indication that the interaction was cancelled.
3. WHEN an interaction fails due to wrong input, THE Sequence_Input_UI SHALL provide a visible indication that the interaction failed.

### Requirement 11: Remove Automatic State Transitions

**User Story:** As a developer, I want the old automatic transition zones removed, so that item processing is fully driven by machine interaction.

#### Acceptance Criteria

1. THE ItemSystem SHALL no longer automatically change item statuses based on conveyor belt progress through transition zones.
2. THE MachineSystem SHALL be the sole system responsible for changing item statuses from input to output.

### Requirement 12: Machine-to-Player-Position Mapping

**User Story:** As a developer, I want a clear mapping between machines and player positions, so that interaction targeting is unambiguous.

#### Acceptance Criteria

1. THE MachineSystem SHALL map Machine 1 to the "up" Player_Position.
2. THE MachineSystem SHALL map Machine 2 to the "right" Player_Position.
3. THE MachineSystem SHALL map Machine 3 to the "down" Player_Position.

### Requirement 13: Future-Proofing Properties

**User Story:** As a developer, I want automation level, work quality, work speed, and capacity stored on each machine, so that future upgrades can modify these values without restructuring.

#### Acceptance Criteria

1. THE MachineSystem SHALL store automation level, work quality, work speed, and capacity as mutable properties on each machine instance.
2. THE MachineSystem SHALL use the capacity property to enforce intake limits as defined in Requirement 3.
3. THE MachineSystem SHALL use the required sequence length property to determine the active sequence length as defined in Requirement 2.
