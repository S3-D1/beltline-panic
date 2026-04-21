import {
  Direction,
  MachineDefinition,
  MachineState,
  ActiveInteraction,
  MACHINE_DEFINITIONS,
  MACHINE_DEFAULTS,
  BASE_SEQUENCE,
} from '../data/MachineConfig';
import { ConveyorItem } from './ConveyorSystem';
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

  constructor() {
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

  autoProcess(machineId: string): ConveyorItem | null {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (!machine || machine.heldItems.length === 0) return null;

    const item = machine.heldItems.shift()!;
    item.state = machine.definition.outputStatus;
    item.loopProgress = machine.definition.zoneProgressEnd;
    item.onInlet = false;
    item.onOutlet = false;
    return item;
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

  isActive(machineId: string): boolean {
    const machine = this.machines.find((m) => m.definition.id === machineId);
    if (!machine) return false;
    return machine.activeInteraction !== null || machine.autoProcessing === true;
  }

  update(
    items: ConveyorItem[],
    playerPosition: PlayerPosition,
    interactJustPressed: boolean,
    directionJustPressed: Direction | null,
  ): MachineUpdateResult {
    const result: MachineUpdateResult = {
      itemsToRemove: [],
      itemsToReturn: [],
      interactionState: this.activeInteraction ? 'active' : 'idle',
    };

    // Step 1: Intake check
    for (const machine of this.machines) {
      if (machine.heldItems.length >= machine.capacity) continue;

      const def = machine.definition;
      const midpoint = (def.zoneProgressStart + def.zoneProgressEnd) / 2;

      for (let i = items.length - 1; i >= 0; i--) {
        if (machine.heldItems.length >= machine.capacity) break;

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
      if (machine && machine.heldItems.length > 0) {
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

    // Step 3: Interaction step
    if (this.activeInteraction && directionJustPressed !== null) {
      const interaction = this.activeInteraction;
      const expected = interaction.sequence[interaction.currentStep];

      if (directionJustPressed === expected) {
        interaction.currentStep++;

        if (interaction.currentStep === interaction.sequence.length) {
          // Success: set output state, return item at zoneProgressEnd
          const machine = this.machines.find(
            (m) => m.definition.id === interaction.machineId,
          )!;
          interaction.item.state = machine.definition.outputStatus;
          interaction.item.loopProgress = machine.definition.zoneProgressEnd;
          interaction.item.onInlet = false;
          interaction.item.onOutlet = false;

          result.itemsToReturn.push(interaction.item);
          result.interactionState = 'success';
          machine.activeInteraction = null;
          this.activeInteraction = null;
        }
      } else {
        // Wrong input: abort, return item unchanged at zoneProgressEnd
        const machine = this.machines.find(
          (m) => m.definition.id === interaction.machineId,
        )!;
        interaction.item.state = interaction.originalState;
        interaction.item.loopProgress = machine.definition.zoneProgressEnd;
        interaction.item.onInlet = false;
        interaction.item.onOutlet = false;

        result.itemsToReturn.push(interaction.item);
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

      result.itemsToReturn.push(interaction.item);
      result.interactionState = 'cancelled';
      machine.activeInteraction = null;
      this.activeInteraction = null;
    }

    return result;
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
