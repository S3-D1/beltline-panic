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
import { GameBalanceConfig, DEFAULT_GAME_BALANCE_CONFIG } from '../data/GameBalanceConfig';
import { createSeededRandom } from '../utils/random';

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

export interface DifficultySnapshot {
  elapsedSeconds: number;
  timeDifficulty: number;
  overtimeDifficulty: number;
  beltSpeedFactor: number;
  spawnIntervalMs: number;
  incomeMultiplier: number;
  isPanicMode: boolean;
}

/** Map UpgradeType to the key used in baseCosts config */
const UPGRADE_COST_KEY: Record<UpgradeType, string> = {
  automation: 'automation',
  speed: 'automationSpeed',
  capacity: 'capacity',
  quality: 'quality',
};

export class GameManager {
  private score: number = 0;
  private budget: number = 0;
  private upgradeLevels: Record<string, UpgradeLevels>;

  // Difficulty state
  private elapsedSeconds: number = 0;
  private timeDifficulty: number = 0;
  private overtimeDifficulty: number = 0;

  // Balance config
  private config: GameBalanceConfig;

  // RNG for spawn jitter
  private rng: () => number;

  constructor(config?: GameBalanceConfig, seed?: number) {
    this.config = config ?? DEFAULT_GAME_BALANCE_CONFIG;
    this.rng = createSeededRandom(seed ?? Date.now());

    this.upgradeLevels = {
      machine1: { capacity: 0, quality: 0, speed: 0, automation: 0 },
      machine2: { capacity: 0, quality: 0, speed: 0, automation: 0 },
      machine3: { capacity: 0, quality: 0, speed: 0, automation: 0 },
    };
  }

  // ── Run lifecycle ─────────────────────────────────────────────────────

  /** Start a new run: reset all difficulty state */
  startRun(): void {
    this.elapsedSeconds = 0;
    this.timeDifficulty = 0;
    this.overtimeDifficulty = 0;
  }

  /** Alias for startRun */
  resetRun(): void {
    this.startRun();
  }

  // ── Update ────────────────────────────────────────────────────────────

  /** Advance elapsed time and recalculate all difficulty values */
  update(delta: number): void {
    this.elapsedSeconds += delta / 1000;

    const target = this.config.targetPanicTimeSeconds;
    this.timeDifficulty = clamp(this.elapsedSeconds / target, 0, 1);
    this.overtimeDifficulty = Math.max(0, this.elapsedSeconds - target) / 30;
  }

  // ── Difficulty getters ────────────────────────────────────────────────

  /** Returns a snapshot of all current difficulty values */
  getDifficultySnapshot(): DifficultySnapshot {
    return {
      elapsedSeconds: this.elapsedSeconds,
      timeDifficulty: this.timeDifficulty,
      overtimeDifficulty: this.overtimeDifficulty,
      beltSpeedFactor: this.getBeltSpeedFactor(),
      spawnIntervalMs: this.getSpawnIntervalMs(),
      incomeMultiplier: this.getIncomeMultiplier(),
      isPanicMode: this.isPanicMode(),
    };
  }

  /** Returns the current belt speed multiplier (starts at 1.0, reaches ~2.8 at panic) */
  getBeltSpeedFactor(): number {
    const { baseSpeedFactor, maxNormalSpeedFactor, overtimeSpeedGrowth, curveExponent } = this.config.belt;
    return baseSpeedFactor
      + Math.pow(this.timeDifficulty, curveExponent) * (maxNormalSpeedFactor - baseSpeedFactor)
      + this.overtimeDifficulty * overtimeSpeedGrowth;
  }

  /** Returns the current base spawn interval in ms (decreases with difficulty) */
  getSpawnIntervalMs(): number {
    const { startIntervalMs, panicIntervalMs, minIntervalMs, curveExponent } = this.config.spawns;
    const t = Math.pow(this.timeDifficulty, curveExponent);
    let interval = lerp(startIntervalMs, panicIntervalMs, t);
    interval -= this.overtimeDifficulty * 120;

    // Apply warm-up multiplier before clamp
    interval *= this.getWarmUpMultiplier();

    return clamp(interval, minIntervalMs, startIntervalMs * this.getWarmUpMultiplier());
  }

  /** Returns a randomized spawn delay based on current spawn interval */
  getNextSpawnDelayMs(): number {
    const interval = this.getSpawnIntervalMs();
    const { randomMinFactor, randomMaxFactor, minIntervalMs } = this.config.spawns;
    const factor = randomMinFactor + this.rng() * (randomMaxFactor - randomMinFactor);
    return Math.max(interval * factor, minIntervalMs);
  }

  /** Returns the current income multiplier (starts at 1.4, fades to 1.0 over 25s) */
  getIncomeMultiplier(): number {
    const { earlyIncomeMultiplier, earlyIncomeDurationSeconds } = this.config.economy;
    const t = clamp(this.elapsedSeconds / earlyIncomeDurationSeconds, 0, 1);
    return lerp(earlyIncomeMultiplier, 1.0, t);
  }

  /** Returns the warm-up spawn interval multiplier for the current elapsed time.
   *  - 0..warmUpEndSeconds: spawnIntervalMultiplier (3.0)
   *  - warmUpEndSeconds..transitionEndSeconds: linear interpolation from multiplier to 1.0
   *  - transitionEndSeconds+: 1.0 (no effect)
   */
  getWarmUpMultiplier(): number {
    const { warmUpEndSeconds, transitionEndSeconds, spawnIntervalMultiplier } = this.config.warmUp;
    if (this.elapsedSeconds <= warmUpEndSeconds) {
      return spawnIntervalMultiplier;
    }
    if (this.elapsedSeconds >= transitionEndSeconds) {
      return 1.0;
    }
    // Linear interpolation from spawnIntervalMultiplier to 1.0
    const t = (this.elapsedSeconds - warmUpEndSeconds) / (transitionEndSeconds - warmUpEndSeconds);
    return spawnIntervalMultiplier - (spawnIntervalMultiplier - 1.0) * t;
  }

  /** Returns true when elapsed time has reached the panic threshold */
  isPanicMode(): boolean {
    return this.elapsedSeconds >= this.config.targetPanicTimeSeconds;
  }

  // ── Score & budget ────────────────────────────────────────────────────

  getScore(): number {
    return this.score;
  }

  getBudget(): number {
    return this.budget;
  }

  /** Add payout value to both score and budget */
  addPayout(value: number): void {
    this.score += value;
    this.budget += value;
  }

  /** Returns elapsed game time in seconds */
  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  /** Returns elapsed game time in ms (backwards compat) */
  getElapsedTime(): number {
    return this.elapsedSeconds * 1000;
  }

  // ── Upgrade levels ────────────────────────────────────────────────────

  getUpgradeLevels(machineId: string): UpgradeLevels {
    return this.upgradeLevels[machineId];
  }

  getUpgradeLevel(machineId: string, type: UpgradeType): number {
    return this.upgradeLevels[machineId][type];
  }

  // ── Upgrade costs (new per-type system) ───────────────────────────────

  /** Calculate cost for a given upgrade type at a given level (1-indexed).
   *  Returns -1 if the level is out of range. */
  getUpgradeCost(typeOrMachineId: string, typeOrLevel: UpgradeType | number): number {
    // Support both old signature (machineId, type) and new signature (type, level)
    if (typeof typeOrLevel === 'number') {
      // New signature: getUpgradeCost(type, nextLevel)
      return this.calculateTypeCost(typeOrMachineId, typeOrLevel);
    }
    // Old signature: getUpgradeCost(machineId, type) — use new per-type costs
    const machineId = typeOrMachineId;
    const type = typeOrLevel;
    const currentLevel = this.upgradeLevels[machineId][type];
    const nextLevel = currentLevel + 1;
    return this.calculateTypeCost(type, nextLevel);
  }

  private calculateTypeCost(type: string, nextLevel: number): number {
    const { baseCosts, costMultiplierPerLevel } = this.config.upgrades;

    if (nextLevel < 1 || nextLevel > costMultiplierPerLevel.length) {
      return -1;
    }

    // Map UpgradeType to cost key
    const costKey = UPGRADE_COST_KEY[type as UpgradeType] ?? type;
    const baseCost = baseCosts[costKey];
    if (baseCost === undefined) return -1;

    return Math.round(baseCost * costMultiplierPerLevel[nextLevel - 1]);
  }

  /** Attempt purchase. Returns true if successful. */
  attemptPurchase(machineId: string, type: UpgradeType): boolean {
    const currentLevel = this.upgradeLevels[machineId][type];
    if (currentLevel >= UPGRADE_CONFIG.maxLevel) {
      return false;
    }
    const cost = this.getUpgradeCost(machineId, type);
    if (cost < 0 || this.budget < cost) {
      return false;
    }
    this.budget -= cost;
    this.upgradeLevels[machineId][type] += 1;
    return true;
  }

  /** Returns true when the given upgrade type on the given machine has reached max level */
  isMaxLevel(machineId: string, type: UpgradeType): boolean {
    return this.upgradeLevels[machineId][type] >= UPGRADE_CONFIG.maxLevel;
  }

  /** Returns true when the upgrade is not at max level and the budget covers the cost */
  canPurchase(machineId: string, type: UpgradeType): boolean {
    if (this.isMaxLevel(machineId, type)) return false;
    const cost = this.getUpgradeCost(machineId, type);
    return cost >= 0 && this.budget >= cost;
  }

  /** Returns the cost of the next upgrade, or null if already at max level */
  getNextUpgradeCost(machineId: string, type: UpgradeType): number | null {
    if (this.isMaxLevel(machineId, type)) return null;
    return this.getUpgradeCost(machineId, type);
  }

  // ── Upgrade level definitions ─────────────────────────────────────────

  /** Returns the fixed level definition for a given upgrade type and level */
  getUpgradeLevelDefinition(type: string, level: number): unknown {
    if (level < 0 || level > 10) return null;

    switch (type) {
      case 'automation':
        return { level, automationLevel: AUTOMATION_LEVEL_TABLE[level] };
      case 'automationSpeed':
      case 'speed':
        return { level, speedMs: AUTOMATION_SPEED_TABLE[level] };
      case 'capacity':
        return { level, capacity: CAPACITY_TABLE[level] };
      case 'quality':
        return {
          level,
          valueMultiplier: QUALITY_MODIFIER_TABLE[level],
          sequenceLength: SEQUENCE_LENGTH_TABLE[level],
        };
      default:
        return null;
    }
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

  /** Returns the balance config (for testing/inspection) */
  getConfig(): GameBalanceConfig {
    return this.config;
  }
}

// ── Utility functions ─────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
