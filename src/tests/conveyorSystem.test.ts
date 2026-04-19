import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// LAYOUT constants from InputSystem (static, known values)
const LAYOUT = {
  BELT_X: 200,
  BELT_Y: 150,
  BELT_W: 400,
  BELT_H: 300,
} as const;

// Derived expected waypoints
const expectedWaypoints = [
  { x: LAYOUT.BELT_X, y: LAYOUT.BELT_Y },
  { x: LAYOUT.BELT_X + LAYOUT.BELT_W, y: LAYOUT.BELT_Y },
  { x: LAYOUT.BELT_X + LAYOUT.BELT_W, y: LAYOUT.BELT_Y + LAYOUT.BELT_H },
  { x: LAYOUT.BELT_X, y: LAYOUT.BELT_Y + LAYOUT.BELT_H },
];

// Parse waypoints from ConveyorConfig source to avoid Phaser import chain
function parseWaypointsFromSource(): { x: number; y: number }[] {
  const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
  const source = fs.readFileSync(configPath, 'utf-8');

  // Extract the LOOP_WAYPOINTS array block
  const match = source.match(/LOOP_WAYPOINTS[\s\S]*?\[([^\]]+)\]/);
  if (!match) throw new Error('Could not find LOOP_WAYPOINTS in source');

  // Extract each { x: ..., y: ... } object
  const objMatches = [...match[1].matchAll(/\{\s*x:\s*([^,}]+),\s*y:\s*([^,}]+)\s*\}/g)];
  return objMatches.map((m) => ({
    x: evalLayoutExpr(m[1].trim()),
    y: evalLayoutExpr(m[2].trim()),
  }));
}

// Evaluate simple LAYOUT-based expressions like "LAYOUT.BELT_X + LAYOUT.BELT_W"
function evalLayoutExpr(expr: string): number {
  const layoutMap: Record<string, number> = {
    'LAYOUT.BELT_X': LAYOUT.BELT_X,
    'LAYOUT.BELT_Y': LAYOUT.BELT_Y,
    'LAYOUT.BELT_W': LAYOUT.BELT_W,
    'LAYOUT.BELT_H': LAYOUT.BELT_H,
  };

  let result = expr;
  for (const [key, val] of Object.entries(layoutMap)) {
    result = result.replaceAll(key, String(val));
  }
  // Safe eval of simple arithmetic (only digits, +, -, spaces)
  if (!/^[\d\s+\-]+$/.test(result)) {
    throw new Error(`Unexpected expression: ${result}`);
  }
  return Function(`return (${result})`)() as number;
}

function parseInletFromSource(): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const configPath = path.resolve(__dirname, '../data/ConveyorConfig.ts');
  const source = fs.readFileSync(configPath, 'utf-8');

  const startMatch = source.match(/INLET_START[\s\S]*?\{\s*x:\s*([^,}]+),\s*y:\s*([^,}]+)\s*\}/);
  const endMatch = source.match(/INLET_END[\s\S]*?\{\s*x:\s*([^,}]+),\s*y:\s*([^,}]+)\s*\}/);
  if (!startMatch || !endMatch) throw new Error('Could not find INLET_START/INLET_END in source');

  return {
    start: { x: evalLayoutExpr(startMatch[1].trim()), y: evalLayoutExpr(startMatch[2].trim()) },
    end: { x: evalLayoutExpr(endMatch[1].trim()), y: evalLayoutExpr(endMatch[2].trim()) },
  };
}

const waypoints = parseWaypointsFromSource();
const inlet = parseInletFromSource();

describe('ConveyorConfig — geometry', () => {
  // Example 1: LOOP_WAYPOINTS has 4 points forming a closed rectangle matching LAYOUT constants
  it('LOOP_WAYPOINTS has 4 points matching LAYOUT rectangle', () => {
    expect(waypoints.length).toBe(4);
    expect(waypoints[0]).toEqual({ x: 200, y: 150 });
    expect(waypoints[1]).toEqual({ x: 600, y: 150 });
    expect(waypoints[2]).toEqual({ x: 600, y: 450 });
    expect(waypoints[3]).toEqual({ x: 200, y: 450 });
  });

  // Example 2: Waypoint traversal order is clockwise (signed area via shoelace formula)
  it('waypoint traversal order is clockwise (negative signed area in screen coords)', () => {
    let signedArea2 = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const curr = waypoints[i];
      const next = waypoints[(i + 1) % waypoints.length];
      signedArea2 += curr.x * next.y - next.x * curr.y;
    }
    // In screen coordinates (y-down), clockwise winding gives positive signed area
    // (the y-axis flip reverses the sign compared to standard math convention)
    expect(signedArea2).toBeGreaterThan(0);
  });

  // Example 3: INLET_END equals LOOP_WAYPOINTS[0] (inlet connects to loop)
  it('INLET_END connects to LOOP_WAYPOINTS[0]', () => {
    expect(inlet.end.x).toBe(waypoints[0].x);
    expect(inlet.end.y).toBe(waypoints[0].y);
  });
});

describe('ConveyorSystem — source constraints', () => {
  // Example 5: ConveyorSystem source does not import Phaser physics
  it('ConveyorSystem source does not import Phaser or Physics', () => {
    const sourcePath = path.resolve(__dirname, '../systems/ConveyorSystem.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');
    expect(source.toLowerCase()).not.toContain('phaser');
    expect(source).not.toContain('Physics');
  });
});

describe('ConveyorSystem — loop perimeter', () => {
  // Example 8: Loop perimeter equals 2 * (BELT_W + BELT_H) = 1400
  it('loop perimeter equals 1400', () => {
    let perimeter = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const a = waypoints[i];
      const b = waypoints[(i + 1) % waypoints.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    expect(perimeter).toBe(1400);
  });
});
