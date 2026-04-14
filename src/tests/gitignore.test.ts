import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('.gitignore', () => {
  const content = readFileSync(join(process.cwd(), '.gitignore'), 'utf-8');

  it('excludes dist/', () => {
    expect(content.includes('dist/')).toBe(true);
  });

  it('excludes node_modules/', () => {
    expect(content.includes('node_modules/')).toBe(true);
  });

  it('excludes .DS_Store', () => {
    expect(content.includes('.DS_Store')).toBe(true);
  });

  it('excludes .vscode/', () => {
    expect(content.includes('.vscode/')).toBe(true);
  });

  it('excludes .env', () => {
    expect(content.includes('.env')).toBe(true);
  });
});
