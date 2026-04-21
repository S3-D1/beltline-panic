import { UPGRADE_CONFIG, UpgradeType } from '../data/UpgradeConfig';
import { MachineState, MACHINE_DEFAULTS } from '../data/MachineConfig';

export interface UpgradeLevels {
  capacity: number;
  quality: number;
  speed: number;
  automation: number;
}

export class GameManager {
  private score: number = 0;
  private budget: number = 0;
  private upgradeLevels: Record<string, UpgradeLevels>;

  constructor() {
    this.upgradeLevels = {
      machine1: { capacity: 0, quality: 0, speed: 0, automation: 0 },
      machine2: { capacity: 0, quality: 0, speed: 0, automation: 0 },
      machine3: { capacity: 0, quality: 0, speed: 0, automation: 0 },
    };
  }

  getScore(): number {
    return this.score;
  }

  getBudget(): number {
    return this.budget;
  }

  getUpgradeLevels(machineId: string): UpgradeLevels {
    return this.upgradeLevels[machineId];
  }

  getUpgradeLevel(machineId: string, type: UpgradeType): number {
    return this.upgradeLevels[machineId][type];
  }

  /** Add payout value to both score and budget */
  addPayout(value: number): void {
    this.score += value;
    this.budget += value;
  }

  /** Calculate cost for next upgrade: basePrices[machineId] * 2^currentLevel */
  getUpgradeCost(machineId: string, type: UpgradeType): number {
    const currentLevel = this.upgradeLevels[machineId][type];
    return UPGRADE_CONFIG.basePrices[machineId] * Math.pow(2, currentLevel);
  }

  /** Attempt purchase. Returns true if successful. */
  attemptPurchase(machineId: string, type: UpgradeType): boolean {
    const currentLevel = this.upgradeLevels[machineId][type];
    if (currentLevel >= UPGRADE_CONFIG.maxLevel) {
      return false;
    }
    const cost = this.getUpgradeCost(machineId, type);
    if (this.budget < cost) {
      return false;
    }
    this.budget -= cost;
    this.upgradeLevels[machineId][type] += 1;
    return true;
  }

  /** Apply current upgrade levels to a MachineState */
  applyUpgrades(machineId: string, machine: MachineState): void {
    const levels = this.upgradeLevels[machineId];
    machine.capacity = MACHINE_DEFAULTS.capacity + levels.capacity * UPGRADE_CONFIG.capacityIncrement;
    machine.workQuality = MACHINE_DEFAULTS.workQuality + levels.quality * UPGRADE_CONFIG.qualityIncrement;
    machine.requiredSequenceLength = MACHINE_DEFAULTS.requiredSequenceLength + levels.quality * UPGRADE_CONFIG.sequenceLengthIncrement;
    machine.automationLevel = levels.automation * UPGRADE_CONFIG.automationIncrement;
  }

  /** Get automation timing for a machine in ms */
  getAutomationTiming(machineId: string): number {
    const speedLevel = this.upgradeLevels[machineId].speed;
    return UPGRADE_CONFIG.automationBaseTimingMs - (speedLevel * UPGRADE_CONFIG.automationSpeedReductionMs);
  }
}
