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

  // Example 7 (machine-gameplay): GameScene.ts imports and instantiates MachineSystem
  it('GameScene.ts source imports and instantiates MachineSystem', () => {
    const sourcePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).toContain('MachineSystem');
    expect(source).toContain('new MachineSystem');
  });

  // Example 8 (machine-gameplay): GameScene.ts imports and instantiates SequenceInputUI
  it('GameScene.ts source imports and instantiates SequenceInputUI', () => {
    const sourcePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).toContain('SequenceInputUI');
    expect(source).toContain('new SequenceInputUI');
  });

  // Example 6 (touch-input-layer): GameScene.ts does not use JustDown or addKey directly
  it('GameScene.ts source does not use JustDown or addKey directly', () => {
    const sourcePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).not.toContain('JustDown');
    expect(source).not.toContain('addKey');
  });

  // Example 14 (upgrade-terminal): GameScene.ts source imports GameManager
  it('GameScene.ts source imports GameManager', () => {
    const sourcePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(/import\s+.*GameManager.*from\s+['"]\.\.\/systems\/GameManager['"]/);
  });

  // Example 15 (upgrade-terminal): GameScene.ts source imports AutomationSystem
  it('GameScene.ts source imports AutomationSystem', () => {
    const sourcePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source).toMatch(/import\s+.*AutomationSystem.*from\s+['"]\.\.\/systems\/AutomationSystem['"]/);
  });
});
