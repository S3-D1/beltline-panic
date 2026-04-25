# Requirements Document

## Introduction

Replace all temporary placeholder shapes (rectangles, circles, lines drawn via `Phaser.GameObjects.Graphics`) with the actual image assets provided in `public/assets/`. The game currently renders every visual element — belt segments, machines, items, the player, and the terminal — using programmatic shape drawing. This feature loads the sprite assets in PreloadScene and replaces each drawing routine with sprite-based rendering, using flip, rotation, tiling, and tint as needed to match the existing visual layout.

## Glossary

- **Renderer**: The collection of drawing modules in `src/rendering/` (`BeltDrawing`, `MachineDrawing`, `ItemDrawing`, `TerminalDrawing`, `StartDrawing`, `FloorDrawing`) and inline rendering code in scenes that produce the game's visuals.
- **PreloadScene**: The Phaser scene (`src/scenes/PreloadScene.ts`) responsible for loading all assets before gameplay begins.
- **LayoutSystem**: The scaling and positioning system (`src/systems/LayoutSystem.ts`) that maps base-resolution coordinates to screen coordinates.
- **Sprite**: A `Phaser.GameObjects.Sprite` or `Phaser.GameObjects.Image` instance displaying a loaded texture.
- **Placeholder_Shape**: Any rectangle, circle, or line drawn via `Phaser.GameObjects.Graphics` that represents a game entity (belt, machine, item, player, terminal) and is intended to be replaced by an image asset.
- **Asset_Key**: The string key used by Phaser's texture manager to reference a loaded image (e.g., `'belt'`, `'worker_64_front'`).
- **Tiling**: Repeating a sprite texture across a region, either via `Phaser.GameObjects.TileSprite` or by placing multiple sprite instances.
- **GameScene**: The main gameplay scene (`src/scenes/GameScene.ts`) where belt, machines, items, player, and terminal are rendered each frame.
- **StartScene**: The title/start screen scene (`src/scenes/StartScene.ts`) that displays decorative factory silhouettes.

## Requirements

### Requirement 1: Asset Loading

**User Story:** As a player, I want all image assets loaded before gameplay begins, so that sprites display immediately without pop-in.

#### Acceptance Criteria

1. THE PreloadScene SHALL load every image file in `public/assets/` (excluding the `audio/` subdirectory) as a Phaser texture with a descriptive Asset_Key.
2. WHEN PreloadScene completes loading, THE PreloadScene SHALL have registered the following Asset_Keys in the Phaser texture manager: `belt`, `item_new_metal_block_64`, `item_processed_metal_ball_64`, `item_improved_metal_ball_shiny_64`, `item_packaged_gift_64`, `machine_interaction_active`, `machine_no-interaction_active`, `machine_no-interaction_inactive`, `worker_64_front`, `worker_64_back`, `worker_64_side`, `terminal_active`, `terminal_inactive`.
3. IF an image asset fails to load, THEN THE PreloadScene SHALL log a warning to the console and allow the game to continue with fallback rendering.

### Requirement 2: Belt Rendering with Belt Asset

**User Story:** As a player, I want the conveyor belt to display using the belt sprite asset instead of colored rectangles, so that the factory looks polished.

#### Acceptance Criteria

1. THE Renderer SHALL replace the programmatic rectangle segments in `BeltDrawing.ts` with tiled or repeated instances of the `belt` texture along the loop path, inlet, and outlet.
2. THE Renderer SHALL rotate each belt sprite instance to align with the direction of the path segment it covers (horizontal segments at 0°, vertical segments at 90°).
3. THE Renderer SHALL scale belt sprite instances to match the existing belt width (`ITEM_SIZE * 3` base-resolution pixels) using the LayoutSystem.
4. THE Renderer SHALL animate the belt by shifting the tile offset or sprite positions each frame, preserving the existing `beltOffset` animation behavior.
5. WHEN the game is in a game-over state, THE Renderer SHALL stop advancing the belt animation offset.

### Requirement 3: Item Rendering with Item Assets

**User Story:** As a player, I want each item processing state to display its corresponding sprite asset instead of programmatic shapes, so that items are visually distinct and polished.

#### Acceptance Criteria

1. WHEN an item has state `new`, THE Renderer SHALL display the `item_new_metal_block_64` sprite centered on the item's position.
2. WHEN an item has state `processed`, THE Renderer SHALL display the `item_processed_metal_ball_64` sprite centered on the item's position.
3. WHEN an item has state `upgraded`, THE Renderer SHALL display the `item_improved_metal_ball_shiny_64` sprite centered on the item's position.
4. WHEN an item has state `packaged`, THE Renderer SHALL display the `item_packaged_gift_64` sprite centered on the item's position.
5. THE Renderer SHALL scale each item sprite to match the existing `ITEM_SIZE` (14 base-resolution pixels) using the LayoutSystem.
6. WHEN a collision occurs and the game enters game-over state, THE Renderer SHALL apply a red tint blink effect to the two collided item sprites, alternating every 300ms between the collision blink color and the normal sprite appearance.

### Requirement 4: Machine Rendering with Machine Assets

**User Story:** As a player, I want each machine to display using the machine sprite assets reflecting its current state, so that I can visually identify active and idle machines.

#### Acceptance Criteria

1. WHEN a machine is idle and does not require player interaction, THE Renderer SHALL display the `machine_no-interaction_inactive` sprite at the machine's position.
2. WHEN a machine is active (processing via automation or holding items) but the player is not interacting with it, THE Renderer SHALL display the `machine_no-interaction_active` sprite at the machine's position.
3. WHEN the player is actively interacting with a machine, THE Renderer SHALL display the `machine_interaction_active` sprite at the machine's position.
4. THE Renderer SHALL rotate each machine sprite to face the belt: Machine 1 (top) rotated so its face points downward, Machine 2 (right) rotated so its face points left, Machine 3 (bottom) rotated so its face points upward.
5. THE Renderer SHALL scale each machine sprite to cover the existing machine body dimensions (100×60 for horizontal machines, 60×100 for the vertical machine) using the LayoutSystem.

### Requirement 5: Player Rendering with Worker Assets

**User Story:** As a player, I want my character to display as the worker sprite instead of a red square, so that the game has a recognizable player character.

#### Acceptance Criteria

1. WHEN the player is at the `center` position, THE Renderer SHALL display the `worker_64_front` sprite at the player's coordinates.
2. WHEN the player is at the `up` position, THE Renderer SHALL display the `worker_64_back` sprite at the player's coordinates.
3. WHEN the player is at the `down` position, THE Renderer SHALL display the `worker_64_front` sprite at the player's coordinates.
4. WHEN the player is at the `left` position, THE Renderer SHALL display the `worker_64_side` sprite at the player's coordinates, flipped horizontally.
5. WHEN the player is at the `right` position, THE Renderer SHALL display the `worker_64_side` sprite at the player's coordinates, without horizontal flip.
6. THE Renderer SHALL scale the worker sprite to match the existing player size (40 base-resolution pixels) using the LayoutSystem.

### Requirement 6: Terminal Rendering with Terminal Assets

**User Story:** As a player, I want the upgrade terminal to display using the terminal sprite assets reflecting its current state, so that the terminal looks polished and I can see whether it is active.

#### Acceptance Criteria

1. WHEN the player is NOT at the `left` position (terminal not in use), THE Renderer SHALL display the `terminal_inactive` sprite at the terminal's position, replacing the programmatic body, screen, and button rectangles in `TerminalDrawing.ts`.
2. WHEN the player IS at the `left` position (terminal in use), THE Renderer SHALL display the `terminal_active` sprite at the terminal's position.
3. THE Renderer SHALL scale the terminal sprite to cover the existing terminal body dimensions (40×60 base-resolution pixels) using the LayoutSystem.
4. THE Renderer SHALL position the terminal sprite at the same location as the current programmatic terminal (left side of the belt, vertically centered).

### Requirement 7: Start Scene Asset Integration

**User Story:** As a player, I want the start screen to show machine and belt assets instead of colored silhouettes, so that the title screen previews the actual game art.

#### Acceptance Criteria

1. THE Renderer SHALL replace the programmatic belt band in `StartDrawing.ts` with tiled instances of the `belt` texture, rendered at reduced opacity to maintain the decorative silhouette style.
2. THE Renderer SHALL replace the three machine silhouette rectangles in `StartDrawing.ts` with the `machine_no-interaction_inactive` sprite, each rotated appropriately and rendered at reduced opacity.
3. THE Renderer SHALL preserve the existing decorative layout positions and relative sizing of the start screen background elements.

### Requirement 8: Responsive Scaling and Resize

**User Story:** As a player, I want all sprite-based visuals to scale and reposition correctly when the browser window is resized, so that the game remains playable at any window size.

#### Acceptance Criteria

1. WHEN the browser window is resized, THE Renderer SHALL reposition and rescale all sprites using the LayoutSystem's current scale factor and offsets.
2. THE Renderer SHALL maintain the same visual proportions and relative positions as the previous placeholder shape rendering after a resize event.
3. THE Renderer SHALL update sprite positions each frame for dynamic elements (items, player, belt animation) using the LayoutSystem.

### Requirement 10: Visual Adjustments — Terminal Active State

**User Story:** As a player, I want the terminal to show as active only when I am actually interacting with it (not just standing near it), so that the visual state accurately reflects gameplay.

#### Acceptance Criteria

1. THE Renderer SHALL display the `terminal_active` sprite ONLY when the terminal interaction is ongoing (i.e., `terminalMode` is true in GameScene), NOT merely when the player is at the `left` position.
2. WHEN the player is at the `left` position but has not pressed interact to open the terminal, THE Renderer SHALL display the `terminal_inactive` sprite.
3. WHEN the terminal interaction ends (terminal is closed), THE Renderer SHALL immediately switch back to the `terminal_inactive` sprite.

### Requirement 11: Visual Adjustments — Worker Size Doubled

**User Story:** As a player, I want my worker character to appear larger on screen, so that the player character is more visible and prominent.

#### Acceptance Criteria

1. THE Renderer SHALL scale the worker sprite to 80 base-resolution pixels (doubled from the previous 40), using the LayoutSystem.
2. THE Renderer SHALL maintain the same position logic (center, up, down, left, right) and texture/flip mappings at the new size.

### Requirement 12: Visual Adjustments — Terminal Transparent Background

**User Story:** As a player, I want the terminal asset to render with a transparent background, so that it blends naturally with the game scene.

#### Acceptance Criteria

1. THE Renderer SHALL ensure the terminal sprite is rendered without any opaque background fill behind it, relying on the PNG asset's native alpha transparency.
2. IF the terminal sprite is currently rendered with a background rectangle or tint that obscures transparency, THE Renderer SHALL remove that background so the asset's transparent regions show through.

### Requirement 13: Visual Adjustments — Machine Size and Orientation

**User Story:** As a player, I want the machines to appear bigger (overlapping the belt) and have their monitor/face directed toward the worker in the center of the play area, so that the factory layout feels more immersive.

#### Acceptance Criteria

1. THE Renderer SHALL increase machine sprite dimensions so that machines visually overlap the belt area.
2. THE Renderer SHALL rotate each machine sprite so that its monitor/face points toward the center of the play area (where the worker stands): Machine 1 (top) faces down toward center, Machine 2 (right) faces left toward center, Machine 3 (bottom) faces up toward center.
3. THE Renderer SHALL maintain correct machine state texture swapping (idle, active, interaction) at the new size and orientation.
4. THE Renderer SHALL update resize handling to correctly reposition and rescale the larger machine sprites.

### Requirement 14: Visual Adjustments — Belt Static Display and Cropping

**User Story:** As a player, I want the belt to appear as a static surface with only the belt portion visible (no transparent background from the asset), so that the belt looks clean and grounded.

#### Acceptance Criteria

1. THE Renderer SHALL NOT animate the belt TileSprites (no scrolling of `tilePositionX`/`tilePositionY` each frame). The belt SHALL appear as a static surface.
2. THE Renderer SHALL ensure only the visible belt portion of the asset is displayed, cropping or masking out any transparent background regions from the belt PNG so that the belt edges are clean.
3. THE Renderer SHALL maintain correct belt segment positioning, rotation, and resize behavior with the static display.

### Requirement 9: Cleanup of Placeholder Drawing Code

**User Story:** As a developer, I want the old placeholder shape drawing code removed after sprite replacements are verified, so that the codebase stays clean and maintainable.

#### Acceptance Criteria

1. WHEN all sprite replacements are implemented and verified, THE Renderer SHALL remove unused programmatic shape-drawing functions from `ItemDrawing.ts` (drawCube, drawBall, drawShinyBall, drawGift).
2. WHEN all sprite replacements are implemented and verified, THE Renderer SHALL remove unused color constants from `Palette.ts` that were only referenced by the replaced placeholder drawing code.
3. THE Renderer SHALL retain the `PALETTE` object and any color constants still used by non-replaced elements (floor grid, UI text, terminal screen colors, collision blink).
4. WHEN all sprite replacements are implemented and verified, THE Renderer SHALL remove the programmatic shape-drawing code from `TerminalDrawing.ts` (body rectangle, screen rectangle, decorative buttons).
5. THE GameScene SHALL replace the inline `Phaser.GameObjects.Graphics`-based player rendering with the worker sprite approach defined in Requirement 5.
