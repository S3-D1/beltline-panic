import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GameManager } from '../systems/GameManager';
import {
  UPGRADE_CONFIG,
  MACHINE_DIRECTION_MAP,
  UPGRADE_DIRECTION_MAP,
} from '../data/UpgradeConfig';

describe('GameManager — unit tests', () => {
  // Example 1: GameManager initial score is 0
  // Validates: Requirements 1.1
  it('initial score is 0', () => {
    const gm = new GameManager();
    expect(gm.getScore()).toBe(0);
  });

  // Example 2: GameManager initial budget is 0
  // Validates: Requirements 1.2
  it('initial budget is 0', () => {
    const gm = new GameManager();
    expect(gm.getBudget()).toBe(0);
  });

  // Example 3: Base prices match config
  // Validates: Requirements 1.4
  it('base prices match config (machine1=50, machine2=250, machine3=1000)', () => {
    expect(UPGRADE_CONFIG.basePrices['machine1']).toBe(50);
    expect(UPGRADE_CONFIG.basePrices['machine2']).toBe(250);
    expect(UPGRADE_CONFIG.basePrices['machine3']).toBe(1000);
  });

  // Example 4: Config has all required fields
  // Validates: Requirements 1.5, 18.1
  it('config has all required fields', () => {
    expect(UPGRADE_CONFIG).toHaveProperty('basePrices');
    expect(UPGRADE_CONFIG).toHaveProperty('maxLevel');
    expect(UPGRADE_CONFIG).toHaveProperty('capacityIncrement');
    expect(UPGRADE_CONFIG).toHaveProperty('qualityIncrement');
    expect(UPGRADE_CONFIG).toHaveProperty('sequenceLengthIncrement');
    expect(UPGRADE_CONFIG).toHaveProperty('automationIncrement');
    expect(UPGRADE_CONFIG).toHaveProperty('automationBaseTimingMs');
    expect(UPGRADE_CONFIG).toHaveProperty('automationSpeedReductionMs');
  });

  // Example 5: Machine direction map
  // Validates: Requirements 5.1–5.4
  it('machine direction map: up→machine1, right→machine2, down→machine3, left→null', () => {
    expect(MACHINE_DIRECTION_MAP['up']).toBe('machine1');
    expect(MACHINE_DIRECTION_MAP['right']).toBe('machine2');
    expect(MACHINE_DIRECTION_MAP['down']).toBe('machine3');
    expect(MACHINE_DIRECTION_MAP['left']).toBeNull();
  });

  // Example 6: Upgrade direction map
  // Validates: Requirements 6.1–6.4
  it('upgrade direction map: up→capacity, right→automation, down→quality, left→speed', () => {
    expect(UPGRADE_DIRECTION_MAP['up']).toBe('capacity');
    expect(UPGRADE_DIRECTION_MAP['right']).toBe('automation');
    expect(UPGRADE_DIRECTION_MAP['down']).toBe('quality');
    expect(UPGRADE_DIRECTION_MAP['left']).toBe('speed');
  });

  // Example 7: Cost at level 0 = base price
  // Validates: Requirements 9.2
  it('cost at level 0 = base price (machine1 capacity costs 50)', () => {
    const gm = new GameManager();
    expect(gm.getUpgradeCost('machine1', 'capacity')).toBe(50);
  });

  // Example 8: Cost at level 1 = base price × 2
  // Validates: Requirements 9.3
  it('cost at level 1 = base price × 2 (machine1 capacity costs 100 after one purchase)', () => {
    const gm = new GameManager();
    gm.addPayout(50);
    const purchased = gm.attemptPurchase('machine1', 'capacity');
    expect(purchased).toBe(true);
    expect(gm.getUpgradeCost('machine1', 'capacity')).toBe(100);
  });

  // Example 9: Cost at level 2 = base price × 4
  // Validates: Requirements 9.4
  it('cost at level 2 = base price × 4 (machine1 capacity costs 200 after two purchases)', () => {
    const gm = new GameManager();
    gm.addPayout(150); // 50 + 100 = 150 needed for two purchases
    gm.attemptPurchase('machine1', 'capacity'); // costs 50, budget = 100
    gm.attemptPurchase('machine1', 'capacity'); // costs 100, budget = 0
    expect(gm.getUpgradeCost('machine1', 'capacity')).toBe(200);
  });

  // Example 10: Automation timing at level 0 = 1100ms
  // Validates: Requirements 12.1
  it('automation timing at level 0 = 1100ms', () => {
    const gm = new GameManager();
    expect(gm.getAutomationTiming('machine1')).toBe(1100);
  });

  // Example 11: Automation level starts at 0 for all machines
  // Validates: Requirements 13.1
  it('automation level starts at 0 for all machines', () => {
    const gm = new GameManager();
    expect(gm.getUpgradeLevel('machine1', 'automation')).toBe(0);
    expect(gm.getUpgradeLevel('machine2', 'automation')).toBe(0);
    expect(gm.getUpgradeLevel('machine3', 'automation')).toBe(0);
  });

  // Example 12: Terminal does not offer self-upgrade
  // Validates: Requirements 17.1, 17.2
  it('terminal does not offer self-upgrade (no "terminal" in MACHINE_DIRECTION_MAP values)', () => {
    const values = Object.values(MACHINE_DIRECTION_MAP);
    expect(values).not.toContain('terminal');
  });

  // Example 13: Config object is imported from data file, not defined in GameManager
  // Validates: Requirements 18.2, 18.3
  it('config object is imported from data file, not defined in GameManager', () => {
    const sourcePath = path.resolve(__dirname, '../systems/GameManager.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    // GameManager should import UPGRADE_CONFIG from the data file
    expect(source).toMatch(/from\s+['"]\.\.\/data\/UpgradeConfig['"]/);
    // UPGRADE_CONFIG should be exported from the data file, not defined in GameManager
    expect(source).not.toMatch(/export\s+const\s+UPGRADE_CONFIG/);
  });
});
