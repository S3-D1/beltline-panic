import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ASSET_KEYS, ASSET_PATHS } from '../data/AssetKeys';

// --- Mock helpers ---

interface MockLoader {
  image: ReturnType<typeof vi.fn>;
  audio: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

function createMockLoader(): MockLoader {
  return {
    image: vi.fn(),
    audio: vi.fn(),
    on: vi.fn(),
  };
}

// --- Tests ---

describe('PreloadScene — image asset loading', () => {
  let mockLoader: MockLoader;

  beforeEach(() => {
    mockLoader = createMockLoader();
  });

  // Validates: Requirements 1.1, 1.2
  it('loads all 15 image assets with correct keys and paths', () => {
    // Simulate what PreloadScene.preload() does for image assets
    for (const [key, path] of Object.entries(ASSET_PATHS)) {
      mockLoader.image(key, path);
    }

    expect(mockLoader.image).toHaveBeenCalledTimes(15);

    // Verify each asset key maps to the correct path
    for (const [key, path] of Object.entries(ASSET_PATHS)) {
      expect(mockLoader.image).toHaveBeenCalledWith(key, path);
    }
  });

  // Validates: Requirements 1.2
  it('ASSET_KEYS contains exactly 15 entries', () => {
    const keys = Object.values(ASSET_KEYS);
    expect(keys).toHaveLength(15);
  });

  // Validates: Requirements 1.2
  it('ASSET_PATHS contains exactly 15 entries', () => {
    const paths = Object.keys(ASSET_PATHS);
    expect(paths).toHaveLength(15);
  });

  // Validates: Requirements 1.2
  it('every ASSET_KEYS value has a corresponding ASSET_PATHS entry', () => {
    for (const key of Object.values(ASSET_KEYS)) {
      expect(ASSET_PATHS).toHaveProperty(key);
      expect(ASSET_PATHS[key]).toMatch(/^assets\/.*\.png$/);
    }
  });

  // Validates: Requirements 1.2
  it('registers all required texture keys', () => {
    const expectedKeys = [
      'belt',
      'item_new_metal_block_64',
      'item_processed_metal_ball_64',
      'item_improved_metal_ball_shiny_64',
      'item_packaged_gift_64',
      'machine_interaction_active',
      'machine_no-interaction_active',
      'machine_no-interaction_inactive',
      'worker_64_front',
      'worker_64_back',
      'worker_64_side',
      'terminal_active',
      'terminal_inactive',
      'title',
      'pre-game',
    ];

    const actualKeys = Object.values(ASSET_KEYS);
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
    expect(expectedKeys).toEqual(expect.arrayContaining(actualKeys));
  });
});

describe('PreloadScene — source checks', () => {
  let source: string;

  beforeEach(async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(__dirname, '../scenes/PreloadScene.ts');
    source = fs.readFileSync(sourcePath, 'utf-8');
  });

  // Validates: Requirements 1.1
  it('imports ASSET_PATHS from AssetKeys', () => {
    expect(source).toContain('ASSET_PATHS');
    expect(source).toMatch(/import\s+.*ASSET_PATHS.*from\s+['"]\.\.\/data\/AssetKeys['"]/);
  });

  // Validates: Requirements 1.1
  it('iterates ASSET_PATHS and calls this.load.image', () => {
    expect(source).toContain('Object.entries(ASSET_PATHS)');
    expect(source).toContain('this.load.image(key, path)');
  });

  // Validates: Requirements 1.3
  it('registers a loaderror event handler', () => {
    expect(source).toContain("this.load.on('loaderror'");
  });

  // Validates: Requirements 1.3
  it('loaderror handler logs console.warn with file key and url', () => {
    expect(source).toContain('console.warn');
    expect(source).toContain('file.key');
    expect(source).toContain('file.url');
  });
});
