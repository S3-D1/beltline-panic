import {
  UPGRADE_CONFIG,
  UpgradeType,
  CAPACITY_TABLE,
  SEQUENCE_LENGTH_TABLE,
  AUTOMATION_LEVEL_TABLE,
  QUALITY_MODIFIER_TABLE,
  AUTOMATION_SPEED_TABLE,
} from '../data/UpgradeConfig';
import { MachineState } from '../data/MachineConfig';
import { DELIVERY_CONFIG } from '../data/DeliveryConfig';
import { evaluateCurve } from '../utils/progression';

export interface MachineValueConfig {
  machineId: string;
  baseValue: number;
  factor: number;
  qualityScalingMode: 'baseValue' | 'factor';
  costBasePrice: number;
}

export const MACHINE_VALUE_CONFIGS: readonly MachineValueConfig[] = [
  {
    machineId: 'machine1',
    baseValue: 10,
    factor: 1.0,
    qualityScalingMode: 'baseValue',
    costBasePrice: 50,
  },
  {
    machineId: 'machine2',
    baseValue: 25,
    factor: 1.5,
    qualityScalingMode: 'factor',
    costBasePrice: 250,
  },
  {
    machineId: 'machine3',
    baseValue: 50,
    factor: 2.0,
    qualityScalingMode: 'factor',
    costBasePrice: 1000,
  },
] as const;

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

  /** Calculate cost for next upgrade: costBasePrice * 2^currentLevel */
  getUpgradeCost(machineId: string, type: UpgradeType): number {
    const currentLevel = this.upgradeLevels[machineId][type];
    const config = this.getMachineValueConfig(machineId);
    return config.costBasePrice * Math.pow(2, currentLevel);
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
    const config = this.getMachineValueConfig(machineId);

    machine.capacity = CAPACITY_TABLE[levels.capacity];
    machine.requiredSequenceLength = SEQUENCE_LENGTH_TABLE[levels.quality];
    machine.automationLevel = AUTOMATION_LEVEL_TABLE[levels.automation];

    const qualityModifier = QUALITY_MODIFIER_TABLE[levels.quality];
    if (config.qualityScalingMode === 'baseValue') {
      machine.workQuality = config.baseValue * qualityModifier;
    } else {
      machine.workQuality = config.factor * qualityModifier;
    }
  }

  /** Get automation timing for a machine in ms */
  getAutomationTiming(machineId: string): number {
    const speedLevel = this.upgradeLevels[machineId].speed;
    return AUTOMATION_SPEED_TABLE[speedLevel];
  }

  /** Retrieve the MachineValueConfig for a given machine, or throw if not found */
  getMachineValueConfig(machineId: string): MachineValueConfig {
    const config = MACHINE_VALUE_CONFIGS.find(c => c.machineId === machineId);
    if (!config) {
      throw new Error(`No MachineValueConfig for machine: ${machineId}`);
    }
    return config;
  }

  /** Returns true when the given upgrade type on the given machine has reached max level */
  isMaxLevel(machineId: string, type: UpgradeType): boolean {
    return this.upgradeLevels[machineId][type] >= UPGRADE_CONFIG.maxLevel;
  }

  /** Returns true when the upgrade is not at max level and the budget covers the cost */
  canPurchase(machineId: string, type: UpgradeType): boolean {
    if (this.isMaxLevel(machineId, type)) return false;
    return this.budget >= this.getUpgradeCost(machineId, type);
  }

  /** Returns the cost of the next upgrade, or null if already at max level */
  getNextUpgradeCost(machineId: string, type: UpgradeType): number | null {
    if (this.isMaxLevel(machineId, type)) return null;
    return this.getUpgradeCost(machineId, type);
  }
}
