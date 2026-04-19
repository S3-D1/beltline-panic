# Requirements Document

## Introduction

The conveyor-item-movement feature introduces path-based item movement along the conveyor belt, a visible inlet feed line, and automatic item state transitions triggered by machines. Items spawn on the inlet, travel into the rectangular belt loop, and move clockwise at constant speed. As items pass each machine position, they automatically transition through a defined state sequence (New → Processed → Upgraded → Packaged), with each state reflected by a distinct placeholder color. No physics are used. Movement is deterministic and path-based. No manual machine interaction is required for this feature.

## Glossary

- **ConveyorPath**: The ordered sequence of waypoints defining the rectangular clockwise belt loop, used to drive item movement
- **Inlet**: A straight feed line segment that connects to the ConveyorPath, serving as the spawn point and entry path for new items
- **Item**: A small colored placeholder shape that moves along the Inlet and ConveyorPath, representing a factory product
- **ItemState**: The current processing stage of an Item, one of: New, Processed, Upgraded, or Packaged
- **Machine_1**: The processing station positioned at the top side of the ConveyorPath that transitions items from New to Processed
- **Machine_2**: The processing station positioned at the right side of the ConveyorPath that transitions items from Processed to Upgraded
- **Machine_3**: The processing station positioned at the bottom side of the ConveyorPath that transitions items from Upgraded to Packaged
- **PathProgress**: A normalized scalar value (0 to 1) representing an Item's position along a path segment or the full ConveyorPath
- **TransitionZone**: A defined region along the ConveyorPath near a Machine where an automatic state transition is triggered
- **ConveyorSystem**: The system responsible for managing the ConveyorPath geometry, Inlet geometry, and item movement logic
- **ItemSystem**: The system responsible for spawning items, tracking ItemState, and applying state transitions
- **GameScene**: The primary gameplay scene that renders the factory layout and coordinates systems

## Requirements

### Requirement 1: ConveyorPath defines a rectangular clockwise loop

**User Story:** As a developer, I want the conveyor belt path defined as an ordered set of waypoints forming a clockwise rectangle, so that item movement follows a predictable and visually readable loop.

#### Acceptance Criteria

1. THE ConveyorSystem SHALL define the ConveyorPath as an ordered sequence of waypoints forming a closed rectangular loop
2. THE ConveyorPath SHALL follow a clockwise direction when traversed in waypoint order
3. THE ConveyorPath SHALL be centered around the existing belt rectangle defined by LAYOUT.BELT_X, LAYOUT.BELT_Y, LAYOUT.BELT_W, and LAYOUT.BELT_H
4. THE ConveyorPath SHALL form a closed loop where the last waypoint connects back to the first waypoint

---

### Requirement 2: Inlet provides a visible feed line into the conveyor loop

**User Story:** As a player, I want to see a visible inlet line feeding into the conveyor belt, so that I understand where new items enter the production loop.

#### Acceptance Criteria

1. THE ConveyorSystem SHALL define the Inlet as a straight path segment that connects to the ConveyorPath at a defined entry point
2. WHEN GameScene is active, THE GameScene SHALL render the Inlet as a visible line or track segment using the same visual style as the ConveyorPath
3. THE Inlet SHALL be visually distinguishable as a feed line leading into the ConveyorPath
4. THE Inlet entry point SHALL connect cleanly to the ConveyorPath without visual gaps or misalignment

---

### Requirement 3: Items spawn on the Inlet in the New state

**User Story:** As a player, I want items to appear at the start of the inlet, so that I can see new products entering the factory.

#### Acceptance Criteria

1. WHEN the ItemSystem spawns a new Item, THE ItemSystem SHALL place the Item at the start position of the Inlet
2. WHEN the ItemSystem spawns a new Item, THE ItemSystem SHALL set the Item's ItemState to New
3. WHEN an Item is in the New state, THE GameScene SHALL render the Item in purple (hex 0x9944cc)

---

### Requirement 4: Items move along the Inlet into the ConveyorPath

**User Story:** As a player, I want items to travel along the inlet and smoothly enter the belt loop, so that the production flow is visually continuous.

#### Acceptance Criteria

1. WHEN an Item is on the Inlet, THE ConveyorSystem SHALL move the Item along the Inlet path toward the ConveyorPath entry point at constant speed
2. WHEN an Item reaches the end of the Inlet, THE ConveyorSystem SHALL transfer the Item onto the ConveyorPath at the entry point
3. THE Item SHALL remain visually centered on the Inlet path during movement

---

### Requirement 5: Items move clockwise around the ConveyorPath at constant speed

**User Story:** As a player, I want items to travel steadily around the belt loop, so that I can predict item positions and plan my actions.

#### Acceptance Criteria

1. WHILE an Item is on the ConveyorPath, THE ConveyorSystem SHALL move the Item along the waypoints in clockwise order at a constant speed
2. THE ConveyorSystem SHALL use path-progress logic to determine Item positions, without using Phaser physics
3. THE Item SHALL remain visually centered on the ConveyorPath during movement
4. WHEN an Item reaches the last waypoint of the ConveyorPath, THE ConveyorSystem SHALL wrap the Item back to the first waypoint to continue the loop

---

### Requirement 6: Item movement is deterministic and frame-rate independent

**User Story:** As a developer, I want item movement to produce the same results regardless of frame rate, so that gameplay behavior is predictable and testable.

#### Acceptance Criteria

1. THE ConveyorSystem SHALL calculate Item movement using delta time provided by the Phaser update loop
2. THE ConveyorSystem SHALL produce identical Item positions for identical elapsed time values regardless of frame rate variation

---

### Requirement 7: Machine_1 automatically transitions items from New to Processed

**User Story:** As a player, I want items to automatically become processed when they pass the first machine, so that I can see the production chain progressing.

#### Acceptance Criteria

1. WHEN an Item in the New state enters the TransitionZone of Machine_1, THE ItemSystem SHALL change the Item's ItemState to Processed
2. WHEN an Item transitions to the Processed state, THE GameScene SHALL render the Item in yellow (hex 0xcccc00)
3. THE ItemSystem SHALL trigger the New-to-Processed transition only once per Item

---

### Requirement 8: Machine_2 automatically transitions items from Processed to Upgraded

**User Story:** As a player, I want items to automatically become upgraded when they pass the second machine, so that I can see items gaining value.

#### Acceptance Criteria

1. WHEN an Item in the Processed state enters the TransitionZone of Machine_2, THE ItemSystem SHALL change the Item's ItemState to Upgraded
2. WHEN an Item transitions to the Upgraded state, THE GameScene SHALL render the Item in green (hex 0x44cc44)
3. THE ItemSystem SHALL trigger the Processed-to-Upgraded transition only once per Item

---

### Requirement 9: Machine_3 automatically transitions items from Upgraded to Packaged

**User Story:** As a player, I want items to automatically become packaged when they pass the third machine, so that I can see the full production chain complete.

#### Acceptance Criteria

1. WHEN an Item in the Upgraded state enters the TransitionZone of Machine_3, THE ItemSystem SHALL change the Item's ItemState to Packaged
2. WHEN an Item transitions to the Packaged state, THE GameScene SHALL render the Item in brown (hex 0x886622)
3. THE ItemSystem SHALL trigger the Upgraded-to-Packaged transition only once per Item

---

### Requirement 10: State transitions are one-directional and non-repeating

**User Story:** As a developer, I want state transitions to only advance forward and never repeat, so that items do not regress or re-trigger transitions on subsequent laps.

#### Acceptance Criteria

1. THE ItemSystem SHALL only allow state transitions in the forward direction: New → Processed → Upgraded → Packaged
2. WHEN an Item has already completed a state transition at a given Machine, THE ItemSystem SHALL not re-trigger that transition on subsequent passes
3. WHEN an Item in the Packaged state passes any TransitionZone, THE ItemSystem SHALL leave the Item's ItemState unchanged

---

### Requirement 11: Item color always reflects the current ItemState

**User Story:** As a player, I want item colors to always match their current state, so that I can instantly read the production status of every item on the belt.

#### Acceptance Criteria

1. THE GameScene SHALL render each Item using the color corresponding to the Item's current ItemState: New as purple (0x9944cc), Processed as yellow (0xcccc00), Upgraded as green (0x44cc44), Packaged as brown (0x886622)
2. WHEN an Item's ItemState changes, THE GameScene SHALL update the Item's rendered color within the same frame

---

### Requirement 12: Machine positions remain readable relative to the belt

**User Story:** As a player, I want the machines to be clearly positioned around the belt, so that I can understand which machine corresponds to which production stage.

#### Acceptance Criteria

1. THE GameScene SHALL render Machine_1 adjacent to the top edge of the ConveyorPath
2. THE GameScene SHALL render Machine_2 adjacent to the right edge of the ConveyorPath
3. THE GameScene SHALL render Machine_3 adjacent to the bottom edge of the ConveyorPath
4. THE GameScene SHALL maintain the existing placeholder visual style for Machine blocks

---

### Requirement 13: Conveyor path and inlet remain visually clear

**User Story:** As a player, I want the belt layout to be easy to understand at a glance, so that I can focus on gameplay decisions rather than deciphering the factory layout.

#### Acceptance Criteria

1. THE GameScene SHALL render the ConveyorPath as a visible rectangular loop that is visually distinct from the background
2. THE GameScene SHALL render the Inlet as a visible segment that is clearly part of the belt system
3. THE ConveyorPath and Inlet SHALL not obscure Machine blocks, the Player, or the MovementArea

---

### Requirement 14: Existing gameplay skeleton remains functional

**User Story:** As a developer, I want the existing player navigation and scene flow to continue working after this feature is added, so that no previously working functionality is broken.

#### Acceptance Criteria

1. WHEN GameScene is active, THE InputSystem SHALL continue to support player movement between CenterPosition and the four DirectionalPositions
2. WHEN the game is launched, THE Game SHALL continue to load StartScene as the first active scene
3. THE GameScene SHALL continue to render the Player, MovementArea, Machine blocks, and UpgradeTerminal block as defined in the gameplay-skeleton spec
