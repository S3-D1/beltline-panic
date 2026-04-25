---
inclusion: always
---

# Project Structure

## Repository layout
- `src/scenes` for Phaser scenes
- `src/systems` for gameplay systems
- `src/ui` for HUD and overlays
- `src/data` for static gameplay config
- `src/rendering` for drawing helpers and palette
- `src/utils` for helpers
- `src/types` for type declarations
- `src/tests` for unit and property tests
- `docs` for project documentation
- `.github/workflows` for CI/CD

## Scene expectations
Use a small scene model:
- Preload
- Start
- Game
- GameOver

Do not fragment the game flow into too many scenes unless there is a clear benefit.

## Gameplay architecture
Use simple, explicit systems such as:
- InputSystem
- ConveyorSystem
- ItemSystem
- MachineSystem
- GameManager (economy, upgrades, difficulty)
- AutomationSystem
- FeedbackManager
- AudioManager

## Input model
The game has five actions:
- left
- right
- up
- down
- interact

Inputs are state-sensitive. Directional inputs mean different things in:
- navigation
- machine interaction
- upgrade terminal
- game over / restart

## File conventions
- Keep filenames descriptive and stable
- Prefer one clear responsibility per file
- Keep feature logic close to the owning system or scene
- Avoid deep nesting unless it improves clarity

## When generating code
Match the existing folder structure and naming patterns.
Do not introduce alternate architectures without a strong reason.