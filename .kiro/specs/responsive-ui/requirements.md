# Requirements Document

## Introduction

The game currently uses a fixed 800×600 canvas with hardcoded pixel positions for all UI elements, conveyor layout, player movement, touch buttons, and text. This makes the game unplayable or poorly framed on phone screens and larger displays. This feature introduces a responsive scaling and layout system so the game fills the available viewport on any device, supports both portrait and landscape orientations on phones, and remains fair and readable across all screen sizes.

## Glossary

- **Viewport**: The visible browser window area available to the game, excluding browser chrome and OS UI.
- **Game_Canvas**: The Phaser HTML5 canvas element that renders the game.
- **Layout_System**: The system responsible for computing scaled positions and sizes for all game elements based on the current viewport dimensions.
- **Base_Resolution**: The reference design resolution (800×600) used as the coordinate space for game logic and layout calculations.
- **Scale_Factor**: The ratio applied to translate Base_Resolution coordinates to actual screen pixels, preserving aspect ratio.
- **Touch_Buttons**: The on-screen directional and interact buttons rendered by TouchButtonUI for touch input.
- **Sequence_Display**: The arrow sequence and label UI rendered by SequenceInputUI during machine interactions.
- **Score_Display**: The score text shown in the top-right area of the game screen.
- **Game_Over_Display**: The "Game Over" text shown centered on screen when the run ends.
- **Start_Screen**: The title and prompt text shown in StartScene before gameplay begins.
- **Orientation**: The device orientation, either portrait (height > width) or landscape (width > height).

## Requirements

### Requirement 1: Fullscreen Viewport Usage

**User Story:** As a player, I want the game to fill my entire screen, so that I get an immersive experience without black bars or wasted space.

#### Acceptance Criteria

1. WHEN the game loads, THE Game_Canvas SHALL resize to fill 100% of the Viewport width and height.
2. WHEN the Viewport is resized, THE Game_Canvas SHALL update its dimensions to match the new Viewport size within one frame.
3. THE Game_Canvas SHALL maintain the game content visible without clipping any gameplay elements.

### Requirement 2: Aspect-Ratio-Preserving Scale

**User Story:** As a player, I want the game world to scale proportionally, so that the layout looks correct and nothing is stretched or squished.

#### Acceptance Criteria

1. THE Layout_System SHALL compute a uniform Scale_Factor based on the smaller of (Viewport width / Base_Resolution width) and (Viewport height / Base_Resolution height).
2. THE Layout_System SHALL apply the Scale_Factor uniformly to all game element positions and sizes derived from the Base_Resolution.
3. WHEN the Viewport aspect ratio differs from the Base_Resolution aspect ratio, THE Layout_System SHALL center the scaled game area within the Viewport.
4. WHEN the Viewport aspect ratio differs from the Base_Resolution aspect ratio, THE Layout_System SHALL fill remaining Viewport space with the background color rather than stretching content.

### Requirement 3: Portrait and Landscape Orientation Support

**User Story:** As a mobile player, I want to play in both portrait and landscape orientation, so that I can hold my phone however is comfortable.

#### Acceptance Criteria

1. WHEN the device is in landscape Orientation, THE Layout_System SHALL scale and center the game area within the landscape Viewport.
2. WHEN the device is in portrait Orientation, THE Layout_System SHALL scale and center the game area within the portrait Viewport.
3. WHEN the Orientation changes during gameplay, THE Layout_System SHALL recalculate the Scale_Factor and reposition all elements within one frame.
4. THE Layout_System SHALL preserve all gameplay element relative positions in both portrait and landscape Orientation.

### Requirement 4: Orientation Fairness

**User Story:** As a player, I want neither orientation to give a gameplay advantage, so that the game is fair regardless of how I hold my device.

#### Acceptance Criteria

1. THE Layout_System SHALL use the same Base_Resolution coordinate space for gameplay logic in both portrait and landscape Orientation.
2. THE Layout_System SHALL NOT alter conveyor speed, item spawn rate, interaction timing, or any gameplay rule based on Orientation.
3. THE Layout_System SHALL NOT provide additional visible conveyor length, earlier item visibility, or larger interaction zones in either Orientation compared to the other.
4. WHEN the Viewport aspect ratio changes, THE Layout_System SHALL adjust only visual scaling and centering, not gameplay parameters.

### Requirement 5: Touch Button Usability

**User Story:** As a mobile player, I want the touch buttons to remain large enough to tap accurately, so that I can play comfortably on a small screen.

#### Acceptance Criteria

1. THE Touch_Buttons SHALL scale proportionally with the Scale_Factor applied to the game area.
2. THE Touch_Buttons SHALL maintain a minimum rendered size of 40×40 CSS pixels on any screen.
3. THE Touch_Buttons SHALL maintain their cross-pattern arrangement relative to the player movement area after scaling.
4. WHEN the Scale_Factor changes, THE Touch_Buttons SHALL update their positions and sizes to match the new scale.

### Requirement 6: Text Readability

**User Story:** As a player, I want all text to remain readable on small and large screens, so that I can always see my score, game state, and interaction prompts.

#### Acceptance Criteria

1. THE Score_Display SHALL scale proportionally with the Scale_Factor and remain positioned in the top-right area of the visible game area.
2. THE Game_Over_Display SHALL scale proportionally with the Scale_Factor and remain centered in the visible game area.
3. THE Sequence_Display SHALL scale proportionally with the Scale_Factor and remain positioned above the conveyor belt area.
4. THE Start_Screen text SHALL scale proportionally with the Scale_Factor and remain centered in the visible game area.
5. WHEN the Scale_Factor results in text smaller than 12 CSS pixels, THE Layout_System SHALL enforce a minimum font size of 12 CSS pixels for all game text.

### Requirement 7: Conveyor and Game World Scaling

**User Story:** As a player, I want the conveyor belt, machines, items, and player to scale together, so that the game looks correct at any size.

#### Acceptance Criteria

1. THE Layout_System SHALL scale the conveyor belt rectangle, inlet, and outlet proportionally using the Scale_Factor.
2. THE Layout_System SHALL scale machine rectangles proportionally using the Scale_Factor and maintain their positions relative to the conveyor belt.
3. THE Layout_System SHALL scale item rendering size proportionally using the Scale_Factor.
4. THE Layout_System SHALL scale the player graphic proportionally using the Scale_Factor and maintain positions relative to the movement grid.
5. THE Layout_System SHALL scale the movement area node positions proportionally using the Scale_Factor.

### Requirement 8: Larger Screen Adaptation

**User Story:** As a player on a large monitor, I want the game to use the available space effectively, so that the game does not appear tiny in the center of my screen.

#### Acceptance Criteria

1. WHEN the Viewport is larger than the Base_Resolution in both dimensions, THE Layout_System SHALL scale the game area up to fill the Viewport while preserving aspect ratio.
2. THE Layout_System SHALL NOT apply a maximum Scale_Factor cap, allowing the game to grow with the Viewport.
3. WHEN scaling up, THE Layout_System SHALL maintain the same relative proportions between all game elements as at Base_Resolution.

### Requirement 9: Phaser Resize Configuration

**User Story:** As a developer, I want the Phaser game config to support dynamic resizing, so that the responsive system has the engine-level support it needs.

#### Acceptance Criteria

1. THE Game_Canvas SHALL be configured with Phaser's Scale Manager using a mode that supports dynamic resizing to the Viewport.
2. THE Game_Canvas SHALL use the `Phaser.Scale.RESIZE` or `Phaser.Scale.FIT` scale mode to handle Viewport changes.
3. THE Game_Canvas SHALL set `autoCenter` to `Phaser.Scale.CENTER_BOTH` to center the canvas in the Viewport.
4. WHEN the Phaser Scale Manager emits a resize event, THE Layout_System SHALL recalculate all positions and sizes.

### Requirement 10: CSS and HTML Fullscreen Support

**User Story:** As a developer, I want the HTML and CSS to support fullscreen canvas rendering, so that the browser does not add unwanted margins or scrollbars.

#### Acceptance Criteria

1. THE index.html SHALL include CSS that sets `margin: 0`, `padding: 0`, and `overflow: hidden` on the `html` and `body` elements.
2. THE index.html SHALL include CSS that sets the `html` and `body` elements to `width: 100%` and `height: 100%`.
3. THE Game_Canvas SHALL not cause scrollbars to appear in the browser at any Viewport size.

### Requirement 11: Input Preservation

**User Story:** As a player, I want both keyboard and touch input to continue working after the responsive changes, so that I can play on any device.

#### Acceptance Criteria

1. WHEN the game is running on a device with a keyboard, THE ActionLayer SHALL continue to accept keyboard input for all five game actions.
2. WHEN the game is running on a touch device, THE Touch_Buttons SHALL continue to accept touch input for all five game actions.
3. WHEN the Viewport is resized, THE Touch_Buttons interactive hit areas SHALL update to match their new visual positions and sizes.
4. THE Layout_System SHALL NOT introduce any new input methods or remove any existing input methods.

### Requirement 12: Single Responsive System

**User Story:** As a developer, I want a single responsive scaling system rather than duplicated layouts, so that the code stays maintainable and easy to extend.

#### Acceptance Criteria

1. THE Layout_System SHALL be implemented as a single system that all scenes and UI components reference for position and size calculations.
2. THE Layout_System SHALL NOT require separate layout definitions for portrait and landscape Orientation.
3. THE Layout_System SHALL derive all scaled positions from the Base_Resolution constants and the current Scale_Factor.
4. THE Layout_System SHALL expose a public API that other systems can call to obtain scaled coordinates and sizes.
