# Requirements Document

## Introduction

The gameplay-skeleton feature establishes the minimal playable scene flow and factory layout for Beltline Panic. It introduces StartScene and GameScene, wires up scene navigation, renders a placeholder factory layout using simple colored shapes, and implements discrete player movement between the center hub and four adjacent directional positions. No machine interaction, conveyor movement, item processing, or upgrade logic is included. The goal is a buildable, runnable skeleton that communicates the intended game structure and supports further feature development.

## Glossary

- **Game**: The Phaser 3 game instance defined in `src/main.ts`
- **StartScene**: The initial scene shown when the game launches, displaying a title and a prompt to start
- **GameScene**: The primary gameplay scene containing the placeholder factory layout and player navigation
- **Player**: The red placeholder shape representing the factory worker
- **ConveyorBelt**: The dark rectangular loop rendered around the center area representing the item transport path
- **Machine**: A blue placeholder block representing one of the three processing machines positioned around the conveyor loop
- **UpgradeTerminal**: A blue placeholder block representing the upgrade station positioned around the conveyor loop
- **Item**: A small purple placeholder shape placed on the conveyor belt representing an unprocessed factory item
- **MovementArea**: The lightly tinted cross-shaped region consisting of the center node and four adjacent directional nodes
- **CenterPosition**: The hub node at the center of the MovementArea where the Player starts
- **DirectionalPosition**: One of the four nodes adjacent to CenterPosition, reachable by a single directional input (up, down, left, right)
- **InputSystem**: The component responsible for reading and dispatching keyboard input
- **NavigationState**: The active input state in which directional inputs move the Player between positions

## Requirements

### Requirement 1: StartScene exists and is the entry point

**User Story:** As a player, I want to see a start screen when I launch the game, so that I know the game has loaded and I can begin when ready.

#### Acceptance Criteria

1. THE Game SHALL load StartScene as the first active scene on startup
2. WHEN StartScene is active, THE StartScene SHALL display the game title "Beltline Panic"
3. WHEN StartScene is active, THE StartScene SHALL display a prompt instructing the player to press any key to start

---

### Requirement 2: StartScene transitions to GameScene on any key press

**User Story:** As a player, I want pressing any key on the start screen to begin the game, so that I can start playing without navigating a menu.

#### Acceptance Criteria

1. WHEN any keyboard key is pressed while StartScene is active, THE StartScene SHALL transition to GameScene
2. WHEN the transition to GameScene occurs, THE Game SHALL stop rendering StartScene

---

### Requirement 3: GameScene renders the placeholder conveyor belt

**User Story:** As a developer, I want the conveyor belt rendered as a visible rectangular loop, so that the factory layout is visually communicated from the first playable build.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL render the ConveyorBelt as a dark-colored unfilled rectangular loop centered in the scene
2. THE ConveyorBelt SHALL be visually distinct from the background and from the MovementArea

---

### Requirement 4: GameScene renders placeholder machines and upgrade terminal

**User Story:** As a developer, I want the three machines and the upgrade terminal rendered as blue placeholder blocks around the conveyor loop, so that the intended station layout is visible in the skeleton build.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL render three Machine blocks as blue placeholder rectangles positioned around the ConveyorBelt
2. WHEN GameScene is active, THE GameScene SHALL render one UpgradeTerminal block as a blue placeholder rectangle positioned around the ConveyorBelt
3. THE Machine blocks and UpgradeTerminal block SHALL each be positioned at one of the four sides of the ConveyorBelt loop (top, right, bottom, left)

---

### Requirement 5: GameScene renders placeholder items on the conveyor belt

**User Story:** As a developer, I want small placeholder items visible on the conveyor belt, so that the belt's purpose is visually communicated even before item movement is implemented.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL render at least two Item shapes as small purple placeholder rectangles or circles placed on the ConveyorBelt path
2. THE Item shapes SHALL be visually distinct from the ConveyorBelt, the Machine blocks, and the Player

---

### Requirement 6: GameScene renders the player movement area

**User Story:** As a developer, I want the movement area rendered as a lightly tinted cross shape, so that the five navigable positions are visually communicated in the skeleton build.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL render the MovementArea as a lightly tinted cross-shaped region covering the CenterPosition and the four DirectionalPositions
2. THE MovementArea SHALL be visually distinct from the ConveyorBelt and the background without obscuring other elements

---

### Requirement 7: GameScene renders the player at the correct position

**User Story:** As a developer, I want the player rendered as a red placeholder shape that visually snaps to the current position, so that player location is always clear.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL render the Player as a red placeholder rectangle or circle
2. WHEN the Player is at CenterPosition, THE GameScene SHALL render the Player at the center of the MovementArea
3. WHEN the Player moves to a DirectionalPosition, THE GameScene SHALL render the Player at the corresponding node of the MovementArea

---

### Requirement 8: Player starts at the center position

**User Story:** As a player, I want to start each session at the center of the factory, so that I have equal access to all four stations from the beginning.

#### Acceptance Criteria

1. WHEN GameScene is created, THE GameScene SHALL place the Player at CenterPosition

---

### Requirement 9: Player can move from center to an adjacent directional position

**User Story:** As a player, I want to press a directional key to move toward the corresponding station, so that I can navigate the factory layout.

#### Acceptance Criteria

1. WHEN the Player is at CenterPosition and a directional key is pressed, THE InputSystem SHALL move the Player to the corresponding DirectionalPosition
2. WHEN the Player is at CenterPosition and the up key is pressed, THE InputSystem SHALL move the Player to the up DirectionalPosition
3. WHEN the Player is at CenterPosition and the down key is pressed, THE InputSystem SHALL move the Player to the down DirectionalPosition
4. WHEN the Player is at CenterPosition and the left key is pressed, THE InputSystem SHALL move the Player to the left DirectionalPosition
5. WHEN the Player is at CenterPosition and the right key is pressed, THE InputSystem SHALL move the Player to the right DirectionalPosition

---

### Requirement 10: Player can return from a directional position to center

**User Story:** As a player, I want to press the opposite directional key to return to the center, so that I can reposition to another station.

#### Acceptance Criteria

1. WHEN the Player is at a DirectionalPosition and the opposite directional key is pressed, THE InputSystem SHALL move the Player back to CenterPosition
2. WHEN the Player is at the up DirectionalPosition and the down key is pressed, THE InputSystem SHALL move the Player to CenterPosition
3. WHEN the Player is at the down DirectionalPosition and the up key is pressed, THE InputSystem SHALL move the Player to CenterPosition
4. WHEN the Player is at the left DirectionalPosition and the right key is pressed, THE InputSystem SHALL move the Player to CenterPosition
5. WHEN the Player is at the right DirectionalPosition and the left key is pressed, THE InputSystem SHALL move the Player to CenterPosition

---

### Requirement 11: Player movement is bounded to the five defined positions

**User Story:** As a developer, I want player movement to be strictly bounded to the five valid positions, so that the navigation state remains predictable and safe for future feature additions.

#### Acceptance Criteria

1. WHEN the Player is at a DirectionalPosition and a directional key is pressed that does not lead back to CenterPosition, THE InputSystem SHALL leave the Player at the current DirectionalPosition
2. THE Player SHALL never occupy a position outside the five defined nodes (CenterPosition and the four DirectionalPositions)

---

### Requirement 12: Keyboard input mapping matches CONTROLS.md

**User Story:** As a developer, I want the keyboard bindings to match the documented control scheme, so that the implementation stays consistent with the design.

#### Acceptance Criteria

1. THE InputSystem SHALL map the Left Arrow key and the A key to the left action
2. THE InputSystem SHALL map the Right Arrow key and the D key to the right action
3. THE InputSystem SHALL map the Up Arrow key and the W key to the up action
4. THE InputSystem SHALL map the Down Arrow key and the S key to the down action

---

### Requirement 13: No unimplemented systems are invoked

**User Story:** As a developer, I want the skeleton to contain only the navigation layer, so that the build remains stable and no placeholder stubs cause runtime errors.

#### Acceptance Criteria

1. THE GameScene SHALL NOT invoke ConveyorSystem, ItemSystem, MachineSystem, UpgradeSystem, EconomySystem, or DifficultySystem
2. THE GameScene SHALL NOT implement machine interaction logic
3. THE GameScene SHALL NOT implement upgrade interaction logic
4. THE GameScene SHALL NOT implement conveyor movement logic
5. THE GameScene SHALL NOT implement item processing logic
