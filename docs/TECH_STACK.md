# Tech Stack

## Goal

The stack for **Beltline Panic** is optimized for one thing: shipping a stable browser game fast during a game jam.

This is a **solo jam project**, so the setup must favor:
- low risk
- fast iteration
- easy deployment
- simple debugging
- easy scope cuts

---

## Core Stack

- **Phaser 3**
- **TypeScript**  
  fallback: JavaScript if setup friction becomes too high
- **Vite**
- **npm**
- **HTML5 / Web build**

---

## Why this stack

### Phaser 3
Good fit for:
- 2D gameplay
- keyboard input
- scene-based flow
- sprite rendering
- browser deployment

The game does not need 3D, physics-heavy systems, or a complex engine layer.

### TypeScript
Preferred for:
- safer refactors during the jam
- cleaner gameplay state handling
- fewer avoidable bugs

Use it pragmatically.  
Readable code is more important than abstraction.

### Vite
Used for:
- fast local startup
- hot reload
- simple production builds
- static output for deployment

---

## Project Constraints

Because this is a jam game, the stack must support:

- getting a playable prototype running early
- cutting features without breaking the build
- simple browser-first deployment
- minimal dependencies
- no backend

Avoid:
- custom engine work
- advanced rendering pipelines
- complex physics
- dependency-heavy UI frameworks
- anything that increases build/debug risk

---

## Rendering and Input Notes

- Rendering stays **2D**
- The angled factory view is **visual only**
- No real isometric or 3D logic
- Conveyor movement should be **path-based**, not physics-based
- Input handling should be **state-driven**, because the same buttons are reused for movement, machine inputs, and upgrade selection

---

## Deployment Targets

## YouTube Playables

The project should stay compatible with **standard web technologies and APIs**, which matches Phaser web builds. YouTube states that Playables support web-exported games and explicitly lists Phaser among engines used for Playables. :contentReference[oaicite:0]{index=0}

Important implications for the setup:
- keep the game browser-native
- avoid unusual platform dependencies
- keep memory usage under control
- design for short session startup and quick readability

YouTube’s Playables documentation also requires loading the Playables SDK before game code and signaling when the game is ready. It also sets a **512 MB peak JavaScript heap** limit. :contentReference[oaicite:1]{index=1}

### Practical rule
Do not build specifically for YouTube first.  
Build a clean web version first, then adapt for Playables if needed.

---

## GitHub Pages

GitHub Pages is a good target for:
- public web builds
- fast sharing
- testing
- portfolio visibility

GitHub supports publishing from a branch or through **GitHub Actions**, and its docs say GitHub Actions is the recommended approach for deployment automation. :contentReference[oaicite:2]{index=2}

### Recommended use
- `main` branch → production build
- `preview` branch or pull-request workflow → preview builds
- deploy static Vite output to GitHub Pages

### Preview Builds
For this project, preview builds should be treated as:
- quick internal test builds
- balancing checks
- shareable milestone links before the final jam upload

GitHub Actions environments can also be used to separate production and preview deployments. :contentReference[oaicite:3]{index=3}

---

## Itch.io Delivery / Deployment

Itch.io is the main delivery target for the jam build.

For HTML5 games, itch.io requires a ZIP upload and documents these limits:
- extracted project size up to **500 MB**
- no single extracted file over **200 MB**
- no more than **1,000 extracted files**
- filenames are case-sensitive and should be UTF-8 encoded :contentReference[oaicite:4]{index=4}

### Practical implications
- keep the build small
- avoid too many tiny files
- compress and combine assets where reasonable
- keep the exported build static and self-contained

### Delivery flow
1. build production files
2. verify browser build locally
3. zip the exported web build
4. upload to itch.io as HTML5 game
5. test directly on the itch.io page before submission

---

## Recommended Repo / Build Setup

```text
src/
docs/
public/
dist/
.github/workflows/