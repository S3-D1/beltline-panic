# Requirements Document

## Introduction

This feature replaces the current fixed-interval item spawning system with a dynamic, irregular delivery model controlled centrally by the GameManager. Today, items spawn at a perfectly even `SPAWN_INTERVAL` (3000 ms) and the conveyor moves at a hardcoded `CONVEYOR_SPEED` (60 px/s). Both values are static constants in `ConveyorConfig.ts` and never change during a run.

The new system introduces:
- **Variable spawn timing** — items arrive at irregular intervals around a configurable average, creating organic delivery pressure instead of a metronome.
- **Centralized runtime control** — GameManager owns the current delivery frequency and belt speed, replacing the static constants that systems read today.
- **Time-based progression** — both delivery frequency and belt speed increase as playtime grows, using a simple, tunable scaling model that requires no code changes to rebalance.

The feature must integrate cleanly with the existing inlet, safe-release, collision, machine, and outlet logic.

## Glossary

- **GameManager**: The central system (`src/systems/GameManager.ts`) that owns score, budget, upgrades, and — after this feature — delivery configuration and belt speed configuration.
- **ItemSystem**: The system (`src/systems/ItemSystem.ts`) responsible for spawning items, advancing them via the ConveyorSystem, and detecting collisions and exits.
- **ConveyorSystem**: The system (`src/systems/ConveyorSystem.ts`) that moves items along the inlet, loop, and outlet paths at a given speed.
- **DeliveryConfig**: A runtime-mutable configuration object held by GameManager that describes the current average spawn interval, jitter range, and belt speed.
- **Spawn_Jitter**: A bounded random offset applied to each spawn interval to produce irregular delivery timing. Defined as a fraction (0–1) of the current average interval.
- **Progression_Curve**: A simple mathematical model (e.g., linear or piecewise-linear) that maps elapsed game time to delivery frequency and belt speed multipliers.
- **Safe_Release**: The existing spacing check (`SafeReleaseSystem.ts`) that prevents items from entering the belt when minimum clearance is not met.
- **Elapsed_Game_Time**: The cumulative non-paused play time in milliseconds since the run started, tracked by GameManager.

## Requirements

### Requirement 1: Irregular Spawn Timing

**User Story:** As a player, I want items to arrive at irregular intervals, so that the game feels organic and unpredictable rather than metronomic.

#### Acceptance Criteria

1. WHEN an item spawn is due, THE ItemSystem SHALL compute the next spawn delay as the current average interval plus a random jitter offset bounded by the configured Spawn_Jitter fraction.
2. THE ItemSystem SHALL produce spawn intervals that vary visibly from one spawn to the next within a single run.
3. WHILE Spawn_Jitter is set to 0, THE ItemSystem SHALL produce perfectly even spawn intervals equal to the configured average interval.
4. THE ItemSystem SHALL use a seedable or deterministic-friendly random source for jitter computation so that runs are reproducible when given the same seed.
5. WHEN a jittered spawn delay is computed, THE ItemSystem SHALL clamp the result to a minimum of 200 ms to prevent degenerate rapid-fire spawning.

### Requirement 2: GameManager Owns Delivery Configuration

**User Story:** As a developer, I want the GameManager to be the single source of truth for delivery frequency and belt speed, so that all systems read consistent, centrally managed values.

#### Acceptance Criteria

1. THE GameManager SHALL expose a method that returns the current average spawn interval in milliseconds.
2. THE GameManager SHALL expose a method that returns the current Spawn_Jitter fraction (0–1).
3. THE GameManager SHALL expose a method that returns the current belt speed in pixels per second.
4. WHEN the ItemSystem needs the next spawn delay, THE ItemSystem SHALL read the average interval and jitter values from GameManager rather than from static constants.
5. WHEN the ConveyorSystem advances items, THE ConveyorSystem SHALL read the current belt speed from GameManager rather than from the static CONVEYOR_SPEED constant.
6. THE GameManager SHALL initialize delivery configuration from a static default config object defined in the data layer.

### Requirement 3: Time-Based Progression

**User Story:** As a player, I want the game to get harder over time through faster delivery and belt speed, so that each run builds pressure and tests my limits.

#### Acceptance Criteria

1. THE GameManager SHALL track Elapsed_Game_Time in milliseconds, incremented each frame by the frame delta.
2. WHEN Elapsed_Game_Time increases, THE GameManager SHALL recalculate the current average spawn interval using the Progression_Curve, decreasing the interval over time to increase delivery pressure.
3. WHEN Elapsed_Game_Time increases, THE GameManager SHALL recalculate the current belt speed using the Progression_Curve, increasing the speed over time.
4. THE Progression_Curve SHALL be defined as a simple, explicit model (linear interpolation or piecewise-linear) with configurable parameters stored in the data layer.
5. THE GameManager SHALL enforce a minimum average spawn interval floor so that delivery pressure cannot exceed a survivable maximum.
6. THE GameManager SHALL enforce a maximum belt speed ceiling so that conveyor speed cannot exceed a playable maximum.

### Requirement 4: Configurable Progression Parameters

**User Story:** As a developer, I want all progression parameters stored in a single config object, so that I can tune difficulty without modifying code.

#### Acceptance Criteria

1. THE data layer SHALL define a DeliveryConfig object containing: initial average spawn interval, initial belt speed, initial Spawn_Jitter fraction, minimum spawn interval floor, maximum belt speed ceiling, and Progression_Curve parameters.
2. THE DeliveryConfig object SHALL be a plain TypeScript object in `src/data/` that can be edited without changing system logic.
3. WHEN the GameManager is constructed, THE GameManager SHALL read initial values from the DeliveryConfig object.
4. THE Progression_Curve parameters SHALL include at minimum: a time-to-multiplier mapping for spawn interval and a time-to-multiplier mapping for belt speed.

### Requirement 5: ConveyorSystem Dynamic Speed

**User Story:** As a developer, I want the ConveyorSystem to accept its speed at runtime, so that belt speed can change during a run without code changes.

#### Acceptance Criteria

1. WHEN the ConveyorSystem update method is called, THE ConveyorSystem SHALL use the belt speed value provided by the caller rather than the static CONVEYOR_SPEED constant.
2. THE ConveyorSystem SHALL continue to move items along inlet, loop, and outlet paths using the same path-based movement logic as today.
3. WHEN belt speed changes between frames, THE ConveyorSystem SHALL apply the new speed starting from the next frame without retroactive adjustment.

### Requirement 6: Integration with Existing Systems

**User Story:** As a developer, I want the dynamic delivery model to work with the existing inlet gating, safe-release, collision detection, and outlet logic, so that no existing gameplay behavior breaks.

#### Acceptance Criteria

1. WHEN an item is spawned with irregular timing, THE ItemSystem SHALL still perform the inlet overflow check before placing the item, triggering a collision (game over) if the inlet is full.
2. WHILE an item is held at the inlet-to-belt junction by Safe_Release, THE ItemSystem SHALL continue to enforce minimum spacing between queued inlet items.
3. WHEN items exit the belt via the outlet, THE ItemSystem SHALL continue to award payout values through GameManager as before.
4. WHEN a collision is detected between any two non-inlet-pair items, THE ItemSystem SHALL still trigger game over.
5. THE dynamic delivery system SHALL not alter the behavior of MachineSystem, AutomationSystem, or SequenceInputUI.

### Requirement 7: Determinism and Debuggability

**User Story:** As a developer, I want the spawn timing system to be deterministic given the same configuration and seed, so that I can reproduce and debug specific runs.

#### Acceptance Criteria

1. THE ItemSystem SHALL accept an optional random seed for jitter computation.
2. WHEN the same seed and DeliveryConfig are used, THE ItemSystem SHALL produce identical spawn timing sequences across runs.
3. THE GameManager SHALL expose the current Elapsed_Game_Time, current average spawn interval, and current belt speed for debug inspection.
