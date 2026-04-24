# Requirements Document

## Introduction

This feature adds a complete endgame loop to Beltline Panic: when the conveyor jams and the run ends, the player enters a name, the score is saved to a persistent local leaderboard, the top 10 scores are displayed, and the player can restart for another run. The current game over state in GameScene (a boolean flag and static text) is replaced by a dedicated GameOver scene that owns the name input, score storage, scoreboard display, and restart flow.

## Glossary

- **GameOver_Scene**: The Phaser scene that activates when a run ends. It owns the name input, score persistence, scoreboard display, and restart trigger.
- **Name_Input**: The text input component within GameOver_Scene that captures the player's name before saving a score.
- **Score_Storage**: The subsystem responsible for reading, writing, validating, and maintaining the leaderboard data in browser localStorage.
- **Scoreboard_Display**: The visual component within GameOver_Scene that renders the ranked list of saved scores.
- **Score_Entry**: A single record in the leaderboard containing a name, score value, and timestamp.
- **GameScene**: The main gameplay scene that runs the factory loop and detects the game-over condition.
- **Restart_Action**: The player action that exits GameOver_Scene and starts a fresh run in GameScene.

## Requirements

### Requirement 1: Game Over Transition

**User Story:** As a player, I want gameplay to stop completely when the conveyor jams, so that I can clearly see my final result and move to the score submission flow.

#### Acceptance Criteria

1. WHEN a conveyor collision is detected, THE GameScene SHALL stop all gameplay updates and transition to GameOver_Scene, passing the final score as scene data.
2. WHEN GameOver_Scene starts, THE GameOver_Scene SHALL display the final score from the completed run.
3. WHEN GameOver_Scene starts, THE GameOver_Scene SHALL display the Name_Input component for the player to enter a name.

### Requirement 2: Name Input

**User Story:** As a player, I want to enter my name after a run ends, so that my score is saved with my identity on the leaderboard.

#### Acceptance Criteria

1. WHEN GameOver_Scene displays the Name_Input, THE Name_Input SHALL accept only letters (a-z, A-Z), digits (0-9), underscores (_), and hyphens (-).
2. THE Name_Input SHALL enforce a maximum length of 12 characters.
3. WHEN the player presses Enter with a non-empty name, THE Name_Input SHALL confirm the entry and pass the name to Score_Storage for saving.
4. WHEN the player presses Enter with an empty name, THE Name_Input SHALL reject the submission and keep the Name_Input active.
5. IF the player types a character that is not in the allowed set, THEN THE Name_Input SHALL ignore that character input.

### Requirement 3: Score Persistence

**User Story:** As a player, I want my scores saved between sessions, so that I can track my progress over multiple runs.

#### Acceptance Criteria

1. WHEN a name is confirmed, THE Score_Storage SHALL create a Score_Entry containing the confirmed name, the final score, and the current timestamp, and persist it to browser localStorage.
2. THE Score_Storage SHALL store a maximum of 10 Score_Entry records, sorted in descending order by score value.
3. WHEN a new Score_Entry is added and the total exceeds 10, THE Score_Storage SHALL remove the lowest-scoring entry.
4. WHEN Score_Storage reads data from localStorage, THE Score_Storage SHALL validate that each entry contains a string name, a numeric score, and a numeric timestamp.
5. IF localStorage data fails validation, THEN THE Score_Storage SHALL discard all stored data and initialize an empty leaderboard.
6. FOR ALL valid Score_Entry objects, serializing to JSON then parsing back SHALL produce an equivalent Score_Entry object (round-trip property).

### Requirement 4: Scoreboard Display

**User Story:** As a player, I want to see the top 10 scores after submitting my name, so that I can compare my performance to previous runs.

#### Acceptance Criteria

1. WHEN a score has been saved, THE Scoreboard_Display SHALL show up to 10 Score_Entry records in descending score order.
2. THE Scoreboard_Display SHALL show the rank, name, and score for each entry.
3. WHEN the scoreboard is displayed, THE Scoreboard_Display SHALL visually highlight the Score_Entry that was just saved in the current session.
4. WHEN no Score_Entry records exist, THE Scoreboard_Display SHALL show an empty-state message indicating no scores are recorded.

### Requirement 5: Restart Flow

**User Story:** As a player, I want to quickly restart from the scoreboard, so that I can jump into another run without navigating menus.

#### Acceptance Criteria

1. WHEN the Scoreboard_Display is visible and the player presses Enter, THE GameOver_Scene SHALL start a new run by transitioning to GameScene.
2. WHEN the Scoreboard_Display is visible and the player activates the restart button, THE GameOver_Scene SHALL start a new run by transitioning to GameScene.
3. WHEN a new run starts from GameOver_Scene, THE GameScene SHALL reset score, elapsed time, upgrade levels, conveyor state, item state, machine state, automation state, and player position to initial values.

### Requirement 6: Score Storage Data Integrity

**User Story:** As a developer, I want the score storage logic to be robust and testable, so that leaderboard data stays consistent across sessions.

#### Acceptance Criteria

1. THE Score_Storage SHALL maintain entries in descending score order after any insertion.
2. THE Score_Storage SHALL enforce that the stored entry count is at most 10 after any insertion.
3. WHEN two Score_Entry records have equal scores, THE Score_Storage SHALL rank the entry with the earlier timestamp higher.
4. FOR ALL sequences of valid insertions, THE Score_Storage SHALL produce a list that is sorted in descending score order and contains at most 10 entries (invariant property).
