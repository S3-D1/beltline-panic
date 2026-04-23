import { UPGRADE_CONFIG, UpgradeType } from '../data/UpgradeConfig';
import { MachineState, MACHINE_DEFAULTS } from '../data/MachineConfig';
import { DELIVERY_CONFIG } from '../data/DeliveryConfig';
import { evaluateCurve } from '../utils/progression';

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

  // Delivery state
  private elapsedTime: number = 0;
  private currentSpawnInterval: number;
  private currentBeltSpeed: number;
  private currentJitter: number;

  constructor() {
    this.upgradeLevels = {
      machine1: { capacity: 0, quality: 0, speed: 0, automation: 0 },
      machine2: { capacity: 0, quality: 0, speed: 0, automation: 0 },
      machine3: { capacity: 0, quality: 0, speed: 0, automation: 0 },
    };

    // Initialize delivery fields from config
    this.currentSpawnInterval = DELIVERY_CONFIG.initialSpawnInterval;
    this.currentBeltSpeed = DELIVERY_CONFIG.initialBeltSpeed;
    this.currentJitter = DELIVERY_CONFIG.initialJitter;
  }

  /** Advance elapsed time and recalculate delivery progression */
  update(delta: number): void {
    this.elapsedTime += delta;

    // Evaluate progression curves at current elapsed time
    const spawnMultiplier = evaluateCurve(DELIVERY_CONFIG.spawnIntervalCurve, this.elapsedTime);
    const speedMultiplier = evaluateCurve(DELIVERY_CONFIG.beltSpeedCurve, this.elapsedTime);

    // Apply multipliers to initial values, clamped to floor/ceiling
    this.currentSpawnInterval = Math.max(
      DELIVERY_CONFIG.initialSpawnInterval * spawnMultiplier,
      DELIVERY_CONFIG.minSpawnInterval,
    );
    this.currentBeltSpeed = Math.min(
      DELIVERY_CONFIG.initialBeltSpeed * speedMultiplier,
      DELIVERY_CONFIG.maxBeltSpeed,
    );
  }

  /** Returns the current average spawn interval in ms */
  getSpawnInterval(): number {
    return this.currentSpawnInterval;
  }

  /** Returns the current jitter fraction (0–1) */
  getSpawnJitter(): number {
    return this.currentJitter;
  }

  /** Returns the current belt speed in px/s */
  getBeltSpeed(): number {
    return this.currentBeltSpeed;
  }

  /** Returns elapsed game time in ms */
  getElapsedTime(): number {
    return this.elapsedTime;
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
