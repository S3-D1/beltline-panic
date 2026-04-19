import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GameScene — integration checks', () => {
  // Example 6: GameScene.ts source still instantiates InputSystem
  it('GameScene.ts source still instantiates InputSystem', () => {
    const sourcePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    const hasInputSystem =
      source.includes('new InputSystem') || source.includes('InputSystem(this)');
    expect(hasInputSystem).toBe(true);
  });

  // Example 7: main.ts scene array still lists StartScene first
  it('main.ts scene array still lists StartScene first', () => {
    const sourcePath = path.resolve(__dirname, '../main.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).toContain('StartScene');
    // StartScene must appear before GameScene in the scene array
    const sceneArrayMatch = source.match(/scene:\s*\[([^\]]+)\]/);
    expect(sceneArrayMatch).not.toBeNull();
    const sceneList = sceneArrayMatch![1];
    const startIdx = sceneList.indexOf('StartScene');
    const gameIdx = sceneList.indexOf('GameScene');
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(gameIdx).toBeGreaterThan(startIdx);
  });
});
