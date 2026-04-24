# Implementation Plan: Endgame Scoreboard Loop

## Overview

Replace the inline game-over state in GameScene with a dedicated GameOverScene that owns the full endgame flow: final score display, name input, score persistence to localStorage, top-10 scoreboard display, and restart. A pure ScoreStorage utility handles all leaderboard logic independently of Phaser. The restart flow uses the same any-key/tap pattern as StartScene.

## Tasks

- [x] 1. Implement ScoreStorage utility and validation helpers
  - [x] 1.1 Create `src/utils/ScoreStorage.ts` with `ScoreEntry` interface, `isValidName`, `isAllowedChar` helpers, and `ScoreStorage` class
    - Export `ScoreEntry` interface with `name: string`, `score: number`, `timestamp: number`
    - Export `isValidName(name)` — returns true for 1–12 chars matching `[a-zA-Z0-9_-]`
    - Export `isAllowedChar(char)` — returns true for single char matching `[a-zA-Z0-9_-]`
    - Implement `ScoreStorage` class with injectable `Storage` (defaults to `window.localStorage`), configurable `storageKey` (default `'beltline_scores'`), and `maxEntries` (default `10`)
    - `saveScore(name, score)` — creates entry with `Date.now()` timestamp, inserts into sorted list, trims to maxEntries, persists, returns full list
    - `getScores()` — reads from storage, validates each entry has string name / numeric score / numeric timestamp, returns empty array on any failure
    - `clearScores()` — removes the storage key
    - Sorting: descending by score, ascending by timestamp for ties
    - Wrap `storage.setItem` in try/catch, log `console.warn` on failure
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.2 Write unit tests for ScoreStorage in `src/tests/scoreStorage.test.ts`
    - Test `isAllowedChar` with allowed and disallowed characters
    - Test `isValidName` with empty, valid, too-long, and invalid-char strings
    - Test `saveScore` stores an entry and returns sorted list
    - Test `getScores` returns empty array for empty/corrupted/invalid storage
    - Test 11 insertions produce exactly 10 entries
    - Test tie-breaking: same score, earlier timestamp ranks higher
    - Test `clearScores` empties the leaderboard
    - Test `saveScore` with quota-exceeded storage logs warning but doesn't throw
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3_

  - [ ]* 1.3 Write property test: Name validation correctness (`src/tests/scoreStorage.property.test.ts`)
    - **Property 1: Name validation correctness**
    - For any single char, `isAllowedChar` returns true iff char matches `[a-zA-Z0-9_-]`
    - For any string, `isValidName` returns true iff length 1–12 and all chars match `[a-zA-Z0-9_-]`
    - Use `fc.char16bits()` for character testing, `fc.string()` for name testing
    - **Validates: Requirements 2.1, 2.2, 2.5**

  - [ ]* 1.4 Write property test: Save produces a complete entry (`src/tests/scoreStorage.property.test.ts`)
    - **Property 2: Save produces a complete entry**
    - For any valid name and non-negative integer score, `saveScore` returns a list containing an entry with matching name, score, and a positive timestamp
    - Use valid name arbitrary and `fc.nat()` for scores
    - **Validates: Requirements 3.1**

  - [ ]* 1.5 Write property test: Insertion invariant — sorted and capped (`src/tests/scoreStorage.property.test.ts`)
    - **Property 3: Insertion invariant — sorted and capped**
    - For any sequence of 1–30 valid `(name, score)` insertions, the stored list is sorted descending by score and contains at most 10 entries
    - **Validates: Requirements 3.2, 3.3, 6.1, 6.2, 6.4**

  - [ ]* 1.6 Write property test: Tie-breaking by timestamp (`src/tests/scoreStorage.property.test.ts`)
    - **Property 4: Tie-breaking by timestamp**
    - For any two entries with equal scores but different timestamps, the earlier timestamp appears at a lower index
    - **Validates: Requirements 6.3**

  - [ ]* 1.7 Write property test: Validation rejects malformed data (`src/tests/scoreStorage.property.test.ts`)
    - **Property 5: Validation rejects malformed data**
    - For any JSON string that is not a valid array of `{string name, number score, number timestamp}`, `getScores()` returns empty array
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 1.8 Write property test: ScoreEntry JSON round-trip (`src/tests/scoreStorage.property.test.ts`)
    - **Property 6: ScoreEntry JSON round-trip**
    - For any valid ScoreEntry, `JSON.parse(JSON.stringify(entry))` produces a deeply equal object
    - **Validates: Requirements 3.6**

- [x] 2. Checkpoint — Verify ScoreStorage
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement GameOverScene
  - [x] 3.1 Create `src/scenes/GameOverScene.ts` with two-phase UI flow
    - Register scene with key `'GameOverScene'`
    - `init(data)` — extract `score` from scene data, default to `0` if missing or non-numeric
    - Create `LayoutSystem` instance and handle resize events
    - Instantiate `ScoreStorage` in constructor
    - Track `phase: 'nameInput' | 'scoreboard'`, `currentName`, `savedTimestamp`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Implement Name Input phase in GameOverScene
    - Display "GAME OVER" title, final score, "Enter your name:" prompt, and current name text
    - Use `PALETTE.TEXT_PRIMARY` and `PALETTE.TEXT_ACCENT` for styling, monospace font
    - Listen to `this.input.keyboard!.on('keydown', handler)` for character-by-character input
    - Accept only chars matching `/^[a-zA-Z0-9_-]$/` via `isAllowedChar`, ignore others
    - Enforce max 12 characters, Backspace removes last char
    - Enter with non-empty name → call `confirmName()` which saves via `scoreStorage.saveScore` and transitions to scoreboard phase
    - Enter with empty name → ignored
    - Use LayoutSystem for all positioning and font scaling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Implement Scoreboard Display phase in GameOverScene
    - Clear name input UI elements, remove keyboard listener
    - Call `scoreStorage.getScores()` and render rank, name, score for each entry
    - Highlight the just-saved entry (matched by `savedTimestamp`) with `PALETTE.TEXT_ACCENT`
    - Show "No scores recorded yet" if list is empty
    - Show "Press any key or tap to restart" prompt
    - Use LayoutSystem for all positioning and font scaling
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.4 Implement restart listeners in GameOverScene
    - In scoreboard phase, set up `this.input.keyboard!.once('keydown', ...)` and `this.input.once('pointerdown', ...)` — same pattern as StartScene
    - `startNewRun()` calls `this.scene.start('GameScene')` for a clean restart
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Modify GameScene for scene transition
  - [x] 4.1 Update `enterGameOver` in `src/scenes/GameScene.ts` to transition to GameOverScene
    - Keep `gameOver = true` and `collidedItems` assignment for the collision blink effect
    - Add `this.time.delayedCall(500, () => { this.scene.start('GameOverScene', { score: this.gameManager.getScore() }); })`
    - Remove `this.gameOverText.setVisible(true)` and `this.scoreText.setColor('#ff0000')` since GameOverScene handles display
    - Remove the `gameOverText` creation from `create()` and its resize handler
    - _Requirements: 1.1, 1.2, 5.3_

- [x] 5. Register GameOverScene and wire up scene flow
  - [x] 5.1 Add GameOverScene import and registration in `src/main.ts`
    - Import `GameOverScene` from `'./scenes/GameOverScene'`
    - Add `GameOverScene` to the `scene` array: `[StartScene, GameScene, GameOverScene]`
    - _Requirements: 1.1_

- [x] 6. Checkpoint — Verify full endgame loop
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- ScoreStorage is implemented first since it's a pure utility with no Phaser dependency, making it easy to test in isolation
- GameOverScene uses the same LayoutSystem and PALETTE patterns as existing scenes
- No explicit GameManager reset is needed — `scene.start('GameScene')` triggers `create()` which rebuilds everything fresh
