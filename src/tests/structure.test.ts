import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Requirements: 3.1, 3.3, 3.4

const root = process.cwd();

describe('src/ subdirectories', () => {
  const dirs = ['scenes', 'systems', 'objects', 'ui', 'data', 'utils'];

  for (const dir of dirs) {
    it(`src/${dir} exists`, () => {
      expect(existsSync(resolve(root, 'src', dir))).toBe(true);
    });
  }
});

describe('src/scenes/ files', () => {
  it('src/scenes/InitialScene.ts has been removed', () => {
    expect(existsSync(resolve(root, 'src/scenes/InitialScene.ts'))).toBe(false);
  });
});

describe('public/ directory', () => {
  it('public/ exists', () => {
    expect(existsSync(resolve(root, 'public'))).toBe(true);
  });
});

// Requirements: 11.1, 11.2, 11.4, 12.3, 12.4
describe('touch-input-layer structural checks', () => {
  // Example 12: ActionLayer.ts exists under src/systems
  it('ActionLayer.ts exists under src/systems', () => {
    expect(existsSync(resolve(root, 'src/systems/ActionLayer.ts'))).toBe(true);
  });

  // Example 13: TouchButtonUI.ts exists under src/ui
  it('TouchButtonUI.ts exists under src/ui', () => {
    expect(existsSync(resolve(root, 'src/ui/TouchButtonUI.ts'))).toBe(true);
  });

  // Example 14: package.json has no new dependencies beyond Phaser 3
  it('package.json dependencies only contains phaser', async () => {
    const { readFileSync } = await import('fs');
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    const deps = Object.keys(pkg.dependencies || {});
    expect(deps).toEqual(['phaser']);
  });

  // Example 15: ConveyorSystem.ts, ItemSystem.ts, MachineSystem.ts are not modified to depend on touch input layer
  describe('existing systems are not modified to depend on touch input layer', () => {
    const systemFiles = [
      { name: 'ConveyorSystem.ts', exportClass: 'ConveyorSystem' },
      { name: 'ItemSystem.ts', exportClass: 'ItemSystem' },
      { name: 'MachineSystem.ts', exportClass: 'MachineSystem' },
    ];

    for (const { name, exportClass } of systemFiles) {
      describe(name, () => {
        let source: string;

        beforeAll(async () => {
          const { readFileSync } = await import('fs');
          source = readFileSync(resolve(root, 'src/systems', name), 'utf-8');
        });

        it(`exports class ${exportClass}`, () => {
          expect(source).toContain(`export class ${exportClass}`);
        });

        it('does not reference ActionLayer', () => {
          expect(source).not.toContain('ActionLayer');
        });

        it('does not reference TouchButtonUI', () => {
          expect(source).not.toContain('TouchButtonUI');
        });
      });
    }
  });
});
