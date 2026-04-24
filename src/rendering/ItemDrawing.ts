import { PALETTE } from './Palette';
import { LayoutSystem } from '../systems/LayoutSystem';
import { ITEM_SIZE, type ItemState } from '../data/ConveyorConfig';
import type { ConveyorItem } from '../systems/ConveyorSystem';

export interface ItemDrawParams {
  graphics: Phaser.GameObjects.Graphics;
  layoutSystem: LayoutSystem;
  items: ConveyorItem[];
  gameOver: boolean;
  collidedItems: [ConveyorItem, ConveyorItem] | null;
  blinkTimer: number;
}

/** Half the item size in base-resolution pixels. */
const HALF = ITEM_SIZE / 2;

/** Shading stripe thickness in base-resolution pixels. */
const SHADE_PX = 2;

/** Highlight square size for upgraded items. */
const SHINE_SIZE = 2;

/** Ribbon thickness for packaged items. */
const RIBBON_PX = 2;

/** Base fill color per item state. */
const STATE_COLORS: Record<ItemState, number> = {
  new: PALETTE.ITEM_NEW,
  processed: PALETTE.ITEM_PROCESSED,
  upgraded: PALETTE.ITEM_UPGRADED,
  packaged: PALETTE.ITEM_PACKAGED,
};

/**
 * Draws all conveyor items with distinct shapes per processing state.
 *
 * Shape per state (all drawn at ITEM_SIZE = 14px scale):
 * - `new`       — Metallic cube: filled square with darker right/bottom edge shading
 * - `processed` — Ball: filled circle with lower-right crescent shading
 * - `upgraded`  — Shiny ball: circle with upper-left highlight square
 * - `packaged`  — Wrapped gift: filled square with cross ribbon pattern
 *
 * Collision blink: alternates between ITEM_COLLISION_BLINK and the state color
 * every 300ms using blinkTimer.
 *
 * Falls back to plain cube drawing for any unrecognized item state.
 */
export function drawItems(params: ItemDrawParams): void {
  const { graphics: g, layoutSystem: ls, items, gameOver, collidedItems, blinkTimer } = params;

  for (const item of items) {
    const isCollided = gameOver && collidedItems !== null &&
      (item === collidedItems[0] || item === collidedItems[1]);

    // Determine fill color — blink logic for collided items
    const stateColor = STATE_COLORS[item.state] ?? PALETTE.ITEM_NEW;
    let fillColor = stateColor;
    if (isCollided) {
      fillColor = Math.floor(blinkTimer / 300) % 2 === 0
        ? PALETTE.ITEM_COLLISION_BLINK
        : stateColor;
    }

    const sx = ls.scaleX(item.x);
    const sy = ls.scaleY(item.y);

    switch (item.state) {
      case 'new':
        drawCube(g, ls, sx, sy, fillColor, !isCollided || fillColor === stateColor);
        break;
      case 'processed':
        drawBall(g, ls, sx, sy, fillColor, !isCollided || fillColor === stateColor);
        break;
      case 'upgraded':
        drawShinyBall(g, ls, sx, sy, fillColor, !isCollided || fillColor === stateColor);
        break;
      case 'packaged':
        drawGift(g, ls, sx, sy, fillColor, !isCollided || fillColor === stateColor);
        break;
      default:
        // Fallback: plain cube for unrecognized state
        drawCube(g, ls, sx, sy, fillColor, false);
        break;
    }
  }
}

/**
 * Metallic cube — filled square with darker right/bottom edge shading.
 */
function drawCube(
  g: Phaser.GameObjects.Graphics,
  ls: LayoutSystem,
  sx: number,
  sy: number,
  color: number,
  showShading: boolean,
): void {
  const size = ls.scaleValue(ITEM_SIZE);
  const half = size / 2;

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(sx - half, sy - half, size, size);

  // Darker right and bottom edge shading
  if (showShading) {
    const shade = ls.scaleValue(SHADE_PX);
    g.fillStyle(PALETTE.ITEM_NEW_SHADE, 1);
    // Right edge stripe
    g.fillRect(sx + half - shade, sy - half, shade, size);
    // Bottom edge stripe
    g.fillRect(sx - half, sy + half - shade, size, shade);
  }
}

/**
 * Ball — filled circle with lower-right crescent shading.
 */
function drawBall(
  g: Phaser.GameObjects.Graphics,
  ls: LayoutSystem,
  sx: number,
  sy: number,
  color: number,
  showShading: boolean,
): void {
  const radius = ls.scaleValue(HALF);

  // Main circle
  g.fillStyle(color, 1);
  g.fillCircle(sx, sy, radius);

  // Lower-right crescent shading: a smaller darker circle offset to lower-right
  if (showShading) {
    const offset = ls.scaleValue(SHADE_PX);
    const innerRadius = radius * 0.7;
    g.fillStyle(PALETTE.ITEM_PROCESSED_SHADE, 1);
    g.fillCircle(sx + offset, sy + offset, innerRadius);
  }
}

/**
 * Shiny ball — circle with upper-left highlight square.
 */
function drawShinyBall(
  g: Phaser.GameObjects.Graphics,
  ls: LayoutSystem,
  sx: number,
  sy: number,
  color: number,
  showShading: boolean,
): void {
  const radius = ls.scaleValue(HALF);

  // Main circle
  g.fillStyle(color, 1);
  g.fillCircle(sx, sy, radius);

  // Upper-left highlight square
  if (showShading) {
    const shineSize = ls.scaleValue(SHINE_SIZE);
    const offset = ls.scaleValue(HALF * 0.4);
    g.fillStyle(PALETTE.ITEM_UPGRADED_SHINE, 1);
    g.fillRect(sx - offset - shineSize / 2, sy - offset - shineSize / 2, shineSize, shineSize);
  }
}

/**
 * Wrapped gift — filled square with cross ribbon pattern.
 */
function drawGift(
  g: Phaser.GameObjects.Graphics,
  ls: LayoutSystem,
  sx: number,
  sy: number,
  color: number,
  showRibbon: boolean,
): void {
  const size = ls.scaleValue(ITEM_SIZE);
  const half = size / 2;

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(sx - half, sy - half, size, size);

  // Cross ribbon pattern: one horizontal line and one vertical line through center
  if (showRibbon) {
    const ribbon = ls.scaleValue(RIBBON_PX);
    g.fillStyle(PALETTE.ITEM_PACKAGED_RIBBON, 1);
    // Horizontal ribbon
    g.fillRect(sx - half, sy - ribbon / 2, size, ribbon);
    // Vertical ribbon
    g.fillRect(sx - ribbon / 2, sy - half, ribbon, size);
  }
}
