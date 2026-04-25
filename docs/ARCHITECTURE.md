# Architecture

## Goal
Keep the code simple, readable, and easy to change during the jam.

## Main Parts

### Scenes
- `Preload`
- `Start`
- `Game`
- `GameOver`

### Core Systems
- `InputSystem`
- `ConveyorSystem`
- `ItemSystem`
- `MachineSystem`
- `GameManager` (economy, upgrades, difficulty)
- `AutomationSystem`
- `FeedbackManager`
- `AudioManager`

### Main Objects
Game entities are represented as lightweight interfaces and state objects
rather than dedicated classes:
- Player — sprite managed by `GameScene`, position tracked by `InputSystem`
- Machine — `MachineState` interface in `MachineConfig`, managed by `MachineSystem`
- Item — `ConveyorItem` interface in `ConveyorSystem`, managed by `ItemSystem`
- UpgradeTerminal — `TerminalUI` overlay, upgrade logic in `GameManager`

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
  ui/
  data/
  rendering/
  utils/
  types/
  tests/
docs/
public/
  assets/
```