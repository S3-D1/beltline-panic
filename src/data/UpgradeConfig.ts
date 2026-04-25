import { Direction } from './MachineConfig';

/** Automation speed timing in ms per level (Level 0–10) */
export const AUTOMATION_SPEED_TABLE: readonly number[] = [
  1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100,
] as const;

/** Automation level (auto-solved steps) per level (Level 0–10) */
export const AUTOMATION_LEVEL_TABLE: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const;

/** Required sequence length per quality level (Level 0–10) */
export const SEQUENCE_LENGTH_TABLE: readonly number[] = [
  3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 10,
] as const;

/** Quality multiplier per quality level (Level 0–10) */
export const QUALITY_MODIFIER_TABLE: readonly number[] = [
  1.00, 1.15, 1.30, 1.50, 1.75, 2.00, 2.35, 2.75, 3.25, 4.00, 5.00,
] as const;

/** Machine capacity per capacity level (Level 0–10) */
export const CAPACITY_TABLE: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
] as const;

export interface UpgradeConfigData {
  basePrices: Record<string, number>;
  maxLevel: number;
}

export const UPGRADE_CONFIG: UpgradeConfigData = {
  basePrices: {
    machine1: 50,
    machine2: 250,
    machine3: 1000,
  },
  maxLevel: 10,
};

export type UpgradeType = 'capacity' | 'quality' | 'speed' | 'automation';

export const UPGRADE_DIRECTION_MAP: Record<Direction, UpgradeType> = {
  up: 'capacity',
  right: 'automation',
  down: 'quality',
  left: 'speed',
};

export const MACHINE_DIRECTION_MAP: Record<Direction, string | null> = {
  up: 'machine1',
  right: 'machine2',
  down: 'machine3',
  left: null,
};
