import { Direction } from './MachineConfig';

export interface UpgradeConfigData {
  basePrices: Record<string, number>;
  maxLevel: number;
  capacityIncrement: number;
  qualityIncrement: number;
  sequenceLengthIncrement: number;
  automationIncrement: number;
  automationBaseTimingMs: number;
  automationSpeedReductionMs: number;
}

export const UPGRADE_CONFIG: UpgradeConfigData = {
  basePrices: {
    machine1: 50,
    machine2: 250,
    machine3: 1000,
  },
  maxLevel: 10,
  capacityIncrement: 1,
  qualityIncrement: 0.1,
  sequenceLengthIncrement: 1,
  automationIncrement: 1,
  automationBaseTimingMs: 1100,
  automationSpeedReductionMs: 100,
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
