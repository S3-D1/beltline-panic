# Input & Control Concept

## Overview

The control concept of **Beltline Panic** is built around a very small and consistent input set:

- **Left**
- **Right**
- **Up**
- **Down**
- **Interact**

These five actions are used for **all major gameplay systems**:
movement, machine operation, and upgrade selection.

This keeps the game easy to learn, readable under pressure, and well suited for fast arcade gameplay.

---

## Core Principle

The player always starts from the **center of the factory layout**.

From there, directional inputs are used to move to one of several fixed stations:

- Machine 1
- Machine 2
- Machine 3
- Upgrade Terminal

Once the player reaches a station, pressing **Interact** activates it.

The same directional inputs are then reused in a different context depending on the active station.

---

## Movement

### Goal
Movement allows the player to quickly reposition between machines and the upgrade terminal.

### Behavior
- The player starts in the central hub position
- Pressing a direction moves the player toward the corresponding station
- Movement is intentionally simple and discrete
- The player is never navigating a large free-form level
- The factory layout is designed around fast, readable travel decisions

### Design Intention
Movement should feel immediate and tactical rather than exploratory.  
The challenge comes from choosing **where to go next** under pressure, not from pathfinding.

---

## Machine Interaction

### Activation
When the player reaches a machine and presses **Interact**, the game enters **machine interaction mode**.

In this state, the player no longer uses directional inputs for movement.  
Instead, directional inputs are interpreted as **machine operation commands**.

### Processing Mechanic
Each machine requests a short sequence of directional inputs.

Example:
- `Left, Up`
- `Down, Right, Up`
- `Left, Left, Down`

The player must enter the requested combination correctly to process the current item.

### Intended Feel
Operating a machine should feel like:
- quickly following a control sequence
- handling a mechanical process under pressure
- performing short, readable, high-tempo tasks

### Difficulty Scaling
Machine input sequences can scale over time by:
- increasing sequence length
- increasing input speed pressure
- requiring more frequent interactions due to higher throughput

### Constraints
To keep the interaction readable and satisfying:
- early-game sequences should remain short
- most sequences should stay within a low complexity range
- failure should cost time, not create overly harsh punishment

---

## Upgrade Terminal Interaction

### Activation
When the player reaches the upgrade terminal and presses **Interact**, the game enters **upgrade mode**.

In this mode, directional inputs are used to navigate upgrade choices.

### Interaction Structure
The upgrade terminal is designed as a two-step selection flow:

1. **Select what to improve**
   - e.g. Machine 1, Machine 2, Machine 3, Belt, Player

2. **Select how to improve it**
   - e.g. speed, value, automation, buffer, efficiency

Pressing **Interact** aborts the interaction.

### Design Intention
The upgrade terminal should:
- use the same input language as the rest of the game
- avoid complex menu navigation
- remain fast and readable during a high-pressure run

---

## Input Reuse Philosophy

A central design goal is that the same directional actions always remain meaningful.

- In **movement mode**, directions mean navigation
- In **machine mode**, directions mean operation inputs
- In **upgrade mode**, directions mean menu selection
- **Interact** toggles interaction / no interaction

This unified input language makes the game easier to learn and strengthens the feeling that the player is actively operating the factory.

---

## State-Based Input Interpretation

The meaning of the inputs depends on the current gameplay state.

### Idle / Hub State
- Directional inputs move the player toward a station
- Interact activates the currently selected or reached station

### Machine Interaction State
- Directional inputs are evaluated as required machine commands
- Interact may confirm, start, or exit depending on final implementation

### Upgrade State
- Directional inputs navigate upgrade choices
- Interact confirms selections and purchases

### Fail / End State
- Inputs are limited to restart or menu actions

---

## UX Requirements

To make the control concept clear during play, the game must always communicate the current context.

### Required Feedback
- Clear visual highlight of the active station
- Clear indication when the player is in machine mode
- Visible requested input sequence for machine processing
- Distinct UI presentation for upgrade mode
- Immediate feedback for correct and incorrect inputs

### Priority
Context switching must never be ambiguous.  
The player should always know whether directional inputs currently mean:
- movement
- machine operation
- upgrade navigation

---

## Benefits of the Control Concept

- Very small and learnable input set
- Strong consistency across all systems
- Good fit for fast arcade gameplay
- Strong thematic connection to machine operation
- Low implementation complexity for a jam project
- Well suited for keyboard controls in Phaser 3

---

## Risks and Design Notes

### Risk: Input ambiguity
If the current interaction state is unclear, the player may confuse movement with machine commands.

**Mitigation:**  
Use strong UI/state feedback and lock the player clearly into interaction mode.

### Risk: Overlong machine sequences
If sequences become too long, machine interaction may feel repetitive instead of tense.

**Mitigation:**  
Keep sequences short and readable, especially in the jam version.

### Risk: Upgrade navigation friction
Directional menu navigation can feel awkward if the layout is not obvious.

**Mitigation:**  
Use a simple and visually structured terminal layout with predictable directional logic.

---

## Input Mapping

There is a simple mapping for keyboard inputs:

- Left: `Left` or `A`
- Up: `Up` or `W`
- Right: `Right` or `D`
- Down: `Down` or `S`
- Interact: `Space`

Touch Inputs will be provided via holographic buttons in the UI.
Within the keyboard mode the same buttons are used for feedback.