/**
 * Centralized color palette for rendering in Beltline Panic.
 * Retained constants are used by floor grid drawing and UI text.
 * Shape-drawing colors for belt, machines, items, terminal, and player
 * were removed after the sprite-based rendering migration.
 */
export const PALETTE = {
  // Background / Floor
  FLOOR_DARK: 0x1a1a2e,
  FLOOR_LIGHT: 0x22223a,
  FLOOR_GRID: 0x2a2a44,

  // UI / Text
  TEXT_PRIMARY: 0xffffff,
  TEXT_ACCENT: 0xffcc00,
} as const;
