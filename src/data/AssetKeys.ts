// --- Image asset key constants ---

import { ItemState } from './ConveyorConfig';

export const ASSET_KEYS = {
  // Belt
  BELT: 'belt',

  // Items
  ITEM_NEW: 'item_new_metal_block_64',
  ITEM_PROCESSED: 'item_processed_metal_ball_64',
  ITEM_UPGRADED: 'item_improved_metal_ball_shiny_64',
  ITEM_PACKAGED: 'item_packaged_gift_64',

  // Machines
  MACHINE_INTERACTION_ACTIVE: 'machine_interaction_active',
  MACHINE_NO_INTERACTION_ACTIVE: 'machine_no-interaction_active',
  MACHINE_NO_INTERACTION_INACTIVE: 'machine_no-interaction_inactive',

  // Worker
  WORKER_FRONT: 'worker_64_front',
  WORKER_BACK: 'worker_64_back',
  WORKER_SIDE: 'worker_64_side',

  // Terminal
  TERMINAL_ACTIVE: 'terminal_active',
  TERMINAL_INACTIVE: 'terminal_inactive',

  // Start screen
  TITLE: 'title',
  PRE_GAME: 'pre-game',
} as const;

export const ASSET_PATHS: Record<string, string> = {
  [ASSET_KEYS.BELT]: 'assets/belt.png',
  [ASSET_KEYS.ITEM_NEW]: 'assets/item_new_metal_block_64.png',
  [ASSET_KEYS.ITEM_PROCESSED]: 'assets/item_processed_metal_ball_64.png',
  [ASSET_KEYS.ITEM_UPGRADED]: 'assets/item_improved_metal_ball_shiny_64.png',
  [ASSET_KEYS.ITEM_PACKAGED]: 'assets/item_packaged_gift_64.png',
  [ASSET_KEYS.MACHINE_INTERACTION_ACTIVE]: 'assets/machine_interaction_active.png',
  [ASSET_KEYS.MACHINE_NO_INTERACTION_ACTIVE]: 'assets/machine_no-interaction_active.png',
  [ASSET_KEYS.MACHINE_NO_INTERACTION_INACTIVE]: 'assets/machine_no-interaction_inactive.png',
  [ASSET_KEYS.WORKER_FRONT]: 'assets/worker_64_front.png',
  [ASSET_KEYS.WORKER_BACK]: 'assets/worker_64_back.png',
  [ASSET_KEYS.WORKER_SIDE]: 'assets/worker_64_side.png',
  [ASSET_KEYS.TERMINAL_ACTIVE]: 'assets/terminal_active.png',
  [ASSET_KEYS.TERMINAL_INACTIVE]: 'assets/terminal_inactive.png',
  [ASSET_KEYS.TITLE]: 'assets/title.png',
  [ASSET_KEYS.PRE_GAME]: 'assets/pre-game.png',
};

// Item state → asset key mapping
export const ITEM_STATE_ASSET: Record<ItemState, string> = {
  new: ASSET_KEYS.ITEM_NEW,
  processed: ASSET_KEYS.ITEM_PROCESSED,
  upgraded: ASSET_KEYS.ITEM_UPGRADED,
  packaged: ASSET_KEYS.ITEM_PACKAGED,
};
