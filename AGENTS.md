# AGENTS.md

## Project Overview
Beltline Panic is a solo-developed jam game built with Phaser 3 for Gamedev.js Jam 2026.
Prioritize speed, stability, readability, and shippable scope over architectural ambition.

## Source of Truth
Use these documents as the authoritative references:
- `docs/GDD.md` for gameplay, progression, and MVP scope
- `docs/CONTROLS.md` for input behavior
- `docs/ARCHITECTURE.md` for code structure and systems
- `docs/TECH_STACK.md` for technical constraints
- `docs/GITHUB_USAGE.md` for workflow, CI/CD, and release process

## Engineering Rules
- Use Phaser 3, TypeScript, Vite, and browser-first delivery
- Keep the game 2D only
- Treat the angled perspective as visual only
- Do not introduce real isometric systems
- Do not use physics-based conveyor logic unless explicitly required
- Prefer simple, explicit, state-driven systems
- Avoid unnecessary abstractions and avoid adding dependencies without a strong reason

## Project Structure
- `src/scenes` for Phaser scenes
- `src/systems` for gameplay systems
- `src/objects` for game entities
- `src/ui` for HUD and overlays
- `src/data` for static config
- `src/utils` for helpers

## Gameplay Constraints
- Preserve the 5-input control concept
- Keep movement, machine interaction, and upgrade interaction state-driven
- Protect MVP scope
- Do not expand feature scope unless explicitly requested

## Workflow Rules
- Prefer small, focused changes
- Do not refactor unrelated code
- Keep changes compatible with CI, preview deployments, and production deployment from `main`
- Assume feature-branch + pull request workflow
- Prefer one task per pull request
- Prefer small, meaningful commits that map to implementation subtasks
- Keep commits focused and easy to review

## Delivery Mindset
This is a jam project. Prefer the simplest solution that keeps the game readable, stable, and shippable.