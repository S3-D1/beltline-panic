import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));

// Requirements: 1.1, 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 6.5

describe('package.json — dependencies', () => {
  it('has phaser in dependencies', () => {
    expect(pkg.dependencies).toHaveProperty('phaser');
  });
});

describe('package.json — devDependencies', () => {
  it('has typescript in devDependencies', () => {
    expect(pkg.devDependencies).toHaveProperty('typescript');
  });

  it('has vite in devDependencies', () => {
    expect(pkg.devDependencies).toHaveProperty('vite');
  });

  it('has eslint in devDependencies', () => {
    expect(pkg.devDependencies).toHaveProperty('eslint');
  });

  it('has @typescript-eslint/eslint-plugin in devDependencies', () => {
    expect(pkg.devDependencies).toHaveProperty('@typescript-eslint/eslint-plugin');
  });

  it('has @typescript-eslint/parser in devDependencies', () => {
    expect(pkg.devDependencies).toHaveProperty('@typescript-eslint/parser');
  });
});

describe('package.json — scripts', () => {
  it('dev script is "vite"', () => {
    expect(pkg.scripts.dev).toBe('vite');
  });

  it('build script is "tsc --noEmit && vite build"', () => {
    expect(pkg.scripts.build).toBe('tsc --noEmit && vite build');
  });

  it('preview script is "vite preview"', () => {
    expect(pkg.scripts.preview).toBe('vite preview');
  });

  it('lint script is "eslint src/"', () => {
    expect(pkg.scripts.lint).toBe('eslint src/');
  });

  it('typecheck script is "tsc --noEmit"', () => {
    expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
  });
});
