# Requirements Document

## Introduction

This feature implements the first playable version of the upgrade terminal and connects it to a real budget system and machine upgrade progression. The terminal already exists visually but does not yet provide upgrade gameplay. This spec adds a budget currency that increases alongside score on item payout, a terminal interaction flow that lets the player select a machine and then choose an upgrade direction, a configurable upgrade pricing system with exponential scaling, a GameManager class that centralizes score, budget, upgrade state, and config values, four upgrade types per machine (capacity, quality, speed, automation), automation behavior that processes items without player input, and activity indicators on each machine. The goal is a fully playable upgrade loop that is easy to balance later without rewriting gameplay logic.

## Glossary

- **Budget**: A numeric currency stored in dollars that increases alongside Score on item payout and is spent on upgrades. Budget is separate from Score and must never go below zero.
- **Score**: The existing running total of item value points accumulated during a run. Score is never spent.
- **GameManager**: A centralized class responsible for owning and managing Score, Budget, machine upgrade values, upgrade cost calculation, and central gameplay config values relevant to upgrades and payout.
- **Terminal**: The existing visual element at the left player position that, when interacted with, opens Terminal_Mode for purchasing machine upgrades.
- **Terminal_Mode**: The input state entered when the player interacts with the Terminal. In Terminal_Mode, directional inputs are used for machine selection and upgrade selection instead of player movement.
- **Machine_Selection_Phase**: The first phase of Terminal_Mode where the player selects a target machine using directional input (Up = Machine 1, Right = Machine 2, Down = Machine 3, Left = no selectable option).
- **Upgrade_Selection_Phase**: The second phase of Terminal_Mode where the player selects an upgrade direction for the previously selected machine (Up = Capacity, Right = Automation, Down = Quality, Left = Speed).
- **Upgrade_Level**: The current level of a specific upgrade type on a specific machine, starting at 0 and capped at a maximum of 10.
- **Upgrade_Type**: One of four upgrade categories: Capacity, Quality, Speed, or Automation.
- **Base_Price**: The starting cost of any upgrade for a specific machine before scaling. Machine 1 = 50, Machine 2 = 250, Machine 3 = 1000.
- **Upgrade_Cost**: The calculated price for the next purchase of a specific Upgrade_Type on a specific machine, equal to Base_Price multiplied by 2 raised to the power of the current Upgrade_Level for that type on that machine.
- **Capacity_Upgrade**: An upgrade that increases a machine's item capacity by +1 per level.
- **Quality_Upgrade**: An upgrade that increases a machine's work quality by +0.1 per level and increases the required sequence length by +1 per level.
- **Speed_Upgrade**: An upgrade that reduces automation timing. Automation timing starts at 1100 ms and each Speed_Upgrade reduces it by 100 ms.
- **Automation_Upgrade**: An upgrade that increases a machine's automation level by +1 per level, starting from 0.
- **Automation_Timing**: The interval in milliseconds between automated item processing attempts on a machine. Starts at 1100 ms and is reduced by 100 ms per Speed_Upgrade level.
- **Activity_Indicator**: A small round status indicator displayed in the top-right corner of each machine, showing green when the machine is active (manual or automated) and red when inactive.
- **Upgrade_Button**: A UI element in the Upgrade_Selection_Phase that displays the upgrade type, cost, and affordability color for a specific upgrade direction.
- **MachineSystem**: The existing gameplay system responsible for managing machine intake, interaction, sequence validation, and item output.
- **ItemSystem**: The existing system responsible for spawning items, tracking item state, and managing item lifecycle.
- **ActionLayer**: The existing input abstraction that buffers directional and interact actions each frame.
- **GameScene**: The primary gameplay scene that renders the factory layout and coordinates all systems.

## Requirements

### Requirement 1: GameManager Centralization

**User Story:** As a developer, I want a single GameManager class that owns score, budget, upgrade state, and config values, so that gameplay tuning is centralized and easy to change.

#### Acceptance Criteria

1. THE GameManager SHALL store the current Score as a numeric value starting at 0.
2. THE GameManager SHALL store the current Budget as a numeric value starting at 0.
3. THE GameManager SHALL store the Upgrade_Level for each Upgrade_Type on each machine, starting at 0.
4. THE GameManager SHALL store configurable Base_Price values for each machine (Machine 1 = 50, Machine 2 = 250, Machine 3 = 1000).
5. THE GameManager SHALL store configurable upgrade effect values (capacity increment, quality increment, sequence length increment, speed reduction, and automation increment per level).
6. THE GameManager SHALL expose a method to calculate the Upgrade_Cost for a given machine and Upgrade_Type based on the formula: Base_Price multiplied by 2 raised to the power of the current Upgrade_Level for that type on that machine.
7. THE GameManager SHALL be the sole system responsible for modifying Score and Budget values.

### Requirement 2: Budget Display

**User Story:** As a player, I want to see my current budget on screen next to the score, so that I know how much I can spend on upgrades.

#### Acceptance Criteria

1. WHEN GameScene is active, THE GameScene SHALL display the Budget as a numeric text element positioned adjacent to the Score display.
2. THE Budget display SHALL use a dollar prefix or label to distinguish it from the Score display.
3. THE Budget display SHALL update within the same frame that the Budget value changes.

### Requirement 3: Budget and Score Payout

**User Story:** As a player, I want my budget to increase alongside my score when items pay out, so that I earn currency for upgrades through normal gameplay.

#### Acceptance Criteria

1. WHEN an item exits through the outlet and generates a payout value, THE GameManager SHALL add the payout value to both the Score and the Budget.
2. THE GameManager SHALL keep Score and Budget as separate values that are modified independently after the initial payout addition.
3. THE Score SHALL never be reduced or spent by any system.

### Requirement 4: Terminal Interaction Entry

**User Story:** As a player, I want to open the upgrade terminal by interacting with it, so that I can access the upgrade menu.

#### Acceptance Criteria

1. WHEN the player is at the left Player_Position and presses the Interact key, THE GameScene SHALL enter Terminal_Mode.
2. WHEN Terminal_Mode is entered, THE GameScene SHALL display the Machine_Selection_Phase UI.
3. WHILE Terminal_Mode is active, THE InputSystem SHALL not process directional inputs as player movement.
4. WHEN the player presses the Interact key while in Terminal_Mode without a machine selected, THE GameScene SHALL exit Terminal_Mode and return to normal navigation.

### Requirement 5: Machine Selection in Terminal Mode

**User Story:** As a player, I want to select which machine to upgrade using directional input, so that I can target my upgrades.

#### Acceptance Criteria

1. WHILE in Machine_Selection_Phase, WHEN the player presses Up, THE Terminal SHALL select Machine 1 as the upgrade target.
2. WHILE in Machine_Selection_Phase, WHEN the player presses Right, THE Terminal SHALL select Machine 2 as the upgrade target.
3. WHILE in Machine_Selection_Phase, WHEN the player presses Down, THE Terminal SHALL select Machine 3 as the upgrade target.
4. WHILE in Machine_Selection_Phase, WHEN the player presses Left, THE Terminal SHALL not select any machine and shall not change the current state.
5. WHEN a machine is selected, THE Terminal SHALL transition to the Upgrade_Selection_Phase for that machine.

### Requirement 6: Upgrade Selection and Purchase

**User Story:** As a player, I want to choose an upgrade direction and purchase it, so that I can improve my machines.

#### Acceptance Criteria

1. WHILE in Upgrade_Selection_Phase, WHEN the player presses Up, THE GameManager SHALL attempt to purchase a Capacity_Upgrade for the selected machine.
2. WHILE in Upgrade_Selection_Phase, WHEN the player presses Right, THE GameManager SHALL attempt to purchase an Automation_Upgrade for the selected machine.
3. WHILE in Upgrade_Selection_Phase, WHEN the player presses Down, THE GameManager SHALL attempt to purchase a Quality_Upgrade for the selected machine.
4. WHILE in Upgrade_Selection_Phase, WHEN the player presses Left, THE GameManager SHALL attempt to purchase a Speed_Upgrade for the selected machine.
5. WHEN a purchase is attempted AND the Budget is greater than or equal to the Upgrade_Cost AND the Upgrade_Level is below 10, THE GameManager SHALL deduct the Upgrade_Cost from the Budget and increment the Upgrade_Level by 1.
6. WHEN a purchase is attempted AND the Budget is less than the Upgrade_Cost, THE GameManager SHALL not modify the Budget or the Upgrade_Level.
7. WHEN a purchase is attempted AND the Upgrade_Level is already at 10, THE GameManager SHALL not modify the Budget or the Upgrade_Level.
8. THE Terminal SHALL remain in Upgrade_Selection_Phase after a purchase attempt, whether successful or not.
9. WHEN the player presses the Interact key while in Upgrade_Selection_Phase, THE Terminal SHALL return to Machine_Selection_Phase.

### Requirement 7: Budget Floor Enforcement

**User Story:** As a developer, I want the budget to never go below zero, so that the economy system remains consistent.

#### Acceptance Criteria

1. THE GameManager SHALL enforce that the Budget value is never reduced below 0.
2. IF a purchase would reduce the Budget below 0, THEN THE GameManager SHALL reject the purchase and leave the Budget unchanged.

### Requirement 8: Upgrade Level Cap

**User Story:** As a developer, I want each upgrade type capped at level 10 per machine, so that progression has a defined ceiling.

#### Acceptance Criteria

1. THE GameManager SHALL enforce a maximum Upgrade_Level of 10 for each Upgrade_Type on each machine.
2. IF an upgrade purchase is attempted for an Upgrade_Type that is already at level 10 on the target machine, THEN THE GameManager SHALL reject the purchase.

### Requirement 9: Upgrade Pricing Formula

**User Story:** As a developer, I want upgrade prices to scale exponentially based on how many times the same upgrade type has been purchased on the same machine, so that progression has meaningful cost curves.

#### Acceptance Criteria

1. THE GameManager SHALL calculate Upgrade_Cost as Base_Price multiplied by 2 raised to the power of the current Upgrade_Level for that Upgrade_Type on that machine.
2. WHEN the Upgrade_Level is 0, THE Upgrade_Cost SHALL equal the Base_Price.
3. WHEN the Upgrade_Level is 1, THE Upgrade_Cost SHALL equal the Base_Price multiplied by 2.
4. WHEN the Upgrade_Level is 2, THE Upgrade_Cost SHALL equal the Base_Price multiplied by 4.
5. THE Base_Price values and the scaling formula SHALL be stored in a configurable data structure within GameManager.

### Requirement 10: Capacity Upgrade Effect

**User Story:** As a player, I want capacity upgrades to let machines hold more items, so that I can buffer more work.

#### Acceptance Criteria

1. WHEN a Capacity_Upgrade is purchased for a machine, THE GameManager SHALL increase that machine's capacity by 1.
2. THE MachineSystem SHALL use the updated capacity value to enforce intake limits.

### Requirement 11: Quality Upgrade Effect

**User Story:** As a player, I want quality upgrades to increase item value but also make sequences longer, so that there is a meaningful tradeoff.

#### Acceptance Criteria

1. WHEN a Quality_Upgrade is purchased for a machine, THE GameManager SHALL increase that machine's work quality by 0.1.
2. WHEN a Quality_Upgrade is purchased for a machine, THE GameManager SHALL increase that machine's required sequence length by 1.

### Requirement 12: Speed Upgrade Effect

**User Story:** As a player, I want speed upgrades to make automation faster, so that automated machines process items more quickly.

#### Acceptance Criteria

1. THE Automation_Timing for each machine SHALL start at 1100 milliseconds.
2. WHEN a Speed_Upgrade is purchased for a machine, THE GameManager SHALL reduce that machine's Automation_Timing by 100 milliseconds.
3. THE Speed_Upgrade SHALL apply only to automated processing timing and shall not affect manual interaction speed.

### Requirement 13: Automation Upgrade Effect

**User Story:** As a player, I want automation upgrades to let machines process items without my input, so that I can scale production.

#### Acceptance Criteria

1. THE automation level for each machine SHALL start at 0.
2. WHEN an Automation_Upgrade is purchased for a machine, THE GameManager SHALL increase that machine's automation level by 1.
3. WHILE a machine's automation level is greater than 0, THE MachineSystem SHALL automatically process items held by that machine without requiring player input.

### Requirement 14: Automation Behavior

**User Story:** As a developer, I want automation to process items on a timer without simulating sequence inputs, so that the implementation stays simple and predictable.

#### Acceptance Criteria

1. WHILE a machine has an automation level greater than 0 AND holds at least one item AND is not currently being manually interacted with, THE MachineSystem SHALL automatically process one item per Automation_Timing interval.
2. WHEN an item is automatically processed, THE MachineSystem SHALL set the item's status to the machine's output status and return the item to the belt at the machine zone end position.
3. THE MachineSystem SHALL not simulate directional sequence inputs during automated processing.
4. WHILE the player is manually interacting with a machine, THE MachineSystem SHALL suspend automated processing on that specific machine.
5. WHILE a machine is processing items automatically, THE MachineSystem SHALL mark that machine as active.

### Requirement 15: Activity Indicator Display

**User Story:** As a player, I want to see at a glance whether each machine is active, so that I can manage my factory efficiently.

#### Acceptance Criteria

1. THE GameScene SHALL render a small round Activity_Indicator in the top-right corner of each machine.
2. WHILE a machine is active due to manual interaction or automated processing, THE Activity_Indicator SHALL display in green.
3. WHILE a machine is inactive with no manual interaction and no automated processing occurring, THE Activity_Indicator SHALL display in red.

### Requirement 16: Upgrade UI Clarity

**User Story:** As a player, I want the terminal UI to clearly show what each upgrade costs and whether I can afford it, so that I can make informed decisions.

#### Acceptance Criteria

1. WHILE in Upgrade_Selection_Phase, THE Terminal UI SHALL display an Upgrade_Button for each of the four upgrade directions.
2. THE Upgrade_Button SHALL display the Upgrade_Type name.
3. THE Upgrade_Button SHALL display the current Upgrade_Cost for that type on the selected machine.
4. WHILE the current Budget is greater than or equal to the Upgrade_Cost, THE Upgrade_Button cost text SHALL display in green.
5. WHILE the current Budget is less than the Upgrade_Cost, THE Upgrade_Button cost text SHALL display in red.
6. WHILE in Upgrade_Selection_Phase, THE Terminal UI SHALL clearly indicate which machine is currently selected.
7. WHILE an Upgrade_Type is at level 10 on the selected machine, THE Upgrade_Button SHALL indicate that the upgrade is at maximum level and cannot be purchased.

### Requirement 17: Terminal Has No Self-Upgrade

**User Story:** As a developer, I want the terminal to have no upgrade option for itself in this spec, so that scope stays focused.

#### Acceptance Criteria

1. THE Terminal SHALL not offer any upgrade option that targets the Terminal itself.
2. THE Terminal SHALL only offer upgrades that target Machine 1, Machine 2, or Machine 3.

### Requirement 18: Configurable Upgrade Values

**User Story:** As a developer, I want all upgrade costs and effect values to be stored in a configurable data structure, so that long-term balancing is possible without rewriting gameplay logic.

#### Acceptance Criteria

1. THE GameManager SHALL store all Base_Price values, upgrade effect increments, Automation_Timing base value, and Automation_Timing reduction per level in a single configurable data object.
2. THE GameManager SHALL read all upgrade-related values from this config object rather than using hardcoded literals in gameplay logic.
3. THE config object SHALL be defined in a data file that can be modified independently of system logic.

### Requirement 19: Existing Systems Remain Functional

**User Story:** As a developer, I want all existing gameplay systems to continue working correctly after this feature is added, so that no previously working functionality is broken.

#### Acceptance Criteria

1. WHEN GameScene is active, THE ConveyorSystem SHALL continue to move items along the belt at constant speed.
2. WHEN GameScene is active, THE ItemSystem SHALL continue to spawn items and manage item lifecycle.
3. WHEN GameScene is active, THE MachineSystem SHALL continue to support manual machine interaction via directional sequences.
4. THE project SHALL build and run without errors after all changes are applied.
