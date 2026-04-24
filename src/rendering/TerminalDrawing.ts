import { PALETTE } from './Palette';
import { LAYOUT } from '../systems/InputSystem';
import type { PlayerPosition } from '../systems/InputSystem';
import { LayoutSystem } from '../systems/LayoutSystem';

export interface TerminalDrawParams {
  graphics: Phaser.GameObjects.Graphics;
  layoutSystem: LayoutSystem;
  playerPosition: PlayerPosition;
}

/** Terminal body dimensions in base-resolution pixels. */
const BODY_W = LAYOUT.STATION_H;  // 40
const BODY_H = LAYOUT.STATION_W;  // 60

/** Terminal body position — left side of the belt, matching the existing terminal location. */
const BODY_X = LAYOUT.BELT_X - BODY_W;
const BODY_Y = LAYOUT.CENTER_Y - BODY_H / 2;

/** Screen inset dimensions and position relative to the body. */
const SCREEN_MARGIN_X = 8;
const SCREEN_MARGIN_TOP = 8;
const SCREEN_W = BODY_W - SCREEN_MARGIN_X * 2;  // 24
const SCREEN_H = 16;

/** Decorative button dimensions. */
const BUTTON_W = 6;
const BUTTON_H = 4;
const BUTTON_GAP = 4;
const BUTTON_TOP_MARGIN = 6;

/**
 * Draws the upgrade terminal as a control console on the left side of the belt.
 *
 * - Body: filled rectangle in TERMINAL_BODY color
 * - Screen: inset rectangle in TERMINAL_SCREEN (or TERMINAL_SCREEN_LIT when player is at 'left')
 * - Buttons: 3 small decorative rectangles below the screen in MACHINE_PANEL color
 */
export function drawTerminal(params: TerminalDrawParams): void {
  const { graphics: g, layoutSystem: ls, playerPosition } = params;

  // --- Terminal body ---
  g.fillStyle(PALETTE.TERMINAL_BODY, 1);
  g.fillRect(
    ls.scaleX(BODY_X),
    ls.scaleY(BODY_Y),
    ls.scaleValue(BODY_W),
    ls.scaleValue(BODY_H),
  );

  // --- Screen ---
  const screenX = BODY_X + SCREEN_MARGIN_X;
  const screenY = BODY_Y + SCREEN_MARGIN_TOP;
  const screenColor = playerPosition === 'left'
    ? PALETTE.TERMINAL_SCREEN_LIT
    : PALETTE.TERMINAL_SCREEN;

  g.fillStyle(screenColor, 1);
  g.fillRect(
    ls.scaleX(screenX),
    ls.scaleY(screenY),
    ls.scaleValue(SCREEN_W),
    ls.scaleValue(SCREEN_H),
  );

  // --- Decorative buttons below the screen ---
  const buttonsY = screenY + SCREEN_H + BUTTON_TOP_MARGIN;
  // Center 3 buttons horizontally within the body
  const totalButtonsW = BUTTON_W * 3 + BUTTON_GAP * 2;
  const buttonsStartX = BODY_X + (BODY_W - totalButtonsW) / 2;

  g.fillStyle(PALETTE.MACHINE_PANEL, 1);
  for (let i = 0; i < 3; i++) {
    const bx = buttonsStartX + i * (BUTTON_W + BUTTON_GAP);
    g.fillRect(
      ls.scaleX(bx),
      ls.scaleY(buttonsY),
      ls.scaleValue(BUTTON_W),
      ls.scaleValue(BUTTON_H),
    );
  }
}
