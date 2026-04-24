/**
 * Centralized color palette for all rendering in Beltline Panic.
 * Limited to ~30 colors to enforce the pixel-style constraint.
 * All drawing modules import colors from here — no hardcoded hex values elsewhere.
 */
export const PALETTE = {
  // Background
  FLOOR_DARK: 0x1a1a2e,
  FLOOR_LIGHT: 0x22223a,
  FLOOR_GRID: 0x2a2a44,

  // Belt
  BELT_BASE: 0x2a2a2a,
  BELT_SEGMENT: 0x3d3d3d,
  BELT_EDGE: 0x1a1a1a,

  // Machines
  MACHINE1_BODY: 0x5566aa,
  MACHINE2_BODY: 0x55aa66,
  MACHINE3_BODY: 0xaa6655,
  MACHINE_PANEL: 0x444444,
  MACHINE_PANEL_LIT: 0x666666,
  MACHINE_INDICATOR_ON: 0x44ff44,
  MACHINE_INDICATOR_OFF: 0x882222,

  // Items
  ITEM_NEW: 0x8888aa,
  ITEM_NEW_SHADE: 0x666688,
  ITEM_PROCESSED: 0xcccc44,
  ITEM_PROCESSED_SHADE: 0x999922,
  ITEM_UPGRADED: 0x44cc88,
  ITEM_UPGRADED_SHINE: 0xaaffcc,
  ITEM_PACKAGED: 0xcc6644,
  ITEM_PACKAGED_RIBBON: 0xffcc44,
  ITEM_COLLISION_BLINK: 0xff0000,

  // Terminal
  TERMINAL_BODY: 0x445588,
  TERMINAL_SCREEN: 0x224422,
  TERMINAL_SCREEN_LIT: 0x33aa33,

  // Player
  PLAYER: 0xff3333,

  // UI / Text
  TEXT_PRIMARY: 0xffffff,
  TEXT_ACCENT: 0xffcc00,
} as const;
