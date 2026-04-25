export interface GameBalanceConfig {
  targetPanicTimeSeconds: number;

  belt: {
    baseSpeedFactor: number;
    maxNormalSpeedFactor: number;
    overtimeSpeedGrowth: number;
    curveExponent: number;
  };

  spawns: {
    startIntervalMs: number;
    panicIntervalMs: number;
    minIntervalMs: number;
    curveExponent: number;
    randomMinFactor: number;
    randomMaxFactor: number;
  };

  economy: {
    baseItemValue: number;
    earlyIncomeMultiplier: number;
    earlyIncomeDurationSeconds: number;
  };

  upgrades: {
    baseCosts: Record<string, number>;
    costMultiplierPerLevel: number[];
  };

  warmUp: {
    warmUpEndSeconds: number;
    transitionEndSeconds: number;
    spawnIntervalMultiplier: number;
  };
}

export const DEFAULT_GAME_BALANCE_CONFIG: GameBalanceConfig = {
  targetPanicTimeSeconds: 75,

  belt: {
    baseSpeedFactor: 1.0,
    maxNormalSpeedFactor: 2.8,
    overtimeSpeedGrowth: 0.8,
    curveExponent: 1.6,
  },

  spawns: {
    startIntervalMs: 1450,
    panicIntervalMs: 420,
    minIntervalMs: 280,
    curveExponent: 1.25,
    randomMinFactor: 0.75,
    randomMaxFactor: 1.35,
  },

  economy: {
    baseItemValue: 5,
    earlyIncomeMultiplier: 1.4,
    earlyIncomeDurationSeconds: 25,
  },

  upgrades: {
    baseCosts: {
      automation: 10,
      automationSpeed: 12,
      capacity: 15,
      quality: 20,
    },
    costMultiplierPerLevel: [
      1.0, 1.45, 2.1, 3.0, 4.3,
      6.1, 8.6, 12.0, 16.5, 22.5,
    ],
  },

  warmUp: {
    warmUpEndSeconds: 15,
    transitionEndSeconds: 45,
    spawnIntervalMultiplier: 3.0,
  },
};
