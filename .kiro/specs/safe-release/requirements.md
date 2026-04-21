# Requirements Document

## Introduction

The safe-release feature prevents avoidable belt collisions by allowing the inlet and machines to hold items until releasing them onto the belt is safe. Currently, machines immediately return processed items to the belt at their zone end position, and the inlet pushes items onto the loop without checking spacing. This causes unavoidable collisions when items cluster together. Safe release introduces a spacing-aware hold-and-release mechanism for both the inlet and all machines, making collision behavior stricter and fairer.

## Glossary

- **Belt**: The rectangular conveyor loop that items travel along, defined by LOOP_WAYPOINTS in ConveyorConfig.
- **Inlet**: The horizontal segment from INLET_START to INLET_END where new items spawn and queue before entering the Belt.
- **Machine**: One of three processing stations (Machine_1, Machine_2, Machine_3) that intake items from the Belt, process them, and return them.
- **Safe_Release_System**: The centralized system responsible for deciding whether an item may be released onto the Belt based on spacing rules.
- **Minimum_Belt_Spacing**: The minimum allowed distance between any two items on the Belt, equal to twice the diagonal of one item (2 × √(ITEM_SIZE² + ITEM_SIZE²)).
- **Pending_Release_Item**: A finished item held inside a Machine because releasing it would violate Minimum_Belt_Spacing.
- **Inlet_Queue**: The set of items currently on the Inlet segment, waiting to enter the Belt.
- **Used_Capacity**: The count of items occupying a Machine, calculated as waiting items + currently processed item + Pending_Release_Items.
- **Item_Diagonal**: The diagonal length of one square item (√(ITEM_SIZE² + ITEM_SIZE²)).
- **Inlet_Capacity**: The maximum number of items that can fit on the Inlet segment while respecting minimal spacing.

## Requirements

### Requirement 1: Minimum Belt Spacing Configuration

**User Story:** As a developer, I want the minimum belt spacing to be defined as a configurable constant derived from item geometry, so that spacing rules are consistent and easy to tune.

#### Acceptance Criteria

1. THE Safe_Release_System SHALL define Minimum_Belt_Spacing as 2 × Item_Diagonal (2 × √(ITEM_SIZE² + ITEM_SIZE²)).
2. THE Safe_Release_System SHALL expose Minimum_Belt_Spacing as a named constant in ConveyorConfig.
3. WHEN ITEM_SIZE changes, THE Safe_Release_System SHALL derive Minimum_Belt_Spacing from the updated ITEM_SIZE without manual recalculation.

### Requirement 2: Belt Spacing Check

**User Story:** As a developer, I want a centralized function that checks whether a position on the belt has enough clearance from nearby items, so that all release decisions use the same logic.

#### Acceptance Criteria

1. THE Safe_Release_System SHALL provide a function that accepts a candidate release position and the list of current Belt items and returns whether the position has at least Minimum_Belt_Spacing clearance from every Belt item.
2. WHEN the candidate position is within Minimum_Belt_Spacing of any Belt item, THE Safe_Release_System SHALL report the position as unsafe.
3. WHEN the candidate position is at least Minimum_Belt_Spacing from all Belt items, THE Safe_Release_System SHALL report the position as safe.

### Requirement 3: Machine Safe Release

**User Story:** As a player, I want machines to hold finished items until the belt is clear, so that processed items do not cause collisions when returned to the belt.

#### Acceptance Criteria

1. WHEN a Machine finishes processing an item and the release position on the Belt is safe, THE Machine SHALL release the item onto the Belt at the machine zone end position.
2. WHEN a Machine finishes processing an item and the release position on the Belt is unsafe, THE Machine SHALL hold the item internally as a Pending_Release_Item.
3. WHILE a Machine holds one or more Pending_Release_Items, THE Machine SHALL attempt to release the oldest Pending_Release_Item each update frame.
4. WHEN the release position becomes safe, THE Machine SHALL release the oldest Pending_Release_Item onto the Belt.
5. THE Machine SHALL release Pending_Release_Items in first-in-first-out order.

### Requirement 4: Machine Capacity Calculation

**User Story:** As a developer, I want machine capacity to account for all items the machine is responsible for, so that intake decisions are correct and consistent.

#### Acceptance Criteria

1. THE Machine SHALL calculate Used_Capacity as the count of waiting items (heldItems awaiting processing) plus the currently processed item (activeInteraction item) plus all Pending_Release_Items.
2. WHEN Used_Capacity equals the Machine capacity, THE Machine SHALL refuse to intake additional items from the Belt.
3. WHEN a Pending_Release_Item is released onto the Belt, THE Machine SHALL decrease Used_Capacity by one.

### Requirement 5: Inlet Queue Behavior

**User Story:** As a player, I want items on the inlet to queue safely with minimal spacing, so that items wait without causing a false collision.

#### Acceptance Criteria

1. WHILE items are on the Inlet, THE Inlet_Queue SHALL allow items to wait with minimal spacing without triggering a collision.
2. WHEN an item on the Inlet reaches a position where the item ahead is too close, THE Inlet_Queue SHALL pause the trailing item until spacing allows forward movement.
3. WHEN the leading Inlet item cannot enter the Belt because the Belt entry point is unsafe, THE Inlet_Queue SHALL hold the leading item at the Inlet-to-Belt junction.
4. THE Inlet_Queue SHALL maintain item order (first-spawned items enter the Belt first).

### Requirement 6: Inlet-to-Belt Transition

**User Story:** As a developer, I want the inlet-to-belt transition to respect belt spacing, so that items entering the loop do not collide with items already on the belt.

#### Acceptance Criteria

1. WHEN the leading Inlet item reaches the Inlet-to-Belt junction and the Belt entry point is safe, THE Inlet_Queue SHALL allow the item to transition onto the Belt.
2. WHEN the leading Inlet item reaches the Inlet-to-Belt junction and the Belt entry point is unsafe, THE Inlet_Queue SHALL hold the item at the junction until the entry point becomes safe.
3. THE Safe_Release_System SHALL use the same Minimum_Belt_Spacing check for Inlet-to-Belt transitions as for Machine releases.

### Requirement 7: Inlet Collision (Spawn Overflow)

**User Story:** As a player, I want the game to end only when a new item spawns and the inlet is truly full, so that collisions are fair and avoidable.

#### Acceptance Criteria

1. WHEN a new item spawns and the Inlet has space for the new item (the spawn position has at least minimal spacing from the rearmost queued item), THE ItemSystem SHALL place the new item at the spawn position.
2. WHEN a new item spawns and the Inlet is full (the spawn position does not have minimal spacing from the rearmost queued item), THE ItemSystem SHALL trigger a collision (game over).
3. THE ItemSystem SHALL determine Inlet fullness based on the position of the rearmost item relative to the spawn point and the minimal spacing rule.

### Requirement 8: Belt Collision Update

**User Story:** As a developer, I want belt collision detection to exclude inlet items from pairwise checks, so that queued inlet items do not trigger false collisions.

#### Acceptance Criteria

1. WHEN checking for collisions, THE ItemSystem SHALL skip collision checks between two items that are both on the Inlet.
2. WHEN checking for collisions, THE ItemSystem SHALL still check collisions between Belt items, between Outlet items, and between Belt and Inlet items at the junction.
3. WHEN two Belt items are within COLLISION_THRESHOLD distance, THE ItemSystem SHALL report a collision.

### Requirement 9: Automation Safe Release

**User Story:** As a developer, I want the automation system to respect safe release when returning processed items, so that automated machines do not cause belt collisions.

#### Acceptance Criteria

1. WHEN the AutomationSystem completes processing an item, THE AutomationSystem SHALL check belt safety before returning the item.
2. WHEN the release position is unsafe, THE AutomationSystem SHALL leave the item as a Pending_Release_Item inside the Machine.
3. WHEN the release position is safe, THE AutomationSystem SHALL release the item onto the Belt.

### Requirement 10: Player Interaction Safe Release

**User Story:** As a player, I want items I finish processing to be held by the machine if the belt is not clear, so that my successful interactions do not cause an unfair collision.

#### Acceptance Criteria

1. WHEN a player completes a machine interaction successfully and the release position is safe, THE MachineSystem SHALL return the item to the Belt.
2. WHEN a player completes a machine interaction successfully and the release position is unsafe, THE MachineSystem SHALL hold the item as a Pending_Release_Item.
3. WHEN a player fails or cancels a machine interaction and the release position is unsafe, THE MachineSystem SHALL hold the item as a Pending_Release_Item with its original state.
4. WHEN a player fails or cancels a machine interaction and the release position is safe, THE MachineSystem SHALL return the item to the Belt with its original state.

### Requirement 11: Existing Gameplay Preservation

**User Story:** As a player, I want all existing gameplay systems to continue working correctly after safe release is added, so that the game remains stable.

#### Acceptance Criteria

1. THE ConveyorSystem SHALL continue to advance items along the Belt at CONVEYOR_SPEED.
2. THE MachineSystem SHALL continue to intake items based on zone progress and accepted input statuses.
3. THE GameManager SHALL continue to track score, budget, and upgrades.
4. THE outlet system SHALL continue to collect exited items and award payouts.
5. WHEN a true collision occurs (spacing rules are violated on the Belt), THE ItemSystem SHALL trigger game over.
