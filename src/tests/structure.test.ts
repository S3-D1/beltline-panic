import { describe, it, expect } from 'vitest';
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
  it('src/scenes/InitialScene.ts exists', () => {
    expect(existsSync(resolve(root, 'src/scenes/InitialScene.ts'))).toBe(true);
  });
});

describe('public/ directory', () => {
  it('public/ exists', () => {
    expect(existsSync(resolve(root, 'public'))).toBe(true);
  });
});
