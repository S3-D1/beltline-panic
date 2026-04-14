# Architecture

## Goal
Keep the code simple, readable, and easy to change during the jam.

## Main Parts

### Scenes
- `Boot`
- `Preload`
- `Game`
- `GameOver`

### Core Systems
- `InputSystem`
- `ConveyorSystem`
- `ItemSystem`
- `MachineSystem`
- `UpgradeSystem`
- `EconomySystem`
- `DifficultySystem`

### Main Objects
- `Player`
- `Machine`
- `Item`
- `UpgradeTerminal`

## Input States
- `Navigation`
- `MachineInteraction`
- `UpgradeTerminal`
- `GameOver`

Directional inputs mean different things depending on the active state.

## Data
Static game data should be stored in simple config objects:
- machine values
- upgrade costs
- item values
- scaling values

## Rendering
- 2D only
- angled perspective is visual only
- no real isometric logic
- no physics-based conveyor simulation

## Repo Structure

```text
src/
  scenes/
  systems/
  objects/
  ui/
  data/
  utils/
docs/