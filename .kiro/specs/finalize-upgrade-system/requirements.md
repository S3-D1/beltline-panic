# Requirements Document

## Introduction

Replace the current increment-based upgrade calculation system in Beltline Panic with fixed lookup tables for all four upgrade categories: Automation Speed, Automation Level, Quality, and Machine Capacity. Every upgrade has exactly 11 states (Level 0 through Level 10) with predefined values that are never dynamically generated. The balancing parameters (base value, factor, upgrade costs) are exposed through a central GameManager configuration so they can be tuned without code changes. This ensures deterministic, predictable upgrade progression across all machines.

## Glossary

- **Upgrade_System**: The combination of `UpgradeConfig.ts` data definitions and `GameManager` logic that manages upgrade levels, costs, and the application of upgrade effects to machines.
- **GameManager**: The central game system (`src/systems/GameManager.ts`) responsible for score, budget, upgrade state, and applying upgrade effects to machines.
- **Machine**: One of the three processing stations (`machine1`, `machine2`, `machine3`) defined in `MachineConfig.ts` that the player interacts with.
- **MachineState**: The runtime state of a Machine, including `capacity`, `automationLevel`, `workQuality`, `workSpeed`, and `requiredSequenceLength`.
- **Upgrade_Level**: An integer from 0 to 10 representing the current tier of a specific upgrade on a specific Machine.
- **Lookup_Table**: A fixed array of exactly 11 entries (indices 0–10) mapping each Upgrade_Level to its predefined value.
- **Automation_Speed**: The upgrade category controlling the interval in milliseconds between automated sequence steps on a Machine. Lower values mean faster automation.
- **Automation_Level**: The upgrade category controlling how many sequence steps a Machine can solve automatically per interaction. Level 0 means no automation.
- **Quality**: The upgrade category that increases a Machine's output value modifier and required sequence length.
- **Quality_Modifier**: A multiplier applied to a Machine's configured base value or factor to determine the effective output value at a given Quality Upgrade_Level.
- **Sequence_Length**: The number of directional inputs required to complete a machine interaction, determined by the Quality Upgrade_Level.
- **Machine_Capacity**: The upgrade category controlling how many items a Machine can hold, process, or buffer simultaneously.
- **MachineValueConfig**: A per-machine configuration object specifying `machineId`, `baseValue`, `factor`, `qualityScalingMode`, and upgrade cost base price, exposed through the GameManager for balancing.
- **AutomationSystem**: The system (`src/systems/AutomationSystem.ts`) that drives step-by-step automated sequence solving on machines using Automation_Level and Automation_Speed values.
- **UpgradeType**: One of the four upgrade categories: `capacity`, `quality`, `speed`, or `automation`.

## Requirements

### Requirement 1: Fixed Upgrade Level Lookup Tables

**User Story:** As a developer, I want all upgrade progressions defined as fixed lookup tables with exactly 11 entries, so that upgrade values are deterministic and never dynamically calculated.

#### Acceptance Criteria

1. THE Upgrade_System SHALL define a Lookup_Table for Automation_Speed containing exactly 11 entries mapping Upgrade_Level 0 through 10 to interval values: [1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100] milliseconds.
2. THE Upgrade_System SHALL define a Lookup_Table for Automation_Level containing exactly 11 entries mapping Upgrade_Level 0 through 10 to automation step counts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].
3. THE Upgrade_System SHALL define a Lookup_Table for Sequence_Length containing exactly 11 entries mapping Upgrade_Level 0 through 10 to sequence lengths: [3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 10].
4. THE Upgrade_System SHALL define a Lookup_Table for Quality_Modifier containing exactly 11 entries mapping Upgrade_Level 0 through 10 to multipliers: [1.00, 1.15, 1.30, 1.50, 1.75, 2.00, 2.35, 2.75, 3.25, 4.00, 5.00].
5. THE Upgrade_System SHALL define a Lookup_Table for Machine_Capacity containing exactly 11 entries mapping Upgrade_Level 0 through 10 to capacity values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].
6. THE Upgrade_System SHALL retrieve upgrade values exclusively by indexing into the appropriate Lookup_Table using the current Upgrade_Level, with no arithmetic derivation of values at runtime.

### Requirement 2: Upgrade Level Boundaries

**User Story:** As a player, I want upgrades to have clear minimum and maximum levels, so that I understand the progression limits.

#### Acceptance Criteria

1. THE Upgrade_System SHALL initialize every UpgradeType for every Machine at Upgrade_Level 0.
2. THE Upgrade_System SHALL enforce a maximum Upgrade_Level of 10 for every UpgradeType on every Machine.
3. WHEN an upgrade purchase is attempted and the current Upgrade_Level is already 10, THE GameManager SHALL reject the purchase and return a failure indicator without modifying budget or Upgrade_Level.
4. THE Upgrade_System SHALL expose a query method that returns whether a given UpgradeType on a given Machine has reached the maximum Upgrade_Level.

### Requirement 3: Automation Speed Upgrade Application

**User Story:** As a player, I want the Automation Speed upgrade to reduce the time between automated sequence steps, so that my automated machines work faster.

#### Acceptance Criteria

1. WHEN the AutomationSystem queries the automation timing for a Machine, THE GameManager SHALL return the value from the Automation_Speed Lookup_Table at the Machine's current speed Upgrade_Level.
2. THE GameManager SHALL replace the current arithmetic formula (`automationBaseTimingMs - speedLevel * automationSpeedReductionMs`) with a direct Lookup_Table index operation.
3. WHEN the speed Upgrade_Level is 0, THE GameManager SHALL return 1100 milliseconds as the automation timing.
4. WHEN the speed Upgrade_Level is 10, THE GameManager SHALL return 100 milliseconds as the automation timing.

### Requirement 4: Automation Level Upgrade Application

**User Story:** As a player, I want the Automation Level upgrade to increase how many sequence steps a machine solves automatically, so that higher automation levels reduce my manual work.

#### Acceptance Criteria

1. WHEN upgrades are applied to a MachineState, THE GameManager SHALL set `automationLevel` to the value from the Automation_Level Lookup_Table at the Machine's current automation Upgrade_Level.
2. WHEN the automation Upgrade_Level is 0, THE GameManager SHALL set `automationLevel` to 0, meaning no automated steps.
3. WHEN the automation Upgrade_Level is 10, THE GameManager SHALL set `automationLevel` to 10, meaning the machine can solve up to 10 sequence steps automatically.

### Requirement 5: Quality Upgrade Application

**User Story:** As a player, I want the Quality upgrade to increase both the output value and the required sequence length, so that higher quality items are more rewarding but require more effort.

#### Acceptance Criteria

1. WHEN upgrades are applied to a MachineState, THE GameManager SHALL set `requiredSequenceLength` to the value from the Sequence_Length Lookup_Table at the Machine's current quality Upgrade_Level.
2. WHEN upgrades are applied to a MachineState, THE GameManager SHALL compute the effective quality value using the Quality_Modifier Lookup_Table at the Machine's current quality Upgrade_Level.
3. WHEN a Machine's MachineValueConfig has `qualityScalingMode` set to `'baseValue'`, THE GameManager SHALL calculate the effective base value as `configuredBaseValue * qualityModifier`.
4. WHEN a Machine's MachineValueConfig has `qualityScalingMode` set to `'factor'`, THE GameManager SHALL calculate the effective factor as `configuredFactor * qualityModifier`.
5. WHEN the quality Upgrade_Level is 0, THE GameManager SHALL use a Quality_Modifier of 1.00 and a Sequence_Length of 3.
6. WHEN the quality Upgrade_Level is 10, THE GameManager SHALL use a Quality_Modifier of 5.00 and a Sequence_Length of 10.

### Requirement 6: Machine Capacity Upgrade Application

**User Story:** As a player, I want the Machine Capacity upgrade to increase how many items a machine can hold at once, so that machines can buffer more items under pressure.

#### Acceptance Criteria

1. WHEN upgrades are applied to a MachineState, THE GameManager SHALL set `capacity` to the value from the Machine_Capacity Lookup_Table at the Machine's current capacity Upgrade_Level.
2. WHEN the capacity Upgrade_Level is 0, THE GameManager SHALL set `capacity` to 1.
3. WHEN the capacity Upgrade_Level is 10, THE GameManager SHALL set `capacity` to 11.
4. THE GameManager SHALL replace the current arithmetic formula (`MACHINE_DEFAULTS.capacity + levels.capacity * capacityIncrement`) with a direct Lookup_Table index operation.

### Requirement 7: GameManager Balancing Configuration

**User Story:** As a developer, I want a central balancing configuration for per-machine value parameters, so that I can tune base values, factors, and scaling modes without modifying upgrade logic.

#### Acceptance Criteria

1. THE GameManager SHALL expose a MachineValueConfig for each Machine containing: `machineId` (string), `baseValue` (number), `factor` (number), and `qualityScalingMode` (`'baseValue'` or `'factor'`).
2. THE GameManager SHALL use the MachineValueConfig when computing effective quality values during upgrade application.
3. THE GameManager SHALL store MachineValueConfig entries in a data-driven configuration structure that can be modified without changing upgrade calculation logic.
4. THE GameManager SHALL provide a method to retrieve the MachineValueConfig for a given Machine by `machineId`.

### Requirement 8: Upgrade Cost Configuration

**User Story:** As a developer, I want upgrade costs to be configurable per machine through the balancing configuration, so that pricing can be tuned independently of upgrade effects.

#### Acceptance Criteria

1. THE GameManager SHALL calculate upgrade costs using a configurable base price per Machine.
2. THE GameManager SHALL support the existing cost formula (`basePrice * 2^currentLevel`) using the configured base price from the MachineValueConfig or a dedicated cost configuration.
3. WHEN the current Upgrade_Level is 0, THE GameManager SHALL return the base price as the cost for the next upgrade.
4. WHEN the current Upgrade_Level is 10, THE GameManager SHALL not offer a cost because the upgrade is at maximum level.

### Requirement 9: Upgrade Purchase Logic

**User Story:** As a player, I want to purchase upgrades using my earned budget, so that I can improve my machines during gameplay.

#### Acceptance Criteria

1. WHEN a purchase is attempted and the player's budget is less than the upgrade cost, THE GameManager SHALL reject the purchase and return a failure indicator without modifying budget or Upgrade_Level.
2. WHEN a purchase is attempted and the player's budget is sufficient and the Upgrade_Level is below 10, THE GameManager SHALL deduct the cost from the budget and increment the Upgrade_Level by 1.
3. THE GameManager SHALL provide a method to query the cost of the next upgrade for a given Machine and UpgradeType without performing a purchase.
4. THE GameManager SHALL provide a method to query whether a given upgrade is purchasable (budget sufficient and level below maximum).

### Requirement 10: Consistent Upgrade Support Across All Machines

**User Story:** As a player, I want every machine to support all four upgrade categories, so that upgrade behavior is consistent regardless of which machine I upgrade.

#### Acceptance Criteria

1. THE Upgrade_System SHALL track separate Upgrade_Levels for capacity, quality, speed, and automation on each of the three Machines (machine1, machine2, machine3).
2. THE GameManager SHALL apply all four upgrade categories when updating a MachineState, using the corresponding Lookup_Tables.
3. WHEN a new Machine is added to the game, THE Upgrade_System SHALL require the same four UpgradeType entries with Upgrade_Level initialized to 0.

### Requirement 11: Removal of Increment-Based Upgrade Calculations

**User Story:** As a developer, I want the old increment-based upgrade formulas removed, so that the codebase has a single consistent upgrade calculation path using lookup tables.

#### Acceptance Criteria

1. THE Upgrade_System SHALL remove the `capacityIncrement`, `qualityIncrement`, `sequenceLengthIncrement`, `automationIncrement`, `automationBaseTimingMs`, and `automationSpeedReductionMs` fields from the UpgradeConfigData interface and UPGRADE_CONFIG constant.
2. THE GameManager SHALL remove all arithmetic expressions that derive upgrade values from increments and base defaults (e.g., `MACHINE_DEFAULTS.capacity + levels.capacity * UPGRADE_CONFIG.capacityIncrement`).
3. THE GameManager SHALL replace all removed arithmetic expressions with Lookup_Table index operations.
4. THE Upgrade_System SHALL retain the `maxLevel` field set to 10 and the `basePrices` record for upgrade cost calculation.
