---
inclusion: always
---

# Project Structure

## Repository layout
- `src/scenes` for Phaser scenes
- `src/systems` for gameplay systems
- `src/objects` for game entities and interactables
- `src/ui` for HUD and overlays
- `src/data` for static gameplay config
- `src/utils` for helpers
- `docs` for project documentation
- `.github/workflows` for CI/CD

## Scene expectations
Use a small scene model:
- Boot
- Preload
- Game
- GameOver

Do not fragment the game flow into too many scenes unless there is a clear benefit.

## Gameplay architecture
Use simple, explicit systems such as:
- InputSystem
- ConveyorSystem
- ItemSystem
- MachineSystem
- UpgradeSystem
- EconomySystem
- DifficultySystem

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