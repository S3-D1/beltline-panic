import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('StartScene — source checks', () => {
  const sourcePath = path.resolve(__dirname, '../scenes/StartScene.ts');
  const source = fs.readFileSync(sourcePath, 'utf-8');

  // Example 7: StartScene.ts source contains keyboard listener
  // Validates: Requirements 4.1
  it('StartScene.ts source contains keyboard listener (keydown)', () => {
    expect(source).toContain('keydown');
  });

  // Example 8: StartScene.ts source contains pointerdown listener
  // Validates: Requirements 4.2
  it('StartScene.ts source contains pointerdown listener', () => {
    expect(source).toContain('pointerdown');
  });

  // Example 9: StartScene.ts source contains text mentioning tap or click
  // Validates: Requirements 4.4
  it('StartScene.ts source contains text mentioning tap or click', () => {
    const hasTapOrClick = source.includes('tap') || source.includes('click');
    expect(hasTapOrClick).toBe(true);
  });
});
