# Requirements Document

## Introduction

The current spawn system ramps difficulty from second zero with no breathing room, making the opening seconds feel as pressured as mid-game. This feature introduces an early-game warm-up phase that reduces the initial spawn rate to roughly one third of the current rate for the first 15 seconds, then smoothly transitions back to the existing difficulty curve by 45 seconds of game time. After 45 seconds the spawn behaviour is identical to the current system. The goal is a gentler entry ramp that lets new players orient themselves before pressure builds.

## Glossary

- **Spawn_System**: The subsystem of GameManager and ItemSystem responsible for determining when new items appear on the conveyor inlet. Currently driven by `getSpawnIntervalMs()` and `getNextSpawnDelayMs()`.
- **Warm-Up_Phase**: The period from 0 to 15 elapsed game-time seconds during which the spawn rate is reduced.
- **Transition_Phase**: The period from 15 to 45 elapsed game-time seconds during which the spawn rate gradually increases from the warm-up rate back to the value the existing difficulty curve produces.
- **Warm-Up_Multiplier**: A scaling factor applied to the base spawn interval. A value of 3.0 means the interval is three times longer (one third the spawn rate). A value of 1.0 means no modification.
- **Base_Spawn_Interval**: The spawn interval produced by the existing difficulty curve (`getSpawnIntervalMs()`) before the warm-up multiplier is applied.
- **GameBalanceConfig**: The static configuration object (`src/data/GameBalanceConfig.ts`) that holds all tuning constants for difficulty progression.

## Requirements

### Requirement 1: Warm-Up Phase Spawn Rate Reduction

**User Story:** As a player, I want fewer items during the first 15 seconds of a run, so that I can learn the controls and orient myself before the factory gets busy.

#### Acceptance Criteria

1. WHILE the elapsed game time is between 0 and 15 seconds (inclusive), THE Spawn_System SHALL apply a Warm-Up_Multiplier of 3.0 to the Base_Spawn_Interval, producing an effective interval three times longer than the current curve.
2. WHEN the elapsed game time is exactly 0 seconds, THE Spawn_System SHALL produce a spawn interval equal to the Base_Spawn_Interval multiplied by 3.0.
3. WHILE the elapsed game time is between 0 and 15 seconds, THE Spawn_System SHALL keep the Warm-Up_Multiplier constant at 3.0 (no gradual change within this phase).

### Requirement 2: Transition Phase Gradual Ramp

**User Story:** As a player, I want the spawn rate to increase smoothly after the warm-up, so that difficulty feels natural rather than jumping abruptly.

#### Acceptance Criteria

1. WHILE the elapsed game time is between 15 and 45 seconds, THE Spawn_System SHALL linearly interpolate the Warm-Up_Multiplier from 3.0 down to 1.0.
2. WHEN the elapsed game time reaches 15 seconds, THE Spawn_System SHALL begin the interpolation with a Warm-Up_Multiplier of 3.0.
3. WHEN the elapsed game time reaches 45 seconds, THE Spawn_System SHALL set the Warm-Up_Multiplier to exactly 1.0.
4. THE Spawn_System SHALL compute the Warm-Up_Multiplier during the Transition_Phase as: `3.0 - 2.0 × ((elapsedSeconds - 15) / (45 - 15))`.

### Requirement 3: Post-Warm-Up Unchanged Behaviour

**User Story:** As a player, I want the mid-game and late-game difficulty to remain exactly as it is today, so that the core challenge is preserved.

#### Acceptance Criteria

1. WHILE the elapsed game time is 45 seconds or greater, THE Spawn_System SHALL apply a Warm-Up_Multiplier of 1.0, leaving the Base_Spawn_Interval unmodified.
2. WHILE the elapsed game time is 45 seconds or greater, THE Spawn_System SHALL produce spawn intervals identical to the current system (no behavioural change).

### Requirement 4: Warm-Up Configuration

**User Story:** As a developer, I want the warm-up parameters stored in GameBalanceConfig, so that they can be tuned without code changes.

#### Acceptance Criteria

1. THE GameBalanceConfig SHALL include a `warmUp` section containing: `warmUpEndSeconds` (default 15), `transitionEndSeconds` (default 45), and `spawnIntervalMultiplier` (default 3.0).
2. THE Spawn_System SHALL read warm-up timing and multiplier values exclusively from the GameBalanceConfig `warmUp` section.
3. WHEN the `warmUp` section is absent or all values equal their defaults, THE Spawn_System SHALL behave as specified in Requirements 1–3.

### Requirement 5: Warm-Up Multiplier Integration with Jitter

**User Story:** As a developer, I want the warm-up multiplier applied before jitter randomisation, so that the random spread scales proportionally with the longer intervals.

#### Acceptance Criteria

1. THE Spawn_System SHALL apply the Warm-Up_Multiplier to the Base_Spawn_Interval before applying the random jitter factors (`randomMinFactor` / `randomMaxFactor`).
2. FOR ALL elapsed game times, THE Spawn_System SHALL preserve the existing jitter range ratio regardless of the Warm-Up_Multiplier value.

### Requirement 6: Warm-Up Resets on New Run

**User Story:** As a player, I want the warm-up to restart from the beginning each time I start a new run, so that every run has the same gentle opening.

#### Acceptance Criteria

1. WHEN a new run is started, THE Spawn_System SHALL reset the warm-up state so that the Warm-Up_Multiplier begins at 3.0.
2. WHEN a new run is started, THE Spawn_System SHALL treat elapsed game time as 0 for warm-up calculations.

### Requirement 7: Belt Speed Unchanged During Warm-Up

**User Story:** As a player, I want the belt speed to remain on its current curve during the warm-up, so that items already on the belt move at the expected pace.

#### Acceptance Criteria

1. WHILE the elapsed game time is between 0 and 45 seconds, THE Spawn_System SHALL modify only the spawn interval and SHALL NOT alter the belt speed factor calculation.
2. THE GameManager SHALL continue to compute `getBeltSpeedFactor()` using the existing curve without any warm-up adjustment.
