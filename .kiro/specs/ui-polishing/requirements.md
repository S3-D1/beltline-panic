# Requirements Document

## Introduction

This feature improves the visual presentation of Beltline Panic from flat placeholder rectangles to a cohesive pixel-style look. All visuals remain fully asset-free, generated in code using Phaser 3 geometric primitives. The goal is to make the game feel more polished and readable while preserving the existing gameplay structure, layout, responsiveness, and control concept. The visual language draws inspiration from early handheld-era pixel games: limited color palette, blocky forms, clear silhouettes, and restrained decoration.

## Glossary

- **Renderer**: The set of drawing functions in GameScene and related modules that produce all on-screen visuals using Phaser 3 Graphics primitives
- **Belt_Renderer**: The subsystem within the Renderer responsible for drawing the conveyor belt loop, inlet, and outlet
- **Machine_Renderer**: The subsystem within the Renderer responsible for drawing machine bodies and control panels
- **Item_Renderer**: The subsystem within the Renderer responsible for drawing conveyor items in their various processing states
- **Floor_Renderer**: The subsystem within the Renderer responsible for drawing walkable and non-walkable floor areas
- **Terminal_Renderer**: The subsystem within the Renderer responsible for drawing the upgrade terminal station
- **Start_Renderer**: The subsystem within the Renderer responsible for drawing the StartScene title screen
- **Conveyor_Belt**: The rectangular loop path plus inlet and outlet segments along which items travel
- **Machine**: One of the three processing stations (Machine 1 at top, Machine 2 at right, Machine 3 at bottom) where the player performs directional input sequences to process items
- **Control_Panel**: A small visual area at the front of each Machine where the player character stands during interaction
- **Item**: A game object that travels along the Conveyor_Belt and changes visual form based on its processing state
- **Item_State**: One of four processing states an Item can be in: new, processed, upgraded, or packaged
- **Terminal**: The upgrade terminal station at the left side of the belt where the player spends money on machine upgrades
- **Walkable_Area**: The cross-shaped set of five discrete positions (center, up, down, left, right) where the player character can stand
- **Non_Walkable_Area**: All floor space outside the Walkable_Area
- **Player_Character**: The red square representing the player, rendered at one of the five Walkable_Area positions
- **Pixel_Style**: A visual language using blocky forms, limited color palettes, clear silhouettes, simple repeated geometry for texture, and no smooth gradients or realistic rendering
- **Belt_Segment**: A repeating visual element on the Conveyor_Belt surface that animates to communicate belt direction and speed
- **LayoutSystem**: The existing scaling system that maps base-resolution coordinates (800x600) to the actual viewport size

## Requirements

### Requirement 1: Conveyor Belt Visual Overhaul

**User Story:** As a player, I want the conveyor belt to look like a real moving belt, so that I can clearly see the direction and speed of item travel.

#### Acceptance Criteria

1. THE Belt_Renderer SHALL draw the Conveyor_Belt as a continuous band of repeating dark Belt_Segment elements along the loop, inlet, and outlet paths
2. WHEN the game is running, THE Belt_Renderer SHALL animate the Belt_Segment elements in the direction of belt travel so that motion is visible
3. THE Belt_Renderer SHALL draw the inlet and outlet segments using the same Belt_Segment visual style as the main loop so that they visually belong to the same conveyor system
4. THE Belt_Renderer SHALL use a Pixel_Style appearance with blocky repeating elements and no smooth gradients
5. WHILE the game is in the game-over state, THE Belt_Renderer SHALL stop animating Belt_Segment elements

### Requirement 2: Machine Visual Overhaul

**User Story:** As a player, I want machines to be larger, more visually distinct, and slightly playful, so that I can easily identify each processing station and its interaction area.

#### Acceptance Criteria

1. THE Machine_Renderer SHALL draw each Machine as a body that fully covers the Conveyor_Belt section beneath the machine's zone and extends slightly beyond it
2. THE Machine_Renderer SHALL draw a visible Control_Panel area at the front of each Machine, facing the center of the Walkable_Area
3. THE Machine_Renderer SHALL draw each Machine using Pixel_Style forms with blocky shapes and restrained decoration
4. THE Machine_Renderer SHALL make each of the three Machines visually distinguishable from one another through shape variation or color variation
5. WHEN a Machine is actively processing an item, THE Machine_Renderer SHALL display a visible activity indicator on that Machine
6. WHEN the Player_Character is interacting with a Machine, THE Machine_Renderer SHALL visually highlight the active Machine or its Control_Panel
7. THE Machine_Renderer SHALL render Machines that remain readable in the current top-down angled layout at the base resolution of 800x600

### Requirement 3: Item Visual Differentiation by State

**User Story:** As a player, I want items to visually change form based on their processing state, so that I can quickly identify which items still need processing.

#### Acceptance Criteria

1. WHEN an Item has Item_State "new", THE Item_Renderer SHALL draw the Item as a small metallic cube using Pixel_Style geometry
2. WHEN an Item has Item_State "processed", THE Item_Renderer SHALL draw the Item as a small ball shape using Pixel_Style geometry
3. WHEN an Item has Item_State "upgraded", THE Item_Renderer SHALL draw the Item as a small ball shape with a visible shine or highlight accent using Pixel_Style geometry
4. WHEN an Item has Item_State "packaged", THE Item_Renderer SHALL draw the Item as a small wrapped gift shape using Pixel_Style geometry
5. THE Item_Renderer SHALL keep all four Item_State silhouettes distinct and readable at the current item scale within the 800x600 base resolution
6. THE Item_Renderer SHALL use only code-drawn geometric shapes with no external image assets
7. WHEN the game is in the game-over state and two Items have collided, THE Item_Renderer SHALL continue to blink the collided Items between red and their state color

### Requirement 4: Floor and Walkable Area Visual Distinction

**User Story:** As a player, I want the walkable floor to look visually different from the non-walkable floor, so that I can easily understand where my character can move.

#### Acceptance Criteria

1. THE Floor_Renderer SHALL draw the Walkable_Area with a visually distinct surface treatment that differentiates it from the Non_Walkable_Area
2. THE Floor_Renderer SHALL draw the Non_Walkable_Area with a different surface treatment or color from the Walkable_Area
3. THE Floor_Renderer SHALL use subtle Pixel_Style texture or pattern differences rather than debug-style outlines or solid color blocks
4. THE Floor_Renderer SHALL keep the visual distinction readable without drawing attention away from gameplay elements on the Conveyor_Belt
5. THE Floor_Renderer SHALL render the floor beneath all other gameplay elements so that items, machines, the belt, and the Player_Character remain clearly visible on top

### Requirement 5: Terminal Visual Overhaul

**User Story:** As a player, I want the upgrade terminal to look like a real control console, so that I can recognize it as an interactable station distinct from the machines.

#### Acceptance Criteria

1. THE Terminal_Renderer SHALL draw the Terminal as a control console shape using Pixel_Style geometry with visible screen or panel details
2. THE Terminal_Renderer SHALL make the Terminal visually related to the Machine Control_Panel elements through shared color or shape language
3. THE Terminal_Renderer SHALL make the Terminal clearly distinguishable from the three Machines so that the player can identify it as a separate interactable station
4. WHEN the Player_Character is at the left position, THE Terminal_Renderer SHALL visually indicate that the Terminal is within interaction range

### Requirement 6: Consistent Pixel-Style Visual Language

**User Story:** As a player, I want all visual elements to share a consistent pixel-art style, so that the game feels cohesive and polished.

#### Acceptance Criteria

1. THE Renderer SHALL use a limited color palette across all gameplay elements including the Conveyor_Belt, Machines, Items, floor, Terminal, and Player_Character
2. THE Renderer SHALL use only blocky forms, clear silhouettes, and simple geometric primitives across all visual elements
3. THE Renderer SHALL avoid smooth gradients, realistic rendering, and high-detail artwork in all visual elements
4. THE Renderer SHALL add slight texture variation to surfaces using simple repeated geometry or pixel-scale shading patterns where appropriate
5. THE Renderer SHALL generate all visuals in code using Phaser 3 Graphics drawing methods with no external image assets

### Requirement 7: Start Scene Visual Polish

**User Story:** As a player, I want the title screen to match the pixel-style visual language of the gameplay, so that the game feels cohesive from the first screen.

#### Acceptance Criteria

1. THE Start_Renderer SHALL draw the StartScene title text using a style consistent with the Pixel_Style visual language
2. THE Start_Renderer SHALL include a minimal background or decorative element that hints at the factory theme
3. THE Start_Renderer SHALL keep the "Press any key or tap to start" prompt clearly readable

### Requirement 8: Preserve Gameplay Readability

**User Story:** As a player, I want visual improvements to maintain or improve gameplay readability, so that I can still play effectively on small screens and under time pressure.

#### Acceptance Criteria

1. THE Renderer SHALL keep Machine positions, Item states, belt direction, and interactable areas clearly distinguishable at the base resolution of 800x600
2. THE Renderer SHALL keep all visual elements readable when the LayoutSystem scales the game down to smaller viewport sizes
3. THE Renderer SHALL keep touch control overlays and HUD text (score, budget, game-over) clearly visible above all visual improvements
4. IF a visual improvement reduces the readability of any gameplay element at small viewport sizes, THEN THE Renderer SHALL prioritize readability over decoration by simplifying or omitting the decoration

### Requirement 9: Preserve Existing Functionality and Layout

**User Story:** As a developer, I want visual changes to update rendering only without altering gameplay systems, so that the game remains fully functional.

#### Acceptance Criteria

1. THE Renderer SHALL preserve all existing player movement positions and the cross-shaped Walkable_Area layout
2. THE Renderer SHALL preserve all existing Conveyor_Belt path geometry, item spawning, and outlet branching behavior
3. THE Renderer SHALL preserve all existing Machine interaction zones and player position assignments
4. THE Renderer SHALL preserve all existing touch control and keyboard input behavior
5. THE Renderer SHALL preserve the existing LayoutSystem scaling and responsive resize behavior
6. THE Renderer SHALL keep rendering performant for browser play by using lightweight drawing operations and avoiding expensive per-frame allocations

### Requirement 10: Asset-Free Implementation

**User Story:** As a developer, I want all visuals generated entirely in code, so that the project remains asset-free and easy to maintain during the jam.

#### Acceptance Criteria

1. THE Renderer SHALL generate all visual elements using Phaser 3 Graphics methods, geometric primitives, and Phaser text objects only
2. THE Renderer SHALL not load or reference any external image, sprite sheet, or font asset files
3. THE Renderer SHALL use reusable drawing helper functions where repeated visual patterns occur across multiple elements
4. THE Renderer SHALL keep the drawing implementation simple and maintainable without introducing unnecessary abstraction layers
