import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Requirements: 3.2, 4.4, 11.1, 11.2, 11.4

const mainTs = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf-8');

describe('src/main.ts — game instantiation', () => {
  it('contains new Phaser.Game', () => {
    expect(mainTs).toContain('new Phaser.Game');
  });
});

describe('src/main.ts — GameConfig fields', () => {
  it('config includes type', () => {
    expect(mainTs).toContain('type');
  });

  it('config includes width', () => {
    expect(mainTs).toContain('width');
  });

  it('config includes height', () => {
    expect(mainTs).toContain('height');
  });

  it('config includes backgroundColor', () => {
    expect(mainTs).toContain('backgroundColor');
  });
});

describe('src/main.ts — YouTube Playables comments', () => {
  it('has SDK load point comment before game instantiation', () => {
    const sdkIndex = mainTs.indexOf('[YOUTUBE PLAYABLES]');
    const gameIndex = mainTs.indexOf('new Phaser.Game');
    expect(sdkIndex).toBeGreaterThanOrEqual(0);
    expect(sdkIndex).toBeLessThan(gameIndex);
  });

  it('has ready signal comment after game instantiation', () => {
    const gameIndex = mainTs.indexOf('new Phaser.Game');
    const readyIndex = mainTs.indexOf('[YOUTUBE PLAYABLES]', gameIndex);
    expect(readyIndex).toBeGreaterThan(gameIndex);
  });
});
