---
inclusion: always
---

# Technology Stack

## Core stack
- Phaser 3
- TypeScript
- Vite
- npm
- HTML5 browser build

## Platform targets
- Primary: desktop browser
- Delivery: itch.io HTML5
- Preview hosting: GitHub Pages
- Optional later target: YouTube Playables compatibility

## Technical rules
- Use 2D rendering only
- The angled perspective is visual only
- Do not introduce real isometric logic
- Do not use physics for conveyor movement unless absolutely necessary
- Prefer deterministic, path-based movement and simple state-driven gameplay systems
- Keep dependencies minimal

## Code style
- Prefer readable, direct gameplay code
- Avoid premature abstractions
- Avoid unnecessary framework layering
- Keep configs data-driven where useful
- Prefer composition over inheritance

## Performance priorities
- Low allocation during gameplay
- Simple update loops
- Lightweight UI
- Avoid overcomplicated effects that threaten stable browser performance

## Build priorities
- Fast local startup
- Reliable production build
- Easy static deployment