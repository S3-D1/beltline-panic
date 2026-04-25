import { describe, it, expect } from 'vitest';
import {
  AUTOMATION_SPEED_TABLE,
  AUTOMATION_LEVEL_TABLE,
  SEQUENCE_LENGTH_TABLE,
  QUALITY_MODIFIER_TABLE,
  CAPACITY_TABLE,
  UPGRADE_CONFIG,
  UpgradeType,
  UPGRADE_DIRECTION_MAP,
  MACHINE_DIRECTION_MAP,
} from '../data/UpgradeConfig';
import { GameManager, MACHINE_VALUE_CONFIGS } from '../systems/GameManager';
import { MachineState, MACHINE_DEFAULTS } from '../data/MachineConfig';

/** Helper: create a minimal MachineState for testing applyUpgrades */
function createMachineState(): MachineState {
  return {
    definition: {
      id: 'machine1',
      acceptedInputStatuses: ['new'],
      outputStatus: 'processed',
      playerPosition: 'up',
      zoneProgressStart: 0.1,
      zoneProgressEnd: 0.18,
      sequenceStrategy: 'fixed',
      fixedSequence: ['left', 'up', 'up', 'right', 'left', 'down'],
    },
    capacity: MACHINE_DEFAULTS.capacity,
    automationLevel: MACHINE_DEFAULTS.automationLevel,
    workQuality: MACHINE_DEFAULTS.workQuality,
    workSpeed: MACHINE_DEFAULTS.workSpeed,
    requiredSequenceLength: MACHINE_DEFAULTS.requiredSequenceLength,
    heldItems: [],
    activeInteraction: null,
    runSequence: null,
    autoProcessing: false,
    pendingReleaseItems: [],
  };
}

describe('Upgrade System — example-based unit tests', () => {
  // ── 1. Lookup table contents ──────────────────────────────────────────
  // Validates: Requirements 1.1–1.5

  describe('Lookup table contents', () => {
    it('AUTOMATION_SPEED_TABLE has exactly 11 entries with correct values', () => {
      expect(AUTOMATION_SPEED_TABLE).toHaveLength(11);
      expect([...AUTOMATION_SPEED_TABLE]).toEqual([1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]);
    });

    it('AUTOMATION_LEVEL_TABLE has exactly 11 entries with correct values', () => {
      expect(AUTOMATION_LEVEL_TABLE).toHaveLength(11);
      expect([...AUTOMATION_LEVEL_TABLE]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('SEQUENCE_LENGTH_TABLE has exactly 11 entries with correct values', () => {
      expect(SEQUENCE_LENGTH_TABLE).toHaveLength(11);
      expect([...SEQUENCE_LENGTH_TABLE]).toEqual([3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 10]);
    });

    it('QUALITY_MODIFIER_TABLE has exactly 11 entries with correct values', () => {
      expect(QUALITY_MODIFIER_TABLE).toHaveLength(11);
      expect([...QUALITY_MODIFIER_TABLE]).toEqual([1.00, 1.15, 1.30, 1.50, 1.75, 2.00, 2.35, 2.75, 3.25, 4.00, 5.00]);
    });

    it('CAPACITY_TABLE has exactly 11 entries with correct values', () => {
      expect(CAPACITY_TABLE).toHaveLength(11);
      expect([...CAPACITY_TABLE]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });
  });

  // ── 2. Initial state ─────────────────────────────────────────────────
  // Validates: Requirement 2.1

  describe('Initial state', () => {
    it('all upgrade levels start at 0 for all machines', () => {
      const gm = new GameManager();
      for (const machineId of ['machine1', 'machine2', 'machine3']) {
        const levels = gm.getUpgradeLevels(machineId);
        expect(levels.capacity).toBe(0);
        expect(levels.quality).toBe(0);
        expect(levels.speed).toBe(0);
        expect(levels.automation).toBe(0);
      }
    });
  });

  // ── 3. MachineValueConfig structure ───────────────────────────────────
  // Validates: Requirements 7.1, 7.4

  describe('MachineValueConfig structure', () => {
    it('machine1 config has correct values', () => {
      const gm = new GameManager();
      const cfg = gm.getMachineValueConfig('machine1');
      expect(cfg.machineId).toBe('machine1');
      expect(cfg.baseValue).toBe(10);
      expect(cfg.factor).toBe(1.0);
      expect(cfg.qualityScalingMode).toBe('baseValue');
      expect(cfg.costBasePrice).toBe(50);
    });

    it('machine2 config has correct values', () => {
      const gm = new GameManager();
      const cfg = gm.getMachineValueConfig('machine2');
      expect(cfg.machineId).toBe('machine2');
      expect(cfg.baseValue).toBe(25);
      expect(cfg.factor).toBe(1.5);
      expect(cfg.qualityScalingMode).toBe('factor');
      expect(cfg.costBasePrice).toBe(250);
    });

    it('machine3 config has correct values', () => {
      const gm = new GameManager();
      const cfg = gm.getMachineValueConfig('machine3');
      expect(cfg.machineId).toBe('machine3');
      expect(cfg.baseValue).toBe(50);
      expect(cfg.factor).toBe(2.0);
      expect(cfg.qualityScalingMode).toBe('factor');
      expect(cfg.costBasePrice).toBe(1000);
    });

    it('each config has all required fields', () => {
      for (const cfg of MACHINE_VALUE_CONFIGS) {
        expect(cfg).toHaveProperty('machineId');
        expect(cfg).toHaveProperty('baseValue');
        expect(cfg).toHaveProperty('factor');
        expect(cfg).toHaveProperty('qualityScalingMode');
        expect(cfg).toHaveProperty('costBasePrice');
      }
    });
  });

  // ── 4. UPGRADE_CONFIG does not contain old increment fields ───────────
  // Validates: Requirement 11.1

  describe('UPGRADE_CONFIG does not contain old increment fields', () => {
    it('does not have capacityIncrement', () => {
      expect(UPGRADE_CONFIG).not.toHaveProperty('capacityIncrement');
    });
    it('does not have qualityIncrement', () => {
      expect(UPGRADE_CONFIG).not.toHaveProperty('qualityIncrement');
    });
    it('does not have sequenceLengthIncrement', () => {
      expect(UPGRADE_CONFIG).not.toHaveProperty('sequenceLengthIncrement');
    });
    it('does not have automationIncrement', () => {
      expect(UPGRADE_CONFIG).not.toHaveProperty('automationIncrement');
    });
    it('does not have automationBaseTimingMs', () => {
      expect(UPGRADE_CONFIG).not.toHaveProperty('automationBaseTimingMs');
    });
    it('does not have automationSpeedReductionMs', () => {
      expect(UPGRADE_CONFIG).not.toHaveProperty('automationSpeedReductionMs');
    });
  });

  // ── 5. UPGRADE_CONFIG retains maxLevel and basePrices ─────────────────
  // Validates: Requirement 11.4

  describe('UPGRADE_CONFIG retains maxLevel and basePrices', () => {
    it('maxLevel is 10', () => {
      expect(UPGRADE_CONFIG.maxLevel).toBe(10);
    });

    it('basePrices has machine1, machine2, machine3', () => {
      expect(UPGRADE_CONFIG.basePrices).toHaveProperty('machine1');
      expect(UPGRADE_CONFIG.basePrices).toHaveProperty('machine2');
      expect(UPGRADE_CONFIG.basePrices).toHaveProperty('machine3');
    });
  });

  // ── 6. Preserved exports ──────────────────────────────────────────────

  describe('Preserved exports', () => {
    it('UpgradeType accepts the four valid values', () => {
      const types: UpgradeType[] = ['capacity', 'quality', 'speed', 'automation'];
      expect(types).toHaveLength(4);
    });

    it('UPGRADE_DIRECTION_MAP maps directions to upgrade types', () => {
      expect(UPGRADE_DIRECTION_MAP.up).toBe('capacity');
      expect(UPGRADE_DIRECTION_MAP.right).toBe('automation');
      expect(UPGRADE_DIRECTION_MAP.down).toBe('quality');
      expect(UPGRADE_DIRECTION_MAP.left).toBe('speed');
    });

    it('MACHINE_DIRECTION_MAP maps directions to machine IDs', () => {
      expect(MACHINE_DIRECTION_MAP.up).toBe('machine1');
      expect(MACHINE_DIRECTION_MAP.right).toBe('machine2');
      expect(MACHINE_DIRECTION_MAP.down).toBe('machine3');
      expect(MACHINE_DIRECTION_MAP.left).toBeNull();
    });
  });

  // ── 7. getNextUpgradeCost returns null at max level ───────────────────
  // Validates: Requirement 8.4

  describe('getNextUpgradeCost', () => {
    it('returns null when machine is at max level (10)', () => {
      const gm = new GameManager();
      // Fund enough to buy all 10 levels of capacity on machine1
      // Cost = 50 * (2^0 + 2^1 + ... + 2^9) = 50 * 1023 = 51150
      gm.addPayout(51150);
      for (let i = 0; i < 10; i++) {
        gm.attemptPurchase('machine1', 'capacity');
      }
      expect(gm.getUpgradeLevel('machine1', 'capacity')).toBe(10);
      expect(gm.getNextUpgradeCost('machine1', 'capacity')).toBeNull();
    });
  });

  // ── 8. isMaxLevel ─────────────────────────────────────────────────────
  // Validates: Requirement 2.4

  describe('isMaxLevel', () => {
    it('returns false at level 0', () => {
      const gm = new GameManager();
      expect(gm.isMaxLevel('machine1', 'capacity')).toBe(false);
    });

    it('returns true at level 10', () => {
      const gm = new GameManager();
      gm.addPayout(51150);
      for (let i = 0; i < 10; i++) {
        gm.attemptPurchase('machine1', 'capacity');
      }
      expect(gm.isMaxLevel('machine1', 'capacity')).toBe(true);
    });
  });

  // ── 9. canPurchase ────────────────────────────────────────────────────
  // Validates: Requirement 9.4

  describe('canPurchase', () => {
    it('returns false when budget is 0 and level is 0', () => {
      const gm = new GameManager();
      expect(gm.getBudget()).toBe(0);
      expect(gm.getUpgradeLevel('machine1', 'capacity')).toBe(0);
      expect(gm.canPurchase('machine1', 'capacity')).toBe(false);
    });
  });

  // ── 10. applyUpgrades at level 0 ─────────────────────────────────────
  // Validates: Requirements 2.1, 3.3, 4.2, 5.5, 6.2

  describe('applyUpgrades at level 0', () => {
    it('sets capacity=1, sequenceLength=3, automationLevel=0', () => {
      const gm = new GameManager();
      const machine = createMachineState();
      gm.applyUpgrades('machine1', machine);
      expect(machine.capacity).toBe(1);
      expect(machine.requiredSequenceLength).toBe(3);
      expect(machine.automationLevel).toBe(0);
    });
  });

  // ── 11. applyUpgrades at level 10 ────────────────────────────────────
  // Validates: Requirements 3.4, 4.3, 5.6, 6.3

  describe('applyUpgrades at level 10', () => {
    it('sets capacity=11, sequenceLength=10, automationLevel=10', () => {
      const gm = new GameManager();
      // Fund enough to max out capacity, quality, and automation on machine1
      // Each type: 50 * 1023 = 51150, need 3 types = 153450
      gm.addPayout(153450);
      for (let i = 0; i < 10; i++) {
        gm.attemptPurchase('machine1', 'capacity');
      }
      for (let i = 0; i < 10; i++) {
        gm.attemptPurchase('machine1', 'quality');
      }
      for (let i = 0; i < 10; i++) {
        gm.attemptPurchase('machine1', 'automation');
      }

      const machine = createMachineState();
      gm.applyUpgrades('machine1', machine);
      expect(machine.capacity).toBe(11);
      expect(machine.requiredSequenceLength).toBe(10);
      expect(machine.automationLevel).toBe(10);
    });
  });
});
