# GDD

## Game
**Beltline Panic** is a fast-paced factory survival game built for **Gamedev.js Jam 2026**.  
Theme: **Machines**

## Core Loop
- Items move along a looping conveyor belt
- The player moves from the center to machines or the upgrade terminal
- Machine 1 is required for every item
- Machine 2 and Machine 3 are optional and increase value
- Processed items that survive the full loop generate money
- Money is used for upgrades and automation
- Throughput increases over time
- Backlog ends the run

## Player Actions
- Move: left / right / up / down
- Interact

## Machine Interaction
At a machine, the player presses **Interact** and enters a requested sequence of directional inputs to process an item.

## Upgrade Terminal
At the terminal, the player uses directional inputs to:
1. choose what to upgrade
2. choose how to upgrade it

## Goal
Survive as long as possible and earn as much money as possible.

## Lose Condition
The run ends when the conveyor backs up and the factory jams.

## Progression
Difficulty increases through:
- faster belt speed
- more items
- greater need for efficient processing and upgrades

## MVP
- 1 looping conveyor
- 1 player
- 3 machines
- item states
- money
- upgrades
- backlog lose condition