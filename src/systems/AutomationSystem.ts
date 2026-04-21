import { MachineState } from '../data/MachineConfig';
import { GameManager } from './GameManager';
import { MachineSystem } from './MachineSystem';
import { ConveyorItem } from './ConveyorSystem';

export class AutomationSystem {
  private timers: Record<string, number>;

  constructor() {
    this.timers = {
      machine1: 0,
      machine2: 0,
      machine3: 0,
    };
  }

  update(
    delta: number,
    machines: MachineState[],
    gameManager: GameManager,
    machineSystem: MachineSystem,
  ): ConveyorItem[] {
    const autoProcessedItems: ConveyorItem[] = [];

    for (const machine of machines) {
      const machineId = machine.definition.id;

      // Skip if no automation upgrade
      if (machine.automationLevel === 0) {
        continue;
      }

      // Skip and reset timer if manual interaction is active
      if (machine.activeInteraction !== null) {
        this.timers[machineId] = 0;
        continue;
      }

      // Skip if machine holds no items
      if (machine.heldItems.length === 0) {
        continue;
      }

      // Increment timer
      this.timers[machineId] += delta;

      // Check if timer has reached the automation timing threshold
      const timing = gameManager.getAutomationTiming(machineId);
      if (this.timers[machineId] >= timing) {
        const item = machineSystem.autoProcess(machineId);
        if (item) {
          machineSystem.setAutoProcessing(machineId);
          autoProcessedItems.push(item);
        }
        this.timers[machineId] = 0;
      }
    }

    return autoProcessedItems;
  }
}
