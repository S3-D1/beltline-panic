import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, '../scenes/InitialScene.ts'), 'utf-8');

describe('InitialScene content checks', () => {
  it('calls this.add.text with "Beltline Panic"', () => {
    expect(source.includes('Beltline Panic')).toBe(true);
  });

  it('calls this.add.text with "© s3-d1"', () => {
    expect(source.includes('© s3-d1')).toBe(true);
  });
});
