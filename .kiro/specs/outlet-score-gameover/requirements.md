# Requirements Document

## Introduction

The outlet-score-gameover feature extends the existing conveyor belt prototype with three interconnected additions: an outlet path that allows eligible items to leave the belt loop, a score system that tracks item value as items exit through the outlet, and a game-over condition triggered by item collisions. Items in the New state continue looping on the belt. Items that have been processed (Processed, Upgraded, or Packaged) leave the belt through the outlet. When an item reaches the end of the outlet, it is removed and its value is added to the score. Item values follow a multiplicative formula based on processing stage. The game ends when two items collide on the path, freezing movement and displaying a clear game-over state. The existing inlet, clockwise movement, and machine state transitions remain unchanged.

## Glossary

- **Outlet**: A straight path segment branching off the ConveyorPath that serves as the exit route for eligible items leaving the belt loop
- **OutletBranchPoint**: The specific position on the ConveyorPath where the Outlet branches off, defined as a normalized loop progress value
- **Inlet**: The existing straight feed line segment where new items spawn and enter the ConveyorPath
- **ConveyorPath**: The existing ordered sequence of waypoints defining the rectangular clockwise belt loop
- **ConveyorSystem**: The existing system responsible for managing path geometry and item movement logic
- **ItemSystem**: The existing system responsible for spawning items, tracking ItemState, and applying state transitions
- **GameScene**: The primary gameplay scene that renders the factory layout and coordinates systems
- **Item**: A small colored placeholder shape that moves along paths, representing a factory product
- **ItemState**: The current processing stage of an Item: New, Processed, Upgraded, or Packaged
- **ItemValue**: The numeric score contribution of an Item when it exits through the Outlet, determined by its ItemState
- **Score**: A running total of ItemValue points accumulated during the current run
- **ScoreDisplay**: The fixed-width zero-padded numeric text element shown in the top-right corner of the screen
- **Collision**: A condition where two Items overlap or are within a defined proximity threshold on the path
- **GameOver**: The terminal state of a run, triggered by a Collision, which freezes all item movement and displays end-of-run feedback
- **CollisionBlink**: A visual effect applied to the two collided Items, alternating between red and the Item's original state color

## Requirements

### Requirement 1: Outlet connects to the ConveyorPath as a visible branch

**User Story:** As a player, I want to see an outlet path branching off the conveyor belt, so that I understand where items leave the production loop.

#### Acceptance Criteria

1. THE ConveyorSystem SHALL define the Outlet as a straight path segment that branches off the ConveyorPath at the OutletBranchPoint
2. THE Outlet SHALL connect visually and logically to the ConveyorPath without gaps or misalignment
3. WHEN GameScene is active, THE GameScene SHALL render the Outlet using the same visual style as the ConveyorPath and Inlet
4. THE Outlet SHALL be visually distinguishable as a path extension leaving the main belt loop
5. THE GameScene SHALL continue to render the existing Inlet alongside the Outlet

---

### Requirement 2: Eligible items leave the belt through the Outlet

**User Story:** As a player, I want processed items to exit the belt through the outlet, so that I can see completed products leaving the factory.

#### Acceptance Criteria

1. WHEN an Item with an ItemState other than New reaches the OutletBranchPoint, THE ConveyorSystem SHALL redirect the Item onto the Outlet path
2. WHILE an Item is on the Outlet, THE ConveyorSystem SHALL move the Item along the Outlet path at constant speed toward the Outlet end
3. WHEN an Item reaches the end of the Outlet, THE ItemSystem SHALL remove the Item from the active item collection
4. THE Item SHALL remain visually centered on the Outlet path during movement

---

### Requirement 3: Items in the New state continue looping

**User Story:** As a player, I want unprocessed items to keep circling the belt, so that they have a chance to reach machines and get processed.

#### Acceptance Criteria

1. WHEN an Item in the New state reaches the OutletBranchPoint, THE ConveyorSystem SHALL keep the Item on the ConveyorPath and continue its clockwise movement
2. THE ConveyorSystem SHALL only redirect Items whose ItemState is Processed, Upgraded, or Packaged onto the Outlet

---

### Requirement 4: Score display appears in the top-right corner

**User Story:** As a player, I want to see my score on screen, so that I can track my progress during the run.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL display the ScoreDisplay in the top-right corner of the screen
2. THE ScoreDisplay SHALL show the Score as a fixed-width zero-padded number with format `00000000`
3. THE ScoreDisplay SHALL initialize with a value of `00000000` at the start of each run

---

### Requirement 5: Score increases when items exit through the Outlet

**User Story:** As a player, I want my score to go up when items leave through the outlet, so that I am rewarded for processing items.

#### Acceptance Criteria

1. WHEN an Item reaches the end of the Outlet and is removed, THE GameScene SHALL add the Item's ItemValue to the Score
2. THE ScoreDisplay SHALL update to reflect the new Score within the same frame the Item is removed
3. THE Score SHALL only increase when an Item reaches the end of the Outlet; no other event shall modify the Score

---

### Requirement 6: Item values follow a multiplicative formula based on state

**User Story:** As a player, I want higher-stage items to be worth more points, so that I am incentivized to process items through multiple machines.

#### Acceptance Criteria

1. THE ItemSystem SHALL assign an ItemValue of 10 to Items in the Processed state
2. THE ItemSystem SHALL assign an ItemValue of 11 to Items in the Upgraded state, calculated as base value 10 multiplied by upgrade factor 1.1
3. THE ItemSystem SHALL assign an ItemValue of 22 to Items in the Packaged state, calculated as base value 10 multiplied by upgrade factor 1.1 multiplied by packaging factor 2
4. THE ItemSystem SHALL not assign a scoring ItemValue to Items in the New state, as New Items do not exit through the Outlet

---

### Requirement 7: Collision detection identifies overlapping items

**User Story:** As a developer, I want a simple and reliable collision check between items, so that the game-over condition triggers deterministically.

#### Acceptance Criteria

1. THE ItemSystem SHALL check for Collisions between all active Items each frame
2. THE ItemSystem SHALL detect a Collision when the distance between the center positions of two Items is less than or equal to a defined proximity threshold
3. THE Collision detection SHALL use simple distance-based comparison without relying on Phaser physics
4. THE Collision detection SHALL produce deterministic results for identical item positions

---

### Requirement 8: Game over triggers on item collision

**User Story:** As a player, I want the game to end when items crash into each other, so that there is a clear fail state and pressure to manage the belt.

#### Acceptance Criteria

1. WHEN a Collision is detected between two Items, THE GameScene SHALL enter the GameOver state
2. WHEN GameOver is active, THE ConveyorSystem SHALL stop all item movement
3. WHEN GameOver is active, THE ItemSystem SHALL stop spawning new Items
4. WHEN GameOver is active, THE GameScene SHALL display the text "Game Over" in large centered text on screen

---

### Requirement 9: Game-over visual feedback on score and collided items

**User Story:** As a player, I want clear visual feedback when the game ends, so that I understand what happened and which items caused the crash.

#### Acceptance Criteria

1. WHEN GameOver is active, THE ScoreDisplay SHALL change its text color to red
2. WHEN GameOver is active, THE GameScene SHALL apply a CollisionBlink effect to the two collided Items, alternating between red and the Item's original ItemState color
3. THE CollisionBlink effect SHALL use the Item's ItemState color as defined in the existing ITEM_COLORS configuration as the original color
4. WHILE GameOver is active, THE GameScene SHALL continue rendering all other Items in their normal ItemState colors without blinking

---

### Requirement 10: Game-over state is terminal for the current run

**User Story:** As a developer, I want the game-over state to cleanly freeze the run, so that no further gameplay logic executes after the collision.

#### Acceptance Criteria

1. WHEN GameOver is active, THE GameScene SHALL not process any further item movement updates
2. WHEN GameOver is active, THE GameScene SHALL not process any further state transitions
3. WHEN GameOver is active, THE GameScene SHALL continue rendering the frozen scene including all items, the score, and the game-over text
4. THE GameScene SHALL not implement a restart flow for this feature

---

### Requirement 11: Item color remains the source of truth for visuals

**User Story:** As a developer, I want item colors to always derive from the ItemState color map, so that visual consistency is maintained across normal play and game-over effects.

#### Acceptance Criteria

1. THE GameScene SHALL render each Item using the color from ITEM_COLORS corresponding to the Item's current ItemState during normal play
2. WHEN CollisionBlink is active on an Item, THE GameScene SHALL alternate between red and the ITEM_COLORS value for that Item's ItemState
3. THE GameScene SHALL not modify the ITEM_COLORS configuration or the Item's ItemState as part of the CollisionBlink effect

---

### Requirement 12: Existing conveyor and input systems remain functional

**User Story:** As a developer, I want the existing inlet, clockwise movement, machine transitions, and player navigation to continue working, so that no previously working functionality is broken.

#### Acceptance Criteria

1. WHEN GameScene is active, THE ConveyorSystem SHALL continue to move Items along the Inlet and ConveyorPath in clockwise order at constant speed
2. WHEN GameScene is active, THE ItemSystem SHALL continue to spawn Items on the Inlet and apply state transitions at TransitionZones
3. WHEN GameScene is active, THE InputSystem SHALL continue to support player movement between CenterPosition and the four DirectionalPositions
4. THE GameScene SHALL continue to render the Player, MovementArea, Machine blocks, and UpgradeTerminal block as previously defined
