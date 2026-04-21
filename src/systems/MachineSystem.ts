import {
  Direction,
  MachineDefinition,
  MachineState,
  ActiveInteraction,
  MACHINE_DEFINITIONS,
  MACHINE_DEFAULTS,
  BASE_SEQUENCE,
} from '../data/MachineConfig';
import { MIN_BELT_SPACING } from '../data/ConveyorConfig';
import { ConveyorItem, ConveyorSystem } from './ConveyorSystem';
import { isSafeToRelease } from './SafeReleaseSystem';
import { PlayerPosition } from './InputSystem';

export interface MachineUpdateResult {
  itemsToRemove: ConveyorItem[];
  itemsToReturn: ConveyorItem[];
  interactionState: 'idle' | 'active' | 'success' | 'failed' | 'cancelled';
}

export function generateRandomSequence(length: number): Direction[] {
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  const seq: Direction[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(dirs[Math.floor(Math.random() * 4)]);
  }
  return seq;
}

export function getActiveSequence(
  machine: MachineState,
  baseSeq: Direction[],
): Direction[] {
  const len = machine.requiredSequenceLength;
  const result: Direction[] = [];
  for (let i = 0; i < len; i++) {
    result.push(baseSeq[i % baseSeq.length]);
  }
  return result;
}

export class MachineSystem {
  private machines: MachineState[];
  private activeInteraction: ActiveInteraction | null = null;
  private conveyorSystem: ConveyorSystem | null;

  constructor(conveyorSystem?: ConveyorSystem) {
    this.conveyorSystem = conveyorSystem ?? null;
    this.machines = MACHINE_DEFINITIONS.map((def: MachineDefinition) => {
      const state: MachineState = {
        definition: def,
        capacity: MACHINE_DEFAULTS.capacity,
        automationLevel: MACHINE_DEFAULTS.automationLevel,
        workQuality: MACHINE_DEFAULTS.workQuality,
        workSpeed: MACHINE_DEFAULTS.workSpeed,
        requiredSequenceLength: MACHINE_DEFAULTS.requiredSequenceLength,
        heldItems: [],
        activeInteraction: null,
        runSequence: null,
        autoProcessing: false,
        pendingReleaseItems: [],
      };

      // Generate per-run sequence for 'per-run' strategy machines
      if (def.sequenceStrategy === 'per-run') {
        state.runSequence = generateRandomSequence(BASE_SEQUENCE.length);
      }

      return state;
    });
  }

  getMachines(): MachineState[] {
    return this.machines;
  }

  getActiveInteraction(): ActiveInteraction | null {
    return this.activeInteraction;
  }

  autoProcess(machineId: string, beltItems: ConveyorItem[] = []): ConveyorItem | null {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (!machine || machine.heldItems.length === 0) return null;

    const item = machine.heldItems.shift()!;
    item.state = machine.definition.outputStatus;
    item.loopProgress = machine.definition.zoneProgressEnd;
    item.onInlet = false;
    item.onOutlet = false;

    if (this.canSafelyRelease(machine, beltItems)) {
      return item;
    } else {
      machine.pendingReleaseItems.push(item);
      return null;
    }
  }

  /**
   * Start an auto-interaction on a machine.
   * Takes an item from heldItems, generates the sequence, and sets
   * machine.activeInteraction. Does NOT set this.activeInteraction
   * (that is reserved for player-owned interactions).
   */
  startAutoInteraction(machineId: string): void {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (!machine || machine.heldItems.length === 0) return;
    if (machine.activeInteraction !== null) return;

    const item = machine.heldItems.shift()!;
    const sequence = this.getSequenceForMachine(machine);

    machine.activeInteraction = {
      machineId,
      item,
      originalState: item.state,
      sequence,
      currentStep: 0,
    };
  }

  /**
   * Complete an auto-interaction: set the item to the machine's output status,
   * return it to the belt, and clear the machine's interaction.
   */
  completeAutoInteraction(machineId: string, beltItems: ConveyorItem[] = []): ConveyorItem | null {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (!machine || !machine.activeInteraction) return null;

    const interaction = machine.activeInteraction;
    interaction.item.state = machine.definition.outputStatus;
    interaction.item.loopProgress = machine.definition.zoneProgressEnd;
    interaction.item.onInlet = false;
    interaction.item.onOutlet = false;

    if (this.canSafelyRelease(machine, beltItems)) {
      const item = interaction.item;
      machine.activeInteraction = null;
      return item;
    } else {
      machine.pendingReleaseItems.push(interaction.item);
      machine.activeInteraction = null;
      return null;
    }
  }

  /**
   * Check if the player (not automation) is interacting with a specific machine.
   * The player owns the interaction when this.activeInteraction points to that machine.
   */
  isPlayerInteracting(machineId: string): boolean {
    return this.activeInteraction !== null && this.activeInteraction.machineId === machineId;
  }

  resetAutoProcessingFlags(): void {
    for (const machine of this.machines) {
      machine.autoProcessing = false;
    }
  }

  setAutoProcessing(machineId: string): void {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (machine) {
      machine.autoProcessing = true;
    }
  }

  /** Calculate total items the machine is responsible for */
  getUsedCapacity(machine: MachineState): number {
    return machine.heldItems.length + (machine.activeInteraction !== null ? 1 : 0) + machine.pendingReleaseItems.length;
  }

  /** Attempt to release the oldest pending item if the belt position is safe */
  tryReleasePending(machine: MachineState, beltItems: ConveyorItem[]): ConveyorItem | null {
    if (machine.pendingReleaseItems.length === 0) return null;
    if (!this.conveyorSystem) return null;

    const releasePos = this.conveyorSystem.getPositionOnLoop(machine.definition.zoneProgressEnd);

    if (!isSafeToRelease(releasePos, beltItems, MIN_BELT_SPACING)) return null;

    const item = machine.pendingReleaseItems.shift()!;
    item.loopProgress = machine.definition.zoneProgressEnd;
    item.x = releasePos.x;
    item.y = releasePos.y;
    item.onInlet = false;
    item.onOutlet = false;
    return item;
  }

  /** Iterate all machines, attempt pending release for each, return all released items */
  tryReleasePendingAll(beltItems: ConveyorItem[]): ConveyorItem[] {
    const released: ConveyorItem[] = [];
    for (const machine of this.machines) {
      const item = this.tryReleasePending(machine, beltItems);
      if (item) {
        released.push(item);
      }
    }
    return released;
  }

  isActive(machineId: string): boolean {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (!machine) return false;

    // Player is manually interacting → active
    if (this.activeInteraction !== null && this.activeInteraction.machineId === machineId) {
      return true;
    }

    // Automation is working on this machine
    if (machine.activeInteraction !== null && machine.automationLevel > 0) {
      // Active while automation still has steps to solve
      return machine.activeInteraction.currentStep < machine.automationLevel;
    }

    return false;
  }

  update(
    items: ConveyorItem[],
    playerPosition: PlayerPosition,
    interactJustPressed: boolean,
    directionJustPressed: Direction | null,
    beltItems: ConveyorItem[] = [],
  ): MachineUpdateResult {
    const result: MachineUpdateResult = {
      itemsToRemove: [],
      itemsToReturn: [],
      interactionState: this.activeInteraction ? 'active' : 'idle',
    };

    // Step 1: Intake check
    for (const machine of this.machines) {
      if (this.getUsedCapacity(machine) >= machine.capacity) continue;

      const def = machine.definition;
      const midpoint = (def.zoneProgressStart + def.zoneProgressEnd) / 2;

      for (let i = items.length - 1; i >= 0; i--) {
        if (this.getUsedCapacity(machine) >= machine.capacity) break;

        const item = items[i];
        if (item.onInlet || item.onOutlet) continue;
        if (!def.acceptedInputStatuses.includes(item.state)) continue;
        if (Math.abs(item.loopProgress - midpoint) > 0.01) continue;

        // Intake: remove from belt, add to machine
        machine.heldItems.push(item);
        items.splice(i, 1);
        result.itemsToRemove.push(item);
      }
    }

    // Step 2: Interaction start
    if (interactJustPressed && !this.activeInteraction) {
      const machine = this.machines.find(
        (m) => m.definition.playerPosition === playerPosition,
      );
      if (machine) {
        // Check if there's an existing auto-interaction the player can take over
        if (machine.activeInteraction !== null) {
          this.activeInteraction = machine.activeInteraction;
          result.interactionState = 'active';
          return result;
        }

        // Otherwise start a fresh interaction if machine has items
        if (machine.heldItems.length > 0) {
          const item = machine.heldItems.shift()!;
          const sequence = this.getSequenceForMachine(machine);

          this.activeInteraction = {
            machineId: machine.definition.id,
            item,
            originalState: item.state,
            sequence,
            currentStep: 0,
          };
          machine.activeInteraction = this.activeInteraction;
          result.interactionState = 'active';
          return result;
        }
      }
    }

    // Step 3: Interaction step
    if (this.activeInteraction && directionJustPressed !== null) {
      const interaction = this.activeInteraction;
      const expected = interaction.sequence[interaction.currentStep];

      if (directionJustPressed === expected) {
        interaction.currentStep++;

        if (interaction.currentStep === interaction.sequence.length) {
          // Success: set output state, check safe release before returning
          const machine = this.machines.find(
            (m) => m.definition.id === interaction.machineId,
          )!;
          interaction.item.state = machine.definition.outputStatus;
          interaction.item.loopProgress = machine.definition.zoneProgressEnd;
          interaction.item.onInlet = false;
          interaction.item.onOutlet = false;

          if (this.canSafelyRelease(machine, beltItems)) {
            result.itemsToReturn.push(interaction.item);
          } else {
            machine.pendingReleaseItems.push(interaction.item);
          }
          result.interactionState = 'success';
          machine.activeInteraction = null;
          this.activeInteraction = null;
        }
      } else {
        // Wrong input: abort, check safe release before returning item in original state
        const machine = this.machines.find(
          (m) => m.definition.id === interaction.machineId,
        )!;
        interaction.item.state = interaction.originalState;
        interaction.item.loopProgress = machine.definition.zoneProgressEnd;
        interaction.item.onInlet = false;
        interaction.item.onOutlet = false;

        if (this.canSafelyRelease(machine, beltItems)) {
          result.itemsToReturn.push(interaction.item);
        } else {
          machine.pendingReleaseItems.push(interaction.item);
        }
        result.interactionState = 'failed';
        machine.activeInteraction = null;
        this.activeInteraction = null;
      }
      return result;
    }

    // Step 4: Interaction cancel
    if (this.activeInteraction && interactJustPressed) {
      const interaction = this.activeInteraction;
      const machine = this.machines.find(
        (m) => m.definition.id === interaction.machineId,
      )!;
      interaction.item.state = interaction.originalState;
      interaction.item.loopProgress = machine.definition.zoneProgressEnd;
      interaction.item.onInlet = false;
      interaction.item.onOutlet = false;

      if (this.canSafelyRelease(machine, beltItems)) {
        result.itemsToReturn.push(interaction.item);
      } else {
        machine.pendingReleaseItems.push(interaction.item);
      }
      result.interactionState = 'cancelled';
      machine.activeInteraction = null;
      this.activeInteraction = null;
    }

    return result;
  }

  /**
   * Check if it's safe to release an item at the machine's zone end position.
   * Falls back to true (always release) when no ConveyorSystem is available.
   */
  private canSafelyRelease(machine: MachineState, beltItems: ConveyorItem[]): boolean {
    if (!this.conveyorSystem) return true;
    const releasePos = this.conveyorSystem.getPositionOnLoop(machine.definition.zoneProgressEnd);
    return isSafeToRelease(releasePos, beltItems, MIN_BELT_SPACING);
  }

  private getSequenceForMachine(machine: MachineState): Direction[] {
    const strategy = machine.definition.sequenceStrategy;

    if (strategy === 'fixed') {
      return getActiveSequence(
        machine,
        machine.definition.fixedSequence ?? BASE_SEQUENCE,
      );
    }

    if (strategy === 'per-run') {
      return getActiveSequence(
        machine,
        machine.runSequence ?? BASE_SEQUENCE,
      );
    }

    // 'per-item': generate fresh each time
    const baseSeq = generateRandomSequence(BASE_SEQUENCE.length);
    return getActiveSequence(machine, baseSeq);
  }
}
