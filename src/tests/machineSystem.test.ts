import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  MACHINE_DEFINITIONS,
} from '../data/MachineConfig';
import { MachineSystem } from '../systems/MachineSystem';

describe('MachineSystem — machine config', () => {
  // Example 1: Machine 1 config matches requirements
  // Validates: Requirements 1.3
  it('Machine 1 accepts ["new"], outputs "processed", has fixed sequence [L,U,U,R,L,D]', () => {
    const m1 = MACHINE_DEFINITIONS[0];
    expect(m1.id).toBe('machine1');
    expect(m1.acceptedInputStatuses).toEqual(['new']);
    expect(m1.outputStatus).toBe('processed');
    expect(m1.sequenceStrategy).toBe('fixed');
    expect(m1.fixedSequence).toEqual(['left', 'up', 'up', 'right', 'left', 'down']);
  });

  // Example 2: Machine 2 config matches requirements
  // Validates: Requirements 1.4
  it('Machine 2 accepts ["processed"], outputs "upgraded", uses per-run strategy', () => {
    const m2 = MACHINE_DEFINITIONS[1];
    expect(m2.id).toBe('machine2');
    expect(m2.acceptedInputStatuses).toEqual(['processed']);
    expect(m2.outputStatus).toBe('upgraded');
    expect(m2.sequenceStrategy).toBe('per-run');
  });

  // Example 3: Machine 3 config matches requirements
  // Validates: Requirements 1.5
  it('Machine 3 accepts ["processed","upgraded"], outputs "packaged", uses per-item strategy', () => {
    const m3 = MACHINE_DEFINITIONS[2];
    expect(m3.id).toBe('machine3');
    expect(m3.acceptedInputStatuses).toEqual(['processed', 'upgraded']);
    expect(m3.outputStatus).toBe('packaged');
    expect(m3.sequenceStrategy).toBe('per-item');
  });
});

describe('MachineSystem — position mappings', () => {
  // Example 4: Machine position mappings
  // Validates: Requirements 12.1, 12.2, 12.3
  it('Machine 1 maps to "up", Machine 2 to "right", Machine 3 to "down"', () => {
    expect(MACHINE_DEFINITIONS[0].playerPosition).toBe('up');
    expect(MACHINE_DEFINITIONS[1].playerPosition).toBe('right');
    expect(MACHINE_DEFINITIONS[2].playerPosition).toBe('down');
  });
});

describe('MachineSystem — mutable properties', () => {
  // Example 5: Machine properties are mutable
  // Validates: Requirements 13.1
  it('capacity, automationLevel, workQuality, workSpeed are reassignable', () => {
    const system = new MachineSystem();
    const machines = system.getMachines();
    const machine = machines[0];

    machine.capacity = 5;
    expect(machine.capacity).toBe(5);

    machine.automationLevel = 3;
    expect(machine.automationLevel).toBe(3);

    machine.workQuality = 0.9;
    expect(machine.workQuality).toBe(0.9);

    machine.workSpeed = 10;
    expect(machine.workSpeed).toBe(10);

    machine.requiredSequenceLength = 6;
    expect(machine.requiredSequenceLength).toBe(6);
  });
});

describe('MachineSystem — structural checks', () => {
  // Example 9: MachineSystem.ts source does not import Phaser physics
  it('MachineSystem.ts does not import Phaser physics', () => {
    const sourcePath = path.resolve(__dirname, '../systems/MachineSystem.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/from\s+['"]phaser['"]/);
    expect(source).not.toMatch(/Phaser\.Physics/);
  });
});
