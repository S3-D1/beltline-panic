import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Requirements: 1.5, 1.6

const tsconfig = JSON.parse(readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf-8'));
const viteConfigText = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf-8');

describe('tsconfig.json — compilerOptions', () => {
  it('has strict: true', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('lib includes "DOM"', () => {
    expect(tsconfig.compilerOptions.lib).toContain('DOM');
  });

  it('target is "ES2020"', () => {
    expect(tsconfig.compilerOptions.target).toBe('ES2020');
  });

  it('noEmit is true', () => {
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
  });
});

describe('vite.config.ts — build config', () => {
  it('base defaults to "./"', () => {
    expect(viteConfigText).toMatch(/base:\s*/);
    expect(viteConfigText).toMatch(/['"]\.\//);
  });

  it('build.outDir is "dist"', () => {
    expect(viteConfigText).toMatch(/outDir:\s*['"]dist['"]/);
  });
});
