import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Parse ITEM_COLORS from ConveyorConfig source to avoid Phaser import chain
function parseItemColorsFromSource(): Record<string, number> {
  const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
  const source = fs.readFileSync(configPath, 'utf-8');

  const block = source.match(/ITEM_COLORS[\s\S]*?\{([\s\S]*?)\};/);
  if (!block) throw new Error('Could not find ITEM_COLORS in source');

  const entries = [...block[1].matchAll(/(\w+):\s*(0x[0-9a-fA-F]+)/g)];
  const colors: Record<string, number> = {};
  for (const m of entries) {
    colors[m[1]] = Number(m[2]);
  }
  return colors;
}

// Parse TRANSITION_ZONES from ConveyorConfig source
function parseTransitionZonesFromSource(): {
  progressStart: number;
  progressEnd: number;
  fromState: string;
  toState: string;
}[] {
  const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
  const source = fs.readFileSync(configPath, 'utf-8');

  const block = source.match(/TRANSITION_ZONES[\s\S]*?\[([\s\S]*?)\];/);
  if (!block) throw new Error('Could not find TRANSITION_ZONES in source');

  const objMatches = [
    ...block[1].matchAll(
      /\{\s*progressStart:\s*([\d.]+)\s*,\s*progressEnd:\s*([\d.]+)\s*,\s*fromState:\s*'(\w+)'\s*,\s*toState:\s*'(\w+)'\s*\}/g,
    ),
  ];

  return objMatches.map((m) => ({
    progressStart: parseFloat(m[1]),
    progressEnd: parseFloat(m[2]),
    fromState: m[3],
    toState: m[4],
  }));
}

const itemColors = parseItemColorsFromSource();
const transitionZones = parseTransitionZonesFromSource();

describe('ItemSystem — item colors', () => {
  // Example 4: ITEM_COLORS maps all four states to correct hex values
  it('ITEM_COLORS maps all four states to correct hex values', () => {
    expect(itemColors['new']).toBe(0x9944cc);
    expect(itemColors['processed']).toBe(0xcccc00);
    expect(itemColors['upgraded']).toBe(0x44cc44);
    expect(itemColors['packaged']).toBe(0x886622);
  });
});

describe('ItemSystem — transition zones', () => {
  // Example 9: Transition zones are ordered and non-overlapping
  it('has exactly 3 transition zones', () => {
    expect(transitionZones.length).toBe(3);
  });

  it('each zone has progressStart < progressEnd', () => {
    for (const zone of transitionZones) {
      expect(zone.progressStart).toBeLessThan(zone.progressEnd);
    }
  });

  it('zones are ordered and non-overlapping', () => {
    expect(transitionZones[0].progressEnd).toBeLessThanOrEqual(transitionZones[1].progressStart);
    expect(transitionZones[1].progressEnd).toBeLessThanOrEqual(transitionZones[2].progressStart);
  });

  it('state chain is new→processed, processed→upgraded, upgraded→packaged', () => {
    expect(transitionZones[0].fromState).toBe('new');
    expect(transitionZones[0].toState).toBe('processed');
    expect(transitionZones[1].fromState).toBe('processed');
    expect(transitionZones[1].toState).toBe('upgraded');
    expect(transitionZones[2].fromState).toBe('upgraded');
    expect(transitionZones[2].toState).toBe('packaged');
  });
});
