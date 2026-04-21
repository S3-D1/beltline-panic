import { MachineState } from '../data/MachineConfig';
import { GameManager } from './GameManager';
import { MachineSystem } from './MachineSystem';
import { ConveyorItem } from './ConveyorSystem';

/**
 * AutomationSystem — step-by-step sequence automation for machines.
 *
 * Automation level determines how many sequence steps the machine can solve
 * automatically. Each step takes one speed-timing interval. When all steps
 * the automation can handle are done:
 *   - If the full sequence is complete → item is finished and returned to belt.
 *   - If steps remain → the interaction stays open for the player to finish manually.
 *
 * If the player is manually interacting with a machine, automation does nothing
 * on that machine.
 */
export class AutomationSystem {
  /** Per-machine timer tracking ms elapsed since last automation action */
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
    const returnedItems: ConveyorItem[] = [];

    for (const machine of machines) {
      const machineId = machine.definition.id;

      // Skip if no automation upgrade
      if (machine.automationLevel === 0) {
        continue;
      }

      // If the player owns the active interaction on this machine
      // (i.e. the system-level activeInteraction points to this machine),
      // the player is in control — automation does nothing.
      if (machineSystem.isPlayerInteracting(machineId)) {
        this.timers[machineId] = 0;
        continue;
      }

      // If there is no active interaction on this machine, try to start one
      if (machine.activeInteraction === null) {
        if (machine.heldItems.length === 0) {
          continue;
        }

        this.timers[machineId] += delta;
        const timing = gameManager.getAutomationTiming(machineId);

        if (this.timers[machineId] >= timing) {
          this.timers[machineId] = 0;

          // Start an auto-interaction: take item, generate sequence, set currentStep = 0
          machineSystem.startAutoInteraction(machineId);
          machineSystem.setAutoProcessing(machineId);

          // Re-read interaction after mutation
          const started = machine.activeInteraction as import('../data/MachineConfig').ActiveInteraction | null;
          if (started) {
            // Immediately solve the first step
            started.currentStep++;

            // Check if that single step completed the sequence
            if (started.currentStep >= started.sequence.length) {
              const item = machineSystem.completeAutoInteraction(machineId);
              if (item) {
                returnedItems.push(item);
              }
            }
          }
        }
        continue;
      }

      // There is an active interaction on this machine that automation owns.
      // Check if automation can still advance (hasn't exhausted its level).
      const interaction = machine.activeInteraction;
      if (interaction.currentStep >= machine.automationLevel) {
        // Automation has done all it can — leave the interaction open for the player.
        // Reset timer so it doesn't keep ticking.
        this.timers[machineId] = 0;
        continue;
      }

      // Advance one step per timing interval
      this.timers[machineId] += delta;
      const timing = gameManager.getAutomationTiming(machineId);

      if (this.timers[machineId] >= timing) {
        this.timers[machineId] = 0;
        machineSystem.setAutoProcessing(machineId);

        interaction.currentStep++;

        // Check if the full sequence is now complete
        if (interaction.currentStep >= interaction.sequence.length) {
          const item = machineSystem.completeAutoInteraction(machineId);
          if (item) {
            returnedItems.push(item);
          }
        }
      }
    }

    return returnedItems;
  }
}
